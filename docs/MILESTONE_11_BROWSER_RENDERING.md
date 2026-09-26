# Milestone 11 — Selective browser-rendered analysis

## Starting checkpoint

M10 was complete on `main` at `ecd4eeae822ed7b4f39f1b15a9388915c4d3ba2f`. The working tree was clean and `origin/main` matched after fetching. The repository, package and database remain WatchLayer. No application repository, hosted service or customer UI was created.

M10 baseline: 642 tests; typecheck/build passed; audit zero vulnerabilities; service-review exact agreement 57/80 (71.25%), firm-wide agreement 26/32 (81.25%), false service assignments 0/30. The controlled serious-finding suite retained 4 true positives with 0 false positives and 0 false negatives. These remain development-sample and controlled-test results, not live accuracy estimates.

## Architecture and activation

Browser rendering is **selective, not default**. `--browser-fallback` opts a scan into eligibility assessment. The ordinary HTTP crawler, its queues and its existing page budgets remain in charge. Playwright is imported and Chromium started only for an eligible page. Each attempt uses a new disposable browser context; there is no persistent browser profile.

The core `src/browser/` modules separate eligibility, execution, visible-DOM projection, observation/comparison and types/limits. `src/lawwatch/rendered.ts` adapts the bounded projection into the existing LawWatch extraction pipeline. The crawler stays industry-neutral. LawWatch England & Wales moves to pack/rules 1.7 and raw fact version 1.5; PDF support and M10 service-attribution policies are unchanged. Existing fact versions remain readable.

Install the pinned `playwright@1.63.0` dependency and its matching Chromium runtime:

```text
npm install
npx playwright install chromium --only-shell
npm run scan -- https://example.com --lawwatch --browser-fallback --max-pages 20
npm run lawwatch -- <scan-id>
```

An unavailable browser is a recorded observation failure, not evidence that public information is absent. The default static scan does not require the Chromium installation.

## Eligibility

Only successful HTML responses on public, non-account routes qualify. HTTP access errors are not bypassed. Eligibility counts meaningful body words after removing navigation, headers, footers and recognizable cookie controls; static link availability is counted before removing navigation.

| Reason | Decision |
|---|---|
| `STATIC_CONTENT_SUFFICIENT` | At least 80 meaningful words immediately avoids rendering; ordinary content with at least 30 words also stays static unless an explicit shell signal applies. |
| `APP_SHELL_DETECTED` | Executable script plus an empty recognized application root or explicit JavaScript/loading message, with fewer than 35 meaningful words. |
| `RENDERED_LINK_DISCOVERY_REQUIRED` | Executable script, fewer than 15 meaningful words and no static anchors anywhere on the page. |
| `STATIC_BODY_TOO_SPARSE` | Executable script, fewer than 30 meaningful words and an explicit busy region, or an empty main region with no static anchors. |
| `BROWSER_NOT_REQUIRED` | Other pages, unsupported responses, or account routes. |

Script presence or visual complexity alone never qualifies. A short page with working static navigation is not automatically a missing-navigation case. These heuristics intentionally miss some partial JavaScript enhancements; they do not promise complete visibility or force rendering to increase coverage.

## Execution limits

| Bound | Value |
|---|---:|
| Attempts per site/scan, including failures | 5 |
| Maximum discovery depth for a rendered page | 2 |
| Browser concurrency / transport concurrency per scan | 1 / 1 |
| Browser launch / page DOM-content load | 5 s / 8 s |
| Total fallback attempt | 20 s, followed by process cleanup |
| Initial settling period | 1.5 s |
| Requests per attempt | 80, capped before queueing |
| Redirects / retries | 5 / 0 |
| Resource / additional transport byte budget | 2 MB / 10 MB |
| Retained DOM representation | 200,000 bytes |
| Extracted text / visited DOM nodes | 50,000 characters / 10,000 |

The initial HTTP response is reused in Chromium rather than fetched again. Its existing static size bound applies separately from additional browser transport bytes. Streaming limits can consume one final network chunk before aborting. Oversize DOM output fails as a whole; truncated evidence is not promoted to support. Recorded elapsed time includes browser cleanup and can exceed the nominal execution deadline slightly. Browsers are closed after every attempt, including timeout/crash paths.

Natural HTML, LawWatch evidence and staff budgets are unchanged. Newly rendered internal links pass through existing URL normalization, domain checks, deduplication and queue bounds. New query-bearing HTML links are not enqueued from rendering; document links retain the existing document policy. There is no browser-driven recursive navigation crawler.

## Security and resource policy

Chromium does not make the public network connection itself. Every intercepted request is fulfilled through the existing Node HTTP transport, which checks public DNS addresses, pins the selected address, validates redirects and enforces HTTP(S), standard-port and same-registrable-domain restrictions. Robots checks run before resource requests and redirects. A nonfunctional browser proxy with loopback bypass disabled provides a backstop for unhandled browser traffic. Production has no fixture transport override.

The disposable context blocks service workers, WebSockets, downloads, framed content and permissions. Popups close and dialogs dismiss. Only GET requests are sent by the transport; scripts cannot use it to submit forms. Media, images, fonts, obvious tracking paths and unsupported resource types are blocked. Scripts, styles and same-site data requests are permitted within limits. Response cookies and download headers are not forwarded. The Chromium sandbox stays enabled.

There are no private-network, localhost, metadata-service, file-protocol, credential-URL or off-domain exceptions. The deterministic integration corpus uses intercepted virtual public URLs, not a production localhost allowlist. Off-site CDN dependencies can therefore prevent successful rendering; M11 preserves the domain boundary and reports uncertainty instead of opening that boundary.

## Visible extraction, context and consent

Projection preserves visible headings, text, links, structural regions, form descriptions and document links. It removes scripts, templates, hidden/aria-hidden/CSS-hidden regions and recognizable consent controls. Duplicate leaf blocks are suppressed only within the same structural region and heading context; identical fees under different service headings remain separate. Header/footer/navigation structure is retained so existing evidence extraction can discount boilerplate and record link accessibility.

The browser captures the initial visible state after settling. It can observe delayed content, an already open accordion, or a client-side route change. Closed accordion bodies and hidden tabs are excluded. It does not click tabs/buttons, scroll, fill or submit forms, sign in, accept terms or marketing consent, solve challenges, or enter account areas. Content underneath a cookie overlay can be read when it remains visible in the DOM; content made hidden by the overlay is not reclassified as visible. Consent is not persisted.

Rendered candidates use the same extraction, evidence adjudication and M10 attribution protections as static candidates: local headings, stale-heading boundaries, mixed-service isolation, firm-wide handling and `NO_SERVICE_CONTEXT` remain mandatory. A service URL alone cannot establish attribution. Detecting a rendered badge does not prove badge operation.

## Provenance and retention

The original static page, HTTP status and hashes are never silently replaced. A separate optional browser observation records requested/static/final URLs, original HTML hash, rendered representation/hash, attempt timestamp, eligibility reason, strategy, duration, resource counts and failures. A rendered fact carries `observation.sourceType = RENDERED_DOM`, its URL, time, hashes and `initial-visible-dom-v1` strategy. Existing HTML facts and PDF provenance remain distinct. PDF referrers can additionally identify discovery through rendered DOM.

Only a bounded normalized visible representation is persisted, not an unrestricted raw DOM or browser archive. Form field values, browser profiles, cookies and downloaded browser files are not retained. Rendered form descriptions remain separate from static form observations so they do not create false static form-removal comparisons.

Snapshot metadata gains an optional browser section using existing immutable persistence; no database migration is needed. Reports retain schema version 1 with optional source/summary fields and a regenerated JSON schema. Historical reports are not rewritten. Browser-enabled and static-only history profiles are separate. Signal-disappearance checks match the observation source; a failed render cannot substitute static content for a previously rendered regulatory signal.

## Comparison tooling

`scripts/milestone11-comparison.ts` reports static/rendered text and link counts; new/lost links and text blocks; duplicate blocks; added/lost/duplicate evidence candidates; service-context decisions; and rule/classification changes. DOM novelty is distinguished from material evidence candidates. New navigation/footer text can be `BOILERPLATE_ONLY` while a newly discovered relevant navigation link is separately reported as useful discovery.

For evaluation, a page is counted as producing materially new evidence when it adds a HIGH-confidence candidate or a relevant service/pricing/complaints/people/document link. This is a candidate/discovery metric, not independent confirmation of rule accuracy. UNKNOWN-to-supported and supported-to-UNKNOWN transitions are reported separately. Failed rendering has no inferred lost-evidence conclusion.

The fresh evaluator makes independent bounded static and assisted scans and also evaluates assisted facts with direct rendered facts removed. This ablation identifies direct rendered support; it cannot remove every downstream HTTP/PDF discovery effect and is not a perfect static counterfactual. Paired live timing differences include network and site variability.

## Controlled Chromium corpus

The virtual public-URL corpus uses real Chromium with a deterministic transport and makes no live requests. Fourteen cases cover static sufficiency, an application shell, dynamic navigation, pricing, complaints, staff/service content, a PDF link, cookie overlay, script error, continuing loading indicator, infinite JavaScript timeout, public client redirect, mixed-service hidden tabs and delayed content.

Final recorded run: 13 attempts, 11 successful renders, 1 expected script failure, 1 expected timeout; the static page never rendered. Eight of the eleven rendered pages (72.73%) added relevant evidence candidates or links. Average attempted runtime was 3,497 ms; p95 is not reported for this small sample. Pricing, complaints, document-discovery and mixed-service scenarios exercised rule-result changes without serious findings. A loading indicator can render successfully while adding no useful evidence—successful execution is not equivalent to content coverage.

Focused tests additionally cover SSRF/protocol/domain rejection, client redirects to metadata addresses, redirect loops, request bursts, DOM limits, private account routes, hidden templates/CSS/accordions, duplicate heading contexts, POST blocking, query-link suppression, PDF provenance, SQLite round trips and failure-safe historical comparisons.

## Fresh controlled validation — 26 September 2026

Ten firms were scanned sequentially, each first static and then browser-assisted, with 10 natural + 10 evidence + 2 staff pages, 1-second HTTP spacing, no historical rechecks and the existing PDF budgets. Selection mixed known static/PDF/service-context controls with modern script/form-heavy sites. The selected modern sites were candidates for JavaScript gaps, not independently established client-rendered sites. No account areas were tested.

| Firm | Static / assisted HTML pages | Browser attempts / successful | Static / assisted elapsed seconds |
|---|---:|---:|---:|
| Tozers | 22 / 22 | 0 / 0 | 44.7 / 41.8 |
| Ashtons Legal | 22 / 22 | 0 / 0 | 41.1 / 42.8 |
| Tilly Bailey & Irvine | 20 / 20 | 0 / 0 | 28.2 / 28.3 |
| Rothera Bray | 22 / 22 | 0 / 0 | 38.4 / 38.5 |
| Rachel Sebastian & Co | 10 / 10 | 0 / 0 | 13.9 / 14.5 |
| Shakespeare Martineau | 18 / 18 | 0 / 0 | 46.5 / 44.3 |
| Kitson Boyce | 22 / 22 | 0 / 0 | 48.2 / 47.2 |
| Stephens Scown | 19 / 19 | 1 / 0 | 372.1 / 63.7 |
| Higgs LLP | 21 / 21 | 0 / 0 | 25.9 / 25.9 |
| Russell-Cooke | 21 / 21 | 0 / 0 | 115.9 / 47.6 |

The initial sample attempted rendering on 1/197 assisted HTML pages (0.51%). It added 12.814 seconds of measured fallback time. This single attempt failed with missing jQuery/$ script dependencies; 14 requests were blocked. Failure rate was 1/1, timeout rate 0/1. There were zero successful live rendered pages, so the materially-new-evidence fraction and live browser benefit are **unavailable**, not zero-precision or success claims. No live p95 is meaningful with one attempt. The faster paired totals on two firms reflect variable HTTP/PDF activity, not a browser speed improvement.

The attempted Stephens Scown tag archive already exposed static navigation. Investigation found eligibility counted links after removing navigation text. The final policy counts links first and avoids treating an empty archive with working static navigation as a missing-link shell. A one-page fresh post-correction recheck of that exact URL returned `BROWSER_NOT_REQUIRED`, with no browser attempt. The original ten-firm outcomes remain preserved rather than being rewritten as final-policy measurements.

Higgs had a robots-excluded query route; Russell-Cooke had one HTTP 404 on a telephone-like relative link exposed by the site. Neither became a LawWatch serious finding. Detailed URLs, script failures, per-firm PDF counts and observation comparisons are in `docs/Validation/milestone11/fresh-summary.json`.

The selected 170 benchmark checks were identical between static and assisted runs: PASS 42, WARNING 5, UNKNOWN 123, POTENTIAL_ISSUE 0. Exact agreement was 26/92 (28.26%); acceptable agreement 88/170 (51.76%); human-confirmed PASS fraction 26/42 (61.90%). All rule-result changes, direct-rendered changes, UNKNOWN-to-supported transitions and service-classification changes were zero. The human workbook predates these observations; these comparisons do not establish fresh live accuracy or precision.

## Preserved benchmark and serious-finding gate

The reusable offline evaluator replayed all 50 firms using preserved M6 HTML/M7 PDF inputs and compared against the M10 release outputs. No browser was run against that corpus.

| Metric | M10 | M11 |
|---|---:|---:|
| Selected checks | 850 | 850 |
| UNKNOWN | 564 | 564 |
| PASS / WARNING | 233 / 53 | 233 / 53 |
| Exact agreement | 132/437 (30.21%) | unchanged |
| Acceptable agreement | 444/850 (52.24%) | unchanged |
| Human-confirmed PASS fraction | 132/233 (56.65%) | unchanged |
| Rule-result / classification / PDF extraction changes | — | 0 / 0 / 0 |
| UNKNOWN → supported / supported → UNKNOWN | — | 0 / 0 |
| Changes caused by rendered evidence / browser failures | — | 0 / 0, browser not run |

All 1,994 PDF assessments retain the same extraction corpus. The adjudication summary is recorded separately; a low UNKNOWN count is not a release criterion. Human `Review` is excluded from exact agreement and can be compatible with cautious machine outcomes in the separate acceptable-agreement metric. It is not automatically a machine WARNING or a proven false PASS.

The 14 controlled serious-finding cases retained all 4 expected issues: 4 true positives, 0 false positives, 0 false negatives. Browser failure/history tests add protection against false disappearance. These controls establish the narrow fixture gate only; **live serious-finding precision remains unproven**. The 80-row M10 service review also remains unchanged at 57/80 exact, 26/32 firm-wide and 0/30 false service assignments.

## Reproduction and validation artifacts

```text
npm test -- --maxWorkers=1
npm run typecheck
npm run build
npm audit
npm run test:browser
npm run validate:browser -- reports/milestone11/new-fixtures
npm run evaluate:milestone11-live -- --run reports/milestone11/new-live
npm run evaluate:milestone8 -- --all --source reports/milestone10/release3 --output reports/milestone11/new-preserved
npm run evaluate:milestone10-review -- reports/milestone11/new-service-review
npm run evaluate:negative
```

Browser integration tests require permission for Chromium's local control connection, even though public-URL fixtures do not contact live sites. The live command explicitly initiates ten sequential paired scans; it is never part of automated tests. New output directories prevent overwriting captures. The legacy M8 evaluator's `m7`/`m8` JSON keys mean supplied source versus current replay here, not the actual milestone versions. `scripts/summarize-milestone11.ts` creates the committed compact M11 artifacts from the release directories. Raw databases and scan representations stay ignored.

The final test count and validation status are recorded in the release validation section below. The benchmark workbook and original human review are not edited. Generated customer titles and explanations were inspected separately from quoted source snippets, which may contain the website's own language.

## Limitations and recommended M12

Browser execution does not imply complete visibility. Late content, hidden/interactive tabs, closed accordions, canvas, frames, significant interactions, authentication and consent-gated content remain out of scope. Read-only same-site transport deliberately excludes third-party CDN dependencies and stateful sessions. Fixed settling and request/DOM limits can yield UNKNOWN on a legitimate site. No screenshot-based visual prominence judgement or legal certification is introduced.

The live sample did not demonstrate successful rendering of a genuine public client-rendered evidence gap. M11 therefore provides a bounded engine capability with synthetic integration evidence, not a proven live coverage improvement. The next milestone should be **M12: held-out browser evidence validation and targeted reliability hardening**, using a small independently selected set of confirmed public JavaScript evidence gaps, human review of newly rendered candidates, and explicit investigation of essential-resource failures within the existing network boundary. Retain the serious-finding gate and do not loosen attribution to reduce UNKNOWN. No M12 work starts automatically.

## Final release validation — 26 September 2026

- **698 tests passed across 32 files**, including all 642 existing tests and 56 new browser/eligibility/history tests. No tests were removed. The final complete single-worker run used frozen production and test files.
- Type checking and production build passed. Dependency audit reported **zero vulnerabilities** (39 production entries, 100 development entries, 150 total including optional accounting).
- The separate 56-test browser suite and all 14 controlled Chromium corpus outcomes passed. Expected script failure and timeout cases were correctly conservative.
- The preserved 50-firm benchmark and M10 service review are unchanged. All 4 expected serious findings were retained with 0 false positives and 0 false negatives.
- Generated titles and explanations were checked across 70 preserved/fresh reports. No prohibited legal conclusion was emitted by those generated fields.
- No unresolved test regression remains. Development runs exposed a test assertion reading PDF provenance from the wrong structure, and an eligibility test ran while that correction was still being edited. Both were resolved before the frozen complete passing run; they are not omitted failures.
- The benchmark workbook hash remains `beafdde971fa122e4200a55863f7ff60ccd891640f81457dc1978eea27d7c4aa`; the original human-review CSV remains `14909a94d69464d94c377cc74ed3620daf6c52673fad74869452fd8f6146fab7`.
- The ten-firm live result remains limited by zero successful rendered pages. The corrected trigger was verified in a separate one-page fresh check; no live precision claim is made.
