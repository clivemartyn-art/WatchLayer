import type { LawContext,LawResult,PageFacts,ServiceClassification,Surface,UnknownReason } from './types.js';
import { staffLink } from './discovery.js';
export const UNKNOWN_EXPLANATIONS:Record<UnknownReason,string>={
  PAGE_NOT_DISCOVERED:'A relevant public page was not located in this scan.',
  DOCUMENT_CONTENT_UNAVAILABLE:'A relevant document link was located; reliable document text for this check is unavailable.',
  BROWSER_REQUIRED:'Static evidence cannot establish browser-dependent content or operation.',
  DETECTOR_INSUFFICIENT:'Observed text does not provide sufficiently explicit deterministic evidence for this check.',
  SERVICE_APPLICABILITY_UNCERTAIN:'The advertised service scope could not be established with high confidence.',
  STAFF_INFORMATION_NOT_DISCOVERED:'Relevant linked staff qualifications or supervision evidence were not observed.',
  CRAWL_BUDGET_EXHAUSTED:'Relevant candidates remain outside the configured crawl budget.',
  NETWORK_FAILURE:'Transport or access failures prevented reliable observation of relevant content.',
  AMBIGUOUS_EVIDENCE:'Available evidence cannot be assigned or compared reliably for this check.',
};
export function unknownReasons(result:LawResult,context:LawContext,pages:PageFacts[],inventory:Surface[],classifications:ServiceClassification[]):UnknownReason[] {
  const snapshot=context.current;
  const budgetExhausted=snapshot.coverage.crawlStages?.find(s=>s.name==='regulatory-evidence')?.budgetExhausted??snapshot.coverage.crawlLimitReached;
  if(!pages.length&&snapshot.errors.length)return ['NETWORK_FAILURE'];
  if(result.ruleId==='LAW-U003')return ['BROWSER_REQUIRED'];
  const service=result.serviceType;
  const observed=result.evidence[0]?.observed as {quote_generator_detected?:boolean}|null;
  const surfaces=inventory.filter(s=>s.observationState==='observed'&&(service?s.signal==='pricing'&&s.service===service:s.signal==='complaints'));
  const candidates=pages.filter(p=>service?p.pricing&&p.services.some(s=>s.service===service&&s.state.startsWith('DETECTED')):p.complaints);
  if(observed?.quote_generator_detected||candidates.length&&candidates.every(p=>!p.reliable))return ['BROWSER_REQUIRED'];
  const contentRule=service?!['PRICE-016','PRICE-017'].includes(result.ruleId):['LAW-U005','LAW-U006','LAW-U007','LAW-U008','LAW-U009'].includes(result.ruleId);
  // A located HTML hub with no content facts does not make an unparsed document accessible.
  if(contentRule&&surfaces.some(s=>s.type==='document'&&!snapshot.pdf?.documents.some(d=>d.status==='EXTRACTED'&&(d.finalUrl===s.url||d.requestedUrl===s.url)))&&!candidates.some(p=>{
    const usable=!service||p.services.filter(s=>s.state==='DETECTED_HIGH_CONFIDENCE').length===1;
    return (service?p.serviceSignals?.[service]?.[result.ruleId]??(usable?p.signals[result.ruleId]:[]):p.signals[result.ruleId])?.some(f=>f.confidence==='HIGH');
  }))return ['DOCUMENT_CONTENT_UNAVAILABLE'];
  if(service&&classifications.find(c=>c.service===service)?.state!=='DETECTED_HIGH_CONFIDENCE')return ['SERVICE_APPLICABILITY_UNCERTAIN'];
  if(service&&['PRICE-004','PRICE-005'].includes(result.ruleId)&&candidates.length){
    const links=candidates.flatMap(p=>p.links.filter(staffLink));
    if(links.some(l=>snapshot.pages.some(p=>p.url===l.url&&p.observationStatus==='unreachable')))return ['NETWORK_FAILURE'];
    if(links.length&&links.every(l=>pages.some(p=>p.url===l.url)))return ['DETECTOR_INSUFFICIENT'];
    return ['STAFF_INFORMATION_NOT_DISCOVERED'];
  }
  if(service&&candidates.length&&candidates.every(p=>p.services.filter(s=>s.state==='DETECTED_HIGH_CONFIDENCE').length>1&&!p.serviceSignals?.[service]))return ['AMBIGUOUS_EVIDENCE'];
  if(result.ruleId.startsWith('LAW-C'))return [snapshot.coverage.crawlLimitReached?'CRAWL_BUDGET_EXHAUSTED':'AMBIGUOUS_EVIDENCE'];
  if(service&&!candidates.length||!service&&['LAW-U004','LAW-U005','LAW-U006','LAW-U007','LAW-U008','LAW-U009'].includes(result.ruleId)&&!candidates.length){
    if(snapshot.errors.some(e=>/page|robots/.test(e.stage)&&/complaint|fees?|pricing|cost|regulatory|client.care/i.test(e.url)))return ['NETWORK_FAILURE'];
    return [budgetExhausted?'CRAWL_BUDGET_EXHAUSTED':'PAGE_NOT_DISCOVERED'];
  }
  return [pages.length?'DETECTOR_INSUFFICIENT':'PAGE_NOT_DISCOVERED'];
}
