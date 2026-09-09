/* =====================================================================
 * pages/resume.js — 简历工作台
 *
 * 支持：多模板（简洁版/两栏版）、联系信息可编辑、证件照上传、
 * AI 按目标公司匹配经历、存档/编辑/删除、打印导出 PDF。
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const AI = window.AI;
  const utils = window.utils;

  let editing = null;        // 正在编辑的简历对象
  let photoData = null;      // 证件照（data URL）
  let selectedIds = new Set(); // 选中的项目 id
  let autoFit = true;        // 自动适配一页

  // 西南交大版模板的默认文案（照片与校徽为固定素材 assets/photo.png、assets/school-logo.png）
  const SWJTU_DEFAULTS = {
    degree_sub: '法语语言文学·大四在读',
    education: '西南交通大学·法语语言文学 2023.09–2027.06\n专业方向：法语语言 · 法语文学 · 法语翻译 · 法国文化 · 跨文化交际\n法语专四已通过（TEM-4）\n英语CET-4 543 · CET-6 473',
    languages: '法语（TEM-4 已通过）\n英语CET-4 543\n英语CET-6 473',
    prof_skills: 'Microsoft Office（Word/Excel/PPT）\n秀米 · Canva · 剪映\nAI辅助开发与工作流设计',
  };

  window.Router.register('/resume', {
    title: '导出简历',
    render: function () {
      return `
        <div class="page-header no-print">
          <div><h1>导出简历</h1>
          <p class="sub">把最重要的经历汇总成一页纸，一键生成可下载的简历。</p></div>
          <div class="resume-toolbar">
            <button class="btn btn-primary" id="re-new">＋ 新建简历</button>
            <button class="btn" id="re-batch">🤖 批量生成多份</button>
            <button class="btn" id="re-print">🖨️ 导出 / 打印 PDF</button>
            <label class="fit-toggle"><input type="checkbox" id="re-fit" checked /> 自动适配一页</label>
          </div>
        </div>
        <div id="re-saved" class="no-print"></div>
        <div id="re-editor" class="no-print"></div>
        <div id="re-preview"></div>`;
    },
    mount: function () {
      document.getElementById('re-new').onclick = () => newResume();
      document.getElementById('re-batch').onclick = () => batchGenerate();
      document.getElementById('re-print').onclick = () => window.print();
      document.getElementById('re-fit').onchange = e => { autoFit = e.target.checked; fitToPage(); };
      document.getElementById('re-saved').addEventListener('click', onSavedClick);
      renderSaved();
    },
  });

  function onSavedClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const r = Store.resumes.get(id);
    if (btn.dataset.action === 'edit') { openResume(r); }
    else if (btn.dataset.action === 'del') {
      UI.confirm(`删除简历「${r.title}」？`, async () => {
        await Store.resumes.remove(id);
        UI.toast('已删除');
        if (editing && editing.id === id) { editing = null; renderEditor(); }
        renderSaved();
      }, { danger: true, okLabel: '删除' });
    }
  }

  function newResume() {
    const u = Store.user();
    editing = Object.assign({
      title: '我的简历', template: 'swjtu',
      job_title: u.job_title || '', target_company: '', summary: '',
      phone: u.phone || '', city: u.city || '', email: u.email || '',
      photo_url: '', project_ids: [],
    }, SWJTU_DEFAULTS);
    photoData = null;
    selectedIds = new Set();
    renderEditor();
    renderPreview();
  }

  function openResume(r) {
    editing = Object.assign({}, r);
    photoData = r.photo_url || null;
    selectedIds = new Set(r.project_ids || []);
    renderEditor();
    renderPreview();
  }

  // 已存档简历列表
  function renderSaved() {
    const list = Store.resumes.list();
    const el = document.getElementById('re-saved');
    if (!list.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="section-head"><h2>已存档简历</h2></div>
      <div class="card-list">
        ${list.map(r => `
          <div class="card resume-saved-item">
            <div class="re-saved-info">
              <span class="re-saved-title">📄 ${UI.esc(r.title)}</span>
              <span class="chip">${templateName(r.template)}</span>
              ${r.job_title ? `<span class="chip">${UI.esc(r.job_title)}</span>` : ''}
              <span class="muted">${utils.timeAgo(r.updated_at)}</span>
            </div>
            <div class="re-saved-actions">
              <button class="btn btn-xs" data-action="edit" data-id="${r.id}">编辑</button>
              <button class="btn btn-xs btn-danger" data-action="del" data-id="${r.id}">删除</button>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // 编辑器
  function renderEditor() {
    const el = document.getElementById('re-editor');
    if (!editing) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="card resume-editor">
        <div class="section-head"><h2>✏️ 编辑简历</h2>
          <span><button class="btn btn-sm btn-danger" id="re-close">关闭</button></span></div>
        <div class="resume-form">
          <div class="field-row">
            ${UI.field('简历名称', `<input type="text" id="re-title" value="${UI.esc(editing.title || '')}" />`)}
            ${UI.field('模板', `<select id="re-template">
              <option value="swjtu" ${editing.template === 'swjtu' ? 'selected' : ''}>西南交大版（校徽侧栏）</option>
              <option value="simple" ${editing.template === 'simple' ? 'selected' : ''}>简洁版（单栏）</option>
              <option value="columns" ${editing.template === 'columns' ? 'selected' : ''}>两栏版（侧栏）</option>
            </select>`)}
          </div>
          <div class="field-row">
            ${UI.field('求职意向', `<input type="text" id="re-job" value="${UI.esc(editing.job_title || '')}" placeholder="如：讲解员 / 内容策划" />`)}
            ${UI.field('目标公司/岗位', `<input type="text" id="re-target" value="${UI.esc(editing.target_company || '')}" placeholder="用于 AI 匹配经历" />`)}
          </div>
          <div class="field-row">
            ${UI.field('电话', `<input type="text" id="re-phone" value="${UI.esc(editing.phone || '')}" />`)}
            ${UI.field('城市', `<input type="text" id="re-city" value="${UI.esc(editing.city || '')}" />`)}
            ${UI.field('邮箱', `<input type="text" id="re-email" value="${UI.esc(editing.email || '')}" />`)}
          </div>
          ${UI.field('自我评价', `<textarea id="re-summary" rows="3">${UI.esc(editing.summary || '')}</textarea>`)}
          ${editing.template === 'swjtu' ? `
          ${UI.field('学历·专业（姓名下方副标题）', `<input type="text" id="re-degree" value="${UI.esc(editing.degree_sub || '')}" />`)}
          ${UI.field('教育背景（每行一条，第一行为校名·专业）', `<textarea id="re-edu" rows="4">${UI.esc(editing.education || '')}</textarea>`)}
          <div class="field-row">
            ${UI.field('语言能力（每行一项）', `<textarea id="re-lang" rows="3">${UI.esc(editing.languages || '')}</textarea>`)}
            ${UI.field('专业技能（每行一项）', `<textarea id="re-profs" rows="3">${UI.esc(editing.prof_skills || '')}</textarea>`)}
          </div>` : ''}
          <div class="resume-form-actions">
            <button class="btn btn-sm" id="re-ai-summary">🤖 AI 生成自我评价</button>
            <button class="btn btn-sm" id="re-ai-match">🤖 AI 匹配经历</button>
            <button class="btn btn-sm" id="re-photo">📷 上传证件照</button>
            ${photoData ? `<button class="btn btn-sm btn-danger" id="re-photo-del">移除照片</button>` : ''}
          </div>
          <div class="ai-block"><b>选择经历</b>
            <div class="re-projects">${renderProjectChecks()}</div>
          </div>
          <div class="resume-form-actions">
            <button class="btn btn-primary" id="re-save">💾 保存简历</button>
          </div>
        </div>
      </div>`;

    const collect = () => {
      editing.title = document.getElementById('re-title').value.trim() || '我的简历';
      editing.template = document.getElementById('re-template').value;
      editing.job_title = document.getElementById('re-job').value.trim();
      editing.target_company = document.getElementById('re-target').value.trim();
      editing.summary = document.getElementById('re-summary').value;
      editing.phone = document.getElementById('re-phone').value.trim();
      editing.city = document.getElementById('re-city').value.trim();
      editing.email = document.getElementById('re-email').value.trim();
      const degreeEl = document.getElementById('re-degree');
      if (degreeEl) editing.degree_sub = degreeEl.value.trim();
      const eduEl = document.getElementById('re-edu');
      if (eduEl) editing.education = eduEl.value;
      const langEl = document.getElementById('re-lang');
      if (langEl) editing.languages = langEl.value;
      const profsEl = document.getElementById('re-profs');
      if (profsEl) editing.prof_skills = profsEl.value;
    };

    // 实时预览
    ['re-title', 're-job', 're-target', 're-summary', 're-phone', 're-city', 're-email', 're-degree', 're-edu', 're-lang', 're-profs'].forEach(id => {
      const el2 = document.getElementById(id);
      if (!el2) return;
      el2.addEventListener('input', () => { collect(); renderPreview(); });
      el2.addEventListener('change', () => { collect(); renderPreview(); });
    });
    document.getElementById('re-template').addEventListener('change', () => {
      collect();
      renderEditor();
      renderPreview();
    });
    el.querySelectorAll('.re-proj-check').forEach(cb => {
      cb.addEventListener('change', () => {
        if (cb.checked) selectedIds.add(cb.value); else selectedIds.delete(cb.value);
        renderPreview();
      });
    });

    document.getElementById('re-close').onclick = () => { editing = null; renderEditor(); renderSaved(); };
    document.getElementById('re-save').onclick = async () => {
      collect();
      editing.project_ids = Array.from(selectedIds);
      editing.photo_url = photoData || '';
      await Store.resumes.save(editing);
      UI.toast('简历已保存');
      renderSaved();
    };
    document.getElementById('re-ai-summary').onclick = () => {
      collect();
      if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
      const m = UI.modal({ title: '生成中', content: `<div class="loading"><span class="spinner"></span><span>正在生成…</span></div>`, actions: [] });
      AI.resumeSummary(buildPayload()).then(text => {
        m.close();
        document.getElementById('re-summary').value = text.trim();
        collect(); renderPreview(); UI.toast('自我评价已生成');
      }).catch(e => { m.close(); UI.toast('生成失败：' + e.message); });
    };
    document.getElementById('re-ai-match').onclick = () => {
      collect();
      if (!editing.target_company) { UI.toast('请先填写「目标公司/岗位」'); return; }
      if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
      const projects = buildProjects();
      const m = UI.modal({ title: 'AI 匹配中', content: `<div class="loading"><span class="spinner"></span><span>正在匹配经历…</span></div>`, actions: [] });
      AI.matchResume(editing.target_company, projects.map(p => ({ name: p.name, type: p.type, roles: p.roles, contributions: p.contributions, outcomes: p.outcomes })))
        .then(result => {
          m.close();
          const names = result.selected || [];
          selectedIds = new Set();
          names.forEach(n => {
            const p = projects.find(x => x.name === n) || projects.find(x => x.name.includes(n) || n.includes(x.name));
            if (p) selectedIds.add(p.id);
          });
          renderEditor();
          renderPreview();
          UI.toast('已匹配 ' + selectedIds.size + ' 项经历' + (result.reason ? '：' + result.reason : ''));
        }).catch(e => { m.close(); UI.toast('匹配失败：' + e.message); });
    };
    document.getElementById('re-photo').onclick = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const f = input.files[0];
        if (!f) return;
        resizeImage(f, dataUrl => { photoData = dataUrl; renderEditor(); renderPreview(); });
      };
      input.click();
    };
    const delPhoto = document.getElementById('re-photo-del');
    if (delPhoto) delPhoto.onclick = () => { photoData = null; renderEditor(); renderPreview(); };
  }

  function renderProjectChecks() {
    const projects = buildProjects();
    if (!projects.length) return '<div class="muted">还没有项目，去「项目」页添加。</div>';
    return projects.map(p => `
      <label class="re-proj"><input type="checkbox" class="re-proj-check" value="${p.id}" ${selectedIds.has(p.id) ? 'checked' : ''}>
        <span>${UI.esc(p.name)}</span><span class="muted">${UI.esc(p.type)} · ${utils.fmtMonth(p.start)}</span>
      </label>`).join('');
  }

  function buildProjects() {
    return Store.projects.list().filter(p => p.status !== '暂停')
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
      .map(p => ({
        id: p.id, name: p.name, type: p.project_type, status: p.status,
        start: p.start_date, end: p.end_date,
        roles: Store.roles.list(p.id).map(r => r.role_name),
        contributions: Store.contributions.list(p.id).map(c => c.description),
        outcomes: utils.tags(p.outcomes),
        skills: Store.evidence.list({ project: p.id }).map(e => { const s = Store.skillById(e.skill_id); return s ? s.name : ''; }).filter(Boolean),
      }));
  }

  function buildPayload() {
    const projects = buildProjects().filter(p => selectedIds.has(p.id));
    const cats = Store.skillsView.categories();
    return {
      name: Store.user().display_name,
      job_title: editing.job_title,
      domains: cats.map(c => ({ domain: c.key, evidence: c.total })),
      projects: projects.map(p => ({ name: p.name, type: p.type, roles: p.roles, contributions: p.contributions, outcomes: p.outcomes })),
    };
  }

  function resizeImage(file, cb) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const max = 500;
        let w = img.width, h = img.height;
        if (w >= h && w > max) { h = h * max / w; w = max; }
        else if (h > w && h > max) { w = w * max / h; h = max; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // =====================================================================
  // 预览渲染
  // =====================================================================
  function renderPreview() {
    const el = document.getElementById('re-preview');
    if (!editing) { el.innerHTML = '<div class="empty"><div class="empty-icon">📄</div><p>点击「新建简历」开始制作</p></div>'; return; }
    const projects = buildProjects().filter(p => selectedIds.has(p.id));
    const data = {
      name: Store.user().display_name || '未命名',
      job_title: editing.job_title, summary: editing.summary,
      phone: editing.phone, city: editing.city, email: editing.email,
      photo: photoData || editing.photo_url,
      degree_sub: editing.degree_sub, education: editing.education,
      languages: editing.languages, prof_skills: editing.prof_skills,
      projects, template: editing.template,
    };
    el.innerHTML = editing.template === 'swjtu' ? renderSwjtu(data)
      : (editing.template === 'columns' ? renderColumns(data) : renderSimple(data));
    fitToPage();
  }

  // 自动缩放，保证简历在一页 A4 内
  function fitToPage() {
    const sheet = document.querySelector('.resume-sheet');
    if (!sheet) return;
    sheet.style.zoom = '';
    if (!autoFit) return;
    requestAnimationFrame(() => {
      sheet.style.zoom = '';
      const target = 1080; // 约 A4 内容区高度（px）
      const h = sheet.scrollHeight;
      if (h > target) sheet.style.zoom = (target / h).toFixed(3);
    });
  }

  // 批量生成多份（不同岗位版本）
  function batchGenerate() {
    const u = Store.user();
    const base = editing ? editing : Object.assign({ template: 'swjtu', phone: u.phone || '', city: u.city || '', email: u.email || '', photo_url: '' }, SWJTU_DEFAULTS);
    const m = UI.modal({
      title: '批量生成多份简历',
      content: `<p class="hint">每行填一个目标公司/岗位，会为每个生成一份专属简历（AI 匹配经历 + 生成自我评价）。</p>
        <textarea id="re-batch-pos" rows="5" placeholder="博物馆讲解员&#10;新媒体内容运营&#10;活动策划专员"></textarea>
        <p class="hint" id="re-batch-progress"></p>
        <button class="btn btn-primary" id="re-batch-go" style="margin-top:8px">开始生成</button>`,
      actions: [{ label: '关闭', onClick: () => {} }],
    });
    document.getElementById('re-batch-go').onclick = async () => {
      const positions = document.getElementById('re-batch-pos').value.split('\n').map(s => s.trim()).filter(Boolean);
      if (!positions.length) { UI.toast('请输入至少一个岗位'); return; }
      if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
      const prog = document.getElementById('re-batch-progress');
      const projects = buildProjects();
      let done = 0;
      for (const pos of positions) {
        prog.textContent = '正在生成：' + pos + '（' + (done + 1) + '/' + positions.length + '）…';
        try {
          const match = await AI.matchResume(pos, projects.map(p => ({ name: p.name, type: p.type, roles: p.roles, contributions: p.contributions, outcomes: p.outcomes })));
          const ids = new Set();
          (match.selected || []).forEach(n => {
            const p = projects.find(x => x.name === n) || projects.find(x => x.name.includes(n) || n.includes(x.name));
            if (p) ids.add(p.id);
          });
          const matched = projects.filter(p => ids.has(p.id));
          const summary = await AI.resumeSummary({ name: u.display_name, job_title: pos, projects: matched.map(p => ({ name: p.name, type: p.type, roles: p.roles, contributions: p.contributions, outcomes: p.outcomes })) });
          await Store.resumes.save({ title: pos, template: base.template || 'swjtu', job_title: pos, target_company: pos, summary: (summary || '').trim(), phone: base.phone || '', city: base.city || '', email: base.email || '', photo_url: base.photo_url || '', degree_sub: base.degree_sub || '', education: base.education || '', languages: base.languages || '', prof_skills: base.prof_skills || '', project_ids: Array.from(ids) });
          done++;
        } catch (e) {
          prog.textContent = (prog.textContent || '') + '\n⚠️ ' + pos + ' 失败：' + e.message;
        }
      }
      prog.textContent = '完成！共生成 ' + done + ' 份。';
      renderSaved();
      UI.toast('已生成 ' + done + ' 份简历');
      setTimeout(() => m.close(), 600);
    };
  }

  function templateName(t) {
    return t === 'columns' ? '两栏版' : (t === 'swjtu' ? '西南交大版' : '简洁版');
  }

  function contactLine(d) {
    return [d.city, d.phone, d.email].filter(Boolean).join(' · ');
  }

  function renderSimple(d) {
    return `<div class="resume-sheet">
      <div class="resume-head">
        ${d.photo ? `<img class="resume-photo" src="${d.photo}" />` : ''}
        <div class="resume-name">${UI.esc(d.name)}</div>
        ${d.job_title ? `<div class="resume-job">${UI.esc(d.job_title)}</div>` : ''}
        ${contactLine(d) ? `<div class="resume-contact">${UI.esc(contactLine(d))}</div>` : ''}
      </div>
      ${d.summary ? `<div class="resume-sec"><div class="resume-sec-title">自我评价</div><p class="resume-intro">${UI.esc(d.summary)}</p></div>` : ''}
      <div class="resume-sec"><div class="resume-sec-title">能力概况</div>
        <div class="resume-domains">${Store.skillsView.categories().map(c => `<div class="resume-domain"><span>${c.icon}</span><span class="rd-name">${UI.esc(c.key)}</span><span class="rd-count">${c.total} 项证据</span></div>`).join('')}</div>
      </div>
      ${expSection(d.projects)}
      ${achSection()}
      <div class="resume-foot muted">由「人生档案馆」生成 · 数据来源于真实项目与实践证据</div>
    </div>`;
  }

  function renderColumns(d) {
    const skills = Store.skills().map(s => ({ name: s.name, count: Store.effectiveCount(s.id) })).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 12);
    return `<div class="resume-sheet resume-columns">
      <div class="rc-side">
        ${d.photo ? `<img class="resume-photo" src="${d.photo}" />` : ''}
        <div class="rc-name">${UI.esc(d.name)}</div>
        ${d.job_title ? `<div class="rc-job">${UI.esc(d.job_title)}</div>` : ''}
        <div class="rc-block">
          <div class="rc-title">联系方式</div>
          ${[['📍', d.city], ['📞', d.phone], ['📧', d.email]].filter(x => x[1]).map(x => `<div class="rc-line">${x[0]} ${UI.esc(x[1])}</div>`).join('') || '<div class="muted">未填写</div>'}
        </div>
        ${skills.length ? `<div class="rc-block"><div class="rc-title">核心能力</div>${skills.map(s => `<div class="rc-skill"><span>${UI.esc(s.name)}</span><span class="muted">×${s.count}</span></div>`).join('')}</div>` : ''}
        ${achLine()}
      </div>
      <div class="rc-main">
        ${d.summary ? `<div class="resume-sec"><div class="resume-sec-title">自我评价</div><p class="resume-intro">${UI.esc(d.summary)}</p></div>` : ''}
        ${expSection(d.projects)}
      </div>
    </div>`;
  }

  function expSection(projects) {
    if (!projects.length) return '<div class="resume-sec"><div class="resume-sec-title">主要经历</div><div class="muted">请勾选要写入简历的经历</div></div>';
    return `<div class="resume-sec"><div class="resume-sec-title">主要经历</div>
      ${projects.map(p => `
        <div class="resume-exp">
          <div class="resume-exp-head"><span class="re-name">${UI.esc(p.name)}</span>
            <span class="re-meta">${UI.esc(p.type)} · ${utils.fmtMonth(p.start)}${p.end ? ' ~ ' + utils.fmtMonth(p.end) : ' 至今'}</span></div>
          ${p.roles.length ? `<div class="re-line"><b>角色</b>：${p.roles.map(UI.esc).join(' / ')}</div>` : ''}
          ${p.contributions.length ? `<div class="re-line"><b>贡献</b>：${p.contributions.map(UI.esc).join(' · ')}</div>` : ''}
          ${p.outcomes.length ? `<div class="re-line"><b>成果</b>：${p.outcomes.map(UI.esc).join(' · ')}</div>` : ''}
        </div>`).join('')}
    </div>`;
  }

  function achSection() {
    const achs = Store.achievements.list().filter(a => a.unlocked);
    if (!achs.length) return '';
    return `<div class="resume-sec"><div class="resume-sec-title">成长成就</div>
      <div class="resume-achs">${achs.map(a => `<span class="resume-ach">${a.icon} ${UI.esc(a.name)}</span>`).join('')}</div></div>`;
  }

  function achLine() {
    const achs = Store.achievements.list().filter(a => a.unlocked);
    if (!achs.length) return '';
    return `<div class="rc-block"><div class="rc-title">成长成就</div>${achs.slice(0, 6).map(a => `<div class="rc-line">${a.icon} ${UI.esc(a.name)}</div>`).join('')}</div>`;
  }

  // =====================================================================
  // 西南交大版模板（校徽侧栏，参照李杨简历 PDF 版式）
  // =====================================================================
  function renderSwjtu(d) {
    const photo = d.photo || 'assets/photo.png';
    const lines = (s, fallback) => String(s || fallback || '').split('\n').map(x => x.trim()).filter(Boolean);
    const eduLines = lines(d.education, SWJTU_DEFAULTS.education);
    const langLines = lines(d.languages, SWJTU_DEFAULTS.languages);
    const skillLines = lines(d.prof_skills, SWJTU_DEFAULTS.prof_skills);
    const degSub = d.degree_sub || SWJTU_DEFAULTS.degree_sub;
    const contact = [['📧', d.email], ['📞', d.phone], ['📍', d.city]].filter(x => x[1]);
    const intern = d.projects.filter(p => p.type === '工作');
    const pract = d.projects.filter(p => p.type !== '工作');
    return `<div class="resume-sheet resume-swjtu">
      <div class="rj-side">
        <img class="rj-photo" src="${photo}" />
        <div class="rj-name">${UI.esc(d.name)}</div>
        ${degSub ? `<div class="rj-sub">${UI.esc(degSub)}</div>` : ''}
        ${d.job_title ? `<div class="rj-intent">意向：${UI.esc(d.job_title)}</div>` : ''}
        <div class="rj-divider"></div>
        ${contact.length ? `<div class="rj-block"><div class="rj-title">联系方式</div>${contact.map(x => `<div class="rj-item">${x[0]} ${UI.esc(x[1])}</div>`).join('')}</div>` : ''}
        ${langLines.length ? `<div class="rj-block"><div class="rj-title">语言能力</div>${langLines.map(x => `<div class="rj-item">${hl(x)}</div>`).join('')}</div>` : ''}
        ${skillLines.length ? `<div class="rj-block"><div class="rj-title">专业技能</div>${skillLines.map(x => `<div class="rj-item">${hl(x)}</div>`).join('')}</div>` : ''}
      </div>
      <div class="rj-main">
        <img class="rj-logo" src="assets/school-logo.png" />
        ${eduLines.length ? `<div class="rj-sec"><div class="rj-sec-title">教育背景</div>${renderEdu(eduLines)}</div>` : ''}
        ${intern.length ? `<div class="rj-sec"><div class="rj-sec-title">实习经历</div>${intern.map(rjEntry).join('')}</div>` : ''}
        ${pract.length ? `<div class="rj-sec"><div class="rj-sec-title">项目&实践经历</div>${pract.map(rjEntry).join('')}</div>` : ''}
      </div>
    </div>`;
  }

  function renderEdu(lines) {
    return lines.map((l, i) => {
      if (i === 0) {
        const m = l.match(/^(.+?)\s+(\d{4}[.]\d{1,2})\s*[–~-]\s*(\d{4}[.]\d{1,2}|至今)$/);
        if (m) return `<div class="rj-edu-head"><span>${UI.esc(m[1])}</span><span class="rj-date">${m[2]} – ${m[3]}</span></div>`;
        return `<div class="rj-edu-head">${UI.esc(l)}</div>`;
      }
      return `<div class="rj-body">${hl(l)}</div>`;
    }).join('');
  }

  function rjEntry(p) {
    const title = p.name + (p.roles.length ? ' · ' + p.roles.join(' & ') : '');
    const date = fmtRange(p.start, p.end);
    const lines = p.contributions.concat(p.outcomes.length ? '成果：' + p.outcomes.join(' · ') : []);
    return `<div class="rj-exp">
      <div class="rj-exp-head"><span class="rj-exp-title">${UI.esc(title)}</span>${date ? `<span class="rj-date">${date}</span>` : ''}</div>
      ${lines.map(x => `<div class="rj-body">${hl(x)}</div>`).join('')}
    </div>`;
  }

  function fmtRange(start, end) {
    if (!start) return '';
    const f = d => String(d).slice(0, 7).replace('-', '.');
    return f(start) + (end ? ' – ' + f(end) : ' – 至今');
  }

  // 高亮数字（参照模板中蓝色加粗的关键数据）
  function hl(text) {
    return UI.esc(text).replace(/(?<![A-Za-z0-9.\-])(?:\d{1,3}(?:,\d{3})+|\d+)(?:[.]\d+)?(?:%|\+)?/g, '<b class="rj-num">$&</b>');
  }
})();
