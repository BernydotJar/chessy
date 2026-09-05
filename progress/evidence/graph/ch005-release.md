# CH-005 Release gate — publication

PASS. Chessy is publicly deployed at `https://chessy.textilesdemedellin.com/`.

Application release identity: `ad42cf17f4bc435f09ce1d31c74cb88a69fa3a8e`.
Public health: HTTP 200 with exact release identity through Cloudflare.
Public root: HTTP 200 over verified TLS.
Blocked internal paths: PASS (404).
Registry state: `active`, `reconciliation_state=converged`, `last_result=DEPLOYED_PUBLIC_WEB`.
Runtime model: existing workspace-supervised static gateway on port 14176 behind shared edge; new application containers: 0.
Persistence: supervisor plus workstation autostart and host edge-link LaunchDaemon were installed by the authorized host handoff.

The earlier publication blocker is resolved by the successful host-side finalizer and independently verified public HTTPS. Product state is eligible for COMPLETED.
