/* =====================================================================
 * pages/projects.js — 项目列表 + 项目详情
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const utils = window.utils;

  // ===================================================================
  // 项目列表页
  // ===================================================================
  window.Router.register('/projects', {
    title: '项目',
    render: function () {
      return `
        <div class="page-header">
          <div>
            <h1>项目</h1>
            <p class="sub">人生经历的节点，记录每一个真实的项目与活动。</p>
          </div>
          <button class="btn btn-primary" id="new-project-btn">+ 新建项目</button>
        </div>
        <div class="filters">
          <input type="search" id="project-search" placeholder="搜索项目名称、描述、标签…" />
          <select id="project-status">
            <option value="全部">全部状态</option>
            <option>进行中</option><option>已完成</option><option>暂停</option>
          </select>
          <select id="project-type">
            <option value="全部">全部类型</option>
            ${window.PROJECT_TYPES.map(t => `<option>${t}</option>`).join('')}
          </select>
        </div>
        <div id="project-list"></div>`;
    },
    mount: function () {
      const filters = () => ({
        q: document.getElementById('project-search').value,
        status: document.getElementById('project-status').value,
        type: document.getElementById('project-type').value,
      });
      function refresh() {
        const list = Store.projects.list(filters());
        document.getElementById('project-list').innerHTML = list.map(p => projectCard(p)).join('')
          || UI.empty('📁', '没有符合条件的项目');
      }
      ['project-search', 'project-status', 'project-type'].forEach(id => {
        document.getElementById(id).addEventListener('input', refresh);
        document.getElementById(id).addEventListener('change', refresh);
      });
      document.getElementById('new-project-btn').onclick = () => { projectForm(); };
      refresh();
    },
  });

  function projectCard(p) {
    const fileCount = Store.files.list({ project: p.id }).length;
    const evCount = Store.evidence.list({ project: p.id }).length;
    return `
      <a class="card project-card list-card" href="#/project/${p.id}">
        <div class="project-card-top">
          <span class="project-name">${UI.esc(p.name)}</span>
          ${UI.statusBadge(p.status)}
        </div>
        <div class="project-meta">
          <span>${UI.esc(p.project_type)}</span>
          <span>${utils.fmtMonth(p.start_date)}</span>
          <span>${fileCount} 文件</span>
          <span>${evCount} 证据</span>
        </div>
        ${p.description ? `<div class="project-desc">${UI.esc(p.description)}</div>` : ''}
        ${UI.chips(p.tags)}
      </a>`;
  }

  // 新建/编辑项目表单
  function projectForm(existing) {
    const isEdit = !!existing;
    const m = UI.modal({
      title: isEdit ? '编辑项目' : '新建项目',
      content: `
        ${UI.field('项目名称', `<input type="text" id="pf-name" value="${UI.esc(existing ? existing.name : '')}" />`)}
        <div class="field-row">
          ${UI.field('项目类型', `<select id="pf-type">${window.PROJECT_TYPES.map(t => `<option ${existing && existing.project_type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
          ${UI.field('项目状态', `<select id="pf-status">${window.PROJECT_STATUS.map(s => `<option ${existing && existing.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>`)}
        </div>
        <div class="field-row">
          ${UI.field('开始时间', `<input type="month" id="pf-start" value="${UI.esc(existing && existing.start_date ? String(existing.start_date).slice(0, 7) : '')}" />`)}
          ${UI.field('结束时间', `<input type="month" id="pf-end" value="${UI.esc(existing && existing.end_date ? String(existing.end_date).slice(0, 7) : '')}" />`)}
        </div>
        ${UI.field('项目描述', `<textarea id="pf-desc" rows="3">${UI.esc(existing ? existing.description || '' : '')}</textarea>`)}
        <div class="field"><span class="field-label">项目标签</span><span id="pf-tags-slot"></span></div>
        <div class="field"><span class="field-label">项目成果（如：最终讲解稿、获奖证书）</span><span id="pf-outcomes-slot"></span></div>`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: '保存', primary: true, onClick: async () => {
            const name = document.getElementById('pf-name').value.trim();
            if (!name) { UI.toast('请填写项目名称'); return 'keep'; }
            const start = document.getElementById('pf-start').value;
            const end = document.getElementById('pf-end').value;
            const data = {
              name,
              project_type: document.getElementById('pf-type').value,
              status: document.getElementById('pf-status').value,
              start_date: start ? start + '-01' : null,
              end_date: end ? end + '-01' : null,
              description: document.getElementById('pf-desc').value.trim(),
              tags: m._tags._getTags(),
              outcomes: m._outcomes._getTags(),
            };
            try {
              if (isEdit) await Store.projects.update(existing.id, data);
              else await Store.projects.create(data);
              UI.toast(isEdit ? '已保存' : '项目已创建');
              window.Router.go();
            } catch (e) { UI.toast('保存失败：' + e.message); }
          } },
      ],
    });
    m._tags = UI.tagInput('pf-tags', existing ? existing.tags : []);
    m._outcomes = UI.tagInput('pf-outcomes', existing ? existing.outcomes : []);
    document.getElementById('pf-tags-slot').appendChild(m._tags);
    document.getElementById('pf-outcomes-slot').appendChild(m._outcomes);
    return m;
  }

  // ===================================================================
  // 项目详情页
  // ===================================================================
  window.Router.register('/project/:id', {
    title: '项目详情',
    render: function (params) {
      const p = Store.projects.get(params.id);
      if (!p) return UI.empty('🚧', '项目不存在或已删除');
      return detailLayout(p);
    },
    mount: function (params) {
      const pid = params.id;
      const root = document.getElementById('project-detail');
      root.addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        handleAction(btn.dataset.action, btn, pid);
      });
    },
  });

  function detailLayout(p) {
    const files = Store.files.list({ project: p.id });
    const roles = Store.roles.list(p.id);
    const contribs = Store.contributions.list(p.id);
    const evidences = Store.evidence.list({ project: p.id });
    const reflections = Store.reflections.list(p.id);

    return `
      <div id="project-detail">
        <a class="back-link" href="#/projects">← 返回项目列表</a>

        <section class="card detail-head">
          <div class="detail-title">
            <h1>${UI.esc(p.name)}</h1>
            ${UI.statusBadge(p.status)}
          </div>
          <div class="project-meta">
            <span>${UI.esc(p.project_type)}</span>
            <span>${utils.fmtMonth(p.start_date)}${p.end_date ? ' ~ ' + utils.fmtMonth(p.end_date) : ' 至今'}</span>
            <span>更新于 ${utils.timeAgo(p.updated_at)}</span>
          </div>
          ${p.description ? `<p class="detail-desc">${UI.esc(p.description)}</p>` : ''}
          ${UI.chips(p.tags)}
          <div class="detail-actions">
            <button class="btn" data-action="edit-project">✏️ 编辑</button>
            <button class="btn btn-danger" data-action="delete-project">🗑 删除</button>
          </div>
        </section>

        <div class="detail-grid">
          ${section('🎭 我的角色', 'roles', rolesList(p.id), 'add-role')}
          ${section('🛠️ 我的贡献', 'contrib', contribList(p.id), 'add-contribution')}
          ${section('🏅 项目成果', 'outcomes', outcomesList(p.id), 'add-outcome')}
          ${section('🧠 能力成长', 'evidence', evidenceList(p.id), 'add-evidence')}
        </div>

        <section class="card">
          <div class="section-head">
            <h2>📎 相关文件（${files.length}）</h2>
            <button class="btn btn-sm" data-action="upload-file">⬆ 上传文件</button>
          </div>
          <div class="file-grid">${files.map(f => fileCard(f, true)).join('') || UI.empty('📎', '暂无文件')}</div>
        </section>

        <section class="card">
          <div class="section-head">
            <h2>🌱 个人反思</h2>
            <button class="btn btn-sm" data-action="add-reflection">+ 写反思</button>
          </div>
          <div class="reflection-list">${reflectionsList(p.id)}</div>
        </section>
      </div>`;
  }

  function section(title, key, content, action) {
    return `<div class="card"><div class="section-head">
      <h2>${title}</h2><button class="btn btn-sm" data-action="${action}">+ 添加</button>
    </div>${content}</div>`;
  }

  function rolesList(pid) {
    const list = Store.roles.list(pid);
    if (!list.length) return UI.empty('🎭', '还没有记录角色');
    return `<div class="chip-list">${list.map(r => `
      <span class="chip chip-lg">${UI.esc(r.role_name)}
        <button data-action="remove-role" data-id="${r.id}" class="chip-x">×</button>
      </span>`).join('')}</div>`;
  }

  function contribList(pid) {
    const list = Store.contributions.list(pid);
    if (!list.length) return UI.empty('🛠️', '还没有记录贡献');
    return `<ul class="item-list">${list.map(c => `
      <li>
        <span class="item-text">${UI.esc(c.description)}</span>
        <span class="item-actions">
          <button class="btn btn-xs" data-action="link-skill" data-id="${c.id}">关联能力</button>
          <button class="btn btn-xs btn-danger" data-action="remove-contribution" data-id="${c.id}">删除</button>
        </span>
      </li>`).join('')}</ul>`;
  }

  function outcomesList(pid) {
    const p = Store.projects.get(pid);
    const list = utils.tags(p.outcomes);
    if (!list.length) return UI.empty('🏅', '还没有记录成果');
    return `<div class="chip-list">${list.map((o, i) => `
      <span class="chip chip-lg">${UI.esc(o)}
        <button data-action="remove-outcome" data-index="${i}" class="chip-x">×</button>
      </span>`).join('')}</div>`;
  }

  function evidenceList(pid) {
    const list = Store.evidence.list({ project: pid });
    if (!list.length) return UI.empty('🧠', '这个项目还没产生能力证据');
    return `<ul class="item-list">${list.map(e => {
      const s = Store.skillById(e.skill_id);
      return `<li>
        <span class="item-text">${s ? s.icon : ''} <b>${UI.esc(s ? s.name : '')}</b> — ${UI.esc(e.evidence_description || '')}</span>
        <span class="item-actions">
          <button class="btn btn-xs btn-danger" data-action="remove-evidence" data-id="${e.id}">删除</button>
        </span>
      </li>`;
    }).join('')}</ul>`;
  }

  function reflectionsList(pid) {
    const list = Store.reflections.list(pid);
    if (!list.length) return UI.empty('🌱', '写下反思，帮助自己看见成长');
    return list.map(r => `
      <div class="reflection-card">
        <div class="reflection-actions"><button class="btn btn-xs btn-danger" data-action="remove-reflection" data-id="${r.id}">删除</button></div>
        ${r.learned ? `<div><b>学到了什么</b><p>${UI.esc(r.learned)}</p></div>` : ''}
        ${r.difficulty ? `<div><b>遇到了什么困难</b><p>${UI.esc(r.difficulty)}</p></div>` : ''}
        ${r.improvement ? `<div><b>以后可以改进什么</b><p>${UI.esc(r.improvement)}</p></div>` : ''}
      </div>`).join('');
  }

  function fileCard(f, inProject) {
    return `<div class="file-card">
      <div class="file-icon">${utils.fileIcon(f.file_name)}</div>
      <div class="file-name" title="${UI.esc(f.file_name)}">${UI.esc(f.file_name)}</div>
      <div class="file-sub">${(f.file_type || '').toUpperCase()} · ${fmtSize(f.file_size)}</div>
      ${UI.chips(f.tags)}
      <div class="file-actions">
        <button class="btn btn-xs" data-action="ai-file" data-id="${f.id}">🤖 AI</button>
        <button class="btn btn-xs" data-action="file-download" data-id="${f.id}">下载</button>
        ${inProject ? `<button class="btn btn-xs" data-action="file-move" data-id="${f.id}">移动</button>` : ''}
        <button class="btn btn-xs btn-danger" data-action="file-remove" data-id="${f.id}">删除</button>
      </div>
    </div>`;
  }

  function fmtSize(n) {
    if (!n) return '未知';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  // ===================================================================
  // 动作分发
  // ===================================================================
  async function handleAction(action, btn, pid) {
    const id = btn.dataset.id;
    const p = Store.projects.get(pid);

    switch (action) {
      case 'edit-project': { projectForm(p); break; }

      case 'delete-project': {
        UI.confirm(`确定删除项目「${p.name}」？相关文件会保留为未分类。`, async () => {
          await Store.projects.remove(pid);
          UI.toast('已删除');
          window.Router.navigate('#/projects');
        }, { danger: true, okLabel: '删除' });
        break;
      }

      case 'add-role': {
        UI.prompt({ title: '添加角色', label: '角色名称（如：讲解员）', required: true, onOk: async v => {
          await Store.roles.add(pid, v); UI.toast('已添加'); window.Router.go();
        }}); break;
      }
      case 'remove-role': { await Store.roles.remove(id); UI.toast('已删除'); window.Router.go(); break; }

      case 'add-contribution': {
        UI.prompt({ title: '添加贡献', label: '具体贡献（如：查阅历史资料）', multiline: true, required: true, onOk: async v => {
          await Store.contributions.add(pid, v); UI.toast('已添加'); window.Router.go();
        }}); break;
      }
      case 'remove-contribution': { await Store.contributions.remove(id); UI.toast('已删除'); window.Router.go(); break; }

      case 'link-skill': {
        UI.skillPicker({ title: '关联能力', onPick: s => addEvidenceForm(pid, { skill: s, contribution_id: id }) });
        break;
      }

      case 'add-evidence': {
        UI.skillPicker({ title: '添加能力证据', onPick: s => addEvidenceForm(pid, { skill: s }) });
        break;
      }
      case 'remove-evidence': { await Store.evidence.remove(id); UI.toast('已删除'); window.Router.go(); break; }

      case 'add-outcome': {
        UI.prompt({ title: '添加成果', label: '成果名称（如：获奖证书）', required: true, onOk: async v => {
          const outcomes = utils.tags(p.outcomes).concat(v);
          await Store.projects.update(pid, { outcomes });
          UI.toast('已添加'); window.Router.go();
        }}); break;
      }
      case 'remove-outcome': {
        const outcomes = utils.tags(p.outcomes); outcomes.splice(parseInt(btn.dataset.index, 10), 1);
        await Store.projects.update(pid, { outcomes }); UI.toast('已移除'); window.Router.go(); break;
      }

      case 'upload-file': {
        pickAndUpload(pid); break;
      }
      case 'file-download': { await downloadFile(Store.files.get(id)); break; }
      case 'ai-file': { window.AI.analyzeAndShow(Store.files.get(id)); break; }
      case 'file-move': { moveFileModal(id); break; }
      case 'file-remove': {
        const f = Store.files.get(id);
        UI.confirm(`确定删除文件「${f.file_name}」？`, async () => {
          await Store.files.remove(id); UI.toast('已删除'); window.Router.go();
        }, { danger: true, okLabel: '删除' });
        break;
      }

      case 'add-reflection': {
        addReflectionForm(pid); break;
      }
      case 'remove-reflection': { await Store.reflections.remove(id); UI.toast('已删除'); window.Router.go(); break; }
    }
  }

  // 关联能力 → 填写证据详情
  function addEvidenceForm(pid, opt) {
    const m = UI.modal({
      title: `记录「${opt.skill.name}」证据`,
      content: `
        ${UI.field('具体行为', `<input type="text" id="ev-desc" placeholder="如：完成正式讲解" />`)}
        ${UI.field('时间', `<input type="month" id="ev-date" value="${utils.today().slice(0, 7)}" />`)}`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: '保存', primary: true, onClick: async () => {
            const p = Store.projects.get(pid);
            const desc = document.getElementById('ev-desc').value.trim();
            const date = document.getElementById('ev-date').value;
            await Store.evidence.add({
              skill_id: opt.skill.id,
              project_id: pid,
              contribution_id: opt.contribution_id || null,
              evidence_description: desc || opt.skill.name,
              evidence_date: date ? date + '-01' : utils.today(),
              source: p ? p.name : '',
            });
            UI.toast('证据已记录'); window.Router.go();
          } },
      ],
    });
  }

  function addReflectionForm(pid) {
    const m = UI.modal({
      title: '写反思',
      content: `
        ${UI.field('这个项目让我学到了什么', `<textarea id="rf-learned" rows="2"></textarea>`)}
        ${UI.field('遇到了什么困难', `<textarea id="rf-difficulty" rows="2"></textarea>`)}
        ${UI.field('以后可以改进什么', `<textarea id="rf-improvement" rows="2"></textarea>`)}`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: '保存', primary: true, onClick: async () => {
            await Store.reflections.add(pid, {
              learned: document.getElementById('rf-learned').value.trim(),
              difficulty: document.getElementById('rf-difficulty').value.trim(),
              improvement: document.getElementById('rf-improvement').value.trim(),
            });
            UI.toast('反思已保存'); window.Router.go();
          } },
      ],
    });
  }

  // 选择文件并上传（可立即选择项目）
  function pickAndUpload(pid) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const f = await Store.files.upload(file, pid);
        UI.toast('上传成功：' + f.file_name);
        window.Router.go();
      } catch (e) { UI.toast('上传失败：' + e.message); }
    };
    input.click();
  }

  function moveFileModal(fileId) {
    const projects = Store.projects.list();
    const m = UI.modal({
      title: '移动文件到项目',
      content: `<select id="move-target">
        <option value="">未分类</option>
        ${projects.map(p => `<option value="${p.id}">${UI.esc(p.name)}</option>`).join('')}
      </select>`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: '移动', primary: true, onClick: async () => {
            const target = document.getElementById('move-target').value;
            await Store.files.update(fileId, { project_id: target || null });
            UI.toast('已移动'); window.Router.go();
          } },
      ],
    });
  }

  async function downloadFile(f) {
    if (!f) return;
    const url = await Store.files.url(f);
    if (!url) { UI.toast('演示模式无法下载真实文件'); return; }
    const a = document.createElement('a');
    a.href = url; a.download = f.file_name; a.target = '_blank'; a.click();
  }
})();
