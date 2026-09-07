# 04 · Supabase 配置步骤

## 1. 创建项目

1. 访问 https://supabase.com ，注册/登录。
2. 点击 **New Project**，填写：
   - Name: `personal-growth-archive`
   - Database Password: 设置一个强密码（记住）
   - Region: 选择离你最近的区域
3. 等待项目初始化完成（约 1-2 分钟）。

## 2. 执行数据库 SQL

1. 左侧菜单进入 **SQL Editor**。
2. 新建查询，粘贴 `supabase/schema.sql` 全部内容，点击 **Run**。
3. 确认执行成功（应创建 11 张表 + 30 条技能 + 10 条成就 + 函数 + 触发器 + RLS）。

## 3. 创建 Storage Bucket

1. 左侧菜单进入 **Storage**。
2. 点击 **New bucket**：
   - Name: `files`
   - 勾选 **Public bucket**（或保持 Private，本项目用签名 URL 下载，推荐 Private）
3. 回到 **SQL Editor**，执行 `supabase/storage-policies.sql`。

## 4. 获取 API Key

1. 左侧菜单进入 **Project Settings → API**（或点击顶栏 URL 区域）。
2. 记下两个值：
   - **Project URL**（形如 `https://xxxx.supabase.co`）
   - **anon public key**（`anon` 密钥，用于前端）
3. 将这两个值填入 `js/config.js`：

```js
window.APP_CONFIG = {
  supabaseUrl: 'https://xxxx.supabase.co',
  supabaseAnonKey: 'your-anon-key',
  demoMode: true, // 未登录时是否启用演示数据
};
```

## 5. 认证配置（可选）

- 左侧 **Authentication → Providers** 可开启邮箱登录、GitHub OAuth 等。
- 邮箱登录需要在 **Authentication → URL Configuration** 设置站点 URL（部署后填 GitHub Pages 地址）。

## 6. 验证

- 浏览器打开 `index.html`（本地或部署后）。
- 注册一个账号 → 创建项目 → 上传文件 → 添加能力证据，验证全流程。
