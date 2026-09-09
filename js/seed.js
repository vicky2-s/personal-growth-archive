/* =====================================================================
 * seed.js — 演示数据（Demo Data）
 *
 * 仅在「演示模式」下使用（未配置 Supabase 或未登录时）。
 * 数据保存在 localStorage，可交互增删改，刷新后保留。
 * 与真实 Supabase 数据完全隔离，字段结构与数据库一致。
 * ===================================================================== */

window.SEED = (function () {
  // ---- 演示用户 ----
  const demoUser = { id: 'demo-user-1', email: '2052710271@qq.com', display_name: '李杨', bio: '博物馆讲解员 · 记录成长', phone: '15680821489', city: '成都', job_title: '讲解员 / 内容策划' };

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
      id: 'p17', name: '成都博物馆《观妙入真——永乐宫的建筑艺术与传承》特展讲解', project_type: '工作', status: '进行中',
      start_date: '2026-07-06', end_date: '2026-12-06', tags: ['博物馆', '特展讲解', '永乐宫', '古建筑'],
      outcomes: [],
      description: '参与成都博物馆特展《观妙入真——永乐宫的建筑艺术与传承》现场讲解服务，负责面向散客及团体观众开展展览讲解，讲解内容涵盖永乐宫历史、建筑营造、元代建筑艺术、斗拱演变、壁画艺术与道教文化；同时参与讲解服务介绍推广、设备管理与团体接待。讲解统计（场次、人次等）待工作结束后补充。',
      reflection: '第一段专业博物馆特展职业讲解经历，对知识储备、体力、声音控制与现场应变的要求远高于校园讲解，正在持续优化讲解词与互动方式。',
      created_at: '2026-07-06', updated_at: '2026-09-06',
    },
    {
      id: 'p1', name: '2026年成都市旅游景区讲解员大赛（优秀奖）', project_type: '比赛', status: '已完成',
      start_date: '2026-08-01', end_date: null,       tags: ['讲解', '比赛', '景区', '表达'],
      outcomes: ['优秀奖', '最终讲解稿', '比赛展示 PPT'],
      description: '参加「展都市圈魅力画卷 彰显景区讲解风范」成都市旅游景区讲解员大赛，独立完成内容策划、讲解词撰写与打磨、现场展示，获优秀奖。比赛正式名称、主办单位及级别以获奖证书为准。',
      reflection: '敢于在更大的舞台表达，比赛经历是个人讲解能力的展示成果。',
      created_at: '2026-08-01', updated_at: '2026-08-20',
    },
    {
      id: 'p3', name: '个人职业经历数据库网站（人生档案馆）', project_type: '项目', status: '进行中',
      start_date: '2026-09-07', end_date: null, tags: ['网站', '知识管理', '数字化', 'AI'],
      outcomes: ['完整可用的网站', 'AI 文件/日记分析', '简历导出', '数据库设计'],
      description: '针对个人经历分散、简历版本混乱的问题，主动设计并开发个人职业经历数据库网站：统一管理教育、工作、校园、项目、科研、荣誉、技能与量化成果，接入 AI 读取岗位需求并自动筛选相关经历生成针对性简历。技术栈 HTML/CSS/原生 JS + Supabase，部署于 GitHub Pages。',
      reflection: '从 0 到 1 独立完成一个全栈网站，理解了「经历数据库 → AI 筛选 → 生成简历」的产品设计理念。',
      created_at: '2026-09-07', updated_at: '2026-09-07',
    },
    {
      id: 'p18', name: '博物馆讲解服务数据管理系统', project_type: '项目', status: '进行中',
      start_date: '2026-06-01', end_date: null, tags: ['网站', '数据管理', '工作流数字化', 'AI辅助开发'],
      outcomes: ['在线数据管理网站', '多人数据同步', '收入/提成自动计算', '数据图表可视化'],
      description: '博物馆讲解团队日常需统计值班人员、讲解场次、接待人数、售票数量、收入与提成分配，传统人工统计繁琐且历史数据难查询。主动提出并搭建在线数据管理网站：使用 HTML/CSS/JavaScript + Supabase 实现多人数据同步，使用 Chart.js 实现数据可视化，已实现值班管理、场次记录、收入与提成自动计算，部分功能持续规划迭代中。',
      reflection: '从真实工作问题出发（人工统计 → 在线记录 → 自动计算 → 可视化），探索用数字化工具优化小型团队日常数据管理。',
      created_at: '2026-06-01', updated_at: '2026-09-06',
    },
    {
      id: 'p19', name: '西南交大校史馆讲解知识库网站', project_type: '项目', status: '进行中',
      start_date: '2026-08-01', end_date: null, tags: ['网站', '知识管理', '校史', '数字化培训'],
      outcomes: [],
      description: '校史馆讲解团长期积累大量讲解词、人物资料、建筑资料与图片资料，Word 文档查找困难、内容分散、新讲解员学习效率低。正在搭建线上校史讲解知识库：规划校史时间线、展厅分类、完整讲解词、重点人物与建筑、搜索功能，将讲解内容数字化、结构化，服务新讲解员培训与内容更新。',
      reflection: '将个人讲解经验和校史资料数字化沉淀，探索「文化传播 + 知识管理 + 数字化工具」的结合。',
      created_at: '2026-08-01', updated_at: '2026-09-06',
    },
    {
      id: 'p20', name: '赴上海寻访杨杏佛烈士主题社会实践', project_type: '活动', status: '已完成',
      start_date: '2026-08-01', end_date: '2026-08-03', tags: ['社会实践', '校史研究', '红色文化', '寻访'],
      outcomes: ['现场照片资料', '视频资料', '文字记录', '社会实践报告'],
      description: '担任西南交通大学档案馆（校史馆）赴上海寻访杨杏佛烈士主题实践队队长，带领4名队员完成3天上海实地寻访（主题“学英雄 学模范——寻访交大英烈”）：实地走访杨杏佛故居、后期居所、遇害地，参观上海铁路博物馆与宋庆龄陵园，完成现场讲解、影像采集与史料核对，为校史馆英烈主题讲解积累一手资料。',
      reflection: '档案提供事实依据、遗迹提供空间感受、纪念场所提供传播平台，三者结合才能完整理解历史人物。',
      created_at: '2026-08-03', updated_at: '2026-08-05',
    },
    {
      id: 'p14', name: '校级SRTP科研项目（三星堆文化法语译介）', project_type: '项目', status: '已完成',
      start_date: '2025-05-01', end_date: '2026-05-31', tags: ['科研', '法语', '三星堆', '跨文化传播'],
      outcomes: ['项目已结项', '独立完成中期与结项两次关键答辩'],
      description: '课题《法语翻译导游视阈下三星堆文化在法语世界的译介与传播》，核心成员兼主要答辩人。部分成员赴法交流期间，独立承担项目中期答辩与结项答辩，向评审组展示研究逻辑、阶段性成果与创新点。',
      reflection: '独立承担关键答辩锻炼了科研表达与临场应对能力。',
      created_at: '2025-05-01', updated_at: '2026-05-31',
    },
    {
      id: 'p10', name: '作业帮教育科技（成都）·助教', project_type: '工作', status: '已完成',
      start_date: '2025-09-01', end_date: '2026-02-28', tags: ['助教', '教学辅助', '社群运营'],
      outcomes: ['授课250+小时', '辅导学生1000+人次', '6条优化建议被采纳'],
      description: '负责线下班级教学辅助与学生服务：作业批改、学情分析、错题整理、一对一复习辅导、学习社群维护与课后教学复盘。每周跟班3–4个班级，维护10+个学习社群（覆盖200+学生）。',
      reflection: '把学生共性问题反馈主讲教师并推动教学调整，理解了教学服务闭环。',
      created_at: '2025-09-01', updated_at: '2026-02-28',
    },
    {
      id: 'p15', name: '雨花敬老院志愿服务', project_type: '活动', status: '已完成',
      start_date: '2025-08-01', end_date: '2025-08-31', tags: ['志愿服务', '敬老'],
      outcomes: [],
      description: '参与雨花敬老院“无条件敬老”志愿服务，负责长者礼仪接待、用餐秩序维护与协助老人就餐。',
      reflection: '',
      created_at: '2025-08-01', updated_at: '2025-08-31',
    },
    {
      id: 'p9', name: 'TLScontact中智签证·法国签证专员', project_type: '工作', status: '已完成',
      start_date: '2025-07-01', end_date: '2025-09-30', tags: ['签证', '法语', '审核', '涉外'],
      outcomes: ['审核1200+份签证材料', '完成2000+份签证贴附', '零操作失误'],
      description: '参与法国申根签证申请全流程：签证材料审核、法语原始文件处理、信息核对、生物信息采集、系统录入与签证制作贴附，熟悉法国使领馆签证规范及标准化业务流程。',
      reflection: '高重复性涉外工作锻炼了细节管理与高准确率执行。',
      created_at: '2025-07-01', updated_at: '2025-09-30',
    },
    {
      id: 'p7', name: '西南交大校史馆讲解团', project_type: '工作', status: '进行中',
      start_date: '2024-10-01', end_date: null, tags: ['讲解', '团队管理', '培训', '接待'],
      outcomes: ['累计讲解50+场', '服务观众800+人次', '培训新讲解员20+人'],
      description: '担任西南交通大学校史馆讲解团团长，负责讲解团日常运营与管理：校史讲解接待、新讲解员培训、团队排班与考核、讲解词修订及展陈路线优化。曾为院士、校长、校党委书记及政府来访人员提供专场讲解。',
      reflection: '从讲解员到团队管理者，学会了用制度（排班、考核）保障接待质量。',
      created_at: '2024-10-01', updated_at: '2026-09-06',
    },
    {
      id: 'p16', name: '暑期三下乡养老院志愿服务', project_type: '活动', status: '已完成',
      start_date: '2024-09-01', end_date: '2024-09-02', tags: ['志愿服务', '三下乡', '敬老'],
      outcomes: [],
      description: '前往养老院开展为期 2 天的慰问服务，组织并参与唱歌、舞蹈表演、漆扇制作与陪伴聊天，在手工环节协助行动不便的老人完成漆扇制作。',
      reflection: '',
      created_at: '2024-09-01', updated_at: '2024-09-02',
    },
    {
      id: 'p8', name: '西南交大体育健康超市·太极助教', project_type: '工作', status: '已完成',
      start_date: '2024-06-01', end_date: '2025-09-30', tags: ['教学', '太极', '助教', '带队'],
      outcomes: ['累计教学3000+人次', '校级优秀助教', '带队连续两年获校级太极比赛团体第一名'],
      description: '连续三个学期担任太极拳课程助教，协助课程教学、系统教授24式简化太极拳、指导学生动作练习与课堂组织；负责学院太极比赛集训及带队，获评校级“优秀助教”。',
      reflection: '大规模课堂教学练就了组织协调与带队能力。',
      created_at: '2024-06-01', updated_at: '2025-09-30',
    },
    {
      id: 'p11', name: '中国联通郫都分公司·线上运营与销售', project_type: '工作', status: '已完成',
      start_date: '2024-06-01', end_date: '2024-09-30', tags: ['社群运营', '私域', '销售'],
      outcomes: ['运营500+人新生社群', '线上转化90+人', '线下开卡100+张', '当季代理商销冠（西南交大站）'],
      description: '开学季主导创建并运营500+人新生线上社群（套餐攻略、产品介绍、答疑互动），沉淀300+意向客户；开学后转入线下推广，日均接待客户20+人，累计开卡100+张，获2024年中国联通西南交大站当季代理商销冠。',
      reflection: '完整跑通「获客→社群运营→私域沉淀→转化→线下销售」闭环。',
      created_at: '2024-06-01', updated_at: '2024-09-30',
    },
    {
      id: 'p13', name: '班级公众号与视频号运营', project_type: '活动', status: '进行中',
      start_date: '2023-10-01', end_date: null, tags: ['公众号', '视频号', '内容运营'],
      outcomes: ['发布13篇原创内容', '5篇被学院官方平台转载'],
      description: '担任班级宣传委员，独立负责班级微信公众号及视频号运营，完成选题策划、内容撰写、图文编辑、视频拍摄剪辑到发布推广的全流程。',
      reflection: '',
      created_at: '2023-10-01', updated_at: '2026-09-06',
    },
    {
      id: 'p12', name: '西南交大外国语学院新语传媒中心', project_type: '活动', status: '已完成',
      start_date: '2023-09-01', end_date: '2024-06-30', tags: ['新媒体', '公众号', '排版'],
      outcomes: ['发布15+篇原创内容', '单篇最高阅读量5000+', '学院优秀部员'],
      description: '担任新媒体编辑部干事，负责校级及院级新媒体平台内容运营：公众号内容编辑、图文排版、推送发布、配图设计与内容审核，单篇阅读量稳定1000+。',
      reflection: '',
      created_at: '2023-09-01', updated_at: '2024-06-30',
    },
  ];

  // ---- 角色 ----
  const roles = [
    { id: 'r1', project_id: 'p1', role_name: '讲解员' },
    { id: 'r2', project_id: 'p1', role_name: '研究者' },
    { id: 'r3', project_id: 'p1', role_name: '文案创作者' },
    { id: 'r5', project_id: 'p3', role_name: '策划者' },
    { id: 'r6', project_id: 'p3', role_name: '开发者' },
    { id: 'r9', project_id: 'p3', role_name: '产品经理' },
    { id: 'r10', project_id: 'p3', role_name: 'UI设计师' },
    { id: 'r20', project_id: 'p7', role_name: '讲解团团长' },
    { id: 'r21', project_id: 'p8', role_name: '太极助教' },
    { id: 'r22', project_id: 'p9', role_name: '法国签证专员' },
    { id: 'r23', project_id: 'p10', role_name: '助教' },
    { id: 'r24', project_id: 'p11', role_name: '线上运营与销售' },
    { id: 'r25', project_id: 'p12', role_name: '新媒体编辑部干事' },
    { id: 'r26', project_id: 'p13', role_name: '宣传委员' },
    { id: 'r27', project_id: 'p14', role_name: '核心成员 & 主要答辩人' },
    { id: 'r28', project_id: 'p15', role_name: '志愿者' },
    { id: 'r29', project_id: 'p16', role_name: '志愿者' },
    { id: 'r30', project_id: 'p17', role_name: '特展讲解员' },
    { id: 'r31', project_id: 'p18', role_name: '策划与开发者' },
    { id: 'r32', project_id: 'p19', role_name: '搭建者' },
    { id: 'r33', project_id: 'p20', role_name: '实践队队长' },
  ];

  // ---- 贡献 ----
  const contributions = [
    { id: 'c1', project_id: 'p1', description: '内容策划与讲解词撰写' },
    { id: 'c2', project_id: 'p1', description: '讲解内容修改与反复练习' },
    { id: 'c3', project_id: 'p1', description: '现场展示' },
    { id: 'c10', project_id: 'p3', description: '设计网站结构与数据库' },
    { id: 'c11', project_id: 'p3', description: '产品定位与需求梳理' },
    { id: 'c12', project_id: 'p3', description: '编写前端（HTML/CSS/JS 模块化）' },
    { id: 'c13', project_id: 'p3', description: '实现 AI 分析（接入 DeepSeek）' },
    { id: 'c14', project_id: 'p3', description: '设计 UI/UX' },
    { id: 'c15', project_id: 'p3', description: '部署到 GitHub Pages' },
    { id: 'c20', project_id: 'p7', description: '累计完成50+场校史讲解，服务观众800+人次' },
    { id: 'c21', project_id: 'p7', description: '为院士、校长、校党委书记及政府来访人员提供专场讲解' },
    { id: 'c22', project_id: 'p7', description: '累计培训20+名新讲解员，制定排班及考核制度' },
    { id: 'c23', project_id: 'p7', description: '与指导老师共同修订讲解词，优化展陈路线与讲解逻辑' },
    { id: 'c24', project_id: 'p8', description: '连续三个学期协助太极拳课程教学，系统教授24式简化太极拳' },
    { id: 'c25', project_id: 'p8', description: '累计教学3000+人次，获评校级「优秀助教」' },
    { id: 'c26', project_id: 'p8', description: '负责学院太极比赛集训与带队，连续两年获校级团体第一名' },
    { id: 'c27', project_id: 'p9', description: '独立审阅1200+份法语签证材料（日均35份）' },
    { id: 'c28', project_id: 'p9', description: '发现并反馈20+份问题材料，降低团队被拒签风险' },
    { id: 'c29', project_id: 'p9', description: '完成2000+份签证贴附，保持零操作失误' },
    { id: 'c30', project_id: 'p10', description: '维护10+个学习社群（覆盖200+学生），社群月活跃度提升30%' },
    { id: 'c31', project_id: 'p10', description: '累计授课250+小时，辅导学生1000+人次' },
    { id: 'c32', project_id: 'p10', description: '批改作业2000+份，整理学情与错题反馈主讲教师' },
    { id: 'c33', project_id: 'p10', description: '提出6条教学优化建议并被采纳' },
    { id: 'c34', project_id: 'p11', description: '创建并运营500+人新生社群，沉淀300+意向客户' },
    { id: 'c35', project_id: 'p11', description: '线上转化90+人，线下开卡100+张' },
    { id: 'c36', project_id: 'p11', description: '获当季代理商销冠（西南交大站）' },
    { id: 'c37', project_id: 'p12', description: '公众号内容编辑、图文排版与内容审核' },
    { id: 'c38', project_id: 'p12', description: '累计发布15+篇原创内容，单篇最高阅读量5000+' },
    { id: 'c39', project_id: 'p13', description: '独立运营班级公众号与视频号，完成选题策划到发布推广全流程' },
    { id: 'c40', project_id: 'p13', description: '累计发布13篇原创内容，5篇被学院官方平台转载' },
    { id: 'c41', project_id: 'p14', description: '参与三星堆文化在法语世界译介与传播研究' },
    { id: 'c42', project_id: 'p14', description: '组长及另一成员赴法期间，独立承担中期与结项两次关键答辩' },
    { id: 'c43', project_id: 'p15', description: '长者礼仪接待与用餐秩序维护，协助老人就餐' },
    { id: 'c44', project_id: 'p16', description: '唱歌舞蹈表演与老人互动，协助老人完成漆扇制作' },
    { id: 'c45', project_id: 'p17', description: '特展专业讲解：永乐宫历史、建筑艺术、壁画与道教文化' },
    { id: 'c46', project_id: 'p17', description: '面向散客、家庭、学生及团体观众讲解，灵活调整节奏与互动方式' },
    { id: 'c47', project_id: 'p17', description: '自主研究古建筑、元代历史文化与永乐宫迁建工程，持续优化讲解内容' },
    { id: 'c48', project_id: 'p17', description: '讲解服务推广、设备管理与团体讲解接待' },
    { id: 'c49', project_id: 'p18', description: '梳理讲解团队工作流程，分析数据统计需求' },
    { id: 'c50', project_id: 'p18', description: '设计功能结构与数据字段' },
    { id: 'c51', project_id: 'p18', description: '使用 HTML/CSS/JS + Supabase 开发网站，实现多人数据同步' },
    { id: 'c52', project_id: 'p18', description: '使用 Chart.js 实现数据图表可视化' },
    { id: 'c53', project_id: 'p18', description: '根据实际使用需求持续迭代（值班管理、场次记录、收入与提成自动计算）' },
    { id: 'c54', project_id: 'p19', description: '梳理校史馆讲解资料体系（讲解词、人物、建筑、图片）' },
    { id: 'c55', project_id: 'p19', description: '设计知识库信息结构：校史时间线、展厅分类、讲解词、重点人物与建筑' },
    { id: 'c56', project_id: 'p19', description: '网站搭建与搜索功能实现（进行中）' },
    { id: 'c57', project_id: 'p20', description: '前期梳理杨杏佛生平与上海遗迹分布，制定行程与任务分工' },
    { id: 'c58', project_id: 'p20', description: '实地寻访故居、后期居所、遇害地等5类点位，现场讲解与影像采集' },
    { id: 'c59', project_id: 'p20', description: '赴上海铁路博物馆与宋庆龄陵园学习交流，瞻仰杨杏佛烈士墓' },
    { id: 'c60', project_id: 'p20', description: '整理实践成果：照片、视频、文字记录与社会实践报告' },
  ];

  // ---- 文件 ----
  const files = [
    { id: 'f1', project_id: 'p1', file_name: '展都市圈魅力画卷赛务手册.pdf', file_type: 'pdf', file_size: 9801585, description: '大赛赛务手册', importance: '重要', tags: ['手册', '比赛'], uploaded_at: '2026-08-01' },
    { id: 'f2', project_id: 'p1', file_name: '讲解稿.docx', file_type: 'docx', file_size: 13685, description: '参赛讲解稿终稿', importance: '非常重要', tags: ['讲解稿', '文案'], uploaded_at: '2026-08-05' },
    { id: 'f3', project_id: 'p1', file_name: '首途-李杨-A006.pptx', file_type: 'pptx', file_size: 1337541, description: '比赛展示 PPT', importance: '重要', tags: ['PPT', '展示'], uploaded_at: '2026-08-10' },
    { id: 'f6', project_id: null, file_name: '讲解技巧笔记.txt', file_type: 'txt', file_size: 1024, description: '日常讲解心得', importance: '普通', tags: ['笔记'], uploaded_at: '2026-08-18' },
  ];

  // ---- 能力证据（与贡献/项目/能力关联）----
  const evidence = [
    { id: 'e1', skill_id: 'skill-11', project_id: 'p1', contribution_id: 'c1', evidence_description: '比赛内容策划与讲解词撰写', evidence_date: '2026-08-01', source: '2026年成都市旅游景区讲解员大赛（优秀奖）' },
    { id: 'e2', skill_id: 'skill-7', project_id: 'p1', contribution_id: 'c1', evidence_description: '撰写并打磨讲解词', evidence_date: '2026-08-03', source: '2026年成都市旅游景区讲解员大赛（优秀奖）' },
    { id: 'e3', skill_id: 'skill-10', project_id: 'p1', contribution_id: 'c1', evidence_description: '设计讲解叙事结构', evidence_date: '2026-08-04', source: '2026年成都市旅游景区讲解员大赛（优秀奖）' },
    { id: 'e4', skill_id: 'skill-8', project_id: 'p1', contribution_id: 'c3', evidence_description: '现场展示讲解', evidence_date: '2026-08-20', source: '2026年成都市旅游景区讲解员大赛（优秀奖）' },
    { id: 'e12', skill_id: 'skill-16', project_id: 'p3', contribution_id: 'c10', evidence_description: '设计项目结构与数据库', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e14', skill_id: 'skill-23', project_id: 'p3', contribution_id: 'c12', evidence_description: '独立开发完整网站（前端+后端+部署）', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e15', skill_id: 'skill-21', project_id: 'p3', contribution_id: 'c13', evidence_description: '接入并实现 AI 文件分析与日记分析', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e16', skill_id: 'skill-22', project_id: 'p3', contribution_id: 'c10', evidence_description: '设计数据库结构与权限模型', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e17', skill_id: 'skill-24', project_id: 'p3', contribution_id: 'c15', evidence_description: '搭建个人数字档案系统并上线', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e18', skill_id: 'skill-13', project_id: 'p3', contribution_id: 'c14', evidence_description: '设计网站 UI 与视觉风格', evidence_date: '2026-09-07', source: '个人数字档案馆' },
    { id: 'e19', skill_id: 'skill-8', project_id: 'p7', contribution_id: 'c20', evidence_description: '完成50+场校史讲解，服务800+人次', evidence_date: '2025-06-15', source: '西南交大校史馆讲解团' },
    { id: 'e20', skill_id: 'skill-29', project_id: 'p7', contribution_id: 'c22', evidence_description: '管理讲解团：新人培训、排班与考核', evidence_date: '2025-03-01', source: '西南交大校史馆讲解团' },
    { id: 'e21', skill_id: 'skill-6', project_id: 'p7', contribution_id: 'c21', evidence_description: '为院士、校长、政府领导提供专场讲解', evidence_date: '2025-09-20', source: '西南交大校史馆讲解团' },
    { id: 'e22', skill_id: 'skill-7', project_id: 'p7', contribution_id: 'c23', evidence_description: '参与修订讲解词与展陈路线', evidence_date: '2025-05-10', source: '西南交大校史馆讲解团' },
    { id: 'e23', skill_id: 'skill-6', project_id: 'p8', contribution_id: 'c24', evidence_description: '系统教授24式简化太极拳，累计教学3000+人次', evidence_date: '2024-12-10', source: '西南交大体育健康超市·太极助教' },
    { id: 'e24', skill_id: 'skill-17', project_id: 'p8', contribution_id: 'c26', evidence_description: '组织学院太极比赛集训与队形编排', evidence_date: '2025-05-20', source: '西南交大体育健康超市·太极助教' },
    { id: 'e25', skill_id: 'skill-29', project_id: 'p8', contribution_id: 'c26', evidence_description: '带队连续两年获校级太极比赛团体第一名', evidence_date: '2026-05-30', source: '西南交大体育健康超市·太极助教' },
    { id: 'e26', skill_id: 'skill-9', project_id: 'p9', contribution_id: 'c27', evidence_description: '处理1200+份法语签证材料', evidence_date: '2025-07-20', source: 'TLScontact中智签证·法国签证专员' },
    { id: 'e27', skill_id: 'skill-4', project_id: 'p9', contribution_id: 'c28', evidence_description: '发现并反馈20+份问题材料', evidence_date: '2025-08-01', source: 'TLScontact中智签证·法国签证专员' },
    { id: 'e28', skill_id: 'skill-20', project_id: 'p9', contribution_id: 'c29', evidence_description: '完成2000+份签证贴附，零操作失误', evidence_date: '2025-08-20', source: 'TLScontact中智签证·法国签证专员' },
    { id: 'e29', skill_id: 'skill-17', project_id: 'p10', contribution_id: 'c30', evidence_description: '维护10+学习社群，覆盖200+学生', evidence_date: '2025-10-15', source: '作业帮教育科技（成都）·助教' },
    { id: 'e30', skill_id: 'skill-6', project_id: 'p10', contribution_id: 'c31', evidence_description: '累计授课250+小时，辅导1000+人次', evidence_date: '2025-11-20', source: '作业帮教育科技（成都）·助教' },
    { id: 'e31', skill_id: 'skill-2', project_id: 'p10', contribution_id: 'c32', evidence_description: '学情分析与错题整理，反馈主讲教师', evidence_date: '2025-12-10', source: '作业帮教育科技（成都）·助教' },
    { id: 'e32', skill_id: 'skill-24', project_id: 'p11', contribution_id: 'c34', evidence_description: '创建并运营500+人新生社群', evidence_date: '2024-07-10', source: '中国联通郫都分公司·线上运营与销售' },
    { id: 'e33', skill_id: 'skill-19', project_id: 'p11', contribution_id: 'c35', evidence_description: '线上转化90+人，线下开卡100+张', evidence_date: '2024-09-05', source: '中国联通郫都分公司·线上运营与销售' },
    { id: 'e34', skill_id: 'skill-20', project_id: 'p11', contribution_id: 'c36', evidence_description: '获当季代理商销冠（西南交大站）', evidence_date: '2024-09-20', source: '中国联通郫都分公司·线上运营与销售' },
    { id: 'e35', skill_id: 'skill-11', project_id: 'p12', contribution_id: 'c38', evidence_description: '编辑发布15+篇公众号原创内容', evidence_date: '2023-11-15', source: '西南交大外国语学院新语传媒中心' },
    { id: 'e36', skill_id: 'skill-13', project_id: 'p12', contribution_id: 'c37', evidence_description: '图文排版与配图设计', evidence_date: '2024-03-10', source: '西南交大外国语学院新语传媒中心' },
    { id: 'e37', skill_id: 'skill-11', project_id: 'p13', contribution_id: 'c40', evidence_description: '发布13篇原创内容，5篇被学院转载', evidence_date: '2025-05-20', source: '班级公众号与视频号运营' },
    { id: 'e38', skill_id: 'skill-24', project_id: 'p13', contribution_id: 'c39', evidence_description: '独立运营班级公众号与视频号', evidence_date: '2025-06-10', source: '班级公众号与视频号运营' },
    { id: 'e39', skill_id: 'skill-2', project_id: 'p14', contribution_id: 'c41', evidence_description: '参与三星堆文化法语译介研究', evidence_date: '2025-07-15', source: '校级SRTP科研项目（三星堆文化法语译介）' },
    { id: 'e40', skill_id: 'skill-8', project_id: 'p14', contribution_id: 'c42', evidence_description: '独立完成中期与结项两次关键答辩', evidence_date: '2026-04-15', source: '校级SRTP科研项目（三星堆文化法语译介）' },
    { id: 'e41', skill_id: 'skill-9', project_id: 'p14', contribution_id: 'c41', evidence_description: '研究法语世界文化传播路径', evidence_date: '2025-09-20', source: '校级SRTP科研项目（三星堆文化法语译介）' },
    { id: 'e42', skill_id: 'skill-28', project_id: 'p15', contribution_id: 'c43', evidence_description: '敬老院礼仪接待与助餐服务', evidence_date: '2025-08-10', source: '雨花敬老院志愿服务' },
    { id: 'e43', skill_id: 'skill-28', project_id: 'p16', contribution_id: 'c44', evidence_description: '养老院慰问表演与手工互动', evidence_date: '2024-09-05', source: '暑期三下乡养老院志愿服务' },
    { id: 'e44', skill_id: 'skill-8', project_id: 'p17', contribution_id: 'c45', evidence_description: '成都博物馆特展专业讲解', evidence_date: '2026-08-01', source: '成都博物馆《观妙入真——永乐宫的建筑艺术与传承》特展讲解' },
    { id: 'e45', skill_id: 'skill-2', project_id: 'p17', contribution_id: 'c47', evidence_description: '自主研究永乐宫历史、古建筑与元代文化', evidence_date: '2026-08-15', source: '成都博物馆《观妙入真——永乐宫的建筑艺术与传承》特展讲解' },
    { id: 'e46', skill_id: 'skill-6', project_id: 'p17', contribution_id: 'c46', evidence_description: '面向多类型观众互动式讲解', evidence_date: '2026-09-01', source: '成都博物馆《观妙入真——永乐宫的建筑艺术与传承》特展讲解' },
    { id: 'e47', skill_id: 'skill-27', project_id: 'p17', contribution_id: 'c47', evidence_description: '快速学习新领域知识并投入高频现场讲解', evidence_date: '2026-09-15', source: '成都博物馆《观妙入真——永乐宫的建筑艺术与传承》特展讲解' },
    { id: 'e48', skill_id: 'skill-10', project_id: 'p17', contribution_id: 'c45', evidence_description: '持续优化讲解词与讲解叙事方式', evidence_date: '2026-10-01', source: '成都博物馆《观妙入真——永乐宫的建筑艺术与传承》特展讲解' },
    { id: 'e49', skill_id: 'skill-16', project_id: 'p18', contribution_id: 'c49', evidence_description: '梳理讲解团队流程，设计功能结构与数据字段', evidence_date: '2026-07-01', source: '博物馆讲解服务数据管理系统' },
    { id: 'e50', skill_id: 'skill-23', project_id: 'p18', contribution_id: 'c51', evidence_description: '独立开发讲解服务数据管理网站（前端+云端+部署）', evidence_date: '2026-08-01', source: '博物馆讲解服务数据管理系统' },
    { id: 'e51', skill_id: 'skill-21', project_id: 'p18', contribution_id: 'c53', evidence_description: 'AI 辅助开发与功能迭代', evidence_date: '2026-08-20', source: '博物馆讲解服务数据管理系统' },
    { id: 'e52', skill_id: 'skill-22', project_id: 'p18', contribution_id: 'c52', evidence_description: '收入、提成自动计算与图表可视化', evidence_date: '2026-09-01', source: '博物馆讲解服务数据管理系统' },
    { id: 'e53', skill_id: 'skill-24', project_id: 'p19', contribution_id: 'c54', evidence_description: '校史讲解资料数字化、结构化整理', evidence_date: '2026-08-10', source: '西南交大校史馆讲解知识库网站' },
    { id: 'e54', skill_id: 'skill-2', project_id: 'p19', contribution_id: 'c55', evidence_description: '梳理校史时间线、人物、建筑与展项资料', evidence_date: '2026-08-25', source: '西南交大校史馆讲解知识库网站' },
    { id: 'e55', skill_id: 'skill-29', project_id: 'p20', contribution_id: 'c57', evidence_description: '带领4人团队完成3天上海寻访实践', evidence_date: '2026-08-01', source: '赴上海寻访杨杏佛烈士主题社会实践' },
    { id: 'e56', skill_id: 'skill-2', project_id: 'p20', contribution_id: 'c57', evidence_description: '杨杏佛生平与校史资料研究', evidence_date: '2026-07-25', source: '赴上海寻访杨杏佛烈士主题社会实践' },
    { id: 'e57', skill_id: 'skill-8', project_id: 'p20', contribution_id: 'c58', evidence_description: '寻访现场讲解与影像记录', evidence_date: '2026-08-02', source: '赴上海寻访杨杏佛烈士主题社会实践' },
    { id: 'e58', skill_id: 'skill-17', project_id: 'p20', contribution_id: 'c57', evidence_description: '行程规划、任务分工与进度协调', evidence_date: '2026-07-20', source: '赴上海寻访杨杏佛烈士主题社会实践' },
    { id: 'e59', skill_id: 'skill-10', project_id: 'p20', contribution_id: 'c60', evidence_description: '梳理杨杏佛人生脉络（档案+遗迹+纪念场所）', evidence_date: '2026-08-05', source: '赴上海寻访杨杏佛烈士主题社会实践' },
  ];

  // ---- 反思 ----
  const reflections = [
    { id: 'rf1', project_id: 'p1', learned: '敢于在更大的舞台表达。', difficulty: '讲解稿的记忆与临场发挥。', improvement: '增加模拟演练的次数。', created_at: '2026-08-20' },
    { id: 'rf3', project_id: 'p3', learned: '从 0 到 1 独立完成一个全栈网站，理解了「证据驱动成长」的产品设计理念。', difficulty: '调试 Supabase 权限（RLS/GRANT）、AI 接入时的返回格式问题。', improvement: '后续加入更多简历模板、年度成长报告、数据备份导出。', created_at: '2026-09-07' },
    { id: 'rf4', project_id: 'p17', learned: '专业博物馆讲解需要知识储备、体力、声音控制与现场应变的综合能力。', difficulty: '高强度重复讲解与不同观众群体的节奏调整。', improvement: '持续优化讲解词与互动方式，工作结束后补充讲解统计数据。', created_at: '2026-09-06' },
    { id: 'rf5', project_id: 'p20', learned: '档案提供事实依据、遗迹提供空间感受、纪念场所提供传播平台，三者结合才能完整理解历史人物。', difficulty: '将校史文字资料与真实城市空间一一对应。', improvement: '继续整理影像资料，反哺校史馆英烈主题讲解。', created_at: '2026-08-05' },
  ];

  // ---- 已解锁成就 ----
  const userAchievements = [
    { id: 'ua1', achievement_id: 'ach-1', related_project_id: 'p1', unlocked_at: '2026-08-20' },
    { id: 'ua2', achievement_id: 'ach-2', related_project_id: 'p1', unlocked_at: '2026-08-20' },
    { id: 'ua3', achievement_id: 'ach-5', related_project_id: 'p1', unlocked_at: '2026-08-02' },
    { id: 'ua4', achievement_id: 'ach-8', related_project_id: 'p3', unlocked_at: '2026-09-07' },
    { id: 'ua5', achievement_id: 'ach-9', related_project_id: 'p3', unlocked_at: '2026-09-07' },
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
