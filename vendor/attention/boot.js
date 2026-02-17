// Move inline scripts out to satisfy MV3 CSP (no inline JS)
(function(){
  // Cloud login is optional; default off for seamless use inside extension
  async function isCloudEnabled(){
    try {
      const qs = new URLSearchParams(location.search);
      if (qs.get('cloud') === '1') return true;
      if (chrome?.storage?.local){
        const r = await chrome.storage.local.get(['attentionCloudEnabled']);
        return !!r.attentionCloudEnabled;
      }
    } catch(_){}
    return false;
  }
  // Check auth and offer a simple login UI using chrome.identity
  async function checkAuth(){
    // If cloud sync not enabled, run in local/offline mode without login
    if (!(await isCloudEnabled())) {
      return true;
    }
    try {
      if (window.supabaseClient) {
        const ok = await window.supabaseClient.init();
        const supabase = window.supabaseClient.getClient();
        if (ok && supabase && supabase.auth) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) return true;
        }
      }
    } catch (_) {}

    // Inject minimal login prompt overlay
    const mount = document.getElementById('app') || document.body;
    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0b0b0bcc;z-index:99999;';
    box.innerHTML = '<div style="padding:16px 20px;border:1px solid #333;border-radius:10px;background:#111;color:#eee;font-family:sans-serif;min-width:280px;">'
      + '<div style="margin-bottom:10px;">需要登录以启用云端功能</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:12px;">'
      +   '<button id="ext-login" style="flex:1;padding:8px 12px;background:#4c8bf5;border:none;border-radius:6px;color:#fff;cursor:pointer;">使用 Google 登录</button>'
      +   '<button id="ext-config" style="padding:8px 12px;background:#2f2f2f;border:1px solid #444;border-radius:6px;color:#ddd;cursor:pointer;">配置</button>'
      + '</div>'
      + '<div style="font-size:12px;color:#999;">首次使用请先点击“配置”，填入你的 Supabase URL 与 Anon Key</div>'
      + '</div>';
    mount.appendChild(box);

    box.querySelector('#ext-config')?.addEventListener('click', async () => {
      const url = prompt('Supabase URL (例如 https://xxxx.supabase.co)', localStorage.getItem('supabase.url') || '');
      if (!url) return;
      const anon = prompt('Supabase Anon Key', localStorage.getItem('supabase.anon') || '');
      if (!anon) return;
      await window.supabaseClient.setConfig({ url, anonKey: anon });
      alert('已保存 Supabase 配置');
    });

    box.querySelector('#ext-login')?.addEventListener('click', async () => {
      try {
        const supabase = window.supabaseClient.getClient();
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            skipBrowserRedirect: true,
            redirectTo: `https://${chrome.runtime.id}.chromiumapp.org/`
          }
        });
        if (error) throw error;
        const authUrl = data?.url;
        if (!authUrl) throw new Error('No auth URL');
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (redirectUrl) => {
          if (chrome.runtime.lastError) {
            console.error('launchWebAuthFlow error:', chrome.runtime.lastError);
            alert('登录失败：' + chrome.runtime.lastError.message);
            return;
          }
          try {
            const u = new URL(redirectUrl);
            const code = u.searchParams.get('code');
            if (!code) throw new Error('No code from redirect');
            const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exErr) throw exErr;
            box.remove();
          } catch (e) {
            console.error('exchangeCodeForSession failed:', e);
            alert('兑换登录凭证失败');
          }
        });
      } catch (e) {
        console.error('OAuth init failed:', e);
        alert('初始化登录失败');
      }
    });
    return false;
  }

  document.addEventListener('DOMContentLoaded', async function() {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;
    console.log('用户已认证，继续加载应用...');
  });

  // SW registration only on http(s)
  if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('Service Worker 注册成功:', reg.scope))
        .catch((err) => console.log('Service Worker 注册失败:', err));
    });
  }
})();
