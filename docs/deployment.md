# Deployment Notes

This project is designed for static hosting first.

## Local Static Build

```bash
npm run build
npm run preview
```

The deployable output is `out/`.

## VPS Option

After buying the Hong Kong VPS:

1. Build locally or in CI with `npm run build`.
2. Upload the contents of `out/` to the server, for example `/var/www/iweioo.com`.
3. Serve the folder with Nginx or Caddy.
4. Configure TLS after DNS points to the VPS.

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
