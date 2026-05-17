# Ollama OpenAI API Bridge

将本地 Ollama 模型转换为 OpenAI 兼容 API 的轻量级桥接服务，自带管理面板。

## 功能

- OpenAI 兼容 API（`/v1/chat/completions`、`/v1/embeddings`、`/v1/models`）
- 支持流式输出（SSE）
- 管理面板：实时统计、模型列表、请求日志、配置管理
- 自动检测 Ollama 模型路径
- 热重载开发模式

## 快速开始

```bash
pip install -r requirements.txt
python ollama_openai_bridge.py
```

访问管理面板：http://127.0.0.1:13312/admin

## 使用示例

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:13312/v1",
    api_key="sk-ollama-local"
)

response = client.chat.completions.create(
    model="deepseek-r1:1.5b",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)
```

## 配置

通过环境变量或管理面板修改：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434` | Ollama 服务地址 |
| `OLLAMA_MODELS_PATH` | `C:\Users\1\.ollama\models` | 模型文件路径 |
| `ADMIN_PORT` | `13312` | 服务端口 |
| `API_KEY` | `sk-ollama-local` | API 密钥 |
