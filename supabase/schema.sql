-- =====================================================================
-- 人生档案馆 (Personal Growth Archive)
-- Supabase PostgreSQL 数据库结构 v1 (MVP)
-- =====================================================================
-- 说明：
--   1. 本文件在 Supabase Dashboard -> SQL Editor 中一次性执行即可。
--   2. 所有表都启用了 RLS（行级安全），保证每个用户只能访问自己的数据。
--   3. 使用 CHECK 约束代替 ENUM 类型，方便未来扩展字段取值。
--   4. 包含技能库、成就定义的种子数据（Seed Data）。
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. 扩展
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";

-- =====================================================================
-- 1. 用户表 users
--    与 Supabase Auth 的 auth.users 一一对应。
--    注册后通过触发器自动创建一行公开资料。
-- =====================================================================
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text not null default '新用户',
  avatar_url    text,
  bio           text,                       -- 个人简介
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- =====================================================================
-- 2. 项目表 projects
--    人生经历的"节点"。文件、贡献、能力证据都挂在项目之下。
--    项目完成时不删除，仅把 status 改为"已完成"，即自动进入档案。
-- =====================================================================
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,

  name          text not null,              -- 项目名称
  description   text,                       -- 项目描述
  -- 项目类型：比赛 / 项目 / 工作 / 学习 / 活动 / 其他
  project_type  text not null default '其他',
  -- 项目状态：进行中 / 已完成 / 暂停
  status        text not null default '进行中',
  start_date    date,                       -- 开始时间
  end_date      date,                       -- 结束时间
  tags          text[] not null default '{}', -- 项目标签
  outcomes      text[] not null default '{}', -- 项目成果（如：最终讲解稿、获奖证书）
  cover_url     text,                       -- 封面图（可选）
  reflection    text,                       -- 个人反思（一句话速览，详情另有反思表）

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint projects_type_check check (project_type in ('比赛','项目','工作','学习','活动','其他')),
  constraint projects_status_check check (status in ('进行中','已完成','暂停'))
);

-- =====================================================================
-- 3. 个人反思表 reflections
--    一个项目可以有多条反思，记录"学到了什么 / 困难 / 改进"。
--    （原需求放在项目详情页；独立成表便于未来按时间积累反思。）
-- =====================================================================
create table if not exists public.reflections (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,

  learned       text,                       -- 这个项目让我学到了什么
  difficulty    text,                       -- 遇到了什么困难
  improvement   text,                       -- 以后可以改进什么
  content       text,                       -- 自由补充

  created_at    timestamptz not null default now()
);

-- =====================================================================
-- 4. 项目角色表 project_roles
--    用户在项目中的角色，如：讲解员 / 策划者 / 研究者 / 文案创作者。
-- =====================================================================
create table if not exists public.project_roles (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  role_name     text not null
);

-- =====================================================================
-- 5. 贡献表 contributions
--    用户在项目中的具体贡献。每一项贡献未来可以关联能力。
-- =====================================================================
create table if not exists public.contributions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  description   text not null,              -- 例如：查阅历史资料 / 撰写讲解稿
  created_at    timestamptz not null default now()
);

-- =====================================================================
-- 6. 文件表 files
--    文件元数据。文件本体存 Supabase Storage，这里只存路径与信息。
--    project_id 可为空 -> 表示"未分类文件"。
-- =====================================================================
create table if not exists public.files (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete set null, -- 未分类时为空

  file_name     text not null,              -- 原始文件名
  file_type     text,                       -- 扩展名：pdf / docx / png ...
  file_url      text,                       -- Storage 完整路径
  file_size     bigint,                     -- 字节
  description   text,                       -- 文件描述
  importance    text not null default '普通', -- 普通 / 重要 / 非常重要
  tags          text[] not null default '{}', -- 文件标签

  uploaded_at   timestamptz not null default now(),

  constraint files_importance_check check (importance in ('普通','重要','非常重要'))
);

-- =====================================================================
-- 7. 技能库 skills（种子数据，六大能力领域 × 各 5 项能力 = 30 项）
--    技能是"词典/维度"，用户通过 skill_evidence 积累证据。
-- =====================================================================
create table if not exists public.skills (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,       -- 能力名称，如"公众演讲"
  category      text not null,              -- 六大领域：思考与学习 / 表达与沟通 / ...
  description   text,                       -- 能力说明
  icon          text,                       -- 领域 emoji，如 🎤
  sort_order    int not null default 0,

  constraint skills_category_check check (
    category in ('思考与学习','表达与沟通','创意与内容','项目与职业','数字与技术','自我发展')
  )
);

-- =====================================================================
-- 8. 能力证据表 skill_evidence
--    "证据驱动成长"的核心表。
--    证据来源：真实项目 + 真实贡献 + 具体行为 + 时间。
-- =====================================================================
create table if not exists public.skill_evidence (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  skill_id             uuid not null references public.skills(id) on delete cascade,
  project_id           uuid references public.projects(id) on delete set null,
  contribution_id      uuid references public.contributions(id) on delete set null,

  evidence_description text,                -- 具体行为，如"完成正式讲解"
  evidence_date        date,                -- 证据发生时间（年/月/日）
  source               text,                -- 证据来源快照（如项目名称，防止项目删除后丢失）
  ai_suggested         boolean not null default false, -- 是否由 AI 推荐
  confirmed            boolean not null default true,  -- 用户是否已确认（AI 推荐需确认）

  created_at           timestamptz not null default now()
);

-- =====================================================================
-- 9. 成就定义表 achievements（种子数据）
--    成就"定义"与"用户已解锁"分离，便于未来新增成就。
-- =====================================================================
create table if not exists public.achievements (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,    -- 成就名称（唯一）
  description      text,                    -- 成就描述
  category         text not null,           -- 表达 / 学习 / 数字 / ...
  unlock_condition text,                    -- 解锁条件（面向用户的文字说明）
  icon             text,                    -- 成就图标 emoji
  sort_order       int not null default 0
);

-- =====================================================================
-- 10. 用户成就表 user_achievements
--     记录用户已解锁的成就、解锁时间与关联项目。
-- =====================================================================
create table if not exists public.user_achievements (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  achievement_id     uuid not null references public.achievements(id) on delete cascade,
  related_project_id uuid references public.projects(id) on delete set null,
  unlocked_at        timestamptz not null default now(),

  constraint user_achievements_unique unique (user_id, achievement_id)
);

-- =====================================================================
-- 11. AI 分析结果表 ai_analysis（预留接口，MVP 可不调用真实 AI）
--     未来上传文件后可调用 AI，返回摘要/关键词/贡献/能力推荐。
--     推荐能力不会自动写入 skill_evidence，需用户确认后生成正式证据。
-- =====================================================================
create table if not exists public.ai_analysis (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.users(id) on delete cascade,
  file_id           uuid references public.files(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete set null,

  summary           text,                   -- 一句话总结
  detailed_summary  text,                   -- 详细总结
  keywords          text[] default '{}',    -- 关键词
  suggested_project text,                   -- AI 识别的所属项目名
  contributions     text[] default '{}',    -- AI 识别的用户贡献
  suggested_skills  uuid[] default '{}',    -- AI 推荐能力 (skills.id 数组)
  status            text not null default 'pending', -- pending / confirmed / rejected
  raw_response      jsonb,                  -- AI 原始返回（备用）

  created_at        timestamptz not null default now()
);

-- =====================================================================
-- 12. 每日日记表 diary_entries
--     每天一篇日记，可选 AI 分析（大五人格 / VIA 品格优势 / 成长建议）。
--     analysis 为 jsonb，存储结构化分析结果。
-- =====================================================================
create table if not exists public.diary_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  entry_date  date not null,               -- 日记日期
  content     text,                        -- 日记正文
  external_analysis text,                  -- 外部 AI 分析（如 ChatGPT 的分析，供参考）
  analysis    jsonb,                       -- 本站 AI 独立分析结果
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint diary_entries_unique unique (user_id, entry_date)
);

-- =====================================================================
-- 索引（提升查询性能）
-- =====================================================================
create index if not exists idx_projects_user      on public.projects(user_id);
create index if not exists idx_files_user         on public.files(user_id);
create index if not exists idx_files_project      on public.files(project_id);
create index if not exists idx_evidence_user      on public.skill_evidence(user_id);
create index if not exists idx_evidence_skill     on public.skill_evidence(skill_id);
create index if not exists idx_evidence_project   on public.skill_evidence(project_id);
create index if not exists idx_contrib_project    on public.contributions(project_id);
create index if not exists idx_roles_project      on public.project_roles(project_id);
create index if not exists idx_reflections_project on public.reflections(project_id);
create index if not exists idx_ua_user            on public.user_achievements(user_id);
create index if not exists idx_diary_user         on public.diary_entries(user_id);

-- =====================================================================
-- 触发器：auth 注册后自动创建 public.users 行
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', '新用户')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 触发器：自动更新 projects.updated_at
-- =====================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch on public.projects;
create trigger projects_touch
  before update on public.projects
  for each row execute procedure public.touch_updated_at();

-- =====================================================================
-- 行级安全策略 (RLS)
-- 规则：每张含 user_id 的表，用户只能读写自己的数据；
--      通过 project_id 关联的表，通过子查询校验归属。
-- =====================================================================
alter table public.users            enable row level security;
alter table public.projects         enable row level security;
alter table public.reflections      enable row level security;
alter table public.project_roles    enable row level security;
alter table public.contributions    enable row level security;
alter table public.files            enable row level security;
alter table public.skills           enable row level security;
alter table public.skill_evidence   enable row level security;
alter table public.achievements     enable row level security;
alter table public.user_achievements enable row level security;
alter table public.ai_analysis      enable row level security;
alter table public.diary_entries    enable row level security;

-- users：仅本人可读写
create policy "users_self" on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- projects：仅本人可读写
create policy "projects_self" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- reflections：仅本人可读写（本人 -> 自己的项目 -> 该项目反思）
create policy "reflections_self" on public.reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- project_roles：归属通过 project.user_id 校验
create policy "roles_self" on public.project_roles
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- contributions：归属通过 project.user_id 校验
create policy "contrib_self" on public.contributions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- files：仅本人可读写
create policy "files_self" on public.files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- skills：技能库是全局字典，所有人可读，但仅服务端/管理员可写（MVP 下开放读取即可）
create policy "skills_read" on public.skills
  for select using (true);

-- skill_evidence：仅本人可读写
create policy "evidence_self" on public.skill_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- achievements：成就定义全局可读
create policy "achievements_read" on public.achievements
  for select using (true);

-- user_achievements：仅本人可读写
create policy "ua_self" on public.user_achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ai_analysis：仅本人可读写
create policy "ai_self" on public.ai_analysis
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- diary_entries：仅本人可读写
create policy "diary_self" on public.diary_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- 能力等级计算函数（证据驱动，非主观评分）
-- 依据"有效证据数量"划分等级：
--   Level 0 = 0
--   Level 1 = 1-2
--   Level 2 = 3-5
--   Level 3 = 6-10
--   Level 4 = 11-20
--   Level 5 = 21+
-- 注意：同一项目中同一能力只计 1 条有效证据（防止刷数量）。
-- =====================================================================
create or replace function public.skill_level(p_user_id uuid, p_skill_id uuid)
returns int
language sql
stable
as $$
  with effective as (
    select distinct project_id
    from public.skill_evidence
    where user_id = p_user_id
      and skill_id = p_skill_id
      and confirmed = true
      and project_id is not null
  )
  select case
    when (select count(*) from effective) = 0 then 0
    when (select count(*) from effective) between 1 and 2 then 1
    when (select count(*) from effective) between 3 and 5 then 2
    when (select count(*) from effective) between 6 and 10 then 3
    when (select count(*) from effective) between 11 and 20 then 4
    else 5
  end;
$$;

-- =====================================================================
-- 种子数据：六大能力领域 × 5 项能力
-- =====================================================================
insert into public.skills (name, category, icon, sort_order) values
  -- A 思考与学习
  ('信息检索',    '思考与学习', '🧠', 1),
  ('研究分析',    '思考与学习', '🧠', 2),
  ('批判性思维',  '思考与学习', '🧠', 3),
  ('问题解决',    '思考与学习', '🧠', 4),
  ('学习能力',    '思考与学习', '🧠', 5),
  -- B 表达与沟通
  ('口头表达',    '表达与沟通', '🎤', 1),
  ('写作能力',    '表达与沟通', '🎤', 2),
  ('公众演讲',    '表达与沟通', '🎤', 3),
  ('跨文化沟通',  '表达与沟通', '🎤', 4),
  ('故事叙述',    '表达与沟通', '🎤', 5),
  -- C 创意与内容
  ('内容创作',    '创意与内容', '🎨', 1),
  ('创意策划',    '创意与内容', '🎨', 2),
  ('视觉表达',    '创意与内容', '🎨', 3),
  ('叙事设计',    '创意与内容', '🎨', 4),
  ('活动设计',    '创意与内容', '🎨', 5),
  -- D 项目与职业
  ('项目管理',    '项目与职业', '💼', 1),
  ('组织协调',    '项目与职业', '💼', 2),
  ('时间管理',    '项目与职业', '💼', 3),
  ('资源整合',    '项目与职业', '💼', 4),
  ('执行能力',    '项目与职业', '💼', 5),
  -- E 数字与技术
  ('AI工具使用',  '数字与技术', '💻', 1),
  ('数据处理',    '数字与技术', '💻', 2),
  ('编程能力',    '数字与技术', '💻', 3),
  ('数字内容管理','数字与技术', '💻', 4),
  ('信息安全意识','数字与技术', '💻', 5),
  -- F 自我发展
  ('自我管理',    '自我发展', '🌱', 1),
  ('适应能力',    '自我发展', '🌱', 2),
  ('团队协作',    '自我发展', '🌱', 3),
  ('领导与影响',  '自我发展', '🌱', 4),
  ('职业探索',    '自我发展', '🌱', 5)
on conflict (name) do nothing;

-- =====================================================================
-- 种子数据：成就定义
-- =====================================================================
insert into public.achievements (name, description, category, unlock_condition, icon, sort_order) values
  ('第一次登台',      '完成第一次正式公开表达。',           '表达', '首次产生"公众演讲/口头表达"类能力证据', '🎤', 1),
  ('舞台成长',        '参加正式比赛或展示活动。',           '表达', '完成一个"比赛"类型的项目',               '🎤', 2),
  ('故事讲述者',      '独立完成 10 篇讲解稿。',             '表达', '累计完成 10 篇讲解/文案类贡献',           '🎤', 3),
  ('百场讲解员',      '累计完成 100 次讲解。',             '表达', '累计完成 100 次讲解类行为',               '🎤', 4),

  ('第一次研究',      '完成第一次系统资料研究。',           '学习', '首次产生"信息检索/研究分析"类能力证据', '📚', 1),
  ('资料猎人',        '完成大量资料整理。',                 '学习', '归档文件数量达到一定规模',               '📚', 2),
  ('知识建筑师',      '建立个人知识档案系统。',             '学习', '建立首个项目并完成能力证据关联',         '📚', 3),

  ('Hello World',     '完成第一个网页项目。',               '数字', '完成第一个"数字与技术"类项目',           '💻', 1),
  ('Builder',         '独立完成一个完整网站。',             '数字', '完成一个完整网站/系统项目',              '💻', 2),
  ('Digital Architect','建立完整个人数字系统。',           '数字', '持续维护个人数字档案系统',               '💻', 3)
on conflict (name) do nothing;

-- =====================================================================
-- 权限授予（重要：Supabase 新建表默认不给角色授权，必须显式 GRANT）
-- RLS 策略控制"行级"访问，这里的 GRANT 控制"表级"访问。
-- =====================================================================
grant usage on schema public to anon, authenticated;

grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated;

-- 让今后新建的表/序列/函数也自动授权
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
