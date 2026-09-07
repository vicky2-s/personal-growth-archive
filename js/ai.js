/* =====================================================================
 * ai.js — AI 文件分析模块（浏览器直连 · OpenAI 兼容接口）
 *
 * 流程：
 *   选择文件 → 前端提取文本 → 调用 LLM（DeepSeek 等）→ 返回结构化结果
 *   → 展示「摘要 / 关键词 / 贡献 / 推荐能力」→ 用户勾选确认 → 生成能力证据
 *
 * 密钥存储在浏览器 localStorage（BYOK），仅发送给你配置的服务商。
 * ===================================================================== */

window.AI = (function () {
  const CONFIG_KEY = 'pga_ai_config_v1';
  const Store = () => window.Store;
  const UI = () => window.UI;
  const utils = () => window.utils;

  // ---------- 配置 ----------
  const config = {
    defaults: { baseUrl: 'https://api.deepseek.com', apiKey: '', model: 'deepseek-chat' },
    get: function () {
      try {
        return Object.assign({}, this.defaults, JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'));
      } catch (e) { return Object.assign({}, this.defaults); }
    },
    set: function (c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); },
    configured: function () { return !!this.get().apiKey; },
  };

  // =====================================================================
  // 文本提取（按扩展名分发）
  // =====================================================================
  function bufToText(buf) { return new TextDecoder('utf-8').decode(buf); }

  async function extractText(fileName, arrayBuffer) {
    const ext = utils().ext(fileName);
    if (['txt', 'md', 'csv', 'json', 'js', 'html', 'xml'].includes(ext)) {
      return bufToText(arrayBuffer);
    }
    if (ext === 'doc' || ext === 'docx') {
      if (!window.mammoth) throw new Error('文档解析组件未加载，请检查网络');
      const res = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
      return res.value || '';
    }
    if (ext === 'pdf') {
      if (!window.pdfjsLib) throw new Error('PDF 解析组件未加载，请检查网络');
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(it => it.str).join(' ') + '\n';
      }
      return text;
    }
    if (ext === 'ppt' || ext === 'pptx') {
      if (!window.JSZip) throw new Error('PPT 解析组件未加载，请检查网络');
      const zip = await window.JSZip.loadAsync(arrayBuffer);
      const slideFiles = Object.keys(zip.files)
        .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
        .sort((a, b) => parseInt(a.match(/slide(\d+)/)[1], 10) - parseInt(b.match(/slide(\d+)/)[1], 10));
      let text = '';
      for (const f of slideFiles) {
        const xml = await zip.files[f].async('string');
        const matches = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)];
        text += matches.map(m => m[1]).join(' ') + '\n';
      }
      return text;
    }
    if (ext === 'xls' || ext === 'xlsx') {
      if (!window.XLSX) throw new Error('表格解析组件未加载，请检查网络');
      const wb = window.XLSX.read(arrayBuffer, { type: 'array' });
      let text = '';
      wb.SheetNames.forEach(name => {
        text += '【' + name + '】\n';
        text += window.XLSX.utils.sheet_to_csv(wb.Sheets[name]) + '\n';
      });
      return text;
    }
    throw new Error('暂不支持分析该文件类型：.' + ext + '（支持 txt/md/docx/pdf/pptx/xlsx）');
  }

  // 获取文件字节（live 模式从 Storage 下载；demo 模式无真实内容）
  async function getFileBytes(file) {
    if (!file.file_url) {
      throw new Error(Store().isDemo()
        ? '演示模式没有真实文件内容，请登录后上传真实文件再分析'
        : '文件缺少存储路径');
    }
    const url = await Store().files.url(file);
    const res = await fetch(url);
    if (!res.ok) throw new Error('下载文件失败（' + res.status + '）');
    return await res.arrayBuffer();
  }

  // =====================================================================
  // 调用 LLM（OpenAI 兼容 /chat/completions）
  // =====================================================================
  function buildPrompt(text, fileName, skillNames) {
    const system = '你是「人生档案馆」的档案分析助手。用户提供一份文件的内容，请分析并输出 JSON。\n'
      + '能力库（推荐能力只能从以下名称中选择）：' + skillNames.join('、') + '\n'
      + '必须输出如下 JSON（不要输出其他文字）：\n'
      + '{"summary":"一句话总结","detailed_summary":"详细内容总结","keywords":["关键词"],'
      + '"suggested_project":"可能所属的项目名称（不确定则为空字符串）",'
      + '"contributions":["用户在这件事里可能的个人贡献，2-5条"],'
      + '"suggested_skills":["从能力库中选择的能力名称，最多5个"]}';
    const user = '文件名：' + fileName + '\n\n文件内容：\n' + text;
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  function parseJSON(text) {
    if (!text) throw new Error('AI 返回为空');
    let t = text.trim();
    t = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim();
    try {
      return JSON.parse(t);
    } catch (e) {
      const m = t.match(/\{[\s\S]*\}/);
      if (m) return JSON.parse(m[0]);
      throw new Error('AI 返回格式无法解析');
    }
  }

  async function callLLM(cfg, text, fileName, skillNames) {
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const body = {
      model: cfg.model || 'deepseek-chat',
      messages: buildPrompt(text, fileName, skillNames),
      temperature: 0.2,
      response_format: { type: 'json_object' },
    };
    const doFetch = (withFormat) => {
      const b = withFormat ? body : Object.assign({}, body, { response_format: undefined });
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
        body: JSON.stringify(b),
      });
    };
    let res = await doFetch(true);
    if (res.status === 400) { res = await doFetch(false); } // 某些兼容服务不支持 response_format
    if (!res.ok) throw new Error('AI 请求失败（' + res.status + '）：' + (await res.text()).slice(0, 200));
    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message.content;
    return parseJSON(content);
  }

  // 把 LLM 返回的能力名称匹配到技能库
  function matchSkills(names) {
    const skills = Store().skills();
    return (names || []).map(n => {
      const s = skills.find(x => x.name === n)
        || skills.find(x => x.name.includes(n) || n.includes(x.name));
      return { name: n, skill: s || null };
    });
  }

  // =====================================================================
  // 主入口：分析文件
  // =====================================================================
  async function analyzeFile(file, onProgress) {
    const cfg = config.get();
    if (!cfg.apiKey) throw new Error('请先在「设置 → AI 分析」里填写 API Key');
    if (onProgress) onProgress('正在下载文件…');
    const bytes = await getFileBytes(file);
    if (onProgress) onProgress('正在提取文本…');
    const text = await extractText(file.file_name, bytes);
    if (!text || !text.trim()) throw new Error('未能从文件中提取到有效文本');
    if (onProgress) onProgress('AI 正在分析…');
    const result = await callLLM(cfg, text.trim().slice(0, 15000), file.file_name, Store().skills().map(s => s.name));
    result.matchedSkills = matchSkills(result.suggested_skills || []);
    return result;
  }

  // =====================================================================
  // 分析结果弹窗（用户确认后生成证据）
  // =====================================================================
  function showResultModal(file, result) {
    const U = UI();
    const projects = Store().projects.list();
    const matched = result.matchedSkills || [];
    const validSkills = matched.filter(m => m.skill);
    const projectId = file.project_id || '';

    const content = document.createElement('div');
    content.innerHTML = `
      <div class="ai-result">
        <div class="ai-summary">${U.esc(result.summary || '')}</div>
        ${result.detailed_summary ? `<p class="ai-detail">${U.esc(result.detailed_summary)}</p>` : ''}
        ${(result.keywords || []).length ? `<div class="ai-keywords">${result.keywords.map(k => `<span class="chip">${U.esc(k)}</span>`).join('')}</div>` : ''}
        <div class="ai-block"><b>可能所属项目</b><div>${U.esc(result.suggested_project || '未识别')}</div></div>
        <div class="ai-block"><b>识别到的个人贡献</b>
          ${(result.contributions || []).length
            ? `<ul>${result.contributions.map(c => `<li>${U.esc(c)}</li>`).join('')}</ul>`
            : '<div class="muted">未识别</div>'}
        </div>
        <div class="ai-block"><b>推荐能力（勾选后生成能力证据）</b>
          ${validSkills.length
            ? validSkills.map(m => `<label class="ai-skill-opt"><input type="checkbox" class="ai-skill" data-id="${m.skill.id}" checked> ${m.skill.icon} ${U.esc(m.skill.name)} <span class="muted">${U.esc(m.skill.category)}</span></label>`).join('')
            : '<div class="muted">未匹配到能力，可手动到项目里添加</div>'}
        </div>
        <div class="ai-block"><b>证据归属项目</b>
          <select id="ai-project">
            <option value="">未分类</option>
            ${projects.map(p => `<option value="${p.id}" ${p.id === projectId ? 'selected' : ''}>${U.esc(p.name)}</option>`).join('')}
          </select>
        </div>
      </div>`;

    const m = U.modal({
      title: 'AI 分析结果 · ' + utils().fileIcon(file.file_name) + ' ' + file.file_name,
      content: content,
      actions: [
        { label: '关闭', onClick: () => {} },
        { label: '仅保存结果', onClick: async () => {
            await saveResult(file, result, false, null);
            U.toast('分析结果已保存'); window.Router.go();
          } },
        { label: '生成能力证据', primary: true, onClick: async () => {
            const checked = Array.from(m.body.querySelectorAll('.ai-skill:checked')).map(cb => cb.dataset.id);
            const pid = m.body.querySelector('#ai-project').value || null;
            if (!checked.length) { U.toast('请至少勾选一项能力'); return 'keep'; }
            await saveResult(file, result, true, checked, pid);
            U.toast('已生成 ' + checked.length + ' 项能力证据'); window.Router.go();
          } },
      ],
    });
  }

  async function saveResult(file, result, confirmed, checkedSkillIds, pid) {
    const p = pid ? Store().projectById(pid) : null;
    if (confirmed) {
      for (const skillId of checkedSkillIds) {
        const s = Store().skillById(skillId);
        await Store().evidence.add({
          skill_id: skillId,
          project_id: pid,
          evidence_description: (result.contributions && result.contributions[0]) || result.summary || s.name,
          evidence_date: utils().today(),
          source: (p ? p.name : '') || result.suggested_project || file.file_name,
          ai_suggested: true,
        });
      }
    }
    await Store().ai.save({
      file_id: file.id,
      project_id: pid,
      summary: result.summary || '',
      detailed_summary: result.detailed_summary || '',
      keywords: result.keywords || [],
      suggested_project: result.suggested_project || '',
      contributions: result.contributions || [],
      suggested_skills: checkedSkillIds || (result.matchedSkills || []).filter(m => m.skill).map(m => m.skill.id),
      status: confirmed ? 'confirmed' : 'pending',
    });
  }

  // 测试连接（设置页用）
  async function test() {
    const cfg = config.get();
    if (!cfg.apiKey) throw new Error('请先填写 API Key');
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({ model: cfg.model || 'deepseek-chat', messages: [{ role: 'user', content: '请回复 OK' }], max_tokens: 5 }),
    });
    if (!res.ok) throw new Error('连接失败（' + res.status + '）：' + (await res.text()).slice(0, 200));
    return '连接成功';
  }

  // 一键分析 + 展示（供各页面的「AI 分析」按钮调用）
  async function analyzeAndShow(file) {
    if (!config.configured()) { UI().toast('请先在「设置 → AI 分析」里配置 API Key'); return; }
    const m = UI().modal({
      title: 'AI 分析中',
      content: `<div class="loading"><span class="spinner"></span><span id="ai-progress">准备中…</span></div>`,
      actions: [],
    });
    const setText = t => {
      const el = m.body.querySelector('#ai-progress');
      if (el) el.textContent = t;
    };
    try {
      const result = await analyzeFile(file, setText);
      m.close();
      showResultModal(file, result);
    } catch (e) {
      m.close();
      UI().toast('分析失败：' + e.message);
    }
  }

  return { config, analyzeFile, analyzeAndShow, showResultModal, test };
})();
