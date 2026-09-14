# Milestone 9 — Independent evidence review

Status: **validated** (14 September 2026). Clive independently reviewed all 78 selected items. Three targeted evidence-context corrections are implemented in LawWatch pack/rules 1.5, adjudication policy 1.1. Extraction remains at 1.3; historical 1.4 reports and policy 1.0 remain accepted.

## Review handoff

Follow [the human review guide](MILESTONE_9_HUMAN_REVIEW_GUIDE.md). The local packet is `reports/milestone9/review-ready/`: `review-blind.csv` for initial review, `review-with-automated.csv` and `queue.json` for subsequent comparison. Start with ten rows and save a separate completed CSV. Partial batches are accepted. Automated assessments and human decisions remain separate.

The deterministic sample contains 78 items from 43 firms: 66 PDF candidates (12 SUPPORTED, 12 PARTIALLY_SUPPORTED, 18 AMBIGUOUS, 12 NOT_RELEVANT and 12 INSUFFICIENT_CONTEXT) and 12 HTML controls. Selection uses a fixed seed, firm balancing and overlapping risk strata. The candidate pool contains 7,541 items including 1,994 PDF assessments; deduplication leaves 7,154 candidates. These counts are candidates, not completed reviews.

Risk tags nominate pricing, complaints, regulatory identifiers, staff, mixed-service documents, corporate wording, repeated boilerplate, contents/appendices and limited context. They do not establish errors. Heading positions were not retained in M8; heading proximity is explicitly unavailable rather than inferred.

## Tooling and evaluation

`prepare:milestone9-review` exports deterministic JSON and CSV into a new directory. CSV cells are escaped and spreadsheet formula prefixes neutralized. The blind export hides automated verdicts, rationale and final rule results. `compare:milestone9-review` accepts a queue and separately completed CSV or JSON, validates decisions and writes a new comparison file.

Human labels are SUPPORTS_RULE, PARTIALLY_SUPPORTS, AMBIGUOUS, NOT_RELEVANT and INSUFFICIENT_CONTEXT. They map to the corresponding five automated states for exact agreement. Binary support compares SUPPORTED/SUPPORTS_RULE against the other states. False support uses automated SUPPORTED as its denominator; false rejection uses human SUPPORTS_RULE. Ambiguous agreement uses human AMBIGUOUS. Breakdowns cover state, rule, source and service, alongside a confusion matrix and disagreement patterns.

HTML controls have no M8 automated adjudication verdict and are excluded from agreement scoring. A rule PASS is not substituted for an adjudication verdict. Zero reviewed items produces unavailable rates, never perfect agreement. Stratified sample rates are not population precision estimates.

Independent human reviews: **78** (66 PDF candidates and 12 HTML controls), attributed to Clive, reviewed 14 September 2026. The supplied file had blank reviewer/date fields; Clive identified himself and confirmed the date in conversation. One lowercase label was normalized. The original file and all substantive decisions are preserved. No reviewer notes were supplied.

| Independent PDF review metric | Before | After |
|---|---:|---:|
| Exact five-state agreement | 26/66 (39.39%) | 29/66 (43.94%) |
| Supported versus other agreement | 41/66 (62.12%) | 44/66 (66.67%) |
| False support | 2/12 (16.67%) | 0/11 (0%) |
| False rejection | 23/33 (69.70%) | 22/33 (66.67%) |
| Ambiguous-case agreement | Unavailable | Unavailable |

No human AMBIGUOUS labels were supplied, so ambiguous-case agreement has no denominator. Three disagreements were resolved; 37 multiclass disagreements remain. Improvement is measured on the same reviewed sample used to select corrections, not a held-out accuracy estimate.

## Reviewed patterns and corrections

The [pre-correction pattern record](Validation/milestone9/reviewed-patterns.md) connects each change to a reviewed item. The corrections distinguish a negated charging basis from an affirmative one, prevent a tax-only sentence from identifying a likely expense, and recognize explicit “we charge £… + 20% VAT” wording after service/context safeguards. Raw extracted facts and confidence remain unchanged.

Recurring unresolved patterns include mixed or unresolved service attribution, lost context for compound complaints snippets, staff qualifications without sufficient service linkage, and generic regulatory duties being labelled as support for escalation wording. Incidental consumer/recruitment/corporate vocabulary also differs from the human interpretation. These are engineering classifications of reviewed disagreements, not additional reviewer testimony. No blanket promotion was made for them.

## Preserved 50-firm replay

The full preserved M6 HTML/M7 PDF corpus was replayed without network requests. Relative to completed M8, there are zero rule/service/status changes, zero PASS-to-UNKNOWN transitions and zero UNKNOWN-to-PASS transitions.

| Measure | M8 and corrected M9 |
|---|---:|
| Selected checks | 850 |
| UNKNOWN | 564 (66.35%) |
| Exact agreement on human Pass checks | 132/437 (30.21%) |
| Acceptable agreement | 444/850 (52.24%) |
| Human-confirmed PASS fraction | 132/233 (56.65%) |
| Automated PDF adjudications | 1,994 |
| AMBIGUOUS / NOT_RELEVANT | 1,241 / 156 |

Human Review has no exact machine-state equivalent. Acceptable agreement is the existing benchmark compatibility metric, not proof of correctness. Unconfirmed PASS predictions are not established errors. The full benchmark metrics are flat; there is no overall benchmark improvement claim. Corrected automated PDF counts are SUPPORTED 229, PARTIALLY_SUPPORTED 314, AMBIGUOUS 1,241, NOT_RELEVANT 156 and INSUFFICIENT_CONTEXT 54.

The 14 controlled serious-finding cases retain four true positives, zero false positives and zero false negatives (100% precision on these controls). There are no serious predictions in the selected live benchmark checks, so live serious-finding precision remains unproven.

## Separate fresh validation

Eight firms were scanned sequentially on 14 September 2026 with a one-second request interval, bounded natural/evidence/staff budgets and existing PDF safeguards. No browser rendering or bulk 50-firm crawl was used. Fresh observations are stored separately in `reports/milestone9/live/`.

| Firm | HTML scanned | Failed pages | PDFs discovered/extracted | Seconds |
|---|---:|---:|---:|---:|
| Nash & Co Solicitors | 38 | 10 | 6/0 | 79 |
| Hethertons | 61 | 0 | 5/3 | 83 |
| Kitson Boyce | 39 | 1 | 11/9 | 76 |
| Wolferstans | 50 | 0 | 5/5 | 65 |
| GA Solicitors | 63 | 0 | 2/2 | 92 |
| Trethowans | 60 | 0 | 5/5 | 125 |
| Stephens Scown | 59 | 0 | 11/8 | 109 |
| Shakespeare Martineau | 49 | 0 | 9/6 | 109 |

| Selected-check measure | Preserved same eight | Fresh eight |
|---|---:|---:|
| UNKNOWN | 82/136 | 86/136 |
| Exact agreement | 29/76 (38.16%) | 29/76 (38.16%) |
| Acceptable agreement | 74/136 (54.41%) | 76/136 (55.88%) |
| Human-confirmed PASS fraction | 29/44 (65.91%) | 29/42 (69.05%) |

These differences reflect fresh observations and bounded coverage, not an implementation improvement. The fresh capture preceded corrections; its eight saved snapshots were replayed under policy 1.1 without additional network requests. Failed or unextracted resources limit conclusions. Neither LawWatch nor universal rules produced a fresh or replayed POTENTIAL_ISSUE. This does not demonstrate live precision.

## Regression safety and validation

All **577 tests across 26 files pass**, retaining the 540 M8 tests and adding 37 tests. Twenty cover review selection, blinding, CSV safety, partial batches, invalid inputs and metric denominators. Seven exercise mixed-service PDFs, firm-wide complaints/SRA facts, distant or repeated headings, appendices and contents tables. Ten cover the corrections and preservation of service, uncertainty and exact-location safeguards. Existing version assertions now check pack 1.5 and policy 1.1.

Type checking and build pass. Dependency audit reports zero vulnerabilities. The benchmark workbook remains unchanged. The machine-readable final record is [final-summary.json](Validation/milestone9/final-summary.json); the earlier progress record describes the pre-review checkpoint only.

All 108 checked historical/current reports pass the updated JSON schema and generated-wording checks. The eight fresh-capture rule results also remain unchanged after offline policy replay. Durable review artifacts (original CSV, normalized decisions, queue, before/after comparisons) are under `docs/Validation/milestone9/`. Root-folder working copies are preserved locally and ignored by Git.

To reproduce the original review comparison:

```sh
npm run compare:milestone9-review -- docs/Validation/milestone9/review-queue.json docs/Validation/milestone9/human-decisions.json reports/new-review-comparison.json
```

## Limitations and next action

Historical HTML controls may have only snippets; current sources can differ from captured evidence. Heading proximity cannot be measured from the retained M8 metadata. Duplicate suppression and risk tags aid sampling but are not independent adjudication. Controlled negative precision cannot be generalized to live websites. One reviewer, purposive stratification, no notes and no held-out review sample limit accuracy conclusions.

Recommended M10: a held-out service-context review with explicit reviewer notes, focused on compound complaints evidence, staff-service attribution and mixed-service section boundaries. Resolve interpretation differences before widening eligibility. Do not start M10 automatically; browser crawling remains outside this milestone.
