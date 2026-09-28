# Frozen continuation baseline findings, before further production edits

The unchanged policy 1.1 run is preserved in `reports/milestone12/continuation-baseline`. Ten confirmed pages triggered; three completed rendering, one recovered its predeclared expected content, two had mechanically relevant link gains, and none changed a rule result. The three completed renders produced thirty UNKNOWN-to-NOT_DETECTED service classifications, not supported rule promotions.

CN01–CN04: THIRD_PARTY_LIBRARY_REQUIRED, with a secondary SCRIPT_RUNTIME_ERROR. Actual blocked AOS JS/CSS requests to `unpkg.com/aos@next/dist/` were followed by `AOS is not defined`. This demonstrates an execution dependency, not proof that allowing it alone would recover all expected content. The mutable `next` alias and unknown redirect/cookie properties do not justify automatic production access.

CM01–CM02: THIRD_PARTY_API_REQUIRED plus a separately blocked advertising tag. Actual XHR requests target `cdn.contentful.com/spaces/szj1qktuhaw3/environments/master/entries` with redacted queries. This is site data, not a static library. CM03 timed out before recording an essential-resource failure; classify DOM_READINESS_FAILURE / unresolved dependency, not an inferred API failure. No retry is used to relabel the frozen outcome.

CR01: successful expected phrase and useful team/service links, all within existing policy. CR02: completed execution but zero visible text and zero links. CR03: some navigation recovered but expected biography absent. Independent browser accessibility content does not guarantee CSS-visible content at WatchLayer's bounded observation time; animated/offscreen sections remain a limitation. Hidden content must not be promoted simply because it exists in the DOM.

## Demonstrated safety correction

CR02's empty visible representation was nevertheless forwarded as a reliable rendered page, changing all ten service classifications from UNKNOWN to NOT_DETECTED. This is unjustified observability. Reject a rendered representation with neither visible body text nor links before forwarding it to extraction. Keep its static observation and an explicit EMPTY_VISIBLE_DOM diagnostic; do not use it as disappearance evidence. This correction does not change eligibility, wait limits, network access or visibility filters. Add regressions for empty output and history compatibility.

## Review selection correction

The continuation instruction requires successful expected recovery before queue admission. Existing preparation admits any completed render. Restrict continuation review preparation to completed renders whose frozen expected content was recovered, and include that expected text as a generic observability item (no invented rule support). Keep the original queue and baseline untouched.
