import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {sampleReviewQueue,pdfReviewItem,toReviewCsv,type ReviewItem} from './milestone9-review.js';
import type {LawReport} from '../src/lawwatch/types.js';
import {lawPack} from '../src/lawwatch/pack.js';
const source='reports/milestone8/release';const output=process.argv[2]??'reports/milestone9/review';
const queue=JSON.parse(await readFile(join(source,'review-queue.json'),'utf8'));const items:ReviewItem[]=queue.items.map(pdfReviewItem);
for(const file of(await readdir(source)).filter(f=>f.endsWith('.report.json')).sort()){
  const report=JSON.parse(await readFile(join(source,file),'utf8')) as LawReport;
  const evaluation=JSON.parse(await readFile(join(source,file.replace('.report.json','.evaluation.json')),'utf8'));
  for(const i of items.filter(i=>i.firm===evaluation.firm))i.affectedResults=report.results.filter(r=>r.ruleId===i.ruleId&&(!r.serviceType||r.serviceType===i.service)).map(r=>({ruleId:r.ruleId,service:r.serviceType,status:r.status}));
  for(const r of report.results)for(const e of r.evidence){const observed=e.observed as {matches?:{url:string;title?:string;fact:{source?:unknown;snippet:string;method:string}}[]}|undefined;
    for(const m of observed?.matches??[]){if(m.fact.source||!m.url||!m.fact.snippet)continue;const id=createHash('sha256').update(JSON.stringify([evaluation.firm,r.ruleId,r.serviceType,m.url,m.fact.snippet])).digest('hex');if(items.some(i=>i.id===id))continue;
      items.push({id,firm:evaluation.firm,sourceType:'HTML',url:m.url,title:m.title??'',referrers:[],ruleId:r.ruleId,service:r.serviceType??'FIRM_WIDE',snippet:m.fact.snippet,context:'',automated:'NOT_ASSESSED',rationale:'M8 has no independent HTML adjudication state. Rule result is not an adjudication label.',tags:['html_control','context_limit'],affectedResults:[{ruleId:r.ruleId,service:r.serviceType,status:r.status}],duplicateIds:[],headingContext:'UNAVAILABLE'});
    }
  }
}
const sample=sampleReviewQueue(items);await mkdir(output,{recursive:false});
await writeFile(join(output,'queue.json'),JSON.stringify({...sample,sourceManifest:queue.manifest,humanReviewed:0,ruleDefinitions:Object.fromEntries(lawPack.rules.map(r=>[r.id,r.name])),limitations:['Stratified purposive sample, not a population precision estimate.','HTML controls have no M8 adjudication labels and are excluded from adjudication agreement.','PDF heading positions were not retained; unavailable means unknown, not distant.','Target tags nominate review risks, not confirmed errors.']},null,2)+'\n');
await writeFile(join(output,'review-blind.csv'),toReviewCsv(sample.items,true));await writeFile(join(output,'review-with-automated.csv'),toReviewCsv(sample.items,false));
await writeFile(join(output,'human-decisions.json'),'[]\n');
console.log(JSON.stringify({sampleSize:sample.sampleSize,states:Object.fromEntries([...new Set(sample.items.map(i=>i.automated))].map(s=>[s,sample.items.filter(i=>i.automated===s).length])),coverage:sample.coverage,output},null,2));
