# Milestone 10 — Service-context review and attribution hardening

M10 completes Clive's 80-item review and targeted corrections in the existing WatchLayer engine. M11 has not been started. The baseline was M9 commit `cd37750692d2327ca606574bede098061b93eb59`.

## Human-review methodology

Clive reviewed all 80 items on **2026-09-24**, with notes on every row. The original CSV is preserved byte-for-byte as [clive-review-original.csv](Validation/milestone10/clive-review-original.csv). IDs, source URLs, rule IDs, snippets, original proposals and human judgments remain unchanged. Normalized decisions and corrected assessments are separate artifacts.

The deterministic stratified sample contains 80 items from 30 firms: 53 preserved PDF candidates and 27 HTML candidates from the September 14 capture. M9 IDs and source/page/snippet equivalents were excluded. This was an item-level holdout for initial review, not a firm-level holdout. After using these labels for corrections, it is a development sample, not an independent test set for the corrected policy.

The CSV showed proposed services because CORRECT/WRONG refers to the original proposal; it hid support adjudication and final rule results. Review was independent human judgment, but not fully blinded to service proposals. The [review guide](MILESTONE_10_HUMAN_REVIEW_GUIDE.md) distinguishes service identity from whether evidence satisfies a pricing rule.

Human judgments: 11 SERVICE_SPECIFIC_CORRECT, 34 SERVICE_SPECIFIC_WRONG, 32 FIRM_WIDE, three NO_SERVICE_CONTEXT, zero MULTI_SERVICE and zero INSUFFICIENT_CONTEXT. Eight expected services are OTHER, outside the production catalogue; these remain scored disagreements rather than being removed from evaluation.

Exact agreement requires both class and complete service set. False assignment counts service-bearing proposals containing any service outside the human set, divided by all automated service-bearing proposals. Abstention uses the 45 human service-bearing cases. Labels are validated against immutable original proposals when scoring corrections. Empty denominators produce unavailable rates.

## Disagreements recorded before corrections

[Reviewed patterns](Validation/milestone10/reviewed-patterns.md) were documented before production edits:

- Generic employment wording conflated employee and employer audiences.
- Page-wide service names and distant headings contaminated local service and complaints sections.
- Complaints, general terms and organisation-wide policies were treated as service pricing context.
- Incidental mortgage references contaminated conveyancing scope; PDF service lines lacked verified heading semantics.
- Missing context, repeated service lists, mixed documents and out-of-catalogue services left genuine uncertainty.

## Targeted corrections and architecture

`src/lawwatch/context/attribution.ts` supplies one deterministic policy to review tooling and production filtering. It never receives human labels, firm names or sample IDs. `structure.ts` observes actual HTML headings, boundaries, source regions and bounded distances.

The policy returns SERVICE_SPECIFIC, MULTI_SERVICE, FIRM_WIDE, NO_SERVICE_CONTEXT or INSUFFICIENT_CONTEXT. It narrows explicit employment audiences, including business-facing dismissal wording. An explicitly audience-named employment URL path can resolve a generic employment title; hostnames and query strings cannot. Formal complaints and general-policy context remain firm-wide. Contents and navigation/footer-only evidence do not provide service attribution.

The current local service heading can resolve a page with multiple services within three observed blocks and 1,200 normalized characters. An intervening generic heading is not skipped to inherit an older service heading. Conflicting anchors remain uncertain. A corroborated sale/purchase statement is preserved when a neighbouring sentence separately prices remortgages. Home-purchase or conveyancer wording identifies context only; a housing discount is not thereby a legal fee.

An end-to-end test exposed a snippet spanning the end of a complaints heading and its first paragraph. Matching now recognizes that verified adjacent pair without joining arbitrary paragraphs across sections. Wider replay prompted positive controls for business-facing dismissal routes and conveyancing under broad site titles, avoiding unnecessary abstention.

Production applies attribution as an additional exclusion filter on pricing facts and linked staff qualifications. It does not promote service applicability, extracted confidence, PDF support or rule states. Existing positive pricing controls still pass. NO_ANCHOR leaves legacy support gates in control; a meaningful conflict, firm-wide context or unresolved employment audience can withhold support. This avoids suppressing every fact with incomplete metadata.

Organisation-level regulatory scope does not establish ownership or support. Existing regulatory detectors and PDF adjudication remain in control. The raw extraction inventory still protects replacement surfaces from false removal findings.

## Retention and compatibility

LawWatch pack/rules are **1.6**, fact sets **1.4**, service-attribution policy **1.0**. PDF support policy remains **1.1**. New HTML fact sets retain optional keyed attribution decisions (state, service IDs and reason), alongside unchanged extracted facts. HTML is inspected transiently; no archive is added. Review windows are bounded to 1,200 characters and heading metadata to 240 characters. Earlier fact sets are never rewritten.

PDF context remains page-local. Synthetic HTML from the PDF adapter cannot supply real PDF headings; its attribution metadata is discarded. The separate PDF support view calculates attribution from retained page context. Review and support windows may differ, so sample reassessment is not an exact count of production result changes.

Public report schema remains version 1, accepts historical pack versions and adds no required fields. No database migration is needed. Legacy facts use retained title, URL and snippet; unretained HTML headings cannot be reconstructed.

## Before/after review metrics

| Metric | Before | After |
|---|---:|---:|
| Exact attribution agreement | 26/80 (32.50%) | 57/80 (71.25%) |
| Firm-wide agreement | 15/32 (46.88%) | 26/32 (81.25%) |
| Service-specific agreement | 11/45 (24.44%) | 30/45 (66.67%) |
| False service assignment | 11/22 (50.00%) | 0/30 (0.00%) |
| Abstention on human service-bearing cases | 25/45 (55.56%) | 15/45 (33.33%) |
| HTML exact agreement | 6/27 | 16/27 |
| PDF exact agreement | 20/53 | 41/53 |

31 disagreements were resolved; none of the 26 originally agreeing items regressed. Service-bearing proposals increased from 22 to 30 while false assignments fell. This is not an agreement gain from broad suppression. MULTI_SERVICE accuracy is unavailable; explicit multi-service scope has a synthetic positive control only.

23 disagreements remain: 15 service-specific, six firm-wide and two no-context. Eight service-specific cases are OTHER. All judgments remain in the denominator. These are **sample-review results, not live accuracy estimates**.

## Preserved benchmark impact

The full 50-firm M6 HTML/M7 PDF corpus was replayed offline and compared directly with the M10 pre-correction baseline. The 17 selected checks per firm remain unchanged:

| Metric | Before and after |
|---|---:|
| Selected checks | 850 |
| PASS / WARNING / UNKNOWN | 233 / 53 / 564 |
| Exact agreement | 132/437 (30.21%) |
| Acceptable agreement | 444/850 (52.24%) |
| Human-confirmed PASS fraction | 132/233 (56.65%) |

Human Review is not mapped directly to WARNING. It is compatible with WARNING or UNKNOWN only for acceptable agreement. There are no human Fail labels, so this corpus cannot establish serious-finding precision.

The wider reports contain additional service checks outside the 850 selected outcomes. Their changes are recorded in [final-summary.json](Validation/milestone10/final-summary.json). Unresolved employment audiences, unrelated staff wording and weak context can change PASS/WARNING to UNKNOWN. These withholding decisions are not newly human-confirmed errors in every affected result. Resource URL changes are not counted as status changes.

There are 13 wider status changes: four PASS and nine WARNING become UNKNOWN. Eleven concern Tozers employer pricing with unresolved audience in retained evidence, one removes unrelated employment recruitment wording from Sintons licensing qualifications, and one withholds Rachel Sebastian referral-fee wording without service context. No result is promoted. Supported conveyancing experience/timescales and an explicit business-dismissal route remain supported after positive-control checks.

## Fresh-capture impact

Eight sites were scanned sequentially on **2026-09-14**, using the existing 20-page natural, 40-page evidence and five-page staff budgets, one-second spacing and bounded PDF safeguards. Final correction validation replays those captures and their bounded HTML observations. No new September 25 live crawl is claimed.

| Firm | HTML scanned | Failed | PDFs discovered/extracted | Seconds |
|---|---:|---:|---:|---:|
| Tozers | 64 | 0 | 9/9 | 89 |
| Ashtons Legal | 64 | 0 | 8/3 | 98 |
| Tilly Bailey & Irvine | 60 | 0 | 8/6 | 71 |
| Rothera Bray | 62 | 0 | 8/7 | 293 |
| Rachel Sebastian & Co | 12 | 0 | 2/2 | 19 |
| Shakespeare Martineau | 49 | 0 | 9/6 | 118 |
| Kitson Boyce | 39 | 1 | 11/9 | 106 |
| Stephens Scown | 59 | 0 | 11/8 | 106 |

The selected 136 checks remain unchanged: 34 PASS, three WARNING, 99 UNKNOWN; exact 18/70 (25.71%), acceptable 68/136 (50.00%), human-confirmed PASS fraction 18/34 (52.94%). Wider service changes are listed separately in the final summary. No serious finding was emitted. The subset is not pooled with the preserved corpus and does not demonstrate live precision.

Five wider results become UNKNOWN: two PASS and three WARNING. Four concern Tozers employer scope; one withholds Rothera leasehold disbursement wording from remortgage. These are context safeguards, not five newly independently verified rule errors.

## Verification and regressions

Controlled serious findings: **14 scenarios, four true positives, zero false positives, zero false negatives**; precision and recall 100% on these controls. Confirmed-missing versus not-observed and replacement-surface safeguards remain intact. Neither corpus replay introduced a serious finding.

Tests cover sampling, immutable review validation, metric denominators, employment audience and URL scope, local/stale/conflicting headings, adjacent heading snippets, firm-wide complaints, incidental mortgage wording, mixed PDFs, unavailable headings, contents/navigation, weak context, explicit multi-service scope, bounded metadata, and positive/negative end-to-end pricing controls. Historical persistence/version tests remain passing.

Final validation results are recorded below. One concurrent run timed out an existing PDF CLI test; the release uses a complete single-worker rerun. The new complaints integration test exposed and verified the heading-boundary fix.

## Reproduction

Use new output directories; existing scan artifacts are not overwritten:

```text
npm run evaluate:milestone10-review -- reports/milestone10/new-review
npm run evaluate:milestone8 -- --all --output reports/milestone10/new-preserved
npm run replay:milestone10-live -- reports/milestone10/live reports/milestone10/new-fresh-replay
npm run evaluate:negative
npm test -- --maxWorkers=1
npm run typecheck
npm run build
npm audit
```

The legacy-named M8 evaluator is the reusable offline corpus tool; its M7-relative deltas are not M10 deltas. `summarize:milestone10-final` compares the documented release directories against the actual M10 baseline. Raw scan databases, PDFs and reports remain ignored local artifacts. Committed queue, review, normalized decisions and assessments reproduce the 80-item comparison.

## Remaining limitations and M11 recommendation

Service identity is not rule support or legal certification. Mixed PDF boundaries, repeated boilerplate, missing HTML structure, generic employment audiences and out-of-catalogue services remain limitations. Bounded windows can omit useful context. A new held-out review is needed before claiming general accuracy; these 80 cases are now development data.

M11 remains **selective browser-rendered analysis inside WatchLayer**, started only by a separate instruction. Target explicit static-evidence gaps with strict budgets, retained provenance and unchanged serious-finding controls. No separate Regstead application repository or preview URL is required. M11 has not been started.

### Final release validation — 2026-09-25

- 642 tests passed across 29 files: 577 existing tests plus 65 M10 tests.
- Type checking and build passed. The final summary utility's result-array typing was corrected during type checking; no production behavior changed in that correction.
- Dependency audit: zero vulnerabilities (37 production and 100 development dependency entries; 148 total in the npm audit inventory, including optional/peer accounting).
- All 58 final corpus reports passed generated-wording and report-version/state checks. This is not a claim of independent legal validation.
- Preserved workbook and original human-review CSV hashes match their originals. No original evidence or human labels were modified.
- All four expected serious findings retained, zero serious false positives, zero serious false negatives.
