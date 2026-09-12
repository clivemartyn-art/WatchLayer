import { compareSnapshots } from '../comparison/diff.js';
import { runRules } from '../rules/engine.js';
import { projectFindings } from '../rules/findings.js';
import { STATES,type FactResult } from '../rules/types.js';
import { universalPack } from '../rules/pack.js';
import { lawPack,DRIFT_AGE_YEARS } from './pack.js';
import { classifyServices,surfaceInventory } from './inventory.js';
import { REPORT_STATEMENT,wording } from './wording.js';
import type { Fact,LawContext,LawReport,LawResult,Service } from './types.js';
export function evaluateLawWatch(input:LawContext):LawReport {
  const {current:c}=input;
  let {previous:p,facts,previousFacts,previousInventory}=input;
  if(facts?.scanId!==c.scanId||facts?.detectorVersion!=='1.0')facts=undefined;
  if(p&&(p.scanId===c.scanId||p.completedAt>c.completedAt||p.canonicalDomain!==c.canonicalDomain||p.schemaVersion!==c.schemaVersion||p.applicationVersion!==c.applicationVersion||p.crawlLimit!==c.crawlLimit)){p=undefined;previousFacts=undefined;previousInventory=undefined;}
  if(previousFacts?.scanId!==p?.scanId||previousFacts?.detectorVersion!=='1.0')previousFacts=undefined;
  if(!p){previousFacts=undefined;previousInventory=undefined;}
  const pages=facts?.pages??[];const classifications=classifyServices(facts,input.overrides);const inventory=surfaceInventory(c,facts,previousInventory);
  const signals:Record<string,FactResult[]>={};
  const add=(id:string,state:FactResult['state'],reason:string,observed:unknown,url=c.canonicalStartUrl,previous?:unknown,confidence:FactResult['confidence']=state==='PASS'?'HIGH':state==='UNKNOWN'?'LOW':'MEDIUM')=>(signals[id]??=[]).push({url,state,reason,observed,previous,confidence});
  for(const rule of lawPack.rules.filter(r=>r.category==='regulatory')){
    const matches=pages.flatMap(p=>(p.signals[rule.id]??[]).map(f=>({url:p.url,title:p.title,fact:f})));
    if(rule.id==='LAW-U003'){add(rule.id,'UNKNOWN','Badge operation requires browser execution; static integration presence cannot establish operation.',null);continue;}
    if(rule.id==='LAW-U004')for(const s of inventory.filter(s=>s.signal==='complaints'&&s.type==='document'&&s.observationState==='observed'))matches.push({url:s.url,title:'Complaints document',fact:s.sourceEvidence[0].facts[0]});
    if(rule.id==='LAW-U010'){
      const links=pages.flatMap(p=>p.links.filter(l=>inventory.some(s=>s.url===l.url&&s.observationState==='observed'&&(s.signal==='complaints'||s.signal==='pricing'||s.signal==='sra_escalation'))).map(link=>({source:p.url,link})));
      add(rule.id,links.length?'PASS':'UNKNOWN',links.length?'Direct links to regulatory surfaces were observed; no prominence judgment is made.':wording.unknown,{links});continue;
    }
    add(rule.id,matches.some(m=>m.fact.confidence==='HIGH')?'PASS':matches.length?'WARNING':'UNKNOWN',matches.length?matches.some(m=>m.fact.confidence==='HIGH')?wording.located:wording.partial:wording.unknown,{matches},matches[0]?.url);
  }
  for(const classification of classifications)for(const rule of lawPack.rules.filter(r=>r.category==='pricing')){
    const serviceType=classification.service;const surfaces=inventory.filter(s=>s.signal==='pricing'&&s.service===serviceType&&s.observationState==='observed');
    const candidatePages=pages.filter(p=>p.pricing&&p.services.some(s=>s.service===serviceType&&s.state.startsWith('DETECTED')));
    // A multi-service page cannot lend one service's VAT/fees to another service.
    const html=candidatePages.filter(p=>p.reliable&&p.services.filter(s=>s.state==='DETECTED_HIGH_CONFIDENCE').length===1&&p.services.some(s=>s.service===serviceType&&s.state==='DETECTED_HIGH_CONFIDENCE'));
    const matches=html.flatMap(p=>(p.signals[rule.id]??[]).map(f=>({url:p.url,fact:f})));
    const url=surfaces[0]?.url??classification.sourceUrls[0]??c.canonicalStartUrl;
    const observed={serviceType,matches,surfaces:surfaces.map(s=>({url:s.url,type:s.type})),quote_generator_detected:candidatePages.some(p=>p.quote_generator_detected)};
    if(classification.excluded){add(rule.id,'NOT_APPLICABLE','An explicit service exclusion or override makes this check inapplicable.',observed,url);continue;}
    if(classification.state!=='DETECTED_HIGH_CONFIDENCE'){add(rule.id,'UNKNOWN',wording.lowService,observed,url);continue;}
    if(rule.id==='PRICE-016'){
      const links=pages.flatMap(p=>p.links.filter(l=>surfaces.some(s=>s.url===l.url)).map(l=>({source:p.url,link:l})));
      add(rule.id,links.length?'PASS':'UNKNOWN',links.length?'Direct pricing links were observed. This is an objective accessibility signal.':wording.unknown,{...observed,links},url);continue;
    }
    if(rule.id==='PRICE-017'){add(rule.id,surfaces.some(s=>s.confidence==='HIGH')?'PASS':'UNKNOWN','Pricing surface and service wording association.',observed,url);continue;}
    if(rule.id==='PRICE-015'&&!matches.length){add(rule.id,'UNKNOWN','Conditional-fee applicability or customer-payment detail could not be established.',observed,url);continue;}
    const high=matches.some(m=>m.fact.confidence==='HIGH');
    const inaccessible=observed.quote_generator_detected||surfaces.some(s=>s.type==='document');
    add(rule.id,high?'PASS':inaccessible?'UNKNOWN':matches.length?'WARNING':'UNKNOWN',high?wording.located:observed.quote_generator_detected?wording.calculator:surfaces.some(s=>s.type==='document')?wording.document:matches.length?wording.partial:wording.unknown,observed,matches[0]?.url??url);
  }
  for(const id of ['LAW-I001','LAW-I002']){
    const drift=pages.flatMap(p=>(p.signals[id]??[]).filter(f=>Number(f.value)<=new Date(c.completedAt).getUTCFullYear()-DRIFT_AGE_YEARS).map(f=>({url:p.url,fact:f})));
    if(drift.length)for(const d of drift)add(id,'WARNING',`Pricing material contains ${id==='LAW-I001'?'a review/update':'a fee/rate'} reference to ${d.fact.value}. This is an informational age signal.`,d,d.url,undefined,'HIGH');
    else add(id,facts?'PASS':'UNKNOWN',facts?'No old explicit pricing year was detected in this sample.':wording.unknown,null);
  }
  const comparison=p?compareSnapshots(p,c):undefined;
  for(const [id,signal] of [['LAW-C001','pricing'],['LAW-C002','complaints']]){
    const old=(previousInventory??[]).filter(s=>s.signal===signal&&s.type==='page'&&s.observationState==='observed');
    if(!p||!previousFacts){add(id,'UNKNOWN','Previous monitored surfaces unavailable.',null);continue;}
    if(!old.length){add(id,'NOT_APPLICABLE','No previously monitored matching surface.',null);continue;}
    for(const surface of old){const page=c.pages.find(x=>x.url===surface.url||x.aliases.includes(surface.url));const removed=comparison?.changes.some(x=>x.url===surface.url&&x.type==='PAGE_CONFIRMED_REMOVED');add(id,removed?'POTENTIAL_ISSUE':page?.observationStatus==='observed'?'PASS':'UNKNOWN',removed?wording.absent:page?.observationStatus==='observed'?'Monitored page was observed.':wording.notObserved,{page:page??null},surface.url,surface,removed?'HIGH':undefined);}
  }
  for(const [id,signal] of [['LAW-C003','LAW-U001'],['LAW-C004','LAW-U002']]){
    const old=previousFacts?.pages.filter(p=>p.signals[signal]?.some(f=>f.confidence==='HIGH'))??[];
    if(!p||!previousFacts){add(id,'UNKNOWN','Previous regulatory facts unavailable.',null);continue;}
    if(!old.length){add(id,'NOT_APPLICABLE','No previously detected matching signal.',null);continue;}
    for(const before of old){
      const now=pages.find(x=>x.url===before.url);const retained=now?.signals[signal]??[];
      const previousValues=before.signals[signal].map(f=>f.value??f.snippet);
      const unchanged=previousValues.every(v=>retained.some(f=>(f.value??f.snippet)===v));
      const reliable=now?.reliable&&comparison?.comparisonEligible&&c.pages.some(p=>(p.url===before.url||p.finalUrl===before.url)&&p.observationStatus==='observed'&&p.evidence==='html');
      add(id,unchanged?'PASS':id==='LAW-C003'&&reliable?'WARNING':'UNKNOWN',unchanged?'Previously recorded signal still detected.':id==='LAW-C003'&&reliable?'A previously detected number was not found on the reobserved surface. Review other office and regulatory surfaces.':'Static or coverage limitations prevent a disappearance conclusion.',{current:retained},before.url,{previous:before.signals[signal]});
    }
  }
  const priceChanges=comparison?.comparisonEligible?comparison.changes.filter(x=>x.type==='PAGE_CONTENT_CHANGED'&&x.materiality!=='minor'&&(previousInventory??[]).some(s=>s.signal==='pricing'&&s.url===x.url)&&pages.some(p=>p.url===x.url&&p.reliable)):[];
  if(priceChanges.length)for(const change of priceChanges)add('LAW-C005','WARNING',wording.changed,change,change.url);
  else {
    const covered=comparison?.comparisonEligible&&(previousInventory??[]).filter(s=>s.signal==='pricing'&&s.type==='page').every(s=>pages.some(p=>p.url===s.url&&p.reliable));
    add('LAW-C005',covered?'PASS':'UNKNOWN',covered?'No material change observed on monitored pricing pages.':wording.notObserved,{comparisonEligible:comparison?.comparisonEligible??false});
  }
  const runs=runRules({current:c,previous:p,factResults:signals},[universalPack,lawPack]);
  const law=runs[1];const results:LawResult[]=law.results.map(r=>{
    const observed=r.evidence[0].observed as {serviceType?:Service}|null;return {...r,...(observed?.serviceType?{serviceType:observed.serviceType}:{})};
  });law.results=results;law.findings=projectFindings(results,law.runId,c.completedAt);
  return {schemaVersion:1,site:c.canonicalDomain,scanId:c.scanId,packId:'lawwatch-england-wales',packVersion:'1.0',universalResults:runs[0].results,classifications,inventory,results,changes:results.filter(r=>r.ruleId.startsWith('LAW-C')),drift:results.filter(r=>r.ruleId.startsWith('LAW-I')),summary:Object.fromEntries(STATES.map(s=>[s,results.filter(r=>r.status===s).length])) as LawReport['summary'],runs,statement:REPORT_STATEMENT};
}
