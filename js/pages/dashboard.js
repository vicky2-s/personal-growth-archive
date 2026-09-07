/* =====================================================================
 * pages/dashboard.js — 首页
 * ===================================================================== */

window.Router.register('/', {
  title: '首页',
  render: function () {
    const u = window.Store.user();
    const s = window.Store.stats();
    const name = u && u.display_name ? u.display_name : '朋友';

    return `
      <section class="greeting">
        <div class="greeting-emoji">👋</div>
        <div>
          <h1>你好，${window.UI.esc(name)}</h1>
          <p>欢迎回到你的人生档案馆。</p>
        </div>
      </section>

      <section class="stat-grid">
        ${statCard('📁', s.projects, '已记录项目')}
        ${statCard('🗂️', s.files, '已归档文件')}
        ${statCard('⭐', s.evidence, '能力证据')}
        ${statCard('🏆', s.achievements, '已解锁成就')}
      </section>

      <section class="section">
        <div class="section-head">
          <h2>当前进行中的项目</h2>
          <a href="#/projects" class="link">查看全部</a>
        </div>
        <div class="card-list">
          ${window.Store.projects.ongoing().map(p => {
            const act = window.Store.projects.activity(p);
            return `
              <a class="card project-card" href="#/project/${p.id}">
                <div class="project-card-top">
                  <span class="project-name">${window.UI.esc(p.name)}</span>
                  ${window.UI.statusBadge(p.status)}
                </div>
                <div class="project-meta">
                  <span>${window.utils.fmtMonth(p.start_date) || '未设定时间'}</span>
                  <span>更新于 ${window.utils.timeAgo(p.updated_at)}</span>
                </div>
                <div class="project-progress">${window.UI.bar(act)}</div>
              </a>`;
          }).join('') || window.UI.empty('📁', '暂无进行中的项目，去创建一个吧')}
        </div>
      </section>

      <section class="section">
        <div class="section-head">
          <h2>能力概览</h2>
          <a href="#/skills" class="link">能力地图</a>
        </div>
        <div class="domain-grid">
          ${window.Store.skillsView.categories().map(c => {
            const max = Math.max(...window.Store.skillsView.categories().map(x => x.total), 1);
            return `
              <a class="card domain-card" href="#/skills?cat=${encodeURIComponent(c.key)}">
                <div class="domain-icon">${c.icon}</div>
                <div class="domain-body">
                  <div class="domain-name">${window.UI.esc(c.key)}</div>
                  <div class="domain-bar">${window.UI.bar(c.total / max)}</div>
                  <div class="domain-count">${c.total} 项能力证据</div>
                </div>
              </a>`;
          }).join('')}
        </div>
        <p class="hint">能力成长基于真实项目和实践证据积累，不代表专业测评结果。</p>
      </section>

      <section class="section">
        <div class="section-head"><h2>最近成长</h2></div>
        <div class="activity-list">
          ${window.Store.recentActivity(8).map(a => `
            <div class="activity-item">
              <span class="activity-icon">${a.icon}</span>
              <span class="activity-title">${window.UI.esc(a.title)}</span>
              <span class="activity-type">${typeLabel(a.type)}</span>
              <span class="activity-time">${window.utils.timeAgo(a.time)}</span>
            </div>`).join('') || window.UI.empty('🌱', '开始记录你的第一个经历吧')}
        </div>
      </section>`;
  },
});

function statCard(icon, num, label) {
  return `<div class="stat-card"><div class="stat-icon">${icon}</div><div class="stat-num">${num}</div><div class="stat-label">${label}</div></div>`;
}

function typeLabel(type) {
  return { project: '项目', file: '文件', evidence: '证据', achievement: '成就' }[type] || '';
}
