# iweioo-platform

Current `v0.1.0` baseline of the Next.js personal blog and bilingual portfolio for `iweioo.com`.
This repository will evolve into the open-source iweioo application platform.

## Stack

- Next.js App Router
- TypeScript
- Static export to `out/`
- MDX posts under `content/posts`
- Public repository sync from GitHub `buan496` and Gitee `wang-jing26`

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000/zh/` or `http://localhost:3000/en/`.

## Content

- Edit profile data in `data/site.ts`.
- Add manual project titles, summaries, tags, ordering, and visibility in `data/project-overrides.ts`.
- Add Chinese posts in `content/posts/zh/*.mdx`.
- Add English posts in `content/posts/en/*.mdx`.

Each post uses frontmatter:

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

## Project Sync

```bash
npm run sync:projects
```

The script writes normalized public repository data to `public/data/projects.json`.
Builds run the sync first. If GitHub or Gitee is temporarily unavailable, the script keeps using the existing local data file.

## Build

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

The static site is exported to `out/`.

## Git Remote

Canonical repository:

- `https://github.com/buan496/iweioo-platform`

Gitee is used as a public project data source only. This repo is not configured to push source code to Gitee.

## Domain and Email

Use `iweioo.com` as the canonical domain.

Recommended first-stage DNS:

- `A` record for `@` to the future Hong Kong VPS IPv4 address.
- `AAAA` record for `@` if the VPS has IPv6.
- `CNAME` record for `www` to `iweioo.com`.

For `contact@iweioo.com`, use Cloudflare Email Routing or the domain provider's mail forwarding to forward incoming email to `jingw9992@gmail.com`.
Only configure Gmail "Send mail as" after a verified SMTP sending path is available.

## License and brand

Source code is licensed under `AGPL-3.0-only`. See `LICENSE` and `NOTICE`.
The iweioo name, logo, and brand assets are governed separately by `TRADEMARKS.md`.

Security issues must be reported privately as described in `SECURITY.md`.
