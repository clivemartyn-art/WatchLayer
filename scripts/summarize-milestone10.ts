import {readFile,writeFile,mkdir} from 'node:fs/promises';
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const baseline=await read('reports/milestone10/preserved-baseline/summary.json');
const fresh=await read('reports/milestone10/live/summary.json');
const queue=await read('reports/milestone10/review-ready/queue.json');
const comparison=await read('reports/milestone10/review-pending.json');
const summary={schemaVersion:1,status:'AWAITING_SERVICE_CONTEXT_REVIEW',productionCorrections:0,benchmarkSha256:baseline.benchmarkSha256,
  preserved:baseline.m8.overall,seriousControlled:baseline.serious,pdfAutomated:baseline.adjudication,
  sample:{size:queue.sampleSize,firms:new Set(queue.items.map((i:any)=>i.firm)).size,coverage:queue.coverage,excludedM9Keys:queue.excludedM9EvidenceKeys,sources:Object.fromEntries(['PDF','HTML'].map(t=>[t,queue.items.filter((i:any)=>i.sourceType===t).length]))},
  humanReview:comparison,fresh:{completed:fresh.completed,metrics:fresh.fresh.overall,preservedSameFirms:fresh.preservedSameFirms.overall,sites:fresh.rows.map((r:any)=>({firm:r.firm,completedAt:r.completedAt,durationMs:r.durationMs,pagesScanned:r.coverage.pagesScanned,pagesFailed:r.coverage.pagesFailed,pdf:r.pdf}))},
  limitations:['No M10 human labels yet; agreement and correction rates unavailable.','Fresh validation is separate from preserved corpus replay.','Controlled serious-finding precision does not establish live precision.','Missing strata are reported, not filled with synthetic human benchmark items.']};
await mkdir('docs/Validation/milestone10',{recursive:true});await writeFile('docs/Validation/milestone10/preparation-summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary.sample,null,2));
