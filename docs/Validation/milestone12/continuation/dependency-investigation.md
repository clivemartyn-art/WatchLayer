# Essential-dependency investigation

No new production third-party access is implemented. Actual failed browser requests are distinguished from static declarations and inferred necessity. A blocking exception proves an execution dependency, not that the complete expected page would recover if that resource were permitted.

## Static libraries

| Exact host/path | Type | Evidence and decision |
| --- | --- | --- |
| `unpkg.com/aos@next/dist/aos.js` | Script | Four continuation failures; subsequent `AOS is not defined`. Anonymous bounded GET returned 302 to `/aos@3.0.0-beta.6/dist/aos.js`, no Set-Cookie. Redirect not followed. Mutable alias, beta target and unknown final-resource behaviour: remain blocked. |
| `unpkg.com/aos@next/dist/aos.css` | Stylesheet | Same four pages. GET returned 302 to `/aos@3.0.0-beta.6/dist/aos.css`, no Set-Cookie; redirect not followed. CSS may affect visibility, so it cannot simply be removed or treated as a font stylesheet. |
| `cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css` | Stylesheet | Original GD01 failed request. Investigation returned 200, 161,409 bytes, no redirect or Set-Cookie; immutable cache directive. Exact version/path could be considered in a future policy, but necessity for recovered content was not isolated and no repeated continuation dependency on this asset was found. |
| `cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js` | Script | Original GD01 failed request. Investigation returned 200, 84,378 bytes, no redirect or Set-Cookie; immutable cache directive. Same conservative decision. |
| `code.jquery.com/jquery-3.5.1.slim.min.js` | Script | Original GD01 failed request. Investigation returned 200, 72,380 bytes, no redirect or Set-Cookie. Versioned name and measured hash are not proof that all scripts served by this host are safe or necessary. |

The read-only metadata investigation used exact observed URLs, HTTPS, GET, validated public DNS pinned to the connection, no query, cookies, credentials or referrer, 256KB/5-second limits and no redirect following. Bodies were hashed but not retained or executed. Results and hashes are under `reports/milestone12/continuation-library-metadata.json`. These point-in-time observations do not guarantee future cookie or redirect behaviour. No sensitive/request-specific data was sent; the servers necessarily observe connection metadata and a generic investigation user agent.

[UNPKG's documentation](https://unpkg.com/) distinguishes exact package versions from tags and describes redirects to resolved versions. That supports treating `next` as mutable, not as a permanent version. A future allow mechanism would need exact host/type/path, pinned version and integrity, no queries/cookies/credentials, validated redirects or none, and the existing transport limits. This investigation does not introduce such a mechanism.

## Dynamic off-domain data

- `cdn.contentful.com/spaces/szj1qktuhaw3/environments/master/entries`: actual XHR requests from CM01/CM02 (and CM03 on the later rerun), with query values redacted. CMS entries are dynamic site data despite the `cdn` hostname. Independent visible content and the requests indicate a likely content dependency, but the API payload, authorization scope, cookie requirements and redirects were not accessed. No website token was copied, transmitted or used to authorize access. Publicly visible browser content alone is insufficient to expand the scanner's site boundary. Remains blocked.
- `backenddev.aaerlaw.com/api/user/paraclearth_services`, `/paraclearth_about_us`, `/paraclearth_case_study_videos`, `/paraclearth_testimonials`: original-cohort dynamic fetches. Queries where present remain redacted. Ownership, authorization scope, cookies and redirects are unverified. These are not static library paths; no allowance is justified.

## Advertising, analytics and chat

- `www.googletagmanager.com/gtag/js` is an advertising/measurement dependency, not a static public-evidence library. Google's [tag documentation](https://developers.google.com/tag-platform/gtagjs) describes its measurement purpose. It remains blocked; no attempt was made to collect or permit tracking requests.
- `app.chatsguru.co/web.js` is the original cohort's chat-related dependency. Its business-content necessity, cookies and data transmission are unverified; it remains blocked.

These categories are not interchangeable. No tracking/chat/API dependency was allowed to manufacture a successful render. Successful continuation recovery already occurred through existing first-party transport. Safety takes precedence over additional coverage.
