# WatchLayer — Milestone 1

A local, industry-neutral TypeScript website crawler. It discovers public pages, extracts structured facts, and produces a terminal report and optional JSON. It makes no legal-compliance assessments.

## Requirements and installation

Install Node.js 22 or newer, including npm, then run from this folder:

```sh
npm install
npm run scan -- https://example.com
```

## Usage

```sh
npm run scan -- example.com
npm run scan -- https://example.com --output report.json
npm run scan -- https://example.com --max-pages 10
npm run --silent scan -- https://example.com --json > report.json
npm test
npm run typecheck
npm run build
node dist/cli/index.js https://example.com --output report.json
```

`--json` emits JSON instead of the terminal report. `--output` writes JSON while retaining the normal terminal report. Existing output files are overwritten. Exit code 1 means invalid arguments, an unrecoverable error, or no HTML pages retrieved. Partial scans retain their errors in the result.

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
- Document links are catalogued by filename extension without fetching or parsing their contents. Extensionless downloads may not be identified. Non-HTML response bodies are discarded.
- Only discovered destinations within the crawl budget are checked for broken links. Robots exclusions and unvisited links are not declared healthy. No external-link checking or form submission occurs.
- Responses are decoded as UTF-8. No retries, browser cookies, authentication, custom ports, or cross-domain redirects. Robots crawl-delay directives are not interpreted; requests use the fixed modest delay.
- Reports may contain public contact details and page text. Store exported files appropriately.
- No AI, persistent snapshots, repeat-scan scheduling, change detection, compliance rules, scoring, alerts, database, accounts or hosted infrastructure.

Milestone 2 should add persistent snapshots, repeat scans and deterministic change detection, preserving crawl completeness and errors so missing observations are not mistaken for removed content.

See [the Milestone 1 public-site validation report](docs/MILESTONE_1_VALIDATION.md) for the tested sites, observed limitations and hardening results.
