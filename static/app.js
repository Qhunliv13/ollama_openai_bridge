const { useState, useEffect, useCallback, useMemo } = React;

// Utility functions
function formatTokens(n) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
    return String(n);
}

function formatSize(bytes) {
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN');
}

// Icons as components
const Icons = {
    Dashboard: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect width="7" height="9" x="3" y="3" rx="1"></rect>
            <rect width="7" height="5" x="14" y="3" rx="1"></rect>
            <rect width="7" height="9" x="14" y="12" rx="1"></rect>
            <rect width="7" height="5" x="3" y="16" rx="1"></rect>
        </svg>
    ),
    Models: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"></path>
            <path d="m7 16.5-4.74-2.85"></path>
            <path d="m7 16.5 5-3"></path>
            <path d="M7 16.5v5.17"></path>
            <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"></path>
            <path d="m17 16.5-5-3"></path>
            <path d="m17 16.5 4.74-2.85"></path>
            <path d="M17 16.5v5.17"></path>
            <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"></path>
            <path d="M12 8 7.26 5.15"></path>
            <path d="m12 8 4.74-2.85"></path>
            <path d="M12 13.5V8"></path>
        </svg>
    ),
    Logs: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M15 12h-5"></path>
            <path d="M15 8h-5"></path>
            <path d="M19 17V5a2 2 0 0 0-2-2H4"></path>
            <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"></path>
        </svg>
    ),
    Settings: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    ),
    Refresh: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
            <path d="M16 16h5v5"></path>
        </svg>
    ),
    Search: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
        </svg>
    ),
    Check: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <path d="M21.801 10A10 10 0 1 1 17 3.335"></path>
            <path d="m9 11 3 3L22 4"></path>
        </svg>
    ),
    X: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="m15 9-6 6"></path>
            <path d="m9 9 6 6"></path>
        </svg>
    ),
    Token: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M13.744 17.736a6 6 0 1 1-7.48-7.48"></path>
            <path d="M15 6h1v4"></path>
            <path d="m6.134 14.768.866-.5 2 3.464"></path>
            <circle cx="16" cy="8" r="6"></circle>
        </svg>
    ),
    Clock: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
        </svg>
    ),
    Zap: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"></path>
        </svg>
    ),
    ExternalLink: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M15 3h6v6"></path>
            <path d="M10 14 21 3"></path>
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        </svg>
    ),
    Copy: () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
    ),
};

// Stat Card Component
function StatCard({ title, value, subtitle, icon: Icon, color = "text-muted-foreground" }) {
    return (
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                <Icon />
            </div>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
        </div>
    );
}

// Simple Bar Chart Component
function SimpleBarChart({ data, height = 120 }) {
    if (!data || data.length === 0) return null;
    
    const maxVal = Math.max(...data.map(d => d.value), 1);
    
    return (
        <div className="flex items-end gap-2" style={{ height }}>
            {data.map((item, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                        className="w-full bg-primary/10 rounded-t transition-all hover:bg-primary/20"
                        style={{ height: `${(item.value / maxVal) * 100}%`, minHeight: '4px' }}
                        title={`${item.label}: ${item.value}`}
                    ></div>
                    <span className="text-xs text-muted-foreground truncate w-full text-center" title={item.label}>
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

// Sidebar Component
function Sidebar({ currentPage, onNavigate }) {
    const navItems = [
        { id: 'overview', label: '概览', icon: Icons.Dashboard },
        { id: 'models', label: '模型', icon: Icons.Models },
        { id: 'logs', label: '日志', icon: Icons.Logs },
        { id: 'config', label: '配置', icon: Icons.Settings },
    ];
    
    return (
        <aside className="w-56 border-r border-border bg-card flex flex-col">
            <div className="p-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                    <polyline points="4 17 10 11 4 5"></polyline>
                    <line x1="12" y1="19" x2="20" y2="19"></line>
                </svg>
                <span className="text-lg font-bold">Ollama API</span>
            </div>
            <div className="h-px bg-border"></div>
            <nav className="flex-1 p-2 space-y-1">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => onNavigate(item.id)}
                        className={`nav-link w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            currentPage === item.id 
                                ? 'bg-primary/10 text-primary' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <item.icon />
                        {item.label}
                    </button>
                ))}
            </nav>
            <div className="h-px bg-border"></div>
            <div className="p-2">
                <a href="/docs" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    <Icons.ExternalLink />
                    API 文档
                </a>
            </div>
        </aside>
    );
}

// Overview Page Component
function OverviewPage() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/admin/api/stats');
            const data = await res.json();
            setStats(data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [fetchStats]);
    
    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="pulse text-muted-foreground">加载中...</div></div>;
    }
    
    if (!stats) {
        return <div className="text-center text-muted-foreground">无法获取统计数据</div>;
    }
    
    const chartData = Object.entries(stats.model_stats || {}).map(([name, data]) => ({
        label: name.length > 10 ? name.slice(0, 10) + '...' : name,
        value: data.requests,
    }));
    
    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">概览</h1>
                <button onClick={fetchStats} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors">
                    <Icons.Refresh />
                    刷新
                </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="总请求" 
                    value={stats.total_requests} 
                    icon={Icons.Zap}
                />
                <StatCard 
                    title="成功率" 
                    value={`${stats.success_rate}%`} 
                    subtitle={`${stats.successful_requests} 成功 / ${stats.failed_requests} 失败`}
                    icon={Icons.Check}
                />
                <StatCard 
                    title="平均延迟" 
                    value={`${stats.avg_latency}ms`} 
                    icon={Icons.Clock}
                />
                <StatCard 
                    title="运行时长" 
                    value={stats.uptime} 
                    icon={Icons.Zap}
                />
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard 
                    title="总 Token" 
                    value={formatTokens(stats.total_tokens)} 
                    icon={Icons.Token}
                />
                <StatCard 
                    title="输入 Token" 
                    value={formatTokens(stats.input_tokens)} 
                    icon={Icons.Token}
                    color="text-blue-400"
                />
                <StatCard 
                    title="输出 Token" 
                    value={formatTokens(stats.output_tokens)} 
                    icon={Icons.Token}
                    color="text-emerald-400"
                />
            </div>
            
            {chartData.length > 0 && (
                <div className="rounded-xl bg-card ring-1 ring-foreground/10 p-4">
                    <h3 className="font-medium mb-4">模型请求分布</h3>
                    <SimpleBarChart data={chartData} />
                </div>
            )}
            
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 font-medium">
                        <Icons.Models />
                        模型统计
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="h-10 px-4 text-left font-medium">模型</th>
                                <th className="h-10 px-4 text-right font-medium">请求数</th>
                                <th className="h-10 px-4 text-right font-medium">输入 Token</th>
                                <th className="h-10 px-4 text-right font-medium">输出 Token</th>
                                <th className="h-10 px-4 text-right font-medium">成功率</th>
                                <th className="h-10 px-4 text-right font-medium">平均延迟</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(stats.model_stats || {}).map(([name, ms]) => {
                                const successRate = ((ms.success / Math.max(ms.requests, 1)) * 100).toFixed(1);
                                return (
                                    <tr key={name} className="border-b hover:bg-muted/50">
                                        <td className="px-4 py-2 font-mono text-sm">{name}</td>
                                        <td className="px-4 py-2 text-right">{ms.requests}</td>
                                        <td className="px-4 py-2 text-right text-blue-600">{formatTokens(ms.input_tokens)}</td>
                                        <td className="px-4 py-2 text-right text-emerald-600">{formatTokens(ms.output_tokens)}</td>
                                        <td className="px-4 py-2 text-right">{successRate}%</td>
                                        <td className="px-4 py-2 text-right">{ms.avg_latency.toFixed(1)}ms</td>
                                    </tr>
                                );
                            })}
                            {Object.keys(stats.model_stats || {}).length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">暂无数据</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Models Page Component
function ModelsPage() {
    const [models, setModels] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    const fetchData = useCallback(async () => {
        try {
            const [modelsRes, configRes] = await Promise.all([
                fetch('/admin/api/models'),
                fetch('/admin/api/stats')
            ]);
            const modelsData = await modelsRes.json();
            const configData = await configRes.json();
            setModels(modelsData || []);
            setConfig(configData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [fetchData]);
    
    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="pulse text-muted-foreground">加载中...</div></div>;
    }
    
    const filteredModels = models.filter(m => 
        m.name?.toLowerCase().includes(search.toLowerCase())
    );
    
    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">模型列表</h1>
                <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors">
                    <Icons.Refresh />
                    刷新
                </button>
            </div>
            
            <div className="relative">
                <input
                    type="text"
                    placeholder="搜索模型..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-md bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Icons.Search />
                </div>
            </div>
            
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 font-medium">
                        <Icons.Models />
                        已加载模型 ({filteredModels.length})
                    </div>
                </div>
                <div className="p-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {filteredModels.map((m, i) => {
                            const size = m.size || 0;
                            const sizeStr = size >= 1_073_741_824 
                                ? `${(size / 1_073_741_824).toFixed(2)} GB` 
                                : `${(size / 1_048_576).toFixed(2)} MB`;
                            const digest = m.digest || '';
                            
                            return (
                                <div key={i} className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                                    <div className="font-mono text-sm font-medium truncate" title={m.name}>{m.name}</div>
                                    <div className="mt-2 text-xs text-muted-foreground space-y-1">
                                        <div>大小: {sizeStr}</div>
                                        <div className="font-mono">ID: {digest.slice(0, 16)}...</div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredModels.length === 0 && (
                            <div className="col-span-3 text-center text-muted-foreground py-8">
                                {search ? '没有找到匹配的模型' : '暂无模型'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 font-medium">
                        <Icons.Models />
                        模型文件目录
                    </div>
                </div>
                <div className="p-4">
                    <div className="font-mono text-sm bg-muted p-3 rounded-lg">C:\Users\1\.ollama\models</div>
                    <div className="mt-3 text-sm text-muted-foreground">
                        <p>模型存储路径: <code className="bg-muted px-1 py-0.5 rounded">C:\Users\1\.ollama\models</code></p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Logs Page Component
function LogsPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    
    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch('/admin/api/logs?limit=200');
            const data = await res.json();
            setLogs(data || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    }, []);
    
    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000);
        return () => clearInterval(interval);
    }, [fetchLogs]);
    
    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="pulse text-muted-foreground">加载中...</div></div>;
    }
    
    const filteredLogs = logs.filter(log => {
        const matchesSearch = !search || 
            log.model?.toLowerCase().includes(search.toLowerCase()) ||
            log.error?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'all' || 
            (filterStatus === 'success' && log.success) ||
            (filterStatus === 'error' && !log.success);
        return matchesSearch && matchesStatus;
    });
    
    return (
        <div className="space-y-6 fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">请求日志</h1>
                <button onClick={fetchLogs} className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-muted hover:bg-muted/80 transition-colors">
                    <Icons.Refresh />
                    刷新
                </button>
            </div>
            
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Icons.Search />
                    </div>
                    <input
                        type="text"
                        placeholder="搜索模型或错误信息..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-md bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="px-3 py-2 rounded-md bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">全部</option>
                    <option value="success">成功</option>
                    <option value="error">失败</option>
                </select>
            </div>
            
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 font-medium">
                        <Icons.Logs />
                        最近请求 ({filteredLogs.length})
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="h-10 px-4 text-left font-medium">时间</th>
                                <th className="h-10 px-4 text-left font-medium">模型</th>
                                <th className="h-10 px-4 text-right font-medium">输入 Token</th>
                                <th className="h-10 px-4 text-right font-medium">输出 Token</th>
                                <th className="h-10 px-4 text-right font-medium">延迟</th>
                                <th className="h-10 px-4 text-center font-medium">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.slice().reverse().map((log, i) => (
                                <tr key={i} className="border-b hover:bg-muted/50">
                                    <td className="px-4 py-2 font-mono text-xs">{formatDate(log.timestamp)}</td>
                                    <td className="px-4 py-2 font-mono text-xs">{log.model}</td>
                                    <td className="px-4 py-2 text-right text-blue-600">{log.prompt_tokens}</td>
                                    <td className="px-4 py-2 text-right text-emerald-600">{log.completion_tokens}</td>
                                    <td className="px-4 py-2 text-right">{log.latency_ms}ms</td>
                                    <td className="px-4 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            log.success 
                                                ? 'bg-green-500/15 text-green-700' 
                                                : 'bg-red-500/15 text-red-700'
                                        }`}>
                                            {log.success ? '成功' : '失败'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="px-4 py-8 text-center text-muted-foreground">暂无日志</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Config Page Component
function ConfigPage() {
    const [config, setConfig] = useState({
        ollamaUrl: '',
        modelsPath: '',
        port: '',
        apiKey: '',
    });
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({ modelsPath: '', port: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [copied, setCopied] = useState(false);
    
    useEffect(() => {
        fetch('/admin/api/config')
            .then(res => res.json())
            .then(data => {
                setConfig(data);
                setFormData({
                    modelsPath: data.models_path || '',
                    port: data.admin_port || '',
                });
            })
            .catch(err => console.error('Failed to fetch config:', err));
    }, []);
    
    const handleSave = async () => {
        try {
            const res = await fetch('/admin/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    models_path: formData.modelsPath,
                    admin_port: parseInt(formData.port),
                }),
            });
            const result = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: result.message || '保存成功' });
                setConfig(prev => ({
                    ...prev,
                    models_path: formData.modelsPath,
                    admin_port: parseInt(formData.port),
                }));
                setEditing(false);
            } else {
                setMessage({ type: 'error', text: result.detail || '保存失败' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: '网络错误' });
        }
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    };
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const pythonExample = `from openai import OpenAI

client = OpenAI(
    base_url="http://127.0.0.1:${config.port}/v1",
    api_key="${config.apiKey}"
)

response = client.chat.completions.create(
    model="your-model-name",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`;
    
    return (
        <div className="space-y-6 fade-in">
            <h1 className="text-2xl font-bold">配置信息</h1>
            
            {message.text && (
                <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message.text}
                </div>
            )}
            
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                        <Icons.Settings />
                        服务配置
                    </div>
                    {!editing ? (
                        <button 
                            onClick={() => setEditing(true)}
                            className="text-sm px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                        >
                            编辑
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { setEditing(false); setMessage({ type: '', text: '' }); }}
                                className="text-sm px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                            >
                                取消
                            </button>
                            <button 
                                onClick={handleSave}
                                className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                保存
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-muted-foreground">Ollama 地址</label>
                        <div className="flex items-center gap-2">
                            <div className="font-mono text-sm bg-muted p-3 rounded-lg flex-1">{config.ollama_url || config.ollamaUrl}</div>
                            <button onClick={() => copyToClipboard(config.ollama_url || config.ollamaUrl)} className="p-2 rounded-md hover:bg-muted transition-colors" title="复制">
                                <Icons.Copy />
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-muted-foreground">模型文件路径</label>
                        {editing ? (
                            <input 
                                type="text" 
                                value={formData.modelsPath}
                                onChange={e => setFormData(prev => ({ ...prev, modelsPath: e.target.value }))}
                                className="w-full font-mono text-sm bg-background border border-border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="font-mono text-sm bg-muted p-3 rounded-lg flex-1">{config.models_path || config.modelsPath}</div>
                                <button onClick={() => copyToClipboard(config.models_path || config.modelsPath)} className="p-2 rounded-md hover:bg-muted transition-colors" title="复制">
                                    <Icons.Copy />
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-muted-foreground">API 端口</label>
                        {editing ? (
                            <input 
                                type="number" 
                                value={formData.port}
                                onChange={e => setFormData(prev => ({ ...prev, port: e.target.value }))}
                                className="w-full font-mono text-sm bg-background border border-border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="font-mono text-sm bg-muted p-3 rounded-lg flex-1">{config.admin_port || config.port}</div>
                                <button onClick={() => copyToClipboard(String(config.admin_port || config.port))} className="p-2 rounded-md hover:bg-muted transition-colors" title="复制">
                                    <Icons.Copy />
                                </button>
                            </div>
                        )}
                        {editing && <p className="text-xs text-amber-600">注意：端口更改后需要重启服务才能生效</p>}
                    </div>
                    
                    <div className="grid gap-2">
                        <label className="text-sm font-medium text-muted-foreground">API Key</label>
                        <div className="flex items-center gap-2">
                            <div className="font-mono text-sm bg-muted p-3 rounded-lg flex-1">{config.api_key || config.apiKey}</div>
                            <button onClick={() => copyToClipboard(config.api_key || config.apiKey)} className="p-2 rounded-md hover:bg-muted transition-colors" title="复制">
                                <Icons.Copy />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="rounded-xl bg-card ring-1 ring-foreground/10">
                <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2 font-medium">
                        <Icons.ExternalLink />
                        使用说明
                    </div>
                </div>
                <div className="p-4 space-y-3 text-sm">
                    <div>
                        <p className="font-medium mb-1">OpenAI 兼容API 端点</p>
                        <div className="font-mono text-xs bg-muted p-3 rounded-lg space-y-1">
                            <p>Chat Completions: POST http://127.0.0.1:{config.port}/v1/chat/completions</p>
                            <p>Embeddings: POST http://127.0.0.1:{config.port}/v1/embeddings</p>
                            <p>List Models: GET http://127.0.0.1:{config.port}/v1/models</p>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <p className="font-medium">Python 示例</p>
                            <button 
                                onClick={() => copyToClipboard(pythonExample)}
                                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {copied ? '已复制!' : <><Icons.Copy /> 复制</>}
                            </button>
                        </div>
                        <div className="font-mono text-xs bg-muted p-3 rounded-lg">
                            <pre className="whitespace-pre-wrap">{pythonExample}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Main App Component
function App() {
    const getPageFromUrl = () => {
        const path = window.location.pathname;
        if (path === '/models' || path === '/admin/models') return 'models';
        if (path === '/logs' || path === '/admin/logs') return 'logs';
        if (path === '/config' || path === '/admin/config') return 'config';
        return 'overview';
    };
    
    const [currentPage, setCurrentPage] = useState(getPageFromUrl);
    
    const navigate = (page) => {
        setCurrentPage(page);
        const url = page === 'overview' ? '/admin' : `/${page}`;
        window.history.pushState({ page }, '', url);
    };
    
    useEffect(() => {
        const handlePopState = () => {
            setCurrentPage(getPageFromUrl());
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
    
    const renderPage = () => {
        switch (currentPage) {
            case 'overview': return <OverviewPage />;
            case 'models': return <ModelsPage />;
            case 'logs': return <LogsPage />;
            case 'config': return <ConfigPage />;
            default: return <OverviewPage />;
        }
    };
    
    return (
        <div className="min-h-screen flex">
            <Sidebar currentPage={currentPage} onNavigate={navigate} />
            <main className="flex-1 overflow-auto">
                <div className="p-6 w-full">
                    {renderPage()}
                </div>
            </main>
        </div>
    );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
