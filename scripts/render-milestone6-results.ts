import { readFile,readdir,writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { metrics,type Check } from './milestone5-metrics.js';
import { readBenchmark,benchmarkServices } from './lawwatch-benchmark.js';
import type { LawReport } from '../src/lawwatch/types.js';
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const baseline=await read('reports/milestone5/final/summary.json'),final=await read('reports/milestone6/final/summary.json');
if(baseline.completedFirms!==50||final.completedFirms!==50)throw new Error('Both 50-firm cohorts must be complete.');
const negative=await read('reports/milestone6/negative.json');const audit=await read('reports/milestone6/m5-adjudication.json');
const currentAudit=await read('reports/milestone6/m6-adjudication.json');
const benchmark=readBenchmark();const perService:Record<string,Check[]>={};const issueReview=[];const replacements=[];
for(const file of (await readdir('reports/milestone6/final')).filter(f=>f.endsWith('.report.json'))){
  const report:LawReport=await read(join('reports/milestone6/final',file));const evaluation=await read(join('reports/milestone6/final',file.replace('.report.json','.evaluation.json')));
  const firm=benchmark.firms.find(f=>f.firm===evaluation.firm)!;const selected=benchmarkServices(firm.service);
  for(const r of report.results){if(r.serviceType&&selected.includes(r.serviceType)&&firm.rules[r.ruleId])(perService[r.serviceType]??=[]).push({ruleId:r.ruleId,human:firm.rules[r.ruleId],machine:r.status,severity:r.severity});}
  for(const r of [...report.results,...report.universalResults])if(r.status==='POTENTIAL_ISSUE')issueReview.push({firm:firm.firm,result:r});
  for(const check of evaluation.checks)if(audit.rows.some((r:{key:string;verdict:string})=>r.key===firm.firm+'|'+check.ruleId&&r.verdict==='FALSE_PASS'))replacements.push({firm:firm.firm,rule:check.ruleId,current:check.machine});
}
const p=(v:number|null|undefined)=>v==null?'Unavailable':(v*100).toFixed(2)+'%';
const table=(head:string[],rows:(string|number)[][])=>'| '+head.join(' | ')+' |\n| '+head.map(()=>'---').join(' | ')+' |\n'+rows.map(row=>'| '+row.join(' | ')+' |').join('\n')+'\n';
const median=(firms:{durationMs:number}[])=>{const d=firms.map(f=>f.durationMs).sort((a,b)=>a-b);return ((d[Math.floor((d.length-1)/2)]+d[Math.floor(d.length/2)])/2/60000).toFixed(2);};
const a=baseline.overall,b=final.overall;let output='\n## Final 50-firm results\n\n';
output+=table(['Metric','M5','M6'],[
  ['Exact agreement',p(a.exactAgreement.rate),p(b.exactAgreement.rate)],['Acceptable agreement',p(a.acceptableAgreement.rate),p(b.acceptableAgreement.rate)],['Human-confirmed PASS precision',p(a.passPrecision),p(b.passPrecision)],['PASS recall',p(a.passRecall),p(b.passRecall)],['WARNING precision',p(a.warningPrecision),p(b.warningPrecision)],['WARNING–Review compatibility',p(a.warningReviewCompatibility),p(b.warningReviewCompatibility)],['UNKNOWN count',a.unknownCount,b.unknownCount],['UNKNOWN rate',p(a.unknownRate),p(b.unknownRate)],['Potential issues',a.potentialIssuePredictions,b.potentialIssuePredictions],['Potential-issue precision',p(a.potentialIssuePrecision),p(b.potentialIssuePrecision)],['High-severity false-positive issue candidates',a.highSeverityFalsePositiveCount,b.highSeverityFalsePositiveCount],['HTML pages scanned',baseline.discovery.totalPagesScanned,final.discovery.totalPagesScanned],['Median firm duration (minutes)',median(baseline.firms),median(final.firms)],['Total firm duration (minutes)',(baseline.firms.reduce((n:number,f:{durationMs:number})=>n+f.durationMs,0)/60000).toFixed(1),(final.firms.reduce((n:number,f:{durationMs:number})=>n+f.durationMs,0)/60000).toFixed(1)],
]);
output+='\n## Per-rule results\n\n'+table(['Rule','M5 PASS precision','M6 PASS count','Human Pass confirmations','M6 PASS precision','M6 recall','M6 UNKNOWN','Exact','Acceptable'],Object.keys(final.perRule).map(id=>{const m=final.perRule[id];return [id,p(baseline.perRule[id].passPrecision),m.passPredictions,m.exactAgreement.count,p(m.passPrecision),p(m.passRecall),p(m.unknownRate),p(m.exactAgreement.rate),p(m.acceptableAgreement.rate)];}));
output+='\n## M5 evidence adjudication by rule\n\nFalse PASS below means explicit selected-evidence inspection, not automatic disagreement with human Review. The reviewer identity and reasons are retained separately.\n\n'+table(['Rule','Machine PASS','Human confirmed','False PASS found','Unresolved','Human-confirmed precision'],Object.keys(audit.perRule).map(id=>{const m=audit.perRule[id];return [id,m.machinePass,m.humanConfirmed,m.falsePass,m.unresolved,p(m.passPrecision)];}));
output+='\n### Previously unsupported M5 observations in M6\n\nA retained PASS requires inspection of its new evidence; previous adjudication is not blindly transferred.\n\n'+table(['Firm','Rule','M6 result'],replacements.map(r=>[r.firm,r.rule,r.current]));
output+='\n### Current M6 PASS review status\n\nKnown false PASS counts reflect explicit current selected-evidence decisions only. Unresolved rows are not declared correct, and these counts are distinct from serious-issue false positives.\n\n'+table(['Rule','Machine PASS','Human confirmed','Known false PASS','Unresolved current review'],Object.keys(currentAudit.perRule).map(id=>{const m=currentAudit.perRule[id];return [id,m.machinePass,m.humanConfirmed,m.falsePass,m.unresolved];}));
output+='\n## Per-service descriptive results\n\n'+table(['Service','Scored checks','PASS precision','Recall','UNKNOWN'],Object.keys(perService).map(service=>{const m=metrics(perService[service]);return [service,m.eligibleChecks,p(m.passPrecision),p(m.passRecall),p(m.unknownRate)];}));
output+='\n## UNKNOWN distribution\n\n'+table(['Primary reason','Count','Share of UNKNOWN'],Object.entries(final.unknownCauses as Record<string,number>).map(([reason,n])=>[reason,n,p(n/b.unknownCount)]));
output+=`\nRelevant unparsed PDF evidence accompanies ${final.pdfUnknownCount} primary document-related unknown checks (${p(final.pdfUnknownCount/b.unknownCount)} of remaining UNKNOWN). This does not establish that PDF parsing would resolve them.\n`;
output+='\n## Controlled negative benchmark precision and recall\n\n'+table(['Rule','Cases','Expected issues','Emitted','TP','FP','FN','Precision','Recall'],['overall',...Object.keys(negative.perRule)].map(id=>{const m=id==='overall'?negative.overall:negative.perRule[id];return [id,m.totalCases,m.expectedIssues,m.emittedIssues,m.truePositives,m.falsePositives,m.falseNegatives,p(m.precision),p(m.recall)];}));
output+=`\nAll-pack serious findings requiring manual review: ${issueReview.length}. The full evidence is saved in reports/milestone6/serious-review.json.\n`;
await writeFile('reports/milestone6/serious-review.json',JSON.stringify(issueReview,null,2)+'\n');
await writeFile('reports/milestone6/per-service.json',JSON.stringify(Object.fromEntries(Object.entries(perService).map(([s,checks])=>[s,metrics(checks)])),null,2)+'\n');
const contextPattern=/privacy|data[^/]*complaint|nhs|notar|\/news\/|\/blog\//i;
async function complaintContexts(directory:string){const urls=new Set<string>();for(const file of (await readdir(directory)).filter(f=>f.endsWith('.report.json'))){const r:LawReport=await read(join(directory,file));for(const evidence of r.results.find(r=>r.ruleId==='LAW-U004')?.evidence??[]){const observed=evidence.observed as {matches?:{url:string}[]}|null;for(const match of observed?.matches??[])if(contextPattern.test(match.url))urls.add(match.url);}}return [...urls].sort();}
await writeFile('reports/milestone6/complaints-context.json',JSON.stringify({note:'Review nominations, not independent false-positive ground truth',pattern:contextPattern.source,m5:await complaintContexts('reports/milestone5/final'),m6:await complaintContexts('reports/milestone6/final')},null,2)+'\n');
const path='docs/MILESTONE_6_BENCHMARK.md';const document=await readFile(path,'utf8');await writeFile(path,document.split('<!-- M6_RESULTS -->')[0]+'<!-- M6_RESULTS -->\n'+output);
console.log('M6 result tables rendered from saved checkpoints, without crawling.');
