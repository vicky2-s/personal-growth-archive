/* =====================================================================
 * supabase.js — Supabase 客户端初始化与认证
 * ===================================================================== */

window.SB = (function () {
  const cfg = window.APP_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);

  let client = null;
  if (configured && window.supabase) {
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  // 当前登录用户（演示模式下为 demo 用户）
  let currentUser = null;

  // 认证状态变化监听回调列表
  const listeners = [];

  function notify(user) {
    currentUser = user;
    listeners.forEach(fn => { try { fn(user); } catch (e) { console.error(e); } });
  }

  return {
    // 是否已配置 Supabase
    configured: configured,
    client: client,

    // 注册监听认证状态变化（供 router 刷新界面）
    onAuthChange: function (fn) { listeners.push(fn); },

    // 当前用户
    getUser: function () { return currentUser; },
    setUser: function (u) { notify(u); },

    // 获取会话（应用启动时调用）
    async restoreSession() {
      if (!client) return null;
      const { data } = await client.auth.getSession();
      const session = data && data.session;
      if (session && session.user) {
        notify(session.user);
        return session.user;
      }
      return null;
    },

    // 注册
    async signUp(email, password, displayName) {
      const { data, error } = await client.auth.signUp({
        email, password,
        options: { data: { display_name: displayName || '' } },
      });
      if (error) throw error;
      return data;
    },

    // 登录
    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      notify(data.user);
      return data.user;
    },

    // 退出
    async signOut() {
      if (client) await client.auth.signOut();
      notify(null);
    },
  };
})();
