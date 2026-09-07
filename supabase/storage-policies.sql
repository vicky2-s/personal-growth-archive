-- =====================================================================
-- 人生档案馆 - Supabase Storage 配置与策略
-- =====================================================================
-- 在 Supabase Dashboard -> Storage 手动创建名为 "files" 的 Bucket
-- （勾选 Public 或 Private 均可；本项目的文件默认按"私有"处理，
--   下载时通过带签名的 URL 访问，更安全）。
-- 然后在 SQL Editor 执行本文件，配置访问策略。
-- =====================================================================

-- 先删除可能已存在的同名策略（保证可重复执行）
drop policy if exists "files_upload_own" on storage.objects;
drop policy if exists "files_read_own"   on storage.objects;
drop policy if exists "files_update_own" on storage.objects;
drop policy if exists "files_delete_own" on storage.objects;

-- 策略 1：用户只能上传到自己的目录 "用户ID/文件名"
create policy "files_upload_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 策略 2：用户只能读取自己目录下的文件
create policy "files_read_own"
  on storage.objects
  for select
  using (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 策略 3：用户只能更新/删除自己目录下的文件
create policy "files_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "files_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'files'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- 说明：上传路径约定
--  Storage 中的对象路径格式为：{user_id}/{文件唯一名}.{扩展名}
--  前端上传时用 `supabase.storage.from('files').upload(path, file)`。
--  path 形如：'ab123456-.../讲解稿-v1.pdf'
--  这样 Storage 策略与数据库 files.file_url 中的路径一一对应。
-- =====================================================================
