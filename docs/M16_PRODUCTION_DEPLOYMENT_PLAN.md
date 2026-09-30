# Regstead Production Deployment Plan — Approval Required

This is a preparation document. It does not authorize or perform production deployment, DNS, live Stripe, live charging, Resend sender or WordPress changes.

## Proposed topology

- Dedicated production HTTPS hostname, approved before DNS change.
- Caddy TLS ingress with a production-specific hostname and private internal service network.
- One Regstead HTTP service and one worker with concurrency 1 for the 3–5 firm pilot.
- Durable single-host SQLite volume only if that pilot database decision is explicitly approved. Otherwise validate real PostgreSQL before selection.
- Separate durable engine/report storage and a separate encrypted backup destination.
- Production secrets injected from a private environment/secret store, never copied from staging or committed.

Staging and production must have distinct commercial databases, volumes, admin/operator identities, session state, Stripe credentials/webhook secrets, Resend keys/sender configuration and release markers.

## External providers

### Stripe

- Use dedicated Regstead live product and one £16.99 monthly Price only after VAT/tax treatment and customer wording are approved.
- Restrict the key to required Checkout, Price, Billing Portal, subscription and webhook operations.
- Configure a unique production webhook endpoint/signing secret and Billing Portal configuration.
- Verify product/price ownership, currency, amount, interval, mode and metadata isolation before any live Checkout.
- Run no live charge without separate explicit approval.

### Resend

- Approve and verify the production sender/domain, SPF/DKIM and customer wording.
- Use a production-specific send-only key and retain notification IDs as idempotency keys.
- Monitor acceptance/failure and reconcile ambiguous results. Acceptance is not inbox placement.

## Deployment procedure

1. Obtain approval for legal identity, terms, cancellation wording, privacy/retention/cookies, VAT/tax and email wording.
2. Record a clean, pushed release SHA. Run full tests, browser suite, typecheck, build, audit, benchmark, M10 and serious controls.
3. Back up the current production state and verify the backup manifest off-host.
4. Confirm no queued/running job and no active engine lock.
5. Place an immutable Git archive under `/opt/regstead/releases/<sha>` and verify its SHA-256.
6. Build the image from that archive. Record image ID, Node and Chromium versions.
7. Set `REGSTEAD_RELEASE=<sha>` only for future jobs. Never rewrite historic job releases.
8. Recreate service/worker without deleting the data volume. Keep the previous source/image for rollback.
9. Verify `/health`, every `/ready` component, operator login, customer login, report history/hash, worker heartbeat and provider configuration.
10. Observe the first real pilot job and notification closely.

## Rollback

- Stop new job claims and inspect in-flight work.
- Repoint to the preserved prior release/image and its matching configuration.
- Restore the pre-deployment backup only when data recovery is necessary and explicitly authorised; never overwrite history merely to simplify rollback.
- Recreate service/worker, verify readiness and inspect lease/retry state.
- Do not rewrite jobs created under the newer release. Resolve them through the documented version-pinning workflow.

## Backup and monitoring

- Quiesce service/worker for consistent packaged backups of commercial DB, engine histories and released artifacts.
- Store release/configuration metadata without secrets alongside backup records.
- Test restoration into a disposable environment on a defined schedule.
- Monitor HTTPS, `/ready`, worker heartbeat, queue age, awaiting-review age, failures, disk/database growth, backup success and provider acceptance.

## Human approval gates

- Production hostname and DNS.
- Database/storage/backup location.
- Live Stripe resources and any charge.
- VAT/tax treatment and Stripe Tax choice.
- Resend sender/domain and email wording.
- Foundry Vale identity, terms, privacy, retention and cookie position.
- WordPress pricing/customer-login handoff.
- Final production deployment and rollback authority.
