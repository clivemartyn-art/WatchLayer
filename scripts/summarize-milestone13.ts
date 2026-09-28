import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {compareRenderReviews,reviewHash} from './milestone12-review.js';
const root=process.argv[2],output=process.argv[3];
if(!root||!output)throw Error('Use completed-M13-artifact-directory new-summary.json');
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const baseline=await read(join(root,'cohort-baseline/summary.json'));
const replay=await read(join(root,'cohort-replay-v3/summary.json'));
const corrections=await read(join(root,'cohort-replay-v3/corrections.json'));
const preserved=await read(join(root,'final-preserved-v2/summary.json'));
const m10=await read(join(root,'final-service-review/after.json'));
const controls=await read(join(root,'ordinary-controls/summary.json'));
if(baseline.completed!==23||replay.completed!==23||controls.completed!==10)throw Error('Incomplete validation runs');
const queue=await read('docs/Validation/milestone13/review-v3/automated-queue.json');
if(queue.queueSha256!==reviewHash(queue.items))throw Error('Review queue hash mismatch');
// Pending review is explicit: blank templates are not submitted human decisions.
const review=compareRenderReviews(queue.items,[]);
const audit=await read(join(root,'final-audit.json'));
const testLog=await readFile(join(root,'final-tests-v4.log'),'utf8'),browserLog=await readFile(join(root,'final-browser-tests.log'),'utf8');
if(!testLog.includes('766 passed (766)')||!browserLog.includes('104 passed (104)')||audit.metadata.vulnerabilities.total!==0)throw Error('Validation gate evidence missing');
const count=(rows:any[],key:(r:any)=>string)=>Object.fromEntries([...new Set(rows.map(key))].map(k=>[k,rows.filter(r=>key(r)===k).length]));
const attempts=baseline.rows.filter((r:any)=>r.observation?.attemptedAt);
const times=attempts.map((r:any)=>r.observation.durationMs).sort((a:number,b:number)=>a-b);
const sum=(rows:any[],f:(r:any)=>number)=>rows.reduce((n,r)=>n+f(r),0);
const comparisons={reports:0,classifications:0,pdf:0,adjudication:0,inventory:0};
for(const f of(await readdir(join(root,'baseline-preserved'))).filter(f=>f.endsWith('.report.json'))){
  const before=await read(join(root,'baseline-preserved',f)),after=await read(join(root,'final-preserved-v2',f));comparisons.reports++;
  for(const field of ['classifications','pdf','adjudication','inventory'] as const)if(JSON.stringify(before[field])!==JSON.stringify(after[field]))comparisons[field]++;
}
let changedFactAttributions=0;
for(const r of baseline.rows){
  const before=await read(join(root,'cohort-baseline',r.id+'.facts.json')),after=await read(join(root,'cohort-replay-v3',r.id+'.facts.json'));
  if(JSON.stringify(before.pages.map((p:any)=>p.serviceAttributions))!==JSON.stringify(after.pages.map((p:any)=>p.serviceAttributions)))changedFactAttributions++;
}
const controlChanges={rules:0,classifications:0,attribution:0};const controlDocumentLimits:any[]=[];
const controlDb=new DatabaseSync(join(root,'ordinary-controls/watchlayer.db'),{readOnly:true});
for(const row of controls.rows){
  controlChanges.rules+=row.comparison.resultChanges.length;
  controlChanges.classifications+=row.comparison.serviceChanges.length;
  const slug=row.firm.replace(/[^a-z0-9]+/gi,'-'),before=await read(join(root,'ordinary-controls',slug+'.static.report.json')),after=await read(join(root,'ordinary-controls',slug+'.report.json'));
  for(const [mode,report] of [['static',before],['assisted',after]] as const)for(const document of report.pdf?.documents??[])if(document.status!=='EXTRACTED')controlDocumentLimits.push({firm:row.firm,mode,url:document.requestedUrl,status:document.status});
  const select=(r:any)=>{const stored=controlDb.prepare('SELECT data_json FROM scan_fact_sets WHERE scan_id=? AND namespace=?').get(r.scanId,'lawwatch-england-wales');if(!stored)throw Error('Missing control facts');return JSON.parse(String(stored.data_json)).pages.map((p:any)=>({url:p.url,sourceType:p.sourceType,attributions:p.serviceAttributions}));};
  if(JSON.stringify(select(before))!==JSON.stringify(select(after)))controlChanges.attribution++;
}
controlDb.close();
const summary={schemaVersion:1,status:'INCOMPLETE_PENDING_HUMAN_REVIEW_AND_COVERAGE_ASSESSMENT',startingSha:baseline.manifest.head,
  cohort:{targets:baseline.completed,organisations:new Set(baseline.rows.map((r:any)=>r.target.organisation)).size,jurisdictions:count(baseline.rows,r=>r.target.jurisdiction),gapClassification:count(baseline.rows,r=>r.target.label),staticPages:sum(baseline.rows,r=>r.staticCoverage.pagesScanned),assistedHttpPages:sum(baseline.rows,r=>r.assistedCoverage.pagesScanned),failedPages:sum(baseline.rows,r=>r.assistedCoverage.pagesFailed)},
  rendering:{attempts:attempts.length,completed:attempts.filter((r:any)=>r.observation.status==='RENDERED').length,recoveredOrganisations:new Set(attempts.filter((r:any)=>r.recovery.state.includes('RECOVERY')).map((r:any)=>r.target.organisation)).size,recovery:count(attempts,r=>r.recovery.state),triggerReasons:count(attempts,r=>r.observation.reason),unnecessaryAttempts:attempts.filter((r:any)=>r.target.label==='STATIC_SUFFICIENT').length,
    newCandidateFacts:sum(attempts,r=>sum(r.comparison.pages,p=>p.newEvidence.length)),newRelevantLinkOccurrences:sum(attempts,r=>sum(r.comparison.pages,p=>p.newRelevantLinks.length)),uniqueRelevantLinks:new Set(attempts.flatMap((r:any)=>r.comparison.pages.flatMap((p:any)=>p.newRelevantLinks))).size,renderedPdfLinks:attempts.flatMap((r:any)=>r.comparison.pages.flatMap((p:any)=>p.newRelevantLinks)).filter((u:string)=>/\.pdf(?:$|[?#])/i.test(u)).length,
    medianMs:times.length?times[Math.floor(times.length/2)]:null,p95Ms:times.length>=20?times[Math.ceil(times.length*.95)-1]:null,totalAddedMs:sum(attempts,r=>r.observation.durationMs),requests:sum(attempts,r=>r.observation.requests),bytes:sum(attempts,r=>r.observation.bytes),blockedRequests:sum(attempts,r=>r.observation.blockedRequests),failures:attempts.filter((r:any)=>r.observation.status==='BROWSER_FAILED').length,timeouts:attempts.filter((r:any)=>r.observation.status==='BROWSER_TIMED_OUT').length,staticRunMs:sum(baseline.rows,r=>r.staticMs),assistedRunMs:sum(baseline.rows,r=>r.assistedMs)},
  pageResults:baseline.rows.map((r:any)=>({id:r.id,organisation:r.target.organisation,jurisdiction:r.target.jurisdiction,label:r.target.label,reason:r.observation?.reason,recovery:r.recovery?.state??null,durationMs:r.observation?.durationMs??0,requests:r.observation?.requests??0,bytes:r.observation?.bytes??0,blockedRequests:r.observation?.blockedRequests??0,pdf:r.pdf})),
  correction:{mode:'OFFLINE_REPLAY_OF_PRESERVED_LIVE_CAPTURES',ruleChanges:sum(corrections,r=>r.ruleChanges.length),classificationChanges:sum(corrections,r=>r.classifications.length),changes:corrections.filter((r:any)=>r.classifications.length||r.ruleChanges.length),changedFactAttributions,pairedStaticAssistedRuleChanges:sum(replay.rows,r=>r.comparison.resultChanges.length),unknownToSupported:sum(replay.rows,r=>r.comparison.unknownToSupported),supportedToUnknown:sum(replay.rows,r=>r.comparison.supportedToUnknown),positiveClassificationChanges:replay.rows.flatMap((r:any)=>r.comparison.serviceChanges)},
  review:{queueSha256:queue.queueSha256,...review},
  preserved:{...preserved.m8.overall,resultChanges:preserved.deltas.length,structuralChanges:comparisons},
  m10:{exact:m10.exactAgreement,firmWide:m10.byExpectedAttribution.FIRM_WIDE,falseServiceAssignments:m10.falseServiceAssignment},
  ordinaryControls:{firms:controls.completed,staticPages:sum(controls.rows,r=>r.staticPagesScanned),assistedPages:sum(controls.rows,r=>r.pagesScanned),failedPages:sum(controls.rows,r=>r.pagesFailed),performance:controls.performance,changes:controlChanges,documentLimitations:controlDocumentLimits,staticMs:sum(controls.rows,r=>r.staticMs),assistedMs:sum(controls.rows,r=>r.assistedMs),rows:controls.rows.map((r:any)=>({firm:r.firm,staticPages:r.staticPagesScanned,assistedPages:r.pagesScanned,failedPages:r.pagesFailed,browserAttempts:r.browser.attempted,staticMs:r.staticMs,assistedMs:r.assistedMs}))},
  validation:{tests:766,testFiles:36,addedTests:29,browserTests:104,auditVulnerabilities:audit.metadata.vulnerabilities.total},serious:preserved.serious,limitations:['Sample observations only; no live precision claim.','Three rendered pages from one Scottish organisation; no rendered E&W or PDF recovery.','Human review remains pending; candidate counts do not mean accepted evidence.','Offline corrected cohort replay is not a fresh browser capture.','Structural comparison counts changed reports, not item-level accuracy.']};
await writeFile(output,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});console.log('Summary saved; M13 remains incomplete.');
