# WatchLayer Milestone 2

Implemented scope: **Crawl → Extract → Snapshot → Compare → Report**. The engine remains industry-neutral. The historical Milestone 1 validation report is unchanged.

## Runtime and persistence architecture

Node.js 22.16+ is required; Node.js 24 LTS is recommended. SQLite is provided by Node's maintained, built-in [`node:sqlite` library](https://nodejs.org/api/sqlite.html). Its API is still marked as a release candidate in current Node documentation and older runtimes may print an experimental warning. No additional package, native add-on, database server or hosting is required.

`SnapshotRepository` is the storage boundary. `SqliteRepository` implements it; the crawler and diff engine contain no SQL. Replacing the adapter later need not rewrite crawling, fingerprints or comparison. SQLite operations are synchronous and short; the transaction occurs after network activity, not across a crawl. Foreign keys and a five-second busy timeout are enabled.

Default database: `.watchlayer/watchlayer.db`, relative to the working directory. `--db <path>` overrides it. `.watchlayer/`, SQLite database extensions and journal/WAL sidecars are ignored by Git. Keep custom exports in an ignored output folder if they should remain local.

## Schema and identity

- `sites`: deterministic site ID, unique registrable canonical domain, canonical start URL, first seen, last scanned and creation time. This follows the crawler's same-registrable-domain scope; www and apex hosts share history, while private hosting suffixes keep tenants separate.
- `scans`: immutable UUID-based `scan_<uuid>` ID, site ID, start/completion times, status, crawl limit, eligibility, application and snapshot versions. The JSON metadata column stores structured coverage, sitemap information, warnings and errors.
- `page_observations`: scan ID + normalized requested URL; final URL and observed aliases, HTTP status, observation state, title, description, canonical, robots, H1s, word count, response time, browser-render flag and hashes.
- `document_observations`: scan ID + normalized URL; filename/type, source pages, first-observed time, observation state and optional header-check evidence.
- `form_observations`: scan ID + ordinal, page URL, method/action/classification, stable field signature and fingerprint. Repeated forms are a multiset, not silently deduplicated.
- `contact_observations`: scan ID + kind + normalized value, source pages and observation state. UK national/international formats are not guessed to be equivalent.

Foreign keys link observations to scans. Indexes support site history, eligible scans and page forms. Application version is `0.2.0`; persisted snapshot schema version is `2`, comparison schema version is `1`. The existing nonpersistent scan result retains schema version `1`.

## Scan lifecycle

1. Validate/normalize input, identify the site and select a previous suitable snapshot.
2. Generate a unique scan ID and crawl using the existing safeguards and default 100-page limit.
3. Collect evidence for successful requests, failures, robots exclusions and URLs outside the crawl budget.
4. Recheck selected known resources within the explicit budget; do not recursively crawl links from rechecked pages.
5. Build fingerprints, structured observations, coverage and eligibility warnings.
6. Insert the site, scan and observations atomically in SQLite. Never replace a completed scan.
7. Produce the optional comparison against the selected baseline.

Scan status is `failed` if the starting page was not retrieved as HTML, `partial` when the natural crawl hit its limit or recorded errors, otherwise `complete`. Status does not assert complete coverage of every resource ever known; coverage and warnings provide that distinction. Completed failed/partial attempts are retained. A process killed before the transaction leaves no incomplete snapshot; resumable scans are not implemented.

## Fingerprints and retained data

- Text hashes are SHA-256 over NFC-normalized visible text with whitespace and line endings normalized. Real words, numbers and punctuation are retained.
- Metadata hashes cover normalized title, description, canonical and robots directives. H1 values contribute a separate structural hash and metadata-change events.
- Form fingerprints cover method, normalized action, sorted field names/types, classification and submit presence. Hidden field **values** and changing nonce values are not stored. Duplicate field entries are retained.
- Document identity uses the normalized URL and its apparent metadata. No document body is fetched or hashed.

SQLite stores no full HTML or visible page text. Hashes, word counts and structured facts suffice for this milestone. Scan-only JSON output still contains the extracted text, preserving Milestone 1 behavior; persisted-snapshot exports do not. There is no retention deletion command yet. Future configurable retention can operate through the repository without changing extraction.

For a resource not observed now, last-known fingerprints can be retained with `lastObservedScanId`, but the current `observationStatus`, `status`, `evidence` and reason explicitly describe the gap. `lastKnownStatus` and `lastKnownFinalUrl` retain HTTP knowledge across gaps. They are not treated as new HTTP evidence. Contact source associations not reobserved are marked in `unobservedSourcePages`. This avoids forgetting a page, form or contact after one truncated scan.

## Eligibility and baseline selection

Only the latest eligible snapshot with the same configured crawl limit, application version and snapshot schema version is selected. An immediately preceding failed or incompatible scan is skipped. If none exists, save the scan as a potential new baseline and report that no comparison was made. A different crawl limit creates a separate comparable sequence within site history.

The current scan is ineligible when its starting page was not retrieved as HTML, no HTML pages were observed, more than 25% of natural page attempts failed, combined natural/recheck failures exceed 25% with inconclusive recheck failures present, or the natural HTML page count fell below half the previous suitable count. These constants are in `comparison/eligibility.ts`.

Budget limits, discovery errors, unavailable rechecks, known unobserved resources, robots exclusions and possible JavaScript dependence produce warnings. An eligible scan may still have **REDUCED** confidence. Ineligible comparisons can show factual changes on observed pages and HTTP status evidence, but suppress confirmed-removal conclusions. Version-incompatible comparisons are entirely suppressed. Scans with limited coverage are not claimed to describe the entire site.

## REMOVED versus NOT OBSERVED

The observation states are `observed`, `confirmed_missing`, `not_observed`, `unreachable`, `excluded_from_scan` and `uncertain`.

- **PAGE/DOCUMENT_CONFIRMED_REMOVED:** current direct HTTP 404/410 evidence and an eligible comparison. The resource is confirmed missing at that URL; this does not prove permanent deletion or business intent.
- **PAGE/DOCUMENT_NOT_OBSERVED:** no reliable current observation, including budget exhaustion, exclusion, timeout, access restriction or unsupported response. Stored reasons and status evidence explain why.
- **PAGE_REDIRECT_CHANGED:** an observed final URL differs. This is not automatically a removal or a claim of permanence; redirect status-chain permanence is not inferred.
- **FORM_CONFIRMED_REMOVED:** the source page was successfully extracted, is not flagged as browser-dependent, and the form is absent in an eligible comparison. Otherwise use `FORM_NOT_OBSERVED`. Ambiguous many-form matching is conservative; only one unambiguous unmatched pair becomes `FORM_CHANGED`.
- **EMAIL/PHONE_REMOVED_FROM_OBSERVED_SITE:** all previously known source pages were reliably reobserved and the value is absent. This is explicitly limited to the observed source pages, not proof of disappearance everywhere on the website.

Previously confirmed missing resources do not generate repeated removal events merely because later scans did not revisit them. Returning missing pages produce a status change when observed again. Last-known facts are never silently counted as fresh observations.

## Known-resource rechecks

Default and hard maximum: **20 candidate resources**, configurable downward with `--recheck-budget 0..20`. Candidates come from the previous suitable snapshot, including its retained last-known resources. Previously confirmed missing resources are not repeatedly polled. Known pages already attempted naturally, or excluded naturally, are not requested again.

Candidate selection alternates a document and a page, avoiding document starvation. Pages use GET to extract current facts; documents use **HEAD only**, even when still linked. A server rejecting HEAD is recorded as uncertain/unreachable; there is no GET fallback or content download. New links found on rechecked pages do not start another crawl, although document/form/contact facts on those pages are recorded.

The same timeout, request pacing, redirect limit, domain restrictions and DNS/IP validation apply. Rechecks consult robots policies for each origin and every redirected resource destination. Cached robots responses are reused; an origin's failed robots lookup is not repeatedly retried during rechecks. External document hosts are excluded. The budget counts candidate resource checks; robots lookups and at most five redirect hops add bounded transport overhead. This is not an uncontrolled second crawl.

A fixed candidate order can leave later resources unobserved over multiple runs when the budget stays small. Rotation/prioritization beyond alternating types is a future improvement. Rechecks use the previous suitable baseline, not every URL ever seen in every failed scan.

## Materiality and comparison output

Hashes determine whether content changed, even at identical word counts. Events include previous/current word counts and absolute percentage difference. Under 5% is `minor`, 5–25% is `moderate`, over 25% is `major`; a zero-to-nonzero count uses 100%. Constants live in `comparison/materiality.ts`. A same-length rewrite is still a content change, but may be labelled minor by this initial heuristic.

The structured comparison includes scan IDs/times, site, eligibility/warnings, confidence, resource-category totals and typed change records with evidence, severity and materiality. Category totals count distinct resources within a category, so a resource can contribute both a status change and a removal. Unchanged counts pages with no reported page/form/contact changes. The human report separates NEW, CONFIRMED MISSING / REMOVED, CHANGED and NOT OBSERVED — NOT REMOVED.

## Commands

```sh
npm install
npm run scan -- https://example.com
npm run scan -- https://example.com --compare
npm run scan -- https://example.com --compare --recheck-budget 10
npm run compare -- https://example.com
npm run history -- https://example.com
npm run export-scan -- <scan-id> --output reports/exported-scan.json
npm run scan -- https://example.com --no-persist
npm run history -- https://example.com --db .watchlayer/other.db --json
npm test
npm run typecheck
npm run build
npm run validate:scenario
```

`compare`, `history` and `export-scan` do not access websites. Export returns the stored snapshot as JSON. `--output` writes JSON; `--json` switches terminal output to JSON. Ensure an output directory exists before exporting. There is no import command. The built entry points are `dist/cli/index.js`, `compare.js`, `history.js` and `export.js`.

## Migrations and immutability

`storage/migrations.ts` is the ordered migration source. SQLite `PRAGMA user_version` tracks database schema, separately from snapshot schema. Opening the repository applies pending migrations in an immediate transaction, rolling back on failure. A newer-than-supported database version is rejected without downgrading it.

Migration 1 creates tables and indexes. Migration 2 adds UPDATE/DELETE rejection triggers for historical scans and observation tables. Repository saves use INSERT and primary-key constraints; duplicate scan IDs fail atomically. Site summary timestamps can advance, but existing scans do not change. Future migrations should preserve historical JSON and explicitly handle version compatibility rather than requiring database deletion.

## Deterministic validation

`tests/fixtures/milestone2.ts` supplies Version A and Version B through a trusted mock transport; no external network or localhost safety bypass is needed.

Version A has four pages, a PDF link, a form, email and phone. Version B adds a team page, changes the homepage title and pricing text (100 → 150 words), adds a form field, changes the phone, removes the PDF with a HEAD 404, and unlinks a still-live services page. The one-resource demonstration budget checks the PDF and leaves services NOT OBSERVED. A separate test with the normal budget confirms the services page still exists.

`npm run validate:scenario` creates a fresh SQLite database and exports both snapshots, the JSON diff and a text report under `reports/milestone2/scenario-*/`. No production website is queried. The tests also exercise gaps across multiple scans, false-removal prevention, migration upgrades, rollback, reopening/export, CLI workflows, document HEAD semantics, robots/scope checks and recheck limits.

Verification on 12 September 2026: all **131 tests passed**, comprising the original 71 plus 60 Milestone 2 tests. Type checking (including tests and validation scripts) and the production build passed. The dependency audit reported zero vulnerabilities. The A → B report was inspected, and history/export were also verified through the built CLI. Git confirmed that database files and sidecars are ignored.

## Limits and next milestone

Static HTML extraction and all Milestone 1 coverage limits remain. No browser rendering, PDF parsing, AI, rules, scoring, accounts, dashboard, billing, alerts, background scheduler or hosted infrastructure were added. Form identity without stable IDs and contact normalization are heuristic. The fixed 20-resource recheck budget cannot guarantee complete historical coverage. SQLite exports contain public contact facts and should be stored appropriately.

Page/document lookup and comparison use maps; form matching uses fingerprint buckets. The current repository loads a site's history before selecting a baseline; for long histories, add paginated summary queries and targeted snapshot reads behind the repository interface. SQLite and its synchronous API are intended for this local milestone, not multi-tenant production throughput.

Recommended Milestone 3: a generic deterministic rule engine and the first universal WatchLayer rules, using explicit evidence and uncertainty. Milestone 3 is not implemented here.
