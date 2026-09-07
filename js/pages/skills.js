/* =====================================================================
 * pages/skills.js — 能力地图 / 领域详情 / 能力详情
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const utils = window.utils;

  // ===================================================================
  // 能力地图总览（六大领域），可通过 ?cat= 直达某领域详情
  // ===================================================================
  window.Router.register('/skills', {
    title: '能力地图',
    render: function (params, qs) {
      const cat = qs.get('cat');
      if (cat) return domainDetail(cat);
      return overview();
    },
  });

  function overview() {
    const cats = Store.skillsView.categories();
    const max = Math.max(...cats.map(c => c.total), 1);
    return `
      <div class="page-header">
        <div><h1>我的能力地图</h1>
        <p class="sub">能力不靠打分，靠真实经历与行为证据一点点积累。</p></div>
      </div>
      <div class="domain-grid">
        ${cats.map(c => `
          <a class="card domain-card" href="#/skills?cat=${encodeURIComponent(c.key)}">
            <div class="domain-icon">${c.icon}</div>
            <div class="domain-body">
              <div class="domain-name">${UI.esc(c.key)}</div>
              <div class="domain-bar">${UI.bar(c.total / max)}</div>
              <div class="domain-count">${c.total} 项能力证据 · ${c.skills.length} 项能力</div>
            </div>
          </a>`).join('')}
      </div>
      <p class="hint">能力成长基于真实项目和实践证据积累，不代表专业测评结果。</p>`;
  }

  function domainDetail(catKey) {
    const cat = window.CATEGORIES.find(c => c.key === catKey);
    if (!cat) return UI.empty('🚧', '领域不存在');
    const detail = Store.skillsView.categoryDetail(catKey);
    const max = Math.max(...detail.skills.map(s => s.count), 1);
    return `
      <a class="back-link" href="#/skills">← 返回能力地图</a>
      <div class="page-header">
        <div><h1>${cat.icon} ${UI.esc(cat.key)}</h1>
        <p class="sub">该领域下共 ${detail.skills.length} 项能力。</p></div>
      </div>
      <div class="card-list">
        ${detail.skills.map(s => `
          <a class="card skill-row" href="#/skill/${s.skill.id}">
            <div class="skill-row-name">${UI.esc(s.skill.name)}</div>
            <div class="skill-row-bar">${UI.bar(s.count / max)}</div>
            <div class="skill-row-count">${s.count} 项证据 · ${UI.esc(s.level.label)}</div>
          </a>`).join('')}
      </div>`;
  }

  // ===================================================================
  // 能力详情
  // ===================================================================
  window.Router.register('/skill/:id', {
    title: '能力详情',
    render: function (params) {
      const d = Store.skillsView.skillDetail(params.id);
      if (!d.skill) return UI.empty('🚧', '能力不存在');
      const s = d.skill;
      const years = Object.keys(d.groups).sort().reverse();
      return `
        <div id="skill-detail">
        <a class="back-link" href="#/skills?cat=${encodeURIComponent(s.category)}">← 返回${UI.esc(s.category)}</a>
        <section class="card detail-head">
          <div class="detail-title"><h1>${s.icon} ${UI.esc(s.name)}</h1>
            <span class="level-badge level-${d.level.level}">Level ${d.level.level}</span>
          </div>
          <div class="project-meta">
            <span>${UI.esc(d.level.label)}</span>
            <span>有效能力证据 ${d.count} 项</span>
          </div>
          <div class="detail-actions">
            <button class="btn btn-primary" id="add-evidence-btn">+ 添加证据</button>
          </div>
        </section>

        <section class="section">
          <div class="section-head"><h2>所有证据</h2></div>
          ${years.length ? years.map(y => `
            <div class="year-group">
              <div class="year-title">${y}</div>
              <ul class="item-list">
                ${d.groups[y].map(e => `
                  <li>
                    <span class="check">✓</span>
                    <span class="item-text">${UI.esc(e.source || '')}</span>
                    <span class="item-sub">${utils.fmtMonth(e.evidence_date)} · ${UI.esc(e.evidence_description || '')}</span>
                    <span class="item-actions"><button class="btn btn-xs btn-danger" data-action="del" data-id="${e.id}">删除</button></span>
                  </li>`).join('')}
              </ul>
            </div>`).join('') : UI.empty('⭐', '还没有证据，去添加第一条吧')}
        </section>
        </div>`;
    },
    mount: function (params) {
      document.getElementById('add-evidence-btn').onclick = () => addEvidenceForm(params.id);
      document.getElementById('skill-detail').addEventListener('click', e => {
        const btn = e.target.closest('[data-action="del"]');
        if (!btn) return;
        UI.confirm('确定删除这条证据？', async () => {
          await Store.evidence.remove(btn.dataset.id);
          UI.toast('已删除'); window.Router.go();
        }, { danger: true, okLabel: '删除' });
      });
    },
  });

  function addEvidenceForm(skillId) {
    const s = Store.skillById(skillId);
    const projects = Store.projects.list();
    UI.modal({
      title: `记录「${s.name}」证据`,
      content: `
        ${UI.field('来自哪个项目', `<select id="ev-project">
          ${projects.map(p => `<option value="${p.id}">${UI.esc(p.name)}</option>`).join('')}
        </select>`)}
        ${UI.field('具体行为', `<input type="text" id="ev-desc" placeholder="如：完成正式讲解" />`)}
        ${UI.field('时间', `<input type="month" id="ev-date" value="${utils.today().slice(0, 7)}" />`)}`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: '保存', primary: true, onClick: async () => {
            const pid = document.getElementById('ev-project').value;
            const p = Store.projects.get(pid);
            const date = document.getElementById('ev-date').value;
            await Store.evidence.add({
              skill_id: skillId,
              project_id: pid,
              evidence_description: document.getElementById('ev-desc').value.trim() || s.name,
              evidence_date: date ? date + '-01' : utils.today(),
              source: p ? p.name : '',
            });
            UI.toast('证据已记录'); window.Router.go();
          } },
      ],
    });
  }
})();
