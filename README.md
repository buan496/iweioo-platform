# iweioo-platform

[中文](#中文) | [English](#english)

## 中文

### 项目简介

这是 `iweioo.com` 面向大学生的开源 AI 学习平台仓库。平台门户统一呈现产品、博客、关于和开源项目；大厂面试训练与论文答辩 Agent 继续作为独立应用部署在各自子域名，并通过统一身份、用量和隐私契约接入。

当前版本已完成 Stage 1 工程基础，并进入 Stage 2 身份与账户数据接入，不代表产品已经开放：

- `iweioo.com`：双语平台门户与内容栏目；
- `account.iweioo.com`：独立账户中心，当前已完成身份、持久化资料、版本化授权、产品注册表与多设备会话管理；
- `interview.iweioo.com`：大厂面试训练，状态为建设中；
- `defense.iweioo.com`：论文答辩 Agent，状态为建设中；
- 统一身份：本地 Keycloak、共享 OIDC BFF、门户与账户中心单点登录已实现；生产 `auth.iweioo.com` 仍属于后续部署；
- 计费能力：当前只有已批准契约，真实实现属于后续阶段。

### 仓库结构

```text
apps/
  web/       Next.js 平台门户
  account/   Next.js 账户中心
  api/       FastAPI 平台 API
  worker/    异步 Worker 骨架
packages/
  auth-bff/  共享的服务端 OIDC BFF
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
npm run dev:account
```

门户访问 `http://localhost:3000/zh/` 或 `http://localhost:3000/en/`；账户中心
访问 `http://localhost:3001/zh/` 或 `http://localhost:3001/en/`。两个开发服务
需要分别运行。

公开仓库数据只在显式执行 `npm run sync:projects` 时更新；构建不会联网改写输入。同步结果需要作为普通代码差异审查后提交。

Python 3.12：

```bash
python -m pip install -e "apps/api[dev]" -e "apps/worker"
alembic -c apps/api/alembic.ini upgrade head
iweioo-api sync-applications --manifest-dir contracts/applications
iweioo-api
```

平台 API 使用独立 PostgreSQL 保存账户资料、授权证据、应用注册表与用户产品状态，健康端点为
`http://127.0.0.1:8000/v1/health/live` 和 `/v1/health/ready`。本地数据库默认仅绑定
`127.0.0.1:5433`；配置模板和启动说明见 [`apps/api/.env.example`](apps/api/.env.example)
与 [`deploy/compose/README.md`](deploy/compose/README.md)。Worker 可用
`iweioo-worker --healthcheck` 检查进程骨架。

本地统一身份环境使用 Keycloak、独立 PostgreSQL、Mailpit 和仅保存临时
BFF 会话的 Redis，不会发送真实邮件。门户与账户中心通过共享服务端包实现
Authorization Code + PKCE、服务端令牌存储、邮箱验证、统一登录和 CSRF
防护注销，但各自保留独立客户端、Cookie 与 Redis 记录命名空间；共享的用户会话索引
允许账户中心列出和撤销各应用的 BFF 会话。账户浏览器不会接触
平台 API Bearer Token，所有账户数据请求都由账户 BFF 转发。配置与启动说明
见 [`deploy/keycloak/README.md`](deploy/keycloak/README.md)。首次启动前必须从
模板创建被忽略的身份密码文件和两个应用环境文件。

### 质量验证

```bash
npm run generate:sdk
npm run identity:validate
npm run platform-data:validate
npm run lint
npm run typecheck
npm test
npm run build
python -m ruff check apps/api apps/worker
python -m mypy apps/api/src apps/worker/src
python -m pytest
```

门户与账户中心均使用 Next.js Node 运行时，生产构建分别位于
`apps/web/.next/` 与 `apps/account/.next/`；公开页面仍在构建时预渲染，认证
路由按请求运行。CI 会拒绝 SDK 生成结果漂移，并在临时 PostgreSQL 上验证迁移的
升级、回滚、再次升级和账户数据模型。

### 域名、许可与安全

- 规范仓库：<https://github.com/buan496/iweioo-platform>
- 规范域名：`iweioo.com`
- 联系邮箱：`contact@iweioo.com`
- 源码许可：`AGPL-3.0-only`

`iweioo` 名称、Logo 和品牌资产由 `TRADEMARKS.md` 单独约束。安全问题必须按照 `SECURITY.md` 私密报告。贡献流程与 DCO 签署规则见 `CONTRIBUTING.md`。

## English

### Overview

This is the open-source platform repository for `iweioo.com`, an AI learning platform for university students. The portal presents products, writing, about, and open-source work. The technical-interview and thesis-defense products stay independently deployable and integrate through shared identity, usage, and privacy contracts.

The current release has completed the Stage 1 engineering foundation and has
entered Stage 2 identity and account-data integration. It is not a public-product claim:

- `iweioo.com`: bilingual platform portal and content;
- `account.iweioo.com`: independently deployable account center with identity,
  durable profiles, versioned consent, registered products, and multi-device session controls;
- `interview.iweioo.com`: interview training, marked in development;
- `defense.iweioo.com`: thesis-defense agent, marked in development;
- identity: local Keycloak, the shared OIDC BFF, and portal/account SSO are
  implemented; production `auth.iweioo.com` deployment follows later;
- billing: accepted contracts only; implementation follows later.

### Repository layout

```text
apps/
  web/       Next.js platform portal
  account/   Next.js account center
  api/       FastAPI platform API
  worker/    asynchronous worker skeleton
packages/
  auth-bff/  shared server-only OIDC BFF
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
npm run dev:account
```

Run the two development commands in separate terminals. Open the portal at
`http://localhost:3000/zh/` or `/en/`, and the account center at
`http://localhost:3001/zh/` or `/en/`.

Public repository data changes only when `npm run sync:projects` is run explicitly. Builds never rewrite their inputs from the network; review and commit sync output as a normal code change.

With Python 3.12:

```bash
python -m pip install -e "apps/api[dev]" -e "apps/worker"
alembic -c apps/api/alembic.ini upgrade head
iweioo-api sync-applications --manifest-dir contracts/applications
iweioo-api
```

The Platform API stores account profiles, consent evidence, the application
registry, and per-user product state in a dedicated PostgreSQL database and
exposes `/v1/health/live` and `/v1/health/ready`. The
local database binds to `127.0.0.1:5433` only; see
[`apps/api/.env.example`](apps/api/.env.example) and
[`deploy/compose/README.md`](deploy/compose/README.md). Use
`iweioo-worker --healthcheck` for a one-shot worker process check.

The local identity environment uses Keycloak, a dedicated PostgreSQL database,
Mailpit, and Redis for ephemeral BFF state without sending real email. The
portal and account center use the shared server-only BFF for Authorization Code
with PKCE, server-side token storage, verified email, SSO, and CSRF-protected
logout while retaining separate clients, cookies, and Redis record namespaces.
A shared user-session index lets the account center list and revoke BFF sessions
across participating applications. The
account browser never receives the Platform API bearer token; its BFF proxies
all account-data requests. See
[`deploy/keycloak/README.md`](deploy/keycloak/README.md); create the ignored
identity password and both application environment files before first start.

### Quality checks

```bash
npm run generate:sdk
npm run identity:validate
npm run platform-data:validate
npm run lint
npm run typecheck
npm test
npm run build
python -m ruff check apps/api apps/worker
python -m mypy apps/api/src apps/worker/src
python -m pytest
```

Both Next.js applications use the Node runtime and build into their respective
`apps/web/.next/` and `apps/account/.next/` directories. Public routes remain
prerendered while authentication routes execute on demand. CI rejects generated
SDK drift and verifies migration upgrade, rollback, second upgrade, and the
account schema against an ephemeral PostgreSQL database.

### Domain, license, and security

- Canonical repository: <https://github.com/buan496/iweioo-platform>
- Canonical domain: `iweioo.com`
- Contact: `contact@iweioo.com`
- Source license: `AGPL-3.0-only`

The iweioo name, logo, and brand assets are governed separately by `TRADEMARKS.md`. Report security issues privately under `SECURITY.md`. See `CONTRIBUTING.md` for workflow and DCO sign-off requirements.
