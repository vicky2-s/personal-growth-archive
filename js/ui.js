/* =====================================================================
 * ui.js — 通用 UI 组件
 * 提供 toast、弹窗、确认框、进度条、标签、徽章、空状态等可复用组件。
 * ===================================================================== */

window.UI = (function () {
  const esc = window.utils.esc;

  // ---- Toast 轻提示 ----
  function toast(message, type) {
    let root = document.getElementById('toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'toast-root';
      document.body.appendChild(root);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('show'); }, 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  }

  // ---- 模态弹窗 ----
  // options: { title, content(html string 或 element), actions:[{label, primary, onClick}] }
  function modal(options) {
    let root = document.getElementById('modal-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modal-root';
      document.body.appendChild(root);
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <h3>${esc(options.title || '')}</h3>
          <button class="modal-close" data-close>×</button>
        </div>
        <div class="modal-body"></div>
        <div class="modal-foot"></div>
      </div>`;
    const body = overlay.querySelector('.modal-body');
    const foot = overlay.querySelector('.modal-foot');

    if (typeof options.content === 'string') body.innerHTML = options.content;
    else if (options.content) body.appendChild(options.content);

    (options.actions || []).forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'btn' + (a.primary ? ' btn-primary' : '') + (a.danger ? ' btn-danger' : '');
      btn.textContent = a.label;
      // onClick 返回字符串 'keep' 时保持弹窗打开（用于表单校验失败）
      btn.onclick = () => { const r = a.onClick && a.onClick(overlay); if (r !== 'keep') close(); };
      foot.appendChild(btn);
    });

    function close() { overlay.classList.add('closing'); setTimeout(() => overlay.remove(), 150); }
    overlay.addEventListener('click', e => {
      if (e.target === overlay || e.target.dataset.close) close();
    });
    root.appendChild(overlay);
    return { overlay, body, foot, close };
  }

  // ---- 确认框 ----
  function confirm(message, onOk, opts) {
    opts = opts || {};
    modal({
      title: opts.title || '确认操作',
      content: `<p class="confirm-text">${esc(message)}</p>`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: opts.okLabel || '确定', primary: true, danger: opts.danger, onClick: onOk },
      ],
    });
  }

  // ---- 进度条 ----
  // value: 0~1；返回 HTML 字符串
  function bar(value, opts) {
    opts = opts || {};
    const pct = Math.max(0, Math.min(1, value));
    const p = Math.round(pct * 100);
    const color = opts.color || 'var(--accent)';
    return `<div class="bar" style="${opts.style || ''}">
      <div class="bar-fill" style="width:${p}%;background:${color}"></div>
    </div>`;
  }

  // ---- 标签 chip ----
  function chips(tags, cls) {
    const list = window.utils.tags(tags);
    if (!list.length) return '';
    return list.map(t => `<span class="chip ${cls || ''}">${esc(t)}</span>`).join('');
  }

  // ---- 状态徽章 ----
  function statusBadge(status) {
    const map = { '进行中': 'on', '已完成': 'done', '暂停': 'pause' };
    return `<span class="badge badge-${map[status] || 'plain'}">${esc(status)}</span>`;
  }

  // ---- 空状态 ----
  function empty(icon, text) {
    return `<div class="empty"><div class="empty-icon">${icon || '🗂️'}</div><p>${esc(text || '暂无内容')}</p></div>`;
  }

  // ---- 加载中 ----
  function loading(text) {
    return `<div class="loading"><span class="spinner"></span>${esc(text || '加载中…')}</div>`;
  }

  // ---- 表单字段构造 ----
  function field(label, innerHtml, opts) {
    opts = opts || {};
    return `<label class="field">
      <span class="field-label">${esc(label)}</span>
      ${innerHtml}
    </label>`;
  }

  // 标签输入组件（支持逗号/回车分隔）
  function tagInput(id, existing) {
    const el = document.createElement('div');
    el.className = 'tag-input';
    el.innerHTML = `<input type="text" placeholder="输入标签，回车添加" />`;
    const input = el.querySelector('input');
    const tags = new Set(window.utils.tags(existing));

    function render() {
      el.querySelectorAll('.tag-input-item').forEach(n => n.remove());
      const chipsEl = document.createElement('div');
      chipsEl.className = 'tag-input-list';
      tags.forEach(t => {
        const c = document.createElement('span');
        c.className = 'tag-input-item';
        c.innerHTML = `${esc(t)}<button data-tag="${esc(t)}">×</button>`;
        c.querySelector('button').onclick = () => { tags.delete(t); render(); };
        chipsEl.appendChild(c);
      });
      el.insertBefore(chipsEl, input);
    }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = input.value.trim().replace(/,$/, '');
        if (v) { tags.add(v); input.value = ''; render(); }
      }
    });
    render();
    el._getTags = () => Array.from(tags);
    return el;
  }

  // ---- 通用输入弹窗（单行 / 多行）----
  function prompt(opts) {
    const isMulti = !!opts.multiline;
    const m = modal({
      title: opts.title || '输入',
      content: `<label class="field"><span class="field-label">${esc(opts.label || '')}</span>
        ${isMulti ? '<textarea rows="4"></textarea>' : '<input type="text" />'}
      </label>`,
      actions: [
        { label: '取消', onClick: () => false },
        { label: opts.okLabel || '确定', primary: true, onClick: () => {
            const v = m.body.querySelector(isMulti ? 'textarea' : 'input').value.trim();
            if (!v && opts.required) { toast('内容不能为空'); return 'keep'; }
            opts.onOk && opts.onOk(v);
          } },
      ],
    });
    if (opts.value) m.body.querySelector(isMulti ? 'textarea' : 'input').value = opts.value;
    return m;
  }

  // ---- 技能选择器（按六大领域分组）----
  function skillPicker(opts) {
    const skills = window.Store.skills();
    const m = modal({
      title: opts.title || '选择能力',
      content: `<div class="skill-picker"></div>`,
      actions: [{ label: '取消', onClick: () => false }],
    });
    const box = m.body.querySelector('.skill-picker');
    window.CATEGORIES.forEach(cat => {
      const list = skills.filter(s => s.category === cat.key);
      if (!list.length) return;
      const group = document.createElement('div');
      group.className = 'skill-picker-group';
      group.innerHTML = `<div class="skill-picker-cat">${cat.icon} ${esc(cat.key)}</div>`;
      list.forEach(s => {
        const it = document.createElement('button');
        it.className = 'skill-picker-item';
        it.textContent = s.name;
        it.onclick = () => { m.close(); opts.onPick && opts.onPick(s); };
        group.appendChild(it);
      });
      box.appendChild(group);
    });
    return m;
  }

  return {
    toast, modal, confirm, bar, chips, statusBadge, empty, loading, field, tagInput, esc,
    prompt, skillPicker,
  };
})();
