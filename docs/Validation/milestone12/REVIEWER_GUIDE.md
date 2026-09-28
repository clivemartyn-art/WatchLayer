# Independent rendered-evidence review

Status: another person will review this sample. No reviewer identity, review date or decisions have been supplied. The initial ten-page post-fix run recovered **zero** candidates, so the initial review package is empty. Do not manufacture review rows from failed renders or from development fixtures.

A separate continuation has now produced three live candidates from one page. Use `continuation/review/START_HERE.md` for that package. The initial empty package is preserved and must not be confused with the continuation review.

## What you are assessing

Assess whether the captured public evidence is useful, whether its service context is justified, and whether it supports the stated rule. These are separate questions. You are not certifying legal compliance or judging the entire firm.

The first targets include an Irish firm, a Nigerian firm and a UK directory. A directory describing a service does not mean a firm offers it. Evidence from another jurisdiction does not establish an England-and-Wales regulatory requirement. Use NOT_APPLICABLE for regulatory support where appropriate.

## Files and independence

Read `reviewer-context.json` first. It supplies the source URL, captured excerpt, bounded context, source hash, candidate rule and proposed target services, without the machine's support decisions or attribution reasoning. The proposed service is a question to assess, not a fact to accept. Record your own decisions in a copy of `human-decisions.json`. Keep the supplied IDs and queue hash unchanged. Do not edit the evidence or original files. Do not consult `automated-queue.json` until your initial decisions are frozen.

The reviewer must be independent of the extraction/adjudication changes. Enter your own name, actual review date in YYYY-MM-DD format, and a short reason for every decision. Do not copy an example review date or infer what the developer expects.

## Decision fields

- `usefulPublicEvidence`: YES, NO or UNCERTAIN. Does this captured item add meaningful public information or a useful public link?
- `serviceContext`: CORRECT, WRONG, UNCERTAIN or NOT_APPLICABLE. Does the excerpt and local context actually identify the relevant service? A URL, distant heading or repeated navigation alone is insufficient. Generic complaints/regulatory material may be firm-wide.
- `ruleSupport`: JUSTIFIED, UNJUSTIFIED, UNCERTAIN or NOT_APPLICABLE. Does the supplied evidence support this particular rule? A keyword is insufficient. A document link proves a document location, not its contents. Use NOT_APPLICABLE for navigation-only items and out-of-jurisdiction regulatory claims.
- `label`: choose one of the labels below.

| Label | Use when |
| --- | --- |
| VALID_RENDERED_EVIDENCE | Meaningful public evidence with justified context and applicable support, or useful evidence with no applicable regulatory claim. |
| PARTIAL_OR_AMBIGUOUS | Some relevant content exists, but meaning or support remains uncertain. |
| NOT_RELEVANT | The item does not support the stated purpose or rule. |
| WRONG_SERVICE | Evidence belongs to another service or has been wrongly forced into a service. |
| INSUFFICIENT_CONTEXT | The supplied excerpt/context does not permit a reliable decision. |

Use `notes` to explain the decisive wording, ambiguity, missing context or incorrect association. Do not guess. If more context is needed, state what is missing. For links, the destination's name alone does not establish its content.

## Optional source checks

You may open the public URL without logging in, submitting forms, accepting marketing consent or bypassing access controls. A current page may differ from the frozen capture: record this separately rather than rewriting the captured evidence. If the source cannot be checked, use the supplied capture and explain the limitation.

## Returning the review

Return your completed decision file with the same queue hash and item IDs. Leave original evidence untouched. The comparison rejects incomplete, unknown, duplicate and contradictory decisions. Pending items are not counted as invalid, and an empty queue is not a completed review. Results describe this selected sample only; they do not establish live precision.
