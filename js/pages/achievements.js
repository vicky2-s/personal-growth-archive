/* =====================================================================
 * pages/achievements.js — 成就系统
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const utils = window.utils;

  window.Router.register('/achievements', {
    title: '成就',
    render: function () {
      const list = Store.achievements.list();
      const unlocked = list.filter(a => a.unlocked).length;
      const cats = ['表达', '学习', '数字', '成长', '其他'];
      return `
        <div class="page-header">
          <div><h1>成就</h1>
          <p class="sub">每一个成就，都是真实成长留下的印记。已解锁 ${unlocked} / ${list.length}</p></div>
        </div>
        ${cats.map(cat => {
          const group = list.filter(a => a.category === cat);
          if (!group.length) return '';
          return `
            <section class="section">
              <div class="section-head"><h2>${catLabel(cat)}</h2></div>
              <div class="achievement-grid">
                ${group.map(a => achievementCard(a)).join('')}
              </div>
            </section>`;
        }).join('')}`;
    },
  });

  function catLabel(c) {
    return { '表达': '🎤 表达类', '学习': '📚 学习类', '数字': '💻 数字类', '成长': '🌱 成长类', '其他': '其他' }[c] || c;
  }

  function achievementCard(a) {
    const related = a.related_project_id ? Store.projects.get(a.related_project_id) : null;
    return `<div class="card achievement-card ${a.unlocked ? '' : 'locked'}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-body">
        <div class="achievement-name">${UI.esc(a.name)} ${a.unlocked ? '✅' : '🔒'}</div>
        <div class="achievement-desc">${UI.esc(a.description || '')}</div>
        ${a.unlocked_at ? `<div class="achievement-meta">解锁于 ${utils.fmtDate(a.unlocked_at)}</div>` : `<div class="achievement-meta muted">${UI.esc(a.unlock_condition || '条件未公开')}</div>`}
        ${related ? `<div class="achievement-meta">📁 ${UI.esc(related.name)}</div>` : ''}
      </div>
    </div>`;
  }
})();
