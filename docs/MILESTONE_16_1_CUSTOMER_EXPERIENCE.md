# Milestone 16.1 — Customer Experience and Report Design

Starting checkpoint: M16 commit `a805e780a9985f3c1982accaf91138291bc2b738`. Work is isolated on `milestone-16-1-customer-experience-report-design`. No engine, evidence, scheduling, review-decision, subscription or customer-isolation semantics were changed.

## Design objective

The customer surface now reads as an evidence dossier and ongoing monitoring record. Deep ink, warm paper, muted teal, restrained brass, editorial headings and compact operational typography replace the earlier generic card grid. The interface uses bundled fonts and CSS only; there is no SPA, client script or network font dependency.

The information hierarchy is:

1. monitoring state, hostname, last observation and next scheduled observation;
2. a compact strip of truthful persisted values;
3. the latest released report and customer action;
4. accumulated released-report history;
5. account and Stripe-hosted billing management.

The existing routes remain:

- `GET/POST /portal/login`
- `GET/POST /portal/auth/verify`
- `POST /portal/logout`
- `GET /portal`
- `GET /portal/reports`
- `GET /portal/reports/:reportId`
- `GET /portal/reports/:reportId/download`
- `GET /portal/account`
- `POST /portal/billing/manage`

Authentication, server-side sessions, Host/TLS/Origin/CSRF checks, organisation ownership, released-only visibility, artifact hash verification, sandbox CSP, audit events and server-resolved Stripe ownership are unchanged.

## Truthful view model

Portal summaries use persisted `Site`, `Subscription`, released `Report`, `Report.customerSummary`, `Report.customerPresentation`, `Job` and `Run` fields. Dates are omitted or labelled unavailable when absent. Monitoring-cycle counts include released monitoring jobs only. Baselines say **Baseline established** and never imply a prior observation.

Newly released reports freeze a bounded customer presentation record containing report kind, comparison relationship, customer-visible change count and observation completion time. Change counts include only non-suppressed reviewed findings matched to stored comparison results or LawWatch change rules. Suppressed findings never contribute.

The deterministic presentation mapping is:

| Raw state | Customer label |
| --- | --- |
| `PASS` | Confirmed |
| `WARNING` | Review recommended |
| `POTENTIAL_ISSUE` | Action recommended |
| `UNKNOWN` | Could not confirm |
| `NOT_APPLICABLE` | Not applicable |

Raw state, rule/version, source, timestamp, service context and uncertainty codes remain available in detailed report evidence. `UNKNOWN` uses neutral styling and explicitly says it does not necessarily mean information is absent.

## Report template and immutable boundary

New releases use `customerVersion: 2`. The single existing `releaseReport` pipeline renders the new template, stores one immutable artifact, hashes it and freezes the summary/presentation fields. It does not regenerate reports on view.

Version-1 artifacts remain eligible for customer history and continue to be served from stored bytes after hash verification. Calling release on an already released report returns the existing record without invoking artifact storage. No historical artifact, hash or review was rewritten.

Template 2 contains:

- a formal cover with organisation, domain, report type, date, reference and comparison context;
- a customer-safe executive summary;
- attention findings before uncertainty and confirmed observations;
- compact confirmed observations;
- bounded expandable evidence with raw status retained;
- a human-review marker that makes no certification claim;
- a technical appendix and restrained monitoring disclaimer.

The print stylesheet defines A4 margins, a cover page break, economical light backgrounds, page-break protection for findings, visible status text, printable evidence and a report reference/footer. Browser Print / Save as PDF is the supported pathway; native PDF generation was not added.

## Empty and lifecycle states

The portal deliberately renders a baseline-in-progress state, no-report state, first baseline, active monitoring, paused monitoring, stale billing confirmation, payment issue, cancel-at-period-end and cancelled history. Billing remains secondary and authoritative state continues to arrive through verified Stripe webhooks.

## Visual validation

Ignored local screenshots are generated under `reports/milestone16-1/` at 390, 768 and 1280 pixels. They cover login, active overview, baseline-only history, two-report history, account/billing, baseline and monitoring openings, an important finding, confirmed observations, evidence disclosure and representative print rendering.

Automated checks assert no horizontal overflow at the tested portal/report widths. The report retains evidence under print media and status meaning never depends on colour alone.

Final validation passed 953 tests across 43 files, including 16 M16.1 additions. The portal/backup suite passed 60 tests, the focused customer-experience selection passed 66 tests, and the selective-browser regression suite remained 105/105. Type checking, production build and dependency audit passed with zero known vulnerabilities.

The preserved 50-firm benchmark remained 233 PASS, 53 WARNING, 564 UNKNOWN and zero POTENTIAL_ISSUE across 850 checks. Serious controls remained 4 TP / 0 FP / 0 FN. M10 service-context review results remained 71.25% exact agreement, 81.25% firm-wide agreement and 0/30 false assignments. These are preserved-corpus regression results, not live pilot accuracy estimates.

## Deliberately deferred

- Native PDF generation and attachment delivery.
- Additional portal roles or customer-editable organisation/site settings.
- Charts, scores or regulatory-compliance percentages.
- Product copy changes based on real pilot interviews.
- Any public website, DNS, live Stripe or production deployment change.

Pilot evidence should determine whether customers prefer denser report summaries, a native PDF artifact, additional comparison language or different history filters.
