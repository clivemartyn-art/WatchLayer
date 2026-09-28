# M13 demonstrated failure modes before production changes

Recorded against unchanged M12 production source. Full cohort baseline remains separate at `reports/milestone13/cohort-baseline`.

1. ML01 and ML02 completed Chromium execution but did not recover either predeclared staff/pricing expectation. They returned public fragments and navigation. ML03 recovered its expected contact details. Completion is not a page-completeness assertion.
2. ML01 and ML03 each changed ten absent service classifications from UNKNOWN to NOT_DETECTED. ML02 retained positive conveyancing and low-confidence probate but also changed eight unsupported service states to NOT_DETECTED. The rendered adapter passes a script-free projection to the static extractor, which treats the projection as reliable. That positive-observation reliability is not proof that all service content was observed.
3. Focused regression reproduction against M12 produces three failing assertions: rendered-only missing services become NOT_DETECTED; positive observed service plus missing unrelated service also yields NOT_DETECTED for the latter; and a previously rendered SRA number followed by useful partial DOM yields WARNING rather than UNKNOWN. Four positive/static/context/document controls already pass.

Proposed narrow correction: distinguish positive observation from eligibility for absence conclusions using existing RENDERED_DOM provenance. Preserve actual positive matches and explicit overrides. Keep unobserved service states UNKNOWN when the only reliable observations are rendered. Withhold rendered signal-disappearance warnings because an initial DOM observation has unknown completeness. Static observations keep existing semantics. Preserve source/profile history compatibility with versioned browser policy. No budget, eligibility, readiness, visibility, interaction or network changes are justified by these results.

Human review has not yet occurred. No labels are inferred from these automated reproductions. No global suppression of service attribution or positive support is proposed.
