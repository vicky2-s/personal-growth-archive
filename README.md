# 人生档案馆 · Personal Growth Archive

个人数字档案 + 项目管理 + 成长记录 + 能力地图 + 人生时间轴。

> 文件是人生经历的证据。项目是人生经历的节点。
> 能力不是 AI 主观打分，而是通过真实经历和行为证据不断积累。

## 技术栈

- 前端：HTML + CSS + 原生 JavaScript（无框架）
- 后端：Supabase（PostgreSQL + Auth + Storage + RLS）
- 部署：GitHub Pages

## 目录结构

```
index.html              单页入口
styles.css              样式
js/config.js            配置 + 能力框架常量
js/supabase.js          Supabase 客户端 + 认证
js/router.js            hash 路由
js/ui.js                通用 UI 组件
js/store.js             数据访问封装
js/seed.js              Demo 数据（演示模式）
js/app.js               应用入口（初始化 + 全局搜索）
js/pages/*.js           各页面模块
supabase/schema.sql     数据库结构 + RLS + 种子数据
supabase/storage-policies.sql  Storage 策略
docs/                   设计文档
```

## 快速开始

1. 阅读 `docs/04-Supabase配置.md`，创建 Supabase 项目并执行 SQL。
2. 把 API Key 填入 `js/config.js`。
3. 打开 `index.html`，或按 `docs/05-部署指南.md` 部署到 GitHub Pages。

## 五大核心模块（MVP）

1. Dashboard 首页
2. 项目管理
3. 文件上传与归档
4. 能力证据系统（证据驱动成长模型）
5. 成长时间轴

AI 功能已预留接口（`ai_analysis` 表 + `Store.ai.analyze()`），MVP 使用模拟数据。

## AI 分析（已实现）

文件上传后点击「🤖 AI」即可自动分析。浏览器直连 OpenAI 兼容接口（默认 DeepSeek）：

1. 打开 **设置 → AI 分析**，填入接口地址 / 模型名 / API Key（密钥仅存本地浏览器）。
2. 在档案页或项目详情，点文件的「🤖 AI」按钮。
3. 前端自动提取文本（支持 txt/md/docx/pdf/pptx/xlsx）→ 调用 AI → 返回摘要、关键词、贡献、推荐能力。
4. 勾选确认后，自动生成能力证据（`ai_suggested=true`）。

支持的模型：DeepSeek、OpenAI、Kimi、Qwen、智谱等任意 OpenAI 兼容服务，改 base URL + 模型名即可。
