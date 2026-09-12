import { createRequire } from 'node:module';
const robotsParser = createRequire(import.meta.url)('robots-parser') as (url: string, body: string) => { isAllowed(url: string, agent: string): boolean|undefined };
import { createFetcher, USER_AGENT, type Fetcher } from './http.js';
import { normalize, sameDomain } from '../utils/urls.js';
import { parseSitemap } from '../discovery/sitemap.js';
import { extractPage } from '../extractors/page.js';
import { documentType } from '../links/classify.js';
import type { ScanResult, Contact, Document } from '../schemas/scan.js';
import type { CrawlObservation } from './observations.js';

export interface ScanOptions { maxPages?: number; delayMs?: number; timeoutMs?: number; onPageResult?: (observation: CrawlObservation) => void; /** Trusted test seam; never exposed through CLI. */ fetcher?: Fetcher }
export async function scan(inputUrl: string, options: ScanOptions = {}): Promise<ScanResult> {
  const start = normalize(inputUrl); const maxPages = options.maxPages ?? 100;
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('Page limit must be a positive integer');
  const fetch = options.fetcher ?? createFetcher(start, options.delayMs, options.timeoutMs);
  const result: ScanResult = {schemaVersion: 1, site: {inputUrl, canonicalUrl: start, hostname: new URL(start).hostname, scannedAt: new Date().toISOString()}, discovery: {robotsFound: false, sitemapFound: false, sitemapUrlsFound: 0}, summary: {pagesDiscovered: 0, pagesScanned: 0, pagesFailed: 0, brokenInternalLinks: 0, documentsFound: 0, formsFound: 0, emailsFound: 0, phoneNumbersFound: 0, browserRenderRecommended: 0, crawlLimitReached: false}, pages: [], documents: [], forms: [], brokenLinks: [], contacts: {emails: [], phones: []}, errors: []};
  const error = (url: string, stage: string, e: unknown, status?: number) => result.errors.push({url, stage, message: e instanceof Error ? e.message : String(e), ...(status ? {status} : {})});
  const queue: string[] = []; const discovered = new Set<string>(); const fetched = new Set<string>();
  const sources = new Map<string, Set<string>>(); const failures = new Map<string, {status?: number; error?: string}>();
  const docs = new Map<string, Document>();
  function addDocument(url: string, source: string) {
    const type = documentType(url); if (!type) return;
    const doc = docs.get(url) ?? {url, type, filename: new URL(url).pathname.split('/').pop() ?? '', sourcePages: []};
    if (source && !doc.sourcePages.includes(source)) doc.sourcePages.push(source); docs.set(url, doc);
  }
  function enqueue(raw: string, base = start, source?: string) {
    try {
      const url = normalize(raw, base); if (!sameDomain(url, start)) return;
      if (documentType(url)) { addDocument(url, source ?? base); return; }
      if (source) { const refs = sources.get(url) ?? new Set<string>(); refs.add(source); sources.set(url, refs); }
      if (!discovered.has(url) && discovered.size < 10000) { discovered.add(url); queue.push(url); }
    } catch { /* Unsupported discovered URLs are not fetched. */ }
  }
  const policies = new Map<string, ReturnType<typeof robotsParser>>();
  const sitemapQueue = [`${new URL(start).origin}/sitemap.xml`];
  async function robots(origin: string) {
    if (policies.has(origin)) return policies.get(origin)!;
    const url = `${origin}/robots.txt`; let body = '';
    try {
      const response = await fetch(url);
      if (response.status >= 200 && response.status < 300) {
        body = response.body; result.discovery.robotsFound = true;
        for (const match of body.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) sitemapQueue.push(match[1]);
      } else if (response.status === 401 || response.status === 403 || response.status >= 500) { body = 'User-agent: *\nDisallow: /'; error(url, 'robots', 'Robots unavailable; origin skipped conservatively', response.status); }
    } catch (e) { error(url, 'robots', e); body = 'User-agent: *\nDisallow: /'; }
    const policy = robotsParser(url, body); policies.set(origin, policy); return policy;
  }
  enqueue(start); await robots(new URL(start).origin);
  const sitemapSeen = new Set<string>(); const sitemapPages = new Set<string>();
  while (sitemapQueue.length && sitemapSeen.size < 20) {
    const raw = sitemapQueue.shift()!; let url = raw;
    try {
      url = normalize(raw, start); if (!sameDomain(url, start) || sitemapSeen.has(url)) continue;
      sitemapSeen.add(url);
      const policy = await robots(new URL(url).origin); if (policy.isAllowed(url, USER_AGENT) === false) continue;
      const response = await fetch(url); if (response.status === 404) continue;
      const finalSitemapUrl = normalize(response.finalUrl);
      if (finalSitemapUrl !== url && sitemapSeen.has(finalSitemapUrl)) continue;
      sitemapSeen.add(finalSitemapUrl);
      if (response.status < 200 || response.status >= 300) throw new Error(`Sitemap HTTP ${response.status}`);
      const parsed = parseSitemap(response.body); result.discovery.sitemapFound = true;
      for (const rawPage of parsed.pages.slice(0,10000)) { try { const page = normalize(rawPage, response.finalUrl); if (sameDomain(page,start)) { sitemapPages.add(page); enqueue(page); } } catch { /* Ignore bad entries. */ } }
      for (const nested of parsed.sitemaps.slice(0,100)) sitemapQueue.push(normalize(nested,response.finalUrl));
    } catch (e) { error(url, 'sitemap', e); }
  }
  result.discovery.sitemapUrlsFound = sitemapPages.size;
  let attempted = 0;
  while (queue.length && attempted < maxPages) {
    const url = queue.shift()!; if (fetched.has(url)) continue;
    const policy = await robots(new URL(url).origin);
    if (policy.isAllowed(url, USER_AGENT) === false) { error(url, 'robots', 'Skipped by robots.txt'); options.onPageResult?.({url,state:'excluded_from_scan',reason:'Skipped by robots.txt'}); continue; }
    fetched.add(url); attempted++;
    try {
      const response = await fetch(url);
      options.onPageResult?.({url,finalUrl:response.finalUrl,status:response.status,contentType:response.contentType,responseTimeMs:response.responseTimeMs,redirects:response.redirects,state:'retrieved'});
      const alreadyRetrieved = fetched.has(response.finalUrl) && response.finalUrl !== url;
      fetched.add(response.finalUrl);
      if (url === start) { result.site.canonicalUrl = response.finalUrl; result.site.hostname = new URL(response.finalUrl).hostname; }
      if (alreadyRetrieved) {
        const failure = failures.get(response.finalUrl);
        if (failure) failures.set(url, failure);
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        result.summary.pagesFailed++; error(url,'page',`HTTP ${response.status}`,response.status);
        // Access controls, throttling and server failures are inconclusive,
        // not evidence that a destination no longer exists.
        if (response.status === 404 || response.status === 410) {
          failures.set(url,{status: response.status});
          failures.set(response.finalUrl,{status: response.status});
        }
        continue;
      }
      if (!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(response.contentType)) continue;
      const page = extractPage(response); result.pages.push(page); result.forms.push(...page.forms);
      for (const link of page.internalLinks) enqueue(link, page.finalUrl, page.finalUrl);
      for (const link of page.documentLinks) addDocument(link, page.finalUrl);
    } catch (e) { result.summary.pagesFailed++; error(url, 'page', e); options.onPageResult?.({url,state:'unreachable',reason:e instanceof Error ? e.message : String(e)}); }
  }
  for (const url of queue) if (!fetched.has(url)) options.onPageResult?.({url,state:'not_observed',reason:'Outside the crawl budget'});
  for (const [destinationUrl, failure] of failures) for (const sourcePage of sources.get(destinationUrl) ?? []) result.brokenLinks.push({sourcePage,destinationUrl,...failure});
  function contacts(kind: 'emails'|'phones'): Contact[] {
    const map = new Map<string, Set<string>>();
    for (const page of result.pages) for (const value of page[kind]) { const refs = map.get(value) ?? new Set<string>(); refs.add(page.finalUrl); map.set(value,refs); }
    return [...map].map(([value, refs]) => ({value, sourcePages: [...refs]}));
  }
  result.documents = [...docs.values()]; result.contacts = {emails: contacts('emails'), phones: contacts('phones')};
  Object.assign(result.summary, {pagesDiscovered: discovered.size, pagesScanned: result.pages.length, brokenInternalLinks: result.brokenLinks.length, documentsFound: result.documents.length, formsFound: result.forms.length, emailsFound: result.contacts.emails.length, phoneNumbersFound: result.contacts.phones.length, browserRenderRecommended: result.pages.filter(p => p.browser_render_recommended).length, crawlLimitReached: queue.some(url => !fetched.has(url)) && attempted >= maxPages});
  return result;
}
