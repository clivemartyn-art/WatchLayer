# Milestone 13 — Broader public-evidence validation and partial-render reliability

**Status: CLOSED — validated evidence-quality milestone with documented live-render coverage limitations.** Closure follows the explicit revised release decision; it does not claim broad E&W rendered coverage or live precision.

## Starting checkpoint

Clean `main`, fetched and equal to `origin/main`, at M12 `1ce044f0a55f39c88fc764967f92fc2fa6a11bad`. Before production changes: 737 tests across 34 files passed, typecheck/build passed, dependency audit zero vulnerabilities. The 50-firm preserved replay reproduced 850 checks (233 PASS, 53 WARNING, 564 UNKNOWN, zero POTENTIAL_ISSUE), zero result deltas, and the controlled 4 TP / 0 FP / 0 FN gate. M10 retained 57/80 exact, 26/32 firm-wide and 0/30 false assignments. Artifacts are in `reports/milestone13/baseline-*` and `preflight-summary.json`.

## Cohort selection and independent confirmation

The new cohort contains 23 public pages from eight organisations: seven England-and-Wales firms (20 pages) and Mathie Lennox & Co in Scotland (three pages). None is an M11/M12 live-control or held-out organisation. Public search and observed site navigation supplied the candidate pages; no WatchLayer browser outcome was used to select them. Expected phrases, links, context expectations and separate browser observations were recorded before execution in `docs/Validation/milestone13/candidates.json`. These are tool-based independent observations, not human adjudication labels.

Bounded robots-aware raw HTTP confirmation found 20 STATIC_SUFFICIENT targets and three CONFIRMED_RENDER_GAP targets. All three confirmed gaps are Scottish. No independently confirmed PARTIAL_RENDER_GAP, GAP_UNCERTAIN or OUT_OF_SCOPE target was identified in this cohort. This shortfall is disclosed rather than fabricating category coverage. Setfords' directory populated after the initial browser observation, but its raw HTML contains the expected names and links: it is static-sufficient. JavaScript form notices and consent-blocked maps do not establish a relevant evidence gap. No consent, forms, tabs, search filters, pagination, or account interactions were used.

The immutable classification manifest is `docs/Validation/milestone13/confirmed-targets.json`; raw responses stay ignored under `reports/milestone13/confirmation`. A duplicate confirmation invocation refused its existing output directory; it did not replace captured responses or the frozen manifest. The first invocation's console log was inadvertently truncated by the rejected invocation's shell redirection; the complete per-target captures and frozen results remain intact.

| Organisation | Pages | Scope |
|---|---:|---|
| Mathie Lennox & Co | 3 | Scottish staff, conveyancing and contact rendering; no E&W applicability claim |
| Lyon Croft Law | 3 | Mixed pricing, ambiguous employment audiences, firm-wide identifiers |
| Waller and Hart | 2 | Mixed pricing/complaints and public contact |
| Hunt & Coombs | 3 | Pricing, probate and complaints PDF link |
| Leadenhall Law Group | 3 | Multi-office identifiers, conveyancing pricing link, complaints |
| Cooper Hall Solicitors | 3 | Mixed services, mixed property scope and regulatory contact |
| Jones and Duffin | 3 | Complaints, conveyancing with explicit mortgage exclusion, mixed services |
| Setfords | 3 | Directory with static fallback, pricing introduction and staff association |

## Baseline execution and partial-render taxonomy

`reports/milestone13/cohort-baseline` uses unchanged M12 production source and a frozen source/target hash. Each page gets sequential static and assisted one-page scans, no additional evidence/staff HTML or historical rechecks, one-second HTTP spacing, and existing PDF limits. No egress policy or execution bounds change.

Evaluation classifications are COMPLETE_EXPECTED_RECOVERY, PARTIAL_EXPECTED_RECOVERY, USEFUL_BUT_DIFFERENT_RECOVERY, EMPTY_VISIBLE_OUTPUT, NON_USEFUL_RENDER and FAILED_RENDER. Complete means all frozen expectations matched, not complete visibility of a page or website. Partial means at least one but not all matched. Useful-different means an extracted candidate or relevant link exists but no frozen expectation matched; usefulness remains a review proposal. These classifications never infer absence and never enter production as site-specific expectations. Unattempted static pages have no render outcome.

All 23 target pairs finished. The three browser attempts completed: one recovered all contact expectations and two recovered different useful fragments but neither frozen staff/pricing expectation. Those two outputs must not be reported as successful recovery of staff biographies or the fee table. All three also changed service classifications from UNKNOWN to NOT_DETECTED where there was no positive service evidence; the completed investigation and correction are documented below.

## Limitations and completion gate

Results are sample-based. Browser execution does not imply complete visibility. Positive human judgments do not establish live serious-finding precision. No legal compliance certification is provided. Security boundaries take precedence over coverage. The blind human review is complete; the remaining gate concerns the breadth of recovered evidence. M13 remains uncommitted until its review and technical gates pass. Broader productionisation must not start automatically.

## Demonstrated defects and targeted corrections

The baseline produced 28 unsupported `NOT_DETECTED` service classifications from initial rendered fragments: ten each on the team/contact pages and eight on the conveyancing page. Navigation, a heading and a footer did not establish visibility of all services. A focused historical fixture also reproduced a `LAW-C003` disappearance warning after a previously observed SRA number was missing from a later partial render.

Two production conditions changed:

- `classifyServices` no longer uses a rendered observation alone as the basis for `NOT_DETECTED`. Positive high/low-confidence detections remain available, and existing reliable static/PDF behavior is preserved. This is not blanket suppression of attribution.
- Regulatory disappearance checks cannot use rendered-only missing signals as reliable absence. Observed continuity remains usable, but incomplete rendering cannot establish disappearance. Existing direct HTTP removal checks and serious-finding controls remain intact.

LawWatch pack/rule version is **1.8**; browser observation policy is **1.3**. Older policy and report versions remain readable. The scan-profile change prevents incompatible historical comparisons. Extraction facts remain version 1.5; no dependency, migration, parser, network permission, trigger, browser budget or interaction change was made. Browser execution remains selective and positive evidence remains subject to the M10 attribution safeguards.

The original 23 live pairs were then **replayed offline**, preserving captured facts, hashes and source-policy provenance. `reports/milestone13/cohort-replay-v3` is the final corrected replay. It changes exactly 28 negative service states back to UNKNOWN, retains the two positive service classifications on ML02, and changes no rule outcomes or fact-level service attributions. Paired static/assisted and same-capture rendered-ablation comparisons have zero rule-state changes, zero UNKNOWN-to-supported changes and zero supported-to-UNKNOWN changes. These are interpretation changes on saved observations, not new network captures.

Two tooling corrections are separately recorded. Initial replay drafts omitted previous-scan context, generating spurious monitoring deltas; v3 uses the scanner's baseline-selection logic without writing into original reports, with a regression test. The original baseline's `directRenderedChanges` field and replay v1/v2 monitoring deltas are superseded by v3; captured observations and paired baseline outcomes remain preserved. Review sampling now skips overlapping detector windows so charging basis, process and timescale candidates all receive a slot. This affects sampling only, not production evidence or results.

## Observed coverage and performance

| Measure | Result |
|---|---:|
| Static sufficient | 20/23 |
| Confirmed gap trigger recall | 3/3 |
| Independently classified partial gaps | 0 |
| Completed attempts | 3/3 |
| Complete expected-content recovery | 1/3 |
| Partial expected-content recovery | 0/3 |
| Useful but different recovery | 2/3 |
| Browser failure / timeout | 0 / 0 |
| Unnecessary attempts on static-sufficient targets | 0/20 |
| Newly extracted detector candidates | 7, including overlapping windows |
| Relevant link occurrences | 25; 9 unique destination URLs |
| Human-reviewed items | 18/18 accepted by Clive on 2026-09-28 |
| Newly rendered PDF links | 0 |
| Rendered organisations | 1, Scotland |

All three attempts used `APP_SHELL_DETECTED`. The other observations recorded 19 `STATIC_CONTENT_SUFFICIENT` and one `BROWSER_NOT_REQUIRED`. Candidate and link counts are proposals, not human-accepted evidence. The team page contributed navigation but not the expected biography; the pricing page contributed charging/process/timescale fragments but not the frozen fee-table expectations. The contact page recovered its expected address and email. There was no new live rendered E&W complaints, identifier, staff or document evidence. The sample therefore does not demonstrate broad multi-organisation rendered recovery.

| Target | Recovery | Browser ms | Requests | Bytes recorded | Requests omitted |
|---|---|---:|---:|---:|---:|
| ML01 team | Useful but different | 5,466 | 17 | 1,249,393 | 13 |
| ML02 conveyancing | Useful but different | 4,457 | 12 | 1,249,395 | 7 |
| ML03 contact | Complete expected | 4,169 | 9 | 1,249,393 | 5 |

Total browser time was **14,092 ms**, median **4,457 ms**; p95 is not reported for only three attempts. Totals: 38 request observations, 3,748,181 recorded response bytes and 25 omissions. Recorded bytes describe the renderer's bounded fetched bodies, not packet-level wire usage. Static runs took 227,208 ms and assisted runs 229,359 ms overall. Their 2,151 ms difference is affected by independent network timing; it is not a causal browser-cost estimate. Summed browser duration is the direct execution-cost measurement.

First-party scripts, styles and bounded public requests supplied recovered content. Images, fonts and tracking were omitted under existing policy. Dependency categories are diagnostic heuristics: a `.js` URL does not prove a trusted library, and an XHR classification does not prove public authorization. Nothing is automatically allowed because of its category. No third-party exception was introduced.

## England-and-Wales and document observations

All 20 E&W targets were static-sufficient for their frozen expectations. Coverage includes probate fees and disbursements (Hunt & Coombs), mixed employment/probate pricing (Lyon Croft), conveyancing and explicit mortgage exclusions (Jones and Duffin), multi-office SRA identifiers (Leadenhall), complaints/Legal Ombudsman routes, and an individual conveyancing staff profile (Setfords). These are observed excerpts and structural signals, not human-certified rule support or compliance judgments. Per-target expected context, observed matches, machine attribution counts and selected regulatory results are recorded in `docs/Validation/milestone13/ew-observed-signals.json`.

One Hunt & Coombs complaints PDF and a Setfords planning newsletter were discovered statically and parsed by the existing bounded PDF pipeline. The Setfords document recurred in all three independent page scans: four extraction observations per mode represent two distinct document URLs, not four newly discovered documents. No live document was discovered only through rendering. Controlled dynamic-PDF fixtures and the new rendered-link provenance test validate the mechanism, but do not replace missing live evidence. A link establishes location; PDF content is separately extracted and adjudicated.

## Blind human review

The current package is `docs/Validation/milestone13/review-v3/`, with queue hash `0e576965aeff75c5598805d06dfc1a2ad3e9de20f74a134d7462073be7a35066`. `review/` and `review-v2/` are preserved drafts; do not review multiple versions. `START_HERE.md` gives field-level guidance. `reviewer-context.json` excludes automated adjudication, attribution decisions, outcome changes and recovery classifications; `human-decisions.json` is blank. `automated-queue.json` must remain unseen until judgments are frozen.

Sampling is deterministic: up to three distinct non-overlapping extracted facts, two matched frozen phrases, then link locations, capped at six per page. The 18 items comprise three pricing/process/time candidates, two contact expectations and thirteen link observations. Repeated navigation across source pages remains identified by source URL/hash; these are not 18 independent pages or firms. All are actual retained rendered observations. No fixture, invented text or machine label substitutes for a human judgment.

Clive returned completed judgments dated **2026-09-28**. The original file was preserved byte-for-byte as `review-v3/m13-human-decisions-clive-2026-09-28.json`, SHA-256 `ceab053fff7b1db1adc304c852614c628a666e59cf2ec24ce795eeb6563f59df`. Queue hash, item identities, dates, notes and label consistency all passed validation. The comparison records **18/18 VALID_RENDERED_EVIDENCE**, zero PARTIAL_OR_AMBIGUOUS, NOT_RELEVANT, WRONG_SERVICE or INSUFFICIENT_CONTEXT labels; zero items remain pending. All **3/3 proposed residential-conveyancing associations** were marked CORRECT and **3/3 rule-support judgments** JUSTIFIED. The other 15 items have no proposed rule/service judgment. Thirteen accepted items establish link locations and two establish public contact facts; they do not establish destination content or broad service-attribution accuracy. There were no disagreements requiring a production correction. The pre-review summary remains preserved; current results are in `validation-summary-post-review.json` and `review-v3/comparison-clive-2026-09-28.json`. These are selected sample judgments, not live precision estimates.

## Preserved benchmark, attribution and serious-finding safety

The final preserved replay is `reports/milestone13/final-preserved-v2`, using all 50 firms without new network requests. Across 850 selected checks: **233 PASS, 53 WARNING, 564 UNKNOWN, 0 POTENTIAL_ISSUE**. All selected rule results are unchanged. Structural comparison across all 50 reports also found zero changes in service classifications, PDF data, adjudication and surface inventory.

- Exact agreement: **132/437 (30.21%)** under the existing exact-mapping denominator; human Review is not equated to WARNING.
- Acceptable agreement: **444/850 (52.24%)** under the existing compatibility mapping.
- Human-confirmed PASS fraction: **132/233 (56.65%)**. Unconfirmed PASS proposals are not automatically proven errors.
- M10 independent service-review regression: **57/80 exact (71.25%), 26/32 firm-wide (81.25%), false assignments 0/30**.
- Controlled serious suite: **4 true positives, 0 false positives, 0 false negatives**, across 14 scenarios.

The new live cohort emitted no POTENTIAL_ISSUE. That is not an estimate of live serious-finding precision. New safety fixtures cover navigation-only uncertainty, retained positive evidence, stronger static evidence, PDF-location-only evidence, partial-render SRA continuity, mixed-service rejection, firm-wide complaints and history-preserving replay. Existing network/private-address/redirect/download limits and the full serious-finding suite remain tested.

## Validation and reproducibility

All outputs use new directories under ignored `reports/milestone13`; M10/M11/M12 artifacts and the benchmark workbook remain unchanged. Production metadata tests were updated for pack 1.8. Initial failed test logs and superseded replay drafts remain available for audit.

```text
npm test -- --maxWorkers=1
npm run typecheck
npm run build
npm audit
npm run test:browser
npm run evaluate:milestone13 -- baseline docs/Validation/milestone13/confirmed-targets.json NEW_DIRECTORY
npx tsx scripts/replay-milestone13.ts reports/milestone13/cohort-baseline NEW_REPLAY_DIRECTORY
npm run prepare:milestone13-review -- NEW_REPLAY_DIRECTORY NEW_REVIEW_DIRECTORY
npm run compare:milestone13-review -- AUTOMATED_QUEUE COMPLETED_HUMAN_DECISIONS NEW_COMPARISON_JSON
npm run evaluate:milestone11-live -- --run NEW_ORDINARY_CONTROLS_DIRECTORY
npm run evaluate:milestone8 -- --all --source reports/milestone13/baseline-preserved --output NEW_PRESERVED_DIRECTORY
npm run evaluate:milestone10-review -- NEW_SERVICE_REVIEW_DIRECTORY
```

The baseline command intentionally refuses production code that differs from M12. Use `post-fix` only for an explicitly fresh follow-up capture; current post-correction cohort results are offline replay. Windows validation invoked the installed Vitest/TypeScript/tsx entry points directly, equivalent to the package scripts; audit used npm 11 via the bundled runtime.

## Historical completion assessment before revised release decision

**M13 remains incomplete and uncommitted.** Human review is complete, but rendered recovery is concentrated in one Scottish organisation, with no new live rendered PDF evidence or E&W rendering example. Security, service isolation and conservative UNKNOWN behavior were not weakened to manufacture broader coverage.

The accepted judgments satisfy the human-review gate but do not resolve the coverage shortfall. A separately frozen additional cohort should target rendered E&W evidence and document recovery across additional organisations, within the existing security limits. Retain M13 as incomplete until sufficient evidence is demonstrated; do not turn repeated navigation judgments from one organisation into a broader coverage claim. Productionisation should begin only after that decision and the remaining gates are satisfied. Its recommended scope is operational packaging and reproducible deployment of the validated engine, with continued observability and conservative evidence handling; no hosted product work is started here.

## Files and test coverage

Production edits are limited to `src/lawwatch/inventory.ts`, `src/lawwatch/evaluate.ts`, pack/report version declarations, `src/browser/types.ts`, and the generated LawWatch report schema. No crawler execution code or network policy changed. README and package commands link the M13 tooling and report.

New development tooling comprises `confirm-milestone13-targets.ts`, `evaluate-milestone13-live.ts`, `milestone13-evidence.ts`, `milestone13-replay-context.ts`, `replay-milestone13.ts`, `prepare-milestone13-review.ts`, and `summarize-milestone13.ts`. The frozen cohort, pre-correction findings and versioned review packages live under `docs/Validation/milestone13`.

There are **29 additional tests**: 20 recovery/dependency/sampling checks, eight safety/history checks, and one added previous-policy compatibility case. Existing version-persistence/CLI expectations now assert 1.8. No existing tests were removed. The full run passed **766 tests across 36 files** (`final-tests-v4.log`). Typecheck and build passed; npm audit reports **zero vulnerabilities**. Dependencies and lockfile are unchanged.

## Final ordinary-site controls

A **fresh** ten-firm paired run completed after the production correction. It reused the existing bounded control evaluator with new M13 output paths; its console prefix says M11 because the script is shared. Each mode allowed ten natural pages, ten regulatory-evidence pages and two linked-staff pages, with existing PDF bounds and one-second pacing. No prior M11/M12 captures were reused as fresh results.

| Firm | Static pages | Assisted HTTP pages | Browser attempts |
|---|---:|---:|---:|
| Tozers | 22 | 22 | 0 |
| Ashtons Legal | 22 | 22 | 0 |
| Tilly Bailey & Irvine | 20 | 20 | 0 |
| Rothera Bray | 22 | 22 | 0 |
| Rachel Sebastian & Co | 10 | 10 | 0 |
| Shakespeare Martineau | 18 | 18 | 0 |
| Kitson Boyce | 22 | 22 | 0 |
| Stephens Scown | 19 | 19 | 0 |
| Higgs LLP | 21 | 21 | 0 |
| Russell-Cooke | 21 | 21 | 0 |
| **Total** | **197** | **197** | **0** |

Browser rate was **0/197**, with zero browser-added execution time. No rule states, service classifications or stored fact-level service-attribution maps changed between modes. No POTENTIAL_ISSUE was emitted. Total static runtime was **432,725 ms** and assisted runtime **367,941 ms**; independent network variability explains why the assisted wall time can be lower despite the same static-first behavior. With no browser attempts, browser failure rates and latency percentiles are not applicable.

There was **one failed HTTP page in each mode**, at Russell-Cooke: `https://www.russell-cooke.co.uk/charging-information/+44%20(0)20%203826%207550` returned 404. This telephone-number-shaped relative URL produced the same result in both captures, no rule-state difference and no serious finding. The initial progress update's zero-failure count was based on the first nine firms; this is the final corrected total.

Document limitations were also identical between modes: two encrypted PDFs at Ashtons Legal, two PDFs without extractable text at Kitson Boyce, and three external documents blocked by the existing policy at Shakespeare Martineau. These were not turned into unsupported negative regulatory conclusions. No OCR, decryption or external-host exceptions were introduced.

The separate browser suite passed **104 tests across six files**. Final technical validation is green; the human-review comparison is now complete, while the broader coverage gate remains unmet. The pre-review metrics artifact is `docs/Validation/milestone13/validation-summary.json`; the current assessment is `docs/Validation/milestone13/validation-summary-post-review.json`; detailed captures, test logs and paired reports remain under `reports/milestone13`. Starting and current HEAD remain the M12 commit, on `main`. M13 changes are intentionally uncommitted, so the working tree is not clean. No push or productionisation has been performed.

## England-and-Wales continuation

The continuation addresses the remaining coverage gate. The original Scottish-only result and Clive's 18/18 accepted judgments above remain unchanged. Before new requests, the current dirty M13 working tree, source, lockfile, original report and validation directory were copied under `reports/milestone13/ew-continuation-preflight`; hashes froze 946 existing M13 report artifacts. The subsequent preservation check found zero changed artifacts, zero changed production files and an unchanged lockfile. Starting/current HEAD remains M12 `1ce044f0a55f39c88fc764967f92fc2fa6a11bad` on `main`. This was expected uncommitted M13 work, not a clean new milestone.

### Independently frozen cohort

The new [frozen manifest](Validation/milestone13/ew-continuation/confirmed-targets.json) contains **16 public pages from seven E&W organisations**. Raw/static text, hashes, independent-browser timestamps, bounded visible excerpts, expected phrases/links, evidence types and service-context expectations were frozen before WatchLayer execution. [Selection methodology](Validation/milestone13/ew-continuation/METHOD.md) documents primary-site jurisdiction checks, separate browser confirmation and exclusions. No previous cohort outcomes were replaced, and no post-scan selection was used to improve these results.

| Organisation | Targets | Evidence sought | Independent gap classification |
|---|---|---|---|
| TMC Solicitors, Immigration Solicitors 4Me brand | EW01, EW02, EW16 | Immigration fees/basis/VAT, complaints, service and internal links | 3 confirmed gaps |
| Michael Stevens Solicitors | EW03, EW04, EW05, EW15 | Complaints, employment description, firm-wide experience/contact, internal links | 4 confirmed gaps |
| Monaco Solicitors | EW06, EW07 | Employee pricing/basis and complaints | 2 static-sufficient |
| Maurice Andrews Solicitors | EW08, EW14 | Complaints and staff roles | 2 static-sufficient |
| Heppenstalls Solicitors | EW09, EW10 | Probate/property fee material, complaints and an existing policy-document link | 2 static-sufficient |
| T.G. Collins Solicitors | EW11, EW12 | Pricing locations and conveyancing team | 2 static-sufficient |
| Derrick Bridges & Co | EW13 | People and local service associations | 1 static-sufficient |

There were **7 CONFIRMED_RENDER_GAP, 0 PARTIAL_RENDER_GAP and 9 STATIC_SUFFICIENT** targets. The two confirmed-gap organisations had empty static visible text but useful independently rendered content. Independent inspection is target confirmation, not human adjudication or proof of successful WatchLayer recovery. TMC's brand is counted as one organisation. No login, form submission, consent, search/filter, button or tab interaction was used.

### Current implementation baseline and failure analysis

The unchanged corrected M13 implementation ran first. The shared evaluator's `post-fix` phase name identifies current M13 code; **this continuation made no production fix**. Sequential static/assisted pairs used one page per scan, zero extra regulatory/staff/recheck budgets, one-second crawl pacing and unchanged browser/PDF security limits. All 16 HTTP pages were scanned successfully in each mode.

| Result | Count |
|---|---:|
| Confirmed E&W gaps tested / triggered | 7 / 7 |
| APP_SHELL_DETECTED | 3 |
| RENDERED_LINK_DISCOVERY_REQUIRED | 4 |
| Completed WatchLayer renders | 0 |
| Complete / partial / useful-different recovery | 0 / 0 / 0 |
| FAILED_RENDER | 7 |
| Empty-visible / non-useful completed renders | 0 / 0 |
| Browser timeouts | 0 |
| Unnecessary attempts on static-sufficient pages | 0 / 9 |
| New rendered evidence candidates / links / PDFs | 0 / 0 / 0 |
| Paired or same-capture rendered rule changes | 0 |
| Service-classification changes | 0 |
| UNKNOWN-to-supported / supported-to-UNKNOWN changes | 0 / 0 |

TMC's three attempts fetched first-party JavaScript and CSS but rejected Google tag-manager and ReviewSolicitors widget requests; the current renderer then failed closed. Michael Stevens' four attempts were blocked because robots.txt excluded its first-party Next.js bundles. These are preserved failures, not partial or successful recoveries. See the [dependency investigation](Validation/milestone13/ew-continuation/DEPENDENCIES.md). No robots bypass, CDN exception, tracker/widget access, budget increase or broader interaction was introduced.

All LAW-U and PRICE content rules on these seven targets stayed UNKNOWN. Existing metadata-based low-confidence service candidates remained low confidence; there were no service-absence classifications on the failed pages. No POTENTIAL_ISSUE was emitted. There is no newly retained serious-looking evidence to adjudicate. This confirms conservative failure handling in this sample, not live serious-finding precision.

Browser attempts consumed **24,542 ms total**, **3,506 ms mean**, with **59 request events**, **46 omitted/rejected events**, and **3,399,474 additional resource bytes**. The counter excludes already fetched static seed bytes. Static pairs took 101,779 ms in aggregate and assisted pairs 125,097 ms, a measured difference of 23,318 ms subject to network variability. Seven samples are too few for a useful p95 claim. The targeted attempt rate is 7/16 (43.75%), intentionally enriched for gaps; ordinary-site selectivity is assessed separately. Failure rate is 7/7; no attempt yielded materially new retained evidence.

### Coverage matrix

These states describe **WatchLayer's retained observations**, not what the unrestricted independent browser could display. STATIC_ONLY does not mean independently validated rule adequacy.

| Evidence category | Continuation state | Evidence / limitation |
|---|---|---|
| Pricing text | STATIC_ONLY | Heppenstalls fee tables; TMC rendered fees not retained |
| Pricing basis | STATIC_ONLY | Monaco no-win-no-fee and Heppenstalls hourly wording |
| Pricing process/stages | STATIC_ONLY | Monaco negotiation/review workflow wording |
| Timescale | NOT_OBSERVED | No rendered pricing-duration evidence; complaints deadlines are not service timescales |
| Complaints text | STATIC_ONLY | Monaco, Maurice Andrews and Heppenstalls controls |
| Regulatory identifier | STATIC_ONLY | Monaco SRA identifier |
| Staff/person evidence | STATIC_ONLY | T.G. Collins, Derrick Bridges and Maurice Andrews |
| Service association | STATIC_ONLY | Local static staff/service descriptions |
| Contact details | STATIC_ONLY | Static public contacts retained |
| Internal links | STATIC_ONLY | No rendered links retained |
| Document/PDF links | STATIC_ONLY | Heppenstalls Client Interest Policy link already static; not a pricing/complaints PDF |

No category qualifies as RENDERED_RECOVERED or RENDERED_PARTIAL in this continuation. There was no live rendered PDF discovery.

### Human review and attribution

The sampler and review comparison were run on the completed capture. They correctly produced an **empty queue**, `reviewComplete: false`, and null rates. There are zero new reviewed items, zero accepted E&W organisations, zero justified rule-support judgments, zero correct/wrong-service judgments and zero firm-wide human judgments. Zero wrong-service judgments with an empty sample does **not** prove rendered attribution accuracy. There is no review task to send to Clive until real WatchLayer observations are retained.

The [review status](Validation/milestone13/ew-continuation/review/STATUS.md) distinguishes these empty artifacts from the original completed 18-item review. Independent-browser text was not inserted into WatchLayer facts or used as a substitute for human review.

### Preserved benchmark and safety

The new preserved 50-firm run reproduced **850 checks: 233 PASS, 53 WARNING, 564 UNKNOWN and 0 POTENTIAL_ISSUE**. Exact agreement is **132/437 (30.21%)** among exact-mappable human Pass labels; acceptable agreement is **444/850 (52.24%)**; the human-confirmed PASS fraction is **132/233 (56.65%)**. Human Review is not mapped directly to WARNING. These preserved sample metrics are not live precision estimates.

All 50 reports were compared with the prior corrected M13 preserved run: **zero changes** to complete rule results, service classifications, PDF data, adjudication data or surface inventory. M10 remains **57/80 exact (71.25%), 26/32 firm-wide (81.25%), false assignments 0/30**. The 14 controlled serious scenarios retain **4 expected true positives, 0 false positives and 0 false negatives**.

### Validation and artifact notes

The unchanged production baseline passed **766 tests across 36 files**, typecheck and build; the separate browser suite passed **104 tests across six files**; dependency audit found **zero vulnerabilities**. No production files, dependencies or tests were added or changed by the continuation. The total M13 addition remains 29 tests. The unavailable `npm` shell shim was recorded; validation used the installed equivalent Vitest/TypeScript entry points and npm 11 via the bundled runtime. The failed wrapper attempt is preserved separately and is not counted as a passing browser run.

The current machine-readable result is [continuation-baseline-summary-v2.json](Validation/milestone13/ew-continuation/continuation-baseline-summary-v2.json). The first summary draft read a classifier `status` field instead of `state`; v2 corrects its failure-safety annotation and explicitly lists preserved low-confidence candidates. Both drafts remain available; live captures, rule outputs and review counts are unchanged. The coverage matrices are identical. Detailed captures and source/target hashes are under `reports/milestone13/ew-continuation-baseline`; preflight validation and preservation checks are under `ew-continuation-preflight`.

### Coverage assessment before revised release decision

1. Seven E&W confirmed gaps and zero partial gaps were tested.
2. All seven triggered browser fallback.
3. Zero WatchLayer renders completed.
4. Zero recovered expected evidence.
5. Zero produced useful reviewed WatchLayer evidence.
6. Zero separate E&W organisations contributed accepted rendered evidence.
7. Pricing, complaints, staff/service, identifiers, contact and links were represented in the cohort; retained evidence in these categories was static only.
8. No rendered document/PDF link was recovered.
9. Existing service-attribution regression metrics and paired classifications were unchanged; new rendered attribution remains untested.
10. No controlled serious-finding safety regression occurred; the new live cohort emitted no serious findings.

**M13 remains incomplete and uncommitted.** The new independent-cohort and conservative-failure checks are satisfied, but useful rendered recovery and human-reviewed evidence from at least two E&W organisations are not. Successful independent browser inspection cannot close those gates. No commit, push or productionisation is authorized by this result. Keep these failures as the frozen continuation baseline. Further M13 work should obtain a separately frozen cohort with relevant first-party, robots-permitted evidence or investigate a narrowly defined safe positive-evidence retention design; it must not relabel these failed captures as successes or weaken network boundaries. Productionisation is not recommended yet.


### Fresh ordinary-site controls and final technical gate

The continuation's new ten-firm paired control run completed separately from the earlier 197-page run. It retained **197 static pages and 197 assisted HTTP pages**, with **0 browser attempts**, zero paired rule/classification/fact-attribution changes, and zero serious findings. No production change preceded this new run; it supplies an additional fresh selectivity check.

| Firm | Static pages | Assisted HTTP pages | Browser attempts |
|---|---:|---:|---:|
| Tozers | 22 | 22 | 0 |
| Ashtons Legal | 22 | 22 | 0 |
| Tilly Bailey & Irvine | 20 | 20 | 0 |
| Rothera Bray | 22 | 22 | 0 |
| Rachel Sebastian & Co | 10 | 10 | 0 |
| Shakespeare Martineau | 18 | 18 | 0 |
| Kitson Boyce | 22 | 22 | 0 |
| Stephens Scown | 19 | 19 | 0 |
| Higgs LLP | 21 | 21 | 0 |
| Russell-Cooke | 21 | 21 | 0 |

Static runtime total was 369766 ms; assisted runtime was 368457 ms. Browser-added runtime was zero, and browser latency/failure rates are not applicable. HTTP failures were 1 static and 1 assisted. See [ordinary-controls-v2.json](Validation/milestone13/ew-continuation/ordinary-controls-v2.json) for page failures and document limitations. These are fresh observations, not live accuracy estimates.

The legacy control evaluator's raw no-history ablation is not used as causal evidence. A separate reconstruction with the eligible history, using M13's existing replay-context helper, confirmed zero direct rendered-result changes. Paired reports and original raw outputs remain unchanged.

[Final validation](Validation/milestone13/ew-continuation/final-validation.json) confirms all technical/safety checks and original-artifact preservation, but explicitly fails the E&W retained-evidence and human-review coverage gates. **M13 is still incomplete; no commit or push was performed.** The working tree intentionally retains the existing M13 changes and new continuation documentation. Productionisation has not started.

The ordinary-control summary draft mistakenly included observed and not-observed URLs in its diagnostic failure list. It is preserved under `reports/milestone13/ew-continuation-preflight/ordinary-controls-draft.json`; the linked v2 uses the actual observation states. Aggregate counts and all original scan reports were unchanged. The one actual failure in each mode is the same Russell-Cooke telephone-number-shaped relative URL documented above.


## Final release decision — M13 closed

The owner has explicitly concluded the evidence-quality research phase and authorized release despite the documented live-render coverage limitation. This supersedes the earlier incomplete/no-commit decisions above, which remain as the historical assessment under the original coverage gate. Frozen validation artifacts retain their original statuses; closure does not rewrite their outcomes.

The original cohort comprised 23 pages from eight organisations, with three Scottish confirmed gaps: all three rendered, one recovered all expected content and two recovered useful but different content. Clive completed the 18-item review: 18 accepted, all three rule-support/service associations confirmed, and zero wrong-service judgments.

The independently frozen E&W continuation comprised 16 pages from seven firms. Seven confirmed gaps across two firms all triggered (**7/7 sample eligibility-trigger recall**), but none recovered retained rendered evidence: four attempts were blocked by robots.txt and three by existing network policy. This is a real unresolved observability limitation, not proof of broad E&W browser coverage. No security/network exception was added. Browser fallback remains best-effort. Inability to render safely must continue to produce uncertainty rather than negative conclusions.

Static-first ordinary controls remain stable: 197 pages per mode, zero browser attempts and zero paired result or attribution changes. The preserved 50-firm benchmark and M10 service-review metrics are unchanged. Controlled serious-finding safety remains four true positives, zero false positives and zero false negatives. No live precision is claimed. The release validation record will record the final frozen reruns separately from earlier captures.

The engine has received extensive static, PDF, service-context, browser, human-review and regression validation. Further laboratory expansion now offers diminishing commercial value relative to an operator-reviewed founding beta. Customer-driven capability work must retain the established safety gates.

**Evidence-quality research phase concluded. Move to Regstead production and commercial operationalisation. Future WatchLayer detection changes should be driven by observed founding-customer gaps and validated through the established regression and human-review framework.**

Final frozen release validation passed: **766 full tests, 104 browser tests, typecheck, build and zero audit vulnerabilities**. The preserved 850-check benchmark, full report structures, M10 metrics and 4 TP / 0 FP / 0 FN serious controls are unchanged. See [release-validation.json](Validation/milestone13/release-validation.json). This release status supersedes earlier incomplete assessments without changing their evidence.
