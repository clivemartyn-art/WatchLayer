import { SERVICE_IDS,type FactSet,type ServiceClassification,type Surface,type Service } from './types.js';
import type { Snapshot } from '../snapshots/types.js';
import { fact } from './detectors/common.js';
import { serviceMatches } from './detectors/services.js';
import { complaintsDocument } from './detectors/complaints.js';
export function classifyServices(facts:FactSet|undefined,overrides:Partial<Record<Service,boolean>>={}):ServiceClassification[] {
  return SERVICE_IDS.map(service=>{
    const pages=facts?.pages??[];const matches=pages.flatMap(p=>p.services.filter(s=>s.service===service).map(s=>({p,s})));
    const positives=matches.filter(m=>m.s.state.startsWith('DETECTED'));
    const high=positives.filter(m=>m.s.state==='DETECTED_HIGH_CONFIDENCE'&&m.p.reliable);
    const excluded=matches.some(m=>m.s.excluded)&&!positives.length;
    const override=overrides[service];
    return {service,state:override!==undefined?override?'DETECTED_HIGH_CONFIDENCE':'NOT_DETECTED':high.length?'DETECTED_HIGH_CONFIDENCE':positives.length?'DETECTED_LOW_CONFIDENCE':pages.some(p=>p.reliable)?'NOT_DETECTED':'UNKNOWN',excluded:override===false||excluded,sourceUrls:[...new Set(positives.map(m=>m.p.url))],evidence:positives.flatMap(m=>m.s.evidence).slice(0,6),origin:override!==undefined?'override':'detector',explanation:override!==undefined?'Explicit service applicability override.':excluded?'Explicit service exclusion observed.':'Classification describes observed advertising, not complete firm capabilities.'};
  });
}
export function surfaceInventory(current:Snapshot,facts:FactSet|undefined,previous:Surface[]=[]):Surface[] {
  const pages=facts?.pages??[];const classifications=classifyServices(facts);const depths=new Map<string,number>([[current.canonicalStartUrl,0]]);
  const htmlClassifications=classifyServices(facts?{...facts,pages:pages.filter(p=>p.sourceType!=='PDF')}:undefined);
  for(let i=0;i<pages.length;i++)for(const p of pages){const d=depths.get(p.url);if(d===undefined)continue;for(const l of p.links)if(!depths.has(l.url)||depths.get(l.url)!>d+1)depths.set(l.url,d+1);}
  const surfaces:Surface[]=[];
  const add=(signal:string,url:string,type:Surface['type'],confidence:Surface['confidence'],sourceEvidence:Surface['sourceEvidence'],service?:Service)=>{
    const old=previous.find(s=>s.signal===signal&&s.url===url&&s.service===service);
    const existing=surfaces.find(s=>s.signal===signal&&s.url===url&&s.service===service);
    if(existing){existing.sourceEvidence.push(...sourceEvidence);return;}
    const missing=type==='document'&&current.documents.some(d=>d.url===url&&d.observationStatus==='confirmed_missing'&&[404,410].includes(d.status??0));
    surfaces.push({signal,url,type,confidence,firstObserved:old?.firstObserved??current.completedAt,latestObserved:current.completedAt,observationState:missing?'confirmed_missing':'observed',sourceEvidence,...(service?{service}:{})});
  };
  const signalNames:Record<string,string>={'LAW-U001':'sra_number','LAW-U002':'digital_badge','LAW-U004':'complaints','LAW-U005':'legal_ombudsman','LAW-U008':'sra_escalation'};
  for(const p of pages){
    for(const [id,signal] of Object.entries(signalNames))if(p.signals[id]?.length)add(signal,p.url,p.sourceType==='PDF'?'document':'page',p.signals[id].some(f=>f.confidence==='HIGH')?'HIGH':'MEDIUM',[{url:p.url,facts:p.signals[id],clickDepth:depths.get(p.url)??null}]);
    if(p.pricing)for(const s of p.services.filter(s=>s.state.startsWith('DETECTED')&&(!p.pricingServices||p.pricingServices.includes(s.service)))){
      if(p.sourceType!=='PDF'&&classifications.some(c=>c.service===s.service&&c.state==='DETECTED_HIGH_CONFIDENCE')&&!htmlClassifications.some(c=>c.service===s.service&&c.state==='DETECTED_HIGH_CONFIDENCE'))continue;
      const dedicated=p.services.filter(s=>s.state.startsWith('DETECTED')).length===1&&classifications.some(c=>c.service===s.service&&c.state==='DETECTED_HIGH_CONFIDENCE');
      add('pricing',p.url,p.sourceType==='PDF'?'document':'page',s.state==='DETECTED_HIGH_CONFIDENCE'||dedicated?'HIGH':'MEDIUM',[{url:p.url,facts:dedicated?[...s.evidence,fact('dedicated-pricing-service',p.title)]:s.evidence,clickDepth:depths.get(p.url)??null}],s.service);
    }
    if(p.quote_generator_detected)add('quote_generator_detected',p.url,'page','HIGH',[{url:p.url,facts:[fact('quote-interface','Quote-related interface wording detected')]}]);
    for(const l of p.links){
      if(p.excludedContent)continue;
      if(l.document&&complaintsDocument(l.label,l.url+' '+(l.nearbyContext??'')))add('complaints',l.url,'document','HIGH',[{url:p.url,link:l,facts:[fact('document-link',l.label)],clickDepth:depths.has(p.url)?depths.get(p.url)!+1:null}]);
      if(l.document&&(l.purpose==='pricing'||/pric|fees?|costs?|charges/i.test(l.label+' '+l.url))){
        const extracted=current.pdf?.documents.find(d=>d.status==='EXTRACTED'&&(d.requestedUrl===l.url||d.finalUrl===l.url));
        if(extracted&&!pages.some(p=>p.sourceType==='PDF'&&p.url===extracted.finalUrl&&p.pricing))continue;
        const services=l.services?.length?l.services:serviceMatches(l.label+' '+l.url,true).filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service);
        for(const service of services){
          // Readable document scope takes precedence over broad surrounding HTML.
          // A conveyancing download cannot become a probate pricing location.
          if(extracted&&!pages.some(p=>p.sourceType==='PDF'&&p.url===extracted.finalUrl&&p.pricing&&p.pricingServices?.includes(service)))continue;
          add('pricing',l.url,'document','HIGH',[{url:p.url,link:l,facts:[fact('contextual-document-link',l.nearbyContext??l.label)]}],service);
        }
      }
    }
  }
  for(const old of previous)if(!surfaces.some(s=>s.signal===old.signal&&s.url===old.url&&s.service===old.service)){
    const p=current.pages.find(p=>p.url===old.url||p.finalUrl===old.url)??current.documents.find(d=>d.url===old.url);
    surfaces.push({...old,observationState:p?.observationStatus==='confirmed_missing'&&[404,410].includes(p.status??0)?'confirmed_missing':'not_observed'});
  }
  for(const doc of current.pdf?.documents??[]){
    const matches=surfaces.filter(s=>s.url===doc.requestedUrl||s.url===doc.finalUrl);
    if(!matches.length){add('document',doc.finalUrl??doc.requestedUrl,'document',doc.status==='EXTRACTED'?'HIGH':'LOW',doc.referrers.map(r=>({url:r.url,facts:[fact('pdf-discovery',r.anchor,'MEDIUM')]})));matches.push(surfaces.at(-1)!);}
    for(const surface of matches)surface.document={documentId:doc.documentId,status:doc.status,title:doc.title,pageCount:doc.pageCount,referrers:doc.referrers,sha256:doc.sha256};
  }
  return surfaces;
}
