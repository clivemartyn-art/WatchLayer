# Milestone 14.1 — Commercial simplification

## Scope and starting point

Branch: `milestone-14-1-commercial-simplification`, based on M14 commit `fc3a4ebada8adab80b5fc3b81b9fe19aa40a905d`. M14 remains unmerged to main. Before editing, reproduced 837 passing tests, 104 browser tests, typecheck/build, zero audit vulnerabilities, unchanged preserved 50-firm and M10 review results, and serious controls 4 TP / 0 FP / 0 FN. Baseline logs are under `reports/milestone14-1/baseline`.

This changes only the commercial layer, its tests/configuration and commercial documentation. WatchLayer crawler, rules, evidence semantics, PDF, browser and service attribution are unchanged. No live charges, Stripe resources, deployments or WordPress edits were performed.

## Single subscription model

Regstead Scan costs £0, requires no subscription and retains one operator-created free baseline. WordPress/Gravity Forms and manual onboarding remain the acquisition route.

Regstead Monitor costs £16.99/month for one primary website. Server configuration contains `REGSTEAD_STRIPE_PRODUCT_ID` and `REGSTEAD_STRIPE_MONITOR_PRICE_ID`. The Stripe adapter checks the configured product/Price, active catalog status, GBP, 1699 pence and one-month recurrence before hosted Checkout. Checkout fixes quantity to one; customer-selected prices, coupons and tier selection are absent.

1699 pence is the subscription amount before separately configured Stripe tax behaviour. This does not decide whether public pricing is VAT-inclusive or VAT-exclusive. Automatic Stripe Tax is not enabled. Approved website wording, catalog tax settings and invoice presentation must agree before live charges.

Removed active founding flags, sequence numbers, capacity checks, reservations, allocation, forfeiture/reacquisition rules and both obsolete Price environment variables. No dormant first-25 model remains. Historical milestone/review artifacts and legacy rejection test data are retained as history, not active configuration.

## Lifecycle, audit and isolation

Checkout retains organisation, terms version, acceptance timestamp and local Checkout identity, then the provider session reference. The operator must record genuine customer acceptance. A pending duplicate reuses its identity; changed terms or Price refuse reuse and require operator resolution rather than fabricating updated acceptance. A local Checkout alone grants no entitlement.

Verified, persisted, deduplicated webhook events refresh provider subscription truth for Checkout completion/async success, paid/failed invoices and subscription updates/deletion. Product, Price, metadata and local Checkout binding isolate Regstead from other Foundry Vale products, including Path of the Nine. Existing signature, event-mode, lease and retry checks remain.

The subscription uses `graceDeadline`. Cancel-at-period-end respects paid entitlement; final cancellation stops future automatic monitoring and preserves history. Rejoining uses the currently configured Monitor Price, including a replacement Price ID. Terminal events for an older subscription do not deactivate its replacement. No price-forfeiture policy exists.

The command and service method are named `billing-portal` / `billingPortal`: these create **Stripe Billing Portal** sessions for billing management. The future **Regstead Customer Portal** is the report portal planned for M15, not part of M14.1.

## Schema decision

Chose option A: revise commercial migration 1 before release. M14 is neither merged nor deployed and has no production customer database. The clean launch schema has a constrained `model = 'monitor-v1'` marker; the JSON aggregate contains only current commercial types. SQLite and PostgreSQL use the same model marker. No compatibility allocation fields or conversion code remain.

An old M14 development database is rejected with an instruction to use a fresh M14.1 commercial database. It is not automatically rewritten or deleted. Preserve any old development database separately and configure a new path/database; do not run a destructive reset against unknown data. Fresh creation/reopening and legacy rejection are tested. Engine migrations/databases are unaffected. PostgreSQL is contract-tested, not validated against a running server in this environment.

## Documentation and website work

Updated the M14 report, operations runbook, environment example, README, active commercial model, launch plan, product brief and WordPress site plan. Historical benchmark/human-review records remain unchanged.

[Website pricing change manifest](M14_1_WEBSITE_PRICING_CHANGES.md) identifies publication and legal-copy work. The repository contains planning documents and a saved conversation HTML export, not editable WordPress theme/site source. No claim is made that live website pricing or legal documents have been updated.

## Regression validation

Final results are recorded below and in `Validation/milestone14-1/validation.json` after the complete gate run. Logs and regenerated reports are under `reports/milestone14-1/final` (ignored local artifacts).

24 focused tests added; two obsolete allocation/forfeiture tests removed. Existing security/idempotency coverage remains and the former founding lifecycle is now the standard-subscription lifecycle. New coverage includes 30 organisations at the same Price, no allocation state, acceptance/idempotency, missing local terms binding, asynchronous events, cancellation/rejoining including a replacement Price ID, stale old-subscription events, Billing Portal customer selection, grace deadline, fresh/legacy schemas, obsolete configuration rejection and hosted Checkout tax/coupon parameters.

- Full suite: **859 passing tests across 39 files** (837 baseline minus 2 obsolete tests plus 24 new tests). Commercial coverage: 93 tests.
- Separate browser gate: **104 passing tests across 6 files**.
- Typecheck and build: **PASS**. Dependency audit: **0 vulnerabilities**.
- Preserved 50-firm corpus: 850 checks, 233 PASS / 53 WARNING / 564 UNKNOWN / 0 POTENTIAL_ISSUE. Exact agreement 132/437 (30.21%); acceptable agreement 444/850 (52.24%); human-confirmed PASS fraction 132/233 (56.65%). Rules, classifications, PDF evidence, adjudication and inventories are identical to M14 for every firm.
- M10 review: exact 57/80 (71.25%); firm-wide 26/32 (81.25%); false service assignments 0/30. Unchanged sample-review metrics.
- Serious controls: **4 TP / 0 FP / 0 FN** across 14 cases; all expected serious findings retained. These controls do not establish live precision.
- No engine source changes, new dependencies, benchmark changes or detected regressions.

## Limits and next milestone

No new runtime dependencies. Live Stripe sandbox end-to-end validation and approved tax/terms configuration remain launch tasks. Email remains a local durable spool, not inbox delivery. Real PostgreSQL and container deployment were not exercised. Preserved corpus and controlled findings are not live accuracy estimates; M13 rendered-evidence limitations remain unchanged.

M15 is recommended for the Regstead Customer Portal, after the commercial launch prerequisites are resolved. M15 has not started. This branch is to be committed/pushed only after validation; no automatic merge.
