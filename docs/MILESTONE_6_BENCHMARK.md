# Milestone 6: LawWatch precision, adjudication and negative benchmark hardening

Status: completed on 13 September 2026. Both the controlled negative suite and final 50-firm evaluation are complete. Readiness: B — READY FOR LIMITED INTERNAL / PROSPECT SCANNING ONLY.

## Executive summary

Milestone 6 prioritises the reliability of evidence over reducing UNKNOWN. It corrects complaints-context, staff-link, qualification-substring, process-stage, VAT and cross-service association errors. The full live experiment uses the same 20 normal + 40 regulatory + five staff page budgets and one-second pacing as M5. No new production dependencies, PDF parsing, browser execution, AI interpretation, SaaS infrastructure or internal rename were added.

## M5 baseline and preservation

M5 is committed at `e69204eb111b8c5a00cf75cc366f730e686bf234` and was pushed to main before M6. Initial status was clean, diff empty, all 373 tests passed, typecheck/build passed and audit reported zero vulnerabilities. The completed M5 report and all 50 saved final checkpoints were inspected. M5 reports/databases were not regenerated or overwritten. The existing root `COMMERCIAL_MODEL.md`, `docs/regstead/REGSTEAD_PRODUCT_BRIEF.md` and user-confirmed `docs/LAUNCH_PLAN.md` supply product context; their older milestone-status prose is superseded by the explicit M6 request.

Official M5 baseline: exact agreement 136/437 (31.12%); acceptable agreement 438/850 (51.53%); human-confirmed PASS precision 136/247 (55.06%); 558/850 UNKNOWN (65.65%). No live LawWatch potential issues were emitted, so issue precision was unavailable. M5's 26.39% relative UNKNOWN reduction met its target; M6 sets no UNKNOWN target.

## Objectives and implementation

The core crawler remains industry-neutral. LawWatch rules, detector facts and pack advance to 1.2. Optional pricing-service scope is retained with bounded facts. Existing JSON storage supports it without table changes or a database migration. Historical reports remain immutable and schemas accept versions 1.0, 1.1 and 1.2. Re-evaluation under 1.2 requires 1.2 extraction facts; old facts cannot establish new high-confidence results without a fresh scan. Matching discovery profiles and detector versions protect historical comparisons.

Complaints procedure detection requires a relevant client-service context plus contact and handling-process evidence. A title alone is insufficient. Privacy, data protection, ICO, grievance, testimonial and article contexts are rejected. Document location remains distinct from document contents. Excluded pages cannot promote linked documents into regulatory surfaces.

Pricing scope uses title/headings to prevent an explicit unrelated service from being repurposed by an incoming pricing link. Local service sections remain isolated. A commercial-property heading cannot supply residential-conveyancing prices merely because a cross-link mentions that service. Tests span conveyancing, probate, employment, immigration, motoring, debt recovery and licensing.

Staff discovery no longer accepts a generic “our team” context as proof that a service link is a biography. Explicit profile routes, staff labels or supervisory relationships are required. Qualification patterns use word boundaries so a driving disqualification is not a staff qualification. Supervisor evidence still requires an explicit relationship and qualifications; partner seniority alone does not suffice.

Inclusion/exclusion and duration detectors combine an immediately adjacent heading and paragraph/list. Inclusion detection rejects explicit negation. Process stages require action content rather than “first-time buyer” or “smoother process” marketing alone. VAT treatment of disbursements must be tied to those costs, rather than a legal fee plus VAT plus disbursements. All are deterministic, bounded structural patterns, not firm-specific phrase dictionaries. Link context strips script/style noise.

## PASS adjudication

`scripts/adjudicate-lawwatch.ts` produces an evidence queue and per-rule counts, flags mixed complaints/global context, records source reuse across rules/services and accepts an optional separate reviewer-decision file. Shared URLs are review prompts, not proof of misuse. Human Review is never converted to machine WARNING or a false PASS automatically.

All 111 M5 PASS results against human Review were triaged using retained source URLs and selected evidence. The separate record is `docs/Validation/milestone6/m5-evidence-review.json`: 76 supported limited observations, nine unsupported PASS results, 26 unresolved. These are **Codex selected-evidence inspections**, explicitly labelled as such, not independent human adjudication or new legal ground truth. The 136 human Pass confirmations remain separate. Truncated evidence and multi-service mappings prevent definitive classification of the unresolved cases.

The nine unsupported observations comprise four process-stage marketing matches, three staff/service mismatches, one commercial/residential duration mismatch and one fee/disbursement VAT confusion. Regression tests generalise these patterns without firm identity branches. Additional mixed complaints and third-party SRA-number contexts remain nominated for review. A valid alternative source can support a finding even when another recorded match is poor; mixed evidence does not automatically make the whole result false.

Commands:

```text
node node_modules/tsx/dist/cli.mjs scripts/adjudicate-lawwatch.ts reports/milestone5/final docs/Validation/milestone6/m5-evidence-review.json
node node_modules/tsx/dist/cli.mjs scripts/adjudicate-lawwatch.ts reports/milestone6/final
```

Reviewer decisions require a verdict, reviewer identifier and reason. They do not modify scans, previous rule results or the workbook. Independent human review of unresolved and customer-facing findings is still required.

## Negative benchmark design

The longitudinal benchmark executes two full local scans of realistic linked websites using the real snapshot/comparison/rule pipeline. Four confirmed negative cases cover pricing and complaints pages each returning 404 and 410. Ten controls cover valid replacements, timeouts, server errors, non-observation and healthy continuity. The pricing service is strongly evidenced in the baseline. Static regression fixtures separately cover incomplete pricing, misleading complaints, unrelated services, staff mismatch, document-only pricing, multiple office numbers, stale/case-study contexts and static badge uncertainty.

Only rules whose policy supports deterministic negative evidence emit issues. Missing VAT/inclusion wording does not establish complete absence, even on a fetched page. A first-scan linked pricing 410 is not converted into a content-level regulatory issue. The Universal pack may independently describe a confirmed broken link. This intentional abstention is not hidden from the benchmark.

```text
node node_modules/tsx/dist/cli.mjs scripts/evaluate-lawwatch-negative.ts
```

Results are saved under ignored `reports/milestone6/negative.json`, with per-case evidence and per-rule precision/recall. Four true positives, zero false positives and zero false negatives demonstrate the narrow removal policy; they are too few and too narrow to estimate a 95% live launch precision guarantee. Do not pool these fixtures with the 850 human workbook checks.

## Serious finding policy

| Rules | Evidence threshold and confirmation | Exclusions / UNKNOWN | Severity; confidence |
|---|---|---|---|
| LAW-C001 | Previously observed pricing page, strongly evidenced service, eligible same-profile comparison and confirmed direct 404/410 removal | No prior facts, mismatched versions/budgets, uncertain service, non-observation, timeout/5xx or partial discovery cannot establish removal. A high-confidence matching replacement yields WARNING, not an issue. | HIGH; HIGH |
| LAW-C002 | Previously observed complaints surface and eligible direct 404/410 removal | Same observation protections; a matching replacement page/document yields WARNING | HIGH; HIGH |
| LAW-U001–U010; PRICE-001–017 | No POTENTIAL_ISSUE path | Missing patterns, unparsed PDF, calculator, uncertain applicability or budgets remain UNKNOWN/WARNING | Mostly HIGH; evidence-dependent |
| LAW-C003/C004 | Number continuity or static badge continuity only | Number disappearance may warn; badge disappearance remains uncertain. Neither emits a serious issue. | HIGH; MEDIUM/LOW |
| LAW-C005; LAW-I001/I002 | Observed material change or relevant explicit age wording | Informational/review findings only, never a regulatory failure | MEDIUM/INFO |
| WEB-U001 | Direct homepage 404/410 or 5xx at scan time | Network uncertainty, exclusion or non-observation is UNKNOWN | CRITICAL; HIGH |
| WEB-U002/U003 | Recorded TLS validation error or invalid/expired certificate metadata | Missing metadata or inconclusive transport is UNKNOWN; approaching expiry warns | CRITICAL/HIGH; HIGH |
| WEB-U004/U005 | Previously known page/document, comparable snapshots, confirmed direct 404/410 | Linked-only current evidence, timeout, 5xx, budget gap or non-observation is UNKNOWN | HIGH; HIGH |
| WEB-U009 | Previously observed form absent from reliably observed comparable static HTML | Rendering uncertainty, unreliable page or ambiguous multiple-form matching is UNKNOWN | HIGH; MEDIUM |

Universal rules retain M3 semantics: a matching alternative does not erase an individual URL's confirmed HTTP failure. LawWatch's replacement protection concerns availability of a regulatory surface, not whether that old URL is reachable. The controlled M6 removal precision metric covers LAW-C001/C002; it does not validate every Universal rule or all possible future issues. Existing Universal regressions remain required.

## Customer-facing statuses

Human-readable reports retain internal enums with calmer labels: PASS = Detected / Confirmed; WARNING = Review recommended; POTENTIAL_ISSUE = Potential issue / Action recommended; UNKNOWN = Could not confirm; NOT_APPLICABLE = Not applicable. INFO stays informational. A detected badge integration is not operational validation. Reports identify public signals and do not certify regulatory compliance.

## Live evaluation methodology

```text
node node_modules/tsx/dist/cli.mjs scripts/evaluate-milestone6.ts --phase final --all
node node_modules/tsx/dist/cli.mjs scripts/summarize-milestone5.ts reports/milestone6/final
```

The dedicated M6 directory preserves M5 output. One firm runs at a time, with 1,000 ms request spacing, unchanged 20+40+5 budgets and zero historical rechecks for this fresh cohort. A manifest freezes source and workbook hashes and rejects mixed-code resumes. Completed firm checkpoints are reused; interrupted unfinished firms can restart. Network errors remain in the denominator. No concurrency increase, seeded benchmark source URLs, additional PDF requests or browser execution is used.

Exact and acceptable mapping remains identical to M5: Review is excluded from exact agreement; Review paired with WARNING/UNKNOWN is acceptable; Pass paired with UNKNOWN is not agreement. PASS precision is human-confirmed fraction, not an estimate that every other PASS is wrong. WARNING precision remains unavailable; Review compatibility is separate. No predictions means issue precision unavailable. Per-service tables duplicate a firm's human rule label only across its explicitly benchmarked services and therefore are descriptive strata, not independently adjudicated service ground truth.

## Remaining limitations and readiness

The readiness decision uses the complete evaluation below. Independent human adjudication remains incomplete. Current static evidence cannot establish dynamic badge/calculator operation or PDF contents. Generic legal language, unrelated office/entity numbers, role associations and multi-service workbook labels still need review. Serious findings from a narrow controlled removal suite cannot establish precision across live customer incidents. There is no new UNKNOWN-reduction target.

Relevant unparsed PDFs accompany 54 of 567 UNKNOWN checks (9.52%); browser/calculator limitations account for 136 (23.99%). Neither capability is implemented here. Milestone 7 and SaaS work have not been started.

## Verification and benchmark integrity

Workbook SHA-256 remains `beafdde971fa122e4200a55863f7ff60ccd891640f81457dc1978eea27d7c4aa`. No workbook edit/export/recalculation occurred. New review metadata is separate. M5's version-specific persistence assertion was advanced from 1.1 to 1.2 because new extraction and rule semantics must not reuse the old version identifier; no prior behavioral expectation was weakened. New optional fields remain backward-compatible at report-schema level, while fresh evidence is required to use the new detector semantics.

All 432 tests pass across 17 files (59 added, previous 373 retained). Typecheck and build pass; dependency audit reports zero vulnerabilities and no production dependency was added. All 50 M6 reports, all 50 preserved M5 reports and two local healthy/removal reports pass strict schema validation (102 total). Generated finding titles/explanations contain no prohibited legal conclusions. Verbatim source evidence may contain ordinary legal subject names. Source hash `3e67a2ea4e4bd34f94cd83ccd59a8dd4f909e5a7a5db566f900553b27059f0f0` matches the frozen manifest. Production source contains no benchmark-firm conditionals. No serious LawWatch or Universal findings were emitted in the live cohort, leaving no live serious candidates for manual confirmation. Local confirmed-removal report wording and evidence were inspected.

## False-positive and false-negative analysis

Confirmed regulatory issue false positives and unsupported PASS observations are different quantities. The controlled removal suite has no false-positive issues, while selected-evidence review identified nine unsupported M5 PASS observations. The final comparison table follows each of those nine. A new PASS is inspected afresh: Stephensons now supplies relevant search-fee VAT wording, whereas Higgs still supplies a property-litigation biography for residential conveyancing. That remaining scope mismatch is a known limitation, not a successful fix.

No controlled removal negatives were missed. Live human Pass rows that are not machine PASS remain measured through recall; most are abstentions or partial-evidence warnings, not incorrect claims that an indicator is absent. The workbook contains no human Fail examples, so it cannot estimate live serious-finding recall. The negative suite must remain separate from live agreement metrics.

## Runtime interpretation

The run crossed an overnight gap during the Higgs scan. Its recorded duration is approximately 600 minutes. That value includes elapsed interruption time and cannot be interpreted as 600 minutes of crawler processing or request activity. Total firm duration is retained for provenance, but page counts and median firm duration are the useful comparison measures. Budgets and concurrency did not increase. No elapsed intervals were silently removed from saved checkpoints.

## Paid-beta recommendation

**B — READY FOR LIMITED INTERNAL / PROSPECT SCANNING ONLY.**

The narrow controlled LAW-C001/C002 precision reaches the numerical 95% threshold with four emitted true issues, but four examples do not establish launch precision for all serious findings. Known staff/service association errors and unresolved evidence reviews remain. Internal scans can support an operator's investigation; raw PASS or serious-finding output should not be delivered as an automated assurance product. Any prospect-facing observation still needs manual source and scope verification. This milestone does not authorise outreach, payments or deployment.

## PDF, browser and Milestone 7 recommendation

**B — PDF extraction is not yet commercially justified as the next main milestone.** Quantify its remaining UNKNOWN share using the final table, then prioritise the remaining false-PASS and adjudication work first. A PDF parser would not fix staff/service mismatch, generic keyword ambiguity, third-party SRA identifiers or uncertain human service mappings. Browser/calculator uncertainty likewise remains explicit; browser execution is not recommended for the next milestone.

Proposed Milestone 7: service-scoped evidence adjudication and reporting safeguards. Create independently reviewed service-level labels, resolve the remaining staff/pricing and complaints contexts, distinguish own-office SRA identifiers from third-party intervention references, and broaden serious-finding negative/control coverage across Universal rules as well as LawWatch removals. Reconsider a small bounded PDF experiment only after those reliability gates are met. No Milestone 7 work has begun.

## Final interpretation

The complete 850-check cohort produced 229 PASS, 54 WARNING, 567 UNKNOWN and zero POTENTIAL_ISSUE. Human-confirmed PASS precision improved from 55.06% to 57.64%, while exact agreement/recall declined from 31.12% to 30.21%. Acceptable agreement rose from 51.53% to 52.71%. UNKNOWN increased by nine checks (1.06 percentage points), as expected when weak evidence is withheld. This is a precision-focused improvement with a recall tradeoff, not a claim of uniformly better scores.

Of the nine specifically unsupported M5 PASS observations, seven are now WARNING/UNKNOWN, one has new relevant evidence and one remains unsupported. The remaining Higgs staff/service mismatch prevents a claim that scoped association is solved. These nine are a selected engineering-review sample, not an independently labelled estimate for every PASS result. Current M6 review metadata records the retained mismatch and newly supported VAT observation; other unconfirmed current PASS results remain explicitly queued. No old review decision was silently carried forward to changed evidence.

Complaints location PASS decreased from 45 to 41 firms; human-confirmed precision rose from 66.67% to 68.29%, while recall among the 31 human Pass rows fell from 96.77% to 90.32%. A reproducible URL-context review flag (privacy/data complaints, NHS, notarial, news/blog) identified 12 distinct suspect M5 complaint matches and five M6 matches. This reduction is evidence of less mixed context, not proof that every remaining procedure is correct. NHS, data-complaints and notarial contexts remain review priorities.

Pricing HTML inventory covers 50 firms and explicitly benchmarked-service pricing covers 48, but inventory presence is not content correctness. Static badge presence remains seven PASS; warning hints increase to seven and UNKNOWN falls to 36. Operation is still UNKNOWN. Supervisor checks are now 50/50 UNKNOWN; inclusions 47/50 UNKNOWN; exclusions 47/50 UNKNOWN; stages 37/50 UNKNOWN; timescales 43/50 UNKNOWN. These rules are not ready for unsupervised customer assurance despite their positive fixture coverage.

HTML page volume was essentially unchanged: 2,517 in M5 and 2,522 in M6 (+0.20%). Median firm duration was 1.29 versus 1.27 minutes. Total elapsed firm time includes the overnight gap described above and is not a fair throughput comparison. Changes in live pages and response timing also prevent causal attribution of every metric change to the code alone.

<!-- M6_RESULTS -->

## Final 50-firm results

| Metric | M5 | M6 |
| --- | --- | --- |
| Exact agreement | 31.12% | 30.21% |
| Acceptable agreement | 51.53% | 52.71% |
| Human-confirmed PASS precision | 55.06% | 57.64% |
| PASS recall | 31.12% | 30.21% |
| WARNING precision | Unavailable | Unavailable |
| WARNING–Review compatibility | 60.00% | 66.67% |
| UNKNOWN count | 558 | 567 |
| UNKNOWN rate | 65.65% | 66.71% |
| Potential issues | 0 | 0 |
| Potential-issue precision | Unavailable | Unavailable |
| High-severity false-positive issue candidates | 0 | 0 |
| HTML pages scanned | 2517 | 2522 |
| Median firm duration (minutes) | 1.29 | 1.27 |
| Total firm duration (minutes) | 163.7 | 664.9 |

## Per-rule results

| Rule | M5 PASS precision | M6 PASS count | Human Pass confirmations | M6 PASS precision | M6 recall | M6 UNKNOWN | Exact | Acceptable |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LAW-U001 | 41.46% | 40 | 17 | 42.50% | 100.00% | 20.00% | 100.00% | 54.00% |
| LAW-U002 | 14.29% | 7 | 1 | 14.29% | 50.00% | 72.00% | 50.00% | 86.00% |
| LAW-U004 | 66.67% | 41 | 28 | 68.29% | 90.32% | 18.00% | 90.32% | 68.00% |
| LAW-U005 | 40.48% | 42 | 17 | 40.48% | 100.00% | 16.00% | 100.00% | 50.00% |
| LAW-U008 | 36.67% | 30 | 11 | 36.67% | 84.62% | 6.00% | 84.62% | 58.00% |
| PRICE-001 | 100.00% | 5 | 5 | 100.00% | 11.11% | 84.00% | 11.11% | 20.00% |
| PRICE-002 | 77.78% | 8 | 6 | 75.00% | 13.33% | 76.00% | 13.33% | 18.00% |
| PRICE-004 | 25.00% | 6 | 3 | 50.00% | 16.67% | 86.00% | 16.67% | 64.00% |
| PRICE-005 | 0.00% | 0 | 0 | Unavailable | 0.00% | 100.00% | 0.00% | 88.00% |
| PRICE-006 | 100.00% | 8 | 8 | 100.00% | 21.05% | 82.00% | 21.05% | 40.00% |
| PRICE-008 | 66.67% | 5 | 4 | 80.00% | 10.81% | 88.00% | 10.81% | 32.00% |
| PRICE-010 | 50.00% | 2 | 1 | 50.00% | 7.14% | 84.00% | 7.14% | 72.00% |
| PRICE-011 | Unavailable | 0 | 0 | Unavailable | 0.00% | 94.00% | 0.00% | 16.00% |
| PRICE-012 | 33.33% | 2 | 1 | 50.00% | 3.70% | 94.00% | 3.70% | 46.00% |
| PRICE-013 | 44.44% | 4 | 3 | 75.00% | 17.65% | 74.00% | 17.65% | 70.00% |
| PRICE-014 | 80.00% | 6 | 4 | 66.67% | 20.00% | 86.00% | 20.00% | 64.00% |
| PRICE-016 | 100.00% | 23 | 23 | 100.00% | 47.92% | 54.00% | 47.92% | 50.00% |

## M5 evidence adjudication by rule

False PASS below means explicit selected-evidence inspection, not automatic disagreement with human Review. The reviewer identity and reasons are retained separately.

| Rule | Machine PASS | Human confirmed | False PASS found | Unresolved | Human-confirmed precision |
| --- | --- | --- | --- | --- | --- |
| LAW-U001 | 41 | 17 | 0 | 1 | 41.46% |
| LAW-U002 | 7 | 1 | 0 | 0 | 14.29% |
| LAW-U004 | 45 | 30 | 0 | 11 | 66.67% |
| LAW-U005 | 42 | 17 | 0 | 1 | 40.48% |
| LAW-U008 | 30 | 11 | 0 | 1 | 36.67% |
| PRICE-001 | 5 | 5 | 0 | 0 | 100.00% |
| PRICE-002 | 9 | 7 | 0 | 1 | 77.78% |
| PRICE-004 | 8 | 2 | 3 | 3 | 25.00% |
| PRICE-005 | 2 | 0 | 0 | 2 | 0.00% |
| PRICE-006 | 8 | 8 | 0 | 0 | 100.00% |
| PRICE-008 | 6 | 4 | 0 | 2 | 66.67% |
| PRICE-010 | 4 | 2 | 1 | 1 | 50.00% |
| PRICE-011 | 0 | 0 | 0 | 0 | Unavailable |
| PRICE-012 | 3 | 1 | 0 | 2 | 33.33% |
| PRICE-013 | 9 | 4 | 4 | 1 | 44.44% |
| PRICE-014 | 5 | 4 | 1 | 0 | 80.00% |
| PRICE-016 | 23 | 23 | 0 | 0 | 100.00% |

### Previously unsupported M5 observations in M6

A retained PASS requires inspection of its new evidence; previous adjudication is not blindly transferred.

| Firm | Rule | M6 result |
| --- | --- | --- |
| Nash & Co Solicitors | PRICE-013 | WARNING |
| Tozers | PRICE-013 | UNKNOWN |
| Stephensons Solicitors | PRICE-010 | PASS |
| Morecrofts | PRICE-013 | WARNING |
| Higgs LLP | PRICE-004 | PASS |
| Higgs LLP | PRICE-014 | UNKNOWN |
| Bishopsgate Law | PRICE-004 | UNKNOWN |
| Bishopsgate Law | PRICE-013 | UNKNOWN |
| Russell-Cooke | PRICE-004 | UNKNOWN |

### Current M6 PASS review status

Known false PASS counts reflect explicit current selected-evidence decisions only. Unresolved rows are not declared correct, and these counts are distinct from serious-issue false positives.

| Rule | Machine PASS | Human confirmed | Known false PASS | Unresolved current review |
| --- | --- | --- | --- | --- |
| LAW-U001 | 40 | 17 | 0 | 23 |
| LAW-U002 | 7 | 1 | 0 | 6 |
| LAW-U004 | 41 | 28 | 0 | 13 |
| LAW-U005 | 42 | 17 | 0 | 25 |
| LAW-U008 | 30 | 11 | 0 | 19 |
| PRICE-001 | 5 | 5 | 0 | 0 |
| PRICE-002 | 8 | 6 | 0 | 2 |
| PRICE-004 | 6 | 3 | 1 | 2 |
| PRICE-005 | 0 | 0 | 0 | 0 |
| PRICE-006 | 8 | 8 | 0 | 0 |
| PRICE-008 | 5 | 4 | 0 | 1 |
| PRICE-010 | 2 | 1 | 0 | 0 |
| PRICE-011 | 0 | 0 | 0 | 0 |
| PRICE-012 | 2 | 1 | 0 | 1 |
| PRICE-013 | 4 | 3 | 0 | 1 |
| PRICE-014 | 6 | 4 | 0 | 2 |
| PRICE-016 | 23 | 23 | 0 | 0 |

## Per-service descriptive results

| Service | Scored checks | PASS precision | Recall | UNKNOWN |
| --- | --- | --- | --- | --- |
| probate | 360 | 93.62% | 19.56% | 83.06% |
| residential_conveyancing | 408 | 79.09% | 33.98% | 67.40% |
| employment_employee | 192 | 100.00% | 1.56% | 98.96% |
| debt_recovery | 120 | 80.00% | 10.53% | 87.50% |
| immigration | 36 | 87.50% | 51.85% | 44.44% |
| business_licensing | 36 | 83.33% | 25.00% | 72.22% |
| motoring | 12 | Unavailable | 0.00% | 100.00% |

## UNKNOWN distribution

| Primary reason | Count | Share of UNKNOWN |
| --- | --- | --- |
| STAFF_INFORMATION_NOT_DISCOVERED | 33 | 5.82% |
| DETECTOR_INSUFFICIENT | 189 | 33.33% |
| DOCUMENT_CONTENT_UNAVAILABLE | 54 | 9.52% |
| BROWSER_REQUIRED | 136 | 23.99% |
| AMBIGUOUS_EVIDENCE | 39 | 6.88% |
| SERVICE_APPLICABILITY_UNCERTAIN | 110 | 19.40% |
| PAGE_NOT_DISCOVERED | 6 | 1.06% |

Relevant unparsed PDF evidence accompanies 54 primary document-related unknown checks (9.52% of remaining UNKNOWN). This does not establish that PDF parsing would resolve them.

## Controlled negative benchmark precision and recall

| Rule | Cases | Expected issues | Emitted | TP | FP | FN | Precision | Recall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| overall | 14 | 4 | 4 | 4 | 0 | 0 | 100.00% | 100.00% |
| LAW-C001 | 7 | 2 | 2 | 2 | 0 | 0 | 100.00% | 100.00% |
| LAW-C002 | 7 | 2 | 2 | 2 | 0 | 0 | 100.00% | 100.00% |

All-pack serious findings requiring manual review: 0. The full evidence is saved in reports/milestone6/serious-review.json.
