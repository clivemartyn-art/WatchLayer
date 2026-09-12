import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { aggregate,type Check } from './milestone5-metrics.js';
import { readBenchmark,benchmarkServices } from './lawwatch-benchmark.js';
import type { LawReport } from '../src/lawwatch/types.js';
const directory=resolve(process.argv[2]??'reports/milestone5/baseline');
const benchmark=readBenchmark();const checks:Check[]=[];const firms=[];const issueReview=[];
const discovery={firmsWithPricingHtml:0,firmsWithPricingDocuments:0,firmsWithComplaints:0,firmsWithSelectedServicePricing:0,firmsWithQuoteGenerator:0,totalPagesScanned:0};
const causes:Record<string,number>={};const perRuleUnknownCauses:Record<string,Record<string,number>>={};let pdfUnknownCount=0;
for(const file of (await readdir(directory)).filter(f=>f.endsWith('.evaluation.json')).sort()){
  const e=JSON.parse(await readFile(join(directory,file),'utf8'));
  if(!e.checks){const firm=benchmark.firms.find(f=>f.firm===e.firm)!;e.checks=Object.entries(firm.rules).map(([ruleId,human])=>({ruleId,human,machine:'UNKNOWN',severity:'HIGH'}));}
  checks.push(...e.checks);
  let report:LawReport|undefined;try{report=JSON.parse(await readFile(join(directory,file.replace('.evaluation.json','.report.json')),'utf8'));}catch{}
  const selected=benchmarkServices(benchmark.firms.find(f=>f.firm===e.firm)!.service);
  const surfaces=report?.inventory.filter(s=>s.observationState==='observed')??[];
  if(surfaces.some(s=>s.signal==='pricing'&&s.type==='page'))discovery.firmsWithPricingHtml++;
  if(surfaces.some(s=>s.signal==='pricing'&&s.type==='document'))discovery.firmsWithPricingDocuments++;
  if(surfaces.some(s=>s.signal==='complaints'))discovery.firmsWithComplaints++;
  if(surfaces.some(s=>s.signal==='pricing'&&s.service&&selected.includes(s.service)))discovery.firmsWithSelectedServicePricing++;
  if(surfaces.some(s=>s.signal==='quote_generator_detected'))discovery.firmsWithQuoteGenerator++;
  discovery.totalPagesScanned+=e.coverage?.pagesScanned??0;
  for(const result of report?.results??[])if(result.status==='POTENTIAL_ISSUE')issueReview.push({firm:e.firm,result});
  for(const check of e.checks as Check[])if(check.machine==='UNKNOWN'&&check.human!=='N/A'){
    const selectedServices=benchmarkServices(benchmark.firms.find(f=>f.firm===e.firm)!.service);
    const matching=report?.results.filter(r=>r.ruleId===check.ruleId&&r.status==='UNKNOWN'&&(!r.serviceType||selectedServices.includes(r.serviceType)))??[];
    const reasonCodes=matching.flatMap(r=>(r as typeof r&{unknownReasonCodes?:string[]}).unknownReasonCodes??[]);
    const primary=[...new Set(reasonCodes)][0]??(e.error?'NETWORK_FAILURE':report&&!matching.length?'AMBIGUOUS_EVIDENCE':'LEGACY_UNCLASSIFIED');causes[primary]=(causes[primary]??0)+1;
    const ruleCauses=perRuleUnknownCauses[check.ruleId]??={};ruleCauses[primary]=(ruleCauses[primary]??0)+1;
    if(primary==='DOCUMENT_CONTENT_UNAVAILABLE'&&surfaces.some(s=>s.type==='document'&&/\.pdf(?:$|[?#])/i.test(s.url)&&(check.ruleId.startsWith('PRICE')?s.service&&selected.includes(s.service):s.signal==='complaints')))pdfUnknownCount++;
  }
  firms.push({firm:e.firm,scanId:e.scanId,error:e.error,coverage:e.coverage,durationMs:e.durationMs,metrics:aggregate(e.checks).overall,
    services:report?.classifications.filter(c=>c.state.startsWith('DETECTED')),surfaces:report?.inventory.map(s=>({signal:s.signal,service:s.service,url:s.url,type:s.type})),documents:e.documents,
    quoteGenerators:report?.inventory.filter(s=>s.signal==='quote_generator_detected').map(s=>s.url),drift:report?.drift.filter(r=>r.status==='WARNING')});
}
const summary={schemaVersion:1,benchmarkSha256:benchmark.sha256,completedFirms:firms.length,...aggregate(checks),discovery,unknownCauses:causes,perRuleUnknownCauses,pdfUnknownCount,issueReview,firms};
await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({completedFirms:firms.length,...summary.overall,unknownCauses:causes},null,2));
