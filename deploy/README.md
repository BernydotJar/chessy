# Chessy deployment — shared Textiles edge

Target: `https://chessy.textilesdemedellin.com`

Architecture: existing `cloud-sandbox-mac` tunnel -> shared Caddy -> shared `cloud-sandbox-edge` network -> existing `dev-main` workstation container -> supervised Chessy release server. No additional application container or tunnel is required.

The production process serves the verified `dist/` artifact and exposes only `/health` plus public SPA assets. `/internal`, `/metrics`, `/meta`, `/ready`, `/debug`, and `/admin` return 404.

Application port: `14176` on the existing workstation container; no extra relay or Chessy container is created. Health: `GET /health`.

Recovery order: verify application process -> `http://<workspace-ip>:14176/health` -> shared Caddy host route -> Cloudflare tunnel/DNS -> public HTTPS. Restart only Chessy when the origin fails; do not restart unrelated products.
