# Chessy deployment — shared Textiles edge

Target: `https://chessy.textilesdemedellin.com`

Architecture: existing `cloud-sandbox-mac` tunnel -> shared Caddy -> existing `dev-main` workstation -> supervised Chessy release server. No additional application container or tunnel is required.

The production process serves the verified `dist/` artifact and exposes only `/health` plus public SPA assets. `/internal`, `/metrics`, `/meta`, `/ready`, `/debug`, and `/admin` return 404.

Default application/relay port: `14176` on the workstation. Health: `GET /health`.

Recovery order: verify application process -> `http://<workspace-ip>:14176/health` -> shared Caddy host route -> Cloudflare tunnel/DNS -> public HTTPS. Restart only Chessy when the origin fails; do not restart unrelated products.
