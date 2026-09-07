/* =====================================================================
 * config.js — 全局配置与常量
 * ===================================================================== */

// Supabase 配置：把这里替换成你自己的项目信息（见 docs/04-Supabase配置.md）
// 留空 supabaseUrl 时，网站自动进入「演示模式」（使用 seed.js 的本地数据）。
window.APP_CONFIG = {
  supabaseUrl: 'https://pdtugdlzydpmzafvuunj.supabase.co/rest/v1/',           // 例如 'https://xxxx.supabase.co'
  supabaseAnonKey: 'sb_publishable_Om9HukJ3JuQWG9qj5kf6cQ_JPUCJIPB',       // anon public key
  demoMode: true,            // 未登录 / 未配置时是否启用演示数据
};

// 六大能力领域（key 与数据库 skills.category 一致）
window.CATEGORIES = [
  { key: '思考与学习', icon: '🧠' },
  { key: '表达与沟通', icon: '🎤' },
  { key: '创意与内容', icon: '🎨' },
  { key: '项目与职业', icon: '💼' },
  { key: '数字与技术', icon: '💻' },
  { key: '自我发展', icon: '🌱' },
];

// 项目类型 / 状态 / 文件重要程度（与数据库 CHECK 约束一致）
window.PROJECT_TYPES = ['比赛', '项目', '工作', '学习', '活动', '其他'];
window.PROJECT_STATUS = ['进行中', '已完成', '暂停'];
window.FILE_IMPORTANCE = ['普通', '重要', '非常重要'];

// 能力等级：由「有效证据数量」映射，非主观评分
window.SKILL_LEVELS = [
  { level: 0, min: 0,  label: '暂无证据' },
  { level: 1, min: 1,  label: '初步尝试' },
  { level: 2, min: 3,  label: '持续实践' },
  { level: 3, min: 6,  label: '熟练实践' },
  { level: 4, min: 11, label: '深度积累' },
  { level: 5, min: 21, label: '长期专业积累' },
];

// 根据有效证据数量计算能力等级
window.skillLevel = function (count) {
  let result = window.SKILL_LEVELS[0];
  for (const lv of window.SKILL_LEVELS) {
    if (count >= lv.min) result = lv;
  }
  return { level: result.level, label: result.label, count: count };
};

// 文件类型 → 图标映射（用于文件列表展示）
window.FILE_ICONS = {
  pdf: '📄', doc: '📝', docx: '📝', txt: '📃', md: '📃',
  ppt: '📊', pptx: '📊', xls: '📈', xlsx: '📈',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
  mp4: '🎬', mov: '🎬', mp3: '🎵',
  zip: '🗜️', rar: '🗜️',
};

// 通用工具函数
window.utils = {
  // 生成唯一 ID（演示模式用；线上由数据库生成）
  uid: function () {
    return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  },
  // 今天日期
  today: function () { return new Date().toISOString().slice(0, 10); },
  // 格式化日期为「2026年8月」
  fmtMonth: function (d) {
    if (!d) return '';
    const [y, m] = String(d).slice(0, 7).split('-');
    return y + '年' + parseInt(m, 10) + '月';
  },
  fmtDate: function (d) {
    if (!d) return '';
    return String(d).slice(0, 10);
  },
  // 相对时间（几天前）
  timeAgo: function (d) {
    if (!d) return '';
    const diff = Date.now() - new Date(d).getTime();
    const day = 86400000;
    if (diff < day) return '今天';
    if (diff < 2 * day) return '昨天';
    const days = Math.floor(diff / day);
    if (days < 30) return days + ' 天前';
    const months = Math.floor(days / 30);
    if (months < 12) return months + ' 个月前';
    return Math.floor(months / 12) + ' 年前';
  },
  // 转义 HTML，防止注入
  esc: function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  // 文件扩展名
  ext: function (name) {
    const i = String(name).lastIndexOf('.');
    return i < 0 ? '' : String(name).slice(i + 1).toLowerCase();
  },
  // 文件图标
  fileIcon: function (name) {
    const e = window.utils.ext(name);
    return window.FILE_ICONS[e] || '📎';
  },
  // 读取标签数组（兼容字符串）
  tags: function (t) {
    if (Array.isArray(t)) return t;
    if (typeof t === 'string' && t) return t.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    return [];
  },
};
