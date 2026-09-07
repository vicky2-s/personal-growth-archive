/* =====================================================================
 * pages/archive.js — 文件档案系统（上传 / 筛选 / 搜索 / 管理）
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const utils = window.utils;

  window.Router.register('/archive', {
    title: '档案',
    render: function () {
      const years = Store.files.years();
      const types = Store.files.types();
      const tags = Store.files.allTags();
      const projects = Store.projects.list();
      return `
        <div class="page-header">
          <div>
            <h1>档案</h1>
            <p class="sub">文件是人生经历的证据，长期归档，永不丢失。</p>
          </div>
          <button class="btn btn-primary" id="upload-btn">⬆ 上传文件</button>
        </div>

        <div class="dropzone" id="dropzone">
          <div class="dropzone-inner">拖拽文件到这里，或点击上传</div>
        </div>

        <div class="filters">
          <input type="search" id="ar-search" placeholder="搜索文件名、描述、标签…" />
          <select id="ar-year"><option value="全部">全部年份</option>${years.map(y => `<option>${y}</option>`).join('')}</select>
          <select id="ar-project">
            <option value="all">全部项目</option>
            <option value="uncategorized">未分类文件</option>
            ${projects.map(p => `<option value="${p.id}">${UI.esc(p.name)}</option>`).join('')}
          </select>
          <select id="ar-type"><option value="全部">全部类型</option>${types.map(t => `<option>${t.toUpperCase()}</option>`).join('')}</select>
          <select id="ar-tag"><option value="全部">全部标签</option>${tags.map(t => `<option>${t}</option>`).join('')}</select>
        </div>

        <div id="file-list"></div>`;
    },
    mount: function () {
      const filters = () => ({
        q: document.getElementById('ar-search').value,
        year: document.getElementById('ar-year').value,
        project: document.getElementById('ar-project').value,
        type: document.getElementById('ar-type').value,
        tag: document.getElementById('ar-tag').value,
      });
      function refresh() {
        const f = filters();
        const list = Store.files.list({
          q: f.q, year: f.year === '全部' ? '' : f.year,
          project: f.project, type: f.type === '全部' ? '' : f.type,
          tag: f.tag === '全部' ? '' : f.tag,
        });
        document.getElementById('file-list').innerHTML = list.length
          ? `<div class="file-grid">${list.map(f => fileCard(f)).join('')}</div>`
          : UI.empty('🗂️', '没有符合条件的文件');
      }

      ['ar-search', 'ar-year', 'ar-project', 'ar-type', 'ar-tag'].forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', refresh);
        el.addEventListener('change', refresh);
      });

      document.getElementById('upload-btn').onclick = () => pickAndUpload(null);
      const dz = document.getElementById('dropzone');
      dz.addEventListener('click', () => pickAndUpload(null));
      ['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
      ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
      dz.addEventListener('drop', e => {
        const f = e.dataTransfer.files[0];
        if (f) doUpload(f, null);
      });

      // 事件委托：文件卡片操作
      document.getElementById('file-list').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const f = Store.files.get(id);
        switch (btn.dataset.action) {
          case 'download': downloadFile(f); break;
          case 'edit': fileEditModal(f); break;
          case 'move': moveFileModal(id); break;
          case 'remove':
            UI.confirm(`确定删除文件「${f.file_name}」？`, async () => {
              await Store.files.remove(id); UI.toast('已删除'); refresh();
            }, { danger: true, okLabel: '删除' });
            break;
        }
      });

      refresh();
    },
  });

  function fileCard(f) {
    const p = f.project_id ? Store.projects.get(f.project_id) : null;
    return `<div class="file-card">
      <div class="file-icon">${utils.fileIcon(f.file_name)}</div>
      <div class="file-name" title="${UI.esc(f.file_name)}">${UI.esc(f.file_name)}</div>
      <div class="file-sub">
        ${(f.file_type || '').toUpperCase()} · ${fmtSize(f.file_size)} ·
        ${f.project_id ? '📁 ' + UI.esc(p ? p.name : '') : '未分类'} ·
        <span class="imp imp-${impKey(f.importance)}">${UI.esc(f.importance)}</span>
      </div>
      ${UI.chips(f.tags)}
      <div class="file-actions">
        <button class="btn btn-xs" data-action="download" data-id="${f.id}">下载</button>
        <button class="btn btn-xs" data-action="edit" data-id="${f.id}">编辑</button>
        <button class="btn btn-xs" data-action="move" data-id="${f.id}">移动</button>
        <button class="btn btn-xs btn-danger" data-action="remove" data-id="${f.id}">删除</button>
      </div>
    </div>`;
  }

  function fmtSize(n) {
    if (!n) return '未知';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function impKey(imp) {
    return { '普通': 'normal', '重要': 'important', '非常重要': 'critical' }[imp] || 'normal';
  }

  function pickAndUpload(pid) {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = () => { if (input.files[0]) doUpload(input.files[0], pid); };
    input.click();
  }

  async function doUpload(file, pid) {
    try {
      const f = await Store.files.upload(file, pid);
      UI.toast('上传成功：' + f.file_name);
      fileEditModal(f, true);
    } catch (e) { UI.toast('上传失败：' + e.message); }
  }

  // 编辑文件信息（上传后自动弹出，也可手动编辑）
  function fileEditModal(f, justUploaded) {
    const projects = Store.projects.list();
    const m = UI.modal({
      title: justUploaded ? '上传成功，完善文件信息' : '编辑文件',
      content: `
        <div class="upload-ok">${UI.esc(f.file_name)}</div>
        ${UI.field('所属项目', `<select id="fe-project">
          <option value="">未分类</option>
          ${projects.map(p => `<option value="${p.id}" ${f.project_id === p.id ? 'selected' : ''}>${UI.esc(p.name)}</option>`).join('')}
        </select>`)}
        ${UI.field('文件描述', `<textarea id="fe-desc" rows="2">${UI.esc(f.description || '')}</textarea>`)}
        ${UI.field('重要程度', `<select id="fe-imp">
          ${window.FILE_IMPORTANCE.map(i => `<option ${f.importance === i ? 'selected' : ''}>${i}</option>`).join('')}
        </select>`)}
        <div class="field"><span class="field-label">标签</span><span id="fe-tags-slot"></span></div>`,
      actions: [
        { label: '跳过', onClick: () => { window.Router.go(); } },
        { label: '保存', primary: true, onClick: async () => {
            const project_id = document.getElementById('fe-project').value || null;
            await Store.files.update(f.id, {
              project_id,
              description: document.getElementById('fe-desc').value.trim(),
              importance: document.getElementById('fe-imp').value,
              tags: m._tags._getTags(),
            });
            UI.toast('已保存'); window.Router.go();
          } },
      ],
    });
    m._tags = UI.tagInput('fe-tags', f.tags);
    document.getElementById('fe-tags-slot').appendChild(m._tags);
  }

  function moveFileModal(fileId) {
    const projects = Store.projects.list();
    UI.modal({
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
    const url = await Store.files.url(f);
    if (!url) { UI.toast('演示模式无法下载真实文件'); return; }
    const a = document.createElement('a');
    a.href = url; a.download = f.file_name; a.target = '_blank'; a.click();
  }
})();
