# Held-out baseline, recorded before production corrections

Starting source: M11 `ea7efac581022ec0c803d711706243c6e5e4466a`. The frozen run is `reports/milestone12/heldout-baseline/manifest.json`; it records the production-source and target-manifest hashes. Ten independently browser-confirmed public gaps from three organisations were tested. No production code was modified during confirmation or baseline execution. Confirmation is a separate tool observation, not completed human adjudication.

All ten pages triggered M11 fallback. Zero rendered successfully or recovered the expected content. Five returned BROWSER_NETWORK_POLICY (one Grainne Dolan home page and four Zahoot pages); five Paraclearth pages hit the eight-second DOM-content-load timeout. Static observations remained available, and no serious-looking finding was emitted. Failed execution does not establish absent website information.

## Repeated observations

1. **Serialized same-site dependency loading exceeds the DOM-content deadline.** All five Paraclearth pages start with an empty root and many same-site scripts/styles. The recorded transport shows successful 200 responses continuing across the script graph until the eight-second page.goto deadline. These are neither arbitrary third-party permission failures nor proof that the full twenty-second attempt budget is insufficient. Investigate separating initial document commitment from DOM readiness, within the unchanged total budget and concurrency.
2. **The single network-policy error does not identify the blocked resource.** Static declarations identify external font stylesheets on all three organisations, Bootstrap/jQuery on Grainne Dolan, and analytics/chat dependencies on Zahoot. These declarations alone do not prove that each resource was requested or essential. Add bounded, redacted per-request diagnostics before making further dependency decisions.
3. **Expected blocked assets can be confused with execution failure.** Code inspection shows URL/domain validation happens before the intentional image/font/media block. Test whether excluded non-content assets cause avoidable failure, while continuing to reject essential off-domain scripts/styles/data and all unsafe destinations without egress.
4. **Public browser navigation can differ from direct HTTP routing.** Three Grainne Dolan service/about routes returned direct HTTP 404 despite content in the separate browser. These were excluded from the confirmed-gap denominator; no rewrite, synthetic 200, service-worker reuse or HTTP-error bypass is justified. Three replacement targets were confirmed before baseline execution.

## Proposed bounded investigations

- Preserve the fixed 20-second total attempt budget, five attempts/site, request/byte/depth limits and serial transport. Use the initial navigation bound for document commitment and let the existing total deadline bound required script/DOM readiness.
- Record requested resource type, redacted URL, policy outcome and errors. Never retain cookie/header/body credentials or query values in these diagnostics.
- Block intentionally excluded resource types before classifying an essential dependency failure. This sends no new request and creates no egress exception.
- A narrowly recognizable font-provider CSS endpoint may be classified as an intentionally omitted font dependency, without fetching it. Do not generalize this to arbitrary stylesheets, scripts, chat widgets or APIs. Verify this against deterministic visibility and third-party rejection controls.
- Keep all other dependency failures conservative. Do not use a partial failed DOM as supporting evidence.

After changes this set becomes development data. Its post-fix outcomes must not be advertised as a new independent holdout. Human review of recovered output remains required, and these cross-jurisdiction/directory targets do not establish SRA applicability or live precision.
