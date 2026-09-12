# Milestone 4 — LawWatch England & Wales v1.0

WatchLayer now runs its first separate industry pack, `lawwatch-england-wales` v1.0, alongside `watchlayer-universal`. Repository/package names, `.watchlayer/` database paths and internal WatchLayer identifiers are unchanged. The provisional commercial brand was not introduced into code or storage.

## Regulatory basis and scope

The metadata references the [SRA Transparency Rules](https://www.sra.org.uk/solicitors/standards-regulations/transparency-rules/), whose current page was checked on 12 September 2026 and identifies the version effective 11 April 2025. The pack addresses observable costs, complaints and regulatory-information indicators. References live in pack metadata, not scattered through crawler logic. The [SRA clickable-logo guidance](https://www.sra.org.uk/solicitors/resources/fees/clickable-logo/) identifies Yoshki as the badge provider and explains why operation depends on registration and runtime behavior.

This is deterministic website monitoring, not certification. No legal judgement follows from a missing observation. Generated statuses remain PASS, WARNING, POTENTIAL_ISSUE, UNKNOWN and NOT_APPLICABLE. Severity and confidence remain separate. The report includes the statement: “This report identifies public website signals only and does not certify regulatory compliance.”

## Pack architecture

The pack contains 34 versioned rule definitions:

- LAW-U001–010: number, badge presence, badge operation, complaints, Ombudsman reference/contact/timing, SRA conduct/escalation and structural accessibility.
- PRICE-001–017: the requested cost, charging, staff, disbursement, VAT, scope, stages, timing, conditional-payment and accessibility/association indicators, evaluated per service.
- LAW-I001–002: old explicit review years and historical pricing-year references, with INFO severity.
- LAW-C001–005: monitored page availability, number/badge continuity and material pricing changes.

`src/lawwatch/pack.ts` owns the definitions and reference metadata. `detectors/services.ts`, `pricing.ts`, `regulatory.ts` and `common.ts` separate service, price and regulatory patterns from extraction. `extract.ts` processes transient static HTML; `inventory.ts` builds classifications and surfaces; `evaluate.ts` supplies structured detector evidence to the generic engine; `service.ts` orchestrates capture, stored evaluation and persistence; `report.ts` and `wording.ts` handle presentation.

The generic rule engine gained a `structured_fact` detector input, usable by future industry packs. It has no LawWatch-specific imports. `scanAndPersist` exposes a generic response observer; the LawWatch adapter uses it for successful HTML responses, including existing bounded rechecks. The crawler does not know about SRA rules. The LawWatch run includes the complete definition, rule versions, pack version and detector version reference. Both packs use the existing immutable rule-run/result/finding storage.

## Service applicability

Ten stable identifiers are supported: `residential_conveyancing`, `remortgage`, `probate`, `immigration`, `immigration_appeals`, `motoring`, `employment_employee`, `employment_employer`, `debt_recovery`, `business_licensing`.

Every classification returns DETECTED_HIGH_CONFIDENCE, DETECTED_LOW_CONFIDENCE, NOT_DETECTED or UNKNOWN, with source URLs, selected wording and an explanation. Explicit offering language and scoped service wording support high confidence; generic employment, probate, immigration or licensing mentions alone remain limited evidence. Motoring requires the single-hearing/Magistrates context; employer defence requires Tribunal context. News/article wording does not establish a high-confidence advertised service.

No detected service is not proof that the firm never offers it. Pricing checks remain UNKNOWN for unresolved applicability. An explicit exclusion or the trusted API's `overrides: {service: false}` can produce NOT_APPLICABLE. `true` overrides confirm applicability but do not invent missing content evidence. Override origin is recorded in classifications. No customer UI or account system was added.

Results expand across all ten services, so summary counts can contain many UNKNOWN applicability checks. The readable report displays pricing detail for detected services and explains the denominator. There is no claim that the number of UNKNOWN results measures firm quality.

## Regulatory Surface Inventory

Surfaces record signal, optional service, URL, page/document type, confidence, first/latest observation dates and source evidence. Signals include number, badge, complaints, Ombudsman, SRA escalation, service pricing and `quote_generator_detected`. Source evidence can contain the anchor label, navigation/footer/body location and derived click depth. Depth is observed graph distance, not a legal assessment of prominence; absence of a path is unknown.

Old locations are retained as not observed or confirmed missing, with their original latest-observed time, rather than silently disappearing from history. Direct current document failures take precedence over a surviving document link. Multiple SRA numbers are retained with their URLs and nearby context; there is no one-number-per-site assumption or register verification. Office context remains in source snippets rather than an inferred office ownership model.

## Evidence retention and persistence

No full HTML archive or unrestricted visible-text storage was added. LawWatch scans evaluate transient HTML and persist only selected detector facts, snippets, document/link metadata, service classifications and hashes. Each snippet is at most 240 characters; ordinary detectors retain up to three matches per page, SRA numbers up to 20, and source links up to 500. Matching price fragments also retain the exact short matched values. Distant/ambiguous matches reduce confidence. Full request bodies are discarded after scanning. Full text in existing scan-only JSON remains the pre-existing Milestone 1 behavior.

Privacy pages and common footer/navigation wrappers are excluded from pricing/service classification, while public regulatory footer facts can still supply labelled numbers. This prevents privacy complaint wording or a repeated footer heading from becoming a pricing surface. Stored-scan evaluation cannot recover new patterns from discarded full text; a new scan is needed after extraction changes. Old scans without a LawWatch fact set produce UNKNOWN content results.

Migration 4 adds generic `scan_fact_sets` and `pack_reports` tables with foreign keys and immutable UPDATE/DELETE triggers. Fact sets are keyed by scan and namespace. Pack reports reference their persisted rule run and contain classifications, inventory, evidence, changes, drift, summary and both pack runs. Rule runs retain their existing atomic insert transactions. Capturing facts and saving the report happen after the scan transaction; an interrupted process can leave a saved scan without LawWatch evidence, which is handled as UNKNOWN. No historical scan, result or workbook is rewritten.

The versioned JSON report includes site/scan, both pack outputs, service classifications, surfaces, results, changes, drift and summary. Its Draft 2020-12 schema is `docs/schemas/lawwatch-report-v1.schema.json`, generated from `src/lawwatch/report-schema.ts` using `scripts/export-rule-schemas.ts`.

## Deterministic interpretation and limitations

- Labelled numbers support PASS; possible parenthesised SRA values remain limited-confidence warnings. Numbers are plausible identifiers, not register-verified affiliations.
- Recognized static badge integration supports presence only. Images with badge hints yield limited evidence; unfamiliar filenames do not establish absence. Badge operation always remains UNKNOWN without execution. Inline scripts are inspected as strings and never executed.
- Complaints/Ombudsman/SRA checks require relevant-page wording and explicit contact, timing or conduct indicators. They do not establish that every required legal detail is correct or current. Ambiguous wording produces WARNING/UNKNOWN.
- Pricing detectors use local text clauses for currency, charging, VAT, disbursements, scope, staff, stages and duration. A multi-service page cannot lend one service's price or VAT statement to another: ambiguous association yields UNKNOWN. Biographies on separate pages and complex tables may be missed.
- Document links establish a known location, not parsed content. All content-dependent PDF checks stay UNKNOWN unless equivalent strong HTML evidence exists. No PDF body parsing or cross-domain document downloading was introduced.
- Quote interfaces are recorded. Unavailable calculator output is UNKNOWN, while independently observed static supporting detail can still pass.
- Conditional-fee applicability is UNKNOWN if it cannot be established; absence of such wording is not automatically NOT_APPLICABLE.
- The central drift threshold is three calendar years. Old explicit dates produce INFO-severity observations, not a claim that prices are invalid. Year references without context may require review.
- Pricing/complaints page removal requires the existing eligible comparison and direct 404/410 evidence. Unvisited, excluded or inconclusive resources remain UNKNOWN. Number disappearance from a reliably reobserved surface produces a review warning; badge disappearance stays UNKNOWN. Material pricing change uses the existing content-change evidence and reliable current coverage, without judging the new price.

## Commands

```sh
npm run scan -- https://example.com --lawwatch
npm run lawwatch -- <scan-id>
npm run lawwatch -- https://example.com --json
npm run lawwatch -- <scan-id> --db .watchlayer/watchlayer.db --output reports/lawwatch.json
npm run validate:lawwatch
npm run evaluate-lawwatch -- --firm "Russell-Cooke"
npm run evaluate-lawwatch -- --firm "Nash & Co Solicitors" --firm "Thompson & Jackson" --max-pages 15
npm run evaluate-lawwatch -- --firm "Russell-Cooke" --report reports/existing-report.json
```

`--lawwatch` requires persistence and automatically runs both packs. The separate LawWatch command accepts a stored scan ID or latest site URL and makes no network requests. `--rules` remains the universal workflow; LawWatch runs are also visible in generic stored findings. JSON and readable reports use reusable wording templates. Evidence snippets quote observed content; they are source material, not generated regulatory conclusions.

## Human benchmark tooling and mapping

The read-only development adapter `scripts/read-lawwatch-benchmark.py` uses Python's standard-library ZIP/XML support. No production XLSX dependency was added. `scripts/lawwatch-benchmark.ts` invokes the adapter; `WATCHLAYER_PYTHON` can select a Python executable, with ordinary Python or the local bundled runtime as fallback.

All 50 rows and the 17 static rule columns come from **Full Benchmark**, joined to the cohort website URLs. The adapter explicitly maps “Redkite Solicitors” to the cohort's “Red Kite Law”; it does not edit either source label or use fuzzy company matching. The benchmark SHA-256 before and after work is `beafdde971fa122e4200a55863f7ff60ccd891640f81457dc1978eea27d7c4aa`.

The evaluator selects primary service categories from the benchmark label. Multiple selected service results must all pass to yield an aggregate PASS; unknown service evidence remains UNKNOWN. Human row-level assessments are not a perfect substitute for per-service labels, and this aggregation must be reviewed in Milestone 5.

Metrics use these explicit conventions:

- Exact agreement maps human Pass → PASS and Unknown → UNKNOWN. Future explicitly labelled Fail → POTENTIAL_ISSUE is supported. Review has no exact machine-state equivalent and is excluded from this denominator.
- Human Review is compatible with either WARNING or UNKNOWN for a separate review-compatibility count. It is never treated as evidence of a negative outcome.
- PASS precision is the proportion of machine passes backed by human Pass. Passes against Review/Unknown are separately counted as **unsupported passes**: this is a conservative confirmation rate, not proof those predictions are wrong.
- POTENTIAL_ISSUE precision requires explicit human negative evidence. The supplied workbook has no established negative labels for these static checks, so this metric cannot establish issue-detection accuracy. With zero predictions its value is `null`, never a fabricated 100%.
- False-positive count conservatively includes issue predictions lacking explicit human negative support; confirmed false positives against human Pass are also reported separately. High-severity false positives are counted separately.
- N/A rows are excluded from metric denominators. UNKNOWN rate uses the remaining scored checks. Raw per-rule comparisons are saved alongside metrics.

The manual command accepts one firm, up to three named firms, or `--all` only when explicitly requested. It defaults to 20 pages, caps the configurable budget at 100, uses one-second request spacing, processes firms sequentially and disables historical rechecks for evaluation. Existing robots/DNS/redirect/body limits stay in force. No benchmark source URL is silently inserted to inflate discovery results. No-argument invocation prints usage without crawling.

## Initial responsible live subset

On 12 September 2026, the initial implementation was exercised on Nash & Co Solicitors and Thompson & Jackson, with 15 pages each, one-second pacing and zero rechecks. Both reached the budget, with no failed pages. This was a tooling/coverage pilot, not the Milestone 5 benchmark study.

| Firm | Discovered / scanned | Exact agreement | Confirmed PASS precision | UNKNOWN | Potential issues | False-positive issues |
|---|---:|---:|---:|---:|---:|---:|
| Nash & Co Solicitors | 723 / 15 | 0/10 (0%) | 0/1 (0%) | 16/17 (94.1%) | 0 | 0 |
| Thompson & Jackson | 82 / 15 | 1/9 (11.1%) | 1/3 (33.3%) | 13/17 (76.5%) | 0 | 0 |

Issue precision was unavailable for both; high-severity false-positive issue counts were zero. The three unsupported PASS predictions were against human Review labels, not confirmed human failures. Nash's sample was dominated by sitemap-listed articles and missed the detailed pricing material. Thompson exposed the pricing hub and external PDF locations, whose contents remained unparsed. These low agreement/coverage results are limitations, not evidence of poor firm websites.

Inspection of this pilot also exposed privacy/footer wording entering the surface inventory. The final extractor excludes those cases and includes a local regression fixture. The sites were not repeatedly crawled to tune the reported metrics. Pilot outputs are retained under the ignored `reports/lawwatch-evaluation/2026-09-12T07-50-25-454Z/`; they describe that pilot run, not a final accuracy certification.

## Verification and next milestone

Final verification: **308 tests passed across 13 files**, comprising all 222 existing tests and 86 new tests. Type checking and the build passed; npm dependency audit reported zero vulnerabilities. Both healthy and removal fixture reports passed strict Draft 2020-12 JSON-schema validation with date-time formats checked. The readable reports were inspected and checked for prohibited generated legal conclusions. No production dependencies were added. The workbook checksum remained unchanged. Fixture outputs are under `reports/milestone4/scenario-0rSCrr/`.

Fixtures cover strong HTML pricing, complaints/contact routes, missing VAT, PDF-only pricing, quote calculators, multiple numbers, 2018/2019 wording, confirmed removal, unobserved resources, ambiguous and explicitly excluded services. Additional tests cover cross-service evidence isolation, script badge uncertainty, privacy/footer noise, persistence/immutability, CLI, schema structure and benchmark mapping. The existing migration upgrade fixture was extended to remove migration-4 tables when constructing a genuine version-one database.

No AI, PDF text extraction, browser rendering, accounts, UI, hosted API, scheduled jobs, billing or deployment was added. Milestone 5 should evaluate and harden discovery, service association, positive precision and uncertainty against the 50-firm human benchmark, including manually adjudicating Review labels and document/calculator limitations. It has not been started.
