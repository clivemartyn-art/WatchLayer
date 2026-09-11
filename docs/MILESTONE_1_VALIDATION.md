# Milestone 1 public-site validation

Validated 11 September 2026. No Milestone 2 functionality was added.

## Method

Four public sites were scanned sequentially with the existing default 100-page budget, a deliberately slower 600 ms minimum request interval, public-network/DNS protections, robots policies, timeouts, redirect limit and 2 MB response cap. No forms were submitted or documents downloaded. Baseline scans used the production HTTP transport. Responses and errors were retained in the ignored local `reports/hardening/` folder for offline reproduction.

The hardened scanner then replayed all four recorded scans with no missing response fixtures. This verified changes against the same content without repeating 301 public page requests. Five additional targeted live page checks examined www/non-www redirects, pagination and a discovered subdomain, after checking their robots policies. Tests use synthetic fixtures, not copied website content or live dependencies.

## Websites and measured results

| Website | Role | Discovered | Scanned | Failed | Sitemap result | Live duration |
|---|---|---:|---:|---:|---|---:|
| [Wholegrain Digital](https://www.wholegraindigital.com/) | WordPress business/agency; several sitemap indexes and subdomain | 779 | 100 | 0 | Found; 763 page URLs | 75 s |
| [Bates Wells & Braithwaite, Ipswich](https://bates-wells.co.uk/) | Smaller WordPress professional-services site | 201 | 100 | 0 | Found; 179 page URLs; advertised RSS unsupported | 86 s |
| [GOV.UK](https://www.gov.uk/) | Large sitemap and navigation/search corpus | 2,219 | 100 | 0 | Index found; 0 page URLs imported because child maps exceeded 2 MB | 79 s |
| [Netlify app](https://app.netlify.com/) | Public JavaScript application shell, without login | 1 | 1 | 0 | No valid sitemap; HTML fallback rejected | 2 s |

Robots.txt was found for all four. The first three reached the page budget: these are samples, not exhaustive site assessments. Durations are baseline wall-clock measurements and exclude follow-up probes and offline replay. Failed-page counts exclude discovery errors.

| Website | Confirmed broken links | Documents | Form occurrences | Unique email values | Unique telephone values, hardened | Browser-render flags |
|---|---:|---:|---:|---:|---:|---:|
| Wholegrain Digital | 0 | 12 | 102 | 0 | 2 | 0 |
| Bates Wells & Braithwaite | 0 | 6 | 301 | 6 | 4 | 0 |
| GOV.UK | 0 | 0 | 211 | 5 | 4 | 0 |
| Netlify app | 0 | 0 | 0 | 0 | 0 | 1 |

The hardened replay preserved all discovery/page/document/form/email counts. Bates Wells originally reported five phone values: one was a false combination of a telephone and street number. GOV.UK still has four values, but one incorrect value was replaced by the correctly extracted phone. Phone totals count normalized strings, not verified unique phone lines; UK national and international formats can represent the same number. Form totals count each occurrence, including repeated navigation/footer forms, not distinct business processes.

## Issues discovered and fixes

1. **Newsletter form context missed.** Wholegrain's subscription heading is outside its form, so 100 newsletter occurrences were classified `unknown`. The extractor now considers a small immediate wrapper containing one form, with email/no-message-field constraints. All 100 classify as newsletter on replay. Search field types are also recognized without requiring English search labels. Broad page text cannot relabel a contact form.
2. **Consent UI polluted text.** Bates Wells' Complianz banner and hidden preference controls appeared on every scanned page. Explicit known consent-container selectors now remove that UI without removing cookie-policy articles or footer contacts. Banner markers fell from 100 pages to zero. Total extracted text fell from 508,000 to 462,104 characters; all six email values were preserved.
3. **Phone numbers absorbed adjacent numbers.** A sentence-ending period joined a Bates Wells phone with the following street number; GOV.UK's `24-hour service` after a `<br>` became part of a phone number. Contact extraction now preserves HTML block/line boundaries and only accepts phone-format dots directly between digits. Normal report text remains whitespace-normalized.
4. **Redirect aliases were not fully deduplicated.** Wholegrain's `/sitemap.xml` redirects to its separately advertised `/sitemap_index.xml`, causing redundant retrieval/parsing. Discovery now remembers the observed final URL, reducing the replay from 122 to 121 requests. Follow-up probes confirmed Bates Wells' www-to-apex and Wholegrain's apex-to-www redirects; review showed these aliases could produce duplicate page/form records when both enter the queue. Page records now deduplicate by final URL. A previously unknown alias can still require a network request to discover its destination.
5. **Inconclusive failures could be called broken links.** Inspection of the error path showed that 403, 429, 5xx and transport failures were treated as broken destinations. This was reproduced with deterministic fixtures, not observed as a live-site failure. Only 404/410 now enter `brokenLinks`; inconclusive failures remain structurally recorded in `errors` and `pagesFailed`. Missing destinations reached through redirects retain both source-link URL references.

## Inspection coverage and remaining limitations

- **Duplicate URLs and canonicalisation:** no duplicate final page records or HTML canonical/final mismatches in the 301-page baseline sample. Fragment/tracking normalization and query sorting remain unchanged. Sitemap alias duplication was fixed. Redirect probes confirmed both www directions. Distinct non-root trailing slashes remain distinct until a redirect proves equivalence.
- **Queries, pagination and traps:** Bates Wells exposed three functional query URLs; GOV.UK exposed pagination and many `step-by-step-nav` URLs. Wholegrain exposed numbered blog pages. No query explosion, repeated request URL or pagination loop occurred within the samples. Targeted page-2 checks returned HTTP 200. No calendar trap was encountered. The scanner does not claim general trap detection; the existing 100-page and discovery bounds remain the backstop. Functional query parameters are retained rather than indiscriminately stripped.
- **Relative links and subdomains:** no malformed-relative-link failures appeared. Wholegrain's granary subdomain was discovered through sitemaps and links; a robots-checked follow-up fetched its homepage successfully. Scope remains the registrable domain and every transport request retains DNS/private-address protections.
- **Broken links:** no confirmed broken destination was observed among fetched pages. Unvisited URLs are not proven healthy. Error classification and redirect-to-missing source attribution are covered by regression fixtures.
- **Documents:** all literal `.pdf` links in the sampled HTML were present in the document output; 18 documents were catalogued across the two businesses. No document content was downloaded. Zero on the GOV.UK sample does not imply no documents exist there. Extensionless or script-generated downloads remain unsupported.
- **Forms and repeated navigation/footer content:** repeated forms are actual HTML occurrences; no forms were submitted. One Bates Wells filter form and GOV.UK feedback forms remain `unknown`, which is preferable to unsupported classification. Navigation/footer content is intentionally retained, including useful contact details; there is no global boilerplate deduplication. It caused no crawl multiplication in the sample.
- **Text size:** maximum hardened page text was 41,648 characters on Wholegrain, 7,373 on Bates Wells, 63,336 on GOV.UK, and zero on Netlify's shell. Inspected long pages contain substantive article/list content rather than an unbounded extraction problem. The transport cap remains 2 MB. External CSS and arbitrary consent implementations can still produce noise.
- **Large/malformed sitemaps:** GOV.UK's 19 attempted child maps each exceeded the cap; discovery recorded errors and all 100 HTML pages were reached through internal links. The cap was not relaxed. Bates Wells' advertised RSS is not a standard XML sitemap; Netlify returns HTML for the sitemap path. Both are reported without stopping the crawl. Very large and compressed sitemap coverage remains limited.
- **JavaScript:** Netlify's static shell was correctly flagged. No browser rendering or authenticated access was attempted. The flag remains a heuristic, not a complete test of browser dependence.

## Regression tests and verification

Added 14 tests in `tests/hardening.test.ts`:

- Newsletter wrapper context; contact-context isolation; typed search fields.
- Consent-banner exclusion with policy/footer preservation.
- Phone versus street number; dotted phone formatting; phone versus hours after a line break.
- Sitemap redirect deduplication; www page/form deduplication.
- 403, 429, 500 and timeout uncertainty; redirect-to-410 source attribution.

Final verification: **71 tests passed**, TypeScript checking passed, build passed, and npm dependency audit reported **zero vulnerabilities**. No dependency changes were needed.

## Readiness

Milestone 1 is ready to serve as the foundation for Milestone 2, with the documented static-HTML and bounded-coverage limitations. Future snapshots must retain crawl limits, skipped/unvisited URLs and discovery errors so incomplete observations are not mistaken for removals. No snapshots, persistence, repeat-scan feature, change detection, browser rendering, AI, rules, authentication, dashboard or billing were implemented.
