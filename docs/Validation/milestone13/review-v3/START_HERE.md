# M13 blind human review — current package

This is the current 18-item package. The sibling `review/` and `review-v2/` directories are superseded drafts; review only this `review-v3/` package. The evidence was captured from three public pages of **one Scottish organisation**. Repeated links on different source pages are separate observations, not independent firms or independent proof of a service. This is a small observation-quality sample, not a test of England-and-Wales regulatory applicability.

## What to open

1. Read `reviewer-context.json`. It contains the actual excerpts, bounded context, source URLs, hashes and proposed rule/service where present.
2. Copy `human-decisions.json` to a new filename and complete its 18 rows.
3. Return the completed file. Leave item IDs and `queueSha256` unchanged.

Do not open `automated-queue.json`, machine comparisons, or automated explanations before saving your judgments. No machine answers are supplied here. Judge the captured context: current websites may have changed since capture. If you visit a source URL, distinguish current observations from the retained excerpt in your notes.

## How to judge each item

- **Useful public evidence:** Is this a meaningful visible fact or useful link location? A navigation label can establish a destination, but cannot prove what the destination contains.
- **Service context:** If `targetServices` proposes a service, does the local context justify it? A URL, generic heading or repeated menu alone is insufficient. Use `NOT_APPLICABLE` when no service is proposed.
- **Rule support:** If a rule is proposed, does the actual excerpt support that signal? `PRICE-002` asks whether the basis of charging is explained; `PRICE-013` asks whether stages/process are described; `PRICE-014` asks whether a typical timescale is described. These are factual signal questions, not compliance judgments. Use `NOT_APPLICABLE` when `targetRule` is null.
- **Missing information:** Missing expected text does not prove the website lacks it. Use uncertainty when the bounded context is inadequate.

Fill `usefulPublicEvidence` with `YES`, `NO`, or `UNCERTAIN`; `serviceContext` with `CORRECT`, `WRONG`, `UNCERTAIN`, or `NOT_APPLICABLE`; and `ruleSupport` with `JUSTIFIED`, `UNJUSTIFIED`, `UNCERTAIN`, or `NOT_APPLICABLE`.

Choose one `label`:

| Label | Meaning |
|---|---|
| VALID_RENDERED_EVIDENCE | The excerpt/location is useful and every proposed service/rule is justified, or not applicable. |
| PARTIAL_OR_AMBIGUOUS | Some useful content exists, but interpretation is incomplete or ambiguous. |
| NOT_RELEVANT | The item does not provide useful evidence for its proposed purpose. |
| WRONG_SERVICE | The proposed service association is wrong. Set serviceContext to WRONG. |
| INSUFFICIENT_CONTEXT | There is too little context to make a reliable decision. |

Enter your name, the actual review date as `YYYY-MM-DD`, and a short independent reason in `notes` for every row. Do not copy a machine explanation or mark an item valid just because a detector proposed it. Valid items must have usefulPublicEvidence YES and no uncertain/unjustified proposed service or rule.

Only completed judgments will be compared. Until then the reviewed count is zero, not a zero-percent accuracy score. Positive judgments alone cannot establish live serious-finding precision.
