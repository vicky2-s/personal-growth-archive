/* =====================================================================
 * store.js — 数据访问层（统一封装）
 *
 * 页面层只调用 Store 的方法，不直接操作 Supabase 或 localStorage。
 * 支持两种模式：
 *   - demo 模式：数据来自 seed.js，存 localStorage，可增删改。
 *   - live 模式：数据来自 Supabase，登录后一次性拉入内存缓存。
 * ===================================================================== */

window.Store = (function () {
  const LS_KEY = 'pga_demo_v1';

  // 内存缓存（两种模式共用同一份结构）
  const cache = {
    user: null,
    projects: [], roles: [], contributions: [], files: [],
    evidence: [], reflections: [], skills: [], achievements: [], userAchievements: [],
    aiAnalysis: [], diary: [],
  };

  let mode = 'demo';
  const client = window.SB.client;

  const isDemo = () => mode === 'demo';
  const now = () => new Date().toISOString();

  // ---------- demo 模式持久化 ----------
  function loadDemo() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) {}
    if (saved && saved.projects) {
      Object.assign(cache, saved);
    } else {
      const s = window.SEED.initial;
      cache.user = JSON.parse(JSON.stringify(s.user));
      cache.skills = JSON.parse(JSON.stringify(s.skills));
      cache.achievements = JSON.parse(JSON.stringify(s.achievements));
      cache.projects = JSON.parse(JSON.stringify(s.projects));
      cache.roles = JSON.parse(JSON.stringify(s.roles));
      cache.contributions = JSON.parse(JSON.stringify(s.contributions));
      cache.files = JSON.parse(JSON.stringify(s.files));
      cache.evidence = JSON.parse(JSON.stringify(s.evidence));
      cache.reflections = JSON.parse(JSON.stringify(s.reflections));
      cache.userAchievements = JSON.parse(JSON.stringify(s.userAchievements));
      cache.aiAnalysis = s.aiAnalysis ? JSON.parse(JSON.stringify(s.aiAnalysis)) : [];
      cache.diary = s.diary ? JSON.parse(JSON.stringify(s.diary)) : [];
      saveDemo();
    }
  }
  function saveDemo() { try { localStorage.setItem(LS_KEY, JSON.stringify(cache)); } catch (e) {} }

  // ---------- live 模式加载 ----------
  async function loadLive() {
    const c = window.SB.client;
    const { data: sessionData } = await c.auth.getSession();
    const uid = sessionData.session.user.id;

    // 用户资料（触发器已自动建行；万一未建，降级为默认）
    let user = null;
    const { data: ud } = await c.from('users').select('*').eq('id', uid).maybeSingle();
    user = ud || { id: uid, email: sessionData.session.user.email, display_name: '新用户', bio: '' };
    cache.user = user;

    const tables = [
      ['projects', 'projects'],
      ['roles', 'project_roles'],
      ['contributions', 'contributions'],
      ['files', 'files'],
      ['evidence', 'skill_evidence'],
      ['reflections', 'reflections'],
      ['skills', 'skills'],
      ['achievements', 'achievements'],
      ['userAchievements', 'user_achievements'],
      ['aiAnalysis', 'ai_analysis'],
      ['diary', 'diary_entries'],
    ];
    for (const [k, t] of tables) {
      const { data, error } = await c.from(t).select('*');
      if (error) { console.error('loadLive ' + t, error); continue; }
      cache[k] = data || [];
    }
    cache.evidence.forEach(e => { if (e.confirmed == null) e.confirmed = true; });
  }

  // ---------- 初始化（应用启动时调用）----------
  async function init() {
    if (window.SB.configured) {
      const user = await window.SB.restoreSession();
      if (user) { mode = 'live'; await loadLive(); return; }
    }
    mode = 'demo';
    loadDemo();
  }

  // ---------- 登录 / 退出 ----------
  async function signIn(email, password) {
    await window.SB.signIn(email, password);
    mode = 'live';
    await loadLive();
  }
  async function signUp(email, password, displayName) {
    await window.SB.signUp(email, password, displayName);
  }
  async function signOut() {
    await window.SB.signOut();
    mode = 'demo';
    loadDemo();
  }

  // 更新个人资料
  async function updateProfile(data) {
    if (isDemo()) {
      Object.assign(cache.user, data); saveDemo(); return cache.user;
    }
    const { data: d, error } = await client.from('users').update(data).eq('id', cache.user.id).select().single();
    if (error) throw error;
    Object.assign(cache.user, d); return cache.user;
  }

  // =====================================================================
  // 通用查询
  // =====================================================================
  const user = () => cache.user;
  const skills = () => cache.skills;
  const skillById = id => cache.skills.find(s => s.id === id);
  const projectById = id => cache.projects.find(p => p.id === id);
  const achievementById = id => cache.achievements.find(a => a.id === id);

  // 某能力下的有效证据（同一项目同一能力只计 1 条，防刷数量）
  function effectiveCount(skillId) {
    const set = new Set();
    cache.evidence.forEach(e => {
      if (e.skill_id === skillId && e.confirmed !== false && e.project_id) set.add(e.project_id);
    });
    return set.size;
  }

  // =====================================================================
  // 项目
  // =====================================================================
  const projects = {
    list: function (filters) {
      filters = filters || {};
      let list = cache.projects.slice();
      if (filters.status && filters.status !== '全部') list = list.filter(p => p.status === filters.status);
      if (filters.type && filters.type !== '全部') list = list.filter(p => p.project_type === filters.type);
      if (filters.year) list = list.filter(p => String(p.start_date || '').startsWith(filters.year));
      if (filters.q) {
        const q = filters.q.toLowerCase();
        list = list.filter(p => (p.name + ' ' + (p.description || '') + ' ' + utils.tags(p.tags).join(' ')).toLowerCase().includes(q));
      }
      return list.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
    },
    get: id => projectById(id),
    ongoing: () => cache.projects.filter(p => p.status === '进行中'),
    // 项目相对活跃度（文件+证据+贡献数量，用于进度条示意，非绝对进度）
    activity: function (p) {
      const files = cache.files.filter(f => f.project_id === p.id).length;
      const ev = cache.evidence.filter(e => e.project_id === p.id).length;
      const ct = cache.contributions.filter(c => c.project_id === p.id).length;
      return Math.min(1, (files + ev + ct) / 8);
    },
    create: async function (data) {
      const defaults = { description: '', project_type: '其他', status: '进行中', start_date: null, end_date: null, tags: [], outcomes: [], reflection: '' };
      if (isDemo()) {
        const p = Object.assign({ id: utils.uid(), user_id: cache.user.id, created_at: now(), updated_at: now() }, defaults, data);
        cache.projects.unshift(p); saveDemo(); return p;
      }
      const { data: d, error } = await client.from('projects').insert(Object.assign({}, defaults, data, { user_id: cache.user.id })).select().single();
      if (error) throw error;
      cache.projects.unshift(d); return d;
    },
    update: async function (id, data) {
      if (isDemo()) {
        const p = projectById(id); if (p) Object.assign(p, data, { updated_at: now() });
        saveDemo(); return p;
      }
      const { data: d, error } = await client.from('projects').update(data).eq('id', id).select().single();
      if (error) throw error;
      const i = cache.projects.findIndex(p => p.id === id); if (i >= 0) cache.projects[i] = d;
      return d;
    },
    remove: async function (id) {
      if (isDemo()) {
        cache.projects = cache.projects.filter(p => p.id !== id);
        cache.roles = cache.roles.filter(r => r.project_id !== id);
        cache.contributions = cache.contributions.filter(c => c.project_id !== id);
        cache.files = cache.files.map(f => f.project_id === id ? Object.assign({}, f, { project_id: null }) : f);
        cache.evidence = cache.evidence.filter(e => e.project_id !== id);
        cache.reflections = cache.reflections.filter(r => r.project_id !== id);
        saveDemo(); return;
      }
      const { error } = await client.from('projects').delete().eq('id', id);
      if (error) throw error;
      cache.projects = cache.projects.filter(p => p.id !== id);
    },
  };

  // =====================================================================
  // 角色 / 贡献 / 反思
  // =====================================================================
  const roles = {
    list: pid => cache.roles.filter(r => r.project_id === pid),
    add: async function (pid, role_name) {
      if (isDemo()) {
        const r = { id: utils.uid(), project_id: pid, role_name }; cache.roles.push(r); saveDemo(); return r;
      }
      const { data: d, error } = await client.from('project_roles').insert({ project_id: pid, role_name }).select().single();
      if (error) throw error; cache.roles.push(d); return d;
    },
    remove: async function (id) {
      if (isDemo()) { cache.roles = cache.roles.filter(r => r.id !== id); saveDemo(); return; }
      const { error } = await client.from('project_roles').delete().eq('id', id);
      if (error) throw error; cache.roles = cache.roles.filter(r => r.id !== id);
    },
  };

  const contributions = {
    list: pid => cache.contributions.filter(c => c.project_id === pid),
    add: async function (pid, description) {
      if (isDemo()) {
        const c = { id: utils.uid(), project_id: pid, description }; cache.contributions.push(c); saveDemo(); return c;
      }
      const { data: d, error } = await client.from('contributions').insert({ project_id: pid, description }).select().single();
      if (error) throw error; cache.contributions.push(d); return d;
    },
    remove: async function (id) {
      if (isDemo()) { cache.contributions = cache.contributions.filter(c => c.id !== id); saveDemo(); return; }
      const { error } = await client.from('contributions').delete().eq('id', id);
      if (error) throw error; cache.contributions = cache.contributions.filter(c => c.id !== id);
    },
  };

  const reflections = {
    list: pid => cache.reflections.filter(r => r.project_id === pid),
    add: async function (pid, data) {
      const row = Object.assign({ project_id: pid, learned: '', difficulty: '', improvement: '' }, data);
      if (isDemo()) {
        const r = Object.assign({ id: utils.uid(), user_id: cache.user.id, created_at: now() }, row); cache.reflections.push(r); saveDemo(); return r;
      }
      const { data: d, error } = await client.from('reflections').insert(Object.assign({}, row, { user_id: cache.user.id })).select().single();
      if (error) throw error; cache.reflections.push(d); return d;
    },
    remove: async function (id) {
      if (isDemo()) { cache.reflections = cache.reflections.filter(r => r.id !== id); saveDemo(); return; }
      const { error } = await client.from('reflections').delete().eq('id', id);
      if (error) throw error; cache.reflections = cache.reflections.filter(r => r.id !== id);
    },
  };

  // =====================================================================
  // 文件
  // =====================================================================
  const files = {
    list: function (filters) {
      filters = filters || {};
      let list = cache.files.slice();
      if (filters.project === 'uncategorized') list = list.filter(f => !f.project_id);
      else if (filters.project && filters.project !== 'all') list = list.filter(f => f.project_id === filters.project);
      if (filters.type && filters.type !== '全部') list = list.filter(f => f.file_type === filters.type.toLowerCase());
      if (filters.year) list = list.filter(f => String(f.uploaded_at || '').startsWith(filters.year));
      if (filters.tag) list = list.filter(f => utils.tags(f.tags).includes(filters.tag));
      if (filters.q) {
        const q = filters.q.toLowerCase();
        list = list.filter(f => (f.file_name + ' ' + (f.description || '') + ' ' + utils.tags(f.tags).join(' ')).toLowerCase().includes(q));
      }
      return list.sort((a, b) => (b.uploaded_at || '').localeCompare(a.uploaded_at || ''));
    },
    get: id => cache.files.find(f => f.id === id),
    upload: async function (file, projectId) {
      const ext = utils.ext(file.name);
      if (isDemo()) {
        const f = { id: utils.uid(), user_id: cache.user.id, project_id: projectId || null, file_name: file.name, file_type: ext, file_url: null, file_size: file.size, description: '', importance: '普通', tags: [], uploaded_at: now() };
        cache.files.unshift(f); saveDemo(); return f;
      }
      const path = cache.user.id + '/' + utils.uid() + (ext ? '.' + ext : '');
      const { error: upErr } = await client.storage.from('files').upload(path, file);
      if (upErr) throw upErr;
      const meta = { user_id: cache.user.id, project_id: projectId || null, file_name: file.name, file_type: ext, file_url: path, file_size: file.size, description: '', importance: '普通', tags: [], uploaded_at: now() };
      const { data: d, error } = await client.from('files').insert(meta).select().single();
      if (error) throw error;
      cache.files.unshift(d); return d;
    },
    update: async function (id, data) {
      if (isDemo()) {
        const f = cache.files.find(x => x.id === id); if (f) Object.assign(f, data); saveDemo(); return f;
      }
      const { data: d, error } = await client.from('files').update(data).eq('id', id).select().single();
      if (error) throw error;
      const i = cache.files.findIndex(x => x.id === id); if (i >= 0) cache.files[i] = d; return d;
    },
    remove: async function (id) {
      const f = cache.files.find(x => x.id === id);
      if (isDemo()) { cache.files = cache.files.filter(x => x.id !== id); saveDemo(); return; }
      if (f && f.file_url) await client.storage.from('files').remove([f.file_url]);
      const { error } = await client.from('files').delete().eq('id', id);
      if (error) throw error;
      cache.files = cache.files.filter(x => x.id !== id);
    },
    // 生成可下载 URL（live 模式用签名 URL；demo 模式返回 null）
    async url(file) {
      if (!file.file_url) return null;
      if (isDemo()) return null;
      const { data, error } = await client.storage.from('files').createSignedUrl(file.file_url, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    // 已使用的标签合集（用于筛选）
    allTags: function () {
      const set = new Set();
      cache.files.forEach(f => utils.tags(f.tags).forEach(t => set.add(t)));
      return Array.from(set).sort();
    },
    // 出现的年份（用于筛选）
    years: function () {
      const set = new Set();
      cache.files.forEach(f => { if (f.uploaded_at) set.add(String(f.uploaded_at).slice(0, 4)); });
      return Array.from(set).sort().reverse();
    },
    // 出现的文件类型（用于筛选）
    types: function () {
      const set = new Set();
      cache.files.forEach(f => { if (f.file_type) set.add(f.file_type); });
      return Array.from(set).sort();
    },
  };

  // =====================================================================
  // 能力证据
  // =====================================================================
  const evidence = {
    list: function (filters) {
      filters = filters || {};
      let list = cache.evidence.filter(e => e.confirmed !== false);
      if (filters.skill) list = list.filter(e => e.skill_id === filters.skill);
      if (filters.project) list = list.filter(e => e.project_id === filters.project);
      return list;
    },
    add: async function (data) {
      const row = Object.assign({ evidence_description: '', evidence_date: utils.today(), ai_suggested: false }, data, { confirmed: true });
      if (isDemo()) {
        const e = Object.assign({ id: utils.uid(), user_id: cache.user.id, created_at: now() }, row); cache.evidence.push(e); saveDemo(); return e;
      }
      const { data: d, error } = await client.from('skill_evidence').insert(Object.assign({}, row, { user_id: cache.user.id })).select().single();
      if (error) throw error; cache.evidence.push(d); return d;
    },
    remove: async function (id) {
      if (isDemo()) { cache.evidence = cache.evidence.filter(e => e.id !== id); saveDemo(); return; }
      const { error } = await client.from('skill_evidence').delete().eq('id', id);
      if (error) throw error; cache.evidence = cache.evidence.filter(e => e.id !== id);
    },
    // 某能力的全部证据，按年份分组
    groupedByYear: function (skillId) {
      const list = evidence.list({ skill: skillId }).sort((a, b) => (b.evidence_date || '').localeCompare(a.evidence_date || ''));
      const groups = {};
      list.forEach(e => {
        const y = String(e.evidence_date || '').slice(0, 4) || '未标注';
        (groups[y] = groups[y] || []).push(e);
      });
      return groups;
    },
  };

  // =====================================================================
  // 能力领域
  // =====================================================================
  const skillsView = {
    // 六大领域概览（含证据数）
    categories: function () {
      return window.CATEGORIES.map(cat => {
        const list = cache.skills.filter(s => s.category === cat.key);
        const total = list.reduce((sum, s) => sum + effectiveCount(s.id), 0);
        return { key: cat.key, icon: cat.icon, total: total, skills: list };
      });
    },
    // 领域内每项能力详情
    categoryDetail: function (catKey) {
      const cat = window.CATEGORIES.find(c => c.key === catKey);
      const list = cache.skills.filter(s => s.category === catKey);
      return {
        key: catKey, icon: cat.icon, skills: list.map(s => ({
          skill: s,
          count: effectiveCount(s.id),
          level: window.skillLevel(effectiveCount(s.id)),
        })),
      };
    },
    // 单一能力详情
    skillDetail: function (skillId) {
      const s = skillById(skillId);
      const count = effectiveCount(skillId);
      return { skill: s, count: count, level: window.skillLevel(count), groups: evidence.groupedByYear(skillId) };
    },
  };

  // =====================================================================
  // 成就
  // =====================================================================
  const achievements = {
    list: function () {
      return cache.achievements.map(a => {
        const ua = cache.userAchievements.find(x => x.achievement_id === a.id);
        return Object.assign({}, a, {
          unlocked: !!ua,
          unlocked_at: ua ? ua.unlocked_at : null,
          related_project_id: ua ? ua.related_project_id : null,
        });
      });
    },
  };

  // =====================================================================
  // 时间轴
  // =====================================================================
  const timeline = {
    list: function (filters) {
      filters = filters || {};
      let list = cache.projects.slice();
      if (filters.year && filters.year !== '全部') list = list.filter(p => String(p.start_date || '').startsWith(filters.year));
      if (filters.type && filters.type !== '全部') list = list.filter(p => p.project_type === filters.type);
      if (filters.skill) list = list.filter(p => cache.evidence.some(e => e.project_id === p.id && e.skill_id === filters.skill && e.confirmed !== false));
      list = list.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));
      const groups = {};
      list.forEach(p => {
        const y = String(p.start_date || '').slice(0, 4) || '未标注';
        (groups[y] = groups[y] || []).push(p);
      });
      return groups;
    },
    years: function () {
      const set = new Set();
      cache.projects.forEach(p => { if (p.start_date) set.add(String(p.start_date).slice(0, 4)); });
      return Array.from(set).sort().reverse();
    },
  };

  // =====================================================================
  // 搜索（跨 项目 / 文件 / 能力证据）
  // =====================================================================
  function search(q) {
    if (!q) return { projects: [], files: [], evidence: [] };
    const lq = q.toLowerCase();
    const hit = s => String(s || '').toLowerCase().includes(lq);
    return {
      projects: cache.projects.filter(p => hit(p.name) || hit(p.description) || utils.tags(p.tags).some(hit)),
      files: cache.files.filter(f => hit(f.file_name) || hit(f.description) || utils.tags(f.tags).some(hit)),
      evidence: cache.evidence.filter(e => hit(e.source) || hit(e.evidence_description)),
    };
  }

  // =====================================================================
  // 统计 / 最近成长
  // =====================================================================
  function stats() {
    const evCount = cache.evidence.filter(e => e.confirmed !== false).length;
    return {
      projects: cache.projects.length,
      files: cache.files.length,
      evidence: evCount,
      achievements: cache.userAchievements.length,
    };
  }

  // 档案库容量统计（文件体积 + 分类）
  function storageStats() {
    const quota = window.STORAGE_QUOTA_BYTES || 1073741824;
    const largeTh = window.LARGE_FILE_BYTES || 20971520;
    let usedBytes = 0, core = 0, regular = 0, large = 0;
    cache.files.forEach(f => {
      const size = f.file_size || 0;
      usedBytes += size;
      if (size >= largeTh) large++;
      if (f.importance === '重要' || f.importance === '非常重要') core++;
      else regular++;
    });
    return {
      usedBytes,
      quotaBytes: quota,
      percent: quota ? Math.min(100, (usedBytes / quota) * 100) : 0,
      totalFiles: cache.files.length,
      coreFiles: core,
      regularFiles: regular,
      largeFiles: large,
    };
  }

  function recentActivity(n) {
    const items = [];
    cache.projects.forEach(p => items.push({ type: 'project', icon: '📁', title: p.name, time: p.created_at, id: p.id }));
    cache.files.forEach(f => items.push({ type: 'file', icon: utils.fileIcon(f.file_name), title: f.file_name, time: f.uploaded_at, id: f.id }));
    cache.evidence.forEach(e => {
      const s = skillById(e.skill_id);
      items.push({ type: 'evidence', icon: s ? s.icon : '⭐', title: (e.source || '') + ' · ' + (s ? s.name : ''), time: e.created_at, id: e.id });
    });
    cache.userAchievements.forEach(ua => {
      const a = achievementById(ua.achievement_id);
      items.push({ type: 'achievement', icon: a ? a.icon : '🏆', title: (a ? a.name : ''), time: ua.unlocked_at, id: ua.id });
    });
    items.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    return items.slice(0, n || 8);
  }

  // =====================================================================
  // AI 分析结果
  // =====================================================================
  const ai = {
    list: () => cache.aiAnalysis,
    forFile: fileId => cache.aiAnalysis.filter(a => a.file_id === fileId),
    save: async function (data) {
      if (isDemo()) {
        const r = Object.assign({ id: utils.uid(), user_id: cache.user.id, created_at: now() }, data);
        cache.aiAnalysis.unshift(r); saveDemo(); return r;
      }
      const { data: d, error } = await client.from('ai_analysis').insert(Object.assign({}, data, { user_id: cache.user.id })).select().single();
      if (error) throw error;
      cache.aiAnalysis.unshift(d); return d;
    },
  };

  // =====================================================================
  // 每日日记
  // =====================================================================
  const diary = {
    list: () => cache.diary.slice().sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || '')),
    getByDate: d => cache.diary.find(x => x.entry_date === d),
    // 保存（按日期 upsert）
    save: async function (data) {
      // data: { entry_date, content, analysis }
      const existing = cache.diary.find(x => x.entry_date === data.entry_date);
      if (isDemo()) {
        if (existing) { Object.assign(existing, data, { updated_at: now() }); }
        else { cache.diary.unshift(Object.assign({ id: utils.uid(), user_id: cache.user.id, created_at: now(), updated_at: now() }, data)); }
        saveDemo();
        return existing || cache.diary[0];
      }
      if (existing) {
        const { data: d, error } = await client.from('diary_entries').update(data).eq('id', existing.id).select().single();
        if (error) throw error;
        Object.assign(existing, d);
        return existing;
      }
      const { data: d, error } = await client.from('diary_entries').insert(Object.assign({}, data, { user_id: cache.user.id })).select().single();
      if (error) throw error;
      cache.diary.unshift(d);
      return d;
    },
    remove: async function (id) {
      if (isDemo()) { cache.diary = cache.diary.filter(x => x.id !== id); saveDemo(); return; }
      const { error } = await client.from('diary_entries').delete().eq('id', id);
      if (error) throw error;
      cache.diary = cache.diary.filter(x => x.id !== id);
    },
    // 性格画像：聚合所有已分析日记
    profile: function () {
      const ocean = ['开放性', '尽责性', '外向性', '宜人性', '情绪稳定性'].map(trait => {
        const levels = {};
        cache.diary.forEach(d => {
          const a = d.analysis;
          if (!a || !Array.isArray(a.ocean)) return;
          const item = a.ocean.find(o => o.trait === trait);
          if (item && item.level && item.level !== '待观察') {
            levels[item.level] = (levels[item.level] || 0) + 1;
          }
        });
        let dominant = null, max = 0;
        Object.keys(levels).forEach(k => { if (levels[k] > max) { max = levels[k]; dominant = k; } });
        return { trait, levels, dominant, count: Object.values(levels).reduce((s, v) => s + v, 0) };
      });
      const strengths = {};
      cache.diary.forEach(d => {
        const a = d.analysis;
        if (a && Array.isArray(a.strengths)) {
          a.strengths.forEach(s => { strengths[s] = (strengths[s] || 0) + 1; });
        }
      });
      const strengthsList = Object.keys(strengths).map(k => ({ name: k, count: strengths[k] })).sort((a, b) => b.count - a.count);
      const analyzedCount = cache.diary.filter(d => d.analysis).length;
      return { ocean, strengths: strengthsList, analyzedCount, total: cache.diary.length };
    },
  };

  // =====================================================================
  // 导出
  // =====================================================================
  return {
    mode: () => mode,
    isDemo,
    init, signIn, signUp, signOut, updateProfile,
    user,
    skills, skillById, projectById, achievementById,
    effectiveCount,
    projects, roles, contributions, reflections,
    files, evidence, skillsView, achievements, timeline,
    ai, diary,
    search, stats, storageStats, recentActivity,
    // 供调试 / 重置演示数据
    _resetDemo: function () { localStorage.removeItem(LS_KEY); loadDemo(); },
  };
})();
