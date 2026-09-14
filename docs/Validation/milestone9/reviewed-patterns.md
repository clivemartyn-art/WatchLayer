# Independent review findings before corrections

Clive supplied 78 labels in `clive-review-blind.csv` and confirmed the review date as 14 September 2026. The original CSV is preserved. A separate import records the reviewer/date and normalizes one lowercase label. No substantive labels were changed.

Baseline exact agreement: 26/66 PDF assessments (39.39%). HTML controls: 12, excluded from automated agreement. False support: 2/12; false rejection: 23/33. These are stratified evidence-sample rates, not live precision.

## Targeted corrections justified by reviewed cases

- `781b550b…`, Shakespeare Martineau, PRICE-002: a fragment mentioning a percentage is inside a sentence explicitly saying the firm does not charge that way. Human PARTIALLY_SUPPORTS versus automated SUPPORTED. Inspect the containing sentence for negation; retain partial support instead of treating the named basis as affirmative. A neighboring affirmative sentence must not erase the negation attached to the extracted fragment.
- `badfb927…`, Tozers, PRICE-006: “There is no VAT on court fees” states tax treatment but does not by itself identify a likely expense of the service. Human NOT_RELEVANT versus automated SUPPORTED. A tax-only sentence should not satisfy the expense-identification rule; other actual expense statements remain eligible.
- `d3014ea2…`, Kitson Boyce, PRICE-008: “We charge £750 + 20% VAT … for this work” directly links VAT to the firm's charge. Human SUPPORTS_RULE versus automated PARTIALLY_SUPPORTED. Recognize this explicit construction only after existing document/service/context safeguards. Preserve the extraction confidence and raw fact separately.

## Disagreements retained for further review

Several human-supported items have unresolved or mixed service scope, missing exact source context, or references to a regulator without an escalation route. These labels remain intact; they do not authorize blanket promotion. Examples include the recurring SRA-regulatory-duties sentence (LAW-U009), absent context for concatenated complaints snippets, and mixed-service expense tables. Staff documents and short headings can also be over-conservative, but widening their eligibility without reliable service attribution would be unsafe.

Other disagreements concern incidental vocabulary (consumer experience, recruitment qualifications, minimum wages, corporate processes, supervisory authorities). Existing ambiguity already withholds those items. No broad keyword redesign is justified in this correction pass. Reviewer notes were not supplied, so causal pattern classification here is engineering analysis of independently labelled cases, not additional human testimony.
