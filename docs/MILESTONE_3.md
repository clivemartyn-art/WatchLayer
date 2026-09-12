# Milestone 3: deterministic rules and findings

WatchLayer now supports **Crawl → Extract → Snapshot → Compare → Rules → Findings**. Rules run offline over immutable snapshots. They make no legal or compliance judgments and make no additional network requests. Scanner budgets, robots handling, DNS protection, redirects, document HEAD checks and Milestone 2 comparison safeguards remain in force.

## Architecture

- `src/rules/types.ts`: versioned rule, pack, evidence, result, finding and run contracts.
- `pack.ts`: validated data definitions, compatibility checks and central default thresholds.
- `applicability.ts`: applicable, not applicable and uncertain outcomes.
- `detectors.ts`: reusable observation checks. Availability is shared by homepage, page and document rules; discovery handles robots and sitemaps. Detectors inspect current observation state before retained values.
- `engine.ts`: deterministic evaluation and run creation. IDs/timestamps are execution metadata; equal inputs and definitions produce equal raw results.
- `findings.ts`: independent one-result-to-one-finding projection and deterministic priority. Future aggregation can replace this projection without changing detectors.
- `repository.ts`: rule persistence boundary, implemented by the existing SQLite adapter.
- `reporting/findings.ts`: severity groups, a separate UNKNOWN section and result counts.

The current engine compatibility version is `1`. Snapshot schema `2` and scanner application version `0.2.0` are retained: extraction and comparison semantics are unchanged. New snapshots include optional bounded request metadata and broken-link observations. Old snapshots remain readable; missing transport evidence produces UNKNOWN rather than a guessed TLS or broken-link result. Future incompatible snapshots are not evaluated as healthy.

## Packs and configuration

The initial pack is **watchlayer-universal v1.0**, containing 15 versioned definitions. A pack has its ID, name, version, description, engine compatibility, schema version and rules. Each rule has ID/version, name/description/category, severity, enabled state, applicability, detector, configuration, evidence requirements, outcome mapping, reference text and pack ID.

`validatePack()` rejects incompatible schemas/engines, duplicate rule IDs, missing fields, unsupported detectors, invalid targets/thresholds and unsafe outcome mappings. Pack definitions are data; they cannot execute JavaScript or bypass crawler policy. Percentages are 0–100; certificate expiry days must be finite and nonnegative. Default thresholds live together in `DEFAULT_THRESHOLDS`: 30 certificate days, 30% content reduction, 30% crawl-size reduction. A custom JSON pack can override these values without changing detector code. Give changed definitions new rule and pack versions.

`configuration.urls` selects tracked resources or critical pages. Critical metadata rules default to the starting page's canonical URL; important-page rules default to previously healthy known pages, document rules to previously known documents, form rules to previously tracked source pages. These defaults are generic rather than assertions about business importance. Disabled rules emit NOT_APPLICABLE. A missing baseline gives uncertain applicability, not proof that a resource never existed. Matching histories without tracked forms/documents yield NOT_APPLICABLE.

## Universal rules

| ID | Check | Severity | Conservative interpretation |
|---|---|---|---|
| WEB-U001 | Homepage available | CRITICAL | Healthy direct response passes; direct 404/410/5xx is a potential issue; inconclusive failures unknown. |
| WEB-U002 | HTTPS available | CRITICAL | Successful HTTPS passes; explicit certificate-validation error is a potential issue; other failures unknown. |
| WEB-U003 | Certificate healthy | HIGH | Valid certificate passes; near expiry warns; confirmed invalid/expired certificate is a potential issue. |
| WEB-U004 | Known page available | HIGH | Direct healthy response passes; current confirmed 404/410 and eligible comparison required for a potential issue. |
| WEB-U005 | Known document available | HIGH | Same safeguards; links alone cannot establish availability. |
| WEB-U006 | Sitemap available | MEDIUM | Discovered valid map passes; reliable absence/invalid map warns; interrupted discovery unknown. |
| WEB-U007 | robots.txt available | LOW | Starting origin's successful retrieval passes; 404/410 warns; inconclusive result unknown. |
| WEB-U008 | Broken internal links | MEDIUM | Only observed 404/410 links warn; pass means no confirmed broken links observed, not exhaustive link health. |
| WEB-U009 | Known form present | HIGH | Matched forms or one remaining form on its known page pass; all expected forms absent on reliable HTML gives a medium-confidence potential issue. Ambiguous matching unknown. |
| WEB-U010 | Form structure | MEDIUM | Method/action/field signatures stable passes; an unambiguous changed pair warns; many-form ambiguity unknown. |
| WEB-U011 | Critical title present | LOW | Present title passes; missing title on reliable HTML warns. |
| WEB-U012 | Critical page indexable | MEDIUM | No observed noindex passes; newly introduced noindex warns; pre-existing noindex intent unknown. |
| WEB-U013 | Canonical stable | MEDIUM | Unchanged declaration passes; changed declaration warns for review. |
| WEB-U014 | Content reduction | MEDIUM | Reliable comparable HTML with reduction at/above threshold warns. Rendering-dependent or unavailable content unknown. |
| WEB-U015 | Crawl-size reduction | HIGH | Requires compatible eligible scans, no reached limit, no failed requests/discovery and no unobserved/uncertain pages. A limited 100→25 sample is UNKNOWN. |

Availability checks reuse direct HTTP evidence from natural crawling or the existing bounded recheck phase. They do not issue a second probe after an already observed 404. A report confirms the observed response at scan time, not permanent deletion. Previously confirmed-missing resources are not represented as newly missing merely because they were unvisited later.

## Results, confidence and priority

States are **PASS, WARNING, POTENTIAL_ISSUE, UNKNOWN, NOT_APPLICABLE**. Severity is **CRITICAL, HIGH, MEDIUM, LOW, INFO**, independent of confidence **HIGH, MEDIUM, LOW**. UNKNOWN always has LOW confidence. Direct HTTP facts support high confidence in that observation; heuristic or intent-dependent warnings and form absence use medium confidence. Explanations state the scope and why confidence was assigned.

Priority is deterministic: state bucket × 100 + severity rank × 10 + confidence rank. PASS and NOT_APPLICABLE rank zero. UNKNOWN, WARNING and POTENTIAL_ISSUE use buckets 1, 2 and 3. It is a sorting rank, not a legal, regulatory or customer health score.

Evidence records scan and previous-scan IDs, URL, observed/current values, previous values and an explanation. Resource values retain HTTP status, observation state, hashes, word counts or form signatures as appropriate. Coverage accompanies broad signals. Rules never use retained fingerprints as current proof. TLS evidence comes from the validated connection without disabling certificate validation; only certificate validity metadata and typed error codes are retained, not certificate/key material.

## Persistence and versioning

Migration 3 adds `rule_runs`, `rule_results` and `findings`. Runs reference their scan, include a deterministic comparison identity for a snapshot pair where present, pack ID/version, engine version, start/end times and status. The complete evaluated pack definition is copied into every run, including thresholds and disabled flags. There is no separate comparison table; the pair identity references the two immutable snapshots used for comparison.

Results store rule/version, state, confidence, severity, resource, evidence and explanation plus the full versioned JSON representation. Findings are separate records with ID, title, description, recommendation, evidence, priority, first-detected timestamp and current state. One run is inserted atomically; foreign keys and update/delete triggers protect all three historical tables. A new evaluation inserts a new run; it never replaces an older rule version's output.

Finding identity and first-detected time describe this scan's projection. Cross-run incident aggregation, deduplication, resolution and first-ever occurrence tracking are deferred. Re-running a scan creates another immutable evaluation, not a new scan. Multiple distinct packs can be evaluated for the same scan; duplicate pack IDs in one execution are rejected. CLI custom packs replace the default pack list; repeat `--pack` to run several.

## CLI

```sh
npm run scan -- https://example.com --rules
npm run scan -- https://example.com --compare --rules
npm run rules -- <scan-id>
npm run rules -- https://example.com
npm run rules -- <scan-id> --pack custom-pack.json
npm run rules -- <scan-id> --pack pack-one.json --pack pack-two.json --json
npm run findings -- https://example.com
npm run findings -- https://example.com --json --output reports/findings.json
npm run validate:rules
```

All commands accept `--db`. `--rules` requires persistence. Stored-scan evaluation does not access websites. Historical scan evaluation only considers older compatible baselines. Findings display the latest run per pack for the newest scan; if that scan has no rules, the command says so instead of silently displaying stale findings. Exit status follows existing CLI error handling; findings do not make the command fail merely because warnings exist.

JSON reports use `{schemaVersion: 1, runs: [...]}`. Each run carries its schema version, definition, results and findings. Published Draft 2020-12 schemas for individual results and findings are under `docs/schemas/`; their source is `src/rules/json-schema.ts`. Regenerate with `npx tsx scripts/export-rule-schemas.ts` when intentionally evolving the schema.

## Validation and remaining limits

Final verification: **222 tests passed across 10 files**, including all 131 existing tests and 91 new tests. Type checking and the build passed. The npm dependency audit reported **zero vulnerabilities**; no dependencies were added. New tests cover definition validation, all result states, pack versions, applicability, evidence, conservative resource handling, metadata/forms/documents, TLS capture, thresholds, storage rollback and immutability, CLI execution, JSON schemas and reporting. The existing migration fixture was updated to construct a genuine version-one database before verifying upgrade to migration 3.

The offline A → B scenario extends the Milestone 2 website: a directly checked retired page returns 404; an unlinked service page remains outside the recheck budget; a PDF returns 404; the contact form gains a field; pricing text falls substantially; sitemap is absent; healthy indicators stay stable. The script asserts each expected outcome before exporting its JSON, readable report and SQLite database under ignored `reports/milestone3/`. The report was inspected: 13 PASS, 4 WARNING, 2 POTENTIAL_ISSUE and 4 UNKNOWN resource results. There are more than 15 results because resource rules expand per URL.

The engine sees a bounded static-HTML sample. It cannot establish whole-site absence, business intent, form functionality, certificate revocation completeness, or all browser behavior. HTTPS is observed during normal fetching; HTTP-only scans do not cause an extra HTTPS probe. Old snapshots have no certificate facts. Metadata indexability concerns extracted HTML robots directives, not search-engine decisions or all HTTP-header policies. Canonical changes are flagged for review; no semantic intent inference exists. Word count is a coarse content signal. Form identity matching is deliberately conservative. The site-size guard may withhold a warning even when a real reduction occurred. No text-pattern detectors were added because snapshots retain hashes rather than full text.

No LawWatch/SRA rules, AI, rendering, PDF-content extraction, scheduling, alerts, dashboard, authentication, billing, deployment or regulatory scoring were added. The recommended next step is Milestone 4: build and evaluate the first separate LawWatch Rule Pack using the human benchmark under `docs/validation/`. That milestone has not been started.
