# 公司官网（产品展示 + 后台管理）

前台：产品展示、关于我们、联系页面  
后台：登录后管理产品（增删改查）  
托管：前端可部署到 Vercel / Netlify / GitHub Pages（静态托管）

## 本地运行

```bash
npm install
npm run dev
```

## 配置 Supabase（用于产品数据 + 后台登录）

1) 创建一个 Supabase 项目  
2) 在项目根目录创建 `.env.local`（可参考 `.env.example`）：

```bash
VITE_SUPABASE_URL=你的 Supabase Project URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon key
```

3) 在 Supabase SQL Editor 执行下面的 SQL（创建 products 表 + 开启 RLS + 策略）

```sql
-- Enable uuid generation (usually enabled by default)
create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text,
  short_description text,
  description text,
  price_cny numeric,
  image_url text,
  gallery_urls text[],
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order, created_at desc);

-- Updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- RLS
alter table public.products enable row level security;

-- Public can read only active products
drop policy if exists "public read active products" on public.products;
create policy "public read active products"
on public.products
for select
to anon, authenticated
using (is_active = true);

-- Admin (authenticated) can manage all products
drop policy if exists "admin manage products" on public.products;
create policy "admin manage products"
on public.products
for all
to authenticated
using (true)
with check (true);
```

如果你已经创建过 `products` 表，只需要补充一列用于「栏目/分类」：

```sql
alter table public.products
  add column if not exists category text;
```

如果你要开启“详情页图集轮播（后台可维护）”，再补一列：

```sql
alter table public.products
  add column if not exists gallery_urls text[];
```

4) 创建管理员账号  
在 Supabase 控制台 Auth → Users 里创建一个用户（邮箱+密码），然后用 `/admin/login` 登录即可。

## 吉益简介后台维护（可选，含图片轮播）

如果你希望“关于吉益”页面的简介与图片轮播由后台维护，请在 Supabase SQL Editor 执行：

```sql
create table if not exists public.space_environment (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.space_environment_content (
  id uuid primary key default gen_random_uuid(),
  intro_1 text not null,
  intro_2 text not null,
  intro_3 text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.space_environment enable row level security;
alter table public.space_environment_content enable row level security;

drop policy if exists "public read active space environment" on public.space_environment;
create policy "public read active space environment"
on public.space_environment
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admin manage space environment" on public.space_environment;
create policy "admin manage space environment"
on public.space_environment
for all
to authenticated
using (true)
with check (true);

drop policy if exists "public read space environment content" on public.space_environment_content;
create policy "public read space environment content"
on public.space_environment_content
for select
to anon, authenticated
using (true);

drop policy if exists "admin manage space environment content" on public.space_environment_content;
create policy "admin manage space environment content"
on public.space_environment_content
for all
to authenticated
using (true)
with check (true);

drop trigger if exists space_environment_set_updated_at on public.space_environment;
create trigger space_environment_set_updated_at
before update on public.space_environment
for each row execute function public.set_updated_at();

drop trigger if exists space_environment_content_set_updated_at on public.space_environment_content;
create trigger space_environment_content_set_updated_at
before update on public.space_environment_content
for each row execute function public.set_updated_at();

drop policy if exists "auth manage space images" on storage.objects;
create policy "auth manage space images"
on storage.objects
for all
to authenticated
using (bucket_id = 'space-images')
with check (bucket_id = 'space-images');
```

然后在 Supabase Storage 创建公开 bucket：`space-images`，即可在后台上传轮播图片并自动展示到“关于吉益”页面。

### 首页背景图轮播后台维护（可选）

在 Supabase SQL Editor 执行：

```sql
create table if not exists public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_banners enable row level security;

drop policy if exists "public read active hero banners" on public.hero_banners;
create policy "public read active hero banners"
on public.hero_banners
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admin manage hero banners" on public.hero_banners;
create policy "admin manage hero banners"
on public.hero_banners
for all
to authenticated
using (true)
with check (true);

drop trigger if exists hero_banners_set_updated_at on public.hero_banners;
create trigger hero_banners_set_updated_at
before update on public.hero_banners
for each row execute function public.set_updated_at();
```

执行后可在后台 `/admin/about` 的“首页背景轮播”模块管理首页轮播图（上传、排序、启用）。

## 最新动态后台维护（关于吉益页面）

在 Supabase SQL Editor 执行：

```sql
create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  image_url text,
  publish_date date not null default current_date,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.news_articles enable row level security;

drop policy if exists "public read active news articles" on public.news_articles;
create policy "public read active news articles"
on public.news_articles
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admin manage news articles" on public.news_articles;
create policy "admin manage news articles"
on public.news_articles
for all
to authenticated
using (true)
with check (true);

drop trigger if exists news_articles_set_updated_at on public.news_articles;
create trigger news_articles_set_updated_at
before update on public.news_articles
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public)
values ('news-images', 'news-images', true)
on conflict (id) do nothing;

drop policy if exists "auth manage news images" on storage.objects;
create policy "auth manage news images"
on storage.objects
for all
to authenticated
using (bucket_id = 'news-images')
with check (bucket_id = 'news-images');

drop policy if exists "public read news images" on storage.objects;
create policy "public read news images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'news-images');
```

执行后：
- 前台 `/about` 页面“最新动态”会自动读取已发布内容
- 后台可在 `/admin/news` 维护动态（标题、摘要、封面图、发布日期、排序、发布状态）

如果你已经创建过 `news_articles` 表，可补字段：

```sql
alter table public.news_articles
  add column if not exists image_url text;
```

## 吉益工匠后台维护（工匠档案）

在 Supabase SQL Editor 执行：

```sql
create table if not exists public.craftsman_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  focus text,
  years text,
  story text not null,
  works text[],
  avatar_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.craftsman_profiles enable row level security;

drop policy if exists "public read active craftsmen" on public.craftsman_profiles;
create policy "public read active craftsmen"
on public.craftsman_profiles
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "admin manage craftsmen" on public.craftsman_profiles;
create policy "admin manage craftsmen"
on public.craftsman_profiles
for all
to authenticated
using (true)
with check (true);

drop trigger if exists craftsman_profiles_set_updated_at on public.craftsman_profiles;
create trigger craftsman_profiles_set_updated_at
before update on public.craftsman_profiles
for each row execute function public.set_updated_at();

drop policy if exists "auth manage craftsman images" on storage.objects;
create policy "auth manage craftsman images"
on storage.objects
for all
to authenticated
using (bucket_id = 'craftsman-images')
with check (bucket_id = 'craftsman-images');
```

执行后：
- 前台 `/craftsmen` 页面会自动读取已启用工匠档案（未配置时使用默认展示数据）
- 后台可在 `/admin/craftsmen` 维护工匠资料（姓名、角色、专长、故事、作品标签、头像、排序、展示状态）
- 请在 Supabase Storage 新建公开 bucket：`craftsman-images`
- 工匠头像上传会保存到 `craftsman-images` bucket（保存到 `craftsmen/` 目录）

## 咨询留言（方案 A：提交到 Supabase）

在 Supabase SQL Editor 执行：

```sql
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inquiries enable row level security;

drop policy if exists "public create inquiries" on public.inquiries;
create policy "public create inquiries"
on public.inquiries
for insert
to anon, authenticated
with check (true);

drop policy if exists "admin read inquiries" on public.inquiries;
create policy "admin read inquiries"
on public.inquiries
for select
to authenticated
using (true);

drop policy if exists "admin update inquiries" on public.inquiries;
create policy "admin update inquiries"
on public.inquiries
for update
to authenticated
using (true)
with check (true);

drop trigger if exists inquiries_set_updated_at on public.inquiries;
create trigger inquiries_set_updated_at
before update on public.inquiries
for each row execute function public.set_updated_at();
```

执行后：
- 前台“联系我们”中的“咨询留言”会直接写入 `inquiries`
- 后台可在 `/admin/inquiries` 查看和更新状态（新提交/已联系/已完成）

## 页面入口

- 官网首页：`/`
- 产品列表：`/products`
- 吉益工匠：`/craftsmen`
- 后台登录：`/admin/login`
- 后台产品管理：`/admin/products`
- 后台简介管理：`/admin/about`
- 后台留言管理：`/admin/inquiries`
- 后台动态管理：`/admin/news`
- 后台工匠管理：`/admin/craftsmen`

## 部署

### Vercel / Netlify（推荐）

- 构建命令：`npm run build`
- 输出目录：`dist`
- 环境变量：添加 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`

### GitHub Pages

建议用 Vercel/Netlify（更省心）。如果必须用 GitHub Pages，需要设置 Vite 的 `base`，并用 GitHub Actions 发布 `dist`。

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
