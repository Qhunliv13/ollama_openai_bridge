import os
import sys
import json
import time
import asyncio
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODELS_PATH = os.getenv("OLLAMA_MODELS_PATH", r"C:\Users\1\.ollama\models")
ADMIN_PORT = int(os.getenv("ADMIN_PORT", "13312"))
API_KEY = os.getenv("API_KEY", "sk-ollama-local")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("ollama-openai")

CONFIG_FILE = Path(__file__).parent / "config.json"

def find_ollama_models_path():
    common_paths = [
        Path.home() / ".ollama" / "models",
        Path.home() / ".local" / "share" / "ollama" / "models",
        Path("/usr/share/ollama/.ollama/models"),
        Path("/var/lib/ollama/models"),
    ]
    
    if sys.platform == "darwin":
        common_paths.insert(0, Path.home() / "Library" / "Application Support" / "Ollama" / "models")
    
    for p in common_paths:
        if p.exists():
            return str(p)
    
    return str(Path.home() / ".ollama" / "models")

def load_config():
    global OLLAMA_MODELS_PATH, ADMIN_PORT
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
            if "models_path" in config:
                OLLAMA_MODELS_PATH = config["models_path"]
            if "admin_port" in config:
                ADMIN_PORT = int(config["admin_port"])
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
    else:
        detected_path = find_ollama_models_path()
        if detected_path:
            OLLAMA_MODELS_PATH = detected_path
            logger.info(f"Auto-detected Ollama models path: {OLLAMA_MODELS_PATH}")

def save_config(models_path=None, admin_port=None):
    config = {}
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                config = json.load(f)
        except:
            pass
    
    if models_path is not None:
        config["models_path"] = models_path
    if admin_port is not None:
        config["admin_port"] = int(admin_port)
        
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

load_config()

class StatsManager:
    def __init__(self):
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.total_tokens = 0
        self.input_tokens = 0
        self.output_tokens = 0
        self.model_stats: Dict[str, Dict[str, Any]] = {}
        self.logs: List[Dict[str, Any]] = []
        self.start_time = time.time()
        self.lock = threading.Lock()

    def log_request(self, model: str, prompt_tokens: int, completion_tokens: int, success: bool, latency_ms: float, error: str = None):
        with self.lock:
            self.total_requests += 1
            if success:
                self.successful_requests += 1
            else:
                self.failed_requests += 1

            self.input_tokens += prompt_tokens
            self.output_tokens += completion_tokens
            self.total_tokens += prompt_tokens + completion_tokens

            if model not in self.model_stats:
                self.model_stats[model] = {
                    "requests": 0,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "success": 0,
                    "failed": 0,
                    "avg_latency": 0.0,
                    "total_latency": 0.0,
                }

            stats = self.model_stats[model]
            stats["requests"] += 1
            stats["input_tokens"] += prompt_tokens
            stats["output_tokens"] += completion_tokens
            if success:
                stats["success"] += 1
            else:
                stats["failed"] += 1
            stats["total_latency"] += latency_ms
            stats["avg_latency"] = stats["total_latency"] / stats["requests"]

            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "model": model,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
                "success": success,
                "latency_ms": round(latency_ms, 2),
                "error": error,
            }
            self.logs.append(log_entry)
            if len(self.logs) > 10000:
                self.logs = self.logs[-5000:]

    def get_stats(self):
        with self.lock:
            uptime = time.time() - self.start_time
            hours = int(uptime // 3600)
            minutes = int((uptime % 3600) // 60)
            avg_lat = 0
            if self.model_stats:
                total_lat = sum(ms["total_latency"] for ms in self.model_stats.values())
                total_req = sum(ms["requests"] for ms in self.model_stats.values())
                if total_req > 0:
                    avg_lat = round(total_lat / total_req, 1)
            return {
                "total_requests": self.total_requests,
                "successful_requests": self.successful_requests,
                "failed_requests": self.failed_requests,
                "success_rate": round(self.successful_requests / max(self.total_requests, 1) * 100, 1),
                "total_tokens": self.total_tokens,
                "input_tokens": self.input_tokens,
                "output_tokens": self.output_tokens,
                "avg_latency": avg_lat,
                "uptime": f"{hours}时 {minutes}分",
                "model_stats": dict(self.model_stats),
            }

    def get_logs(self, limit: int = 100, offset: int = 0):
        with self.lock:
            return self.logs[-(limit + offset):-offset if offset else None]

stats = StatsManager()

class OllamaClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.client = httpx.AsyncClient(timeout=300.0)

    async def list_models(self) -> List[Dict[str, Any]]:
        try:
            resp = await self.client.get(f"{self.base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return data.get("models", [])
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []

    async def chat(self, model: str, messages: List[Dict], stream: bool = False, **kwargs) -> Any:
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            **kwargs,
        }
        resp = await self.client.post(f"{self.base_url}/api/chat", json=payload)
        resp.raise_for_status()
        return resp.json()

    async def chat_stream(self, model: str, messages: List[Dict], **kwargs):
        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
            **kwargs,
        }
        async with self.client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if line:
                    yield line

    async def embeddings(self, model: str, input: str, **kwargs) -> Dict:
        payload = {
            "model": model,
            "prompt": input,
            **kwargs,
        }
        resp = await self.client.post(f"{self.base_url}/api/embeddings", json=payload)
        resp.raise_for_status()
        return resp.json()

ollama = OllamaClient(OLLAMA_BASE_URL)

class ChatMessage(BaseModel):
    role: str
    content: str
    name: Optional[str] = None

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 1.0
    top_p: Optional[float] = 1.0
    n: Optional[int] = 1
    stream: Optional[bool] = False
    stop: Optional[Any] = None
    max_tokens: Optional[int] = None
    presence_penalty: Optional[float] = 0.0
    frequency_penalty: Optional[float] = 0.0
    user: Optional[str] = None

class EmbeddingRequest(BaseModel):
    model: str
    input: Any
    encoding_format: Optional[str] = "float"

class ModelInfo(BaseModel):
    id: str
    object: str = "model"
    created: int = 0
    owned_by: str = "ollama"

def format_tokens(n: int) -> str:
    if n >= 1_000_000:
        return f"{n / 1_000_000:.2f}M"
    elif n >= 1_000:
        return f"{n / 1_000:.2f}K"
    return str(n)

def estimate_tokens(text: str) -> int:
    return len(text) // 4

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting Ollama OpenAI API Bridge")
    logger.info(f"Ollama URL: {OLLAMA_BASE_URL}")
    logger.info(f"Models path: {OLLAMA_MODELS_PATH}")
    logger.info(f"Admin UI: http://127.0.0.1:{ADMIN_PORT}/admin")
    yield
    logger.info("Shutting down...")

app = FastAPI(
    title="Ollama OpenAI API Bridge",
    description="Convert Ollama models to OpenAI-compatible API",
    version="1.0.0",
    lifespan=lifespan,
)

static_dir = Path(__file__).parent / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

@app.middleware("http")
async def validate_api_key(request: Request, call_next):
    if request.url.path.startswith("/admin") or request.url.path.startswith("/docs") or request.url.path.startswith("/openapi.json"):
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        if token != API_KEY:
            return JSONResponse(status_code=401, content={"error": "Invalid API key"})
    elif request.url.path.startswith("/v1/"):
        return JSONResponse(status_code=401, content={"error": "Missing Authorization header"})
    
    return await call_next(request)

@app.get("/admin", response_class=HTMLResponse)
@app.get("/admin/models", response_class=HTMLResponse)
@app.get("/admin/logs", response_class=HTMLResponse)
@app.get("/admin/config", response_class=HTMLResponse)
@app.get("/models", response_class=HTMLResponse)
@app.get("/logs", response_class=HTMLResponse)
@app.get("/config", response_class=HTMLResponse)
async def admin_page():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return HTMLResponse(content=index_file.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Admin UI not found</h1>", status_code=404)

@app.get("/admin/api/stats")
async def api_stats():
    return stats.get_stats()

@app.get("/admin/api/logs")
async def api_logs(limit: int = 100, offset: int = 0):
    return stats.get_logs(limit=limit, offset=offset)

@app.get("/admin/api/models")
async def api_models():
    models = await ollama.list_models()
    return models

@app.get("/admin/api/config")
async def get_config():
    return {
        "models_path": OLLAMA_MODELS_PATH,
        "admin_port": ADMIN_PORT,
        "ollama_url": OLLAMA_BASE_URL,
        "api_key": API_KEY,
    }

@app.post("/admin/api/config")
async def update_config(request: Request):
    global OLLAMA_MODELS_PATH, ADMIN_PORT
    try:
        data = await request.json()
        if "models_path" in data:
            OLLAMA_MODELS_PATH = data["models_path"]
        if "admin_port" in data:
            ADMIN_PORT = int(data["admin_port"])
        
        save_config(OLLAMA_MODELS_PATH, ADMIN_PORT)
        return {"status": "success", "message": "配置已保存，端口更改需重启生效"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/v1/models")
async def list_models():
    ollama_models = await ollama.list_models()
    data = []
    for m in ollama_models:
        data.append({
            "id": m["name"],
            "object": "model",
            "created": int(time.time()),
            "owned_by": "ollama",
        })
    return {"object": "list", "data": data}

@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    start_time = time.time()
    messages = [m.model_dump() for m in request.messages]
    
    prompt_text = " ".join([m.get("content", "") for m in messages])
    prompt_tokens = estimate_tokens(prompt_text)
    
    try:
        if request.stream:
            async def stream_generator():
                total_completion_tokens = 0
                try:
                    async for line in ollama.chat_stream(
                        model=request.model,
                        messages=messages,
                        temperature=request.temperature,
                        top_p=request.top_p,
                    ):
                        if line:
                            try:
                                data = json.loads(line)
                                if "message" in data:
                                    content = data["message"].get("content", "")
                                    total_completion_tokens += estimate_tokens(content)
                                    chunk = {
                                        "id": f"chatcmpl-{int(time.time()*1000)}",
                                        "object": "chat.completion.chunk",
                                        "created": int(time.time()),
                                        "model": request.model,
                                        "choices": [{
                                            "index": 0,
                                            "delta": {"content": content},
                                            "finish_reason": None,
                                        }],
                                    }
                                    yield f"data: {json.dumps(chunk)}\n\n"
                                
                                if data.get("done", False):
                                    finish_chunk = {
                                        "id": f"chatcmpl-{int(time.time()*1000)}",
                                        "object": "chat.completion.chunk",
                                        "created": int(time.time()),
                                        "model": request.model,
                                        "choices": [{
                                            "index": 0,
                                            "delta": {},
                                            "finish_reason": "stop",
                                        }],
                                    }
                                    yield f"data: {json.dumps(finish_chunk)}\n\n"
                                    yield "data: [DONE]\n\n"
                                    
                                    latency = (time.time() - start_time) * 1000
                                    stats.log_request(
                                        model=request.model,
                                        prompt_tokens=prompt_tokens,
                                        completion_tokens=total_completion_tokens,
                                        success=True,
                                        latency_ms=latency,
                                    )
                            except json.JSONDecodeError:
                                continue
                except Exception as e:
                    latency = (time.time() - start_time) * 1000
                    stats.log_request(
                        model=request.model,
                        prompt_tokens=prompt_tokens,
                        completion_tokens=0,
                        success=False,
                        latency_ms=latency,
                        error=str(e),
                    )
                    raise

            return StreamingResponse(stream_generator(), media_type="text/event-stream")
        else:
            response = await ollama.chat(
                model=request.model,
                messages=messages,
                temperature=request.temperature,
                top_p=request.top_p,
            )
            
            content = response.get("message", {}).get("content", "")
            completion_tokens = response.get("eval_count", estimate_tokens(content))
            prompt_tokens = response.get("prompt_eval_count", prompt_tokens)
            
            latency = (time.time() - start_time) * 1000
            stats.log_request(
                model=request.model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                success=True,
                latency_ms=latency,
            )
            
            return {
                "id": f"chatcmpl-{int(time.time()*1000)}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": request.model,
                "choices": [{
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": content,
                    },
                    "finish_reason": "stop",
                }],
                "usage": {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": prompt_tokens + completion_tokens,
                },
            }
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        stats.log_request(
            model=request.model,
            prompt_tokens=prompt_tokens,
            completion_tokens=0,
            success=False,
            latency_ms=latency,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/embeddings")
async def create_embeddings(request: EmbeddingRequest):
    start_time = time.time()
    
    try:
        if isinstance(request.input, str):
            inputs = [request.input]
        else:
            inputs = request.input
        
        embeddings = []
        total_tokens = 0
        
        for text in inputs:
            result = await ollama.embeddings(model=request.model, input=text)
            embeddings.append(result.get("embedding", []))
            total_tokens += estimate_tokens(text)
        
        latency = (time.time() - start_time) * 1000
        stats.log_request(
            model=request.model,
            prompt_tokens=total_tokens,
            completion_tokens=0,
            success=True,
            latency_ms=latency,
        )
        
        return {
            "object": "list",
            "data": [
                {
                    "object": "embedding",
                    "embedding": emb,
                    "index": i,
                }
                for i, emb in enumerate(embeddings)
            ],
            "model": request.model,
            "usage": {
                "prompt_tokens": total_tokens,
                "total_tokens": total_tokens,
            },
        }
    except Exception as e:
        latency = (time.time() - start_time) * 1000
        stats.log_request(
            model=request.model,
            prompt_tokens=0,
            completion_tokens=0,
            success=False,
            latency_ms=latency,
            error=str(e),
        )
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/models/{model_id}")
async def get_model(model_id: str):
    models = await ollama.list_models()
    for m in models:
        if m["name"] == model_id:
            return {
                "id": model_id,
                "object": "model",
                "created": int(time.time()),
                "owned_by": "ollama",
            }
    raise HTTPException(status_code=404, detail=f"Model {model_id} not found")

@app.get("/")
async def root():
    return {
        "message": "Ollama OpenAI API Bridge",
        "version": "1.0.0",
        "admin": f"http://127.0.0.1:{ADMIN_PORT}/admin",
        "docs": f"http://127.0.0.1:{ADMIN_PORT}/docs",
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    
    print(f"Starting Ollama OpenAI API Bridge...")
    print(f"Ollama URL: {OLLAMA_BASE_URL}")
    print(f"Models path: {OLLAMA_MODELS_PATH}")
    print(f"Admin UI: http://127.0.0.1:{ADMIN_PORT}/admin")
    print(f"API Docs: http://127.0.0.1:{ADMIN_PORT}/docs")
    print(f"API Key: {API_KEY}")
    
    uvicorn.run(
        "ollama_openai_bridge:app",
        host="0.0.0.0",
        port=ADMIN_PORT,
        log_level="info",
        reload=True,
    )
