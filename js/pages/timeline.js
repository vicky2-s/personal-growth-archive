/* =====================================================================
 * pages/timeline.js — 成长时间轴
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const utils = window.utils;

  window.Router.register('/timeline', {
    title: '时间轴',
    render: function () {
      const years = Store.timeline.years();
      const skills = Store.skills();
      return `
        <div class="page-header">
          <div><h1>我的成长时间轴</h1>
          <p class="sub">按时间回望走过的每一个节点。</p></div>
        </div>
        <div class="filters">
          <select id="tl-year"><option value="全部">全部年份</option>${years.map(y => `<option>${y}</option>`).join('')}</select>
          <select id="tl-type"><option value="全部">全部类型</option>${window.PROJECT_TYPES.map(t => `<option>${t}</option>`).join('')}</select>
          <select id="tl-skill"><option value="全部">全部能力</option>${skills.map(s => `<option value="${s.id}">${UI.esc(s.name)}</option>`).join('')}</select>
        </div>
        <div id="timeline"></div>`;
    },
    mount: function () {
      const filters = () => ({
        year: document.getElementById('tl-year').value,
        type: document.getElementById('tl-type').value,
        skill: document.getElementById('tl-skill').value,
      });
      function refresh() {
        const f = filters();
        const groups = Store.timeline.list({
          year: f.year, type: f.type, skill: f.skill === '全部' ? '' : f.skill,
        });
        const keys = Object.keys(groups).sort().reverse();
        document.getElementById('timeline').innerHTML = keys.length
          ? `<div class="timeline">${keys.map(y => `
              <div class="year-node"><div class="year-badge">${y}</div></div>
              ${groups[y].map(p => `
                <a class="timeline-item" href="#/project/${p.id}">
                  <div class="timeline-dot"></div>
                  <div class="timeline-card">
                    <div class="timeline-title">${UI.esc(p.name)}</div>
                    <div class="timeline-meta">
                      ${UI.statusBadge(p.status)}
                      <span>${UI.esc(p.project_type)}</span>
                      <span>${utils.fmtMonth(p.start_date)}</span>
                    </div>
                    ${p.description ? `<div class="timeline-desc">${UI.esc(p.description)}</div>` : ''}
                    ${UI.chips(p.tags)}
                  </div>
                </a>`).join('')}
            `).join('')}</div>`
          : UI.empty('🕰️', '没有符合条件的经历');
      }
      ['tl-year', 'tl-type', 'tl-skill'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('change', refresh);
      });
      refresh();
    },
  });
})();
