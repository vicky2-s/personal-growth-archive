/* =====================================================================
 * pages/diary.js — 每日日记 + 独立 AI 分析 + 回顾 + 转能力证据
 *
 * 科学依据：大五人格（Big Five/OCEAN）、VIA 品格优势（24项）、
 * 成长型思维（Dweck）、反思性实践（Schön）。
 * AI 会参考用户贴入的其他 AI（如 ChatGPT）分析，但独立判断、不盲从。
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const AI = window.AI;
  const utils = window.utils;

  let currentDate = utils.today();
  let pendingAnalysis = null; // 刚 AI 分析出、尚未保存的结果

  window.Router.register('/diary', {
    title: '每日日记',
    render: function () {
      return `
        <div class="page-header">
          <div><h1>每日日记</h1>
          <p class="sub">写下一天，AI 独立分析人格特点与成长轨迹。</p></div>
          <div class="diary-date-bar">
            <input type="date" id="diary-date" value="${currentDate}" />
            <button class="btn btn-sm" id="diary-today">今天</button>
          </div>
        </div>

        <div class="card">
          <textarea id="diary-content" rows="7" placeholder="写写今天发生的事、心情、想法……"></textarea>
          <details class="diary-external-wrap">
            <summary>粘贴 ChatGPT / 其他 AI 的分析（可选，仅供参考）</summary>
            <textarea id="diary-external" rows="4" placeholder="把 ChatGPT 的分析结果贴在这里，本站 AI 会独立判断，不盲从。"></textarea>
          </details>
          <div class="diary-actions">
            <button class="btn btn-primary" id="diary-save">💾 保存日记</button>
            <button class="btn" id="diary-analyze">🤖 AI 分析</button>
          </div>
        </div>

        <div id="diary-analysis"></div>

        <section class="section">
          <div class="section-head">
            <h2>📊 回顾</h2>
            <div class="diary-review-bar">
              <select id="review-period">
                <option>本周</option><option>本月</option><option>上月</option>
                <option>近30天</option><option>全部</option>
              </select>
              <button class="btn btn-sm" id="review-generate">生成回顾</button>
            </div>
          </div>
          <div id="diary-review"></div>
        </section>

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
      const externalEl = document.getElementById('diary-external');

      function currentSavedEntry() { return Store.diary.getByDate(currentDate); }

      function loadEntry(date) {
        currentDate = date;
        pendingAnalysis = null;
        const entry = Store.diary.getByDate(date);
        contentEl.value = entry ? (entry.content || '') : '';
        externalEl.value = entry ? (entry.external_analysis || '') : '';
        document.getElementById('diary-analysis').innerHTML = entry && entry.analysis
          ? renderAnalysis(entry.analysis, true, date)
          : '<div class="hint">这一天还没有分析结果，写完日记点「AI 分析」。</div>';
      }

      dateInput.addEventListener('change', () => loadEntry(dateInput.value));
      document.getElementById('diary-today').onclick = () => {
        dateInput.value = utils.today();
        loadEntry(utils.today());
      };

      document.getElementById('diary-save').onclick = async () => {
        const entry = currentSavedEntry();
        await Store.diary.save({
          entry_date: currentDate,
          content: contentEl.value,
          external_analysis: externalEl.value,
          analysis: entry ? entry.analysis : null,
        });
        UI.toast('日记已保存');
      };

      document.getElementById('diary-analyze').onclick = async () => {
        const content = contentEl.value;
        if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
        if (!content.trim()) { UI.toast('请先写一些日记内容'); return; }
        const m = UI.modal({ title: 'AI 独立分析中', content: `<div class="loading"><span class="spinner"></span><span>正在独立分析…</span></div>`, actions: [] });
        try {
          const result = await AI.analyzeDiary(content, externalEl.value);
          m.close();
          pendingAnalysis = result;
          document.getElementById('diary-analysis').innerHTML = renderAnalysis(result, false, currentDate);
        } catch (e) {
          m.close();
          UI.toast('分析失败：' + e.message);
        }
      };

      // 回顾
      document.getElementById('review-generate').onclick = async () => {
        if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
        const period = document.getElementById('review-period').value;
        const entries = entriesInPeriod(period);
        if (!entries.length) { UI.toast('该时间段没有日记'); return; }
        const m = UI.modal({ title: '生成回顾中', content: `<div class="loading"><span class="spinner"></span><span>正在生成回顾…</span></div>`, actions: [] });
        try {
          const r = await AI.reviewDiary(entries.map(e => ({ date: e.entry_date, summary: e.analysis ? e.analysis.summary : '', content: e.content })), period);
          m.close();
          document.getElementById('diary-review').innerHTML = renderReview(r, period);
        } catch (e) {
          m.close();
          UI.toast('回顾失败：' + e.message);
        }
      };

      // 分析结果区域操作：保存分析 / 转为能力证据
      document.getElementById('diary-analysis').addEventListener('click', e => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        if (btn.dataset.action === 'save-analysis' && pendingAnalysis) {
          Store.diary.save({ entry_date: currentDate, content: contentEl.value, external_analysis: externalEl.value, analysis: pendingAnalysis })
            .then(() => { pendingAnalysis = null; UI.toast('分析已保存'); loadEntry(currentDate); });
        }
        if (btn.dataset.action === 'to-evidence') {
          convertToEvidence();
        }
      });

      // 历史日记
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

  // 把日记里的"提升点"转成能力证据
  function convertToEvidence() {
    const entry = Store.diary.getByDate(currentDate);
    const a = pendingAnalysis || (entry && entry.analysis) || null;
    if (!a || !a.improved) { UI.toast('没有可转换的提升点'); return; }
    UI.skillPicker({ title: '转为能力证据（选择具体能力）', onPick: async (s) => {
      await Store.evidence.add({
        skill_id: s.id,
        project_id: null,
        evidence_description: a.improved,
        evidence_date: currentDate,
        source: '日记 ' + currentDate,
        ai_suggested: true,
      });
      a.evidence_created = true;
      await Store.diary.save({ entry_date: currentDate, content: document.getElementById('diary-content').value, external_analysis: document.getElementById('diary-external').value, analysis: a });
      pendingAnalysis = a;
      UI.toast('已转为能力证据');
      loadEntry(currentDate);
    }});
  }

  // 渲染分析结果
  function renderAnalysis(a, saved, date) {
    const levelClass = { '高': 'lvl-high', '中': 'lvl-mid', '低': 'lvl-low', '待观察': 'lvl-na' };
    const canConvert = a.improved && !a.evidence_created;
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
        ${a.improved ? `<div class="ai-block"><b>📈 今天提升</b><div>${UI.esc(a.improved)}${a.improved_domain && a.improved_domain !== '无' ? ` <span class="muted">（${UI.esc(a.improved_domain)}）</span>` : ''}
          ${canConvert ? `<button class="btn btn-xs btn-primary" data-action="to-evidence">转为能力证据</button>` : ''}</div></div>` : ''}
        ${a.strengthen ? `<div class="ai-block"><b>🎯 未来加强</b><div>${UI.esc(a.strengthen)}</div></div>` : ''}
        ${a.advice ? `<div class="ai-block"><b>💡 建议</b><div>${UI.esc(a.advice)}</div></div>` : ''}
        ${a.independent_view ? `<div class="ai-block ai-view"><b>🧭 独立视角</b><div>${UI.esc(a.independent_view)}</div></div>` : ''}
        ${a.blind_spot ? `<div class="ai-block ai-blind"><b>👁️ 可能的盲点</b><div>${UI.esc(a.blind_spot)}</div></div>` : ''}
      </div>`;
  }

  // 渲染回顾
  function renderReview(r, period) {
    return `<div class="card diary-review">
      <div class="ai-summary">${UI.esc(period)}回顾 · ${UI.esc(r.overview || '')}</div>
      ${r.growth && r.growth.length ? `<div class="ai-block"><b>📈 成长点</b><ul>${r.growth.map(x => `<li>${UI.esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.patterns && r.patterns.length ? `<div class="ai-block"><b>🔁 反复出现的模式</b><ul>${r.patterns.map(x => `<li>${UI.esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${r.strengths && r.strengths.length ? `<div class="ai-block"><b>✨ 品格优势</b><div class="chip-list">${r.strengths.map(s => `<span class="chip chip-lg">${UI.esc(s)}</span>`).join('')}</div></div>` : ''}
      ${r.focus ? `<div class="ai-block"><b>🎯 接下来重点</b><div>${UI.esc(r.focus)}</div></div>` : ''}
      ${r.trend ? `<div class="ai-block"><b>📉 变化趋势</b><div>${UI.esc(r.trend)}</div></div>` : ''}
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

  // 时间段筛选
  function fmt(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function entriesInPeriod(label) {
    const now = new Date();
    let start = '0000-00-00', end = utils.today();
    if (label === '本周') {
      const dow = (now.getDay() + 6) % 7;
      start = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow));
    } else if (label === '本月') {
      start = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (label === '上月') {
      start = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = fmt(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (label === '近30天') {
      start = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30));
    }
    return Store.diary.list().filter(e => e.entry_date >= start && e.entry_date <= end);
  }
})();
