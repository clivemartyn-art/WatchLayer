# Milestone 12: held-out browser evidence validation and targeted reliability hardening

**Status: complete following Clive’s confirmed human review on 2026-09-28.** The earlier other-person response was a mistake, as clarified by the user. Original failed results remain preserved. See the completion review below. M13 has not started.

## Starting baseline

Started on clean, fetched `main` at M11 `ea7efac581022ec0c803d711706243c6e5e4466a`, equal to origin/main. Before production edits, reproduced 698 tests, typecheck, build, zero audit vulnerabilities, preserved 50-firm results, M10 review and controlled serious-finding results. Starting M10 is `ecd4eeae822ed7b4f39f1b15a9388915c4d3ba2f`.

The baseline artifacts are under `reports/milestone12/m11-baseline-*`. The held-out baseline has its own source/target hashes and timestamp in `reports/milestone12/heldout-baseline/manifest.json`. Original M10/M11 artifacts and benchmark workbooks are unchanged.

## Selection and independent confirmation

Separate in-app browser inspection established visible public content without WatchLayer's renderer. Bounded raw HTTP captures established that expected content was missing from the static visible text. No consent, forms, authentication, arbitrary clicks or access-control bypass was used. This is independent tooling confirmation, **not independent human adjudication**.

`docs/Validation/milestone12/confirmed-targets.json` and `confirmed-additional.json` retain the expected phrases, URLs, source hashes, labels and observations. Only HTTP-200 pages with absent expected static text and separately observed browser content count as CONFIRMED_RENDER_GAP. Direct 404 routes are OUT_OF_SCOPE, even when a separate browser displays an SPA route. Unresolved loading/SSL/access differences do not count as confirmed gaps.

Ten confirmed pages from three organisations were frozen before production changes:

| Organisation | Page IDs and routes | Expected public content |
| --- | --- | --- |
| Grainne Dolan & Co Solicitors | GD01 `/` | Home text and practice-area navigation |
| Zahoot | ZA01 `/`, ZA02 `/legal-services`, ZA03 `/about`, ZA04 `/contact` | Directory landing page, service descriptions, about text, contact information |
| Paraclearth | PA01 `/`, PA02 `/aboutus`, PA03 `/teamdetails?id=3`, PA04 `/service`, PA05 `/teamdetails?id=2` | Firm text, process, named staff profiles and service links |

These are an Irish firm, a Nigerian firm and a UK directory. They test generic browser observability, not SRA applicability. Directory taxonomy must not be treated as a firm's service offering. This set is small, concentrated across three implementations, and not representative of England-and-Wales firms or population-level accuracy. It contains no confirmed pricing/PDF/complaints recovery; those dimensions remain unproven live.

Each target received a paired static and assisted scan, one page per scan, no extra evidence/staff/recheck/PDF budget, sequential requests and existing safeguards. Reports are experimental observability outputs, not customer assessments. Once used to diagnose corrections, this set becomes development data; its rerun is not a new independent holdout.

## Demonstrated failures and corrections

The observations and proposed investigations were recorded in `docs/Validation/milestone12/pre-fix-failure-patterns.md` before editing production code.

1. Five Paraclearth pages hit the eight-second DOM-content-load deadline while serialized same-site dependencies were still being fetched successfully. Initial document commitment remains bounded at eight seconds; DOM readiness can now use the remaining existing twenty-second total attempt budget. Fixed settling, concurrency and all resource limits remain unchanged.
2. A single network-policy error hid which resource failed. Bounded resource events now record requested type, redacted URL, omission/fetch/failure, HTTP status and transferred size where available. Query values, credentials and fragments are excluded from diagnostic URLs. No request headers or response bodies enter this diagnostic list.
3. Intentionally omitted images/fonts/media were checked against the domain policy before being omitted, causing avoidable failure. These resource types are now aborted before essential-resource validation. This permits no new network access.
4. Exact HTTPS Google Fonts `/css` and `/css2` stylesheet endpoints are treated as font-only omissions. This is an omission, not a third-party permission. Unrelated stylesheets and scripts remain fail-closed. The endpoint purpose is documented by the [Google Fonts CSS API](https://developers.google.com/fonts/docs/css2). Tests retain CSS-hidden text exclusion and reject unsafe/lookalike endpoints.

No generic third-party allowlist was added. The post-fix diagnostics exposed remaining Bootstrap/jQuery CDN dependencies, chat/analytics dependencies, and Paraclearth's off-domain `backenddev.aaerlaw.com` API. An unrelated data origin is not made safe merely by being requested by public JavaScript. Safe generic support is not justified by these observations, so failure remains conservative rather than treating a partial DOM as reliable evidence.

Browser execution policy is now 1.1. Scan profiles include `browser-v1.1`, so historical browser policy 1.0 scans are not silently used as comparable disappearance baselines. Static-first crawling, rule logic, PDF handling and service-attribution policy are unchanged. No dependencies were added or changed.

## Original held-out results

| Metric | Frozen M11 | Post-fix |
| --- | ---: | ---: |
| Confirmed pages / attempts | 10 / 10 | 10 / 10 |
| Trigger recall | 10/10 | 10/10 |
| Successful renders | 0/10 | 0/10 |
| Expected content recovered | 0 | 0 |
| Recovery among successful renders | Not estimable | Not estimable |
| Material evidence/link gain | 0 | 0 |
| Rule-result changes | 0 | 0 |
| UNKNOWN to supported / supported to UNKNOWN | 0 / 0 | 0 / 0 |
| Classification / service-attribution changes | 0 / 0 | 0 / 0 |
| Network-policy failures | 5 | 10 |
| Timeouts | 5 | 0 |
| Median attempt duration | 8,919 ms | 9,305.5 ms |
| Independently reviewed evidence | 0 | 0 |

The timeout reduction is **not** evidence recovery: the longer available readiness window revealed a later network-policy failure. The ten-observation sample is too small for a meaningful p95 claim. Each page remained within the unchanged request, byte and total-time bounds. Static observations remained available and no live POTENTIAL_ISSUE was emitted. These zero-change outcomes cannot demonstrate cross-service precision or live serious-finding precision.

Detailed per-page timing, requests, blocked requests, bytes, error reasons and static-vs-rendered comparisons are retained under `reports/milestone12/heldout-post-fix`. Baseline resource declarations are explicitly marked as declarations, not proof of an actual browser request; post-fix events distinguish actual requests.

The ten post-fix attempts total 91,874 ms, 191 intercepted requests, 81 blocked requests and 14,376,390 transferred bytes. The longest attempt is 15,299 ms and the largest request count is 34. Each one-page scan makes one attempt; multiple pages from the same organisation are separate bounded scans. The byte sum is across all ten attempts, not one site's per-attempt budget.

## Independent review process

`prepare:milestone12-review` builds a deterministic, deduplicated queue of new rendered candidates and relevant links only from successful renders. Failed/timeout representations are excluded. Each automated item retains organisation, URL, bounded excerpt/context, rendered source hash, target rule/service, static/rendered state, automated results, attribution and result-change indicator.

Reviewer context omits machine decisions. A separate decision file starts blank and records relevance, service context, usefulness, rule support, reviewer, actual date and notes. Comparison checks source hashes, identifiers, duplicate decisions, date validity and contradictory labels. A zero-item queue is explicitly not a completed review; undefined denominators remain null. No AI-generated decision is treated as human review.

See `docs/Validation/milestone12/REVIEWER_GUIDE.md`. The current package is `docs/Validation/milestone12/review/`; it contains zero candidates. Do not ask the reviewer to label fabricated recovered evidence or substitute development fixtures for live validation.

```text
npm run evaluate:milestone12-heldout -- post-fix reports/milestone12/new-run
npm run prepare:milestone12-review -- reports/milestone12/new-run docs/Validation/milestone12/new-review
npm run compare:milestone12-review -- <automated-queue.json> <human-decisions.json> <new-comparison.json>
```

All output paths must be new. The baseline mode additionally requires the original M11 commit and unchanged production source. Full text stays in bounded, ignored development captures; production persists existing bounded provenance and selected evidence, not unrestricted website archives.

## Preserved benchmark and safety

The post-fix offline replay against the preserved M11 corpus completed in `reports/milestone12/post-fix-preserved` with zero rule-result changes:

- 850 checks: PASS 233, WARNING 53, UNKNOWN 564, POTENTIAL_ISSUE 0.
- Exact agreement 132/437 (30.21%); human Review has no exact machine-state mapping.
- Acceptable agreement 444/850 (52.24%).
- Human-confirmed PASS fraction 132/233 (56.65%); unconfirmed PASS predictions are not automatically proven false.
- Controlled serious findings: 14 scenarios, 4 true positives, 0 false positives, 0 false negatives.
- M10 review unchanged: exact 57/80 (71.25%), firm-wide 26/32 (81.25%), false service assignments 0/30.
- Full classification, PDF and PDF-adjudication report comparisons against M11 also show zero changed reports. No service-attribution production code changed; the independent M10 service-review replay is the attribution regression check.

No human benchmark contains sufficient new live negative labels to turn these controls into a live precision estimate.

## Fresh ordinary controls and validation status

The fresh paired ordinary-site control run completed under `reports/milestone12/ordinary-controls`, reusing the bounded M11 validation runner. These are fresh captures of known control firms, not ten new held-out organisations.

| Firm | Static pages | Assisted pages | Browser attempts |
| --- | ---: | ---: | ---: |
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
| Total | 197 | 197 | 0 |

Static-first behaviour remained dominant: fallback fraction 0/197, no observed unnecessary trigger, no browser timeout/failure and zero browser-added execution time. There were zero paired rule-result or service-classification changes and no serious-looking findings. This control sample is not independently labelled for trigger recall, so it cannot prove no gaps were missed. Static scans totalled 388,671 ms and assisted scans 375,151 ms; timing differences across sequential network captures are not a causal browser speedup.

Russell-Cooke had the same direct 404 in both modes for `/charging-information/+44%20(0)20%203826%207550`, a telephone-shaped relative URL. No browser ran, no result changed and no serious finding was emitted. This is a recorded static-crawl limitation, not an observed browser regression. No tuning used the ordinary controls.

The final combined suite passes **726 tests in 34 files**, including **28 new tests** (16 browser cases and 12 review/history cases). The explicitly rerun browser-only suite passes **72 tests in four files**. Typecheck and build pass. Post-fix audit reports zero vulnerabilities; dependency versions are unchanged. Existing controlled browser tests are retained; new cases cover delayed same-site scripts/API, font omission, unsafe endpoint rejection, dependency diagnostics, hidden content, PDF link recovery, static sufficiency, review integrity and policy-history separation. No missed-trigger or service-context correction was justified by this live set: all ten pages already triggered, and no reliable rendered candidates reached attribution.

## Original-phase remaining limits and next decision

At the end of the original phase, successful live recovery and independent review remained unmet despite passing technical checks. Browser rendering does not imply complete visibility. Read-only initial DOM observation excludes interactive/authenticated content. Security/network boundaries take precedence over coverage. No serious-finding or service-attribution safeguards were relaxed to improve coverage.

Do not start M13. The next decision is how to obtain a genuinely independent public evidence sample within the existing safe network boundary, or whether to explicitly revisit the narrow essential-dependency design. Any later target selection must be reported separately rather than replacing these ten failures or being called the original holdout. Broader product work is not justified by this result.

## Continuation validation

### Freeze and independence

The continuation starts from the same M11 HEAD and the expected uncommitted M12 changes. `reports/milestone12/continuation-preflight` preserves the tracked patch, working-file hashes and an archive of changed/untracked files. The 726-test baseline, typecheck, build, zero-vulnerability audit and controlled 4 TP / 0 FP / 0 FN gate were reproduced before further production edits. The preserved 50-firm replay and M10 service review remained unchanged. No original target or output file was overwritten.

The new cohort has ten confirmed pages from three additional organisations. Each showed an empty HTTP-200 static visible-text extraction and public content in separate browser inspection. Expected phrases and links were frozen before WatchLayer execution, under `docs/Validation/milestone12/continuation/confirmed-targets.json`. Confirmation is independent tooling observation, not completed human adjudication.

| IDs | Organisation / jurisdiction | Pages / expected content |
| --- | --- | --- |
| CN01–CN04 | LawyersNowNow / Nigeria | Home/service navigation, service descriptions, named founder, public contact address |
| CM01–CM03 | Mallison & Martinez / California USA | Initially visible attorney credentials, employee-focused contingent-fee description, firm philosophy |
| CR01–CR03 | AlRasheed & AlMusained / Saudi Arabia | Public home text and team/service links, banking-service description, partner qualification |

LawyersNowNow home and Mallison's attorneys page had been briefly explored in the previous phase, but never executed by WatchLayer or used for tuning. Other routes and the third organisation were new observations. This exposure is disclosed; these are continuation targets, never the original holdout. No success outcome was used to choose the ten pages. Script declarations guided selection: AlRasheed appeared first-party-only, Mallison mixed first-party bundles with advertising, and LawyersNowNow added an animation library. Runtime data dependencies were not assumed safe from these declarations.

This remains a concentrated, cross-jurisdiction observability sample, not an E&W regulatory benchmark. It excludes account areas, consent, forms, staff-tab interaction and hidden content. The ten routes span service/staff/contact/navigation evidence, but do not establish live pricing, complaints or PDF recovery.

### Frozen baseline and demonstrated correction

The policy-1.1 baseline is immutable at `reports/milestone12/continuation-baseline`. Its failure analysis was written before the continuation production correction in `docs/Validation/milestone12/continuation/baseline-findings.md`.

CR02 completed browser execution with no visible text or links, yet was forwarded as a reliable observation, changing ten service classifications from UNKNOWN to NOT_DETECTED. Policy 1.2 now rejects this empty representation with `EMPTY_VISIBLE_DOM` before forwarding facts. Static evidence remains available; the observation cannot support absence or disappearance. Useful text or links remain admissible, so this does not broadly suppress attribution. The scan-profile version separates older browser histories. Tests cover empty output, useful text/links and both prior policy versions.

No eligibility, interaction, visibility, time, request, byte, concurrency or network-access limits changed. The later live rerun yielded partial navigation on CR02 rather than empty output, so the new guard was verified with deterministic regression tests; it must not be credited for unrelated live timing/animation variation.

### Failure taxonomy and dependency investigation

| Primary category | Baseline | Post-fix | Evidence |
| --- | ---: | ---: | --- |
| THIRD_PARTY_LIBRARY_REQUIRED | 4 | 4 | Blocked AOS JS/CSS; secondary `AOS is not defined` runtime errors |
| THIRD_PARTY_API_REQUIRED | 2 | 3 | Actual off-domain Contentful entry requests; separate advertising-tag failure |
| DOM_READINESS_FAILURE | 1 | 0 | CM03 baseline timed out before an essential dependency failure was recorded |
| Completed render, expected content absent | 2 | 2 | Partial/empty visible output; predeclared service/biography text not recovered |
| Completed render with expected recovery | 1 | 1 | CR01 expected home text plus team/service links |

Network-policy rejection is a secondary cause for the library/API categories, not seven additional independent failures. Same-site script/API failure, client redirect failure and resource-budget exhaustion were not established by this cohort. CM03's changed failure reason is a later observation, not a rewritten baseline.

The detailed [dependency investigation](Validation/milestone12/continuation/dependency-investigation.md) distinguishes static libraries, dynamic data and tracking/chat. Exact public library metadata was inspected without execution, cookies, referrers, credentials or redirects. AOS `@next` redirected to beta version 3.0.0-beta.6. Versioned Bootstrap/jQuery resources returned 200 with no observed cookies or redirects, but those limited observations did not establish repeated necessity or justify general CDN access. Off-domain CMS/API authorization, cookies, redirects and ownership remain unverified. No API credentials were used.

**No essential-library allow mechanism or other egress expansion was implemented.** Advertising, chat, unrelated APIs and arbitrary CDN paths remain blocked. Successful continuation recovery used the existing network model.

### Live metrics and provenance

| Metric | Continuation baseline | Continuation post-fix |
| --- | ---: | ---: |
| Confirmed gaps / triggers / attempts | 10 / 10 / 10 | 10 / 10 / 10 |
| Completed renders | 3/10 | 3/10 |
| Expected-content recovery | 1/3 completed renders; 1/10 targets | 1/3 completed renders; 1/10 targets |
| Mechanical relevant-link gain pages | 2 | 3 |
| Rule-result changes | 0 | 0 |
| UNKNOWN to supported / supported to UNKNOWN rules | 0 / 0 | 0 / 0 |
| Classification changes | 30 | 30 |
| Service-attribution changes | 0 | 0 |
| Median attempt runtime | 5,929.5 ms | 6,529 ms |
| Timeouts | 1/10 | 0/10 |
| Independently reviewed items | 0 | 0 |

The thirty classification changes are ten UNKNOWN-to-NOT_DETECTED states on each completed page, not high-confidence service detection or supported rule promotion. Partial observation still cannot establish that a firm does not offer a service. No service-specific pricing evidence or serious finding was generated. The two pages missing their expected text cannot count as successful evidence recovery, even where their repeated navigation creates mechanical link gains. No hidden biography or service text was admitted.

Static and rendered facts, DOM/static hashes, source URLs, captured representations, request events and paired rule comparisons are preserved per target. No final rule-result change occurred, and no cross-service attribution was made. Three completed pages are too few to establish service-context accuracy or live serious-finding precision. Ten attempts are too few for a meaningful p95 claim.

Post-fix totals: 79,870 ms of browser attempts, 159 intercepted requests, 125 blocked requests and 8,563,837 transferred bytes across the ten one-page scans. The longest attempt was 15,510 ms. Mechanical relevant-link gain was 3/3 completed renders, but expected recovery was only 1/3; independently useful evidence remains unmeasured. These denominators must not be combined into an accuracy score.

### Independent review handoff (historical, before submission)

`docs/Validation/milestone12/continuation/review/START_HERE.md` introduces the three-item package: CR01's predeclared public text, Team link and Services link. Preparation now requires completed rendering **and** expected-content recovery; partial/failing pages are excluded. The generic expected-text item has no invented target rule. Link context uses captured anchor labels, not assumed destination contents.

The original empty review package remains intact. The continuation package has a new queue hash, a separate reviewer-context file and blank human decisions. Machine support/attribution reasoning remains in a separate automated file. The reviewer must enter their own name, actual date, usefulness, service-context assessment, rule support, label and notes. Null target rules and the Saudi jurisdiction prevent these items being treated as SRA rule validation.

Pending comparison: 3 candidates, 0 reviewed, 3 pending, 0 decisions in each label category. VALID_RENDERED_EVIDENCE, justified-support and wrong-service rates are unavailable, not zero-percent precision. No meaningful agreement or population accuracy can be reported before independent judgments. The user has designated another person to review; no reviewer name or labels are inferred.

### Continuation verification status

The first final test/control run spanned an overnight interruption. Its full suite reported four timeouts over 46,357 seconds, and Tilly Bailey & Irvine's assisted scan recorded 46,119,620 ms. These outputs remain preserved and are excluded from runtime conclusions. A resumed full run reported one existing five-second PDF integration timeout; an isolated check also timed out, followed by a diagnostic rerun in which all three unchanged assertions passed in 1.26 seconds. No production limit or permanent test deadline was increased. The final full run with original deadlines passes **737 tests in 34 files** in 150.13 seconds. The separately rerun browser suite passes **76 tests in four files**. Continuation added eleven tests, bringing M12's total additions over M11 to thirty-nine. Interrupted/timeout logs are retained alongside the passing final logs, not erased.

Only two affected ordinary control pairs were recrawled into separate output directories: Tilly Bailey & Irvine's interrupted pair and Rothera Bray's pair where the static run returned zero pages after resumption. The original pairs had one and twenty-six rule changes respectively, with no rendered evidence or browser attempts; they are not hidden or attributed to browser recovery. The complete replacement pairs have zero rule changes. `reports/milestone12/continuation-validated-controls/summary.json` records both excluded observations and the sources of the ten retained pairs.

The validated ordinary sample has 197 static and 197 assisted pages, zero browser attempts, zero paired rule/classification changes and zero direct-rendered changes. Static time totals 408,735 ms; assisted time totals 386,720 ms, with zero browser-added time. These sequential network measurements do not establish a browser speedup. Russell-Cooke retains its previously observed telephone-shaped relative-link 404, not a new browser regression. No ordinary-site trigger expansion or serious finding occurred.

The post-correction preserved replay is at `reports/milestone12/continuation-final-preserved`: 850 checks, PASS 233, WARNING 53, UNKNOWN 564, exact agreement 132/437, acceptable agreement 444/850 and human-confirmed PASS fraction 132/233. Rule-result changes are zero. Complete report comparisons show zero classification, PDF or adjudication changes across all fifty firms. M10 service-review results remain 57/80 exact, 26/32 firm-wide and 0/30 false service assignments; no service-attribution policy changed. Controlled serious findings retain all four expected positives, with zero false positives and zero false negatives. Typecheck/build pass and the continuation audit reports zero vulnerabilities. No dependencies changed.

### Completion review and next recommendation

Genuine expected live text/link recovery has now been demonstrated on one page without opening third-party access. Clive submitted all three judgments on 2026-09-28 and explicitly confirmed they are final. The earlier selection of another reviewer was a mistake. This completes the human-review gate; the original handoff and submitted notes remain preserved. Three items from one Saudi firm are a small observability sample, not proof of E&W rule accuracy, complete visibility or live precision. Do not start M13. After review, the next proposed scope should address broader independently selected public evidence and partial-render observability, not hosted product features or unrestricted browser interaction.

### Final human-review outcome — 2026-09-28

The submitted file and comparison are preserved under `docs/Validation/milestone12/continuation/review/`. Queue hash and all three item IDs match. Clive confirmed that the notes beginning “Provisional suggestion” represent his completed review; the submitted bytes were not edited. All three items are VALID_RENDERED_EVIDENCE and useful public evidence. PARTIAL_OR_AMBIGUOUS, NOT_RELEVANT, WRONG_SERVICE and INSUFFICIENT_CONTEXT each have zero judgments. Service context and rule support are NOT_APPLICABLE on all rows: justified rule-support and wrong-service rates therefore have no applicable denominator. No meaningful rule-agreement rate is claimed. These are three items from one page, not three independently sampled firms or a live precision estimate. No production correction was indicated by these judgments.

The technical verification and preserved/ordinary/serious-finding results above remain the release baseline. Completion checks are recorded separately under `reports/milestone12/completion-*2026-09-28*`. M13 is recommended to broaden independently selected public-evidence validation and investigate partial-render visibility conservatively; it has not started.

Final completion rerun on 2026-09-28: 737/737 tests across 34 files pass (158.31 seconds), including all 76 browser cases; typecheck and build pass; refreshed dependency audit reports zero vulnerabilities. No production changes occurred after the previously completed live controls, preserved benchmark and serious-finding validation. Origin/main matched the starting HEAD before the commit.
