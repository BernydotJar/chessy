# CH-005 Critic / red-team — final release

PASS with no material blocker open for application release `ad42cf17f4bc435f09ce1d31c74cb88a69fa3a8e`.

Independent IBM Granite critic source: `/shared-auth/critic/raw/chessy/ad42cf17f4bc435f09ce1d31c74cb88a69fa3a8e/risk-raw.json`.
The model was `ibm/granite3.3:2b` and returned the contractual result `{"reviewed_sha":"ad42cf17f4bc435f09ce1d31c74cb88a69fa3a8e","v":"P","f":"NONE"}`.

A separate rubric response that did not preserve the required release-SHA schema was rejected and is not counted as release authority. The red-team record therefore relies only on the valid exact-SHA critic result plus independent CI/browser/chess verification.

Release-specific risks checked: stale SHA publication, fake chess/accuracy claims, challenge legality, engine state races, accessibility/i18n regressions, dependency vulnerabilities, public exposure of internal routes, TLS/edge routing, and accidental creation of a product-specific container. No blocking finding remains.
