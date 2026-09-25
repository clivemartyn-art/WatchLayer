# M10 service-context review guide

This is a new review task. Decide **which service, services, or organisation-level context the evidence belongs to**. Do not decide whether it proves the rule or whether the firm meets a legal requirement. Your M9 evidence-support decisions remain separate.

## Working file

Open `reports/milestone10/review-ready/service-review.csv`. Save a separate copy, for example `clive-m10-service-review.csv` in the WatchLayer folder. Use UTF-8 CSV and wrap the evidence/context columns. Start with ten rows, then continue in batches. Leave unreviewed rows blank and retain the original order and identifiers.

The file shows `proposed_services` because CORRECT/WRONG refers to that proposal. It hides the automated adjudication and final rule results to reduce priming. The companion JSON and `service-review-with-automated.csv` are for inspection after recording your judgments.

Fill in:

- `human_label`: one label below.
- `expected_service`: service identifier(s), separated by `|`, where required.
- `reviewer`: Clive.
- `reviewed_at`: the actual review date as YYYY-MM-DD.
- `reviewer_note`: a short explanation, especially for wrong attribution, multiple services or insufficient context. Notes help distinguish a rule bug from a difference in interpretation.

## Labels

| Label | Meaning | Expected service |
|---|---|---|
| SERVICE_SPECIFIC_CORRECT | The evidence applies to the single proposed service | That one identifier |
| SERVICE_SPECIFIC_WRONG | The evidence applies to one service, but the proposal is wrong, missing or lists several services | The correct one identifier |
| MULTI_SERVICE | The wording explicitly applies to two or more identifiable services | All relevant identifiers, separated by `|` |
| FIRM_WIDE | The evidence applies to the organisation generally | Leave blank |
| NO_SERVICE_CONTEXT | The text is readable, but no reliable service or firm-wide attribution can be made | Leave blank |
| INSUFFICIENT_CONTEXT | The available evidence/context is too incomplete to judge | Leave blank |

MULTI_SERVICE does not mean a PDF happens to mention multiple services. A contents list, website navigation or repeated header does not establish that a fee applies to every named service. FIRM_WIDE does not mean an organisation-level statement automatically satisfies service-level pricing rules.

## Service identifiers

`residential_conveyancing`, `remortgage`, `probate`, `immigration`, `immigration_appeals`, `motoring`, `employment_employee`, `employment_employer`, `debt_recovery`, `business_licensing`.

Use `OTHER` for an identifiable service outside this list, such as family law; explain it in your note. If the text just says “employment” without establishing employee/employer scope, do not select both automatically. Use NO_SERVICE_CONTEXT or INSUFFICIENT_CONTEXT as appropriate and explain the uncertainty.

## Examples

- A fee under a clear probate section, with probate proposed: SERVICE_SPECIFIC_CORRECT, `probate`.
- A conveyancing fee proposed as probate: SERVICE_SPECIFIC_WRONG, `residential_conveyancing`.
- “These charges apply to both our probate and conveyancing services”: MULTI_SERVICE, `probate|residential_conveyancing`.
- “If you are unhappy with any service provided by our firm, contact our complaints partner”: FIRM_WIDE, blank expected service.
- A readable generic fee table with no service relationship: NO_SERVICE_CONTEXT.
- A fragment whose service heading is on an unavailable preceding page: INSUFFICIENT_CONTEXT.

## Reading structure and sources

Actual HTML headings use `heading_method = HTML_DOM`. A nearby heading is a clue: check intervening sections, competing headings and whether the evidence is in navigation/footer content. Distance is measured in normalized characters and selected DOM blocks, not physical distance or every paragraph.

PDF headings were not retained by the parser. `candidate_service_lines` contains short service-bearing text lines, **not verified headings**. Blank heading/distance fields mean unavailable. Never assume a previous PDF page's heading applies to the current page. Check page boundaries, restarted sections, contents pages, headers, footers and appendices.

You may inspect the source URL and indicated PDF page. Some candidates are preserved observations and current documents may differ. If you use wider context, record its page/heading in your note; if the source has changed, say so. Do not silently replace captured evidence with current wording.

In this packet, PDF candidates come from the preserved M9 corpus; HTML candidates come from the fresh M10 scans. The two capture sets remain separately identified in the JSON and milestone report.

Send the saved file path when a batch is ready. The tooling accepts partial reviews and will not overwrite the automated attribution or your M9 decisions.
