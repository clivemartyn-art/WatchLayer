import { randomUUID } from 'node:crypto';
import { scan, type ScanOptions } from '../crawler/scan.js';
import { createFetcher, type Fetcher, type Response } from '../crawler/http.js';
import type { CrawlObservation } from '../crawler/observations.js';
import type { Page, ScanResult } from '../schemas/scan.js';
import { extractPage } from '../extractors/page.js';
import { documentType } from '../links/classify.js';
import { domain, normalize } from '../utils/urls.js';
import type { SnapshotRepository } from '../storage/repository.js';
import { assessEligibility, selectBaseline } from '../comparison/eligibility.js';
import { compareSnapshots } from '../comparison/diff.js';
import { formObservation, hash, pageObservation } from './fingerprints.js';
import { emptyPage } from './observations.js';
import { MAX_RECHECK_BUDGET, recheckKnown } from './recheck.js';
import { APPLICATION_VERSION, SNAPSHOT_SCHEMA_VERSION, type Snapshot, type ContactObservation, type DocumentObservation, type PageObservation } from './types.js';

export interface PersistentScanOptions extends Omit<ScanOptions,'onPageResult'> { recheckBudget?: number; now?: () => Date; onResponse?: (response:Response)=>void }
export async function scanAndPersist(input: string, repository: SnapshotRepository, options: PersistentScanOptions = {}) {
  const start = normalize(input); const canonicalDomain = domain(start);
  const crawlLimit = options.maxPages ?? 100; const recheckBudget = options.recheckBudget ?? MAX_RECHECK_BUDGET;
  if (!Number.isInteger(crawlLimit) || crawlLimit < 1) throw new Error('Page limit must be a positive integer');
  if (!Number.isInteger(recheckBudget) || recheckBudget < 0 || recheckBudget > MAX_RECHECK_BUDGET) throw new Error(`Recheck budget must be an integer from 0 to ${MAX_RECHECK_BUDGET}`);
  const now = options.now ?? (() => new Date()); const startedAt = now().toISOString();
  const scanId = `scan_${randomUUID()}`;
  const history = repository.history(canonicalDomain);
  const previous = selectBaseline(history,crawlLimit);
  const site = repository.findSite(canonicalDomain);
  const transport = options.fetcher ?? createFetcher(start,options.delayMs,options.timeoutMs);
  const robotsCache = new Map<string,Response>();
  const requests: NonNullable<Snapshot['requests']> = [];
  const fetcher: Fetcher = async (url, request) => {
    let response: Response;
    try { response = await transport(url,request); }
    catch (error) { requests.push({url,errorCode: error && typeof error === 'object' && 'code' in error ? String(error.code) : 'INCONCLUSIVE'}); throw error; }
    options.onResponse?.(response);
    requests.push({url,finalUrl:response.finalUrl,status:response.status,tls:response.tls});
    if (new URL(url).pathname === '/robots.txt') robotsCache.set(url,response);
    return response;
  };
  const evidence = new Map<string,CrawlObservation>();
  const result = await scan(input,{...options,fetcher,onPageResult:event => evidence.set(event.url,event)});
  const pages = new Map<string,PageObservation>();
  const observedFinal = new Map<string,PageObservation>();
  const htmlPages: Page[] = [...result.pages];
  for (const event of evidence.values()) pages.set(event.url,emptyPage(event.url,event));
  const rememberHtml = (page: Page) => {
    const observation = pageObservation(page);
    observation.lastObservedScanId = scanId; observation.lastKnownStatus = page.status; observation.lastKnownFinalUrl=observation.finalUrl!;
    const existing = observedFinal.get(observation.finalUrl!);
    if (existing) {
      existing.aliases=[...new Set([...existing.aliases,...observation.aliases])];
      if (existing.url!==observation.url) pages.delete(observation.url);
      return false;
    }
    pages.set(observation.url,observation);
    observedFinal.set(observation.finalUrl!,observation);
    return true;
  };
  result.pages.forEach(rememberHtml);
  // Alias responses have evidence but no duplicate extractor output.
  const byFinal = new Map([...pages.values()].filter(p=>p.evidence==='html').map(p=>[p.finalUrl,p]));
  for (const [url,p] of pages) if (p.evidence !== 'html' && p.finalUrl && byFinal.has(p.finalUrl)) {
    const observed = byFinal.get(p.finalUrl)!; observed.aliases = [...new Set([...observed.aliases,url])]; pages.delete(url);
  }
  const seenPages = new Set([...evidence.values()].filter(e=>e.state!=='not_observed').flatMap(e=>[e.url,...(e.finalUrl?[e.finalUrl]:[])]));
  const rechecks = await recheckKnown(previous,seenPages,start,recheckBudget,fetcher,robotsCache);
  const errors: ScanResult['errors'] = [...result.errors];
  const documents = new Map<string,DocumentObservation>();
  const previousDocuments = new Map(previous?.documents.map(d=>[d.url,d]) ?? []);
  const firstDocumentDates = new Map<string,string>();
  for (const stored of history) if (stored.schemaVersion===SNAPSHOT_SCHEMA_VERSION) for (const doc of stored.documents) {
    const known=firstDocumentDates.get(doc.url);if(!known||doc.firstObservedAt<known)firstDocumentDates.set(doc.url,doc.firstObservedAt);
  }
  function rememberDocument(doc: ScanResult['documents'][number]) {
    const url = normalize(doc.url); const old = previousDocuments.get(url);
    const existing = documents.get(url);
    if (existing && existing.evidence!=='linked') {
      existing.sourcePages=[...new Set([...existing.sourcePages,...doc.sourcePages.map(u=>normalize(u))])];
      return; // A later HTML link cannot undo this scan's direct HTTP evidence.
    }
    documents.set(url,{url,finalUrl:null,status:null,observationStatus:'observed',evidence:'linked',responseTimeMs:null,redirects:[],filename:doc.filename,type:doc.type,sourcePages:[...new Set([...(existing?.sourcePages??[]),...doc.sourcePages.map(u=>normalize(u))])],firstObservedAt:firstDocumentDates.get(url)??old?.firstObservedAt??startedAt,lastObservedScanId:scanId});
  }
  result.documents.forEach(rememberDocument);
  for (const check of rechecks.results) {
    const response = check.response;
    const event: CrawlObservation = {url:check.url,state:check.excluded?'excluded_from_scan':response?'retrieved':'unreachable',reason:check.error,...(response?{finalUrl:response.finalUrl,status:response.status,contentType:response.contentType,responseTimeMs:response.responseTimeMs,redirects:response.redirects}:{})};
    if (check.error || response && response.status >= 400) errors.push({url:check.url,stage:'recheck',message:check.error??`HTTP ${response!.status}`,status:response?.status});
    if (check.kind === 'page') {
      if (response && response.status >= 200 && response.status < 300 && /\b(?:text\/html|application\/xhtml\+xml)\b/i.test(response.contentType)) {
        const page = extractPage(response); if (rememberHtml(page)) htmlPages.push(page);
        for (const url of page.documentLinks) rememberDocument({url,filename:new URL(url).pathname.split('/').pop()??'',type:documentType(url)??'unknown',sourcePages:[page.finalUrl]});
      } else pages.set(check.url,emptyPage(check.url,event));
    } else {
      const old = documents.get(check.url) ?? previousDocuments.get(check.url)!;
      const observation = emptyPage(check.url,event);
      const observed = response && response.status >= 200 && response.status < 300;
      documents.set(check.url,{...old,finalUrl:observation.finalUrl,status:observation.status,observationStatus:observed?'observed':observation.observationStatus,evidence:response?'http':'not_requested',reason:check.error,responseTimeMs:observation.responseTimeMs,redirects:observation.redirects,...(response&&(observed||observation.observationStatus==='confirmed_missing')?{lastObservedScanId:scanId,lastKnownStatus:response.status}:{})});
    }
  }
  // Preserve last-known fingerprints across gaps, without pretending to have
  // observed them now. This prevents forgetting URLs after one truncated scan.
  const pageIndex = new Map<string,PageObservation>();
  for (const page of pages.values()) for (const alias of page.aliases) pageIndex.set(alias,page);
  for (const old of previous?.pages ?? []) {
    const current = pageIndex.get(old.url) ?? (old.finalUrl ? pageIndex.get(old.finalUrl) : undefined);
    if (!current) pages.set(old.url,{...old,status:null,responseTimeMs:null,observationStatus:'not_observed',evidence:'not_requested',reason:'Not visited within the crawl and recheck budgets'});
    else if (current.evidence !== 'html' && old.textHash !== null) {
      pages.set(current.url,{...old,...current,aliases:[...new Set([...old.aliases,...current.aliases])],title:old.title,metaDescription:old.metaDescription,canonicalUrl:old.canonicalUrl,h1:old.h1,textHash:old.textHash,metadataHash:old.metadataHash,structureHash:old.structureHash,wordCount:old.wordCount,robots:old.robots,browserRenderRecommended:old.browserRenderRecommended,lastObservedScanId:old.lastObservedScanId,lastKnownStatus:current.status??old.lastKnownStatus,lastKnownFinalUrl:current.finalUrl??old.lastKnownFinalUrl??old.finalUrl??undefined});
    }
  }
  for (const old of previous?.documents ?? []) if (!documents.has(old.url)) documents.set(old.url,{...old,status:null,responseTimeMs:null,observationStatus:'not_observed',evidence:'not_requested',reason:'Not encountered or rechecked within the budgets'});
  const pageList = [...pages.values()];
  const homepageReached = result.pages.some(p=>p.requestedUrl===start);
  const snapshot: Snapshot = {
    requests, brokenLinks: result.brokenLinks,
    scanId,siteId:site?.siteId??`site_${hash(canonicalDomain).slice(0,24)}`,canonicalDomain,canonicalStartUrl:homepageReached?result.site.canonicalUrl:site?.canonicalStartUrl??result.site.canonicalUrl,inputUrl:input,startedAt,completedAt:now().toISOString(),
    status:!homepageReached?'failed':result.summary.crawlLimitReached||errors.length?'partial':'complete',crawlLimit,applicationVersion:APPLICATION_VERSION,schemaVersion:SNAPSHOT_SCHEMA_VERSION,
    comparisonEligible:false,comparisonWarnings:[],
    coverage:{homepageReached,crawlLimitReached:result.summary.crawlLimitReached,pagesDiscovered:result.summary.pagesDiscovered,pagesScanned:result.summary.pagesScanned,pagesFailed:result.summary.pagesFailed,naturalAttempts:[...evidence.values()].filter(e=>e.state==='retrieved'||e.state==='unreachable').length,recheckBudget,rechecksAttempted:rechecks.attempted,rechecksSkipped:rechecks.skipped,rechecksFailed:rechecks.results.filter(r=>!r.excluded&&(r.error||r.response&&r.response.status>=400&&![404,410].includes(r.response.status))).length,discovery:result.discovery,discoveryErrors:result.errors.filter(e=>e.stage==='sitemap'||e.stage==='robots').length},
    pages:pageList,documents:[...documents.values()],forms:htmlPages.flatMap(p=>p.forms.map(f=>({...formObservation(f),lastObservedScanId:scanId}))),contacts:{emails:[],phones:[]},errors,
  };
  const eligibility = assessEligibility(snapshot,previous); snapshot.comparisonEligible=eligibility.eligible; snapshot.comparisonWarnings=eligibility.warnings;
  if (!previous && history.length) snapshot.comparisonWarnings.push('No eligible previous scan with a matching crawl limit and scanner/schema version.');
  const reliablePages = new Set(pageList.filter(p=>p.observationStatus==='observed'&&p.evidence==='html'&&!p.browserRenderRecommended&&snapshot.comparisonEligible).flatMap(p=>[p.url,...p.aliases]));
  const formCounts=new Map<string,number>();
  for (const form of snapshot.forms) {const key=form.pageUrl+'\0'+form.fingerprint;formCounts.set(key,(formCounts.get(key)??0)+1);}
  for (const form of previous?.forms ?? []) if (!reliablePages.has(form.pageUrl)) {
    const key=form.pageUrl+'\0'+form.fingerprint;const count=formCounts.get(key)??0;
    if (count) formCounts.set(key,count-1); else snapshot.forms.push({...form,observationStatus:'not_observed'});
  }
  for (const kind of ['emails','phones'] as const) {
    const contacts = new Map<string,ContactObservation>();
    for (const page of htmlPages) for (const raw of page[kind]) {
      const value = kind==='emails'?raw.toLowerCase():raw.replace(/[^+\d]/g,'');
      const fact=contacts.get(value)??{value,sourcePages:[],observationStatus:'observed',lastObservedScanId:scanId};
      if (!fact.sourcePages.includes(page.finalUrl)) fact.sourcePages.push(page.finalUrl); contacts.set(value,fact);
    }
    for (const old of previous?.contacts[kind] ?? []) {
      const current=contacts.get(old.value);
      if (current) {
        const unobserved=old.sourcePages.filter(url=>!reliablePages.has(url)&&!current.sourcePages.includes(url));
        current.sourcePages=[...new Set([...current.sourcePages,...unobserved])];
        if (unobserved.length) current.unobservedSourcePages=unobserved;
      } else if (!old.sourcePages.every(url=>reliablePages.has(url))) contacts.set(old.value,{...old,observationStatus:'not_observed',unobservedSourcePages:old.sourcePages.filter(url=>!reliablePages.has(url))});
    }
    snapshot.contacts[kind]=[...contacts.values()];
  }
  repository.save(snapshot);
  return {scan:result,snapshot,comparison:previous?compareSnapshots(previous,snapshot):null};
}
