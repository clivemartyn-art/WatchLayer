import { createRequire } from 'node:module';
const robotsParser = createRequire(import.meta.url)('robots-parser') as (url: string, body: string) => { isAllowed(url: string, agent: string): boolean|undefined };
import { createFetcher, USER_AGENT, type Fetcher } from './http.js';
import { normalize, sameDomain } from '../utils/urls.js';
import { parseSitemap } from '../discovery/sitemap.js';
import { extractPage } from '../extractors/page.js';
import { documentType } from '../links/classify.js';
import type { ScanResult, Contact, Document } from '../schemas/scan.js';
import type { CrawlObservation } from './observations.js';
import { load } from 'cheerio';
import { processPdfs } from '../documents/process.js';
import type { DocumentReferrer } from '../documents/types.js';

export interface CrawlPolicy {profile:string;priority:(url:string)=>number|null;stages:{name:string;budget:number;priority:(url:string)=>number|null}[]}
export interface ScanOptions { pdfExtraction?:boolean; maxPages?: number; delayMs?: number; timeoutMs?: number; crawlPolicy?:CrawlPolicy; onPageResult?: (observation: CrawlObservation) => void; /** Trusted test seam; never exposed through CLI. */ fetcher?: Fetcher }
export async function scan(inputUrl: string, options: ScanOptions = {}): Promise<ScanResult> {
  const start = normalize(inputUrl); const maxPages = options.maxPages ?? 100;
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new Error('Page limit must be a positive integer');
  const fetch = options.fetcher ?? createFetcher(start, options.delayMs, options.timeoutMs);
  const result: ScanResult = {schemaVersion: 1, site: {inputUrl, canonicalUrl: start, hostname: new URL(start).hostname, scannedAt: new Date().toISOString()}, discovery: {robotsFound: false, sitemapFound: false, sitemapUrlsFound: 0}, summary: {pagesDiscovered: 0, pagesScanned: 0, pagesFailed: 0, brokenInternalLinks: 0, documentsFound: 0, formsFound: 0, emailsFound: 0, phoneNumbersFound: 0, browserRenderRecommended: 0, crawlLimitReached: false}, pages: [], documents: [], forms: [], brokenLinks: [], contacts: {emails: [], phones: []}, errors: []};
  const error = (url: string, stage: string, e: unknown, status?: number) => result.errors.push({url, stage, message: e instanceof Error ? e.message : String(e), ...(status ? {status} : {})});
  const queue: string[] = []; const discovered = new Set<string>(); const fetched = new Set<string>();
  const sources = new Map<string, Set<string>>(); const failures = new Map<string, {status?: number; error?: string}>();
  const docs = new Map<string, Document>();
  const docReferrers=new Map<string,DocumentReferrer[]>();
  function addDocument(url: string, source: string,detectedType?:string) {
    const type = detectedType??documentType(url); if (!type) return;
    const doc = docs.get(url) ?? {url, type, filename: new URL(url).pathname.split('/').pop() ?? '', sourcePages: []};
    if (source && !doc.sourcePages.includes(source)) doc.sourcePages.push(source); docs.set(url, doc);
  }
  function enqueue(raw: string, base = start, source?: string) {
    try {
      const url = normalize(raw, base); if (!sameDomain(url, start)) return;
      if (documentType(url)) { addDocument(url, source ?? base); return; }
      if (source) { const refs = sources.get(url) ?? new Set<string>(); refs.add(source); sources.set(url, refs); }
      if (!discovered.has(url)) {
        if(discovered.size>=10000&&options.crawlPolicy){
          // At capacity, allow a relevant newly linked URL to replace a lower-ranked
          // queued candidate. The bounded set never grows beyond the original cap.
          const importance=(candidate:string)=>Math.max(...[options.crawlPolicy!.priority,...options.crawlPolicy!.stages.map(s=>s.priority)].map(score=>score(candidate)??-Infinity));
          const incoming=importance(url);let worst=-1,lowest=incoming;
          if(incoming>0)for(let i=0;i<queue.length;i++)if(!fetched.has(queue[i])){const score=importance(queue[i]);if(score<lowest){lowest=score;worst=i;break;}}
          if(worst>=0){const removed=queue.splice(worst,1)[0];discovered.delete(removed);}
        }
        if(discovered.size<10000){discovered.add(url);queue.push(url);}
      }
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
  let attempted = 0;let limitReached=false;
  const stages=[{name:'natural',budget:maxPages,priority:options.crawlPolicy?.priority??(()=>0)},...(options.crawlPolicy?.stages??[])];
  if(stages.some(s=>!Number.isInteger(s.budget)||s.budget<0))throw new Error('Invalid crawl stage budget');
  if(options.crawlPolicy)result.crawlStages=[];
  async function allowed(url:string){if(!sameDomain(url,start))throw new Error('Outside target domain');const policy=await robots(new URL(url).origin);if(policy.isAllowed(url,USER_AGENT)===false)throw new Error('Excluded by robots.txt');}
  for(const stage of stages){
  let stageAttempts=0,selections=0,skipped=0;const before=result.pages.length;
  const rank=(url:string)=>url===start?Infinity:stage.priority(url);
  while (queue.length && stageAttempts < stage.budget && (stage.name==='natural'||selections<stage.budget)) {
    let selected=-1,best=-Infinity;
    for(let i=0;i<queue.length;i++){if(fetched.has(queue[i]))continue;const score=rank(queue[i]);if(score!==null&&(selected<0||score>best)){selected=i;best=score;}}
    if(selected<0)break;
    const url=queue.splice(selected,1)[0];selections++;
    const policy = await robots(new URL(url).origin);
    if (policy.isAllowed(url, USER_AGENT) === false) { fetched.add(url);skipped++;error(url, 'robots', 'Skipped by robots.txt'); options.onPageResult?.({url,state:'excluded_from_scan',reason:'Skipped by robots.txt'}); continue; }
    fetched.add(url); attempted++;stageAttempts++;
    try {
      const response = await fetch(url,{beforeRequest:allowed});
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
      if (/application\/(?:pdf|octet-stream)/i.test(response.contentType)||response.body.startsWith('%PDF-')) {for(const ref of sources.get(url)??[start])addDocument(url,ref,'pdf');continue;}
      if (!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(response.contentType)) continue;
      const page = extractPage(response); result.pages.push(page); result.forms.push(...page.forms);
      const $=load(response.body);let linkBase=response.finalUrl;try{linkBase=normalize($('base[href]').first().attr('href')??linkBase,linkBase);}catch{}
      $('a[href]').each((_,el)=>{try{const target=normalize($(el).attr('href')!,linkBase);const refs=docReferrers.get(target)??[];if(refs.length<100)refs.push({url:page.finalUrl,anchor:$(el).text().replace(/\s+/g,' ').trim().slice(0,240)});if(docReferrers.size<10000||docReferrers.has(target))docReferrers.set(target,refs);}catch{}});
      for (const link of page.internalLinks) enqueue(link, page.finalUrl, page.finalUrl);
      for (const link of page.documentLinks) addDocument(link, page.finalUrl);
    } catch (e) { result.summary.pagesFailed++; error(url, 'page', e); options.onPageResult?.({url,state:'unreachable',reason:e instanceof Error ? e.message : String(e)}); }
  }
  const budgetExhausted=(stageAttempts>=stage.budget||stage.name!=='natural'&&selections>=stage.budget)&&queue.some(url=>!fetched.has(url)&&rank(url)!==null);
  limitReached ||= budgetExhausted;
  result.crawlStages?.push({name:stage.name,budget:stage.budget,attempted:stageAttempts,pagesScanned:result.pages.length-before,skipped,budgetExhausted});
  }
  for (const url of queue) if (!fetched.has(url)) options.onPageResult?.({url,state:'not_observed',reason:'Outside the crawl budget'});
  for (const [destinationUrl, failure] of failures) for (const sourcePage of sources.get(destinationUrl) ?? []) result.brokenLinks.push({sourcePage,destinationUrl,...failure});
  function contacts(kind: 'emails'|'phones'): Contact[] {
    const map = new Map<string, Set<string>>();
    for (const page of result.pages) for (const value of page[kind]) { const refs = map.get(value) ?? new Set<string>(); refs.add(page.finalUrl); map.set(value,refs); }
    return [...map].map(([value, refs]) => ({value, sourcePages: [...refs]}));
  }
  result.documents = [...docs.values()]; result.contacts = {emails: contacts('emails'), phones: contacts('phones')};
  const candidates=result.documents.filter(d=>d.type==='pdf').map(d=>({url:d.url,referrers:docReferrers.get(d.url)??d.sourcePages.map(url=>({url,anchor:''}))}));
  if(candidates.length)result.pdf=await processPdfs(candidates,start,fetch,allowed,options.pdfExtraction!==false);
  Object.assign(result.summary, {pagesDiscovered: discovered.size, pagesScanned: result.pages.length, brokenInternalLinks: result.brokenLinks.length, documentsFound: result.documents.length, formsFound: result.forms.length, emailsFound: result.contacts.emails.length, phoneNumbersFound: result.contacts.phones.length, browserRenderRecommended: result.pages.filter(p => p.browser_render_recommended).length, crawlLimitReached: limitReached});
  return result;
}
