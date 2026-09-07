/* =====================================================================
 * app.js — 应用入口
 * 初始化数据层、渲染顶栏、启动路由、绑定全局搜索。
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;

  // 更新顶栏用户信息与模式徽章
  function renderTopbar() {
    const u = Store.user();
    const el = document.getElementById('topbar-user');
    if (!el) return;
    const isDemo = Store.isDemo();
    const name = u && u.display_name ? u.display_name : '朋友';
    el.innerHTML = `
      <span class="mode-badge ${isDemo ? 'demo' : 'live'}">${isDemo ? '演示模式' : '已登录'}</span>
      <span class="topbar-name">${UI.esc(name)}</span>`;
  }

  // 全局搜索（跨项目 / 文件 / 能力证据）
  function bindSearch() {
    const input = document.getElementById('global-search');
    if (!input) return;
    const run = () => {
      const q = input.value.trim();
      if (!q) return;
      const r = Store.search(q);
      const total = r.projects.length + r.files.length + r.evidence.length;
      const m = UI.modal({
        title: `搜索「${UI.esc(q)}」`,
        content: total ? searchResultsHtml(r) : UI.empty('🔍', '没有找到相关内容'),
        actions: [{ label: '关闭', onClick: () => false }],
      });
      m.body.addEventListener('click', e => {
        const a = e.target.closest('[data-nav]');
        if (!a) return;
        m.close();
        window.Router.navigate(a.dataset.nav);
      });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    input.addEventListener('search', run);
  }

  function searchResultsHtml(r) {
    let html = '';
    if (r.projects.length) html += `<div class="search-group"><div class="search-cat">📁 项目</div>` +
      r.projects.map(p => `<button class="search-item" data-nav="#/project/${p.id}">${UI.esc(p.name)} <span class="muted">${UI.esc(p.project_type)}</span></button>`).join('') + '</div>';
    if (r.files.length) html += `<div class="search-group"><div class="search-cat">🗂️ 文件</div>` +
      r.files.map(f => `<button class="search-item" data-nav="#/archive">${utils.fileIcon(f.file_name)} ${UI.esc(f.file_name)}</button>`).join('') + '</div>';
    if (r.evidence.length) html += `<div class="search-group"><div class="search-cat">⭐ 能力证据</div>` +
      r.evidence.map(e => `<button class="search-item" data-nav="#/skill/${e.skill_id}">${UI.esc(e.source || '')} · ${UI.esc(e.evidence_description || '')}</button>`).join('') + '</div>';
    return html;
  }

  const utils = window.utils;

  // 启动
  async function start() {
    await Store.init();
    Store.onAchievement(function (a) {
      UI.toast('🏆 解锁新成就：' + (a.name || ''));
    });
    renderTopbar();
    bindSearch();
    window.SB.onAuthChange(renderTopbar);
    window.Router.start();
  }

  window.addEventListener('DOMContentLoaded', start);
})();
