# Portal deployment notes

The portal now uses the Next.js Node runtime because its OIDC BFF must execute
server-side. The former `v0.1.0` static upload procedure is retired; there is no
current `apps/web/out/` deployment artifact.

This is still not the production deployment plan for the iweioo platform. See
the [platform system architecture](architecture/system-architecture.md) and
[delivery plan](architecture/delivery-plan.md) for the accepted mainland-China
direction.

## Local production-mode build

Configure the ignored portal environment as described in the
[local identity runbook](../deploy/keycloak/README.md), then run:

```bash
npm ci
npm run build
npm run preview
```

The build is written under `apps/web/.next/`. Public content routes are
prerendered, while authentication route handlers require the Node process and
Redis at runtime.

## Production gates

A production deployment must provide HTTPS origins, a confidential Keycloak
client secret, private Redis over TLS or a strictly loopback-only connection,
reverse-proxy header validation, and persistent process supervision.
`APP_ORIGIN` and the Keycloak callback and post-logout URI must match exactly.
The local Compose profile, `start-dev`,
Mailpit, loopback ports, bootstrap administrator, and localhost client routes
must never be reused in staging or production.

The server image, reverse proxy, secret delivery, health/readiness endpoint,
backup scope, rollback, and staging evidence remain future delivery slices.

## Email Routing

For the first stage, route:

```txt
contact@iweioo.com -> jingw9992@gmail.com
```

Cloudflare Email Routing is a practical option if the domain is managed by Cloudflare. A domain registrar with mail forwarding can also work.

Sending as `contact@iweioo.com` from Gmail requires a sending provider or SMTP service that can verify and send for the domain. Do not rely on forwarding alone for outbound identity.
