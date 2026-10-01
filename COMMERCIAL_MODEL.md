# Regstead commercial model

**Status:** Active commercial source of truth — M16.2, 1 October 2026.
**Operator:** Foundry Vale Ltd. **Public product:** Regstead. **Internal engine/repository:** WatchLayer.

## Launch products

| Product | Amount | Scope |
|---|---:|---|
| Regstead Scan | £0 | One operator-created baseline scan, no subscription required |
| Regstead Monitor | £16.99/month | Recurring monitoring for one primary public website |

Monitor uses one configured monthly GBP Stripe Price of 1699 pence. Foundry Vale Ltd is not currently VAT registered, so no VAT is currently charged and the advertised total is simply £16.99/month. Automatic Stripe Tax is not enabled. If VAT later applies, the current commercial intention is to keep the advertised total price and absorb applicable VAT unless pricing policy is deliberately changed; the Subscription Terms do not promise that treatment permanently.

There is no allocation programme, capacity-based price, coupon, tier selection, permanently retained introductory rate or special reacquisition restriction. Cancellation can be requested anytime through the Stripe Billing Portal. Cancel-at-period-end retains paid entitlement through its end; final cancellation stops future monitoring and preserves history. Customers can subscribe again at the currently configured Monitor price.

## Proposition and customers

“Continuous evidence-led website monitoring for one primary website.”

Regstead remembers public website observations and reports meaningful changes with evidence and uncertainty. Initial customers are SRA-regulated law firms in England and Wales. Buyers may include practice managers, managing partners, operations staff and compliance staff. Public signals are not regulatory certification, legal advice or proof of complete visibility.

The service remains static-first with bounded PDF and selective browser observation. M13's live-render limitations remain. Human review is mandatory before customer report release. No price change alters evidence semantics or lowers the serious-finding safety gate.

## Acquisition and operation

WordPress and Gravity Forms remain the acquisition route. Operators can manually ingest a lead and run the free baseline without a subscription. Monitor Checkout follows genuine customer acceptance of the current Subscription Terms, recorded locally with version/date and checkout identity. Server-side Stripe catalog validation and verified webhooks determine paid entitlement.

The Stripe Billing Portal manages billing, payment methods, supported invoices and cancellation. The Regstead Customer Portal provides passwordless access to released immutable reports and history. Provider-backed Resend delivery is supported; provider acknowledgement records acceptance, not inbox placement. Human review remains mandatory before release.

Cadence is explicitly configured; public copy must not promise a schedule that operations cannot deliver. Customer count, manual review workload, retention, report usefulness and support costs should guide operational expansion. There is no customer-count pricing switch. Future pricing changes require an explicit commercial decision rather than dormant tier logic.

## Launch controls and references

Use isolated Regstead product/price IDs within the shared Foundry Vale Stripe account; never mix Path of the Nine catalog or subscriptions. Configure and test Stripe resources separately, publish the approved terms/privacy/cancellation/retention wording, verify deployment/backups, and establish delivery before live charges.

See [M14.1](docs/MILESTONE_14_1_COMMERCIAL_SIMPLIFICATION.md), [website change manifest](docs/M14_1_WEBSITE_PRICING_CHANGES.md), [operations runbook](docs/OPERATIONS_RUNBOOK.md) and [product brief](docs/regstead/REGSTEAD_PRODUCT_BRIEF.md). Prior pricing scenarios are superseded; Git history retains their development record.
