# M10 reviewed failure modes — recorded before logic changes

Input: `clive-m10-service-review-complete-80.csv`, Clive, 2026-09-24. All 80 identifiers, source URLs, rule IDs and evidence snippets match the original queue; all rows have notes. Original labels and evidence are immutable. Baseline exact agreement 26/80, firm-wide 15/32, false service assignment 11/22. No human MULTI_SERVICE labels exist.

## Recurring patterns

1. **Employment audience conflation.** Rothera Bray (`m10-3d3e…`), Ashtons (`m10-17ce…`), Kitson Boyce (`m10-4c2c…`) and Tozers (`m10-a411…`, `m10-250e…`) explicitly identify employer or employee audiences, but generic employment matches propose both. Tilly (`m10-d20b…`) has no identifiable side: preserve no-service-context there. Correct explicit audience anchors without declaring generic employment to cover both sides.
2. **Local service versus page-wide title.** Rachel Sebastian's probate section (`m10-40fa…`) is assigned conveyancing too; its complaints section (`m10-80c9…`) is assigned both services. Rothera's remortgage page (`m10-d588…`) is overbroad. Tozers purchase stages (`m10-254d…`) inherit remortgage from elsewhere. Prefer corroborated, bounded local anchors; generic/intervening sections must not inherit an older heading. A distant service heading alone is insufficient.
3. **Firm-wide evidence is not service pricing.** Slater Heelis, Redkite, Sintons and Dean Wilson general terms; Wolferstans, Private Client Solicitors, Birketts and Russell-Cooke complaints; and organisation-level equality/data/supply-chain policies are labelled firm-wide. Identify this context separately and do not distribute PRICE facts to services. Preserve organisation-level regulatory facts and existing removal safeguards.
4. **Incidental mortgage text contaminates conveyancing scope.** MSB purchase schedules, Sydney Mitchell additional fees and Nelsons estimates contain mortgage-related transaction details. This does not make the same fee a remortgage fee. Attribute clearly corroborated transaction context without inferring PDF sections from short service-bearing lines. Mixed-page/document rule-support safeguards remain separate.
5. **Missing context / catalogue limits.** Some reviewed fragments have no retained exact context. Others concern wills, family, transport, injury, mediation or education (`OTHER`), or employer information guides rather than relevant tribunal services. These are real review outcomes but do not justify adding service packs or upgrading weak pricing evidence. Retain unresolved cases instead of guessing.

## Correction boundary

Use a reusable internal attribution decision consumed by both production evidence filtering and the review comparison. It must not read human labels, firm identities, sample IDs or expected outcomes. Re-score the same 80 items without changing the baseline proposal or the review-label validation rules. Clearly distinguish service-context gains from rule-result changes and from future held-out accuracy.

Production integration must preserve raw facts, use bounded optional context, retain backward compatibility for old fact sets/reports, and never manufacture serious removals by suppressing an alternative surface. No browser execution, M11 work or benchmark-methodology changes.
