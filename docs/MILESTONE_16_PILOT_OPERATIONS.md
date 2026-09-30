# Milestone 16 — Pilot Operations and Operator Console

Starting checkpoint: M15 commit `ac384864426c1e30b201275d21c8f30330322348` on the new `milestone-16-pilot-operations` branch. M15 history is unchanged. M16 adds operator workflow only; WatchLayer rule and evidence semantics are unchanged.

## Architecture checkpoint

The existing Regstead HTTP service now owns a private, server-rendered `/admin` surface. It uses the same repository, `Operations`, `Billing`, `Notifications`, immutable artifact store and `releaseReport` functions as the CLI. The console does not implement a second review, release, billing or retry model. The CLI remains the emergency interface.

The admin route inventory is:

- `GET/POST /admin/login` and `GET/POST /admin/auth/verify`
- `POST /admin/logout`
- `GET /admin`
- `GET /admin/onboard` and `POST /admin/onboard`
- `GET /admin/organisations` and `GET /admin/organisations/:organisationId`
- `GET /admin/review` and `GET /admin/review/:reportId`
- `POST /admin/review/:reportId/:findingId`
- `POST /admin/reports/:reportId/release`
- `GET /admin/reports`, `GET /admin/reports/:reportId`, and `GET /admin/reports/:reportId/download`
- `GET /admin/billing`
- `GET /admin/operations`
- `POST /admin/sites/:siteId/pause|resume`
- `POST /admin/jobs/:jobId/retry`
- `POST /admin/webhooks/:webhookId/retry`
- `POST /admin/notifications/:notificationId/retry`
- `POST /admin/billing/:organisationId/manage`

## Operator authentication decision

Operator authentication is passwordless and allowlisted. An existing authenticated CLI operator creates, lists, disables and invites operator identities. There is no browser registration route. A login request returns the same generic response for known and unknown addresses.

Tokens contain 32 random bytes; only SHA-256 hashes are persisted. Links expire after 15 minutes and are single-use. A successful login rotates any supplied old session. Operator sessions are opaque, server-side, four-hour sessions and use distinct Strict SameSite cookies from customer sessions. Disabling an operator revokes its sessions and links.

Every POST requires the exact configured HTTPS Origin, a valid server-side session and a one-time or session-bound CSRF token. The service also enforces the configured Host and trusted TLS proxy, bounded forms, login/verification rate limits, restrictive CSP, frame denial, no-store responses and HTML escaping. Operator login, logout, identity changes, review, release, retries, pause/resume and billing handoff are audited without tokens. The initial role is `ADMIN`; no broader role or public identity model was added.

Commercial migration 3 transactionally adds operator user, link and session collections to the existing `monitor-v1` payload. Migration 2 customer and commercial history is preserved. Restores revoke both customer and operator links/sessions.

## Console behavior

The dashboard presents readiness, worker heartbeat, queued/running/review/failed jobs, unreleased reports, active/past-due/cancelled subscription counts, failed webhooks/emails, next scheduled runs and pilot metrics. Dedicated Billing and Operations views expose provider-authoritative subscription state and bounded retry controls without exposing provider identifiers. Metrics are derived from existing operational records: scan duration, release turnaround, individual review decisions, accepted/failed notification state, job failures/retries and overdue schedules. No marketing analytics or customer surveillance was added.

Organisation pages show identity, contact, primary hostname, selected pack, confirmation state, monitoring state, subscription state, latest scan/report and current-period information. Stripe IDs never appear in HTML and are never accepted from browser input. Billing Portal sessions are resolved server-side from the organisation.

The review queue counts findings by raw status, severity and confidence. The review page shows raw status, rule/version, severity, confidence, applicability, source URL, service context, unknown reason codes, evidence and comparison baseline. Every form records one finding decision. There is no bulk approval route. Release is shown only when every finding has a latest decision, requires typing `RELEASE`, and still passes the existing concurrent-review and immutable-artifact gates.

First-baseline reports display an operator warning that continuity checks lack a prior comparison baseline. Raw UNKNOWN/NOT_APPLICABLE states and evidence remain unchanged.

## Pack-assignment safeguard

New onboarding requires the exact `lawwatch-england-wales` pack, an explicit pack-confirmation checkbox and an operator choice between `ESTABLISHED` and `NOT_ESTABLISHED` sector applicability. Both choices are persisted with actor/time and audited. `NOT_ESTABLISHED` remains a visible warning; it does not silently suppress rules or imply that the site is a law firm. Existing legacy sites remain readable and are labelled unconfirmed when no historical confirmation exists.

## Validation corpus

`tests/milestone16-admin.test.ts` covers operator identity, hashed links/sessions, rotation, expiry, single use, disablement, rate limiting, HTTPS/Host/Origin/CSRF/CSP, pack confirmation, uncertain applicability, dashboard metrics, organisation data boundaries, individual review, release gating, artifact integrity, pause/resume, durable retry, Billing Portal ownership, migration 3, and 390/1280-pixel browser layouts.

Generated screenshots are written to ignored local evidence paths:

- `reports/milestone16/admin-390.png`
- `reports/milestone16/admin-1280.png`

Final local validation passed 937 tests across 42 files, including 23 M16-focused tests, plus the 105-test selective-browser suite. Type checking and the production build passed, and the dependency audit reported zero known vulnerabilities. The immutable 50-firm corpus remained at 233 PASS, 53 WARNING, 564 UNKNOWN and zero POTENTIAL_ISSUE results across 850 checks. Serious controls remained 4 TP / 0 FP / 0 FN. The M10 review remained 71.25% exact agreement, 81.25% firm-wide agreement and 0/30 false service assignments. These preserved-corpus figures are regression evidence, not live pilot accuracy estimates.

## Boundaries and limitations

- M16 does not change rules, detector outcomes, PDF/browser evidence, service attribution or customer report semantics.
- Operator access is suitable for a closely supervised small team. Additional roles require an evidenced need.
- Metrics are operational aggregates from the single commercial state document; they are not a general analytics system.
- The console does not edit Stripe subscription state. Cancellation remains in Stripe Billing Portal and verified webhooks remain authoritative.
- No production environment, DNS, live Stripe object, live charge or WordPress content is changed by M16.

## Completion recommendation

Use the console for a supervised 3–5 firm pilot after the legal/commercial approvals in the production plan are complete. Observe actual review load, recurring scan reliability and support demand before proposing further roles, automation or rule coverage.
