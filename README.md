
# Tunora - AI 音乐创作分享社区

> **Independent tool for AI music creators. Not affiliated with Suno.ai**

[![React](https://img.shields.io/badge/React-18.0-blue?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38b2ac?logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green?logo=supabase)](https://supabase.com/)

Tunora 是一个专为 AI 音乐创作者打造的增强工具平台。它不仅解决了 Suno 官方链接分享形式单一的问题，还提供了歌词同步显示、社交互动、排行榜以及永久云端备份功能。

---

## 💻 推荐开发环境

**本项目是一个标准的 React + Vite 应用，完全脱离 Google AI Studio 限制。**

为了获得最佳的免费开发体验，避免环境兼容性问题，我们强烈推荐使用以下方案：

### 1. GitHub Codespaces (首选推荐 🌟)
- **完全云端**: 无需本地配置，直接在浏览器中使用完整的 VS Code。
- **环境纯净**: 标准的 Docker 容器环境，完美支持 `npm install` 和 `dev` 预览。
- **免费额度**: 个人用户每月拥有 60 小时免费使用时间，足够日常开发。
- **使用方法**: 点击本仓库右上角的绿色 `<> Code` 按钮 -> 选择 **Codespaces** -> **Create codespace on main**。

### 2. 本地 VS Code (最稳健)
- 如果您有电脑，直接 Git Clone 到本地开发是最稳妥的。

---

## 🚀 部署到 Vercel (保姆级教程)

要想让朋友访问您的 App，您必须将其部署到公网。Vercel 是目前最推荐、免费且速度极快的托管平台。

### 第一步：准备代码
1. 确保您的代码已经提交（Commit）并推送到 **GitHub** 仓库。
   - 如果您使用的是云端 IDE（如 Project IDX, StackBlitz），通常侧边栏会有 "Source Control" 按钮，点击 "Publish to GitHub"。

### 第二步：在 Vercel 导入项目
1. 注册并登录 [Vercel.com](https://vercel.com)。
2. 在 Dashboard 点击黑色的 **"Add New..."** 按钮，选择 **"Project"**。
3. 在左侧 "Import Git Repository" 列表中，找到您的 `Tunora` 仓库，点击 **"Import"**。

### 第三步：配置环境变量 (⭐⭐⭐ 最关键一步)
在导入页面的 **"Environment Variables"** (环境变量) 区域，您必须填入 Supabase 的连接信息，否则网站部署后无法加载数据。

点击展开该区域，添加以下两个变量（从您的 Supabase 项目设置 -> API 中获取）：

| Name (键) | Value (值) |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `您的 Supabase Project URL` (例如 https://xyz.supabase.co) |
| `VITE_SUPABASE_ANON_KEY` | `您的 Supabase Anon Key` (以 eyJ 开头的长字符串) |

### 第四步：点击部署
1. 检查 Framework Preset 是否自动识别为 **Vite** (通常会自动识别)。
2. 点击蓝色的 **"Deploy"** 按钮。
3. 等待约 1 分钟，Vercel 会自动构建、打包并发布。
4. 完成后，您会看到满屏的撒花特效。点击 **"Visit"** 即可获得您的专属永久域名（例如 `https://tunora-yourname.vercel.app`）。

🎉 **现在，把这个链接分享给朋友，他们就能完美打开了！**

---

## ❓ 常见问题排查 (Troubleshooting)

### Q: 部署后打开网站是一片空白？
A: 这是因为 `index.html` 中可能残留了 `importmap` 代码，导致与 Vite 打包文件冲突。
**解决方案**：
1. 本代码库已修复此问题，移除了 `index.html` 中的 `<script type="importmap">...</script>`。
2. 请确保您已拉取最新代码并推送到 GitHub。
3. Vercel 会自动重新部署，问题即可解决。

### Q: 刷新页面出现 404？
A: 请检查项目根目录是否有 `vercel.json` 文件，并包含 rewrite 配置。本仓库已包含标准配置。

---

## ✨ 核心功能

### 🎧 沉浸式播放体验
- **无限全局漫游**: 即使没有添加到播放列表，系统也能智能播放全站歌曲。点击“上一首/下一首”会自动在数据库中寻找相邻歌曲，并在最新与最旧歌曲之间自动首尾相连，实现永不停歇的音乐流。
- **智能歌词同步 (Sync V2)**: 自动识别 Verse/Chorus 结构，智能跳过非歌词标签，实现精准的卡拉OK式滚动体验。
- **移动端优化**: 专为手机设计的全屏待播清单，随时随地轻松管理播放队列。
- **高级播放控制**: 支持单曲循环、列表循环、随机播放以及独创的“双次循环”模式。
- **自愈式音频播放器**: 如果 Supabase 云端备份音频失效（404/403），播放器会自动检测并无缝切换回 Suno 官方源，确保持续可听。
- **待播清单**: 侧边栏管理播放队列，支持一键清空和随机打乱。

### 🛠️ 强大的发布工具
- **短链接支持**: 支持解析 Suno 分享短链接 (`suno.com/s/...`)，自动还原真实歌曲信息。
- **智能分享链接**: 自动清洗开发环境产生的 `blob:` 前缀，生成标准、干净的公共分享链接。
- **智能解析**: 只需粘贴 Suno 链接，自动提取封面、歌词、流派标签和音频文件。
- **批量导入**: 支持文本批量粘贴链接，自动去重处理。
- **官网一键抓取**: 提供 Tampermonkey 脚本，支持在 Suno 官网一键导出“喜欢的歌曲”列表（含封面/标题），并在本站秒级导入。

### ☁️ 资源持久化
- **自动备份**: 发布时自动将 Suno 的临时 CDN 链接转存至您配置的 Supabase Storage，防止链接失效。
- **多重代理**: 内置多级代理策略 (Weserv, AllOrigins)，确保音频和图片资源的稳定抓取。

### 👥 社区与互动
- **实时在线**: 查看当前同时在线的听众人数。
- **评分与评论**: 完整的五星评分系统和评论区。
- **用户档案**: 支持自定义昵称、年龄、性别，并根据特征自动生成个性化头像。

---

## 🚀 快速开始 (本地开发)

### 1. 环境准备
确保您的环境已安装 Node.js (v18+) 和 npm/pnpm。

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
在项目根目录创建 `.env` 文件，填入您的 Supabase 配置：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 启动开发服务器
```bash
npm run dev
```

---

## 🗄️ 后端配置 (Supabase)

本项目完全基于 Supabase (BaaS) 构建。请按照以下步骤初始化您的后端。

### 1. Storage 配置 (⚠️ 必须执行)
为了实现资源永久存储，必须创建存储桶：
1. 进入 **Storage** 面板。
2. 创建新 Bucket，命名为 `suno-media`。
3. ⚠️ **务必将 Public Access 设为 True** (公开访问)，否则播放器会报 404/403 错误。
4. 添加 **Policy** (允许所有操作)：
   - 允许 `SELECT`, `INSERT`, `UPDATE`, `DELETE`。
   - 目标角色：`Authenticated` (登录用户)。

### 2. Database Schema (一键建表)
在 Supabase **SQL Editor** 中运行以下 SQL 脚本以初始化数据库结构。

**⚠️ 注意：请将脚本底部的 `774frank1@gmail.com` 替换为您自己的管理员邮箱！**

```sql
-- ============================================================
-- Tunora Database Schema - 完整版 (2025-04-12)
-- 包含：歌曲库、评分系统、用户档案、管理员权限、自动同步触发器
-- ============================================================

-- 1. 创建歌曲表 (Songs)
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  suno_id text not null unique,
  title text not null,
  artist text,
  image_url text,
  audio_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 补全 Songs 表字段 (确保所有功能字段存在)
alter table public.songs add column if not exists category text;
alter table public.songs add column if not exists duration int default 0;
alter table public.songs add column if not exists tags text[];
alter table public.songs add column if not exists plays_count int default 0;
alter table public.songs add column if not exists likes_count int default 0;
alter table public.songs add column if not exists user_id uuid references auth.users(id);
alter table public.songs add column if not exists average_rating float default 0; -- 评分
alter table public.songs add column if not exists total_reviews int default 0;  -- 评价数
alter table public.songs add column if not exists lyrics text;                  -- 歌词

-- 2. 创建评价表 (Reviews)
create table if not exists public.reviews (
  id uuid default gen_random_uuid() primary key,
  song_id uuid references public.songs(id) on delete cascade,
  user_id uuid references auth.users(id),
  user_email text,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(song_id, user_id) -- 限制：每人每首歌只能评一次
);

-- 3. 创建用户档案表 (Profiles) - 用于存储昵称、性别、头像
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  nickname text,
  gender text,
  age int,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================================
-- 安全策略配置 (RLS - Row Level Security)
-- ============================================================

-- 开启所有表的 RLS
alter table public.songs enable row level security;
alter table public.reviews enable row level security;
alter table public.profiles enable row level security;

-- 清理旧策略 (防止重复报错)
drop policy if exists "Enable read access for all users" on public.songs;
drop policy if exists "Enable insert for all users" on public.songs;
drop policy if exists "Enable update for all users" on public.songs;
drop policy if exists "Allow Public Read" on public.songs;
drop policy if exists "Allow Authenticated Insert" on public.songs;
drop policy if exists "Allow Public Update" on public.songs;
drop policy if exists "Allow Admin or Owner Delete Songs" on public.songs;

drop policy if exists "Allow Public Read Reviews" on public.reviews;
drop policy if exists "Allow Authenticated Insert Reviews" on public.reviews;
drop policy if exists "Allow Admin or Owner Delete Reviews" on public.reviews;

drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update their own profile." on public.profiles;

-- === A. 歌曲表策略 (Songs) ===

-- 1. 查看: 允许所有人
create policy "Allow Public Read" 
on public.songs for select 
using (true);

-- 2. 发布: 只允许登录用户
create policy "Allow Authenticated Insert" 
on public.songs for insert 
to authenticated 
with check (auth.uid() = user_id);

-- 3. 更新: 允许所有人 (为了更新播放量/点赞数/评分，这里放宽权限)
create policy "Allow Public Update" 
on public.songs for update 
using (true);

-- 4. 删除: 🔥 允许 [歌曲主人] 或 [指定管理员] 删除
create policy "Allow Admin or Owner Delete Songs" 
on public.songs for delete 
using (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'email') = '774frank1@gmail.com' -- 👈 请替换为您自己的管理员邮箱！！
);

-- === B. 评价表策略 (Reviews) ===

-- 1. 查看: 允许所有人
create policy "Allow Public Read Reviews" 
on public.reviews for select 
using (true);

-- 2. 评论: 只允许登录用户
create policy "Allow Authenticated Insert Reviews" 
on public.reviews for insert 
to authenticated 
with check (auth.uid() = user_id);

-- 3. 删除: 🔥 允许 [评论主人] 或 [指定管理员] 删除
create policy "Allow Admin or Owner Delete Reviews" 
on public.reviews for delete 
using (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'email') = '774frank1@gmail.com' -- 👈 请替换为您自己的管理员邮箱！！
);

-- === C. 用户档案表策略 (Profiles) ===

-- 1. 查看: 允许所有人 (用于显示头像和昵称)
create policy "Public profiles are viewable by everyone." 
on public.profiles for select 
using (true);

-- 2. 插入: 只允许用户插入自己的档案
create policy "Users can insert their own profile." 
on public.profiles for insert 
with check (auth.uid() = id);

-- 3. 更新: 只允许用户更新自己的档案
create policy "Users can update their own profile." 
on public.profiles for update 
using (auth.uid() = id);

-- ============================================================
-- 自动化触发器 (Triggers)
-- ============================================================

-- 函数: 处理新用户注册
-- 作用: 当用户注册时，自动从 auth.users 的 metadata 中提取昵称、性别等，写入 public.profiles
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, nickname, gender, age, avatar_url)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'nickname',
    new.raw_user_meta_data->>'gender',
    (new.raw_user_meta_data->>'age')::int,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 绑定触发器
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ✅ SQL 执行完毕
```

### 3. Authentication 配置
1. 在 **Authentication -> Providers** 中启用 **Email**。
2. 建议关闭 **Confirm email** (不需要邮箱验证链接)，以获得丝滑的注册体验。

---

## 🛠️ 管理员设置

项目内置了简单的管理员权限控制（主要是删除任意歌曲和评论）。
1. 在代码中搜索 `ADMIN_EMAIL` 常量，将其修改为您的邮箱。
2. 确保数据库 RLS 策略中的邮箱也已修改。
3. 使用该邮箱注册/登录后，您将获得：
   - 全局删除权限。
   - 专属的管理员头像高亮显示。

---

## 🤖 自动化脚本 (Tampermonkey)

为了方便从 Suno 官网迁移数据，我们在 `src/pages/Publish.tsx` 中内置了一个油猴脚本。
1. 在应用的“发布 -> Suno 导入”页面复制脚本。
2. 在浏览器安装 Tampermonkey 插件并添加脚本。
3. 访问 Suno 官网，点击右上角的导出按钮即可。

---

## 📄 License

MIT
