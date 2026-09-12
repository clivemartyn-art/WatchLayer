# WatchLayer — Milestone 4

A local, industry-neutral TypeScript website-monitoring engine. It crawls public pages, extracts structured facts, stores immutable SQLite snapshots, compares repeat scans and runs versioned deterministic rules to produce findings. It makes no legal-compliance assessments.

## Requirements and installation

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

`--json` emits JSON instead of the terminal report. `--output` writes JSON while retaining the normal terminal report (export always emits JSON). Existing output files are overwritten. Scan JSON retains the Milestone 1 fields and adds snapshot identity/coverage; snapshot export contains structured observations and hashes, without full text or HTML. Exit code 1 means invalid arguments, an unrecoverable error, or no HTML pages retrieved. Partial scans retain their errors.

Repeat scans select the latest eligible snapshot with matching crawl limit and scanner/schema versions. Up to 20 known resources are rechecked after crawling; use `--recheck-budget 0` to disable additional requests, or an integer up to 20 to lower the budget. Missing HTML observations become **NOT OBSERVED**, not removed. A direct 404/410 is required for confirmed page/document removal; inconclusive failures reduce confidence. Form and contact removals require their source pages to have been reliably observed.

## Architecture

```text
src/
  cli/          Arguments and output files
  crawler/      Bounded crawl and public-network HTTP transport
  discovery/    XML sitemap parsing
  extractors/   HTML facts and reusable visible-text extraction
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

- Static HTML only. JavaScript-dependent pages receive `browser_render_recommended`; browser rendering is not implemented.
- Visible text, contacts and form classifications are best-effort heuristics. External CSS visibility, obfuscated contacts, international phone validation and perfect content isolation are not implemented.
- Recognizable consent-banner controls are excluded from text; legitimate cookie-policy content and footer contact details are retained. Form totals count occurrences per page, including repeated site-wide forms. National and international telephone representations may remain separate values.
- Standard XML sitemap indexes and URL sets are supported; compressed sitemaps are not. Broken sitemaps do not prevent internal-link crawling.
- Document links are catalogued by filename extension without parsing their contents. Repeat scans may recheck known documents with HEAD only; there is no GET fallback for unsupported HEAD. Extensionless downloads may not be identified. Non-HTML response bodies are discarded.
- Only discovered destinations within the crawl budget are checked for broken links. Robots exclusions and unvisited links are not declared healthy. No external-link checking or form submission occurs.
- Responses are decoded as UTF-8. No retries, browser cookies, authentication, custom ports, or cross-domain redirects. Robots crawl-delay directives are not interpreted; requests use the fixed modest delay.
- Reports may contain public contact details and page text. Store exported files appropriately.
- No AI, browser rendering, scheduled scans, compliance rules, scoring, alerts, accounts or hosted infrastructure. SQLite persistence and deterministic change detection are implemented; snapshots remain local.

SQLite uses Node's built-in library, avoiding a native add-on or external service. See [Milestone 2 design and limitations](docs/MILESTONE_2.md) for migrations, eligibility thresholds, data retention and comparison semantics. The deterministic `validate:scenario` command uses mocked HTTP responses, creates a fresh database and exports its report under the ignored `reports/milestone2/` folder.

See [the Milestone 1 public-site validation report](docs/MILESTONE_1_VALIDATION.md) for the tested sites, observed limitations and hardening results.

The [Milestone 3 rule engine](docs/MILESTONE_3.md) supplies the 15-rule **WatchLayer Universal v1.0** pack. `--rules` evaluates and saves findings after a scan; `rules` evaluates stored observations offline. `findings` displays the latest evaluations for the newest scan. These commands support `--db`, `--json` and `--output`. Repeat `--pack custom.json` to evaluate configured packs; thresholds are pack data. Findings retain exact rule/pack versions and evidence. UNKNOWN means insufficient evidence, and an unobserved resource is never automatically a confirmed failure. Machine-readable schemas are in `docs/schemas/`.

[Milestone 4](docs/MILESTONE_4.md) adds **LawWatch England & Wales v1.0**, with 34 definitions covering regulatory indicators, pricing per service, informational age signals and monitored changes. `scan --lawwatch` captures bounded facts and runs both packs. `lawwatch <scan-id>` evaluates stored evidence offline; old scans without those facts remain UNKNOWN. No PDF parsing or browser execution is performed. The human benchmark workbook remains read-only. `npm run evaluate-lawwatch -- --firm "Russell-Cooke"` runs a deliberately limited manual evaluation; all 50 firms require an explicit `--all` option. WatchLayer's names and database paths are unchanged.
