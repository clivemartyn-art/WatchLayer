# M9 human review guide

Your job is to decide whether **this evidence supports this particular rule**, for the stated service. You are not certifying the firm's legal compliance or checking whether the whole website passes a legal audit.

## Start here

1. Open `reports/milestone9/review-ready/review-blind.csv` in Excel. Keep the CSV as UTF-8, turn on Wrap Text and widen the evidence/context columns. Save your completed copy under a new filename such as `clive-review.csv`.
2. Work from the blind file first. It deliberately hides the automated verdict, rationale and final machine results. The companion `review-with-automated.csv` and `queue.json` retain them for comparison **after** you record your decision.
3. Start with the first ten rows in their existing order, then continue in batches. The order is deterministic and covers easy, difficult and uncertain candidates. Do not skip difficult items: an uncertainty label is useful review data.
4. For each row, read the target rule in the rule reference below, target service, evidence and surrounding context. Check the source title, referring page and PDF page number where present.
5. Fill in `human_label`, `reviewer` (your name) and `reviewed_at` (for example `2026-09-14`). A short `reviewer_note` is optional but particularly useful for partial, ambiguous or irrelevant evidence. `pattern` is optional.
6. Leave the identifier, source and evidence columns unchanged. Leave unreviewed rows blank. Send the saved file path back when a batch is ready. The comparison tool accepts partial batches and never overwrites automated assessments.

There are 78 selected items: 66 PDF candidates spanning all five automated states, plus 12 HTML controls. These controls do not have an automated M8 adjudication verdict; their human judgments are reported separately rather than forced into an agreement score.

## Choose one label

| Enter this exact label | Use it when | Example |
|---|---|---|
| SUPPORTS_RULE | The evidence clearly supports the exact indicator and relevant service | Conveyancing fees explicitly say “our legal fee is £900 plus 20% VAT” for the legal-fee VAT check |
| PARTIALLY_SUPPORTS | Some required detail is established, but a material part is missing or only implied | “VAT may apply” establishes a VAT reference but not a clear amount/rate |
| AMBIGUOUS | The text is present but has two plausible interpretations, or ownership/service assignment is uncertain | A table combines several services and it is unclear which fee belongs to which |
| NOT_RELEVANT | The evidence clearly concerns a different subject, service, entity or document purpose | A house valuation is offered as proof of a solicitor's legal fee; a number belongs to another firm |
| INSUFFICIENT_CONTEXT | You cannot judge reliably from the available source/context | The snippet is truncated, its heading is unavailable or the referenced PDF page cannot be checked |

“Not sure” normally means AMBIGUOUS or INSUFFICIENT_CONTEXT, not NOT_RELEVANT. Missing evidence is not evidence that a firm has failed a legal requirement. Do not infer SUPPORTS_RULE from the professional appearance of a website or from knowing that a firm probably provides the information elsewhere.

## How much source material to use

Assess the captured evidence first. You may open the source URL and go to the indicated PDF page when useful. PDFs and live websites can change: if the current document differs from the captured snippet, mention this in your note and avoid silently using new text to validate old evidence. The queue preserves the captured PDF hash and page locator in JSON.

If you need information outside the bounded window to make a judgment, say where you found it: for example “Service heading on PDF page 2; table on page 4.” If the wider source is unavailable, INSUFFICIENT_CONTEXT is a valid outcome. For HTML controls, only the retained snippet may be available; no full historical HTML archive was kept. Do not guess missing historical context from today's page.

PDF heading positions were not retained in M8. `heading_context = UNAVAILABLE` means not measured, not that the text is definitely far from its heading. Your notes can identify heading-distance or appendix problems for later targeted work.

## Service and document checks

- A conveyancing price does not support probate or employment pricing. For mixed-service documents, identify a clear link between the heading/section and the quoted price. Contents pages and repeated service names alone are insufficient.
- Firm-wide complaints procedures and clearly attributed firm-wide SRA identifiers can support firm-wide regulatory checks. They do not need to be repeated in every service section. `FIRM_WIDE` in the target service column means this distinction is intentional.
- A service description or document title is a clue, not proof that every paragraph belongs to that service. Watch for appendices, unrelated tables, worked examples, third-party information and old newsletters.
- Repeated footer wording is not extra independent support. Decide whether its meaning and ownership are clear in the actual context. Repeated, clear firm-wide regulatory wording can still be relevant.
- A named solicitor's qualifications should relate to the work or supervision being checked. A generic team list does not automatically establish who does or supervises a particular service.
- Keep procedure location distinct from procedure content. A complaints document may be located while the precise Ombudsman referral timing remains unclear. A direct pricing link is not proof of the contents or legal prominence.

## Optional pattern notes

Use one short phrase in `pattern`, or leave it blank: `WRONG_SERVICE`, `MIXED_SERVICE`, `WRONG_ENTITY`, `GENERIC_WORDING`, `REPEATED_BOILERPLATE`, `DISTANT_HEADING`, `TITLE_MISMATCH`, `APPENDIX_OR_CONTENTS`, `CONTEXT_TOO_NARROW`, `CONTEXT_TOO_BROAD`, `PARTIAL_DETAIL`, `SOURCE_CHANGED` or `OTHER`.

These are your observed reasons, not labels you must fit every item into. We will identify recurring disagreements only after your decisions are recorded. Production evidence behavior stays unchanged until a reviewed pattern justifies a targeted correction.

## Target-rule reference

| Rule | Question about the observed evidence |
|---|---|
| LAW-U001 | Is a plausible SRA number clearly attributable to this firm? |
| LAW-U004 | Is a client complaints procedure/page/document confidently identified? |
| LAW-U005 | Is Legal Ombudsman information present in a relevant complaints context? |
| LAW-U006 | Does it explain how a complaint can be made to the Legal Ombudsman? |
| LAW-U007 | Does it explain when referral to the Legal Ombudsman is available? |
| LAW-U008 | Is a route for raising conduct concerns with the SRA explained? |
| LAW-U009 | Is the SRA escalation context sufficiently clear? |
| PRICE-001 | Is a total, average cost or cost range for this service given? |
| PRICE-002 | Is the charging basis explained? |
| PRICE-003 | Is relevant hourly/fixed-fee information given? |
| PRICE-004 | Are relevant workers' experience/qualifications described? |
| PRICE-005 | Are relevant supervisors' experience/qualifications described? |
| PRICE-006 | Are likely disbursements identified? |
| PRICE-007 | Are their likely costs/ranges given? |
| PRICE-008 | Is legal-fee VAT treatment stated? |
| PRICE-009 | Is the VAT amount/rate sufficiently explicit where relevant? |
| PRICE-010 | Is VAT treatment of disbursements sufficiently clear? |
| PRICE-011 | Are included services explained? |
| PRICE-012 | Are expected exclusions explained? |
| PRICE-013 | Are key stages described, beyond a generic process mention? |
| PRICE-014 | Is a likely/typical service timescale described? |
| PRICE-015 | Is conditional/damages-fee customer-payment information explained where applicable? |
| LAW-I001 | Is there an explicit old pricing review/update date? This is informational only. |
| LAW-I002 | Is there a historic year reference in current pricing material? This is informational only. |

The full rule-name mapping is also in `queue.json`. A human support label evaluates an observable signal only. It does not assert that a website is compliant, in breach, or legally adequate.
