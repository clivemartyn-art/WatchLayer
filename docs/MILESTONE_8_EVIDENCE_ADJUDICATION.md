# Milestone 8: evidence adjudication and PDF context hardening

Implemented 14 September 2026. M7 was validated with 498 passing tests, committed as `e3de000` and pushed to main before M8 began. The M7 parser, safe-fetch transport, discovery budgets, migration 5 and extraction format remain intact. No browser execution, Playwright, OCR, AI, dashboard or SaaS functionality was added.

## Scope and readiness

M8 separates extracted candidates from deterministic evidence-support assessments and supplies a workflow for independently supplied human decisions. **No independent human decisions were supplied during this milestone.** Automated assessments are not labelled independent adjudication. The completed implementation is suitable for continued internal, operator-reviewed evaluation; live serious-finding precision and customer readiness remain unproven.

The 50-firm replay preserves all 850 selected M7 benchmark outcomes. In the broader rule/service output, three PASS and four WARNING results become UNKNOWN because the selected PDF evidence has insufficient contextual support. Those changes are reported rather than hidden by the unchanged aggregate.

## Architecture and files

`src/lawwatch/adjudication/` introduces four separate concerns:

- `context.ts` locates extracted snippets in retained normalized PDF pages and supplies bounded surrounding text and document service context.
- `policy.ts` decides whether a candidate supports its rule, independently of extraction.
- `index.ts` creates an immutable assessment record and a separate filtered view for rule execution. Raw stored facts are never changed.
- `types.ts` and `schema.ts` define the assessment states, provenance, context and additive report schema.

`evaluate.ts` applies this gate before rules consume PDF facts. `report.ts` displays a separate EVIDENCE ADJUDICATION section and per-rule PDF assessment states. `types.ts`, `report-schema.ts` and the published JSON schema expose optional assessment data. `pack.ts` advances exact LawWatch rule/pack versions to **1.4**. Extraction facts remain **1.3** because extraction did not change; the adjudication policy is separately versioned **1.0**. Universal remains 1.0. Historical reports remain immutable. No migration or new dependency is needed: the existing immutable rule-run/report storage retains the additive assessment data.

New development tools are `evaluate-milestone8.ts`, `evaluate-milestone8-subset.ts`, `milestone8-review.ts` and `review-milestone8.ts`. Two focused test files cover policy and integration. README, package scripts and exact-version assertions are updated.

## Extraction versus support

Extraction answers what matching text was found. The assessment answers whether that specific candidate, on its verified page and within its service/document context, supports the rule. It does not reinterpret the entire document semantically or certify regulatory compliance.

| State | Meaning | Rule-support effect |
|---|---|---|
| SUPPORTED | Located evidence and deterministic context support the limited observation | Candidate remains eligible; existing rule/applicability checks still apply |
| PARTIALLY_SUPPORTED | Partial extraction or insufficiently specific relationship | Retained for review; cannot promote a result |
| AMBIGUOUS | Mixed service, third-party/example context or unscoped repeated boilerplate | Retained for review; withheld |
| NOT_RELEVANT | Wrong service, unsuitable document purpose or unrelated monetary/regulatory reference | Retained for review; withheld |
| INSUFFICIENT_CONTEXT | Missing source, hash/page mismatch, unlocatable snippet or insufficient surrounding context | Retained for review; withheld |

Partial support deliberately does not generate WARNING by itself. Equivalent supported HTML or PDF evidence may still support the result. A supported evidence item is not necessarily a PASS: applicability, rule policy and other existing protections still apply. Conversely, a rejected item is not proof the firm's information is absent or wrong.

Each assessment has a deterministic ID derived from document identity/hash, page, rule, service and extracted match. It retains the original method, snippet, value and confidence, PDF URL/title/page/hash/referrers, bounded context, offsets, location method, service candidates, repetition count, state and reason. Identical corpus and policy produce identical assessments. Rule-run IDs remain distinct immutable execution identities.

## Context and service protections

The source must match an EXTRACTED document, its SHA-256, final URL and actual page number. Context is at most **1,200 normalized characters**, usually the snippet plus up to 350 characters on each side. Offsets refer to the whitespace-normalized page text retained by the context layer. Document normalization and service analysis are prepared once per assessment run, avoiding repeated whole-document service parsing.

Ordinary snippets must match exactly. The existing complaints-procedure detector concatenates contact/process sentences; for that named method, every selected clause is verified on the same page. The window retains intervening text and records `verified-clauses`. It never combines evidence across pages or invents missing words. Each relevant page can independently contribute support.

Pricing/drift support requires one identifiable document service; mixed-service PDFs remain conservative and do not receive a guessed section model. Local contradictory service references are ambiguous. Document evidence cannot be assigned to another target service. Repeated statements without local service wording cannot establish pricing support merely by appearing on multiple pages. Repeated evidence with explicit local service context may remain eligible; duplication never increases confidence.

Newsletter, case-study, impact-report, survey and privacy/data-protection identities are inappropriate for these current regulatory/pricing observations. Hypothetical, illustrative and third-party contexts are withheld. SRA number support requires an own-firm relationship and regulation/authorisation wording or an explicit “our SRA number” statement. Generic SRA references alone cannot qualify. Client complaints facts require an identifiable complaints/client-care/terms/regulatory document and a client-facing complaint relationship. Universal site-level regulatory rules are not silently converted into service-specific certifications.

VAT mentions concerning an isolated transfer fee or a mixed fees/disbursements heading do not automatically establish legal-fee VAT treatment. Explicit average/estimated/typical charges remain eligible. Property valuations cannot substitute for legal fees. A process mention without a clear stage sequence, or a payment deadline standing in for a service duration, remains partial. These are deterministic safeguards, not full linguistic or layout interpretation.

HTML extraction and its prior rule semantics remain unchanged. PDF DOM/navigation/badge restrictions remain M7's responsibility. The new gate does not introduce PDF removal alerts. When it withholds positive evidence, an extracted replacement surface still protects against a new serious removal conclusion. A focused two-scan regression verifies that rejected replacement-PDF support cannot manufacture a LAW-C002 issue.

## Reports and independent review workflow

Existing report schema 1 gains optional `adjudication` with its own schemaVersion 1 and policyVersion 1.0. No existing required field changes meaning. M6/M7 reports remain accepted by the strict schema. Normal scans automatically assess PDF candidates; offline `lawwatch <scan-id>` uses retained evidence and saves a new immutable report. JSON keeps raw extraction and assessments separate. Terminal reports show extraction counts separately from support counts and clearly label the mode deterministic.

```text
npm run evaluate:milestone8 -- --all --output reports/milestone8/new-experiment
npm run review:milestone8 -- reports/milestone8/release/review-queue.json human-decisions.json reports/milestone8/human-review.json
```

The queue includes every assessed candidate and its context, including withheld items. Human decisions are supplied as a separate JSON array with `itemId`, one of the five states, `reviewer`, `reviewerKind: "human"`, `reviewedAt` and `reason`. Unknown/duplicate IDs or missing attribution are rejected. The review tool writes a new output file and refuses to overwrite either input or an existing output. It never edits the workbook, machine report, raw fact set or rule result. Item IDs bind decisions to particular document bytes and evidence; the queue manifest identifies the policy/source experiment.

The tool records reviewer attribution but cannot verify identity, professional competence or independence. Independent human review count is **zero**, not 1,994. No synthetic fixture reviewer is counted as a real reviewer. A separate human process must supply and verify those decisions before any claim of independent adjudication.

## Full benchmark method and results

The full evaluation reads the immutable M6 SQLite corpus and M7 final PDF extraction reports. It uses the unchanged M7 adapter to reconstruct PDF candidate facts and applies M8 policy. No website requests, parser reruns, workbook changes or benchmark source-URL seeding occur. The output requires a new directory; previous experiments are not overwritten. All 50 firms, including those with no usable PDF facts, remain in the denominator.

Final artifacts are under `reports/milestone8/release/`: source/corpus/workbook manifest, 50 reports and evaluations, per-rule/service aggregates, review queue, delta list and controlled-negative results. The versionable compact summary is `docs/Validation/milestone8/benchmark-summary.json`. Full source texts/reports stay in ignored local reports directories.

| Measure | M6 | M7 | M8 |
|---|---:|---:|---:|
| Eligible selected checks | 850 | 850 | 850 |
| PASS | 229 | 233 | 233 |
| WARNING | 54 | 53 | 53 |
| UNKNOWN | 567 | 564 | 564 |
| UNKNOWN rate | 66.71% | 66.35% | 66.35% |
| Exact agreement | 132/437 (30.21%) | 132/437 (30.21%) | 132/437 (30.21%) |
| Acceptable agreement | 448/850 (52.71%) | 444/850 (52.24%) | 444/850 (52.24%) |
| Human-confirmed PASS fraction | 132/229 (57.64%) | 132/233 (56.65%) | 132/233 (56.65%) |
| LawWatch serious predictions | 0 | 0 | 0 |
| Confirmed high-severity issue false positives | 0 | 0 | 0 |
| Live serious-finding precision | Unproven | Unproven | Unproven |

The mapping is unchanged: human Review has no exact machine-state mapping, is excluded from exact agreement and is compatible with UNKNOWN/WARNING for acceptable agreement. A PASS against Review is unconfirmed, not automatically false. Human Pass against UNKNOWN is not agreement. The workbook has no Fail labels and the cohort emits no serious issues, so it cannot demonstrate live serious-finding precision. M8 does not claim a headline precision improvement from unchanged metrics.

### Assessed PDF candidates

| Assessment | Count |
|---|---:|
| SUPPORTED | 229 |
| PARTIALLY_SUPPORTED | 315 |
| AMBIGUOUS | 1,241 |
| NOT_RELEVANT | 155 |
| INSUFFICIENT_CONTEXT | 54 |
| Total | **1,994** |
| Ambiguous or not relevant | **1,396** |

Items are rule/page/service candidate matches, not independent documents, firms or human verdicts. Multiple rules can inspect the same text. Many mixed-service or partial candidates were already unusable under M7's applicability policy. Therefore 1,396 withheld candidates do **not** mean 1,396 newly prevented false PASS results. M8 makes the reasoning explicit and auditable.

### Changed broader results and recall costs

Seven rule/service statuses change outside the selected benchmark aggregate:

- Kitson Boyce remortgage PRICE-008 and PRICE-009: PASS → UNKNOWN. Selected matches concerned an electronic-transfer fee or a mixed fees/disbursements VAT heading, insufficient to establish the requested legal-fee relationship. Its explicit average probate charge plus VAT remains supported.
- Wolferstans and Trethowans LAW-U006/LAW-U007: WARNING → UNKNOWN. Partial Legal Ombudsman matches remain visible in the review queue but do not promote contact/timing conclusions.
- Shakespeare Martineau immigration PRICE-013: PASS → UNKNOWN. The selected process/timescale sentence lacks an explicit sequence. Other document text may describe the work, so this is a conservative recall cost requiring reviewer/section-level follow-up, not proof the firm lacks stages.

All four M7 gains in selected SRA/Legal Ombudsman/SRA-conduct checks remain. The full fixture suite retains the strong, properly scoped M7 pricing and complaints examples. No new serious finding appears in the paired corpus. No claim is made that every remaining PASS is correct; M6's unresolved entity/staff/service cases still require independent review.

### Serious-finding controls

The same 14 M6 controlled cases yield four true positives, zero false positives and zero false negatives: **100% precision/recall on that narrow removal set**. This preserves the M6 internal-use gate, not a 95% live launch guarantee. The extra replacement-PDF integration test specifically covers withholding support without inventing a serious removal issue. Controlled fixtures are never pooled into live human benchmark metrics.

### Separate retained fresh subset

The three fresh M7 scans captured on 13 September were replayed offline under M8 into `reports/milestone8/release-subset/`. They are **not fresh M8 live validation**; no new live crawl was run. The stored database remains read-only.

| Firm | Exact agreement | Human-confirmed PASS | UNKNOWN | Assessed PDF candidates |
|---|---:|---:|---:|---:|
| Kitson Boyce | 1/8 | 1/3 | 14/17 | 132 |
| Wolferstans | 11/14 | 11/12 | 1/17 | 47 |
| Hethertons | 2/12 | 2/3 | 13/17 | 15 |

These selected metrics are unchanged. All three retain zero LawWatch serious predictions. Do not combine this different HTML capture with the paired 850-check results or treat repeated evidence as new validation.

## Validation and integrity

All **540 tests pass across 23 files**, retaining M7's 498 and adding 42 focused tests. Type checking and build pass. Dependency audit reports **zero vulnerabilities**; no dependency was added. The full suite was run with two workers to avoid transient parser/SQLite timeout contention. Existing CLI timeouts and behavioral assertions were not weakened. Only exact pack/rule-version expectations advance to 1.4; extraction-version assertions remain 1.3.

Focused tests cover mixed-service documents, generic complaints, irrelevant SRA documents, own-firm attribution, repeated boilerplate, wrong-service/property-value pricing, partial/ambiguous/missing context, hash/URL/page mismatches, multiple relevant pages, same-page clause location, cross-page protection, independent assessment determinism, raw-fact/report persistence, human-decision validation and serious replacement safeguards.

Strict JSON-schema validation passes for **153 reports**: 50 preserved M6, 50 preserved M7, 50 final M8 and three retained-subset replays. Generated finding wording is checked for prohibited legal conclusions during full evaluation. Extracted source wording remains quoted evidence, not product conclusions. No lint script is configured.

Final production-source/package-lock SHA-256: `e504905513499465b8cc4cb35643410480bd28c5146457d6ebe9ff55feb387ed`. Workbook SHA-256 remains `beafdde971fa122e4200a55863f7ff60ccd891640f81457dc1978eea27d7c4aa`. M6/M7 benchmark documents, reports and the workbook were not rewritten. Review decisions are separate, and historical runs remain immutable.

## Limitations and recommended M9

The adjudicator is deterministic pattern logic, not semantic understanding or independent human judgment. Document-wide service classification can be over-conservative; it does not reconstruct PDF columns, tables, headings or mixed-service sections. Context is bounded and can omit distant qualifications or exceptions. Own-firm attribution, negation and legal-fee relationships are not universally resolved. The gate focuses on PDF candidates; existing HTML false-PASS limitations remain. Scanned/encrypted/unreadable PDFs, browser content and calculators retain M7 limitations.

Recommended M9: **independent human adjudication of the prepared queue and targeted service-level evidence corrections**. Prioritize customer-facing HIGH findings, the seven changed results, surviving M6 scope/entity cases and a balanced sample of supported/rejected PDF candidates. Establish reviewer-attributed service-level labels, examine disagreement and recall costs, and broaden serious-finding controls before considering browser discovery or customer automation. M9 has not been started.
