# REGSTEAD LAUNCH PLAN

**Document status:** Active launch source of truth  
**Version:** 1.0  
**Last updated:** 12 September 2026  
**Public brand:** Regstead  
**Internal engine:** WatchLayer  
**Initial market:** SRA-regulated law firms in England and Wales

---

# 1. Purpose

This document defines the practical path from the current WatchLayer/Regstead build to the first paying Regstead customers.

It is intended to answer:

- what must be true before outreach begins;
- what can remain manual during the founding beta;
- what must be automated before scale;
- how the first 25 founding customers are acquired and onboarded;
- what commercial evidence counts as success;
- when pricing changes;
- when incorporation, payments, hosted scanning and a dashboard become necessary;
- what Regstead should deliberately not build too early.

Read this alongside:

- `docs/regstead/REGSTEAD_PRODUCT_BRIEF.md`
- `docs/commercial/COMMERCIAL_MODEL.md`
- current WatchLayer milestone specifications
- Founding Customer Offer
- Beta Onboarding Questionnaire
- legal/commercial draft documents

---

# 2. Current position

At the time of this document:

## Product / technical

Completed:
- Milestone 1 — crawler
- Milestone 2 — persistence and change detection
- Milestone 3 — generic rule engine
- Milestone 4 — law-firm rule pack

In progress:
- Milestone 5 — LawWatch Accuracy & Benchmark Hardening

Current priority:
**Improve discovery and evidence acquisition without increasing false positives.**

Do not interrupt Milestone 5 to build SaaS features.

---

## Commercial readiness

Created:
- Regstead brand system
- website architecture and launch copy
- product brief
- commercial model
- founding customer offer
- beta onboarding questionnaire
- sample baseline report
- legal/commercial draft pack
- 100-firm prospect database
- enriched Top 25 launch list
- outreach sequence

The major remaining task is to move from preparation to validated customer acquisition.

---

# 3. Launch strategy

Regstead should not launch as a large public SaaS product first.

The launch sequence should be:

1. prove the monitoring engine is trustworthy;
2. privately approach a small number of highly suitable law firms;
3. provide a manually reviewed baseline report;
4. convert early customers to the £9.95 founding subscription;
5. manually support the first customers where necessary;
6. learn what actually matters to them;
7. automate the repetitive parts;
8. only then open a broader public self-service product.

This is a **founding beta**, not a mass-market launch.

---

# 4. Launch phases

## Phase 0 — Technical trust

**Current phase**

Objective:
Establish that the engine is accurate enough to put in front of real firms.

Primary work:
Milestone 5.

Do not begin broad customer acquisition until the milestone has been reviewed.

---

## Phase 1 — Private commercial validation

Target:
**First 5 paying customers**

Method:
Highly personalised outreach to selected firms.

Operational model:
Manual scan review + branded report + manual onboarding are acceptable.

Key question:
**Will real firms pay for recurring monitoring?**

---

## Phase 2 — Founding cohort

Target:
**25 paying founding customers**

Price:
**£9.95/month**

Operational model:
Partly automated, with limited manual support.

Key questions:
- do customers stay;
- do alerts remain useful over time;
- how much support is required;
- which monitored surfaces matter;
- what customers expect from reports;
- what they would pay next.

When the 25th founding place is filled:
**close the founding price to new customers.**

---

## Phase 3 — Standard launch

Target:
**100 paying customers**

Entry price:
**£19/month**

Operational model:
Core monitoring, reporting, payments, alerts and onboarding should be largely automated.

Key question:
**Can Regstead acquire and retain customers repeatedly without founder-level manual effort?**

---

## Phase 4 — Early scale

Target:
**250–500 paying customers**

Possible packaging:
- Standard £19
- Plus £39
- group/multi-site options if customer demand validates them

Operational model:
Self-service SaaS.

At this point:
- support processes;
- uptime monitoring;
- payment recovery;
- security;
- data lifecycle;
- product analytics;
- customer-service workflows

must be mature.

---

# 5. Milestone 5 launch gate

Before initial outreach, review the Milestone 5 benchmark report.

The launch decision should not be based on a single headline accuracy figure.

Review:

- high-severity POTENTIAL_ISSUE precision;
- false-positive rate;
- UNKNOWN rate;
- UNKNOWN reason distribution;
- benchmark agreement;
- discovery improvements;
- live-firm behaviour;
- crawl-budget failures;
- document-related limitations;
- JS/browser limitations;
- stale-content detection;
- SRA number detection;
- complaints/pricing discovery.

---

## Preferred technical launch criteria

The founding beta may proceed where:

### Serious findings
High-severity `POTENTIAL_ISSUE` precision is:

**>=95%**

Preferred:

**100%**

### False positives
No known systematic false-positive pattern exists that could materially undermine customer trust.

### Uncertainty
UNKNOWN remains explicit where evidence is genuinely unavailable.

### Reports
A human can inspect a scan and understand why the system reached each significant finding.

### Repeatability
Re-running the same firm under comparable conditions gives reasonably stable results.

### Safety
NOT OBSERVED is not being incorrectly represented as REMOVED.

---

# 6. If Milestone 5 is not good enough

Do not hide poor benchmark results.

If serious false positives remain:

**Do not begin paid beta outreach.**

Continue engine hardening.

If UNKNOWN is high but serious findings remain precise:

A small beta may still be acceptable if:
- uncertainty is explained clearly;
- reports are manually reviewed;
- unsupported claims are removed;
- product limitations are explicit.

The launch priority is trust, not the number of automated findings.

---

# 7. Minimum product for first outreach

Regstead does **not** need a complete SaaS platform before contacting prospects.

For the first 5 customers, the minimum viable commercial product is:

- reliable WatchLayer scan;
- LawWatch rules;
- stored baseline;
- comparison capability;
- manually reviewed findings;
- branded baseline report;
- recurring scan process;
- simple alert/report delivery;
- founding customer terms;
- payment mechanism;
- clear cancellation route.

The following are **not required** for customer 1:

- sophisticated dashboard;
- self-service registration;
- mobile app;
- advanced analytics;
- complex billing portal;
- AI assistant;
- agency accounts;
- enterprise SSO.

---

# 8. First-customer workflow

The preferred workflow for every early prospect is:

## Step 1 — Select prospect

Use:

`Regstead_Founding_Customer_Prospects_v2.xlsx`

Prioritise:
**Priority A / Top 25**

---

## Step 2 — Verify the prospect

Before scanning:

Confirm:
- website;
- firm still trading;
- SRA-regulated status where relevant;
- relevant legal services;
- likely decision-maker;
- current public email/contact route.

Do not rely permanently on old prospect research.

---

## Step 3 — Run Regstead scan

Run a fresh scan using the current accepted WatchLayer build.

Record:
- date;
- version;
- scan ID;
- important findings;
- UNKNOWN reasons;
- unusual site architecture.

---

## Step 4 — Human review

Before customer-facing use:

Review:
- all serious findings;
- material pricing findings;
- apparent removals;
- complaints findings;
- SRA signals;
- document findings;
- any surprising result.

Remove or downgrade anything not adequately supported.

Early customers should see the best Regstead judgement, not raw machine output.

---

## Step 5 — Prepare baseline report

Generate a branded Regstead report containing:

- Website Health;
- key findings;
- Regulatory Surface;
- service/pricing indicators;
- complaints/regulatory information;
- technical checks;
- relevant unknowns;
- suggested review actions;
- disclaimer.

The report should feel useful even where the site is healthy.

---

## Step 6 — Personalised outreach

Contact the selected decision-maker.

Use:
- one genuine observation; or
- one genuine monitoring opportunity if the site is healthy.

Never manufacture a problem.

Primary CTA:

> Would it be useful if I sent you the short baseline report?

---

## Step 7 — Send report

If requested:

Send the baseline report with:
- short explanation;
- no exaggerated compliance claim;
- explanation of recurring monitoring;
- founding offer.

---

## Step 8 — Founding invitation

Offer:

**Regstead Founding Monitor — £9.95/month**

Explain:
- limited to first 25 customers;
- approximate weekly monitoring during beta;
- cancel anytime;
- founding price retained while subscription remains continuously active;
- product is still being refined;
- feedback is welcomed.

---

## Step 9 — Payment

Before taking money:

- contracting entity must be decided;
- payment route must be legitimate and auditable;
- customer must receive/accept applicable terms;
- invoices/receipts must be available;
- cancellation process must be clear.

---

## Step 10 — Onboarding

Use the Beta Onboarding Questionnaire.

Confirm:
- main domain;
- services;
- important pricing pages;
- complaints page;
- important PDFs;
- forms/quote tools;
- alert recipient;
- known planned website changes;
- monitoring priorities.

---

## Step 11 — Establish baseline

Run/approve the customer's first official monitored baseline.

Record:
- scan date;
- monitored surfaces;
- unresolved UNKNOWNs;
- customer-specific priorities;
- evidence baseline.

---

## Step 12 — Recurring monitoring

For founding beta:

Target cadence:
**approximately weekly**

At each cycle:
- scan;
- compare;
- review important findings;
- notify only when useful;
- record customer feedback.

---

# 9. First 10 prospects

Do not approach all 100 at once.

Begin with **10 Priority A prospects**.

Choose a mix of:

- single-office;
- multi-office;
- conveyancing-heavy;
- probate-heavy;
- multiple transparency-rule services;
- straightforward HTML site;
- document-heavy site.

This gives both commercial and product learning.

The exact first 10 should be selected from the enriched Top 25 immediately before outreach, based on current site status and quality of scan results.

---

# 10. First outreach experiment

## Batch 1

Prospects:
**10**

Objective:
Test message and baseline-report interest.

Measure:
- delivered;
- replies;
- report requests;
- calls;
- paid conversions;
- objections.

Do not change everything after two emails.

Complete enough of the batch to learn something.

---

## Batch 2

Prospects:
**15 additional**

Change messaging only where Batch 1 produced useful evidence.

---

## Batch 3

Prospects:
**25 additional**

By the end of this batch:

Total qualified approaches:
**50**

This is the first meaningful commercial validation point.

---

# 11. Commercial success thresholds

After **50 properly qualified, personalised approaches**:

## Strong signal

- 10+ meaningful conversations
- 5+ paying customers

Continue.

---

## Mixed signal

- 5–9 meaningful conversations
- 2–4 paying customers

Investigate:
- message;
- buyer;
- report value;
- pricing;
- offer;
- timing.

Continue carefully if retention/feedback is positive.

---

## Weak signal

- very little engagement;
- 0–1 paying customers.

Do not simply build more features.

Investigate whether:
- the problem matters enough;
- the buyer is wrong;
- law firms already solve this another way;
- £19 future pricing feels excessive;
- website monitoring is seen as low priority;
- outreach language is weak;
- reports fail to show recurring value.

---

# 12. Outreach cadence

Recommended sequence:

## Day 0
Personalised email.

## Day 3
Short follow-up explaining:

> Regstead remembers what was there before.

## Day 4–5
Optional LinkedIn contact.

## Day 8
Offer the baseline report explicitly.

## Day 14
Close politely.

Do not chase indefinitely.

---

# 13. CRM fields to maintain

For each prospect/customer record:

- firm;
- website;
- city;
- SRA status;
- relevant services;
- decision-maker;
- role;
- email;
- date scanned;
- scan ID;
- primary finding;
- report sent;
- first contact;
- follow-ups;
- reply;
- meeting;
- trial/founding offer;
- paid;
- cancellation;
- cancellation reason;
- notes.

---

# 14. What to learn from every customer

For each founding customer, answer:

1. Why did they subscribe?
2. What finding/report convinced them?
3. Who internally cares about alerts?
4. Which monitored surfaces matter?
5. Which alerts are noise?
6. Which UNKNOWNs confuse them?
7. Would they pay £19?
8. Would they pay £39 for anything?
9. How often do they want scans?
10. How much support do they require?
11. Would they recommend Regstead?
12. Would they permit a testimonial/case study?

---

# 15. Customer 1–5 operating model

Manual work is acceptable.

Manually:
- inspect scans;
- build reports;
- send reports;
- send alerts;
- onboard;
- collect feedback.

But record time spent.

Goal:
Learn before automating.

---

# 16. Customer 5 gate

By customer 5:

Regstead should be able to answer:

- are people actually paying;
- why are they paying;
- is weekly monitoring useful;
- is the report understandable;
- what support takes time;
- what needs automation first.

If five customers exist but each requires hours of manual work per month, fix the operating model before aggressively selling.

---

# 17. Customer 10 gate

By customer 10:

Preferred:
- baseline report generation semi-automated;
- recurring scan process reliable;
- alert candidates automatically identified;
- customer data stored consistently;
- payment/invoicing process repeatable;
- manual review time measurable.

---

# 18. Customer 25 gate

When the founding cohort reaches 25:

## Close founding offer

No new £9.95 customers.

New customers move to:

**Standard Monitor — currently £19/month**

## Review

Assess:
- conversion;
- retention;
- support burden;
- scan cost;
- alert engagement;
- feature requests;
- willingness to pay;
- common site types;
- recurring UNKNOWN causes.

## Decide

Whether to:
- retain £19;
- increase Standard price;
- introduce Plus;
- adjust cadence;
- add PDF parsing;
- add browser support;
- add group/multi-site functionality.

Use evidence.

---

# 19. Incorporation trigger

Regstead does not need a complex corporate structure during technical experimentation.

However, **incorporation should occur before meaningful paid commercial trading** unless professional advice supports another route.

Preferred trigger:

Before:
- taking recurring payments at scale;
- signing customer contracts;
- holding significant customer data;
- employing/contracting development;
- raising investment;
- filing core IP into a trading entity.

Before first paid beta customer, make an explicit decision on:
- trading entity;
- bank account;
- accounting;
- VAT position;
- insurance;
- IP ownership.

Professional accounting/legal advice should confirm the setup.

---

# 20. Domain trigger

Secure the public Regstead domain before meaningful external outreach.

Do not rely on search-engine absence as proof a domain is available.

Check through an appropriate registrar and, where relevant, Nominet.

Primary considerations:

- `.co.uk`
- `.com`
- defensive variants if inexpensive and justified.

Do not buy dozens of speculative domains.

---

# 21. Trademark trigger

Perform proper UK trademark clearance before major brand investment.

Preferred timing:

After:
- product concept is validated enough to continue;

Before:
- significant marketing;
- major design spend;
- widespread customer acquisition.

Likely relevant classes may include software/SaaS classes, subject to professional advice.

Preliminary searching is not legal clearance.

---

# 22. Payment trigger

For customer 1:

A simple legitimate payment route is sufficient.

Before customer 5–10:
- recurring payments should become systematic.

Before customer 25:
- automated subscription billing is strongly preferred.

Likely future option:
Stripe or equivalent.

Do not build a custom payment system.

---

# 23. Hosted scanning trigger

Local/manual scanning is acceptable for development and a very small founding beta.

Move to hosted scheduled scanning when:
- multiple live customers require reliable weekly checks;
- manual triggering becomes operationally fragile;
- monitoring needs to occur when the founder is unavailable.

Likely threshold:
**before customer 10–25**, depending on operational burden.

Hosted execution should be introduced as a dedicated technical milestone.

---

# 24. Email alert automation trigger

Customer 1–5:
manual email alerts are acceptable.

Before customer 25:
alert generation and delivery should be largely automated.

Important:
automation must not remove conservative review safeguards until alert precision is proven.

---

# 25. Authentication/account trigger

Customer accounts are not necessary for customer 1.

Introduce authentication when:
- customers need persistent self-service access;
- reports/history become difficult to deliver by email;
- customer count makes manual access management inefficient.

Likely before broader Standard launch / approaching 100 customers.

---

# 26. Dashboard trigger

Do not build a large dashboard because SaaS products are expected to have one.

Build it when customers need ongoing access to:

- Overview
- Issues
- Transparency
- Changes
- History

Preferred dashboard structure remains these five areas.

The dashboard should display product value already proven through reports and alerts.

It should not be used to discover what the product is.

---

# 27. Self-service onboarding trigger

Manual onboarding is valuable during founding beta because it reveals customer language and priorities.

Automate once:
- onboarding questions are stable;
- most customers answer similarly;
- manual onboarding adds little learning.

Likely:
**between customer 25 and customer 100.**

---

# 28. Plus-plan trigger

Do not launch Plus until actual customers request materially more value.

Potential triggers:

- more frequent scans;
- multiple domains;
- multiple alert recipients;
- group dashboards;
- long-term evidence history;
- PDF-content monitoring;
- integration requirements.

Only then validate the proposed **£39/month** price.

---

# 29. First public website

The first public Regstead website only needs to do a few jobs well:

1. explain the problem;
2. explain continuous monitoring;
3. establish trust;
4. explain Regstead for Law Firms;
5. show a sample report;
6. offer a free scan / report;
7. explain founding pricing;
8. provide legal/privacy information.

Do not delay private outreach for a perfect website.

A credible simple site is enough.

---

# 30. Minimum launch pages

Recommended:

- Home
- How It Works
- For Law Firms
- Pricing
- Free Scan
- Sample Report
- About
- Privacy
- Terms
- Contact

Resources/blog can grow later.

---

# 31. Launch assets already available

The following have already been produced and should be used:

- Regstead Brand Guidelines v1
- Regstead Brand Assets v1
- Website architecture and launch copy
- Sample Baseline Report
- Founding Customer Offer
- Beta Onboarding Questionnaire
- Founding prospect CRM
- Outreach sequence
- Terms of Service draft
- Privacy Notice draft
- Free Scan Terms draft
- Founding Beta Terms draft
- Legal Launch Review Notes
- Regstead Product Brief
- Commercial Model

Avoid recreating these from scratch.

---

# 32. Security and privacy launch gate

Before customer data is stored in a production environment:

Document:
- what personal data is collected;
- why it is collected;
- lawful basis;
- retention;
- storage location;
- subprocessors;
- deletion process;
- access controls;
- incident response.

Never place live customer/prospect personal data in the public Git repository.

---

# 33. Reporting principle

The report is not merely marketing collateral.

It should eventually be generated from the same structured evidence that drives the product.

Do not allow:
- dashboard result;
- PDF report;
- alert;
- API response

to develop conflicting status logic.

One evidence model should underpin all customer outputs.

---

# 34. Support model

During founding beta:

Preferred support:
- email;
- reasonable direct founder access;
- structured feedback requests.

Do not promise:
- 24/7 support;
- legal advice;
- emergency compliance response;
- guaranteed response times

unless the business later deliberately offers them.

---

# 35. Founding beta cancellation

Make cancellation easy.

Reasons:

- customers should remain because the product is valuable;
- churn is useful learning;
- forced retention hides weak product-market fit.

Record every cancellation reason.

---

# 36. What not to build before validation

Do not spend major time on:

- mobile app;
- AI chatbot;
- advanced visual analytics;
- bespoke enterprise permissions;
- public API;
- agency portal;
- CRM integrations;
- Slack/Teams integrations;
- complex reporting builder;
- international regulation packs;
- dozens of verticals;
- complicated plans.

The first commercial question remains:

> **Will law firms pay Regstead to keep watching their public website?**

---

# 37. Practical sequence from today

## Now

1. Codex completes Milestone 5.
2. Review benchmark and completion report.
3. Decide technical launch readiness.
4. Save all Regstead commercial/product documentation into project folders.
5. Secure/confirm domain and corporate naming strategy.
6. Finalise trading entity decision.

---

## Immediately after Milestone 5 acceptance

7. Select first 10 prospects.
8. Run fresh scans.
9. Manually review results.
10. Generate baseline reports.
11. Personalise outreach.
12. Send Batch 1.

---

## While Batch 1 is running

13. Build the simple Regstead website.
14. Finalise payment route.
15. Finalise legal drafts with professional review where appropriate.
16. Prepare operational onboarding/customer folders.
17. Define recurring scan process.

---

## Once first customer says yes

18. Take payment correctly.
19. Obtain acceptance of applicable terms.
20. Complete onboarding.
21. Establish official baseline.
22. Schedule/perform first recurring scan.
23. Deliver useful alerts only.
24. Request feedback.

---

## At five customers

25. Review commercial signal.
26. Review support effort.
27. Automate the most repetitive internal process.
28. Decide next technical milestone.

---

## At 25 customers

29. Close founding pricing.
30. Review retention and pricing.
31. Move new customers to Standard.
32. Prepare broader public launch.

---

# 38. First 90-day commercial objective

The first 90 days after technical launch should not be judged mainly by website traffic.

Primary objective:

**Obtain and retain the first 5–25 paying law firms.**

The best outcome is not 10,000 free scans.

It is a smaller number of customers who:
- understand the product;
- trust the alerts;
- remain subscribed;
- give useful feedback;
- would be disappointed if Regstead disappeared.

---

# 39. Launch dashboard / weekly founder review

During founding beta, review weekly:

### Pipeline
- prospects scanned;
- prospects contacted;
- replies;
- reports sent;
- meetings;
- paying customers.

### Product
- scans run;
- serious findings;
- UNKNOWN rate;
- false-positive feedback;
- alerts sent;
- alerts acted upon.

### Customer
- active customers;
- cancellations;
- support requests;
- feedback received.

### Financial
- MRR;
- payments received;
- payment failures;
- approximate infrastructure cost;
- manual hours.

---

# 40. Launch north star

The launch is successful when Regstead moves from:

> “This seems like a good idea.”

to:

> “Customers pay us to keep watching their websites, trust what Regstead tells them, and remain subscribed because they do not want to check this manually themselves.”

---

# 41. Codex instruction

This launch plan does **not** authorise Codex to introduce SaaS infrastructure during Milestone 5.

Milestone 5 remains focused on accuracy and benchmark hardening.

After Milestone 5 is accepted, create a dedicated next milestone before implementing:

- hosted scheduling;
- API/service layer;
- authentication;
- email alerts;
- payment integration;
- dashboard;
- public free-scan flow.

No major architecture leap should happen implicitly.

---

**End of LAUNCH_PLAN.md**
