# Regstead commercial model

**Status:** Active commercial source of truth — M14.1, 29 September 2026.
**Operator:** Foundry Vale Ltd. **Public product:** Regstead. **Internal engine/repository:** WatchLayer.

## Launch products

| Product | Amount | Scope |
|---|---:|---|
| Regstead Scan | £0 | One operator-created baseline scan, no subscription required |
| Regstead Monitor | £16.99/month | Recurring monitoring for one primary public website |

Monitor uses one configured monthly GBP Stripe Price, 1699 pence before any separately configured Stripe tax behaviour. VAT-inclusive/exclusive wording is not decided by this document. Public pricing, Subscription Terms, Checkout and invoices must match the approved treatment before live charges. Automatic Stripe Tax is not enabled by the application.

There is no allocation programme, capacity-based price, coupon, tier selection, permanently retained introductory rate or special reacquisition restriction. Cancellation can be requested anytime through the Stripe Billing Portal. Cancel-at-period-end retains paid entitlement through its end; final cancellation stops future monitoring and preserves history. Customers can subscribe again at the currently configured Monitor price.

## Proposition and customers

“Continuous evidence-led website monitoring for one primary website.”

Regstead remembers public website observations and reports meaningful changes with evidence and uncertainty. Initial customers are SRA-regulated law firms in England and Wales. Buyers may include practice managers, managing partners, operations staff and compliance staff. Public signals are not regulatory certification, legal advice or proof of complete visibility.

The service remains static-first with bounded PDF and selective browser observation. M13's live-render limitations remain. Human review is mandatory before customer report release. No price change alters evidence semantics or lowers the serious-finding safety gate.

## Acquisition and operation

WordPress and Gravity Forms remain the acquisition route. Operators can manually ingest a lead and run the free baseline without a subscription. Monitor Checkout follows genuine customer acceptance of the current Subscription Terms, recorded locally with version/date and checkout identity. Server-side Stripe catalog validation and verified webhooks determine paid entitlement.

The Stripe Billing Portal manages billing, payment methods, supported invoices and cancellation. The separate Regstead Customer Portal is planned for M15; it is not available in M14.1. Reports currently use reviewed immutable HTML artifacts and operator-assisted private delivery. The supplied notification adapter is a local spool, not inbox delivery.

Cadence is explicitly configured; public copy must not promise a schedule that operations cannot deliver. Customer count, manual review workload, retention, report usefulness and support costs should guide operational expansion. There is no customer-count pricing switch. Future pricing changes require an explicit commercial decision rather than dormant tier logic.

## Launch controls and references

Use isolated Regstead product/price IDs within the shared Foundry Vale Stripe account; never mix Path of the Nine catalog or subscriptions. Configure and test Stripe resources separately, approve terms/privacy/cancellation/retention and VAT treatment, verify deployment/backups, and establish delivery before live charges.

See [M14.1](docs/MILESTONE_14_1_COMMERCIAL_SIMPLIFICATION.md), [website change manifest](docs/M14_1_WEBSITE_PRICING_CHANGES.md), [operations runbook](docs/OPERATIONS_RUNBOOK.md) and [product brief](docs/regstead/REGSTEAD_PRODUCT_BRIEF.md). Prior pricing scenarios are superseded; Git history retains their development record.
