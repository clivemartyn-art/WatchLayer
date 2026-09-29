# Regstead launch plan

**Status:** Active launch source of truth — revised for M14.1, 29 September 2026.

Regstead is operated by Foundry Vale Ltd. WatchLayer remains the internal evidence engine. M14 supplies the operator-led commercial layer; M14.1 simplifies it to the standard subscription model. M15 is planned to add the Regstead Customer Portal and has not started.

## Commercial decision

Regstead Scan is £0: one free baseline with no subscription required. Regstead Monitor is £16.99/month for one primary website, using one monthly GBP Stripe Price of 1699 pence before separately configured tax behaviour. There are no allocation slots or customer-count price transitions. Customers may cancel anytime; paid-period entitlement is respected and history retained. Rejoining uses the currently configured Monitor price.

VAT treatment remains an explicit approval before launch. Website/terms/Checkout/invoice wording must agree. The application does not automatically enable Stripe Tax.

## Preparation before charging

- Apply the [website pricing change manifest](M14_1_WEBSITE_PRICING_CHANGES.md) to WordPress manually. Existing Gravity Forms acquisition remains.
- Approve updated Subscription Terms, cancellation and appropriate website/privacy wording. Retire outdated offer/legal drafts from active use.
- Configure isolated Regstead Stripe product and Monitor Price, restricted credentials, webhook events and the Stripe Billing Portal. Keep Path of the Nine separate.
- Validate the actual deployment/container, selected database, browser installation, private storage, backup and restore.
- Approve cadence, payment-grace and retention policies. Use a fresh M14.1 commercial database; retain old development databases separately.
- Install an idempotent real email adapter or explicitly operate private manual report delivery. Spool acceptance is not inbox delivery.

## Initial customer workflow

1. Receive the WordPress/Gravity Forms lead and confirm organisation, contact and primary site.
2. Manually ingest and run the free baseline.
3. Review every finding conservatively; release the immutable report and deliver privately.
4. Explain the standard Monitor subscription and obtain genuine acceptance of the current Subscription Terms.
5. Create server-validated Stripe Checkout. Activate only from verified provider subscription truth.
6. Run configured monitoring with mandatory review before delivery.
7. Use the Stripe Billing Portal for billing management/cancellation. It is separate from the future Regstead Customer Portal for reports.
8. Inspect payment failures, review queues, delivery outcomes and customer feedback. Expand operating volume only as the process supports it; volume does not change the configured price.

## Evidence and operational guardrails

No live accuracy estimate is implied by controlled or preserved benchmark results. Failed rendering remains uncertainty; robots and network protections remain intact. Human review is not bypassed for delivery speed. Monitor review turnaround, report usefulness, operational failures, support effort and retention before expanding.

The earlier phased pricing and allocation plan is superseded by this document and [COMMERCIAL_MODEL.md](../COMMERCIAL_MODEL.md). Historical prospect lists and legal drafts may retain old names; do not use their commercial text without applying the manifest. No outreach, live WordPress edit, charge or email is authorized by this plan alone.
