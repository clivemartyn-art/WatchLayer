import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {aggregate} from './milestone5-metrics.js';
import type {LawReport} from '../src/lawwatch/types.js';
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const destination='docs/Validation/milestone10';
const preserved=await read('reports/milestone10/release3/summary.json'),baseline=await read('reports/milestone10/preserved-baseline/summary.json');
const before=await read('reports/milestone10/review-final3/before.json'),after=await read('reports/milestone10/review-final3/after.json');
const fresh=await read('reports/milestone10/live-final3/summary.json');
const queue=await read(destination+'/review-queue.json');
const changes:unknown[]=[],freshChanges:unknown[]=[];
const compare=(old:LawReport,current:LawReport,output:unknown[])=>{
  const key=(r:LawReport['results'][number])=>[r.ruleId,r.serviceType??'',r.ruleId.startsWith('PRICE')?'':r.resource].join('|');
  const oldResults:LawReport['results']=[...old.results,...old.universalResults];
  const currentResults:LawReport['results']=[...current.results,...current.universalResults];
  for(const r of currentResults){const index=oldResults.findIndex(b=>key(b)===key(r));const b=index<0?undefined:oldResults.splice(index,1)[0];if(!b||b.status!==r.status)output.push({site:current.site,rule:r.ruleId,service:r.serviceType,before:b?.status??'NO_MATCH',after:r.status});}
  for(const r of oldResults)output.push({site:current.site,rule:r.ruleId,service:r.serviceType,before:r.status,after:'REMOVED'});
};
for(const file of(await readdir('reports/milestone10/release3')).filter(f=>f.endsWith('.report.json')))compare(await read(join('reports/milestone10/preserved-baseline',file)),await read(join('reports/milestone10/release3',file)),changes);
for(const file of(await readdir('reports/milestone10/live-final3')).filter(f=>f.endsWith('.report.json')))compare(await read(join('reports/milestone10/live',file)),await read(join('reports/milestone10/live-final3',file)),freshChanges);
const oldWrong=new Set(before.disagreements.map((d:{itemId:string})=>d.itemId)),newWrong=new Set(after.disagreements.map((d:{itemId:string})=>d.itemId));
const regressions=[...newWrong].filter(id=>!oldWrong.has(id));
if(regressions.length||preserved.serious.falsePositives||preserved.serious.falseNegatives||preserved.serious.truePositives!==4)throw new Error('M10 regression gate failed');
for(const name of ['after','decisions','assessments'])await writeFile(join(destination,{after:'comparison-after',decisions:'human-decisions',assessments:'attribution-assessments'}[name as 'after'|'decisions'|'assessments']+'.json'),await readFile('reports/milestone10/review-final3/'+name+'.json'));
const summary={schemaVersion:1,status:'VALIDATED',reviewer:'Clive',reviewDate:'2026-09-24',reviewSha256:createHash('sha256').update(await readFile(destination+'/clive-review-original.csv')).digest('hex'),benchmarkSha256:preserved.benchmarkSha256,packVersion:'1.6',factVersion:'1.4',serviceAttributionPolicy:'1.0',pdfSupportPolicy:'1.1',
  sample:{items:80,firms:new Set(queue.items.map((i:{firm:string})=>i.firm)).size,html:27,pdf:53,allNotesPresent:true,humanMultiService:0},
  review:{before,after,resolvedDisagreements:[...oldWrong].filter(id=>!newWrong.has(id)).length,regressions},
  preserved:{before:baseline.m8.overall,after:preserved.m8.overall,statusChanges:changes,pdfAssessments:preserved.adjudication},
  fresh:{mode:fresh.mode,sites:fresh.rows.map((r:any)=>({firm:r.firm,capturedAt:r.capturedAt,structuralDecisionsAttached:r.structuralDecisionsAttached})),before:aggregate(fresh.rows.flatMap((r:any)=>r.before.checks)).overall,after:aggregate(fresh.rows.flatMap((r:any)=>r.after.checks)).overall,statusChanges:freshChanges},
  serious:preserved.serious,
  limitations:['Service review is a correction/development sample, not held-out live accuracy.','No human MULTI_SERVICE cases; multi-service accuracy unavailable.','Fresh impact is offline replay of the September 14 capture, not new September 25 network validation.','Legacy HTML cannot reconstruct unretained structure. PDF review and support windows have different source availability.','No live serious-finding precision claim.']};
await writeFile(destination+'/final-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({review:after.exactAgreement,resolved:summary.review.resolvedDisagreements,regressions,preservedChanges:changes.length,freshChanges:freshChanges.length,fresh:summary.fresh.after,serious:summary.serious},null,2));
