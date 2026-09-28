import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {attributionKey} from '../src/lawwatch/context/attribution.js';
import type {FactSet,LawReport} from '../src/lawwatch/types.js';
import {reviewHash,reviewableRecovery,renderedReviewContext,type RenderReviewItem} from './milestone12-review.js';
const [source,output]=process.argv.slice(2);if(!source||!output)throw Error('Use input-run-directory new-review-directory');
const summary=JSON.parse(await readFile(join(source,'summary.json'),'utf8'));
const items:RenderReviewItem[]=[];
for(const row of summary.rows){
  if(!reviewableRecovery(row))continue;
  const data=JSON.parse(await readFile(join(source,row.id+'.json'),'utf8'));
  const facts:FactSet=JSON.parse(await readFile(join(source,row.id+'.facts.json'),'utf8'));
  const report:LawReport=JSON.parse(await readFile(join(source,row.id+'.report.json'),'utf8'));
  const pages=facts.pages.filter(p=>p.observation?.domHash===data.observation.domHash);
  for(const comparison of data.comparison.pages){
    const candidates=[{text:data.target.expectedText,rule:null},...comparison.newEvidence.map((e:{ruleId:string;snippet:string})=>({text:e.snippet,rule:e.ruleId})),...comparison.newRelevantLinks.map((url:string)=>({text:url,rule:null}))];
    for(const candidate of candidates){
      const attribution=pages.map(p=>p.serviceAttributions?.[attributionKey(candidate.rule??'',candidate.text)]).find(Boolean);
      const results=report.results.filter(r=>r.ruleId===candidate.rule);
      const context=renderedReviewContext(data.observation.representation??'',candidate.text);
      const sourceHash=reviewHash(data.observation.representation),id=reviewHash([row.url,sourceHash,candidate.rule,candidate.text]);
      if(items.some(i=>i.id===id))continue;
      items.push({id,organisation:row.organisation,url:row.url,sourceType:'RENDERED_DOM',sourceHash,evidenceText:candidate.text.slice(0,1000),context,targetRule:candidate.rule,targetServices:attribution?.services??[],staticEvidenceState:'MATCH_NOT_PRESENT_IN_PAIRED_STATIC_FACTS',renderedEvidenceState:'CANDIDATE_EXTRACTED',automatedAdjudication:results.map(r=>({rule:r.ruleId,service:r.serviceType??null,status:r.status,evidence:r.evidence})),serviceAttribution:attribution??null,ruleResultChanged:data.comparison.resultChanges.some((c:{ruleId:string})=>c.ruleId===candidate.rule),jurisdiction:data.target.jurisdiction});
    }
  }
}
await mkdir(output,{recursive:false});
const queue={schemaVersion:1,source,items,queueSha256:reviewHash(items),status:items.length?'AWAITING_INDEPENDENT_REVIEW':'NO_RECOVERED_CANDIDATES'};
await writeFile(join(output,'automated-queue.json'),JSON.stringify(queue,null,2)+'\n',{flag:'wx'});
const blind=items.map(({automatedAdjudication,serviceAttribution,staticEvidenceState,renderedEvidenceState,ruleResultChanged,...item})=>item);
await writeFile(join(output,'reviewer-context.json'),JSON.stringify({schemaVersion:1,queueSha256:queue.queueSha256,items:blind},null,2)+'\n',{flag:'wx'});
await writeFile(join(output,'human-decisions.json'),JSON.stringify({schemaVersion:1,queueSha256:queue.queueSha256,decisions:items.map(i=>({itemId:i.id,label:'',usefulPublicEvidence:'',serviceContext:'',ruleSupport:'',reviewer:'',reviewedAt:'',notes:''}))},null,2)+'\n',{flag:'wx'});
console.log(`${items.length} recovered candidates; human decisions remain blank.`);
