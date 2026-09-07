/* =====================================================================
 * router.js — 简易 hash 路由
 *
 * 每个页面模块通过 Router.register('/path', handler) 注册，
 * handler 形如 { title, render(params), mount(params) }。
 * ===================================================================== */

window.Router = (function () {
  const routes = [];

  function register(pattern, handler) {
    routes.push({ parts: pattern.split('/').filter(Boolean), handler });
  }

  // 匹配路径，返回 params
  function match(pathParts, patternParts) {
    if (pathParts.length !== patternParts.length) return null;
    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      const p = patternParts[i];
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(pathParts[i]);
      else if (p !== pathParts[i]) return null;
    }
    return params;
  }

  function parse(path) {
    const pathParts = path.split('/').filter(Boolean);
    for (const r of routes) {
      const params = match(pathParts, r.parts);
      if (params) return { handler: r.handler, params };
    }
    return null;
  }

  // 高亮当前导航项
  function setActiveNav(path) {
    let first = path.split('/')[0] || '';
    const map = { '': 'dashboard', 'project': 'projects', 'skill': 'skills' };
    first = map[first] || first;
    document.querySelectorAll('.nav-item').forEach(el => {
      const p = (el.dataset.path || '');
      el.classList.toggle('active', p === first);
    });
  }

  async function go() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const idx = hash.indexOf('?');
    const path = idx >= 0 ? hash.slice(0, idx) : hash;
    const qs = new URLSearchParams(idx >= 0 ? hash.slice(idx + 1) : '');
    const view = document.getElementById('view');

    const found = parse(path);
    if (!found) {
      view.innerHTML = window.UI.empty('🚧', '页面不存在');
      document.title = '人生档案馆';
      return;
    }
    const { handler, params } = found;
    document.title = (handler.title || '') + ' · 人生档案馆';
    setActiveNav(path);
    try {
      const html = await handler.render(params, qs);
      view.innerHTML = html;
      if (handler.mount) handler.mount(params, qs);
    } catch (e) {
      console.error(e);
      view.innerHTML = window.UI.empty('⚠️', '加载出错：' + e.message);
    }
    window.scrollTo(0, 0);
  }

  return {
    register,
    navigate: function (path) { location.hash = path; },
    go,
    start: function () {
      window.addEventListener('hashchange', go);
      go();
    },
  };
})();
