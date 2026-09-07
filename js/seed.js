/* =====================================================================
 * seed.js — 演示数据（Demo Data）
 *
 * 仅在「演示模式」下使用（未配置 Supabase 或未登录时）。
 * 数据保存在 localStorage，可交互增删改，刷新后保留。
 * 与真实 Supabase 数据完全隔离，字段结构与数据库一致。
 * ===================================================================== */

window.SEED = (function () {
  // ---- 演示用户 ----
  const demoUser = { id: 'demo-user-1', email: 'liyang@example.com', display_name: '李杨', bio: '博物馆讲解员 · 记录成长', phone: '138-0000-0000', city: '成都', job_title: '讲解员 / 内容策划' };

  // ---- 技能库（与 schema.sql 种子一致，30 项）----
  const skills = [
    ['信息检索','思考与学习','🧠'],['研究分析','思考与学习','🧠'],['批判性思维','思考与学习','🧠'],['问题解决','思考与学习','🧠'],['学习能力','思考与学习','🧠'],
    ['口头表达','表达与沟通','🎤'],['写作能力','表达与沟通','🎤'],['公众演讲','表达与沟通','🎤'],['跨文化沟通','表达与沟通','🎤'],['故事叙述','表达与沟通','🎤'],
    ['内容创作','创意与内容','🎨'],['创意策划','创意与内容','🎨'],['视觉表达','创意与内容','🎨'],['叙事设计','创意与内容','🎨'],['活动设计','创意与内容','🎨'],
    ['项目管理','项目与职业','💼'],['组织协调','项目与职业','💼'],['时间管理','项目与职业','💼'],['资源整合','项目与职业','💼'],['执行能力','项目与职业','💼'],
    ['AI工具使用','数字与技术','💻'],['数据处理','数字与技术','💻'],['编程能力','数字与技术','💻'],['数字内容管理','数字与技术','💻'],['信息安全意识','数字与技术','💻'],
    ['自我管理','自我发展','🌱'],['适应能力','自我发展','🌱'],['团队协作','自我发展','🌱'],['领导与影响','自我发展','🌱'],['职业探索','自我发展','🌱'],
  ].map((s, i) => ({ id: 'skill-' + (i + 1), name: s[0], category: s[1], icon: s[2], sort_order: i % 5 + 1 }));

  // ---- 成就定义（与 schema.sql 种子一致，12 项）----
  const achievements = [
    ['第一次登台','完成第一次正式公开表达。','表达','🎤','{"type":"evidence_skill","skills":["口头表达","公众演讲"]}'],
    ['舞台成长','参加正式比赛或展示活动。','表达','🎤','{"type":"project_type","types":["比赛"]}'],
    ['故事讲述者','独立完成 10 篇讲解稿。','表达','🎤','{"type":"contribution_keyword","keywords":["讲解稿","讲稿","讲解词","文案"],"count":10}'],
    ['百场讲解员','累计完成 100 次讲解。','表达','🎤','{"type":"contribution_keyword","keywords":["讲解"],"count":100}'],
    ['第一次研究','完成第一次系统资料研究。','学习','📚','{"type":"evidence_skill","skills":["信息检索","研究分析"]}'],
    ['资料猎人','归档大量资料。','学习','📚','{"type":"file_count","count":30}'],
    ['知识建筑师','建立个人知识档案系统。','学习','📚','{"type":"project_and_evidence"}'],
    ['Hello World','完成第一个网页项目。','数字','💻','{"type":"project_evidence_skill","skills":["编程能力"],"count":1}'],
    ['Builder','独立完成两个完整数字项目。','数字','💻','{"type":"project_evidence_skill","skills":["编程能力"],"count":2}'],
    ['Digital Architect','建立完整个人数字系统。','数字','💻','{"type":"project_evidence_skill","skills":["编程能力","AI工具使用","数字内容管理"],"count":3}'],
    ['第一篇日记分析','完成第一次 AI 日记分析。','成长','📔','{"type":"diary_analyzed","count":1}'],
    ['持续记录者','坚持写日记。','成长','📔','{"type":"diary_count","count":7}'],
  ].map((a, i) => ({ id: 'ach-' + (i + 1), name: a[0], description: a[1], category: a[2], icon: a[3], rule: a[4], unlock_condition: '', sort_order: i % 4 + 1 }));

  // ---- 项目 ----
  const projects = [
    {
      id: 'p1', name: '全国高校大学生场馆讲解风采展示', project_type: '比赛', status: '进行中',
      start_date: '2026-08-01', end_date: null,       tags: ['讲解', '比赛', '历史', '表达'],
      outcomes: ['最终讲解稿', '比赛展示 PPT', '获奖证书'],
      description: '参加全国高校场馆讲解风采展示，围绕成都市旅游景区讲解展开，完成资料研究、讲解稿撰写与现场展示。',
      reflection: '这是第一次正式参加全国性的讲解比赛，最大的收获是敢于站上台。',
      created_at: '2026-08-01', updated_at: '2026-08-20',
    },
    {
      id: 'p2', name: '博物馆讲解工作', project_type: '工作', status: '进行中',
      start_date: '2026-03-01', end_date: null, tags: ['讲解', '博物馆', '工作'],
      description: '在博物馆担任讲解员，负责日常讲解、游客互动与讲解内容维护。',
      reflection: '', created_at: '2026-03-01', updated_at: '2026-08-15',
    },
    {
      id: 'p3', name: '个人数字档案馆', project_type: '项目', status: '进行中',
      start_date: '2026-09-07', end_date: null, tags: ['网站', '个人成长', '数字化', 'AI'],
      outcomes: ['完整可用的网站', 'AI 文件/日记分析', '简历导出', '数据库设计'],
      description: '独立设计并开发「人生档案馆」个人成长网站：用「证据驱动成长」的方式记录项目、文件、能力证据与日记，接入 AI 分析，支持能力地图、时间轴、成就与简历导出。技术栈 HTML/CSS/原生 JS + Supabase，部署于 GitHub Pages。',
      reflection: '从 0 到 1 独立完成一个全栈网站，理解了证据驱动的产品设计理念。',
      created_at: '2026-09-07', updated_at: '2026-09-07',
    },
    {
      id: 'p4', name: '永乐宫夜游活动', project_type: '活动', status: '已完成',
      start_date: '2026-07-01', end_date: '2026-07-31', tags: ['活动', '讲解', '夜游'],
      description: '参与永乐宫夜游活动讲解工作，面向游客讲述壁画与建筑背后的历史。',
      reflection: '夜间讲解氛围不同，学会了如何用灯光和节奏调动观众注意力。',
      created_at: '2026-07-01', updated_at: '2026-07-31',
    },
    {
      id: 'p5', name: '博物馆统计网站', project_type: '项目', status: '已完成',
      start_date: '2026-06-01', end_date: '2026-06-30', tags: ['网站', '数据', '编程'], outcomes: ['统计网站', '上线截图'],
      description: '完成博物馆游客数据统计网站，用于统计与分析游客流量。',
      reflection: '第一次独立做完整网站，学会了数据库和前端联动。',
      created_at: '2026-06-01', updated_at: '2026-06-30',
    },
    {
      id: 'p6', name: '博物馆夫子讲堂', project_type: '活动', status: '已完成',
      start_date: '2026-05-01', end_date: '2026-05-15', tags: ['讲堂', '讲解', '历史'],
      description: '参与夫子讲堂活动，担任主讲人讲解历史文化主题。',
      reflection: '', created_at: '2026-05-01', updated_at: '2026-05-15',
    },
  ];

  // ---- 角色 ----
  const roles = [
    { id: 'r1', project_id: 'p1', role_name: '讲解员' },
    { id: 'r2', project_id: 'p1', role_name: '研究者' },
    { id: 'r3', project_id: 'p1', role_name: '文案创作者' },
    { id: 'r4', project_id: 'p2', role_name: '讲解员' },
    { id: 'r5', project_id: 'p3', role_name: '策划者' },
    { id: 'r6', project_id: 'p3', role_name: '开发者' },
    { id: 'r9', project_id: 'p3', role_name: '产品经理' },
    { id: 'r10', project_id: 'p3', role_name: 'UI设计师' },
    { id: 'r7', project_id: 'p4', role_name: '讲解员' },
    { id: 'r8', project_id: 'p6', role_name: '主讲人' },
  ];

  // ---- 贡献 ----
  const contributions = [
    { id: 'c1', project_id: 'p1', description: '查阅历史资料' },
    { id: 'c2', project_id: 'p1', description: '撰写讲解稿' },
    { id: 'c3', project_id: 'p1', description: '修改讲解结构' },
    { id: 'c4', project_id: 'p1', description: '现场展示' },
    { id: 'c5', project_id: 'p1', description: '设计互动环节' },
    { id: 'c6', project_id: 'p2', description: '完成正式讲解' },
    { id: 'c7', project_id: 'p4', description: '夜间专场讲解' },
    { id: 'c8', project_id: 'p5', description: '设计并开发统计网站' },
    { id: 'c9', project_id: 'p6', description: '主讲历史文化主题' },
    { id: 'c10', project_id: 'p3', description: '设计网站结构与数据库' },
    { id: 'c11', project_id: 'p3', description: '产品定位与需求梳理' },
    { id: 'c12', project_id: 'p3', description: '编写前端（HTML/CSS/JS 模块化）' },
    { id: 'c13', project_id: 'p3', description: '实现 AI 分析（接入 DeepSeek）' },
    { id: 'c14', project_id: 'p3', description: '设计 UI/UX' },
    { id: 'c15', project_id: 'p3', description: '部署到 GitHub Pages' },
  ];

  // ---- 文件 ----
  const files = [
    { id: 'f1', project_id: 'p1', file_name: '展都市圈魅力画卷赛务手册.pdf', file_type: 'pdf', file_size: 9801585, description: '大赛赛务手册', importance: '重要', tags: ['手册', '比赛'], uploaded_at: '2026-08-01' },
    { id: 'f2', project_id: 'p1', file_name: '讲解稿.docx', file_type: 'docx', file_size: 13685, description: '参赛讲解稿终稿', importance: '非常重要', tags: ['讲解稿', '文案'], uploaded_at: '2026-08-05' },
    { id: 'f3', project_id: 'p1', file_name: '首途-李杨-A006.pptx', file_type: 'pptx', file_size: 1337541, description: '比赛展示 PPT', importance: '重要', tags: ['PPT', '展示'], uploaded_at: '2026-08-10' },
    { id: 'f4', project_id: 'p4', file_name: '永乐宫讲解提纲.md', file_type: 'md', file_size: 2048, description: '夜游讲解提纲', importance: '普通', tags: ['提纲'], uploaded_at: '2026-07-10' },
    { id: 'f5', project_id: 'p5', file_name: '统计网站截图.png', file_type: 'png', file_size: 512000, description: '网站上线截图', importance: '普通', tags: ['截图'], uploaded_at: '2026-06-28' },
    { id: 'f6', project_id: null, file_name: '讲解技巧笔记.txt', file_type: 'txt', file_size: 1024, description: '日常讲解心得', importance: '普通', tags: ['笔记'], uploaded_at: '2026-08-18' },
  ];

  // ---- 能力证据（与贡献/项目/能力关联）----
  const evidence = [
    { id: 'e1', skill_id: 'skill-1', project_id: 'p1', contribution_id: 'c1', evidence_description: '查阅历史资料', evidence_date: '2026-08-01', source: '全国高校大学生场馆讲解风采展示' },
    { id: 'e2', skill_id: 'skill-2', project_id: 'p1', contribution_id: 'c1', evidence_description: '分析并整理资料', evidence_date: '2026-08-02', source: '全国高校大学生场馆讲解风采展示' },
    { id: 'e3', skill_id: 'skill-7', project_id: 'p1', contribution_id: 'c2', evidence_description: '撰写讲解稿', evidence_date: '2026-08-03', source: '全国高校大学生场馆讲解风采展示' },
    { id: 'e4', skill_id: 'skill-10', project_id: 'p1', contribution_id: 'c2', evidence_description: '设计讲解叙事结构', evidence_date: '2026-08-04', source: '全国高校大学生场馆讲解风采展示' },
    { id: 'e5', skill_id: 'skill-8', project_id: 'p1', contribution_id: 'c4', evidence_description: '现场展示讲解', evidence_date: '2026-08-20', source: '全国高校大学生场馆讲解风采展示' },
    { id: 'e6', skill_id: 'skill-6', project_id: 'p2', contribution_id: 'c6', evidence_description: '完成正式讲解', evidence_date: '2026-03-15', source: '博物馆讲解工作' },
    { id: 'e7', skill_id: 'skill-8', project_id: 'p2', contribution_id: 'c6', evidence_description: '面向游客公开讲解', evidence_date: '2026-04-10', source: '博物馆讲解工作' },
    { id: 'e8', skill_id: 'skill-8', project_id: 'p4', contribution_id: 'c7', evidence_description: '夜间专场讲解', evidence_date: '2026-07-20', source: '永乐宫夜游活动' },
    { id: 'e9', skill_id: 'skill-23', project_id: 'p5', contribution_id: 'c8', evidence_description: '开发统计网站', evidence_date: '2026-06-15', source: '博物馆统计网站' },
    { id: 'e10', skill_id: 'skill-8', project_id: 'p6', contribution_id: 'c9', evidence_description: '主讲历史文化主题', evidence_date: '2026-05-10', source: '博物馆夫子讲堂' },
    { id: 'e11', skill_id: 'skill-6', project_id: 'p4', contribution_id: 'c7', evidence_description: '向游客口头讲解', evidence_date: '2026-07-20', source: '永乐宫夜游活动' },
    { id: 'e12', skill_id: 'skill-16', project_id: 'p3', contribution_id: 'c10', evidence_description: '设计项目结构与数据库', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e13', skill_id: 'skill-7', project_id: 'p2', contribution_id: 'c6', evidence_description: '撰写讲解词', evidence_date: '2026-05-05', source: '博物馆讲解工作' },
    { id: 'e14', skill_id: 'skill-23', project_id: 'p3', contribution_id: 'c12', evidence_description: '独立开发完整网站（前端+后端+部署）', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e15', skill_id: 'skill-21', project_id: 'p3', contribution_id: 'c13', evidence_description: '接入并实现 AI 文件分析与日记分析', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e16', skill_id: 'skill-22', project_id: 'p3', contribution_id: 'c10', evidence_description: '设计数据库结构与权限模型', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e17', skill_id: 'skill-24', project_id: 'p3', contribution_id: 'c15', evidence_description: '搭建个人数字档案系统并上线', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e18', skill_id: 'skill-13', project_id: 'p3', contribution_id: 'c14', evidence_description: '设计网站 UI 与视觉风格', evidence_date: '2026-09-07', source: '个人数字档案馆' },
  ];

  // ---- 反思 ----
  const reflections = [
    { id: 'rf1', project_id: 'p1', learned: '敢于在更大的舞台表达。', difficulty: '讲解稿的记忆与临场发挥。', improvement: '增加模拟演练的次数。', created_at: '2026-08-20' },
    { id: 'rf2', project_id: 'p4', learned: '如何用节奏调动观众注意力。', difficulty: '夜间光线与声音条件。', improvement: '准备更便携的扩音设备。', created_at: '2026-07-31' },
    { id: 'rf3', project_id: 'p3', learned: '从 0 到 1 独立完成一个全栈网站，理解了「证据驱动成长」的产品设计理念。', difficulty: '调试 Supabase 权限（RLS/GRANT）、AI 接入时的返回格式问题。', improvement: '后续加入更多简历模板、年度成长报告、数据备份导出。', created_at: '2026-09-07' },
  ];

  // ---- 已解锁成就 ----
  const userAchievements = [
    { id: 'ua1', achievement_id: 'ach-1', related_project_id: 'p1', unlocked_at: '2026-08-20' },
    { id: 'ua2', achievement_id: 'ach-2', related_project_id: 'p1', unlocked_at: '2026-08-20' },
    { id: 'ua3', achievement_id: 'ach-5', related_project_id: 'p1', unlocked_at: '2026-08-02' },
    { id: 'ua4', achievement_id: 'ach-8', related_project_id: 'p5', unlocked_at: '2026-06-28' },
    { id: 'ua5', achievement_id: 'ach-9', related_project_id: 'p5', unlocked_at: '2026-06-30' },
  ];

  // ---- 日记 ----
  const diary = [
    {
      id: 'd1', entry_date: '2026-09-06',
      content: '今天第一次给游客做完整讲解，刚开始有点紧张，讲到第三个部分就放开了。结束有游客说讲得很清楚，挺开心的。还是觉得开头那段不够熟，下次再练练。',
      analysis: {
        summary: '第一次独立讲解，从紧张到投入，获得正向反馈。',
        ocean: [
          { trait: '开放性', level: '中', evidence: '愿意尝试新的讲解任务' },
          { trait: '尽责性', level: '高', evidence: '提前准备讲解内容并反思不足' },
          { trait: '外向性', level: '中', evidence: '能面向游客表达，但开始会紧张' },
          { trait: '宜人性', level: '待观察', evidence: '证据不足' },
          { trait: '情绪稳定性', level: '中', evidence: '能自我调节紧张情绪' },
        ],
        strengths: ['毅力', '好奇'],
        improved: '公众表达',
        improved_domain: '表达与沟通',
        strengthen: '开头部分的口头表达熟练度',
        advice: '把开场白单独拆出来，每天对着镜子练 3 遍。',
      },
      created_at: '2026-09-06', updated_at: '2026-09-06',
    },
  ];

  // 初始数据快照（用于重置）
  const initial = {
    user: demoUser,
    skills, achievements, projects, roles, contributions, files,
    evidence, reflections, userAchievements, diary, resumes: [],
  };

  return { initial: initial, user: demoUser };
})();
