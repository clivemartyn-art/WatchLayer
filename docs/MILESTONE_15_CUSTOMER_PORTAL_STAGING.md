# Milestone 15 — Customer portal and staging readiness

## Status: COMPLETE — hosted staging and lifecycle gates passed

Starting M14.1 SHA: `21f72ef45e78edf6775a469590c04b93247e2202`.
Branch: `milestone-15-customer-portal-staging`. No merge or M16 work.

The exact clean baseline was reproduced before creating the branch: 859 tests, 104 browser tests, typecheck/build, audit zero, preserved 50-firm corpus and M10 unchanged, serious controls 4 TP / 0 FP / 0 FN. Logs: `reports/milestone15/baseline`.

The portal is deployed at `https://app.regstead.co.uk`. Real Stripe sandbox Checkout/payment/webhooks, baseline and genuine scheduled monitoring execution, human review, two immutable released reports, Resend delivery, customer sign-in/report access, Billing Portal handoff, payment failure/recovery/cancellation/re-subscription, product isolation, container restart/persistence, Chromium launch, and deployed backup/isolated restore have passed. The final source commit and exact-SHA redeployment are recorded in the completion handoff; no merge to `main` was performed.

## Architecture and routes

The existing Regstead HTTP service now optionally hosts a small server-rendered Customer Portal. It uses the same commercial repository and released artifact store; there is no second customer database, SPA or public registration. WatchLayer evidence behavior is unchanged.

| Route | Purpose |
| --- | --- |
| GET/POST `/portal/login` | Request access using a preauthorised email |
| GET/POST `/portal/auth/verify` | Show confirmation, then consume a single-use link |
| POST `/portal/logout` | Revoke server session and clear cookies |
| GET `/portal` | Organisation dashboard and latest customer-ready report |
| GET `/portal/reports` | Released report history, newest release first |
| GET `/portal/reports/:id` | Owned, hash-checked immutable HTML |
| GET `/portal/reports/:id/download` | Same bytes with safe attachment filename |
| POST `/portal/billing/manage` | Resolve linked Stripe customer server-side |
| GET `/portal/account` | Read-only contact, organisation and website |
| GET `/portal/assets/<allowlisted-font>` | Self-hosted Inter/Manrope font assets |

PortalUser records contain an organisation link, normalised unique email, display name, OWNER role, ACTIVE/DISABLED status, explicit operator pilot approval and timestamps. Creating a user requires paid entitlement or explicit pilot approval. No form lead becomes a portal user automatically. Disabling revokes sessions and outstanding links. Cancellation preserves authorised access to released history.

## Authentication, sessions and security

- Magic links and sessions use 32 random bytes. Only SHA-256 hashes are stored. Links expire after 15 minutes; sessions after eight hours, without sliding extension.
- GET verification is a confirmation page, so an email scanner cannot consume the link simply by opening it. POST redemption consumes it atomically and rotates any supplied old session.
- Raw login tokens exist only in the request/email-provider call, not the database, spool or audit. Authentication email cannot use the development spool. Delivery failure invalidates the link; request a new link rather than reconstructing its plaintext.
- Session and form cookies use the `__Host-` prefix, HttpOnly, Secure, SameSite=Lax and Path=/, with no Domain attribute. Logout revokes the server record.
- Every customer object lookup derives organisation from the server session; route IDs never grant ownership. No Stripe IDs are accepted from the browser or rendered in the dashboard.
- Persistent rate limits: 20 login requests per socket peer per 15 minutes, three per email, 20 verification attempts per peer, 60 form requests per peer, five billing handoffs per user. A trusted proxy currently shares one peer bucket; this is deliberately conservative for the five-customer pilot. Do not trust arbitrary forwarded client IPs.
- POST requires the configured exact Origin. Host must equal the configured HTTPS origin. Direct TLS or an explicitly configured trusted ingress socket peer with HTTPS forwarding is required.
- Login/confirmation forms use single-use server-backed CSRF challenges bound to a cookie. Authenticated forms use session-bound CSRF secrets.
- CSP defaults to none; CSS is hash-authorised and fonts self-hosted. Reports use a separate sandbox CSP. Framing is denied, responses are non-cacheable, HTML escaped, and redirects limited to local portal paths or the exact Stripe Billing Portal origin.
- **Approved Referrer-Policy decision:** `strict-origin` avoids transmitting paths/query tokens while allowing form Origin validation. Clive explicitly approved this on 29 September 2026 after browser tests showed `no-referrer` caused a null Origin. It discloses only the origin to HTTPS destinations. Proxy access logs must not record sign-in query strings; the supplied Caddy configuration does not enable access logging.
- Audit stores IDs for login request/success, logout, report view/download and billing handoff. Authentication tokens and provider error bodies are not logged.

## Report privacy and immutability

M14 artifacts included reviewer names and internal notes. New releases omit those fields and internal scan/build metadata. Explicit customer title/explanation annotations remain supported; suppressed findings are omitted. A frozen summary is computed from non-suppressed reviewed findings at release, alongside `customerVersion: 1` and the immutable hash.

The portal requires RELEASED status, the customer-safe version, summary, artifact and hash, plus organisation ownership. It never derives a summary from draft/raw results, exposes internal queues or regenerates an old artifact on view. Hash mismatch fails closed. No PDF download is advertised because the operational layer releases HTML only.

Older artifacts without the customer-safe marker are withheld, not rewritten. They remain in operator history. A new reviewed scan/recheck can supply a safe customer artifact. This migration intentionally does not certify old reports as safe merely because they were previously released.

## Monitoring and billing presentation

Dashboard displays the owned hostname, monitoring pause/entitlement state, last successful scan, latest release and scheduled time when eligible. Pending/incomplete job data is not presented as a report. Dates are labelled UTC. Subscription truth older than 24 hours is explicitly marked as needing confirmation; the portal never fetches a paid state from browser input.

Regstead Monitor remains £16.99/month for one primary website; Scan remains £0. VAT/tax treatment is still a launch approval. Billing management uses the existing server-linked customer and exact hosted Stripe Billing Portal destination. It remains separate from this Customer Portal.

## Email adapter

`ResendEmailProvider` implements the existing EmailProvider interface without a new SDK dependency. It sends directly to `/emails` with the deterministic notification ID as `Idempotency-Key`, and persists the message hash, attempt start, lease, acknowledgement or failure. The runtime does not call the Domains API, so a send-only restricted key is sufficient after the sender has been verified administratively. API keys and message bodies are not stored in its ledger.

Provider acknowledgement means accepted, not delivered to an inbox. `SENT` remains the legacy outbox acceptance status; audit now distinguishes `email_spooled` from `email_provider_accepted`. Do not describe spool acceptance as real email delivery.

Provider deduplication is limited to 24 hours; automatic retries are refused after 23 hours from the first attempt and require operator reconciliation. A changed message under the same identity is rejected. Ambiguous authentication delivery is not replayed: the token is invalidated and the customer requests a fresh link.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys). The staging sender and real delivery path were exercised successfully. Provider acceptance remains distinct from inbox delivery.

## Migration and database decision

Commercial migration 2 upgrades M14.1 `monitor-v1` payloads transactionally by adding portal identity/session/link/form/rate-limit collections and an email acknowledgement ledger. Existing commercial/evidence history is preserved. Fresh databases execute migrations 1 and 2. Unknown legacy founding schemas remain rejected. SQLite migration/reopen tests are real; PostgreSQL remains a contract-tested adapter and is not claimed as server-validated.

The proposed five-customer pilot topology deliberately uses **single-host SQLite on a durable local volume**, one HTTP service and one worker with concurrency 1. This matches the current aggregate locking model and avoids claiming PostgreSQL validation without a server. It is not a multi-host/shared-network-filesystem design. If PostgreSQL is selected for launch instead, real migration/restart/concurrency/session/outbox/restore validation is still required.

## Staging topology and container

`deploy/staging.compose.yml` and `deploy/Caddyfile` provide HTTPS Caddy ingress, internal-only HTTP service, worker, shared `/data` volume, TLS storage, external secret env file, and separate backup destination. The ingress uses `172.30.15.254`; the service trusts only its IPv4-mapped peer `::ffff:172.30.15.254`. Container defaults place database/engine/report/spool storage under `/data`; application files remain owned by root while runtime uses the existing unprivileged node user.

`node scripts/validate-milestone15-container.mjs <external-env-file> <new-output-json>` builds/starts the topology, checks unprivileged runtime and writable data/non-writable source, launches Chromium, restarts service/worker, checks health/readiness and a persistent marker, and records image ID/runtime version. It preserves staging services/volumes. The production-style staging container was built and run as `regstead:m15-staging`: uid 1000, read-only application source, writable durable `/data`, real Chromium launch, service/worker restart and persistence all passed. On 30 September 2026 the public `/ready` endpoint returned every readiness component true.

The script is only a smoke gate. Database/report persistence and the external customer journey were also observed. On 30 September the idle hosted worker accepted SIGTERM and exited with code 0 inside its 180-second grace period; restarting it restored every `/ready` component. No real job was manufactured merely to demonstrate an in-flight stop. The existing active-work shutdown behavior remains covered by the controlled suite. An isolated read-only-image container on the staging host exercised the production lease code against an ephemeral SQLite database: an expired 120-second lease incremented the retry count, rotated the fencing token and rejected the stale claimant. It did not touch hosted customer history. Re-invoking release twice for the released monitoring report retained one run, one report, one notification, one release audit and the same artifact/hash.

## Backup and restore

`npm run backup:regstead -- backup <commercial.db> <engine-root> <reports-root> <new-directory> --services-stopped`

`npm run backup:regstead -- restore <backup-directory> <new-restore-directory>`

Stop HTTP and worker before backup; the assertion does not stop them. Backup snapshots SQLite with VACUUM INTO and copies quiescent engine/report stores, recording hashes. It refuses source-overlapping destinations, engine locks and symlinks. No secrets/env file are included. Restore verifies hashes, refuses path traversal and existing destinations, relocates internal engine database references in the restored commercial copy, revokes sessions/links, and verifies released artifact hashes.

A real local test backed up/restored a commercial database, subscription, portal identity, released artifact and actual WatchLayer engine history. A fresh login succeeded after restore, old sessions failed, and the next restored scan compared against the restored baseline. The packaged `scripts/regstead-backup.mjs` wrapper is copied into the runtime image and uses compiled code without `tsx` or a source mount. A deployed backup and isolated restore also preserved the organisation, subscription, engine history and immutable released-report hash. Keep deployed release/configuration metadata separately without secret values, and test restores under the matching release.

## Validation results

- Full suite: **914 tests passed across 41 files**; 55 tests added, none removed. Existing migration/readiness expectations were updated for M15.
- Portal suite: 50 tests, including Chromium at 390px/1280px; four separate backup tests, for **54/54** M15 portal-plus-backup tests. Mobile screenshot inspected; no horizontal overflow in tested login/dashboard/history/report routes.
- Engine browser suite: **105 passed across six files**. One regression test covers the platform-specific explicit Chromium sandbox flag; Linux staging retains the explicit sandbox and Windows uses Chromium's native sandbox. Browser server cleanup is bounded.
- Typecheck/build: **PASS**. Dependency audit: **0 vulnerabilities**; no npm dependency changes.
- Preserved 50 firms: 850 checks; 233 PASS, 53 WARNING, 564 UNKNOWN, zero POTENTIAL_ISSUE. Exact agreement 132/437 (30.21%); acceptable agreement 444/850 (52.24%); human-confirmed PASS fraction 132/233 (56.65%). Every rule/classification/PDF/adjudication/inventory field matches M14.1.
- M10 exact agreement 57/80 (71.25%), firm-wide 26/32 (81.25%), false service assignments 0/30: unchanged.
- Serious controls: **4 TP / 0 FP / 0 FN** across 14 controlled cases. No engine regressions detected; no live precision claim.
- Local 100-report fixture timings (milliseconds): dashboard 6.04, history 3.96, view 26.05, download 11.67, login 19.8, sessionValidation 2.
- Durable local and hosted results: [validation record](Validation/milestone15/local-validation.json). Full local logs: reports/milestone15/final. Hosted evidence is summarized below.

Browser tests use an intercepted HTTPS fixture connected to the actual HTTP handler. Playwright does not reroute an intercepted redirect chain, so the fixture bridges already-tested HTTP 303 responses with same-origin meta navigation. Real 303 status/Location/cookies are independently tested by the HTTP integration test. This is not evidence of deployed TLS/ingress behavior. Screenshots are under `reports/milestone15/portal-390.png` and `portal-1280.png`.

Basic response measurements use 100 released fixture records and include dashboard/history/view/download/login/session validation. They are local timings, not staging capacity figures. A request reads the aggregate once, rather than making per-report database queries. This architecture is intended for a small supervised cohort.

## Hosted staging evidence and completed journey

The controlled staging organisation is `0f7c190d-d9db-482c-bffc-6990a51fc15e`, site `e21c3ff9-3969-489f-8efb-bb24da6a2451`, baseline job `72f437a5-07a3-45a2-81c5-a0058b5cf814`, and released baseline report `dc5e8aae-4588-4ba1-8b88-6e0d63a29d15`. The genuine terms/Checkout/payment and verified webhook activation passed; the baseline ran, entered AWAITING_REVIEW, received decisions for every finding, and was released as an immutable customer-safe artifact. Real report and magic-link email, customer sign-in, latest/history/view/download, and Stripe Billing Portal handoff passed.

Normal cadence then created monitoring job `a9c7c738-5b54-459a-a0b3-22600a0966f7` with key `monitor:e21c3ff9-3969-489f-8efb-bb24da6a2451:1790781153696`; it was neither manually queued nor backdated. Its run `34d0b318-2bba-490e-9675-ec8c5c9d3567` produced scan `scan_ab577814-a121-4e04-8659-80588bba3aeb` and compared against prior scan `scan_de4fec50-8df6-4ec8-83f8-d45dcc518601`. Human review retained the original eight decisions, approved 31 universal/continuity results and suppressed 187 context-inappropriate LawWatch results. Report `d6d3f5d5-2812-4578-bf29-6a88aa2411a6` was released at epoch-ms `1790802777623`; its customer artifact is 13,358 bytes with SHA-256 `e6658c99eb63738403994ab99f9e2bdcb34ade069da53b93c16c5760ca7ec02d`. The artifact contains 39 customer sections, no suppressed LawWatch markers, and a frozen summary of 38 PASS, one UNKNOWN and zero WARNING/POTENTIAL_ISSUE/NOT_APPLICABLE. Notification `50a04fac-b719-4ef8-8b96-26a995f244da` was accepted by Resend on its first attempt as `01a0f429-d9d6-71cf-9c35-432ffdab7b92`. Provider acknowledgement is not represented as inbox delivery.

The portal returned both released reports in history. The new report's inline view and attachment download reproduced the stored hash and the portal wrote separate view/download audits. A real provider-backed sign-in message was accepted. Because the restricted send-only credential correctly cannot retrieve message bodies, the post-release automated HTTP check used a separate one-time in-memory token capture; no raw token was stored or logged. It confirmed the payment-issue dashboard, history, view, download, immutable hash and suppression boundary. The login-rate limit subsequently rejected an immediate fourth request as designed; after the 15-minute window elapsed, a fresh controlled login confirmed Active subscription, Active monitoring, the £16.99 price and both report cards after re-subscription.

Stripe account `acct_1UL26YPCnjV4mCMK` is the dedicated **Regstead Sandbox**. Subscription `sub_1UL2l7PCnjV4mCMKvho5a3g2` began active on product `prod_VLjc4IRzFRB4yi` and price `price_1UL29OPCnjV4mCMKBbZIsCGW`, GBP 1699 monthly. Sandbox invoice `in_1ULUtpPCnjV4mCMKb4Xd0qej` failed using Stripe's documented attachable decline-after-attach method. Stripe emitted `evt_1ULUtsPCnjV4mCMKiEFK7tSL`; the signed webhook processed once, Regstead recorded `past_due` with the configured zero-length grace, Resend accepted payment notice `d49ce0d9-e7e1-4d83-9bc8-b5cf5910c084`, and the portal showed Payment issue with monitoring not scheduled. Restoring the original sandbox payment method paid the same invoice and `evt_1ULUwAPCnjV4mCMKBT9r7jQY` returned the application to active.

Setting cancel-at-period-end produced processed webhook `evt_1ULUwsPCnjV4mCMKlpRu7iOL`; entitlement remained active through epoch `1793395083000`. Final cancellation produced `evt_1ULUyZPCnjV4mCMKSoxYJ9sI`, set the organisation inactive and site inactive, made `schedule` return zero with no new jobs, retained both released reports and sent cancellation notice `6cc60b9d-11c0-4bea-a04f-c5e941fb7b65`. Re-subscription checkout binding `04344301-fc8b-4aa5-987f-07212d1cd48f` used the same current price; replacement subscription `sub_1ULUzZPCnjV4mCMKSY1PzYXm` paid invoice `in_1ULUzZPCnjV4mCMKEDwZ6ywz`. Processed event `evt_1ULUzcPCnjV4mCMK0X2YMs9T` restored active entitlement while leaving both historical report IDs and hashes intact.

Product isolation used archived sandbox-only product `prod_VMDOeUsG6M9yzr`, price `price_1ULUxdPCnjV4mCMKesilEJKR` and subscription `sub_1ULUxdPCnjV4mCMKB56Qv9Hv`. Its paid, updated (`evt_1ULUxfPCnjV4mCMKTxTAf3tg`) and deleted (`evt_1ULUxgPCnjV4mCMKGM1CMYwI`) events were all marked IGNORED. No isolation subscription entered Regstead state and the real subscription, organisation, site and reports were unchanged. Automatic tax remains disabled and price tax behavior remains unspecified pending launch approval. No live Stripe or Foundry Vale live resource was changed.

Regstead itself was deliberately used as the staging target while assigned the LawWatch pack. That exposes a future product requirement to prevent or warn about inappropriate sector-pack assignment. First-baseline comparison findings should also be de-emphasised when no prior observation exists. Neither observation changes WatchLayer evidence semantics in M15. The public Regstead homepage's `noindex,nofollow` remains a genuine website launch snag.

## Launch blockers and human approvals

- Deploy the final M15 commit SHA and use it as `REGSTEAD_RELEASE` for future jobs. Historic all-zero/pre-release job markers remain truthful and must not be rewritten.
- Add an operator validation or warning for inappropriate sector-pack assignment in a later milestone; do not silently change the current staging history.
- Remove `noindex,nofollow` from the public Regstead site only after separate WordPress authorization and launch review.
- Approve Foundry Vale legal identity, £16.99 Subscription Terms, cancellation wording, portal/privacy processing, retention, cookie/analytics position, VAT/tax treatment and customer email wording.
- Apply [website handoff](M15_WEBSITE_HANDOFF.md) manually; no WordPress edits were made.

No analytics or marketing-consent mechanism is introduced. Essential authentication cookies must be described by approved policy; this document makes no legal certification claim. Historical M13 evidence/render limitations and unproven live precision remain.

M16 recommendation: a five-customer supervised pilot after every remaining M15 staging gate is evidenced, not an analytics dashboard expansion. Do not start M16 automatically.
