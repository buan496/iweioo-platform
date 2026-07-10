# iweioo-platform

[中文](#中文) | [English](#english)

## 中文

### 项目简介

这是 `iweioo.com` 面向大学生的开源 AI 学习平台仓库。平台门户统一呈现产品、博客、关于和开源项目；大厂面试训练与论文答辩 Agent 继续作为独立应用部署在各自子域名，并通过统一身份、用量和隐私契约接入。

当前版本已完成 Stage 1 工程基础，并进入 Stage 2 身份接入，不代表产品已经开放：

- `iweioo.com`：双语平台门户与内容栏目；
- `interview.iweioo.com`：大厂面试训练，状态为建设中；
- `defense.iweioo.com`：论文答辩 Agent，状态为建设中；
- 统一身份：本地 Keycloak 与门户 OIDC BFF 已实现；生产 `auth.iweioo.com` 仍属于后续部署；
- 计费能力：当前只有已批准契约，真实实现属于后续阶段。

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

本地统一身份环境使用 Keycloak、独立 PostgreSQL、Mailpit 和仅保存临时
BFF 会话的 Redis，不会发送真实邮件。门户已经实现 Authorization Code +
PKCE、服务端令牌存储、邮箱验证、统一登录和 CSRF 防护注销。配置与启动
说明见 [`deploy/keycloak/README.md`](deploy/keycloak/README.md)。首次启动前
必须从模板创建被忽略的身份密码文件和门户环境文件。

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

Web 使用 Next.js Node 运行时，生产构建位于 `apps/web/.next/`；公开内容页仍
在构建时预渲染，认证路由按请求运行。CI 会拒绝 SDK 生成结果漂移。

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
entered Stage 2 identity integration. It is not a public-product claim:

- `iweioo.com`: bilingual platform portal and content;
- `interview.iweioo.com`: interview training, marked in development;
- `defense.iweioo.com`: thesis-defense agent, marked in development;
- identity: local Keycloak and the portal OIDC BFF are implemented; production
  `auth.iweioo.com` deployment follows later;
- billing: accepted contracts only; implementation follows later.

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
Mailpit, and Redis for ephemeral BFF state without sending real email. The
portal implements Authorization Code with PKCE, server-side token storage,
verified email, SSO, and CSRF-protected logout. See
[`deploy/keycloak/README.md`](deploy/keycloak/README.md); create the ignored
identity password and portal environment files before first start.

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

The Web app uses the Next.js Node runtime and builds into `apps/web/.next/`.
Public content remains prerendered while authentication routes execute on
demand. CI rejects generated SDK drift.

### Domain, license, and security

- Canonical repository: <https://github.com/buan496/iweioo-platform>
- Canonical domain: `iweioo.com`
- Contact: `contact@iweioo.com`
- Source license: `AGPL-3.0-only`

The iweioo name, logo, and brand assets are governed separately by `TRADEMARKS.md`. Report security issues privately under `SECURITY.md`. See `CONTRIBUTING.md` for workflow and DCO sign-off requirements.
