// Supabase 客户端配置
// 注意：这是浏览器版本，不使用 ES6 模块

// 你的 Supabase 项目配置（可在扩展设置里覆盖）
let SUPABASE_URL = 'https://dpmrdhjltbhbhguuwxwy.supabase.co';
let SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwbXJkaGpsdGJoYmhndXV3eHd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5MTE0ODgsImV4cCI6MjA3MjQ4NzQ4OH0.P8LgzNlDVXc3criWEQ3RPwKKeMb3OG8KsCtTYpiUA-w';
// 创建 Supabase 客户端
let supabase = null;

async function loadSupabaseConfig() {
    try {
        if (chrome?.storage?.local) {
            const cfg = await new Promise((resolve)=>chrome.storage.local.get(['supabaseConfig'], resolve));
            if (cfg && cfg.supabaseConfig && cfg.supabaseConfig.url && cfg.supabaseConfig.anonKey) {
                SUPABASE_URL = cfg.supabaseConfig.url;
                SUPABASE_ANON_KEY = cfg.supabaseConfig.anonKey;
            }
        } else if (window.localStorage) {
            const url = localStorage.getItem('supabase.url');
            const key = localStorage.getItem('supabase.anon');
            if (url && key) { SUPABASE_URL = url; SUPABASE_ANON_KEY = key; }
        }
    } catch (_) {}
}

// 初始化 Supabase 客户端
async function initSupabaseClient() {
    try {
        await loadSupabaseConfig();
        // 检查 Supabase 是否已加载
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase 客户端初始化成功');
            return true;
        } else {
            console.warn('⚠️ Supabase SDK 未加载，等待加载...');
            // 等待 Supabase SDK 加载完成
            setTimeout(async () => {
                await loadSupabaseConfig();
                if (typeof window.supabase !== 'undefined') {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    console.log('✅ Supabase 客户端延迟初始化成功');
                }
            }, 1000);
            return false;
        }
    } catch (error) {
        console.error('❌ Supabase 初始化失败:', error);
        return false;
    }
}

// 导出到全局作用域（浏览器兼容）
window.supabaseClient = {
    init: initSupabaseClient,
    getClient: () => supabase,
    isConnected: () => supabase !== null,
    setConfig: async ({ url, anonKey }) => {
        if (url && anonKey) {
            try {
                if (chrome?.storage?.local) {
                    await chrome.storage.local.set({ supabaseConfig: { url, anonKey } });
                } else if (window.localStorage) {
                    localStorage.setItem('supabase.url', url);
                    localStorage.setItem('supabase.anon', anonKey);
                }
                SUPABASE_URL = url;
                SUPABASE_ANON_KEY = anonKey;
                if (typeof window.supabase !== 'undefined') {
                    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                }
                console.log('✅ Supabase 配置已更新');
                return true;
            } catch (e) { console.error(e); }
        }
        return false;
    },
    // 测试连接
    testConnection: async function() {
        if (!supabase) {
            console.log('❌ Supabase 客户端未初始化');
            return false;
        }
        
        try {
            // 尝试获取当前用户（不需要登录）
            const { data, error } = await supabase.auth.getUser();
            if (error && error.message !== 'Invalid JWT') {
                console.log('❌ Supabase 连接测试失败:', error.message);
                return false;
            }
            console.log('✅ Supabase 连接测试成功');
            return true;
        } catch (error) {
            console.log('❌ Supabase 连接测试异常:', error);
            return false;
        }
    }
};

// 页面加载完成后自动初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 页面加载完成，开始初始化 Supabase...');
    initSupabaseClient();
});

// 如果 DOMContentLoaded 已经触发，立即初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabaseClient);
} else {
    initSupabaseClient();
}
