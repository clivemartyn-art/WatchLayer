# WatchLayer — Milestone 9

A local, industry-neutral TypeScript website-monitoring engine. It crawls public pages, extracts structured facts, stores immutable SQLite snapshots, compares repeat scans and runs versioned deterministic rules to produce findings. It makes no legal-compliance assessments.

## Requirements and installation

M9 adds independent evidence review tooling and three reviewed context corrections. See the [human review guide](docs/MILESTONE_9_HUMAN_REVIEW_GUIDE.md) and [milestone report](docs/MILESTONE_9_INDEPENDENT_REVIEW.md). LawWatch pack 1.5 retains conservative service safeguards; historical report formats remain supported.

Install Node.js 22.16 or newer, including npm (Node.js 24 LTS recommended), then run from this folder:

```sh
npm install
npm run scan -- https://example.com
```

## Usage

```sh
npm run scan -- example.com
npm run scan -- https://example.com --output report.json
npm run scan -- https://example.com --max-pages 10
npm run scan -- https://example.com --compare
npm run scan -- https://example.com --rules
npm run rules -- <scan-id>
npm run findings -- https://example.com
npm run validate:rules
npm run scan -- https://example.com --lawwatch
npm run scan -- https://example.com --lawwatch --no-pdf-extraction
npm run lawwatch -- <scan-id>
npm run validate:lawwatch
npm run compare -- https://example.com
npm run history -- https://example.com
npm run export-scan -- <scan-id> --output exported-scan.json
npm run scan -- https://example.com --no-persist
npm run --silent scan -- https://example.com --json > report.json
npm test
npm run typecheck
npm run build
npm run validate:scenario
node dist/cli/index.js https://example.com --output report.json
```

Scans persist automatically to `.watchlayer/watchlayer.db`, which is excluded from Git. Use `--db <path>` on any command to choose another database. `--no-persist` retains the Milestone 1 scan-only workflow. `--compare` scans and compares; the separate `compare` command compares stored scans without making network requests.

`--json` emits JSON instead of the terminal report. `--output` writes JSON while retaining the normal terminal report (export always emits JSON). Existing output files are overwritten. Scan JSON retains the Milestone 1 fields and adds snapshot identity/coverage. Snapshot export contains structured observations and hashes, without full HTML; M7 also retains bounded, normalized PDF page text and extraction metadata. Exit code 1 means invalid arguments, an unrecoverable error, or no HTML pages retrieved. Partial scans retain their errors.

Repeat scans select the latest eligible snapshot with matching crawl limit and scanner/schema versions. Up to 20 known resources are rechecked after crawling; use `--recheck-budget 0` to disable additional requests, or an integer up to 20 to lower the budget. Missing HTML observations become **NOT OBSERVED**, not removed. A direct 404/410 is required for confirmed page/document removal; inconclusive failures reduce confidence. Form and contact removals require their source pages to have been reliably observed.

## Architecture

```text
src/
  cli/          Arguments and output files
  crawler/      Bounded crawl and public-network HTTP transport
  discovery/    XML sitemap parsing
  extractors/   HTML facts and reusable visible-text extraction
  documents/    Safe bounded PDF extraction, page text and provenance
  links/        URL classification and document detection
  forms/        Form fields and heuristic classification
  contacts/     Public email and phone extraction
  reporting/    Human-readable terminal summary
  schemas/      Versioned TypeScript result interfaces
  snapshots/    Snapshot lifecycle, fingerprints and bounded rechecks
  comparison/   Eligibility, deterministic differences and materiality
  rules/        Versioned packs, reusable detectors, evidence and findings
  lawwatch/     England & Wales pack, scoped facts, services and regulatory surfaces
  storage/      Repository interface, SQLite adapter and migrations
  utils/        URL normalization, domain policy, DNS safety
tests/          Deterministic extraction, crawl and transport fixtures
```

The reusable `scan()` API accepts crawl settings and returns `ScanResult`. A trusted fetcher injection is available for offline tests; the CLI always uses the protected network transport. `schemaVersion` permits future snapshot formats to evolve.

## Crawl policy and safety

The default budget is 100 page requests, including failed requests. Crawling is sequential, with at least 300 ms between requests, a 10-second per-hop deadline, a five-redirect limit and a 2 MB text-response cap. Discovery is bounded to 20 sitemap requests and 10,000 queued page URLs. Robots policies are consulted for each origin. Missing robots files permit crawling; network failures, 401/403 and server errors conservatively skip that origin.

Only HTTP/HTTPS on standard ports is supported. Requests stay on the starting registrable domain, including subdomains; private hosting suffixes separate tenants. Every connection validates all DNS answers and pins a public address, including after redirects. Local, private, reserved and metadata addresses are rejected. Redirects to another registrable domain are rejected. A declared HTML canonical link is recorded but never treated as authority to expand scope. The starting page's final URL supplies the report's canonical hostname.

Fragments and common tracking parameters are removed and query parameters sorted. Root URLs normalize to `/`; non-root trailing slashes are preserved because servers may serve different content. Redirect aliases are remembered, and page records and sitemap parsing are deduplicated by observed final URL. An unknown redirect alias may still require a request to discover its destination. Confirmed broken links (HTTP 404/410) are reported with each known source page. Access restrictions, throttling, server failures and transport errors remain in `errors` and `pagesFailed`; they do not prove a link is broken.

## Current limitations

- Static HTML and machine-readable PDF text. JavaScript-dependent pages receive `browser_render_recommended`; browser rendering is not implemented.
- Visible text, contacts and form classifications are best-effort heuristics. External CSS visibility, obfuscated contacts, international phone validation and perfect content isolation are not implemented.
- Recognizable consent-banner controls are excluded from text; legitimate cookie-policy content and footer contact details are retained. Form totals count occurrences per page, including repeated site-wide forms. National and international telephone representations may remain separate values.
- Standard XML sitemap indexes and URL sets are supported; compressed sitemaps are not. Broken sitemaps do not prevent internal-link crawling.
- Linked PDFs and visited extensionless PDF responses can enter bounded text extraction. Image-only, encrypted, unreadable and policy-blocked PDFs remain unresolved; other document formats are catalogued without parsing. Historical document rechecks still use HEAD and do not establish content absence.
- Only discovered destinations within the crawl budget are checked for broken links. Robots exclusions and unvisited links are not declared healthy. No external-link checking or form submission occurs.
- Responses are decoded as UTF-8. No retries, browser cookies, authentication, custom ports, or cross-domain redirects. Robots crawl-delay directives are not interpreted; requests use the fixed modest delay.
- Reports may contain public contact details and page text. Store exported files appropriately.
- No AI, browser rendering, OCR, scheduled scans, scoring, alerts, accounts or hosted infrastructure. SQLite persistence, deterministic rules and change detection are implemented; snapshots remain local.

SQLite uses Node's built-in library, avoiding a native add-on or external service. See [Milestone 2 design and limitations](docs/MILESTONE_2.md) for migrations, eligibility thresholds, data retention and comparison semantics. The deterministic `validate:scenario` command uses mocked HTTP responses, creates a fresh database and exports its report under the ignored `reports/milestone2/` folder.

See [the Milestone 1 public-site validation report](docs/MILESTONE_1_VALIDATION.md) for the tested sites, observed limitations and hardening results.

The [Milestone 3 rule engine](docs/MILESTONE_3.md) supplies the 15-rule **WatchLayer Universal v1.0** pack. `--rules` evaluates and saves findings after a scan; `rules` evaluates stored observations offline. `findings` displays the latest evaluations for the newest scan. These commands support `--db`, `--json` and `--output`. Repeat `--pack custom.json` to evaluate configured packs; thresholds are pack data. Findings retain exact rule/pack versions and evidence. UNKNOWN means insufficient evidence, and an unobserved resource is never automatically a confirmed failure. Machine-readable schemas are in `docs/schemas/`.

[Milestone 4](docs/MILESTONE_4.md) introduced **LawWatch England & Wales v1.0**, with 34 definitions covering regulatory indicators, pricing per service, informational age signals and monitored changes. `scan --lawwatch` captures bounded facts and runs both packs. `lawwatch <scan-id>` evaluates stored evidence offline; old scans without those facts remain UNKNOWN. M4 did not parse PDFs; M7 adds the bounded support described below. The human benchmark workbook remains read-only. `npm run evaluate-lawwatch -- --firm "Russell-Cooke"` runs a deliberately limited manual evaluation; all 50 firms require an explicit `--all` option. WatchLayer's names and database paths are unchanged.

[Milestone 5](docs/MILESTONE_5_BENCHMARK.md) hardens discovery and extraction in **LawWatch England & Wales v1.1**. LawWatch prioritises regulatory/pricing links and adds separate budgets of up to 40 regulatory pages and five directly linked staff pages after the normal crawl. Its default request spacing is one second. Configure these independently:

```text
npm run scan -- https://example.com --lawwatch --max-pages 20 --lawwatch-evidence-budget 40 --lawwatch-staff-budget 5
npm run lawwatch -- <scan-id> --reason-codes
npm run evaluate:milestone5 -- --phase final --all
npm run summarize:milestone5 -- reports/milestone5/final
```

Evidence budgets accept 0–50; staff budgets accept 0–10. Zero disables the corresponding extra stage. All stages share deduplication, robots, redirect and public-network safeguards. Different discovery profiles are not suitable baselines for removal conclusions. LawWatch reports retain structured UNKNOWN reasons and bounded link context. Calculator outputs remain unevaluated; PDF support arrived in M7. The benchmark study distinguishes strict agreement, conservative uncertainty compatibility and unproven issue precision; it does not establish production readiness.

[Milestone 6](docs/MILESTONE_6_BENCHMARK.md) introduces **LawWatch England & Wales v1.2** precision checks, separate PASS adjudication records and a controlled negative benchmark. It tightens client-complaints context, staff/pricing scope, qualifications, stages and VAT evidence. A valid replacement regulatory surface prevents a removed URL from becoming a LawWatch serious finding. Reports add customer-friendly status labels while retaining internal enums. New evaluation requires fresh v1.2 facts; saved historical reports remain unchanged.

```text
npm run evaluate:negative
npm run adjudicate:lawwatch -- reports/milestone5/final docs/Validation/milestone6/m5-evidence-review.json
npm run evaluate:milestone6 -- --phase final --all
```

The full live evaluation is explicit, sequential and resumable, with unchanged M5 budgets. Human Review is not a machine warning or proven false PASS. Selected-evidence review and controlled fixture precision are reported separately from live human benchmark agreement. No PDF extraction, browser execution, AI or hosted infrastructure is added.

## Milestone 7 PDF extraction

[Milestone 7](docs/MILESTONE_7_PDF_EXTRACTION.md) adds **LawWatch England & Wales v1.3** and reusable PDF extraction for normal scans. It uses pinned `pdfjs-dist@6.3.289` for machine-readable page text, with no external executable or required native canvas runtime. Each finding cites the PDF URL, title, page number, content hash and referring pages. SQLite migration 5 preserves extraction results without rewriting historical scans. Existing report schemas gain optional PDF sections; older reports remain readable.

PDFs use the existing public-network, robots and registrable-domain restrictions. Off-site regulatory/CDN documents are inventoried but not downloaded. Protocol-changing redirects are blocked. Processing is sequential: at most 25 documents, 10 MB per document, 50 MB total per scan, 200 pages and 500,000 characters per document, with a 15-second parser deadline. The regular HTML budgets are unchanged. `--no-pdf-extraction` disables PDF downloads and retains discovery metadata.

Statuses are `EXTRACTED`, `NO_TEXT`, `TOO_LARGE`, `DOWNLOAD_FAILED`, `INVALID_PDF`, `PARSE_FAILED`, `ENCRYPTED`, `UNSUPPORTED`, `BLOCKED_BY_POLICY` and `NOT_ATTEMPTED`. Failed or image-only extraction does not establish missing regulatory information. PDF text can support scoped pricing, complaints and regulatory facts; it cannot establish badge operation or HTML navigation. Mixed-service documents are deliberately conservative. No OCR is performed.

```text
npm run validate:pdf
npm run evaluate:milestone7 -- --firm "Kitson Boyce" --output reports/milestone7/experiment
npm run evaluate:milestone7 -- --all --reuse-pdf reports/milestone7/paired --output reports/milestone7/replay
```

The paired evaluator enriches frozen M6 HTML observations using only PDFs already discovered in those scans; `--reuse-pdf` performs an offline replay. It requires retained M6 evaluation files and does not overwrite the benchmark workbook. Fresh end-to-end subset scans use `evaluate-lawwatch`. The completed 50-firm paired evaluation and three fresh scans are documented in M7. Serious-finding precision remains demonstrated only on the narrow controlled removal suite; live launch precision remains unproven.

## Milestone 8 evidence adjudication

[Milestone 8](docs/MILESTONE_8_EVIDENCE_ADJUDICATION.md) adds **LawWatch England & Wales v1.4** with a separate deterministic PDF support assessment. M7 extraction facts stay at version 1.3. Raw candidates remain intact; only contextually supported PDF facts can contribute to rule results. Optional report data records SUPPORTED, PARTIALLY_SUPPORTED, AMBIGUOUS, NOT_RELEVANT and INSUFFICIENT_CONTEXT, including page provenance and up to 1,200 characters of surrounding text. Mixed-service, irrelevant, unscoped boilerplate and uncertain source relationships remain conservative.

```text
npm run evaluate:milestone8 -- --all --output reports/milestone8/new-experiment
npm run review:milestone8 -- reports/milestone8/release/review-queue.json human-decisions.json reports/milestone8/human-review.json
```

The evaluator uses the preserved M6/M7 corpus offline and creates a new output directory. The separate review tool accepts reviewer-attributed human decisions without changing raw evidence, machine reports or the benchmark workbook. Automated support assessments are explicitly **not independent human adjudication**. The completed replay assessed 1,994 PDF candidates; all 850 selected M7 benchmark outcomes are unchanged. No fresh M8 live validation or independent human review is claimed. No parser, network, database or SaaS redesign was added.
