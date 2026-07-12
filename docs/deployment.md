# Portal and account deployment notes

The portal and account center use separate Next.js Node runtimes because each
OIDC BFF must execute server-side and own a host-local session. The former
`v0.1.0` static upload procedure is retired; neither application has a static
`out/` deployment artifact.

This is still not the production deployment plan for the iweioo platform. See
the [platform system architecture](architecture/system-architecture.md) and
[delivery plan](architecture/delivery-plan.md) for the accepted mainland-China
direction.

## Local production-mode build

Configure both ignored application environments as described in the
[local identity runbook](../deploy/keycloak/README.md), then run:

```bash
npm ci
npm run build
npm run preview
npm run preview:account
```

Before starting the account process, provision the Platform PostgreSQL database,
export the variables from `apps/api/.env.example`, and run:

```bash
alembic -c apps/api/alembic.ini upgrade head
iweioo-api
```

Builds are written under `apps/web/.next/` and `apps/account/.next/`. Public
routes are prerendered, while authentication route handlers require their
respective Node process and Redis at runtime. Production must route
`iweioo.com` and `account.iweioo.com` to separate processes even if both run on
the initial single server.

## Production gates

A production deployment must provide HTTPS origins, a separate confidential
Keycloak client secret for each application, private Redis over TLS or a
strictly loopback-only connection,
reverse-proxy header validation, and persistent process supervision.
Each `APP_ORIGIN` and its Keycloak callback and post-logout URI must match
exactly. `NEXT_PUBLIC_ACCOUNT_URL` must resolve to the account HTTPS origin.
The Account BFF must reach the private Platform API, and the API must use a
dedicated PostgreSQL credential plus HTTPS issuer/JWKS endpoints. Database
migrations run as a release step before traffic, never from web or API startup.
The local Compose profile, `start-dev`,
Mailpit, loopback ports, bootstrap administrator, and localhost client routes
must never be reused in staging or production.

The server image, reverse proxy, secret delivery, production probe wiring,
backup scope, rollback, and staging evidence remain future delivery slices.

## Email Routing

For the first stage, route:

```txt
contact@iweioo.com -> jingw9992@gmail.com
```

Cloudflare Email Routing is a practical option if the domain is managed by Cloudflare. A domain registrar with mail forwarding can also work.

Sending as `contact@iweioo.com` from Gmail requires a sending provider or SMTP service that can verify and send for the domain. Do not rely on forwarding alone for outbound identity.
