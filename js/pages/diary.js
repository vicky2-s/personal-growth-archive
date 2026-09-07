/* =====================================================================
 * pages/diary.js — 每日日记 + AI 人格/成长分析
 *
 * 科学依据：大五人格（Big Five/OCEAN）、VIA 品格优势（24项）、
 * 成长型思维（Dweck）、反思性实践（Schön）。
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const AI = window.AI;
  const utils = window.utils;

  const OCEAN = ['开放性', '尽责性', '外向性', '宜人性', '情绪稳定性'];
  let currentDate = utils.today();
  let pendingAnalysis = null; // 刚 AI 分析出来、尚未保存的结果

  window.Router.register('/diary', {
    title: '每日日记',
    render: function () {
      return `
        <div class="page-header">
          <div><h1>每日日记</h1>
          <p class="sub">每天写一点，AI 帮你看见人格特点与成长轨迹。</p></div>
          <div class="diary-date-bar">
            <input type="date" id="diary-date" value="${currentDate}" />
            <button class="btn btn-sm" id="diary-today">今天</button>
          </div>
        </div>

        <div class="card">
          <textarea id="diary-content" rows="9" placeholder="写写今天发生的事、心情、想法……"></textarea>
          <div class="diary-actions">
            <button class="btn btn-primary" id="diary-save">💾 保存日记</button>
            <button class="btn" id="diary-analyze">🤖 AI 分析</button>
          </div>
        </div>

        <div id="diary-analysis"></div>

        <section class="section">
          <div class="section-head"><h2>🧬 我的性格画像</h2></div>
          <div id="diary-profile"></div>
        </section>

        <section class="section">
          <div class="section-head"><h2>📅 历史日记</h2></div>
          <div id="diary-history"></div>
        </section>`;
    },
    mount: function () {
      const dateInput = document.getElementById('diary-date');
      const contentEl = document.getElementById('diary-content');

      function loadEntry(date) {
        currentDate = date;
        pendingAnalysis = null;
        const entry = Store.diary.getByDate(date);
        contentEl.value = entry ? (entry.content || '') : '';
        document.getElementById('diary-analysis').innerHTML = entry && entry.analysis
          ? renderAnalysis(entry.analysis, true)
          : '<div class="hint">这一天还没有分析结果，写完日记点「AI 分析」。</div>';
      }

      dateInput.addEventListener('change', () => loadEntry(dateInput.value));
      document.getElementById('diary-today').onclick = () => {
        dateInput.value = utils.today();
        loadEntry(utils.today());
      };

      document.getElementById('diary-save').onclick = async () => {
        const entry = Store.diary.getByDate(currentDate);
        await Store.diary.save({
          entry_date: currentDate,
          content: contentEl.value,
          analysis: entry ? entry.analysis : null,
        });
        UI.toast('日记已保存');
      };

      document.getElementById('diary-analyze').onclick = async () => {
        const content = contentEl.value;
        if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
        if (!content.trim()) { UI.toast('请先写一些日记内容'); return; }
        const m = UI.modal({ title: 'AI 分析中', content: `<div class="loading"><span class="spinner"></span><span>正在分析…</span></div>`, actions: [] });
        try {
          const result = await AI.analyzeDiary(content);
          m.close();
          pendingAnalysis = result;
          document.getElementById('diary-analysis').innerHTML = renderAnalysis(result, false);
        } catch (e) {
          m.close();
          UI.toast('分析失败：' + e.message);
        }
      };

      // 保存分析结果 / 删除日记（事件委托）
      document.getElementById('diary-analysis').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'save-analysis' && pendingAnalysis) {
          Store.diary.save({ entry_date: currentDate, content: contentEl.value, analysis: pendingAnalysis })
            .then(() => { pendingAnalysis = null; UI.toast('分析已保存'); loadEntry(currentDate); });
        }
      });
      document.getElementById('diary-history').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'open') {
          dateInput.value = btn.dataset.date;
          loadEntry(btn.dataset.date);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else if (btn.dataset.action === 'del') {
          UI.confirm('删除这篇日记？', async () => {
            await Store.diary.remove(btn.dataset.id);
            UI.toast('已删除'); loadEntry(currentDate); renderHistory();
          }, { danger: true, okLabel: '删除' });
        }
      });

      renderHistory();
      renderProfile();
      loadEntry(currentDate);
    },
  });

  // 渲染分析结果
  function renderAnalysis(a, saved) {
    const levelClass = { '高': 'lvl-high', '中': 'lvl-mid', '低': 'lvl-low', '待观察': 'lvl-na' };
    return `
      <div class="card diary-analysis">
        <div class="section-head"><h2>🤖 分析结果</h2>
          ${saved ? '' : '<button class="btn btn-primary btn-sm" data-action="save-analysis">保存分析</button>'}
        </div>
        <div class="ai-summary">${UI.esc(a.summary || '')}</div>
        <div class="ocean-grid">
          ${(a.ocean || []).map(o => `
            <div class="ocean-item">
              <div class="ocean-trait">${UI.esc(o.trait)}</div>
              <span class="ocean-level ${levelClass[o.level] || 'lvl-na'}">${UI.esc(o.level || '待观察')}</span>
              ${o.evidence ? `<div class="ocean-evidence">${UI.esc(o.evidence)}</div>` : ''}
            </div>`).join('')}
        </div>
        ${(a.strengths || []).length ? `<div class="ai-block"><b>✨ 品格优势</b><div class="chip-list">${a.strengths.map(s => `<span class="chip chip-lg">${UI.esc(s)}</span>`).join('')}</div></div>` : ''}
        ${a.improved ? `<div class="ai-block"><b>📈 今天提升</b><div>${UI.esc(a.improved)}${a.improved_domain && a.improved_domain !== '无' ? ` <span class="muted">（${UI.esc(a.improved_domain)}）</span>` : ''}</div></div>` : ''}
        ${a.strengthen ? `<div class="ai-block"><b>🎯 未来加强</b><div>${UI.esc(a.strengthen)}</div></div>` : ''}
        ${a.advice ? `<div class="ai-block"><b>💡 建议</b><div>${UI.esc(a.advice)}</div></div>` : ''}
      </div>`;
  }

  // 渲染性格画像（聚合）
  function renderProfile() {
    const p = Store.diary.profile();
    const el = document.getElementById('diary-profile');
    if (!el) return;
    if (!p.analyzedCount) {
      el.innerHTML = UI.empty('🧬', '还没有分析过的日记，写一篇并点「AI 分析」吧');
      return;
    }
    const levelClass = { '高': 'lvl-high', '中': 'lvl-mid', '低': 'lvl-low' };
    el.innerHTML = `
      <p class="hint">已分析 ${p.analyzedCount} 篇日记。以下为 AI 基于日记证据推断的倾向，仅供自我观察，非测评结论。</p>
      <div class="ocean-grid">
        ${p.ocean.map(o => `
          <div class="ocean-item">
            <div class="ocean-trait">${UI.esc(o.trait)}</div>
            <span class="ocean-level ${levelClass[o.dominant] || 'lvl-na'}">${o.dominant ? o.dominant : '待观察'}</span>
            <div class="ocean-evidence muted">${o.count ? '出现 ' + o.count + ' 次' : '暂无证据'}</div>
          </div>`).join('')}
      </div>
      ${p.strengths.length ? `<div class="ai-block"><b>✨ 高频品格优势</b><div class="chip-list">${p.strengths.slice(0, 8).map(s => `<span class="chip chip-lg">${UI.esc(s.name)} ×${s.count}</span>`).join('')}</div></div>` : ''}`;
  }

  // 渲染历史列表
  function renderHistory() {
    const list = Store.diary.list();
    const el = document.getElementById('diary-history');
    if (!el) return;
    if (!list.length) { el.innerHTML = UI.empty('📅', '还没有写过日记'); return; }
    el.innerHTML = list.map(d => {
      const a = d.analysis;
      return `<div class="diary-history-item">
        <button class="btn btn-sm" data-action="open" data-date="${UI.esc(d.entry_date)}">${utils.fmtDate(d.entry_date)}</button>
        <span class="diary-history-summary">${UI.esc(a ? (a.summary || '') : (d.content || '').slice(0, 40))}</span>
        <button class="btn btn-xs btn-danger" data-action="del" data-id="${d.id}">删除</button>
      </div>`;
    }).join('');
  }
})();
