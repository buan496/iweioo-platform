# Legacy static deployment notes

This file describes the `v0.1.0` static blog baseline. It is not the production
deployment plan for the iweioo platform. See the
[platform system architecture](architecture/system-architecture.md) and
[delivery plan](architecture/delivery-plan.md) for the accepted mainland-China
deployment direction.

## Local Static Build

```bash
npm run build
npm run preview
```

The deployable output is `out/`.

## Static preview VPS option

For a temporary static preview on an authorized VPS:

1. Build locally or in CI with `npm run build`.
2. Upload the contents of `out/` to the server, for example `/var/www/iweioo.com`.
3. Serve the folder with Nginx or Caddy.
4. Configure TLS only after the intended DNS and filing requirements are met.

Example Nginx server block:

```nginx
server {
    listen 80;
    server_name iweioo.com www.iweioo.com;
    root /var/www/iweioo.com;
    index index.html;

    location / {
        try_files $uri $uri/ /404.html;
    }
}
```

## Email Routing

For the first stage, route:

```txt
contact@iweioo.com -> jingw9992@gmail.com
```

Cloudflare Email Routing is a practical option if the domain is managed by Cloudflare. A domain registrar with mail forwarding can also work.

Sending as `contact@iweioo.com` from Gmail requires a sending provider or SMTP service that can verify and send for the domain. Do not rely on forwarding alone for outbound identity.
