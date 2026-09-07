-- =====================================================================
-- 迁移脚本：新增「每日日记」表（已建好数据库的旧项目，执行本文件即可）
-- =====================================================================
create table if not exists public.diary_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  entry_date  date not null,
  content     text,
  analysis    jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint diary_entries_unique unique (user_id, entry_date)
);

create index if not exists idx_diary_user on public.diary_entries(user_id);

alter table public.diary_entries enable row level security;

drop policy if exists diary_self on public.diary_entries;
create policy "diary_self" on public.diary_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant all on table public.diary_entries to anon, authenticated;
