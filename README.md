# iweioo-platform

[中文](#中文) | [English](#english)

## 中文

### 项目简介

这是 `iweioo.com` 面向大学生的开源 AI 学习平台仓库。平台门户统一呈现产品、博客、关于和开源项目；大厂面试训练与论文答辩 Agent 继续作为独立应用部署在各自子域名，并通过统一身份、用量和隐私契约接入。

当前版本是 Stage 1 工程基础，不代表产品已经开放：

- `iweioo.com`：双语平台门户与内容栏目；
- `interview.iweioo.com`：大厂面试训练，状态为建设中；
- `defense.iweioo.com`：论文答辩 Agent，状态为建设中；
- `auth.iweioo.com` 与计费能力：只有已批准契约，真实实现属于后续阶段。

### 仓库结构

```text
apps/
  web/       Next.js 平台门户
  api/       FastAPI 平台 API 骨架
  worker/    异步 Worker 骨架
packages/
  ui/        共享 UI 孵化包
  sdk/       OpenAPI 生成类型与平台边界
contracts/   HTTP、事件与产品接入清单
deploy/      部署适配目录
docs/        架构与交付文档
tests/       跨运行时契约测试
```

面试与答辩产品源码不会合并进本仓库。完整边界见[架构文档](docs/architecture/README.md)与[工作区说明](docs/architecture/workspace.md)。

### 本地开发

Node.js 22：

```bash
npm ci
npm run dev
```

访问 `http://localhost:3000/zh/` 或 `http://localhost:3000/en/`。

公开仓库数据只在显式执行 `npm run sync:projects` 时更新；构建不会联网改写输入。同步结果需要作为普通代码差异审查后提交。

Python 3.12：

```bash
python -m pip install -e "apps/api[dev]" -e "apps/worker"
iweioo-api
```

平台 API 健康端点为 `http://127.0.0.1:8000/v1/health/live` 和 `/v1/health/ready`。Worker 可用 `iweioo-worker --healthcheck` 检查进程骨架。

本地统一身份环境使用 Keycloak、独立 PostgreSQL 和 Mailpit，不会发送真实邮件。配置与启动说明见 [`deploy/keycloak/README.md`](deploy/keycloak/README.md)。首次启动前必须从模板创建被忽略的本地密码文件。

### 质量验证

```bash
npm run generate:sdk
npm run identity:validate
npm run lint
npm run typecheck
npm test
npm run build
python -m ruff check apps/api apps/worker
python -m mypy apps/api/src apps/worker/src
python -m pytest
```

Web 静态产物位于 `apps/web/out/`。CI 会拒绝 SDK 生成结果漂移。

### 域名、许可与安全

- 规范仓库：<https://github.com/buan496/iweioo-platform>
- 规范域名：`iweioo.com`
- 联系邮箱：`contact@iweioo.com`
- 源码许可：`AGPL-3.0-only`

`iweioo` 名称、Logo 和品牌资产由 `TRADEMARKS.md` 单独约束。安全问题必须按照 `SECURITY.md` 私密报告。贡献流程与 DCO 签署规则见 `CONTRIBUTING.md`。

## English

### Overview

This is the open-source platform repository for `iweioo.com`, an AI learning platform for university students. The portal presents products, writing, about, and open-source work. The technical-interview and thesis-defense products stay independently deployable and integrate through shared identity, usage, and privacy contracts.

The current release is a Stage 1 engineering foundation, not a public-product claim:

- `iweioo.com`: bilingual platform portal and content;
- `interview.iweioo.com`: interview training, marked in development;
- `defense.iweioo.com`: thesis-defense agent, marked in development;
- `auth.iweioo.com` and billing: accepted contracts only; implementation follows later.

### Repository layout

```text
apps/
  web/       Next.js platform portal
  api/       FastAPI platform API skeleton
  worker/    asynchronous worker skeleton
packages/
  ui/        shared UI incubation package
  sdk/       OpenAPI-generated types and platform boundaries
contracts/   HTTP, event, and product onboarding manifests
deploy/      deployment adapters
docs/        architecture and delivery documentation
tests/       cross-runtime contract tests
```

The interview and defense product source code does not move into this repository. See the [architecture baseline](docs/architecture/README.md) and [workspace guide](docs/architecture/workspace.md).

### Local development

With Node.js 22:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/zh/` or `http://localhost:3000/en/`.

Public repository data changes only when `npm run sync:projects` is run explicitly. Builds never rewrite their inputs from the network; review and commit sync output as a normal code change.

With Python 3.12:

```bash
python -m pip install -e "apps/api[dev]" -e "apps/worker"
iweioo-api
```

The platform API exposes `/v1/health/live` and `/v1/health/ready`. Use `iweioo-worker --healthcheck` for a one-shot worker process check.

The local identity environment uses Keycloak, a dedicated PostgreSQL database,
and Mailpit without sending real email. See
[`deploy/keycloak/README.md`](deploy/keycloak/README.md); create the ignored
local password file from its template before first start.

### Quality checks

```bash
npm run generate:sdk
npm run identity:validate
npm run lint
npm run typecheck
npm test
npm run build
python -m ruff check apps/api apps/worker
python -m mypy apps/api/src apps/worker/src
python -m pytest
```

The static web output is written to `apps/web/out/`. CI rejects generated SDK drift.

### Domain, license, and security

- Canonical repository: <https://github.com/buan496/iweioo-platform>
- Canonical domain: `iweioo.com`
- Contact: `contact@iweioo.com`
- Source license: `AGPL-3.0-only`

The iweioo name, logo, and brand assets are governed separately by `TRADEMARKS.md`. Report security issues privately under `SECURITY.md`. See `CONTRIBUTING.md` for workflow and DCO sign-off requirements.
