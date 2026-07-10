# iweioo-platform

[中文](#中文) | [English](#english)

## 中文

### 项目简介

这是 `iweioo.com` 的开源平台仓库。当前 `v0.1.0` 保留了 Next.js 双语个人博客与作品集基线，后续将演进为面向大学生的 AI 应用平台。

已确认的平台架构、统一认证、数据边界、交付阶段和机器可读接入契约位于 [`docs/architecture`](docs/architecture/README.md)。

### 当前技术栈

- Next.js App Router
- TypeScript
- 静态导出到 `out/`
- 使用 `content/posts` 管理 MDX 文章
- 从 GitHub `buan496` 和 Gitee `wang-jing26` 同步公开仓库

平台化改造后，Web 前端继续使用 Next.js 与 TypeScript，平台 API 和 Worker 使用 FastAPI 与 Python。具体边界以架构文档为准。

### 本地开发

```bash
npm install
npm run dev
```

访问 `http://localhost:3000/zh/` 或 `http://localhost:3000/en/`。

### 内容管理

- 在 `data/site.ts` 编辑个人资料。
- 在 `data/project-overrides.ts` 配置项目标题、摘要、标签、顺序和可见性。
- 在 `content/posts/zh/*.mdx` 添加中文文章。
- 在 `content/posts/en/*.mdx` 添加英文文章。

文章 frontmatter 示例：

```md
---
title: "文章标题"
description: "简短描述"
date: "2026-07-02"
tags:
  - 标签
draft: false
---
```

### 项目同步

```bash
npm run sync:projects
```

同步脚本会把公开仓库数据标准化后写入 `public/data/projects.json`。构建会先执行同步；如果 GitHub 或 Gitee 暂时不可用，则继续使用已有的本地数据文件。

### 质量检查与构建

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

当前静态站点构建产物位于 `out/`。

### 仓库、域名与邮箱

- 规范仓库：<https://github.com/buan496/iweioo-platform>
- 规范域名：`iweioo.com`
- 联系邮箱：`contact@iweioo.com`

Gitee 目前只作为公开项目数据源，本仓库不会向 Gitee 推送源码。

生产环境计划部署在腾讯云中国大陆节点。服务器购买、备案、DNS 与子域名路由以[系统架构](docs/architecture/system-architecture.md)和正式部署文档为准；`www` 将重定向到规范域名 `iweioo.com`。

### 许可证、安全与品牌

源代码采用 `AGPL-3.0-only`，完整条款与声明见 `LICENSE` 和 `NOTICE`。`iweioo` 名称、Logo 和品牌资产由 `TRADEMARKS.md` 单独约束。

安全问题必须按照 `SECURITY.md` 私密报告，不要在公开 Issue 中披露漏洞细节。贡献流程与 DCO 签署规则见 `CONTRIBUTING.md`。

## English

### Overview

This is the open-source platform repository for `iweioo.com`. The current `v0.1.0` preserves the Next.js bilingual blog and portfolio baseline. It will evolve into an AI application platform for university students.

The accepted platform architecture, centralized identity model, data boundaries, delivery stages, and machine-readable integration contracts are documented in [`docs/architecture`](docs/architecture/README.md).

### Current stack

- Next.js App Router
- TypeScript
- Static export to `out/`
- MDX posts under `content/posts`
- Public repository sync from GitHub `buan496` and Gitee `wang-jing26`

After the platform transition, the web frontend will continue to use Next.js and TypeScript, while the platform API and workers will use FastAPI and Python. The architecture documents are authoritative for these boundaries.

### Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/zh/` or `http://localhost:3000/en/`.

### Content management

- Edit profile data in `data/site.ts`.
- Configure project titles, summaries, tags, ordering, and visibility in `data/project-overrides.ts`.
- Add Chinese posts in `content/posts/zh/*.mdx`.
- Add English posts in `content/posts/en/*.mdx`.

Post frontmatter example:

```md
---
title: "Post title"
description: "Short description"
date: "2026-07-02"
tags:
  - Tag
draft: false
---
```

### Project sync

```bash
npm run sync:projects
```

The sync script normalizes public repository data into `public/data/projects.json`. Builds run the sync first. If GitHub or Gitee is temporarily unavailable, the existing local data file remains in use.

### Quality checks and build

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The current static site is exported to `out/`.

### Repository, domain, and email

- Canonical repository: <https://github.com/buan496/iweioo-platform>
- Canonical domain: `iweioo.com`
- Contact email: `contact@iweioo.com`

Gitee is currently a public project data source only. This repository is not configured to push source code to Gitee.

Production is planned for Tencent Cloud's mainland China region. Server purchase, ICP filing, DNS, and subdomain routing follow the [system architecture](docs/architecture/system-architecture.md) and the future production deployment guide. `www` will redirect to the canonical `iweioo.com` host.

### License, security, and brand

Source code is licensed under `AGPL-3.0-only`. See `LICENSE` and `NOTICE` for the complete terms and notices. The iweioo name, logo, and brand assets are governed separately by `TRADEMARKS.md`.

Security issues must be reported privately as described in `SECURITY.md`; do not disclose vulnerability details in a public issue. See `CONTRIBUTING.md` for the contribution workflow and DCO sign-off requirements.
