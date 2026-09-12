# REGSTEAD PRODUCT BRIEF

**Document status:** Active product source of truth  
**Version:** 1.0  
**Last updated:** 12 September 2026  
**Public brand:** Regstead  
**Internal engine / repository name:** WatchLayer  
**Initial vertical:** UK law firms regulated by the Solicitors Regulation Authority (SRA)

---

## 1. Purpose of this document

This document is the single product brief for Regstead.

It should be read by Codex before work that affects:
- product behaviour
- customer-facing terminology
- rule-engine behaviour
- reporting
- dashboard/UI design
- onboarding
- alerts
- pricing or plan logic
- branding
- public website copy
- future SaaS architecture

It is intended to prevent the product from drifting away from its core purpose while the underlying WatchLayer engine evolves.

**Important:** This file does not replace milestone specifications or technical implementation documents. Where a milestone document is more specific about implementation, follow that milestone document. Where there is a conflict on product intent, this document is the product-level source of truth.

---

# 2. Product in one sentence

**Regstead continuously monitors important public website information for regulated organisations and tells them when something meaningful disappears, breaks, changes or becomes uncertain.**

---

# 3. Core proposition

Most website audits inspect a site once.

Regstead remembers what was there before.

The core value proposition is:

> **Your website changes. Regstead notices.**

Supporting proposition:

> **Most scanners inspect once. Regstead remembers.**

Primary tagline:

> **Monitor what matters.**

Brand promise:

> **Know when something important changes.**

---

# 4. What Regstead is

Regstead is a recurring website-monitoring product for regulated organisations.

It:
1. scans a public website;
2. identifies important pages, documents, forms, pricing information and regulatory signals;
3. records a structured baseline;
4. compares future scans with previous observations;
5. evaluates deterministic rules;
6. produces evidence-backed findings;
7. alerts the customer when something meaningful changes or requires review.

Core lifecycle:

**Crawl → Extract → Snapshot → Compare → Rules → Findings → Alert**

Regstead is not simply a broken-link checker, SEO tool, generic website monitor or one-off compliance scanner.

Its distinctive value is **memory + regulatory context + conservative evidence-backed change detection**.

---

# 5. What Regstead is not

Regstead must not present itself as:

- a legal adviser;
- a law firm;
- a compliance certification service;
- a guarantee of regulatory compliance;
- an automated regulator;
- a substitute for human professional judgement;
- an aggressive “gotcha” compliance checker;
- a security scanner;
- an SEO platform;
- a website-management plugin.

Never state that Regstead has “proved” a firm compliant or non-compliant unless a future product specification explicitly introduces a professionally reviewed certification product.

---

# 6. Public brand vs internal engine

## Public brand

**Regstead**

Customer-facing product names:

- **Regstead Scan** — one-off / free website scan
- **Regstead Monitor** — recurring monitoring subscription
- **Regstead Alerts** — alerts arising from monitored findings or changes
- **Regulatory Surface** — structured map of where important regulatory information lives
- **Change History** — evidence-backed history of meaningful observed changes

Initial public vertical:

- **Regstead for Law Firms**

Potential future verticals:

- Regstead for Estate Agents
- Regstead for Funeral Directors
- Regstead for Councils
- other regulated sectors

## Internal technical name

The repository, codebase, database and engine remain named **WatchLayer** for now.

Do not rename:
- repository paths
- package names
- database paths
- internal namespaces
- command names
- historical milestone documentation

unless a dedicated rename milestone explicitly instructs this.

Customers do not need to know that WatchLayer exists.

---

# 7. Initial market

The first commercial market is:

**SRA-regulated law firms in England and Wales**

Initial ideal customer profile:

- approximately 1–10 offices;
- independent or regional law firm;
- public website is operationally important;
- provides one or more services covered by SRA Transparency Rules;
- commonly offers conveyancing, probate/private client, employment, immigration, motoring, licensing or debt recovery;
- does not have a large internal digital/compliance engineering team;
- can make purchasing decisions without enterprise procurement.

Initial sales motion:

- scan the firm's website;
- identify a truthful useful observation or monitoring surface;
- provide a baseline report;
- invite the firm to become a founding customer.

Never manufacture a “problem” to make outreach more compelling.

---

# 8. Product philosophy

Regstead must be conservative.

The core principles are:

## 8.1 Evidence before assumption

Only state what the available evidence supports.

Prefer:

> “We could not confirm this during the latest scan.”

over:

> “This is missing.”

unless disappearance or failure has actually been confirmed.

## 8.2 NOT OBSERVED does not mean REMOVED

A page or signal not observed during a crawl may be:
- outside the crawl budget;
- JavaScript-rendered;
- linked differently;
- temporarily unavailable;
- hidden behind a document or navigation path;
- undiscovered.

Do not equate non-observation with confirmed removal.

## 8.3 False positives are worse than uncertainty

Where evidence is insufficient, return UNKNOWN or review status.

Do not force certainty merely to produce more findings.

## 8.4 Better alerts, not more alerts

Regstead should avoid alert fatigue.

Routine website noise should not become a customer-facing alert unless it materially affects a monitored surface.

## 8.5 Deterministic first

Core findings should be based on reproducible, explainable logic.

AI may be introduced later for bounded interpretation or summarisation, but deterministic evidence and rules remain the foundation.

## 8.6 Human judgement remains important

Some findings require professional interpretation.

Regstead surfaces evidence and review points; it does not replace legal/compliance judgement.

---

# 9. Finding model

Current finding states:

- **PASS**
- **WARNING**
- **POTENTIAL_ISSUE**
- **UNKNOWN**
- **NOT_APPLICABLE**

These are product semantics, not merely implementation enums.

Customer-facing wording should be calmer where useful:

| Internal status | Typical customer wording |
|---|---|
| PASS | Detected / Confirmed |
| WARNING | Review recommended |
| POTENTIAL_ISSUE | Potential issue / Action recommended |
| UNKNOWN | Could not confirm |
| NOT_APPLICABLE | Not applicable |

A POTENTIAL_ISSUE should require strong evidence.

UNKNOWN is a legitimate result, not a failure of the product.

---

# 10. Unknown-reason taxonomy

Milestone 5 introduces or hardens explicit UNKNOWN reasons.

Use these where applicable:

- `PAGE_NOT_DISCOVERED`
- `DOCUMENT_CONTENT_UNAVAILABLE`
- `BROWSER_REQUIRED`
- `DETECTOR_INSUFFICIENT`
- `SERVICE_APPLICABILITY_UNCERTAIN`
- `STAFF_INFORMATION_NOT_DISCOVERED`
- `CRAWL_BUDGET_EXHAUSTED`
- `NETWORK_FAILURE`
- `AMBIGUOUS_EVIDENCE`

Customer-facing reporting should translate these into understandable language rather than exposing raw internal codes.

Example:

> “Could not confirm — the relevant information may be contained in a document Regstead could identify but could not yet analyse.”

---

# 11. Law-firm monitoring scope

The LawWatch/Regstead for Law Firms rule pack monitors public website signals associated with the SRA Transparency Rules.

## Universal regulatory surfaces

Examples include:

- SRA number
- SRA digital badge
- complaints procedure
- Legal Ombudsman information
- how a complaint may be made to the Legal Ombudsman
- timing information for referral to the Legal Ombudsman
- SRA complaints/conduct information
- how and when matters may be raised with the SRA
- accessibility/prominence of regulatory information

## Relevant service categories

Current service applicability model covers:

### Consumer services
- residential conveyancing
- remortgage
- probate
- immigration
- immigration appeals
- summary motoring offences
- employee unfair or wrongful dismissal

### Business services
- employer defence of employment claims
- debt recovery up to £100,000
- business premises licensing

Applicability must be evidence-based.

Do not apply a service-specific pricing rule merely because a vague term appears somewhere on the site.

---

# 12. Pricing transparency monitoring

Pricing rules may inspect signals including:

- cost or range of costs;
- charging basis;
- hourly or fixed-fee basis;
- staff experience and qualifications;
- supervisor experience and qualifications;
- likely disbursements;
- disbursement costs/ranges;
- VAT wording for fees;
- VAT wording for disbursements;
- included services;
- exclusions;
- key stages;
- likely timescales;
- conditional-fee or damages-based arrangements where relevant;
- prominence/accessibility;
- association between the price information and the relevant service;
- disappearance of pricing surfaces;
- confirmed 404/410;
- material content change.

A PDF being discovered does not mean its contents have been read.

Until PDF content parsing is explicitly implemented, document-level content rules may legitimately return UNKNOWN.

---

# 13. Regulatory Surface

A core Regstead concept is the **Regulatory Surface**.

For each monitored organisation, Regstead should identify where important public information lives.

This may include:

- main regulatory/legal page;
- complaints page;
- footer;
- service pricing pages;
- pricing hub;
- PDFs;
- quote calculators;
- forms;
- team/staff pages;
- office pages;
- external regulatory links;
- SRA numbers;
- SRA badge location.

A site may have:
- multiple pricing pages;
- multiple office pages;
- multiple SRA numbers;
- multiple trading names;
- documents plus HTML;
- quote calculators as well as static information.

The system should model this complexity instead of assuming one canonical page.

---

# 14. Change detection

The recurring product is based on comparing observations over time.

Important change types include:

- new page;
- page removed with strong confirmation;
- confirmed 404/410;
- document added;
- document removed;
- form changed;
- material pricing content change;
- monitored content materially changed;
- regulatory signal added;
- regulatory signal no longer confirmed;
- SRA number change;
- complaints information change;
- monitored page moved;
- technical failure.

Regstead should distinguish:

**NEW**

**CHANGED**

**CONFIRMED PROBLEM**

**REMOVED**

**NOT OBSERVED**

Do not collapse these into one generic “change” status.

---

# 15. Technical architecture — current state

The internal engine is implemented as a TypeScript / Node CLI application.

Current project location:

`C:\Users\clive\OneDrive\Documents\WatchLayer`

Core architecture:

**Crawler → Structured extraction → SQLite persistence → Comparison → Rule engine → LawWatch rule pack → Benchmarking**

SQLite data lives under:

`.watchlayer/watchlayer.db`

This database should remain Git-ignored.

---

# 16. Completed technical milestones

## Milestone 1 — crawler

Completed.

Capabilities include:

- URL validation and normalisation;
- same-domain crawl;
- robots/sitemap handling;
- page limit;
- deduplication;
- tracking parameter handling;
- HTTP status;
- title;
- meta description;
- canonical;
- robots;
- H1;
- text/word count;
- links;
- documents;
- forms;
- contacts;
- response time;
- browser-render flag;
- terminal + JSON output;
- SSRF safeguards.

Important conservative behaviour:

Only confirmed 404/410 results are treated as confirmed broken pages.

## Milestone 2 — persistence and change detection

Completed.

SQLite stores immutable scan history.

Commands include:

```bash
npm run scan -- URL
npm run scan -- URL --compare
npm run compare -- URL
npm run history -- URL
npm run export-scan -- <scan-id> --output exported-scan.json
```

`--no-persist` remains available for non-persistent scanning.

## Milestone 3 — generic rule engine

Completed.

Includes:

- configurable rule packs;
- deterministic rules;
- structured evidence;
- immutable rule definitions/versions;
- findings;
- CLI reporting;
- persisted rule runs/results.

Universal pack:

`watchlayer-universal` v1.0

## Milestone 4 — law-firm rule pack

Completed.

Pack:

`lawwatch-england-wales` v1.0

Includes:

- 34 rules;
- service applicability;
- Regulatory Surface inventory;
- pricing/service association;
- SRA signals;
- complaints information;
- benchmark tooling;
- human-review distinction;
- conservative UNKNOWN behaviour.

At Milestone 4 completion:
- 308 tests passed;
- typecheck passed;
- build passed;
- audit clean.

---

# 17. Milestone 5 — current work

**Milestone 5 is currently in progress.**

Codex is working through:

**LawWatch Accuracy & Benchmark Hardening**

The objective is not to create more aggressive rules.

The objective is to improve **discovery and evidence acquisition** so that valid information is found more reliably while false positives remain very low.

Key Milestone 5 themes include:

- preserve baseline benchmark results;
- responsibly run the 50-firm cohort;
- targeted LawWatch-specific discovery;
- configurable evidence budget;
- URL scoring and prioritisation;
- header/footer/link context;
- pricing hub recognition;
- document discovery and association;
- bounded team/staff discovery;
- stronger service-to-pricing association;
- stronger complaints discovery;
- more SRA-number formats;
- static badge discovery;
- explicit UNKNOWN reasons;
- exact and acceptable benchmark agreement;
- high-severity POTENTIAL_ISSUE precision target >=95%, preferably 100%;
- measurable reduction in UNKNOWN results;
- regression fixtures based on real website architectures;
- responsible live evaluation with pacing/cache/resume;
- no firm-specific hacks;
- no phrase overfitting;
- stale-content detection for old pricing context;
- no AI;
- no browser execution;
- no PDF parsing unless separately approved.

Expected completion document:

`docs/MILESTONE_5_BENCHMARK.md`

Do not overwrite or restart Milestone 5 work merely because this brief was introduced.

---

# 18. Validation benchmark

Primary validation workbook:

`docs/validation/LawWatch_Validation_Cohort_v2.xlsx`

The benchmark contains:

- 50 real UK law firms;
- mixed firm sizes;
- HTML pricing;
- PDF pricing;
- quote calculators;
- multi-office firms;
- legacy websites;
- modern sites;
- 17 core static website benchmark rules;
- human benchmark classifications.

The workbook is a validation asset.

Do not modify it unless a specific benchmark-maintenance task explicitly requires changes.

Preserve its integrity/checksum where milestone instructions require it.

---

# 19. Commercial model — current assumptions

These are launch hypotheses, not permanent pricing commitments.

## Free

**Regstead Scan**

Current concept:

- one-off public website scan;
- headline website health;
- selected regulatory signals;
- limited report;
- email capture for fuller report.

## Founding Monitor

Current launch hypothesis:

**£9.95/month**

For the first 25 participating organisations.

Current proposed inclusions:

- one primary website/domain;
- recurring monitoring;
- baseline Regulatory Surface;
- structured change detection;
- page/document/form monitoring;
- full reports;
- change history;
- alerts when enabled;
- feedback participation during beta.

Current beta assumption:

- approximately weekly monitoring during founding release.

Founding price is intended to remain locked while the customer's subscription remains continuously active, subject to final commercial/legal terms.

## Standard Monitor

Current hypothesis:

**£19/month**

Not yet final.

## Future higher tier

Possible:

**£39/month**

May later include more frequent monitoring, multiple domains, richer alerts, integrations or advanced reporting.

Do not hard-code these future tiers into the product unless a milestone explicitly instructs it.

---

# 20. Customer report design

Reports should prioritise clarity over technical detail.

Typical report sections:

1. Website Health
2. Key findings
3. Regulatory Surface
4. Pricing & Service indicators
5. Complaints & Regulatory
6. Technical monitoring
7. Enquiry journey
8. Changes since last scan
9. Scan history
10. Recommended review actions
11. Disclaimer

The sample report uses a fictional law firm.

A customer-facing report should never imply that an UNKNOWN result is a compliance breach.

---

# 21. Dashboard information architecture

The eventual customer dashboard should remain simple.

Current preferred top-level sections:

- **Overview**
- **Issues**
- **Transparency**
- **Changes**
- **History**

Avoid turning the dashboard into an engineering console.

Technical evidence should be available when useful but not dominate the primary UX.

---

# 22. Brand system

## Brand name

**Regstead**

## Descriptor

**Website monitoring for regulated businesses.**

## Tagline

**Monitor what matters.**

## Primary colours

- Regstead Navy: `#10263D`
- Signal Teal: `#168678`
- Slate: `#566675`
- Mist: `#EFF4F5`
- Signal Amber: `#D79A2B`
- Confirmed Red: `#B34A45`

## Typography

- headings: **Manrope**
- body/UI: **Inter**

Use sensible fallbacks in product code.

## Visual personality

Regstead should feel:

- calm;
- precise;
- dependable;
- modern;
- professional;
- restrained.

Avoid:

- shields;
- padlocks;
- scales of justice;
- giant green ticks;
- excessive red warnings;
- “cyber security” visual clichés;
- aggressive compliance imagery.

Approved visual direction:

**D1 — bold and balanced**

The brand mark is based on three forward-leaning bars using navy and teal.

Production assets live under the Regstead brand-assets documentation and should be treated as the visual source of truth.

---

# 23. Voice and language

Prefer calm, evidence-led wording.

Use:

- “We could not confirm…”
- “Review recommended”
- “Previously observed”
- “Confirmed unavailable”
- “Material change detected”
- “Regstead observed…”

Avoid:

- “You failed”
- “You are non-compliant”
- “Violation”
- “Breach detected”
- “Guaranteed compliant”
- “Regstead ensures compliance”

unless an appropriately qualified future product and legal review explicitly permits such language.

---

# 24. Customer outreach principles

Outreach should be evidence-led.

Preferred sequence:

1. run a fresh Regstead scan;
2. review the result;
3. identify one truthful useful observation;
4. contact the appropriate decision-maker;
5. offer the baseline report;
6. explain recurring monitoring;
7. invite them to the founding programme.

If no issue is found, do not invent one.

A healthy site can still be a valid prospect because the value is ongoing monitoring.

Example framing:

> “An audit tells you what is there today. Regstead remembers it and tells you if something important changes later.”

---

# 25. Privacy and prospecting

Prospect information must be handled separately from the public code repository.

Do not commit:

- named sales prospects;
- personal business email addresses;
- customer onboarding responses;
- customer reports;
- billing information;
- correspondence;
- credentials or API keys.

Recommended private location:

`C:\Users\clive\OneDrive\Documents\Regstead Private`

The public/product repository may include anonymised or fictional examples.

---

# 26. Project file organisation

Recommended documentation structure:

```text
WatchLayer/
├── docs/
│   ├── product/
│   ├── validation/
│   ├── brand/
│   ├── website/
│   ├── commercial/
│   ├── legal/
│   ├── reports/
│   │   └── samples/
│   └── regstead/
│       └── REGSTEAD_PRODUCT_BRIEF.md
```

Private commercial/customer information should live outside the repository.

---

# 27. Current non-goals

Unless a milestone explicitly changes scope, do not introduce the following into current engine-hardening work:

- full SaaS dashboard;
- user accounts;
- authentication;
- Stripe;
- subscriptions/billing;
- cloud scheduling;
- email delivery;
- browser automation;
- JavaScript rendering;
- AI classification;
- generative AI findings;
- WordPress plugin;
- Regstead rename of internal WatchLayer code;
- mobile apps;
- compliance certification;
- enterprise SSO;
- reseller/agency functionality.

The priority is still **accuracy and trustworthiness of the monitoring engine**.

---

# 28. Future technical priorities after Milestone 5

Exact sequencing should be set by a formal milestone, but likely future areas include:

1. PDF content extraction where justified by benchmark evidence;
2. browser-rendered page support if benchmark evidence demonstrates material need;
3. report-generation layer;
4. scheduled monitoring;
5. alert engine;
6. hosted API/service;
7. public free-scan flow;
8. customer accounts/authentication;
9. SaaS dashboard;
10. billing;
11. production logging/observability;
12. additional regulated-sector packs.

Do not jump ahead merely because these are listed here.

---

# 29. Success criteria

Regstead succeeds if customers trust its alerts.

Product success should be judged by:

- high precision of serious findings;
- low false-positive rate;
- meaningful reduction in UNKNOWN where evidence is discoverable;
- transparent uncertainty where evidence is not discoverable;
- useful change history;
- clear customer actions;
- real customer willingness to pay.

Commercial validation target currently suggested:

- approach 50 qualified firms;
- aim for at least 10 meaningful conversations;
- aim for at least 5 paying founding customers.

If only 0–1 firms pay after 50 high-quality approaches, revisit the proposition before materially increasing build investment.

---

# 30. Decision rules for future Codex work

Before implementing a new feature, ask:

1. Does this improve the reliability of discovering or monitoring something important?
2. Does this preserve the distinction between evidence and assumption?
3. Will it reduce useful UNKNOWNs without increasing false positives?
4. Does it make changes easier for a customer to understand?
5. Is this necessary for the current milestone?
6. Does it accidentally turn Regstead into a compliance-certification product?
7. Does it expose private customer/prospect data?
8. Does it require a new product decision that should be documented first?

If the answer to 5 is “no”, defer it unless explicitly instructed.

---

# 31. Instructions for Codex at the start of a task

For technical work, Codex should normally read:

1. `AGENTS.md`
2. `docs/regstead/REGSTEAD_PRODUCT_BRIEF.md`
3. the current milestone document
4. any directly referenced technical/validation files

For the current Milestone 5 work:

- continue existing Milestone 5 implementation;
- do not restart completed work;
- preserve partial work and benchmark baselines;
- keep the benchmark workbook read-only unless explicitly instructed;
- do not introduce SaaS/cloud/branding renames into Milestone 5;
- finish with the requested Milestone 5 benchmark/completion report.

---

# 32. Product north star

The easiest way to judge whether Regstead still feels like Regstead is this:

> **Regstead remembers what mattered on a regulated website, notices when it meaningfully changes, and explains the evidence without pretending to know more than it does.**

That principle should survive every future vertical, UI redesign and technical milestone.

---

**End of REGSTEAD_PRODUCT_BRIEF.md**
