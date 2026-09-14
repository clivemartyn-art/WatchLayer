# Milestone 7: bounded PDF text extraction

Implemented on 13 September 2026. WatchLayer remains a local deterministic scanner. This milestone adds machine-readable PDF evidence; it does not certify regulatory compliance. Readiness remains limited internal/operator-reviewed use, consistent with M6. No M8 work, branding rename, commit or push is included.

## Implementation and files

`src/documents/` contains the industry-neutral extraction types, processor, isolated parser, JSON schemas and terminal summary. The existing crawler discovers candidates and invokes it after its normal/evidence/staff stages. `src/crawler/http.ts` extends the existing safe transport with bounded binary responses. `src/lawwatch/pdf.ts` adapts page text into existing deterministic detectors; LawWatch inventory, evaluation, uncertainty, evidence and report modules consume those facts. No second crawler or firm-specific production logic was introduced.

Snapshot types/service and SQLite storage/migrations persist the results. CLI scan/export/report paths expose them. `scripts/evaluate-milestone7.ts` supports paired benchmark enrichment and offline replay; `scripts/validate-milestone7.ts` exercises a complete local PDF scan and the M6 negative cases. Four M7 test files and a small generated PDF fixture module cover extraction, transport security, CLI persistence and operation without native canvas. README and the published LawWatch report schema are updated. Separate evidence-review metadata is under `docs/Validation/milestone7/`; the workbook is unchanged.

## Parser choice and reproducibility

The sole new direct production dependency is **pdfjs-dist 6.3.289**, pinned in package.json and package-lock.json. Mozilla PDF.js exposes maintained Node-compatible, page-level text extraction without shelling out to Python, Poppler or other system binaries. Its license is Apache-2.0. See [the PDF.js API](https://mozilla.github.io/pdf.js/api/) and [document loading options](https://mozilla.github.io/pdf.js/api/draft/api.js.html). Node 24 is the tested runtime; the project's Node >=22.16 requirement remains sufficient.

The package declares optional platform canvas packages. Text extraction neither renders pages nor requires those packages: a regression test disables native canvas loading and still extracts the real fixture successfully. No mandatory platform-specific runtime dependency was added.

Each document records the parser version and normalization version 1. Text uses NFC Unicode normalization, collapsed horizontal whitespace and stable line boundaries derived from text-item positions. It is not aggressively dehyphenated. Pages are never concatenated into detector clauses; evidence cites its actual page. Identical bytes are parsed once per scan using SHA-256; canonical/final URL aliases also avoid known repeated fetches. Unknown aliases may still require a download. Referrer relationships survive deduplication. Tests assert repeated extraction equality. Runtime resource exhaustion can still yield an explicit failure rather than a usable result; determinism is not a guarantee of successful extraction on every machine.

## Discovery, network and resource protections

Candidates reuse existing document discovery: linked .pdf paths, known PDF document metadata and visited responses indicating application/pdf. Genuine PDF bytes are also recognized behind incorrect MIME types where available. Extensionless detection needs a visited response; this does not probe arbitrary downloads or follow links embedded inside PDFs. A candidate must begin with `%PDF-`; a .pdf route returning HTML is INVALID_PDF.

All downloads use the same public DNS validation, address pinning, TLS, standard-port restriction, robots policies and registrable-domain boundary as HTML crawling. Every redirect destination is checked. Localhost/private/link-local/reserved addresses, unsafe protocols and cross-domain destinations remain blocked. PDF redirects may not change protocol, including HTTP-to-HTTPS changes. Same-boundary subdomains are allowed; a firm's separate external CDN is not automatically trusted. External SRA resources remain discovered references, not the firm's text corpus. No PDF scripts, actions, embedded attachments, forms, links or network resources are executed.

| Limit | Default |
|---|---:|
| Selected PDF attempts per scan | 25 |
| Download bytes per PDF | 10,000,000 |
| Total PDF download bytes per scan | 50,000,000 |
| Pages per PDF | 200 |
| Normalized characters per PDF | 500,000 |
| Parser deadline per PDF | 15 seconds |
| Worker V8 old-generation heap limit | 192 MB |

The HTTP transport checks Content-Length and actual streamed bytes. It aborts oversized or slow responses; a final network chunk may cross the configured threshold before cancellation, and observed transferred bytes remain counted. Documents run sequentially. Worker termination provides a real deadline for CPU-bound parsing. The V8 heap setting is not an OS memory sandbox or a hard bound on native/ArrayBuffer memory. Parser loading disables eval, fonts, worker fetching and image decoding/rendering paths. Limits and failures are handled without aborting the website scan.

Regular HTML budgets and 10-second per-hop network deadlines remain unchanged. Generic scans keep their existing pacing; LawWatch uses one-second spacing. The PDF phase has its own bounded budget. An extensionless PDF encountered as a normal page consumes that page attempt and may be fetched again as binary. Documents first found only by a later historical recheck are not retroactively parsed in the completed PDF phase.

## Outcomes and diagnostics

| Status | Meaning |
|---|---|
| EXTRACTED | Usable machine-readable text was extracted within limits |
| NO_TEXT | Valid readable document structure, fewer than 20 alphanumeric text characters; commonly image-only |
| TOO_LARGE | Per-document or remaining scan byte allowance exceeded |
| DOWNLOAD_FAILED | HTTP/transport failure; actual HTTP status retained when returned |
| INVALID_PDF | Returned content did not have the required PDF signature |
| PARSE_FAILED | Malformed/truncated PDF, parser exception or worker error |
| ENCRYPTED | Password/encryption detected; no decryption attempted |
| UNSUPPORTED | Page/text limit, undecodable replacement characters or parser timeout |
| BLOCKED_BY_POLICY | Site-boundary, robots or network safety restriction |
| NOT_ATTEMPTED | Extraction disabled or scan budget exhausted |

An extraction error is not evidence that a regulatory signal is absent. Unreadable, encrypted, image-only and skipped PDFs retain UNKNOWN when no equivalent HTML evidence supports the check. No partial text from a failed parser limit is used. NO_TEXT means insufficient machine-readable text, not a confident image classification.

Terminal reports show discovered/attempted/extracted/skipped/failure/no-text counts, transferred bytes, per-document status, title/URL and referrers. JSON adds error codes, HTTP status, hashes, parser versions and page details. Raw bytes and full document text are not logged. Summary counts describe URL observations; duplicate content may count as multiple extracted document locations. Attempts include candidates subsequently blocked by robots or redirect policy, so attempts and skipped counts are not disjoint.

## Persistence, schemas and retention

Migration **5** adds `document_extractions`, keyed by scan ID/document ID, with status, structured JSON, an index and immutable update/delete triggers. It references the existing scan identity and does not duplicate document observations. Metadata, normalized pages and referrers are stored in one bounded extraction record. Saving a snapshot and its extraction records is transactional. Existing migrations and historical scans remain readable; migration tests exercise a pre-PDF database.

No binary PDFs or unrestricted HTML archives are retained. Successful normalized PDF page text is intentionally retained, at most 500,000 characters per document and 25 attempted documents per scan, plus bounded metadata/referrers. This supports offline rules and page-level evidence review. The snapshot and saved LawWatch report both contain PDF extraction data, so there is bounded storage duplication. Operators should treat local databases/exports as potentially containing public personal information. Retention duration or automatic deletion is not implemented.

Scan schema 1, snapshot schema 2 and LawWatch report schema 1 gain optional additive `pdf` data with its own schemaVersion 1. Evidence facts gain optional PDF provenance; regulatory surfaces gain optional extraction metadata. Strict schemas accept old reports. Exact LawWatch rule/pack/fact/discovery versions advance to **1.3**; Universal remains 1.0. Stored HTML-only 1.2 facts may be evaluated, but 1.2 facts cannot carry PDF sources. Historical report objects are never rewritten and detector-version/discovery-profile protections still govern comparisons.

## Evidence eligibility and service isolation

An AnalysisSource supplies source type, URL, title, page text and provenance. The LawWatch adapter escapes text before reusing its HTML text detectors, preventing literal PDF markup from inventing DOM elements. Content checks can use suitable pricing/VAT/disbursement/inclusion/exclusion/stage/duration/staff facts, complaints/Legal Ombudsman/SRA wording and informational age references. PDF evidence includes document ID, hash, title, URL, page number, referrers, extraction method and selected snippet.

PDF text cannot establish a digital badge, badge operation or HTML navigation. PRICE-016 and LAW-U010 require real observed HTML links; a link to a scoped pricing PDF can support that objective link-presence observation. It does not establish legal prominence. PRICE-017 requires service-associated pricing locations.

Service association uses document title/filename, content, anchor and observed referring-page context. Explicit single-service document scope may carry to later pages. Mixed-service PDFs abstain from pricing because M7 has no trustworthy section/column model. Generic prices are not assigned to every advertised service. Readable PDF scope overrides broad surrounding HTML link context. Staff documents require an explicit service-related staff link to supply qualifications; they do not become pricing locations merely because their URL contains “fee earners”. PDF-only service detection cannot promote weak HTML pricing into high-confidence cost evidence.

Final inspection fixed primary citations that selected an earlier weak HTML match despite a valid HIGH-confidence PDF match. The Kitson Boyce remortgage PASS remains supported by its actual fees PDF; the market-price article is no longer its primary source. Staff-profile pricing-location and shared conveyancing/probate link-context cases have dedicated regressions. These safeguards do not claim to solve every pre-existing M6 context limitation.

PDF extraction does not add PDF-specific removal/content-drift alerts. Existing page-based LawWatch change rules and direct-404/410 safeguards retain M6 semantics. A failed PDF extraction never becomes a confirmed removal. Hashes and immutable extraction records support future document comparison work without claiming that it exists now.

## CLI and example

```text
npm run scan -- https://example.com --lawwatch
npm run scan -- https://example.com --no-pdf-extraction
npm run lawwatch -- <scan-id>
npm run history -- https://example.com
npm run compare -- https://example.com
npm run export-scan -- <scan-id> --output exported-scan.json
npm run validate:pdf
```

`--no-pdf-extraction` keeps document discovery/status metadata without PDF downloads. Ordinary scans also extract PDFs; only LawWatch applies industry-specific rules. Example local fixture output:

```text
PASS — Detected / Confirmed  VAT treatment of fees
  Supporting public website evidence was located.
  https://example.com/fees.pdf
  PDF: Residential conveyancing fees, page 1 — https://example.com/fees.pdf

PDF EXTRACTION
Discovered: 1 | Attempted: 1 | Extracted: 1 | Skipped: 0 | No text: 0 | Failures: 0
Downloaded: 1559 bytes
```

The local fixture gives conveyancing pricing-content results while probate content and location checks remain uncertain. Reports retain the statement: “This report identifies public website signals only and does not certify regulatory compliance.”

## M6 versus M7 benchmark

The baseline is **docs/MILESTONE_6_BENCHMARK.md**, not invented replacement figures. All 50 firms/850 static checks were re-evaluated using frozen M6 HTML observations and only PDF URLs already discovered during M6. Those PDFs were downloaded sequentially with the same network policy, one-second pacing and fixed PDF budgets. No benchmark evidence URL was used to seed discovery. This is a paired PDF-enrichment experiment, **not a fresh 50-firm HTML recrawl**. HTML observation times and PDF fetch times are recorded separately. Final rule hardening was replayed offline against the captured PDFs, avoiding repeated website downloads.

`reports/milestone7/final/` contains the final source/workbook manifest, 50 report/evaluation pairs and aggregate/per-rule/per-service metrics. Earlier experiment directories remain separate. The evaluator refuses mixed-source resumes and never migrates/writes the read-only M6 database. Commands require explicit firm selection or `--all`:

```text
npm run evaluate:milestone7 -- --firm "Kitson Boyce" --output reports/milestone7/experiment
npm run evaluate:milestone7 -- --all --reuse-pdf reports/milestone7/paired --output reports/milestone7/final
```

| Measure | M6 | M7 paired |
|---|---:|---:|
| Eligible static checks | 850 | 850 |
| PASS | 229 | 233 |
| WARNING | 54 | 53 |
| UNKNOWN | 567 | 564 |
| Exact agreement | 132/437 (30.21%) | 132/437 (30.21%) |
| Acceptable agreement | 448/850 (52.71%) | 444/850 (52.24%) |
| Human-confirmed PASS fraction | 132/229 (57.64%) | 132/233 (56.65%) |
| UNKNOWN rate | 66.71% | 66.35% |
| LawWatch POTENTIAL_ISSUE predictions | 0 | 0 |
| Confirmed serious/high-severity issue false positives | 0 | 0 |
| Live serious-finding precision | Unavailable / UNPROVEN | Unavailable / UNPROVEN |

The mapping is unchanged: human Review is excluded from exact agreement; Review with WARNING/UNKNOWN is acceptable; human Pass with UNKNOWN is not agreement. A PASS against Review is unconfirmed, not automatically false. WARNING precision is unavailable. The four additional PASS results all meet human Review labels, so acceptable agreement falls 0.47 percentage points and the human-confirmed PASS fraction falls 0.99 points. These declines are retained and investigated, not relabelled away. UNKNOWN falls by three checks (0.53% relative), a modest benefit.

| Changed benchmark check | Before → after | PDF evidence inspected |
|---|---|---|
| Kitson Boyce, LAW-U001 | UNKNOWN → PASS | Buying-a-property PDF, page 1: own-firm SRA number 517529 |
| Wolferstans, LAW-U005 | UNKNOWN → PASS | Complaints procedure, page 1: explicit Legal Ombudsman reference |
| GA Solicitors, LAW-U008 | WARNING → PASS | Complaints document, page 3: SRA conduct/reporting route |
| Trethowans, LAW-U005 | UNKNOWN → PASS | Client complaint procedure, page 2: explicit Legal Ombudsman referral |

All four were inspected as supported limited observations. `docs/Validation/milestone7/pdf-evidence-review.json` records URLs, hashes, pages and snippets. This is **Codex engineering evidence inspection**, not independent human adjudication or new legal ground truth. Original workbook labels remain unchanged. No unexplained high-severity issue regression was observed. Broader service-level outputs also expose useful probate/remortgage fees at Kitson Boyce, immigration hourly rates at Stephens Scown, and debt-recovery/immigration pricing at Shakespeare Martineau; those outputs must not be pooled with the benchmark's 850 selected checks. Shakespeare's 2018 wording is informational, not a claim that rates are invalid.

Across the full rule/service output, 49 statuses change. Two pricing-location PASS results become UNKNOWN: Tilly Bailey & Irvine's linked probate PDF is a personnel table rather than a pricing guide; Stephens Scown's residential-property PDF combines conveyancing and remortgage, so the deliberately conservative mixed-service policy withholds a high-confidence pricing location. The second is a known recall cost despite clearly relevant document presence, and is nominated for section-level hardening. Neither changes the selected 850-check aggregate. No existing pricing-content PASS is lost. Other UNKNOWN-to-WARNING changes expose partial HTML evidence after an unrelated document is removed from the pricing inventory; they do not establish missing information.

### PDF processing totals

216 PDF URL candidates; 186 selected attempts; 160 extracted; 40 policy-blocked; 11 NO_TEXT; three ENCRYPTED; two DOWNLOAD_FAILED. Total bytes across 50 firms: 119,367,177. No individual scan exceeded its document-count allowance; the largest candidate set was 24. External CDN and regulator URLs account for some blocked evidence. The parser does not bypass those boundaries to improve coverage.

### Fresh end-to-end subset

Kitson Boyce, Wolferstans and Hethertons also received fresh normal LawWatch scans on 13 September, using 20 normal + 40 regulatory + five staff page budgets, one-second pacing and zero historical rechecks. Captures are in `reports/lawwatch-evaluation/2026-09-13T21-04-02-319Z/`. Final rules were replayed offline into `reports/milestone7/fresh-final/`, preserving the captured database. These fresh observations are reported separately from the paired 850-check comparison.

| Firm | HTML scanned / failed | PDFs discovered / extracted | PDF bytes | Exact agreement | Human-confirmed PASS | UNKNOWN |
|---|---:|---:|---:|---:|---:|---:|
| Kitson Boyce | 39 / 1 | 11 / 9 | 3,859,535 | 1/8 | 1/3 | 14/17 |
| Wolferstans | 50 / 0 | 5 / 5 | 496,468 | 11/14 | 11/12 | 1/17 |
| Hethertons | 61 / 0 | 5 / 3 | 2,786,745 | 2/12 | 2/3 | 13/17 |

All three discovered sitemaps. Kitson had two NO_TEXT PDFs; Hethertons had one NO_TEXT and one policy-blocked PDF. No LawWatch potential issues were emitted. Page-discovery counts exceed scan budgets by design; unvisited pages are not successful scans.

### Serious-finding gate

The same 14 M6 controlled removal cases produce four true positive issues, zero false positives and zero false negatives: 100% precision/recall on that narrow set. This retains M6's accepted internal-use gate and does not establish a 95% live/customer precision guarantee. The human workbook contains no Fail cases and neither live run emits serious issues, so live precision remains UNPROVEN. The M6 known staff/service and entity-context limitations remain; M7 does not justify commercial assurance or automated alerts.

## Verification

The pre-change 432-test baseline and build passed. **All 498 tests pass across 21 files: the existing 432 plus 66 new tests.** Type checking and build pass. Dependency audit reports **zero vulnerabilities**. The local PDF scenario passes and all 14 controlled negative cases retain their expected results. Strict JSON-schema validation passes for **104 reports** (50 preserved M6, 50 final M7 paired, three fresh-capture replays and one local PDF fixture). Generated finding titles/explanations pass the prohibited-legal-conclusion check; quoted source text is kept distinct. No serious LawWatch or Universal finding was emitted in the final paired/fresh reports. Git whitespace checks pass; no lint command is configured.

Final production-source/package-lock manifest SHA-256: `0229a36f5cb0f492374f7f17ea352adac39688cc367e720d8e135465ced35523`. Existing tests were retained: tests specifically asserting no PDF downloads now exercise the explicit disable option; exact pack-version assertions advance to 1.3; the synthetic pre-M2 migration fixture removes M7 fields/table to represent a genuine old database. No behavioral assertion was deleted to conceal a failure.

New tests cover deterministic multipage extraction, whitespace, no-text, encryption, corrupt/fake/oversized documents, all failure statuses, URL/content deduplication and referrers, MIME/extensionless cases, byte/count/page limits, robots/SSRF/redirect/private-network/slow-response protections, escaped non-DOM text, service isolation, staff scope, PDF eligibility, provenance, immutable SQLite migration/persistence, old HTML-only behavior, CLI export/disable and native-canvas independence. No automatic tests crawl live firms.

The human workbook SHA-256 remains `beafdde971fa122e4200a55863f7ff60ccd891640f81457dc1978eea27d7c4aa`. No workbook edit, export or recalculation was performed. Full experimental reports/text remain in ignored reports directories; selected review metadata is separate and versionable.

## Limitations and recommended Milestone 8

Image-only/scanned PDFs remain unresolved without OCR. Encrypted files are not decrypted. Complex reading order, multicolumn tables, unusual encodings and cross-page clauses can reduce recall. A text layer is not proof of correct visual interpretation. Mixed-service documents deliberately abstain from pricing. External CDNs and inaccessible downloads remain outside scope. PDF content does not establish HTML prominence, badge operation or calculator output. Existing pattern and service-mapping limitations require operator review.

Recommended M8: **independent service-level evidence adjudication and PDF context/reading-order hardening**, including the remaining M6 false-PASS cases and broader serious-finding controls. PDF enrichment changed only four selected benchmark outcomes despite 160 extracted locations; adding a larger execution surface should not precede precision validation. A later, separately approved small browser-discovery pilot could target measured JavaScript/calculator unknowns, with its own network/resource and evidence-quality gates. Do not infer that OCR, browser execution or SaaS launch has been approved or implemented.
