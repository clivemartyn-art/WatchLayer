import type {FactSet,LawReport} from '../src/lawwatch/types.js';
import type {BrowserReport} from '../src/browser/types.js';
export function compareBrowserEvidence(browser:BrowserReport,facts:FactSet,before:LawReport,after:LawReport){
  const key=(r:LawReport['results'][number])=>[r.ruleId,r.serviceType??''].join('|');
  const resultChanges=after.results.flatMap(r=>{const b=before.results.find(x=>key(x)===key(r));return b&&b.status!==r.status?[{ruleId:r.ruleId,service:r.serviceType,before:b.status,after:r.status,renderedEvidence:JSON.stringify(r.evidence).includes('RENDERED_DOM')}]:[];});
  const serviceChanges=after.classifications.flatMap(c=>{const b=before.classifications.find(x=>x.service===c.service);return b&&b.state!==c.state?[{service:c.service,before:b.state,after:c.state}]:[];});
  const pages=browser.observations.filter(o=>o.attemptedAt).map(o=>{
    const staticPages=facts.pages.filter(p=>!p.observation&&p.sourceType!=='PDF'&&p.url===o.staticUrl);
    const rendered=facts.pages.filter(p=>p.observation?.domHash===o.domHash&&o.domHash);
    const candidates=(pages:typeof facts.pages)=>pages.flatMap(p=>Object.entries(p.signals).flatMap(([ruleId,values])=>values.map(f=>({ruleId,snippet:f.snippet,confidence:f.confidence}))));
    const old=candidates(staticPages),current=candidates(rendered),identify=(f:typeof old[number])=>f.ruleId+'|'+f.snippet;
    const oldSet=new Set(old.map(identify)),newSet=new Set(current.map(identify));
    const added=current.filter(f=>!oldSet.has(identify(f))),lost=old.filter(f=>!newSet.has(identify(f)));
    const relevantLinks=o.comparison.newLinks.filter(u=>/complaint|pric|fees?|cost|service|team|people|\.pdf(?:$|\?)/i.test(u));
    return {...o.comparison,url:o.staticUrl,status:o.status,reason:o.reason,error:o.error,scriptErrors:o.scriptErrors,durationMs:o.durationMs,newEvidence:added,lostEvidence:lost,duplicateEvidence:current.filter(f=>oldSet.has(identify(f))).length,newRelevantLinks:relevantLinks,materiallyNewEvidence:o.status==='RENDERED'&&(added.some(f=>f.confidence==='HIGH')||relevantLinks.length>0),serviceContextChanges:rendered.flatMap(p=>Object.entries(p.serviceAttributions??{}).filter(([id,a])=>!staticPages.some(s=>JSON.stringify(s.serviceAttributions?.[id])===JSON.stringify(a))).map(([id,decision])=>({id,decision})))};
  });
  return {pages,resultChanges,serviceChanges,unknownToSupported:resultChanges.filter(c=>c.before==='UNKNOWN'&&['PASS','WARNING'].includes(c.after)).length,supportedToUnknown:resultChanges.filter(c=>['PASS','WARNING'].includes(c.before)&&c.after==='UNKNOWN').length,renderedEvidenceResultChanges:resultChanges.filter(c=>c.renderedEvidence).length,materiallyNewPages:pages.filter(p=>p.materiallyNewEvidence).length};
}
