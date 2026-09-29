# Regstead standard-subscription beta operations runbook

Regstead is operated by Foundry Vale Ltd. The engine remains WatchLayer. This runbook describes M14's internal CLI and local email spool. It does not authorize a live deployment, real charge, email send or destructive deletion.

Regstead Scan is £0 without a subscription. Regstead Monitor is £16.99/month for one primary website, cancel anytime with paid-period entitlement respected. The amount is 1699 pence before separately configured Stripe tax behaviour; do not imply VAT inclusion/exclusion before approval. No automatic Stripe Tax setting is enabled.

M14.1 revises commercial migration 1 for the clean `monitor-v1` launch schema. Use a fresh commercial database; old M14 development databases are rejected and left intact. Engine databases are unaffected.

## Prepare the environment

1. Install Node >=22.16 (Node 24 recommended), run `npm ci`, `npm run build`, and install the matching Playwright Chromium when browser fallback is enabled (`npx playwright install --with-deps chromium` on Linux).
2. Copy `config/regstead.env.example` to an untracked environment file outside the repository. Replace placeholders through a secret manager. Supply the actual deployed Git SHA as REGSTEAD_RELEASE, a long random REGSTEAD_ADMIN_TOKEN, the supplied REGSTEAD_OPERATOR_TOKEN and a named REGSTEAD_OPERATOR. Do not put tokens in CLI arguments or logs.
3. Choose SQLite on a durable local disk for the initial single-host pilot or configure DATABASE_URL for PostgreSQL. Engine databases, reports and spool need durable private paths. Back up the commercial database and these directories consistently before upgrading. Test restore with disposable copies.
4. Configure a cadence in milliseconds and decide/payment-test the grace policy. The example cadence is not a published promise. Keep worker concurrency at one initially.
5. In a separate Stripe sandbox, manually establish the dedicated Regstead Monitor product and its single monthly GBP Price (1699 pence), and configure the Stripe Billing Portal. Do not mix these with Path of the Nine. Use a restricted key with only necessary price-read, Checkout, portal and subscription-read permissions. Register the documented webhook events and signing secret. Verify the test/live-mode setting. Consider tax/VAT treatment and registration with the operator/accountant before launch; M14 does not turn on automatic tax or assume registration.
6. Run `npm run regstead -- --help`. Commands below require the operator environment. `node --env-file=/private/regstead.env dist/regstead/cli.js ...` is the built equivalent.

## Onboard a free-scan lead

Create a private JSON input file with `legalName`, optional `displayName`, `contactName`, `contactEmail`, `url`, optional `notes`, and optional boolean `browserFallback`. Do not copy lead files into version control. Check the organisation identity and primary hostname before proceeding.

`npm run regstead -- onboard /private/lead.json`

This creates the organisation and one primary site, queues one free baseline, and creates an onboarding outbox item. It does not charge or activate a paid subscription. The existing WordPress/Gravity Forms acquisition journey remains unchanged.

Use `list organisations`, `list sites`, `list subscriptions`, `list jobs`, or `failures` to inspect the resulting records. CLI output may include customer data; keep terminal/log access private.

## Checkout and subscription

After the customer has actually accepted the current subscription terms, record that acceptance with:

`npm run regstead -- checkout <organisation-id> beta-v1`

The backend uses the configured Monitor price and returns a Stripe-hosted URL. It verifies the price catalog before creating the session. Never substitute a client-requested price or manually set active status. Repeating the command reuses a pending checkout. There is no slot reservation or allocation. Inspect `list checkouts` for accepted-terms and session records. The currently configured price is always used; pending checkouts whose recorded terms or price differ are refused for operator resolution.

`npm run regstead -- billing-portal <organisation-id>` opens a Stripe Billing Portal session URL. Cancellation is performed through the Stripe Billing Portal or by the authorized Stripe operator. Do not delete history. Confirm the verified subscription event is processed and future monitoring stops. Payment grace follows the configured deadline. A cancelled customer can subscribe again at the currently configured Monitor price; the old reports and subscription audit history remain.

Run the webhook service using `npm run start:service`, behind TLS, and the worker with `npm run start:worker`. Stripe verifies signatures on raw bodies at POST `/stripe/webhook`. GET `/health` reports liveness; GET `/ready` returns 503 if configuration/database/worker checks fail. No admin HTTP routes exist.

## Scan execution and review

`npm run regstead -- worker --once` runs a bounded worker iteration, including scheduling, one billing reconciliation, configured scan concurrency and one notification. The continuous worker also logs structured audit events. To request an explicit recheck:

`npm run regstead -- queue <site-id> MANUAL_RECHECK <unique-request-key>`

A repeated key returns the original job. `queue <site-id> BASELINE <request-key>` retains the site's single baseline identity. Existing in-flight/review jobs prevent overlap.

Use `review-queue`, then `inspect <report-id>`. Inspect the raw result, source evidence, uncertainties and service context. Review each finding separately:

```
npm run regstead -- review <report-id> <finding-id> APPROVED "Evidence checked in context"
npm run regstead -- review <report-id> <finding-id> SUPPRESSED "Reason this should not appear"
npm run regstead -- review <report-id> <finding-id> ANNOTATED "Reason for the wording" "Customer title" "Customer explanation"
```

Use the actual named reviewer in REGSTEAD_OPERATOR. Do not approve merely to clear the queue. Annotations overlay evidence; they do not alter the engine or convert UNKNOWN into a confirmed conclusion. Confirm serious findings conservatively. Every finding needs a decision.

`npm run regstead -- release <report-id>` freezes the reviewed artifact and queues eligible report notices. A repeated release returns the same artifact. A concurrent review change causes release to fail safely; inspect and retry. Released reports cannot be edited. For a corrected report, run a separately identified recheck and review it.

`npm run regstead -- export <report-id> /private/customer-report.html`

The export refuses to overwrite a file. Check the rendered HTML and citations before private delivery to the intended customer. There is no public report-download endpoint or customer dashboard. Use the agreed secure manual delivery channel.

## Email operations

M14's configured adapter is `spool`. It writes private JSON delivery items to REGSTEAD_EMAIL_SPOOL. A SENT row means accepted by the local spool, not delivered to an inbox. `list notifications` shows state and provider reference. No real delivery occurs automatically.

Before enabling real email, implement/configure an EmailProvider that guarantees durable idempotency for each notification ID, verify sender/DKIM/SPF and sandbox delivery, and test acknowledgement-loss recovery. Never resend with a new key to work around an ambiguous provider response. Finding notices must refer only to released reports.

For an adapter failure: inspect `failures`, correct the cause, then `retry-email <notification-id>`. It reuses the original notification identity. Do not manually insert duplicate outbox rows.

## Failures, recovery and changes

- `retry <job-id>` requeues a failed job with its original identity. Read its typed failure code first. Permanent failures need investigation; retrying cannot bypass robots or network policy.
- `list webhooks` shows minimal event state. A failed event is never silently treated as activation. Check Stripe truth and configured ownership, then `retry-webhook <event-id>`. Raw webhook bodies are not stored. Stripe can also retry durable receipts; duplicate IDs have no duplicate side effects.
- `pause <site-id>` stops future automatic monitoring; `resume <site-id>` resumes eligibility. `schedule` queues at most one due catch-up job per eligible site. A job already in review blocks overlap.
- Abandoned RUNNING jobs recover after the 120-second lease, subject to retry limits. Do not clear a live engine lock. If a lock has a foreign hostname or a reused/live PID, verify the previous worker is stopped before a separately authorized lock cleanup. Completed engine artifacts and commercial checkpoints are reused.
- If a worker crashes during report storage, inspect the report's status/hash; an unused artifact may remain. Never replace a released file. Retry release after fixing storage.
- If a worker build changes, drain queued/running jobs first. Version-pinned jobs from another release fail closed. Review them and create a new explicit recheck under the deployed release; retain the old job/evidence. Do not rewrite its versions to claim a scan ran under a different build.
- On graceful shutdown, the worker stops taking new work and finishes current work. Configure supervisor termination grace accordingly. Force-stop recovery uses leases; it does not imply the interrupted scan completed.

## Monitoring and retention

Monitor readiness, worker heartbeat, oldest queued/review job, failed webhooks/email, disk/database size and report delivery. Daily operator review is required during beta. No live precision claim is warranted by the preserved benchmark or the controlled safety tests.

Cancellation normally preserves reports, engine artifacts and audit history. No automated retention period or destructive purge is configured. A deletion/anonymisation request needs a separately approved policy covering contact fields, notes, artifacts, engine history, Stripe references and backups. Document the decision and verify it across stores; do not improvise a legal retention period.

## Manual launch gate

Before admitting paying customers: build/run the container in staging; test actual PostgreSQL if selected; verify persistent volumes, backups and restore; test Chromium permissions and network boundaries; register sandbox webhooks and exercise Checkout/payment failure/cancellation; approve terms/privacy/retention and VAT treatment; configure restricted credentials and TLS/rate limits; install and verify a real idempotent email provider or adopt an explicit manual delivery process; check every reviewed report before delivery. Begin with five closely supervised pilot organisations, expand only after observing operations. M15 is planned for the separate Regstead Customer Portal; do not start it automatically.
