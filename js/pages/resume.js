/* =====================================================================
 * pages/resume.js — 一页纸简历 / 经历档案导出
 *
 * 汇总真实经历（项目 + 能力证据 + 成就 + 日记画像），生成可打印的
 * 一页简历，通过浏览器「打印 → 另存为 PDF」下载。
 * ===================================================================== */

(function () {
  const UI = window.UI;
  const Store = window.Store;
  const AI = window.AI;
  const utils = window.utils;

  let introText = ''; // 自我评价（默认自动生成，可 AI 重写）

  window.Router.register('/resume', {
    title: '导出简历',
    render: function () {
      return `
        <div class="page-header no-print">
          <div><h1>导出简历</h1>
          <p class="sub">把最重要的经历汇总成一页纸，直接下载当简历用。</p></div>
          <div class="resume-toolbar">
            <button class="btn" id="resume-ai">🤖 AI 生成自我评价</button>
            <button class="btn btn-primary" id="resume-print">🖨️ 导出 / 打印 PDF</button>
          </div>
        </div>
        <p class="hint no-print">提示：点「导出/打印」，在打印对话框里选「另存为 PDF」，边距设为默认、缩放 100% 即可。</p>
        <div class="resume-sheet" id="resume-sheet"></div>`;
    },
    mount: function () {
      const d = buildData();
      introText = autoIntro(d);
      renderSheet(d);
      document.getElementById('resume-print').onclick = () => window.print();
      document.getElementById('resume-ai').onclick = async () => {
        if (!AI.config.configured()) { UI.toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
        const m = UI.modal({ title: '生成中', content: `<div class="loading"><span class="spinner"></span><span>正在生成自我评价…</span></div>`, actions: [] });
        try {
          const text = await AI.resumeSummary(buildPayload(d));
          m.close();
          introText = text.trim() || introText;
          renderSheet(d);
          UI.toast('自我评价已更新');
        } catch (e) { m.close(); UI.toast('生成失败：' + e.message); }
      };
    },
  });

  function buildData() {
    const u = Store.user();
    const cats = Store.skillsView.categories();
    const skills = Store.skills().map(s => ({ name: s.name, icon: s.icon, category: s.category, count: Store.effectiveCount(s.id) }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    const projects = Store.projects.list()
      .filter(p => p.status !== '暂停')
      .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))
      .map(p => ({
        id: p.id, name: p.name, type: p.project_type, status: p.status,
        start: p.start_date, end: p.end_date,
        roles: Store.roles.list(p.id).map(r => r.role_name),
        contributions: Store.contributions.list(p.id).map(c => c.description),
        outcomes: utils.tags(p.outcomes),
      }));
    const achievements = Store.achievements.list().filter(a => a.unlocked);
    const profile = Store.diary.profile();
    return { u, cats, skills, projects, achievements, profile };
  }

  function buildPayload(d) {
    return {
      name: d.u.display_name,
      domains: d.cats.map(c => ({ domain: c.key, evidence: c.total })),
      skills: d.skills.map(s => s.name),
      projects: d.projects.map(p => ({ name: p.name, type: p.type, roles: p.roles, contributions: p.contributions, outcomes: p.outcomes })),
      achievements: d.achievements.map(a => a.name),
    };
  }

  function autoIntro(d) {
    const top = d.cats.filter(c => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 2).map(c => c.key).join('、');
    const parts = [];
    if (top) parts.push('在「' + top + '」领域持续积累实践证据');
    if (d.projects.length) parts.push('参与并完成 ' + d.projects.length + ' 个项目/活动');
    if (d.achievements.length) parts.push('解锁 ' + d.achievements.length + ' 项成长成就');
    return (d.u.display_name || '') + '，' + (parts.length ? parts.join('，') + '。' : '持续记录成长，以真实经历驱动自我提升。');
  }

  function renderSheet(d) {
    const u = d.u;
    const el = document.getElementById('resume-sheet');
    const contact = [u.email ? '📧 ' + UI.esc(u.email) : '', u.bio ? UI.esc(u.bio) : ''].filter(Boolean).join(' · ');

    el.innerHTML = `
      <div class="resume-head">
        <div class="resume-name">${UI.esc(u.display_name || '未命名')}</div>
        ${contact ? `<div class="resume-contact">${contact}</div>` : ''}
      </div>

      <div class="resume-sec">
        <div class="resume-sec-title">自我评价</div>
        <p class="resume-intro">${UI.esc(introText)}</p>
      </div>

      <div class="resume-sec">
        <div class="resume-sec-title">能力概况</div>
        <div class="resume-domains">
          ${d.cats.map(c => `
            <div class="resume-domain">
              <span>${c.icon}</span>
              <span class="rd-name">${UI.esc(c.key)}</span>
              <span class="rd-count">${c.total} 项证据</span>
            </div>`).join('')}
        </div>
        ${d.skills.length ? `<div class="resume-skills">${d.skills.map(s => `<span class="resume-chip">${UI.esc(s.name)} ×${s.count}</span>`).join('')}</div>` : ''}
      </div>

      <div class="resume-sec">
        <div class="resume-sec-title">主要经历</div>
        ${d.projects.length ? d.projects.map(p => `
          <div class="resume-exp">
            <div class="resume-exp-head">
              <span class="re-name">${UI.esc(p.name)}</span>
              <span class="re-meta">${UI.esc(p.type)} · ${utils.fmtMonth(p.start)}${p.end ? ' ~ ' + utils.fmtMonth(p.end) : ' 至今'}</span>
            </div>
            ${p.roles.length ? `<div class="re-line"><b>角色</b>：${p.roles.map(UI.esc).join(' / ')}</div>` : ''}
            ${p.contributions.length ? `<div class="re-line"><b>贡献</b>：${p.contributions.map(UI.esc).join(' · ')}</div>` : ''}
            ${p.outcomes.length ? `<div class="re-line"><b>成果</b>：${p.outcomes.map(UI.esc).join(' · ')}</div>` : ''}
          </div>`).join('')
        : '<div class="muted">还没有项目经历，去「项目」页添加吧。</div>'}
      </div>

      ${d.achievements.length ? `
      <div class="resume-sec">
        <div class="resume-sec-title">成长成就</div>
        <div class="resume-achs">${d.achievements.map(a => `<span class="resume-ach">${a.icon} ${UI.esc(a.name)}</span>`).join('')}</div>
      </div>` : ''}

      ${d.profile && d.profile.analyzedCount ? `
      <div class="resume-sec">
        <div class="resume-sec-title">性格特质（基于 ${d.profile.analyzedCount} 篇日记）</div>
        <div class="resume-skills">
          ${d.profile.ocean.filter(o => o.dominant).map(o => `<span class="resume-chip">${UI.esc(o.trait)}：${UI.esc(o.dominant)}</span>`).join('')}
          ${d.profile.strengths.slice(0, 4).map(s => `<span class="resume-chip">✨ ${UI.esc(s.name)}</span>`).join('')}
        </div>
      </div>` : ''}

      <div class="resume-foot muted">由「人生档案馆」生成 · 数据来源于真实项目与实践证据</div>`;
  }
})();
