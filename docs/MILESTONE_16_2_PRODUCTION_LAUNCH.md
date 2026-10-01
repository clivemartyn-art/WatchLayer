# Regstead M16.2 production launch

**Status:** prepared; external launch actions remain approval-gated.  
**Branch:** `milestone-16-2-production-launch-pilot`  
**Starting accepted release:** `3909c5e2e9f51faadd4a9fc6ec6f50e2b3ff9ef7`  
**Prepared:** 1 October 2026

## Commercial and legal lock

Regstead Monitor is £16.99 per month for one primary website, billed monthly in advance, with no minimum term. Cancellation takes effect at the end of the paid period. Monitoring then stops, while previously released reports normally remain available for up to 24 months, subject to earlier appropriate deletion and longer legal, accounting, fraud, dispute, security or audit retention.

Foundry Vale Ltd is not VAT registered and currently charges no VAT. The public price is simply **£16.99/month**. Stripe Tax remains disabled. The internal intention to absorb VAT within the advertised total if registration changes is not a contractual lifetime promise.

The exact website-ready Subscription Terms, Privacy Policy, cookie wording, cancellation/refund summary, operator identity and service-email principles are in [M16.2 website legal handoff](M16_2_WEBSITE_LEGAL_HANDOFF.md). Publication remains blocked until a monitored legal/privacy email address is approved and the website owner applies the reviewed text.

## Environment architecture

| Boundary | Staging | Production |
|---|---|---|
| Public origin | `https://staging-app.regstead.co.uk` | `https://app.regstead.co.uk` |
| Compose project | `regstead-staging` | `regstead-production` |
| Edge network | `172.30.15.0/24` | `172.30.16.0/24` |
| App address | `172.30.15.10` | `172.30.16.10` |
| Persistent volume | existing external `regstead-staging_app-data` | new `regstead-production_app-data` |
| Stripe | dedicated Regstead sandbox | dedicated scoped live resources |
| Email | staging/test credential and sender | separate production credential and sender |
| Data | existing M15/M16/M16.1 history retained | clean database and storage; no staging fixtures |

`deploy/gateway.compose.yml` owns ports 80/443 and TLS state. `deploy/Caddyfile.m16-2` routes by hostname. `deploy/staging-isolated.compose.yml` reattaches the existing staging data volume, and `deploy/production.compose.yml` creates an independent production volume. Service and worker remain separate, unprivileged containers with one worker and durable `/data`. Application networks, writable volumes, databases, engine state, reports, outbox, secrets, provider settings, release markers and logs are not shared.

The TLS/config volumes belong to the ingress layer and contain no customer database or report history. Caddy access logging is deliberately absent so magic-link query strings are not recorded.

## Current hosted state

Before M16.2 changes, `app.regstead.co.uk` resolves to `188.245.11.61` with TTL 60 and serves accepted M16.1 staging. No `staging-app.regstead.co.uk` record exists. The staging image is `sha256:7c5cce5a96182903416d4699641dc7820e2d22dd330638a26d63c6eb327c6d6e`; its persistent volumes and historical artifacts must remain untouched. The server also has IPv6 `2a01:4f8:c016:4465::1`, but neither the current app nor apex lookup established an AAAA launch precedent.

## Exact hostname and cutover sequence

No step in this section has been executed.

1. Back up staging and record database/report hashes, container/image IDs and health/readiness.
2. Add `A staging-app.regstead.co.uk 188.245.11.61` with TTL 60. Do not add AAAA during the first cutover; IPv6 can be introduced later after explicit validation and approval.
3. Create the isolated staging network, attach the existing `regstead-staging_app-data`, set staging origin/base URL to `https://staging-app.regstead.co.uk`, and start the staging service/worker without deleting the old volume.
4. Start the dual-host gateway while `app.regstead.co.uk` still routes to the accepted staging service. Obtain and verify the staging certificate. Test staging health, readiness, worker, operator login, customer login, immutable V1/V2 artifact hashes and sandbox providers.
5. Create a clean production volume and production-only environment/secrets. Build the exact approved release image. Run migrations into the empty production database and verify zero organisations, users, subscriptions, reports, jobs and staging fixtures.
6. Start production on its private network and validate it through an internal Host-routed request before public routing. Prove isolated backup/restore and all production gates.
7. Immediately before cutover, verify staging and production again, record rollback identifiers and obtain explicit approval. Change the gateway route for `app.regstead.co.uk` from staging to production. Its existing A record remains `188.245.11.61`; no period points that hostname at synthetic data after the route change.
8. Verify public HTTPS, headers, health/readiness, portal/admin authentication, email links, Stripe webhook reachability and empty production state. Keep `staging-app.regstead.co.uk` routed only to staging.

The only required DNS addition is:

| Host | Existing | Proposed | TTL |
|---|---|---|---:|
| `staging-app.regstead.co.uk` | no A/CNAME observed | `A 188.245.11.61` | 60 |

`app.regstead.co.uk` keeps its existing `A 188.245.11.61` record. The public production transition is a reviewed ingress route/configuration change after production passes private validation. DNS addition and hostname cutover both require explicit approval.

### Rollback

Retain the prior staging image/config, the new production image and separate volumes. If production validation fails, stop new production job claims, inspect any in-flight work, route `app.regstead.co.uk` back to the preserved staging service, and verify both hostnames. Do not restore or overwrite either database merely to simplify rollback. Do not rewrite release markers or job histories. A data restore is a separate destructive action requiring approval.

## Live Stripe plan

No live resource has been created or changed. Immediately before execution, approve this exact scoped set:

- Product: **Regstead Monitor**, active, owned by Regstead/Foundry Vale, metadata identifying `product=regstead` and one-primary-website scope.
- Price: GBP 1699, recurring monthly, quantity one, no tiers, no trial, no discount, no Stripe Tax or automatic tax.
- Billing Portal: update payment method, invoices where supported, and cancel at period end; no customer price/product switching.
- Webhook endpoint: `https://app.regstead.co.uk/stripe/webhook`, with a production-only signing secret.
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`.
- Restricted production API credential containing only the operations required for catalog read, Checkout, subscription truth and Billing Portal sessions.

Before saving IDs, verify account/mode, product, price, currency, amount, interval, metadata, quantity and endpoint. Configure production with only the resulting Regstead IDs. Do not inspect or change unrelated Foundry Vale catalog entries. No live customer or charge is needed for infrastructure validation.

## Production email plan

Use a separate production Resend credential and a verified Regstead domain/subdomain. Display name is **Regstead**; the mailbox must be monitored. Required templates are magic-link sign-in, baseline ready, monitoring report ready, payment issue, cancellation scheduled and subscription ended. Links use `https://app.regstead.co.uk`. Messages contain service information only.

The approved production sender address/domain has not been supplied. After it is selected, Resend's exact domain-verification screen must be captured and its provider-generated SPF/DKIM records presented for explicit approval. Do not guess DNS record names or values. Provider acceptance is recorded but is not described as inbox delivery.

## Secret and configuration inventory

Values are injected outside Git and never printed in documentation or logs:

- production-only operator/admin secret;
- production Stripe restricted secret, product ID, Price ID and webhook signing secret;
- production Resend API credential and approved sender;
- database credential if production moves from single-host SQLite;
- exact base URL and portal origin;
- trusted ingress socket peer;
- deployed Git SHA in `REGSTEAD_RELEASE`;
- cadence, payment grace and terms version.

Portal sessions and passwordless token hashes are stored server-side in the separate production database. There is no standalone client-side signing secret in the current architecture. Production and staging values must never be reused.

## Backup and restore gate

Before customer onboarding:

1. Confirm production has no queued/running job and quiesce service/worker for a consistent backup.
2. Run `npm run backup:regstead -- backup <commercial.db> <engine-root> <reports-root> <new-backup-directory> --services-stopped` inside the packaged runtime, using a production-only off-volume destination.
3. Record the manifest, hashes, release/config metadata without secrets, commercial database, engine histories and released artifacts.
4. Restore into a disposable isolated directory/container using the packaged restore command and the matching image.
5. Verify database integrity, organisation/subscription state, report artifact hashes and comparison history. Confirm sessions and magic links are revoked by restore procedure.
6. Destroy only the disposable restore after recording evidence. Never restore over live production for a test.

The first empty-production backup still proves the path and manifest. Repeat the isolated restore after the first released customer report to prove artifact-hash preservation on real production data.

## Production deployment and acceptance

Build from a clean, pushed exact SHA; do not edit the server checkout. Record source archive hash, image ID, Node/Chromium versions, configuration fingerprint without secrets and release marker. Run migrations from zero, then start service and worker with the new production volume. The deployment is blocked pending explicit first-production approval.

Acceptance requires HTTPS, `/health`, every `/ready` component, worker heartbeat, CSP/HSTS/frame/content-type/referrer protections, secure HttpOnly SameSite cookies, one-use/expiry magic links, CSRF/origin/Host checks, operator/customer login, cross-organisation and report isolation, released-only history/view/download, V2 screen and print output, pause/resume, review/release, Billing Portal handoff, provider readiness, immutable hash checks, backup/restore, graceful shutdown and lease recovery. Production must initially contain zero synthetic customers/history.

## Approval gates and completion state

Prepared locally: legal handoff, environment configuration, static separation validation, exact DNS sequence, live Stripe plan, email plan, deployment/rollback procedure, backup/restore procedure and pilot runbook.

Still blocked on explicit approval and external execution:

1. approved monitored legal/privacy contact email and website publication;
2. the `staging-app` DNS A record and staging hostname migration;
3. the first clean production deployment and `app` gateway cutover;
4. creation/configuration of the listed live Stripe resources;
5. approved production sender/domain and its exact Resend DNS records;
6. hosted backup/restore and final production acceptance.

M16.2 cannot be marked complete until those actions and hosted checks pass. No M17 work is included.
