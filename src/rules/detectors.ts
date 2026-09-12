import type { PageObservation, ResourceObservation, Snapshot } from '../snapshots/types.js';
import type { Context, Rule, State, Confidence } from './types.js';
import { normalize } from '../utils/urls.js';
export interface Detection {url: string; state: State; confidence: Confidence; reason: string; observed: unknown; previous?: unknown}
export const reliable = (p?: PageObservation) => !!p && p.observationStatus==='observed' && p.evidence==='html' && p.status!==null && p.status>=200 && p.status<300 && !p.browserRenderRecommended;
const healthy = (p?: ResourceObservation) => !!p && p.observationStatus==='observed' && ['html','http'].includes(p.evidence) && p.status!==null && p.status>=200&&p.status<300;
const pageAt = (s: Snapshot|undefined, url: string) => s?.pages.find(p=>p.url===url||p.finalUrl===url||p.aliases.includes(url));
const tlsErrors = new Set(['CERT_HAS_EXPIRED','CERT_NOT_YET_VALID','DEPTH_ZERO_SELF_SIGNED_CERT','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','ERR_TLS_CERT_ALTNAME_INVALID','CERT_REVOKED']);
export function detect(rule: Rule, {current:c,previous:p,factResults}: Context): Detection[] {
  const out: Detection[]=[];
  const add=(url:string,state:State,reason:string,observed:unknown,previous?:unknown,confidence:Confidence=state==='UNKNOWN'?'LOW':state==='PASS'?'HIGH':'MEDIUM')=>out.push({url,state,reason,observed,previous,confidence});
  const home=normalize(c.inputUrl);
  const pass=rule.resultMapping.healthy, changed=rule.resultMapping.changed;
  const targets=rule.configuration.urls??[c.canonicalStartUrl];
  const comparable=!!p&&c.comparisonEligible&&p.comparisonEligible;
  switch(rule.detector) {
    case 'structured_fact': return factResults?.[rule.configuration.signal!]??[{url:c.canonicalStartUrl,state:'UNKNOWN',confidence:'LOW',reason:'Structured evidence unavailable.',observed:null}];
    case 'availability': {
      const kind=rule.configuration.target;
      const old=kind==='documents'?p?.documents:p?.pages;
      const urls=kind==='homepage'?[home]:(old??[]).filter(x=>healthy(x)||x.lastKnownStatus!==undefined&&x.lastKnownStatus>=200&&x.lastKnownStatus<300||kind==='documents'&&x.evidence==='linked').map(x=>x.url).filter(u=>!rule.configuration.urls||rule.configuration.urls.includes(u));
      for(const url of urls) {
        const now=kind==='documents'?c.documents.find(x=>x.url===url):pageAt(c,url);
        const before=old?.find(x=>x.url===url);
        const direct=now&&['html','http'].includes(now.evidence)&&now.status!==null;
        if(healthy(now))add(url,pass,'Successful direct HTTP observation.',now,before,'HIGH');
        else if(direct&&([404,410].includes(now.status!)||kind==='homepage'&&now.status!>=500&&now.status!<=599)&& (kind==='homepage'&&!['not_observed','excluded_from_scan','uncertain'].includes(now.observationStatus)||comparable&&now.observationStatus==='confirmed_missing'))add(url,changed,'Direct HTTP response confirms the resource was unavailable at scan time.',now,before,'HIGH');
        else add(url,'UNKNOWN','No conclusive current availability evidence; a link or retained fingerprint is insufficient.',now??null,before);
      }
      break;
    }
    case 'https': case 'certificate': {
      const request=c.requests?.find(r=>r.url===home);
      if(request?.errorCode&&tlsErrors.has(request.errorCode))add(home,'POTENTIAL_ISSUE','The validated TLS connection reported a certificate error.',request,undefined,'HIGH');
      else if(rule.detector==='https') {
        if(request?.finalUrl?.startsWith('https:')&&request.status!==undefined&&request.status>=200&&request.status<300)add(home,pass,'Successful HTTPS response.',request);
        else add(home,'UNKNOWN','No successful HTTPS response or confirmed certificate failure recorded.',request??null);
      } else {
        const cert=request?.tls; const remaining=cert?(Date.parse(cert.validTo)-Date.parse(c.completedAt))/86400000:NaN;
        if(!cert||!Number.isFinite(remaining))add(home,'UNKNOWN','Certificate metadata unavailable.',request??null);
        else if(!cert.authorized||remaining<0)add(home,'POTENTIAL_ISSUE','Certificate invalid at scan time.',{...request,remainingDays:remaining},undefined,'HIGH');
        else add(home,remaining<=rule.configuration.threshold!?'WARNING':pass,'Certificate checked against scan time and configured expiry threshold.',{...request,remainingDays:remaining,threshold:rule.configuration.threshold});
      }
      break;
    }
    case 'discovery': {
      const sitemap=rule.configuration.target==='sitemap';
      const url=new URL(sitemap?'/sitemap.xml':'/robots.txt',home).href;
      const req=c.requests?.find(r=>r.url===url);
      const found=sitemap?c.coverage.discovery.sitemapFound:!!req&&req.status!==undefined&&req.status>=200&&req.status<300;
      const errors=c.errors.filter(e=>e.stage===(sitemap?'sitemap':'robots'));
      if(found)add(url,pass,sitemap?'Valid sitemap discovered.':'robots.txt retrieved.',{discovery:c.coverage.discovery,request:req});
      else if(req&&([404,410].includes(req.status??0)||sitemap&&req.status!==undefined&&req.status>=200&&req.status<300)&&!errors.some(e=>{const response=c.requests?.find(r=>r.url===e.url);return !response||response.status===undefined||response.status>=400&&![404,410].includes(response.status);}))add(url,'WARNING','No valid resource found in the attempted discovery locations.',{request:req,errors});
      else add(url,'UNKNOWN','Discovery was inconclusive.',{request:req??null,errors});
      break;
    }
    case 'broken_links': {
      const links=c.brokenLinks?.filter(l=>[404,410].includes(l.status??0));
      add(c.canonicalStartUrl,links===undefined||!c.coverage.homepageReached?'UNKNOWN':links.length?'WARNING':pass,'Only observed internal destinations with HTTP 404/410 count; unvisited links are not certified healthy.',{links:links??null,coverage:c.coverage});break;
    }
    case 'form_presence': case 'form_structure': {
      const urls=[...new Set(p?.forms.map(f=>f.pageUrl)??[])].filter(u=>!rule.configuration.urls||rule.configuration.urls.includes(u));
      for(const url of urls) {
        const before=p!.forms.filter(f=>f.pageUrl===url);
        const page=pageAt(c,url); const after=c.forms.filter(f=>f.observationStatus==='observed'&&(f.pageUrl===url||f.pageUrl===page?.finalUrl));
        if(!reliable(page)||!comparable||before.some(f=>f.observationStatus!=='observed'))add(url,'UNKNOWN','Form comparison requires reliably observed source pages and baseline.',{page,forms:after},before);
        else if(rule.detector==='form_presence') {
          const remaining=after.map(f=>f.fingerprint);
          const matched=before.every(f=>{const i=remaining.indexOf(f.fingerprint);if(i<0)return false;remaining.splice(i,1);return true;});
          add(url,matched||before.length===1&&after.length===1?pass:after.length===0?changed:'UNKNOWN',after.length===0?'Expected forms absent from directly observed static HTML.':'Expected forms matched, or a single form remains on its source page; ambiguous matching is unknown.',after,before,after.length===0?'MEDIUM':'HIGH');
        }
        else {
          const signatures=(forms:typeof before)=>forms.map(f=>JSON.stringify([f.method,f.action,f.fieldSignature])).sort();
          const stable=JSON.stringify(signatures(before))===JSON.stringify(signatures(after));
          add(url,stable?pass:before.length===1&&after.length===1?'WARNING':'UNKNOWN',stable?'Form structure unchanged.':'Changed or ambiguously matched form structures.',after,before);
        }
      }break;
    }
    case 'title': case 'indexability': case 'canonical': case 'content_reduction': {
      const urls=rule.detector==='content_reduction'?(rule.configuration.urls??p?.pages.map(x=>x.url)??[]):targets;
      for(const url of urls) {
        const now=pageAt(c,url), before=pageAt(p,url);
        if(!reliable(now)){add(url,'UNKNOWN','Current static HTML metadata/content is unavailable or unreliable.',now??null,before);continue;}
        if(rule.detector==='title')add(url,now!.title?.trim()?pass:'WARNING','Title presence in observed HTML.',{title:now!.title});
        else if(rule.detector==='indexability') {
          const noindex=(v:string|null)=>/\b(noindex|none)\b/i.test(v??'');
          add(url,!noindex(now!.robots)?pass:reliable(before)&&!noindex(before!.robots)?'WARNING':'UNKNOWN','Checks extracted robots metadata; existing noindex intent is unknown.',{robots:now!.robots},before?.robots);
        } else if(!comparable||!reliable(before))add(url,'UNKNOWN','Reliable comparable baseline unavailable.',now,before??null);
        else if(rule.detector==='canonical')add(url,now!.canonicalUrl===before!.canonicalUrl?pass:'WARNING','Canonical declaration comparison; changes require review.',{canonical:now!.canonicalUrl},{canonical:before!.canonicalUrl});
        else {
          const reduction=before!.wordCount&&now!.wordCount!==null?100*(before!.wordCount-now!.wordCount)/before!.wordCount:0;
          add(url,before!.wordCount===null||now!.wordCount===null?'UNKNOWN':reduction>=rule.configuration.threshold!&&reduction>0?'WARNING':pass,'Visible word-count reduction; intent is not inferred.',{words:now!.wordCount,hash:now!.textHash,reductionPercent:reduction,threshold:rule.configuration.threshold},{words:before!.wordCount,hash:before!.textHash});
        }
      }break;
    }
    case 'site_reduction': {
      const complete=(s:Snapshot)=>s.coverage.homepageReached&&!s.coverage.crawlLimitReached&&s.coverage.pagesFailed===0&&s.coverage.discoveryErrors===0&&s.coverage.rechecksFailed===0&&!s.pages.some(x=>['not_observed','excluded_from_scan','unreachable','uncertain'].includes(x.observationStatus)||x.browserRenderRecommended);
      const reduction=p&&p.coverage.pagesScanned?100*(p.coverage.pagesScanned-c.coverage.pagesScanned)/p.coverage.pagesScanned:0;
      add(c.canonicalStartUrl,!p||!comparable||!complete(c)||!complete(p)?'UNKNOWN':reduction>=rule.configuration.threshold!&&reduction>0?'WARNING':pass,'Observed crawl-size comparison requires matching budgets and reliable coverage; it is not an exhaustive site inventory.',{coverage:c.coverage,reductionPercent:reduction,threshold:rule.configuration.threshold},p?.coverage,'MEDIUM');break;
    }
  }
  if(!out.length)add(c.canonicalStartUrl,'NOT_APPLICABLE','No matching tracked resources.',null);
  return out;
}
