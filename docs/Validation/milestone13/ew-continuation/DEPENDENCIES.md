# E&W dependency and failure investigation

## What the new frozen cohort established

- EW01, EW02 and EW16 (TMC Solicitors / Immigration Solicitors 4Me): first-party document, JavaScript and CSS were fetched. Each attempt rejected third-party Google tag-manager and ReviewSolicitors scripts and failed closed with `BROWSER_NETWORK_POLICY`. The independent browser could display meaningful content, but WatchLayer retained no DOM representation. This is not `PARTIAL_EXPECTED_RECOVERY`.
- EW03, EW04, EW05 and EW15 (Michael Stevens Solicitors): the static document was available, but the site's robots policy excluded the first-party Next.js chunks. Each attempt failed with `Excluded by robots.txt`. No robots exception is justified.
- No completed render, timeout, new rendered fact, or dynamic document link was recorded. Nine static-sufficient controls did not render.

## Resource categories

| Host/path | Observed type | Category | Decision |
|---|---|---|---|
| `www.googletagmanager.com/gtag/js` (query redacted) | script | TRACKING_ANALYTICS | Rejected; no access granted. |
| `www.reviewsolicitors.co.uk/widget/rs.js` | script | UNKNOWN_THIRD_PARTY (review widget) | Rejected; no claim that it is an essential content library. |
| `fonts.googleapis.com/css2` | stylesheet | Existing font-only omission | Omitted without third-party access under existing policy. |
| First-party `/assets/index-*.js` and `.css` at Immigration Solicitors 4Me | script / stylesheet | FIRST_PARTY | Fetched under current bounds. |
| First-party `/_next/static/chunks/*.js` at Michael Stevens | script | FIRST_PARTY, robots excluded | Rejected; no bypass. |

The shared evaluator's extension-based diagnostic heuristic labels the review-widget script `STATIC_LIBRARY`. That heuristic is **not** an authorization decision and is too broad to establish library semantics. This manual investigation deliberately records it as UNKNOWN_THIRD_PARTY; neither label grants access. Its cookies, credentials, redirects, data handling and necessity were not investigated or established, because no exception is proposed. No exact-path STATIC_LIBRARY candidate was shown to be necessary across multiple E&W organisations.

The current renderer rejects arbitrary third-party resources before its later tracking omission check. This existing fail-closed behavior can discard otherwise useful first-party content when a page requests an optional widget or tracker. The observations document that limitation; they do not establish that a partial observation can safely replace a completed execution. No production policy, failure classification, readiness threshold, page budget, or network permission was changed in this continuation. Any future proposal to retain positive evidence after specific blocked optional resources needs its own bounded design, provenance/completeness treatment and safety tests; it must not enable those resources or imply complete visibility.

The browser's `bytes` counter measures additional resource transfer, excluding the already fetched static seed. Thus Michael Stevens attempts record zero additional bytes while their document events still have a seed size. The total 59 request events includes rejected and omitted requests; 46 were blocked/omitted. These are not 59 successful network transfers. Total additional resource bytes were 3,399,474. No external script was fetched by WatchLayer to force coverage.

All LAW-U and PRICE content rules on the seven failed attempts remained UNKNOWN. Weak metadata-based service candidates, where already present in static facts, remained low confidence and did not promote content rules. All services were UNKNOWN or low confidence, with no NOT_DETECTED absence classification on these failed targets. Informational/change-baseline statuses are separate from content-rule support. No POTENTIAL_ISSUE was emitted.
