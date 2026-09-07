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

  // 通用 LLM 调用（OpenAI 兼容 /chat/completions）
  async function chat(cfg, messages, temperature) {
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const body = {
      model: cfg.model || 'deepseek-chat',
      messages: messages,
      temperature: temperature == null ? 0.2 : temperature,
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

  async function callLLM(cfg, text, fileName, skillNames) {
    return chat(cfg, buildPrompt(text, fileName, skillNames));
  }

  // =====================================================================
  // 日记分析：基于大五人格 + VIA 品格优势 + 成长型思维
  // =====================================================================
  const OCEAN_TRAITS = ['开放性', '尽责性', '外向性', '宜人性', '情绪稳定性'];
  const VIA_STRENGTHS = '创造力、好奇心、判断力、好学、洞察力、勇敢、毅力、真诚、热情、爱、善良、社交智慧、团队合作、公平、领导力、宽恕、谦逊、审慎、自我调节、欣赏美、感恩、希望、幽默、灵性';

  function buildDiaryMessages(content, date, externalAnalysis) {
    const system = '你是「人生档案馆」的成长教练与心理分析助手。请基于心理学科学框架独立分析用户的日记，帮助 ta 看见成长与人格特点。\n'
      + '科学依据：\n'
      + '1. 大五人格（Big Five / OCEAN）：开放性、尽责性、外向性、宜人性、情绪稳定性。\n'
      + '2. 品格优势（VIA，Peterson & Seligman）：24 项归入 6 大美德。候选优势为：' + VIA_STRENGTHS + '。\n'
      + '3. 成长型思维（Carol Dweck）与反思性实践（Donald Schön）：关注可改进的行为与反思循环。\n\n'
      + '重要原则：\n'
      + '- 用户可能附上其他 AI（如 ChatGPT）的分析，仅作参考。你要独立分析，可以借鉴但绝不能盲从；可以有不同看法，不必顺着用户或 ChatGPT 的说法。\n'
      + '- 你唯一的目的是帮助用户变得更好，因此可以温和地指出被忽略的盲点。\n'
      + '- 只依据日记文本中的真实证据推断，证据不足时 level 用"待观察"。\n'
      + '- 语气温和、建设性，不做负面评判、不下临床诊断。\n\n'
      + '输出 JSON（只输出 JSON，不要其他文字）：\n'
      + '{"summary":"今天一句话总结",'
      + '"ocean":[{"trait":"开放性","level":"高|中|低|待观察","evidence":"简短依据"}，共5项：' + OCEAN_TRAITS.join('、') + '],'
      + '"strengths":["从VIA中选1-3个"],'
      + '"improved":"今天主要在哪个方面有提升（一句话）",'
      + '"improved_domain":"思考与学习|表达与沟通|创意与内容|项目与职业|数字与技术|自我发展|无",'
      + '"strengthen":"未来建议加强的方面（一句话）",'
      + '"advice":"一条具体可执行的建议",'
      + '"independent_view":"你独立的、可能不同于用户自述或外部AI分析的观察",'
      + '"blind_spot":"用户可能忽略的一个点（没有则为空字符串）"}';
    let user = '日期：' + (date || '') + '\n\n日记内容：\n' + content;
    if (externalAnalysis && externalAnalysis.trim()) {
      user += '\n\n（用户附上的其他 AI 分析，仅供参考，请独立判断）\n' + externalAnalysis.trim();
    }
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  async function analyzeDiary(content, externalAnalysis, onProgress) {
    const cfg = config.get();
    if (!cfg.apiKey) throw new Error('请先在「设置 → AI 分析」里填写 API Key');
    if (!content || !content.trim()) throw new Error('请先写一些日记内容');
    if (onProgress) onProgress('AI 正在独立分析…');
    return chat(cfg, buildDiaryMessages(content.trim().slice(0, 8000), utils().today(), externalAnalysis), 0.3);
  }

  // 跨日记回顾（每周/每月）
  function buildReviewMessages(entries, periodLabel) {
    const system = '你是「人生档案馆」的成长教练。用户会提供一段时间内的多篇日记摘要，请做一份成长回顾。\n'
      + '参考框架：大五人格、VIA 品格优势、成长型思维、反思性实践。\n'
      + '原则：独立分析，客观温和，聚焦成长，指出趋势与可改进方向。\n\n'
      + '输出 JSON（只输出 JSON）：\n'
      + '{"overview":"这段时间整体回顾（一段话）",'
      + '"growth":["成长点1","成长点2"],'
      + '"patterns":["反复出现的主题或模式"],'
      + '"strengths":["体现的品格优势"],'
      + '"focus":"接下来应重点加强的方向",'
      + '"trend":"人格/能力/情绪的变化趋势（一段话）"}';
    const lines = entries.map(e => {
      const a = e.analysis || {};
      const excerpt = (e.content || '').replace(/\s+/g, ' ').slice(0, 160);
      return '- ' + (e.date || '') + ' 总结：' + (a.summary || '') + ' 内容摘录：' + excerpt;
    }).join('\n');
    const user = '回顾周期：' + (periodLabel || '') + '\n\n' + lines;
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  async function reviewDiary(entries, periodLabel, onProgress) {
    const cfg = config.get();
    if (!cfg.apiKey) throw new Error('请先在「设置 → AI 分析」里填写 API Key');
    if (!entries || !entries.length) throw new Error('该时间段没有日记');
    if (onProgress) onProgress('AI 正在生成回顾…');
    return chat(cfg, buildReviewMessages(entries.slice(0, 60), periodLabel), 0.4);
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

  // 简历自我评价（返回纯文本，不解析 JSON）
  async function resumeSummary(payload, onProgress) {
    const cfg = config.get();
    if (!cfg.apiKey) throw new Error('请先在「设置 → AI 分析」里填写 API Key');
    if (onProgress) onProgress('AI 正在生成自我评价…');
    const url = cfg.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const system = '你是简历写作助手。请根据用户真实的经历数据，写一段 80-120 字的「自我评价/个人简介」。\n'
      + '要求：客观、有依据、不夸大，用第一人称，突出能力积累与成长，避免空话套话。只输出一段纯文本，不要标题、不要 JSON。';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + cfg.apiKey },
      body: JSON.stringify({
        model: cfg.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: '经历数据：\n' + JSON.stringify(payload, null, 1) },
        ],
        temperature: 0.6,
      }),
    });
    if (!res.ok) throw new Error('AI 请求失败（' + res.status + '）：' + (await res.text()).slice(0, 200));
    const data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message.content) || '';
  }

  // 简历经历智能匹配：根据目标公司/岗位挑选相关经历
  async function matchResume(target, projects, onProgress) {
    const cfg = config.get();
    if (!cfg.apiKey) throw new Error('请先在「设置 → AI 分析」里填写 API Key');
    if (!target || !target.trim()) throw new Error('请先填写目标公司/岗位');
    if (onProgress) onProgress('AI 正在匹配经历…');
    const system = '你是简历匹配助手。根据用户的目标公司/岗位，从用户的经历中挑选最相关、最有说服力的几项（2-6项），用于写简历。\n'
      + '只从给定的经历里选，输出 JSON：{"selected":["项目名称"],"reason":"一句话说明匹配逻辑"}。只输出 JSON。';
    const messages = [
      { role: 'system', content: system },
      { role: 'user', content: '目标公司/岗位：' + target + '\n\n用户经历：\n' + JSON.stringify(projects) },
    ];
    return chat(cfg, messages, 0.3);
  }

  return { config, analyzeFile, analyzeAndShow, analyzeDiary, reviewDiary, resumeSummary, matchResume, showResultModal, test };
})();
