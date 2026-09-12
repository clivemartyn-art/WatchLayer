# REGSTEAD WORDPRESS SITE PLAN

**Document status:** Active website implementation plan  
**Version:** 1.0  
**Date:** 12 September 2026  
**Primary domain:** regstead.co.uk  
**Secondary domain:** regstead.com → 301 redirect to regstead.co.uk  
**Public brand:** Regstead  
**Initial market:** SRA-regulated law firms in England and Wales

---

# 1. Website purpose

The first Regstead website is a **marketing and lead-generation site**, not the SaaS application.

Its jobs are to:

1. explain what Regstead does;
2. establish credibility;
3. explain the recurring-monitoring proposition;
4. demonstrate Regstead for Law Firms;
5. show a sample report;
6. capture free-scan requests;
7. support founding-customer sales;
8. host the required legal/privacy information.

The monitoring application should eventually live separately, e.g.:

`app.regstead.co.uk`

Do not turn WordPress itself into the monitoring engine.

---

# 2. Domain architecture

## Primary
`https://regstead.co.uk`

Use this as the canonical public website for the UK launch.

## Secondary
`https://regstead.com`

301 redirect every request to the equivalent URL on `regstead.co.uk`.

Examples:

`regstead.com/pricing/` → `regstead.co.uk/pricing/`

Do not run two duplicate WordPress installations.

## Future application
Reserve:

`app.regstead.co.uk`

Do not point it anywhere public until the SaaS application exists.

---

# 3. WordPress stack

## Theme
**Kadence Theme**

Reason:
- lightweight;
- global colours and fonts;
- strong header/footer builder;
- familiar workflow;
- good fit with the Regstead D1 design system.

## Block system
**Kadence Blocks**

Use Gutenberg/Kadence rather than a heavy page builder unless a later requirement genuinely needs one.

Avoid Elementor/Divi for the initial site.

## Forms
**Gravity Forms**

Use for:
- Free Scan request;
- Contact form;
- future beta onboarding form if desired.

## SEO
**Rank Math SEO**

Use one SEO plugin only.

## Email delivery
**WP Mail SMTP**

Configure transactional website email through a proper authenticated mail service/account rather than relying on default PHP mail.

## Cookie/privacy management
**Complianz**

Use for consent/cookie categorisation if analytics or other non-essential cookies are introduced.

## Backups
**UpdraftPlus**

Use scheduled remote backups if the host does not already provide robust independent backups.

## Security
**Wordfence**

Use firewall/login protection/security scanning sensibly.

Do not install multiple overlapping security suites.

## Caching/performance
Choose **one** solution based on the host:

- LiteSpeed server → LiteSpeed Cache;
- otherwise host cache / Cloudflare / WP Rocket as appropriate.

Do not stack multiple caching/minification plugins.

---

# 4. Plugins to avoid at launch

Do not install plugins simply because they are popular.

Avoid unnecessary:
- page builders;
- pop-up suites;
- animation libraries;
- social-feed plugins;
- multiple SEO plugins;
- multiple security plugins;
- multiple caching plugins;
- AI content plugins;
- live chat;
- WooCommerce;
- membership plugins.

Every plugin adds maintenance and attack surface.

---

# 5. Launch sitemap

## Core pages

### `/`
**Home**

Primary purpose:
Explain Regstead and drive Free Scan requests.

### `/how-it-works/`
**How It Works**

Explain:
Scan → Remember → Compare → Alert.

### `/law-firms/`
**Regstead for Law Firms**

Explain the initial sector use case without claiming compliance certification.

### `/pricing/`
**Pricing**

Show:
- Free Scan — £0
- Founding Monitor — £9.95/month, first 25 organisations
- Standard Monitor — £19/month after founding release

Do not publish Plus until it is a real product.

### `/free-scan/`
**Free Website Scan**

Primary conversion page.

### `/sample-report/`
**Sample Report**

Show screenshots/summary and allow the fictional Regstead sample report to be viewed/downloaded.

### `/about/`
**About Regstead**

Explain the problem, philosophy and evidence-first approach.

### `/contact/`
**Contact**

Simple contact form and business contact details.

---

## Legal pages

### `/privacy-policy/`
Privacy Notice

### `/terms/`
Terms of Service

### `/free-scan-terms/`
Free Scan Terms

### `/founding-beta-terms/`
Founding Beta Terms

Only expose Founding Beta Terms publicly if useful; alternatively link directly from onboarding/payment.

### `/cookie-policy/`
Cookie policy generated/reviewed through the consent setup where required.

---

## Later pages

Do not block launch for these:

### `/resources/`
Resources hub

### Initial articles
- website audit vs continuous monitoring;
- why “not observed” does not mean “missing”;
- managing SRA website pricing information;
- what happens after a law-firm website redesign;
- building a Regulatory Surface;
- monitoring complaints and regulatory information.

---

# 6. Header

Desktop structure:

**Left:** Regstead horizontal logo

**Navigation:**
- Product
- For Law Firms
- Pricing
- Sample Report
- About

**Right:**
- Log in — hide until application exists
- **Run a free scan** — primary CTA

For v1, Product may link directly to How It Works rather than use a dropdown.

Do not overpopulate the navigation.

---

# 7. Mobile header

Use:
- Regstead mark/wordmark;
- hamburger menu;
- persistent or clearly visible **Run a free scan** action.

Ensure menu tap targets are generous and the CTA is not hidden several levels deep.

---

# 8. Footer

## Column 1 — Brand

REGSTEAD

**Monitor what matters.**

Website monitoring for regulated businesses.

## Column 2 — Product

- How It Works
- For Law Firms
- Pricing
- Free Scan
- Sample Report

## Column 3 — Company

- About
- Contact
- Resources (when available)

## Column 4 — Legal

- Privacy Notice
- Terms
- Free Scan Terms
- Cookie Policy

## Footer disclaimer

> Regstead monitors publicly accessible website information. It does not provide legal advice or certify regulatory compliance.

## Copyright

`© 2026 Regstead. All rights reserved.`

Update year automatically if practical.

---

# 9. Global brand colours

Configure these in Kadence global colours.

## Core

**Regstead Navy**  
`#10263D`

Use for:
- headings;
- primary buttons;
- header/footer accents;
- strong UI text.

**Signal Teal**  
`#168678`

Use for:
- accents;
- icons;
- dividers;
- charts;
- status highlights;
- links where contrast is adequate.

Do not rely on white normal-size text over Signal Teal; contrast is borderline. Prefer Navy for primary button backgrounds.

**Slate**  
`#566675`

Use for:
- secondary text;
- captions;
- supporting UI.

**Mist**  
`#EFF4F5`

Use for:
- section backgrounds;
- cards;
- soft divisions.

**Signal Amber**  
`#D79A2B`

Use for:
- review/warning indicators;
- small accents.

Do not use amber for normal body text on white.

**Confirmed Red**  
`#B34A45`

Use sparingly for:
- confirmed broken/unavailable states;
- genuine issues.

**White**  
`#FFFFFF`

Primary page background.

---

# 10. Recommended Kadence global palette slots

Suggested mapping:

1. `#10263D` — Navy / primary
2. `#168678` — Teal / accent
3. `#566675` — Slate
4. `#EFF4F5` — Mist
5. `#D79A2B` — Amber
6. `#B34A45` — Red
7. `#FFFFFF` — White
8. `#F7F9FA` — Very light background
9. `#0B1726` — Deep navy utility/background

Do not introduce random colours per page.

---

# 11. Typography

## Headings
**Manrope**

Fallback:
`Manrope, Inter, system-ui, sans-serif`

## Body/UI
**Inter**

Fallback:
`Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

Use locally hosted or privacy-conscious font delivery where practical.

---

# 12. Typography scale

Desktop starting point:

- H1: 56px / 1.05 / 700
- H2: 40px / 1.10 / 700
- H3: 28px / 1.20 / 650–700
- H4: 22px / 1.25 / 650
- Body large: 20px / 1.55
- Body: 17px / 1.65
- Small: 14px / 1.5
- Eyebrow: 12–13px uppercase with letter spacing

Mobile:

- H1: 40–44px
- H2: 32px
- H3: 24px
- Body: 16–17px

Avoid tiny legal/footer text.

---

# 13. Layout system

Maximum content width:
**1200–1240px**

Main text width:
**680–760px**

Section vertical spacing desktop:
**88–112px**

Section vertical spacing mobile:
**56–72px**

Card radius:
**10–14px**

Buttons:
**8–10px radius**

Avoid excessive rounded “bubble SaaS” styling.

Regstead should feel professional rather than playful.

---

# 14. Buttons

## Primary

Background:
`#10263D`

Text:
white

Label examples:
- Run a free scan
- Request my baseline report
- Join the founding programme

Hover:
slightly lighter/darker Navy, not a dramatic animation.

## Secondary

White or transparent background.

Navy border and Navy text.

Examples:
- See how it works
- View sample report

## Avoid

- giant pill buttons;
- gradient buttons;
- animated glow;
- excessive icons;
- aggressive red CTAs.

---

# 15. Homepage structure

## Section 1 — Hero

Eyebrow:
**WEBSITE MONITORING FOR REGULATED BUSINESSES**

H1:
**Stay on top of what matters.**

Body:
Regstead continuously monitors important information across your website and tells you when something disappears, breaks or changes materially.

Primary CTA:
**Run a free website scan**

Secondary:
**See how it works**

Visual:
Regstead dashboard/report UI, not generic stock-lawyer imagery.

---

## Section 2 — Problem

Heading:
**Important information can change without anyone meaning to change it.**

Use concise examples:
- redesign removes a link;
- pricing page is edited;
- PDF is replaced;
- complaints page breaks;
- regulatory reference disappears.

Finish with:

**Most website checks tell you what is wrong today. Regstead remembers what was there before.**

---

## Section 3 — How it works

Four cards:

1. Scan
2. Remember
3. Compare
4. Alert

Keep copy short.

---

## Section 4 — What Regstead monitors

Cards for:
- website health;
- regulatory information;
- published pricing;
- documents and forms;
- meaningful content changes;
- change history.

---

## Section 5 — Regstead remembers

Use a simple before/after/change visual.

Message:

**A website audit is a snapshot. Regstead is ongoing.**

---

## Section 6 — Product example

Show realistic statuses:

- Pricing page updated — Review
- Complaints page — Confirmed
- Staff link — Confirmed 404
- Regulatory document — Could not confirm

This is one of the most important trust-building sections.

---

## Section 7 — Law firms

Heading:
**Built first for law firms.**

Explain SRA-facing public website information without claiming SRA endorsement or compliance certification.

CTA:
**Explore Regstead for Law Firms**

---

## Section 8 — Philosophy

Heading:
**Better alerts, not more alerts.**

Explain:
- evidence before assumption;
- not observed ≠ removed;
- uncertainty is reported honestly.

---

## Section 9 — Pricing teaser

Show Founding Monitor.

Do not turn the homepage into a complex pricing grid.

---

## Section 10 — Final CTA

Heading:
**Your website changes. Regstead notices.**

CTA:
**Run a free website scan**

---

# 16. Free Scan form

Build in Gravity Forms.

## Required fields

### Firm / organisation name
Required.

### Website URL
Required.

Validate as URL.

### Your name
Required.

### Work email
Required.

### Role
Optional dropdown:
- Managing Partner
- Partner
- Practice Manager
- Operations
- Compliance / COLP / COFA
- Marketing / Digital
- Other

### Consent / acknowledgement
Required checkbox:

> I confirm that I am requesting a scan of publicly accessible information on this website and agree to the Free Scan Terms and Privacy Notice.

This is not a marketing-consent box.

## Marketing preference
Separate optional checkbox if marketing email consent is being sought:

> I would also like to receive occasional Regstead product updates.

Do not pre-tick it.

## Submit button
**Run my free scan**

---

# 17. Free Scan confirmation

Do not promise instant automated results until the system genuinely provides them.

Initial message:

> **Thanks — your Regstead scan request has been received.**
>
> We’ll analyse the publicly accessible website information you submitted and prepare your baseline findings.
>
> During the founding beta, reports may be manually reviewed before they are sent.

Then provide:
- expected communication route;
- link to sample report;
- link to How It Works.

Do not promise a delivery time until operational capacity is known.

---

# 18. Contact form

Fields:
- Name
- Work email
- Organisation
- Message

Optional:
- Website URL

Keep it simple.

Add spam protection using Gravity Forms-supported anti-spam options.

Avoid intrusive CAPTCHA unless needed.

---

# 19. Email configuration

Create:

- `hello@regstead.co.uk`
- `support@regstead.co.uk`
- `reports@regstead.co.uk`

Possible later:
- `privacy@regstead.co.uk`
- `billing@regstead.co.uk`

Do not create many unnecessary mailboxes initially.

Set up:
- SPF
- DKIM
- DMARC

Configure WP Mail SMTP using authenticated delivery.

Gravity Forms notifications should not depend on unauthenticated PHP mail.

---

# 20. SEO setup

## Rank Math

Configure:
- site name: Regstead
- organisation schema;
- logo;
- canonical URLs;
- XML sitemap;
- titles/meta;
- social share image;
- robots settings;
- Open Graph.

Do not turn on every optional module.

---

# 21. Homepage SEO

Title:

**Regstead | Website Monitoring for Regulated Businesses**

Meta description:

**Regstead monitors important public website information and alerts regulated organisations when pages, documents, pricing or regulatory signals change.**

Canonical:
`https://regstead.co.uk/`

---

# 22. Law-firm page SEO

Title:

**Regstead for Law Firms | Website Monitoring for SRA-Regulated Firms**

Meta description:

**Monitor important public-facing SRA, complaints and pricing information and identify meaningful website changes with Regstead.**

Primary search themes:
- law firm website monitoring;
- SRA website transparency;
- law firm pricing transparency;
- solicitor website compliance monitoring.

Do not keyword-stuff.

---

# 23. Free Scan SEO

Title:

**Free Regstead Website Scan**

Meta description:

**Run a free Regstead website scan and identify important technical, content and regulatory website signals.**

Consider `noindex` only if the page becomes thin/utility-only; initially it can remain indexable if it has useful explanatory content.

---

# 24. Technical SEO

Before launch confirm:

- one HTTPS canonical hostname;
- www/non-www redirected consistently;
- regstead.com redirected;
- XML sitemap works;
- robots.txt sensible;
- no staging URLs indexed;
- no demo content;
- no tag/archive clutter;
- no author archives if unnecessary;
- no attachment pages;
- custom 404 page;
- proper favicon;
- social image;
- breadcrumbs only where helpful;
- descriptive image alt text;
- clean permalink structure.

Recommended post URL:
`/resources/post-name/`

Pages remain at root-level slugs.

---

# 25. Analytics

Do not delay launch for complicated analytics.

Minimum useful events:
- free scan started;
- free scan submitted;
- sample report viewed/downloaded;
- pricing CTA clicked;
- contact submitted.

Use privacy-conscious configuration and consent correctly for non-essential analytics.

Do not install multiple analytics tools at launch.

---

# 26. Cookie/privacy setup

Before analytics or non-essential tracking goes live:

- configure cookie categories;
- block non-essential scripts until appropriate consent;
- link Privacy Notice;
- publish Cookie Policy;
- make consent preferences easy to reopen/change.

Avoid manipulative cookie banners.

---

# 27. Security baseline

Before launch:

- current WordPress;
- current theme/plugins;
- strong unique admin password;
- 2FA for administrator account;
- least-privilege users;
- disable/remove unused plugins/themes;
- automated backups;
- SSL;
- Wordfence configured sensibly;
- XML-RPC restricted if not needed;
- login alerts where useful;
- no default `admin` username if avoidable.

Do not expose staging/admin credentials in project files.

---

# 28. Performance baseline

Target:
fast, simple marketing site.

Use:
- WebP/AVIF where supported;
- appropriately sized images;
- limited font weights;
- lazy loading below fold;
- caching;
- minification only where stable;
- no autoplay video;
- no huge animation libraries.

The homepage should not become heavy because the product is technical.

---

# 29. Accessibility

Minimum standards:

- semantic heading order;
- keyboard usable navigation;
- visible focus states;
- labelled form fields;
- meaningful error messages;
- sufficient colour contrast;
- do not communicate status by colour alone;
- alt text for meaningful images;
- decorative images have empty alt;
- buttons are actual buttons/links;
- touch targets suitable for mobile.

Especially important:
Regstead reports uncertainty/status using label + icon/text, never colour alone.

---

# 30. Imagery

Preferred:
- product UI;
- report excerpts;
- abstract architecture/order;
- clean professional environments;
- subtle information/data visuals.

Avoid:
- scales of justice;
- gavels;
- generic handshakes;
- stock solicitors pointing at laptops;
- padlocks/shields;
- dramatic warning imagery.

The product itself should become the strongest visual asset.

---

# 31. WordPress build order

## Stage 1 — Foundation

1. DNS live.
2. SSL.
3. WordPress installed.
4. permalink settings.
5. Kadence Theme.
6. Kadence Blocks.
7. global colours.
8. fonts.
9. logo/favicon.
10. header/footer.

## Stage 2 — Core pages

11. Home.
12. How It Works.
13. Law Firms.
14. Pricing.
15. Sample Report.
16. About.
17. Contact.
18. Free Scan.

## Stage 3 — Forms/email

19. Gravity Forms.
20. Free Scan form.
21. Contact form.
22. WP Mail SMTP.
23. test notifications/replies.

## Stage 4 — Legal/privacy

24. Privacy.
25. Terms.
26. Free Scan Terms.
27. Founding Beta Terms as appropriate.
28. cookie/consent setup.

## Stage 5 — SEO/security/performance

29. Rank Math.
30. sitemap/meta/schema.
31. Wordfence.
32. backups.
33. cache.
34. image optimisation.
35. redirects.

## Stage 6 — QA

36. desktop.
37. tablet.
38. mobile.
39. forms.
40. email delivery.
41. links.
42. legal links.
43. cookie consent.
44. page titles/meta.
45. speed.
46. accessibility.
47. search-engine visibility.

---

# 32. Launch checklist

## Domain / hosting
- [ ] regstead.co.uk registration complete
- [ ] regstead.com registration complete
- [ ] regstead.co.uk points to host
- [ ] regstead.com 301 redirects
- [ ] SSL active
- [ ] HTTPS forced
- [ ] canonical hostname chosen

## Brand
- [ ] approved D1 logo
- [ ] favicon
- [ ] global colours
- [ ] Manrope headings
- [ ] Inter body
- [ ] button styles
- [ ] mobile header

## Content
- [ ] Home
- [ ] How It Works
- [ ] For Law Firms
- [ ] Pricing
- [ ] Free Scan
- [ ] Sample Report
- [ ] About
- [ ] Contact
- [ ] footer disclaimer

## Forms
- [ ] Free Scan form
- [ ] Contact form
- [ ] confirmation messages
- [ ] admin notifications
- [ ] customer acknowledgements
- [ ] spam protection
- [ ] terms/privacy links

## Email
- [ ] hello@
- [ ] support@
- [ ] reports@
- [ ] SPF
- [ ] DKIM
- [ ] DMARC
- [ ] authenticated WordPress mail
- [ ] test delivery to Gmail/Outlook

## Legal/privacy
- [ ] Privacy Notice published
- [ ] Terms published
- [ ] Free Scan Terms published
- [ ] Cookie Policy published where required
- [ ] consent configuration tested
- [ ] no non-essential tracking fires before consent where consent is required

## SEO
- [ ] Rank Math configured
- [ ] titles/meta
- [ ] canonical URLs
- [ ] sitemap
- [ ] robots.txt
- [ ] Open Graph
- [ ] organisation schema
- [ ] Search Console after launch
- [ ] Bing Webmaster Tools optional

## Security
- [ ] WordPress updated
- [ ] plugins updated
- [ ] unused plugins deleted
- [ ] 2FA
- [ ] backups
- [ ] security scan
- [ ] secure admin accounts

## QA
- [ ] Chrome
- [ ] Edge
- [ ] Safari/mobile Safari where possible
- [ ] Android/mobile viewport
- [ ] all links
- [ ] forms
- [ ] 404
- [ ] cookie banner
- [ ] no placeholder text
- [ ] no staging references
- [ ] no accidental `noindex`
- [ ] no broken images

---

# 33. What can wait

Do not delay the first outreach batch for:

- blog library;
- customer portal;
- automated scanner integration;
- Stripe checkout embedded in WordPress;
- sophisticated animations;
- live chat;
- testimonials that do not yet exist;
- detailed case studies;
- Plus pricing;
- dozens of resource pages.

The first site needs to be **credible, clear and conversion-ready**, not complete forever.

---

# 34. First-launch definition

The WordPress site is ready for the first Regstead outreach when a prospect can:

1. arrive at regstead.co.uk;
2. understand the proposition in under 30 seconds;
3. see that Regstead is designed for regulated organisations;
4. understand that it monitors rather than certifies compliance;
5. see a professional sample report;
6. understand founding pricing;
7. request a free scan;
8. read the privacy/legal information;
9. contact the business;
10. trust that Regstead is a real, coherent product.

---

# 35. Codex note

This WordPress plan is a marketing-site specification.

It does **not** authorise changes to the WatchLayer engine during Milestone 5.

Future integration between WordPress and the Regstead application/free-scan API should be specified in a dedicated milestone after Milestone 5 is accepted.

---

**End of WORDPRESS_SITE_PLAN.md**
