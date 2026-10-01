# Regstead standard-subscription beta operations runbook

Regstead is operated by Foundry Vale Ltd. The engine remains WatchLayer. This runbook covers the commercial controls, customer/operator portals, provider-backed email and isolated staging/production operation. Live provider changes, charging and destructive deletion require their documented authorization.

Regstead Scan is £0 without a subscription. Regstead Monitor is £16.99/month for one primary website, cancel anytime with paid-period entitlement respected. Foundry Vale Ltd is not currently VAT registered, no VAT is currently charged, and the advertised total is £16.99/month. Do not enable automatic Stripe Tax without a later approved pricing/tax change.

M14.1 revises commercial migration 1 for the clean `monitor-v1` launch schema. Use a fresh commercial database; old M14 development databases are rejected and left intact. Engine databases are unaffected.

## Prepare the environment

1. Install Node >=22.16 (Node 24 recommended), run `npm ci`, `npm run build`, and install the matching Playwright Chromium when browser fallback is enabled (`npx playwright install --with-deps chromium` on Linux).
2. Copy `config/regstead.env.example` to an untracked environment file outside the repository. Replace placeholders through a secret manager. Supply the actual deployed Git SHA as REGSTEAD_RELEASE, a long random REGSTEAD_ADMIN_TOKEN, the supplied REGSTEAD_OPERATOR_TOKEN and a named REGSTEAD_OPERATOR. Do not put tokens in CLI arguments or logs.
3. Choose SQLite on a durable local disk for the initial single-host pilot or configure DATABASE_URL for PostgreSQL. Engine databases, reports and spool need durable private paths. Back up the commercial database and these directories consistently before upgrading. Test restore with disposable copies.
4. Configure a cadence in milliseconds and decide/payment-test the grace policy. The example cadence is not a published promise. Keep worker concurrency at one initially.
5. In the correct environment, establish only the dedicated Regstead Monitor product and its single monthly GBP Price (1699 pence), then configure the Stripe Billing Portal. Do not mix these with Path of the Nine. Use a restricted key with only necessary catalog-read, Checkout, portal and subscription-read permissions. Register the documented webhook events and signing secret. Verify test/live mode. Automatic Stripe Tax remains off; no VAT is currently charged because Foundry Vale Ltd is not VAT registered.
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

The export refuses to overwrite a file. Check the rendered HTML and citations before private delivery to the intended customer. There is no unauthenticated report-download endpoint. The M15 portal requires a preauthorised contact and completed staging gates. Use the agreed secure manual delivery channel.

## Email operations

The default `spool` adapter writes private JSON delivery items to REGSTEAD_EMAIL_SPOOL. A SENT row from that adapter means accepted by the local spool, not delivered to an inbox. M15 also provides the `resend` adapter for provider-backed staging or production delivery. Configure a verified sender and inject RESEND_API_KEY outside version control before selecting it. `list notifications` shows state and provider reference.

Provider acknowledgement records acceptance, not inbox placement. Retain the notification ID as the idempotency identity, verify sender/DKIM/SPF and test acknowledgement-loss recovery before live use. Never resend with a new key to work around an ambiguous provider response. Finding notices must refer only to released reports.

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

M15's genuine scheduled monitoring, second reviewed release, sandbox payment failure/recovery, period-end and final cancellation, stopped scheduling, retained history, re-subscription, unrelated-product isolation, container, SQLite restart, Chromium, TLS, Resend, worker restart/lease fencing and deployed backup/restore gates have passed. Before admitting paying customers, approve terms/privacy/retention and VAT treatment, apply the marketing-site handoff, remove the public site's `noindex,nofollow` only through an authorised WordPress change, and check every reviewed report before delivery. Begin with five closely supervised pilot organisations, expanding only after observing operations.

## M15 Customer Portal

Read `docs/MILESTONE_15_CUSTOMER_PORTAL_STAGING.md` before deployment. The portal is running at `https://app.regstead.co.uk`; the M15 hosted lifecycle is complete. Historic all-zero/pre-release markers identify the source actually used by those jobs and must remain unchanged. Set the final committed SHA only for future jobs.

Set REGSTEAD_PORTAL_ORIGIN to the exact HTTPS origin and REGSTEAD_TRUSTED_PROXY_ADDRESS only to the actual ingress peer. The supplied Compose topology uses one durable SQLite volume and worker concurrency 1. Use an external secret env file; never commit it or print `docker compose config` with credentials. Caddy access logs must not record magic-link query strings. HTTPS is mandatory; HTTP development requests are not a customer access path.

Select EMAIL_PROVIDER=resend and inject a send-only restricted RESEND_API_KEY plus EMAIL_FROM. Verify the sender domain administratively before deployment; the runtime deliberately does not call the Resend Domains API. Spool cannot deliver authentication emails. `/ready` requires real-provider configuration as well as the existing heartbeat/database/billing checks; configuration readiness is not proof of inbox delivery. Provider acknowledgement is not inbox delivery. Reconcile ambiguous attempts older than 23 hours rather than replaying after the provider's idempotency window.

Create a private portal-user JSON containing organisationId, email and displayName. An existing paid entitlement is required unless the operator explicitly supplies approvedPilot:true. This approval does not create a paid entitlement.

```
npm run regstead -- portal-user-create /private/portal-user.json
npm run regstead -- portal-user-list
npm run regstead -- portal-invite <user-id>
npm run regstead -- portal-user-disable <user-id>
```

Verify the recipient and staging/production environment before `portal-invite`; it requests a real email when a provider is configured. Do not paste the raw sign-in URL into logs or tickets. Login requests have generic responses, so inspect provider/audit state privately when troubleshooting. Failed or uncertain authentication delivery requires a fresh login request, which invalidates the old link. Disabling a user revokes outstanding sessions/links. Re-authorisation is an operator decision; there is no public registration.

Only newly released customer-safe artifacts appear in the portal. Historical M14 artifacts with internal reviewer notes remain operator-only; do not add a customer marker by hand. Release a new genuinely reviewed report instead. View/download checks immutable hashes and ownership. Cancellation preserves access to released history for still-authorised contacts.

For backup: stop service and worker, verify no active engine locks, then use `npm run backup:regstead -- backup <commercial.db> <engine-root> <reports-root> <new-backup-directory> --services-stopped`. The flag is an operator assertion, not a shutdown command. Restore only into a new disposable directory with `npm run backup:regstead -- restore <backup-directory> <new-restore-directory>`. Sessions/links are revoked during restore; users request fresh links. Engine references are relocated in the restored database. Use matching release/configuration metadata and verify a new monitoring comparison before considering recovery demonstrated.

Run `node scripts/validate-milestone15-container.mjs <external-compose-env-file> <new-output-json>` only on the approved staging host after configuring its hostname, external runtime env-file path and secret values. It builds/starts containers and retains volumes/services. Record its image ID, then complete every provider/customer-journey step in the M15 report. No M16 work or live launch follows automatically.

## M16 private operator console

The operator console is served at `/admin` by the existing HTTP service. Create and invite its allowlisted identities only through an authenticated CLI session:

```
npm run regstead -- operator-user-create /private/operator.json
npm run regstead -- operator-user-list
npm run regstead -- operator-invite <operator-user-id>
npm run regstead -- operator-user-disable <operator-user-id>
```

The JSON contains `email` and `displayName`. No browser registration exists. Operator sessions are separate from customer sessions. Review, release, pause/resume, retry and Billing Portal actions call the existing operational services and remain audited. New onboarding requires explicit LawWatch pack confirmation and an `ESTABLISHED` or `NOT_ESTABLISHED` applicability record. Follow [the pilot runbook](M16_PILOT_RUNBOOK.md). The original [M16 production plan](M16_PRODUCTION_DEPLOYMENT_PLAN.md) is superseded for execution by the [M16.2 production launch plan](MILESTONE_16_2_PRODUCTION_LAUNCH.md).

## M16.2 staging and production operations

Staging uses `https://staging-app.regstead.co.uk`, the existing external `regstead-staging_app-data` volume, sandbox Stripe and staging email credentials. Production uses `https://app.regstead.co.uk`, a clean `regstead-production_app-data` volume, separate live Stripe resources and separate production email credentials. Never share writable data, database files, engine histories, report artifacts, provider secrets, sessions, outbox or release markers.

The dual-host gateway is defined in `deploy/gateway.compose.yml`; application definitions are `deploy/staging-isolated.compose.yml` and `deploy/production.compose.yml`. Populate the corresponding example configuration into private environment files outside Git. Run `npm run validate:production-config` before deployment. Do not print rendered Compose configuration containing secrets.

Before an environment change, record its deployed SHA/image, health/readiness, worker state, data counts and immutable hashes, then take a consistent backup. Drain jobs before release changes. Production must start with an empty commercial database and no copied staging customers. Set `REGSTEAD_RELEASE` only for future work; never rewrite historical version records.

Follow the exact DNS, Stripe, Resend, deployment, acceptance and rollback sequence in the M16.2 plan. Follow [the supervised pilot runbook](M16_2_PILOT_RUNBOOK.md) for the first real customer. DNS, live Stripe changes, Resend DNS, first production deployment, public hostname cutover, destructive restore and main-branch merge remain explicit approval gates.
