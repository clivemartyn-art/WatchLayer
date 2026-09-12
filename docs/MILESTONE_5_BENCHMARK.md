# Milestone 5: LawWatch benchmark evaluation and hardening

Status: completed on 12 September 2026. Both 50-firm phases are complete. The UNKNOWN reduction target was met; the customer-facing high-severity precision release gate remains unproven. This milestone does not assert production readiness.

## Benchmark integrity and experiment

The human workbook `docs/Validation/LawWatch_Validation_Cohort_v2.xlsx` is read-only. Its SHA-256 is `beafdde971fa122e4200a55863f7ff60ccd891640f81457dc1978eea27d7c4aa`.

Baseline uses the unchanged Milestone 4 production scanner, twenty normal pages per firm, one-second minimum request spacing, and no historical rechecks. Fifty firms run sequentially, without parallel site scans. Each firm's immutable snapshot, selected facts, report and evaluation are retained under `reports/milestone5/baseline/`. This directory is ignored by Git because it contains local evaluation output. The manifest identifies the production source hash, benchmark hash and settings. Do not combine different source versions in a single phase.

Commands (resumable; all-firm crawling is explicit):

```text
node node_modules/tsx/dist/cli.mjs scripts/evaluate-milestone5.ts --phase baseline --all
node node_modules/tsx/dist/cli.mjs scripts/summarize-milestone5.ts reports/milestone5/baseline
```

Completed firm checkpoints are reused. Transport failures are recorded, not silently discarded from cohort metrics. An interruption within a firm may require restarting that firm's bounded crawl; completed firms are never repeated. Raw website archives and PDF contents are not retained. The workbook's manually collected source URLs are not fed into crawler discovery.

## Evaluation mapping

The seventeen workbook checks are evaluated against the workbook's selected service, using the existing conservative multi-service aggregation. Exact agreement maps human Pass to PASS, Unknown to UNKNOWN and Fail to POTENTIAL_ISSUE. Human Review has no exact machine-state equivalent and is excluded from the exact denominator. Human N/A is excluded from all scored denominators.

Acceptable agreement additionally counts human Review paired with machine WARNING or UNKNOWN. It does not count an abstention on human Pass as agreement. This explicit uncertainty compatibility is not evidence that WARNING is correct. WARNING precision is unavailable because the benchmark does not label machine warnings; WARNING–Review compatibility is reported separately.

PASS precision is the fraction of machine passes confirmed by human Pass. Predictions against Review or Unknown are unconfirmed, not automatically proven wrong. Recall measures detection among human Pass checks. Unsupported POTENTIAL_ISSUE results are counted conservatively as false-positive candidates; confirmed false positives against human Pass are also reported separately. Aggregate metrics use pooled check counts, not averages of firm percentages. Per-rule metrics use the same definitions.

The conservative false-positive rate fields use unsupported issues divided by scored checks (and by high-severity scored checks for that rate). Separately, confirmed false-positive rates use contradictions against human Pass divided by human Pass checks, including the high-severity equivalent. These denominators are explicit because Review is not established negative truth.

The high-severity potential-issue release threshold is at least 95%, preferably 100%. With no predictions the precision is unavailable. With no negative human ground truth the release gate is unproven even if no unsupported issues occur. The static seventeen-check benchmark cannot validate historical removal rules; deterministic change fixtures remain essential.

Many workbook service labels list several services. The retained aggregation requires every explicitly selected service to pass before reporting a firm-level pricing PASS. This is stricter than a human row that may describe one sampled pricing surface. A label containing only “Multiple” cannot identify a specific service for scoring and therefore remains uncertain. Neither missing service labels nor human Review rows are silently converted into convenient positive ground truth.

## Regression experiment

Before changing production code, local fixtures reproduced gaps in hub traversal, footer/client-care recognition, contextual document association, directly linked staff evidence, split table-cell pricing, several labelled SRA-number formats and stale-date context. The pre-hardening test output is retained in `reports/milestone5/pre-hardening-regressions.json`. Fixtures use fictional hostnames and reusable architecture patterns; they do not embed firm-specific routing logic or reproduce complete website archives.

## Baseline, target and final results

The complete baseline contains 50 firms and 850 scored checks: 437 human Pass and 413 human Review labels. It scanned 957 HTML pages. Exact agreement was 29/437 (6.64%); acceptable agreement was 389/850 (45.76%). There were 82 machine passes, ten warnings and 758 unknowns (89.18%). Human-confirmed PASS precision was 29/82 (35.37%); PASS recall was 29/437 (6.64%). No potential issues or high-severity false-positive issues were produced. Potential-issue precision and the release gate remain unproven. WARNING precision is unavailable; seven of ten warnings were compatible with human Review.

Pricing HTML appeared in the inventory for 26 firms, pricing documents for three, complaints surfaces for nine, and pricing associated with an explicitly benchmarked service for 22. Some baseline pricing entries were noisy article matches, so raw surface counts alone are not proof of useful evidence coverage.

After preserving all 50 results, and before activating production changes, the target was set to **at least 25% relative reduction in UNKNOWN**, with no unsupported high-severity potential issues. This means at most 568 unknown checks out of 850 (66.82%). The target is justified by extensive missed complaints/pricing discovery and near-total uncertainty in content-level pricing rules. It is an experimental target, not permission to weaken evidence standards. PDF limitations, ambiguous applicability and multi-service benchmark aggregation may prevent it from being met; any shortfall must be quantified.

## Discovery and extraction changes

The generic crawler accepts a neutral `CrawlPolicy`: URL ranking, a profile identifier and bounded extra stages. Sector vocabulary lives in `src/lawwatch/discovery.ts`; generic scans retain FIFO behavior. The normal homepage is always first. LawWatch then ranks sitemap and discovered links before spending the normal budget, followed by a separate regulatory-evidence stage (default 40, configurable 0–50) and linked-staff stage (default five, configurable 0–10). The normal LawWatch page budget remains capped at 100. Cohort evaluation uses 20 normal pages, 40 evidence pages, five staff pages and zero historical rechecks, sequentially with one-second request spacing.

Base scores are complaints/client care/ombudsman 400; pricing/fees/costs/transparency/quotes 350; legal/regulatory/terms 140; relevant services 60; other paths zero. Privacy/testimonials are -60, staff paths -80, news/blog/article/event paths -100 and search/calendar/query traps -200. Relevant anchor labels increase priority (complaints/regulatory 410; pricing 380), navigation/footer adds 20, and relevant pricing-hub children receive at least 220. Known explicit pricing URLs therefore outrank generic hub children. Ties retain discovery order. Biographies are reserved for the staff stage; a general team index may be seen during the normal crawl, but it does not authorize crawling all biographies.

A large sitemap previously filled the 10,000-URL discovery set and prevented later linked regulatory pages from entering it. At capacity, the optional policy now allows a positive-priority newly linked URL to replace a lower-priority unvisited candidate. The set remains capped at 10,000. This is not an unlimited expansion or a firm-specific exception. The discovery count is the bounded admitted set, not an estimate of every URL on the website.

All stages share the same request transport, queue, fetched-URL set and robots cache. Per-hop robots checks were added for page redirects. Existing same-registrable-domain, public DNS/address pinning, pacing, five-redirect and 2 MB response safeguards remain in force. Excluded candidates count against extra-stage selection caps. Documents are inventoried from links and are not downloaded for parsing. Optional per-stage coverage records budgets, attempted requests, HTML pages, skips and budget exhaustion. Aggregate page/failure totals include all stages.

Link facts retain the anchor, source URL, region, bounded local context, likely service and document purpose. Navigation neighbors are deliberately not pooled: a pricing link cannot make an adjacent team link a pricing surface. Pricing hubs can establish a scoped relationship to an opaque child URL. Generic document names can inherit their local service-section context. A dedicated pricing page can be associated with a service already confidently advertised elsewhere on the site, while genuinely ambiguous multi-service pricing still remains uncertain.

Text detectors now retain local paragraph, table-row and heading/list relationships. Heading-delimited pricing sections prevent VAT or fee evidence being borrowed between services. Explicitly linked staff qualifications can support the relevant pricing service; a supervisor requires both a source supervisory relationship and qualification evidence. Unlinked biographies and marketing adjectives are insufficient. SRA labels support “is” and “under number” variants without accepting unrelated company or telephone numbers. Badge operation stays UNKNOWN. The VAT-rate/amount detector no longer treats a legal fee amount followed by “plus VAT” as the VAT amount.

Complaints discovery supports client care, feedback, customer-service and regulatory/terms variants, but a concrete complaint procedure is still needed. News and privacy material are excluded from pricing extraction. Pricing-word boundaries prevent “Feedback” being mistaken for “fee.” Historic-year signals exclude copyright, qualification, founding and explicit historical-narrative contexts.

## Retention, versions and uncertainty

LawWatch pack, rules and new fact extraction are version 1.1; WatchLayer Universal remains 1.0. Existing immutable history is retained. New optional fields fit the existing versioned JSON fact/report tables, so no additional database tables or schema migration are needed. Discovery profile and budgets are persisted with snapshots and must match for baseline selection/removal conclusions. Number/badge comparisons also require matching fact-detector versions.

No full website archive was added. HTML/text is transient; retained facts are selected snippets (240 characters), structured matches, bounded link context, associations and hashes. Link lists and detector matches remain capped. Existing older fact sets cannot gain new extraction evidence without a new scan. Historical reports remain immutable; the report schema accepts both pack versions.

Every current UNKNOWN result carries reason codes and a customer-safe explanation. Codes distinguish missing pages, document content unavailable, browser dependence, insufficient deterministic patterns, service uncertainty, missing staff evidence, exhausted budgets, network failures and ambiguous evidence. Human reports show explanations by default; `--reason-codes` adds the diagnostic identifiers. Evaluation aggregates one primary cause per benchmark UNKNOWN so percentages do not double count. A PDF-related cause indicates an unparsed relevant alternative, not a promise that parsing it would establish a PASS.

## Focused live checks

The first hardened subset used Nash & Co Solicitors, Sintons and Rachel Sebastian & Co, with the same 20+40+5 limits planned for the final cohort. Their UNKNOWN rates were respectively 64.71%, 76.47% and 52.94%, with zero potential issues. These intermediate results predate the final discovery-cap admission fix and dedicated-service association adjustment, and must not be presented as the final results. Artifacts: `reports/lawwatch-evaluation/2026-09-12T14-48-49-846Z/`.

Single-page manual diagnostics investigated the known age examples without feeding benchmark source URLs into crawler discovery. Sintons' public `/employment/pricing-individuals/` HTML returned 200 and retained the 2018 review wording, but that URL had not entered the capped discovery set in the intermediate scan. This produced the full-cap regression fixture and admission fix. Rachel Sebastian's current `/probate.html` returned 200 but contained no 2019, pound-price or VAT text in the static extraction; the expected historic fee signal was not invented. Manual diagnostic requests are separate from cohort metrics and did not store HTML.

## Final interpretation and remaining blockers

The final cohort scanned 2,517 HTML pages and scored all 850 checks. UNKNOWN fell from 758 to 558: a 26.39% relative reduction (23.53 percentage points), exceeding the preselected 25% target. Pricing HTML inventory coverage rose from 26 to 49 firms, complaints surfaces from nine to 45, pricing documents from three to 15 and selected-service pricing from 22 to 48. These are detected surfaces, not independently adjudicated correct locations. The larger evidence budget is part of this intervention; this experiment cannot attribute the improvement solely to ranking or detectors.

Exact agreement and PASS recall rose from 6.64% to 31.12%; acceptable agreement from 45.76% to 51.53%; human-confirmed PASS precision from 35.37% to 55.06%. The final 247 passes include 111 against human Review, requiring adjudication rather than automatic classification as errors. WARNING precision remains unavailable; 27 of 45 warnings (60%) are Review-compatible. No potential issues were emitted, including outside the seventeen benchmark checks. Manual review therefore had no high-severity candidates to assess. Zero false-positive issues does not demonstrate 95% precision, particularly with no human Fail examples.

The weakest pricing checks remain supervisor evidence (96% UNKNOWN), inclusions (94%), exclusions (90%) and timescales (88%). Staff experience and both benchmarked VAT checks are 84% UNKNOWN. Digital badge presence is 82% UNKNOWN; badge operation remains deliberately uncertain without execution. SRA-number and Ombudsman recall reached 100% among human Pass rows, but many additional passes are against Review and are not independently confirmed.

Primary UNKNOWN causes are insufficient deterministic evidence (171; 30.65%), browser/calculator dependence (152; 27.24%), uncertain service applicability (97; 17.38%), unavailable document content (64; 11.47%), ambiguous evidence (39; 6.99%), missing staff information (29; 5.20%) and undiscovered pages (six; 1.08%). Reason attribution is diagnostic, not an independently verified causal diagnosis. In particular browser dependence includes static quote-calculator limitations; it is not proof that a browser would resolve all 152 checks. Sixty-four remaining unknowns have relevant unparsed PDF/document evidence; PDF parsing alone cannot explain or fix most uncertainty.

## Difficult site architectures

Large news-heavy sitemaps can crowd out useful links; prioritised admission now addresses this within the existing cap. Multi-service price tables and generic hub links need local service association rather than site-wide borrowing. Linked biographies need explicit qualification and supervision relationships. Document-heavy and quote-led firms remain limited by the deliberate absence of PDF parsing and browser execution. Current static content can also differ from the human workbook: the Rachel Sebastian 2019 wording was not observable in the diagnostic extraction and was not fabricated.

Report inspection also found complaints-related data-protection pages and articles among retained evidence (for example Thompson Jackson and Nelsons). Such surfaces may concern complaints without establishing the firm's client complaints procedure. This is an unresolved semantic precision risk; the 45-firm surface count should not be read as 45 independently verified procedures. Future adjudication should distinguish these contexts. No post-cohort detector tuning was performed, preserving the single frozen final experiment.

## Verification and reproducibility

All 373 tests pass across 15 files, retaining the previous 308 and adding 65. New deterministic coverage includes ranked discovery, full-cap admission, bounded regulatory/staff stages, redirect robots safeguards, comparison-profile isolation, contextual documents, section-specific service pricing, linked staff/supervision, SRA formats, VAT amount distinction, news/feedback noise, staleness, uncertainty reasons, CLI options and metric mapping. Type checking and build pass. Dependency audit reports zero vulnerabilities; no production dependency was added.

All 50 final JSON reports pass strict report-schema validation. The frozen production source hash matches the final manifest. Generated finding descriptions/messages contain no prohibited legal conclusions; verbatim source titles can contain ordinary legal subject names such as contract breach, which are evidence labels rather than assertions about a firm's website. Local healthy/removal fixture reports also validate; confirmed removal behavior remains covered by eligible 404/410 and NOT_OBSERVED protections. Production LawWatch source was inspected for firm-specific hostname exceptions; none were found. The development-only workbook alias is not crawler logic.

The workbook checksum remains exactly the value recorded above. Baseline and final manifests, immutable databases and per-firm checkpoints are retained locally under the ignored reports directory. Summarising these saved outputs reproduces the tables without network requests. A future live crawl is not expected to reproduce identical website content. Historical 1.0 facts cannot be retrospectively improved by 1.1 extraction; use a fresh scan for new evidence.

## Recommended Milestone 6

Prioritise evidence adjudication and scoped pricing accuracy: review the 111 unconfirmed PASS results, distinguish client complaints from articles/data-protection contexts, resolve service-level benchmark mappings, and improve inclusion/supervision/timescale fixtures. Add independently labelled negative and historical-change cases before claiming the high-severity precision gate. A separately approved bounded PDF extraction experiment could address the 11.47% document-associated share; evaluate its benefit independently rather than assuming it resolves all remaining uncertainty. Browser/calculator handling needs its own later decision. Do not launch customer alerts or claim regulatory certification from these results. Milestone 6 has not been started.

<!-- BENCHMARK_RESULTS -->

## Final cohort results

| Metric | Baseline | Final |
| --- | --- | --- |
| Scored checks | 850 | 850 |
| Exact agreement | 6.64% | 31.12% |
| Acceptable agreement | 45.76% | 51.53% |
| UNKNOWN | 758 (89.18%) | 558 (65.65%) |
| Human-confirmed PASS precision | 35.37% | 55.06% |
| PASS recall | 6.64% | 31.12% |
| WARNING precision | Unavailable | Unavailable |
| WARNING–Review compatibility | 70.00% | 60.00% |
| Potential issues | 0 | 0 |
| Potential-issue precision | Unavailable | Unavailable |
| High-severity false-positive issue candidates | 0 | 0 |
| Confirmed false-positive issue rate | 0.00% | 0.00% |
| Release gate | UNPROVEN | UNPROVEN |

Relative UNKNOWN reduction: **26.39%** (200 fewer unknown checks). The 25% target is met. This is not a production-readiness claim.

## Discovery coverage

| Coverage measure | Baseline firms / pages | Final firms / pages |
| --- | --- | --- |
| firmsWithPricingHtml | 26 | 49 |
| firmsWithPricingDocuments | 3 | 15 |
| firmsWithComplaints | 9 | 45 |
| firmsWithSelectedServicePricing | 22 | 48 |
| firmsWithQuoteGenerator | 12 | 25 |
| totalPagesScanned | 957 | 2517 |

## Baseline rule-by-rule metrics

| Rule | Human Pass | Machine PASS | UNKNOWN | Exact agreement | Confirmed PASS precision |
| --- | --- | --- | --- | --- | --- |
| LAW-U001 | 17 | 37 | 13 | 88.24% | 40.54% |
| LAW-U002 | 2 | 7 | 42 | 50.00% | 14.29% |
| LAW-U004 | 31 | 9 | 41 | 6.45% | 22.22% |
| LAW-U005 | 17 | 7 | 43 | 0.00% | 0.00% |
| LAW-U008 | 13 | 3 | 40 | 0.00% | 0.00% |
| PRICE-001 | 45 | 1 | 49 | 2.22% | 100.00% |
| PRICE-002 | 45 | 2 | 47 | 0.00% | 0.00% |
| PRICE-004 | 18 | 2 | 48 | 5.56% | 50.00% |
| PRICE-005 | 6 | 2 | 48 | 0.00% | 0.00% |
| PRICE-006 | 38 | 1 | 49 | 2.63% | 100.00% |
| PRICE-008 | 37 | 1 | 49 | 0.00% | 0.00% |
| PRICE-010 | 14 | 1 | 49 | 0.00% | 0.00% |
| PRICE-011 | 42 | 0 | 50 | 0.00% | Unavailable |
| PRICE-012 | 27 | 0 | 50 | 0.00% | Unavailable |
| PRICE-013 | 17 | 2 | 47 | 5.88% | 50.00% |
| PRICE-014 | 20 | 1 | 49 | 5.00% | 100.00% |
| PRICE-016 | 48 | 6 | 44 | 12.50% | 100.00% |

## Final rule-by-rule metrics

| Rule | PASS | WARNING | UNKNOWN | Exact | Acceptable | PASS precision | PASS recall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| LAW-U001 | 41 | 0 | 9 | 100.00% | 52.00% | 41.46% | 100.00% |
| LAW-U002 | 7 | 2 | 41 | 50.00% | 86.00% | 14.29% | 50.00% |
| LAW-U004 | 45 | 0 | 5 | 96.77% | 68.00% | 66.67% | 96.77% |
| LAW-U005 | 42 | 0 | 8 | 100.00% | 50.00% | 40.48% | 100.00% |
| LAW-U008 | 30 | 17 | 3 | 84.62% | 58.00% | 36.67% | 84.62% |
| PRICE-001 | 5 | 4 | 41 | 11.11% | 20.00% | 100.00% | 11.11% |
| PRICE-002 | 9 | 3 | 38 | 15.56% | 20.00% | 77.78% | 15.56% |
| PRICE-004 | 8 | 0 | 42 | 11.11% | 56.00% | 25.00% | 11.11% |
| PRICE-005 | 2 | 0 | 48 | 0.00% | 84.00% | 0.00% | 0.00% |
| PRICE-006 | 8 | 2 | 40 | 21.05% | 40.00% | 100.00% | 21.05% |
| PRICE-008 | 6 | 2 | 42 | 10.81% | 30.00% | 66.67% | 10.81% |
| PRICE-010 | 4 | 4 | 42 | 14.29% | 72.00% | 50.00% | 14.29% |
| PRICE-011 | 0 | 3 | 47 | 0.00% | 16.00% | Unavailable | 0.00% |
| PRICE-012 | 3 | 2 | 45 | 3.70% | 44.00% | 33.33% | 3.70% |
| PRICE-013 | 9 | 5 | 36 | 23.53% | 64.00% | 44.44% | 23.53% |
| PRICE-014 | 5 | 1 | 44 | 20.00% | 66.00% | 80.00% | 20.00% |
| PRICE-016 | 23 | 0 | 27 | 47.92% | 50.00% | 100.00% | 47.92% |

Every row above represents 50 firms. Full per-rule denominators, human/machine label counts, warning compatibility, issue precision and false-positive rates are in the reproducible phase `summary.json` files. WARNING precision is unavailable for every rule because the workbook has no machine-warning ground truth.

## Remaining UNKNOWN causes

| Primary cause | Checks | Share of remaining UNKNOWN |
| --- | --- | --- |
| DETECTOR_INSUFFICIENT | 171 | 30.65% |
| BROWSER_REQUIRED | 152 | 27.24% |
| SERVICE_APPLICABILITY_UNCERTAIN | 97 | 17.38% |
| DOCUMENT_CONTENT_UNAVAILABLE | 64 | 11.47% |
| AMBIGUOUS_EVIDENCE | 39 | 6.99% |
| STAFF_INFORMATION_NOT_DISCOVERED | 29 | 5.20% |
| PAGE_NOT_DISCOVERED | 6 | 1.08% |

PDF-associated UNKNOWN: **64/558 (11.47%)**. This is the primary document-unavailable category with a relevant PDF link, not a prediction that PDF parsing would resolve every such check.

| Rule | UNKNOWN causes (counts) |
| --- | --- |
| PRICE-005 | STAFF_INFORMATION_NOT_DISCOVERED: 17; BROWSER_REQUIRED: 16; DOCUMENT_CONTENT_UNAVAILABLE: 7; SERVICE_APPLICABILITY_UNCERTAIN: 4; DETECTOR_INSUFFICIENT: 3; AMBIGUOUS_EVIDENCE: 1 |
| PRICE-014 | DETECTOR_INSUFFICIENT: 15; BROWSER_REQUIRED: 13; SERVICE_APPLICABILITY_UNCERTAIN: 8; DOCUMENT_CONTENT_UNAVAILABLE: 4; AMBIGUOUS_EVIDENCE: 4 |
| LAW-U001 | DETECTOR_INSUFFICIENT: 9 |
| LAW-U002 | DETECTOR_INSUFFICIENT: 41 |
| PRICE-001 | BROWSER_REQUIRED: 13; DETECTOR_INSUFFICIENT: 10; SERVICE_APPLICABILITY_UNCERTAIN: 9; DOCUMENT_CONTENT_UNAVAILABLE: 5; AMBIGUOUS_EVIDENCE: 4 |
| PRICE-002 | BROWSER_REQUIRED: 11; DETECTOR_INSUFFICIENT: 10; SERVICE_APPLICABILITY_UNCERTAIN: 8; DOCUMENT_CONTENT_UNAVAILABLE: 5; AMBIGUOUS_EVIDENCE: 4 |
| PRICE-004 | BROWSER_REQUIRED: 13; STAFF_INFORMATION_NOT_DISCOVERED: 12; SERVICE_APPLICABILITY_UNCERTAIN: 7; DOCUMENT_CONTENT_UNAVAILABLE: 5; DETECTOR_INSUFFICIENT: 4; AMBIGUOUS_EVIDENCE: 1 |
| PRICE-006 | DETECTOR_INSUFFICIENT: 13; BROWSER_REQUIRED: 10; SERVICE_APPLICABILITY_UNCERTAIN: 9; DOCUMENT_CONTENT_UNAVAILABLE: 4; AMBIGUOUS_EVIDENCE: 4 |
| PRICE-008 | BROWSER_REQUIRED: 13; DETECTOR_INSUFFICIENT: 12; SERVICE_APPLICABILITY_UNCERTAIN: 8; DOCUMENT_CONTENT_UNAVAILABLE: 5; AMBIGUOUS_EVIDENCE: 4 |
| PRICE-010 | BROWSER_REQUIRED: 16; DETECTOR_INSUFFICIENT: 11; DOCUMENT_CONTENT_UNAVAILABLE: 6; SERVICE_APPLICABILITY_UNCERTAIN: 5; AMBIGUOUS_EVIDENCE: 4 |
| PRICE-011 | BROWSER_REQUIRED: 17; DETECTOR_INSUFFICIENT: 15; DOCUMENT_CONTENT_UNAVAILABLE: 7; AMBIGUOUS_EVIDENCE: 4; SERVICE_APPLICABILITY_UNCERTAIN: 4 |
| PRICE-012 | BROWSER_REQUIRED: 15; DETECTOR_INSUFFICIENT: 14; SERVICE_APPLICABILITY_UNCERTAIN: 7; DOCUMENT_CONTENT_UNAVAILABLE: 5; AMBIGUOUS_EVIDENCE: 4 |
| PRICE-013 | BROWSER_REQUIRED: 9; DETECTOR_INSUFFICIENT: 8; SERVICE_APPLICABILITY_UNCERTAIN: 8; DOCUMENT_CONTENT_UNAVAILABLE: 7; AMBIGUOUS_EVIDENCE: 4 |
| LAW-U005 | DOCUMENT_CONTENT_UNAVAILABLE: 3; DETECTOR_INSUFFICIENT: 3; PAGE_NOT_DISCOVERED: 2 |
| PRICE-016 | SERVICE_APPLICABILITY_UNCERTAIN: 20; BROWSER_REQUIRED: 6; AMBIGUOUS_EVIDENCE: 1 |
| LAW-U004 | DETECTOR_INSUFFICIENT: 3; PAGE_NOT_DISCOVERED: 2 |
| LAW-U008 | PAGE_NOT_DISCOVERED: 2; DOCUMENT_CONTENT_UNAVAILABLE: 1 |

## Firm-level coverage and uncertainty

| Firm | Baseline pages | Final pages | Baseline UNKNOWN | Final UNKNOWN |
| --- | --- | --- | --- | --- |
| Nash & Co Solicitors | 20 | 44 | 16 | 2 |
| Thompson & Jackson | 20 | 25 | 13 | 13 |
| Barcan+Kirby | 19 | 58 | 16 | 12 |
| Tozers | 20 | 65 | 16 | 11 |
| Hethertons | 20 | 61 | 14 | 13 |
| Ware & Kay | 20 | 53 | 16 | 13 |
| Harrowells | 20 | 47 | 16 | 12 |
| Dean Wilson LLP | 19 | 58 | 14 | 13 |
| Fieldings Porter | 20 | 30 | 16 | 12 |
| Winston Solicitors | 20 | 54 | 16 | 13 |
| Tilly Bailey & Irvine | 19 | 60 | 16 | 13 |
| Kitson Boyce | 20 | 39 | 17 | 15 |
| Rothera Bray | 20 | 64 | 15 | 12 |
| Mayo Wynne Baxter | 20 | 38 | 17 | 13 |
| Stephens Scown | 20 | 59 | 17 | 14 |
| Wolferstans | 20 | 37 | 15 | 4 |
| GA Solicitors | 20 | 63 | 16 | 13 |
| Battrick Clark | 20 | 24 | 16 | 13 |
| Burt Brill & Cardens | 19 | 62 | 13 | 13 |
| Trethowans | 17 | 59 | 15 | 13 |
| Moore Barlow | 20 | 64 | 17 | 11 |
| Biscoes Solicitors | 20 | 65 | 17 | 14 |
| Guest Walker | 20 | 32 | 16 | 16 |
| Blacks Solicitors | 20 | 65 | 16 | 13 |
| John Howe & Co | 11 | 15 | 16 | 16 |
| Sintons | 20 | 63 | 16 | 13 |
| Rachel Sebastian & Co | 12 | 12 | 8 | 9 |
| Minahan Hirst & Co | 9 | 9 | 14 | 14 |
| Private Client Solicitors | 20 | 38 | 16 | 3 |
| Slater Heelis | 20 | 60 | 15 | 12 |
| Stephensons Solicitors | 20 | 64 | 7 | 3 |
| Guy Williams Layton | 20 | 41 | 17 | 13 |
| Morecrofts | 20 | 57 | 16 | 5 |
| MSB Solicitors | 19 | 53 | 14 | 12 |
| Sydney Mitchell | 20 | 62 | 15 | 6 |
| FBC Manby Bowdler | 16 | 62 | 13 | 8 |
| Higgs LLP | 18 | 65 | 15 | 8 |
| Shakespeare Martineau | 20 | 49 | 15 | 13 |
| Nelsons | 20 | 63 | 16 | 13 |
| Sills & Betteridge | 19 | 65 | 16 | 1 |
| Ashtons Legal | 20 | 63 | 16 | 13 |
| Tees Law | 20 | 64 | 16 | 13 |
| Birketts | 20 | 65 | 16 | 13 |
| Leadenhall Law Group | 20 | 19 | 13 | 13 |
| JCP Solicitors | 20 | 65 | 16 | 13 |
| Redkite Solicitors | 20 | 65 | 16 | 13 |
| Watkins & Gunn | 20 | 31 | 16 | 12 |
| Bishopsgate Law | 20 | 25 | 13 | 11 |
| Streathers Solicitors | 20 | 52 | 16 | 13 |
| Russell-Cooke | 20 | 64 | 15 | 4 |

## Reproduction and provenance

Baseline production-source SHA-256: `959c6ac26b2126359f916b88702748a3fe09c009dbb3fccb8cb24ded79528700`. Final production-source SHA-256: `ab54ed648144f4df681d41b3e3241a68d51333d68f3d5e63f6ac95b5452b81af`. Settings and the workbook hash are captured in each phase manifest. The source hash includes the production source tree, not generated build output.

```text
npm run summarize:milestone5 -- reports/milestone5/baseline
npm run summarize:milestone5 -- reports/milestone5/final
node node_modules/tsx/dist/cli.mjs scripts/render-milestone5-results.ts
```

These commands re-score preserved reports without network access. A new live evaluation will naturally reflect subsequent website changes. The original immutable databases, per-firm reports and checkpoints are retained locally under the ignored `reports/milestone5/` directory.
