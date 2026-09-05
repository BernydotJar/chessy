# CH-005 Independent verification — final release

PASS for application release `ad42cf17f4bc435f09ce1d31c74cb88a69fa3a8e`.

Evidence:
- GitHub Actions workflow `Verify Chessy release`, run `33939745418`, completed successfully on the exact final application SHA.
- Local verification: 163/163 unit/integration tests PASS and production build PASS.
- Browser verification: 25/25 workflows PASS, zero page errors, automated accessibility coverage across all nine views.
- Independent chess implementation (`python-chess`) validates 112/112 shipped challenge lines.
- npm audit evidence reports 0 vulnerabilities.
- Public DNS is visible through both Cloudflare and Google resolvers.
- Public HTTPS `/health` returns HTTP 200 through both Cloudflare A records and reports exact application SHA `ad42cf17f4bc435f09ce1d31c74cb88a69fa3a8e`.
- Public `/` returns HTTP 200 with TLS verification success.
- `/internal`, `/metrics`, `/admin`, and `/ready` return HTTP 404 at the public edge.
- Deployment reuses the existing supervised workspace, shared Caddy, `cloud-sandbox-edge`, and existing `cloud-sandbox-mac` tunnel; no application container was created.

Canonical deployment evidence: `/shared-auth/deployment/evidence/chessy-public-deploy-20260905.json`.
