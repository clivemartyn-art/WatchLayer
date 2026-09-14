import { readFile,writeFile,mkdir,readdir } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { readBenchmark,evaluateBenchmark } from './lawwatch-benchmark.js';
import { aggregate } from './milestone5-metrics.js';
import { pdfLawFacts } from '../src/lawwatch/pdf.js';
import { evaluateLawWatch } from '../src/lawwatch/evaluate.js';
import { lawWatchReport } from '../src/lawwatch/report.js';
import type { Snapshot } from '../src/snapshots/types.js';
import type { FactSet,LawReport } from '../src/lawwatch/types.js';
import { negativeCases,runNegativeCase } from '../tests/fixtures/milestone6.js';
import { negativeMetrics } from './negative-metrics.js';
const args=process.argv.slice(2);let all=false,output='reports/milestone8/final',source='reports/milestone7/final';
for(let i=0;i<args.length;i++){if(args[i]==='--all')all=true;else if(args[i]==='--output'&&args[i+1])output=args[++i];else if(args[i]==='--source'&&args[i+1])source=args[++i];else throw new Error('Use --all [--source directory] [--output new-directory]');}
if(!all)throw new Error('Explicit --all is required for the full offline benchmark. No network requests are made.');
const directory=resolve(output);if(directory===resolve(source))throw new Error('Output must not overwrite the source corpus');
// New output directory only: interrupted experiments remain immutable and reviewable.
await mkdir(directory,{recursive:false});
const benchmark=readBenchmark(),hash=createHash('sha256');
async function hashTree(path:string):Promise<void>{for(const e of(await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const file=join(path,e.name);if(e.isDirectory())await hashTree(file);else hash.update(file).update(await readFile(file));}}
await hashTree('src');hash.update(await readFile('package-lock.json'));
const sourceManifest=JSON.parse(await readFile(join(source,'manifest.json'),'utf8'));
if(sourceManifest.benchmarkSha256!==benchmark.sha256)throw new Error('Benchmark hash differs from the retained corpus');
const manifest={schemaVersion:1,mode:'offline-preserved-M6-HTML-M7-PDF',source:resolve(source),sourceSha256:hash.digest('hex'),corpusSourceSha256:sourceManifest.sourceSha256,benchmarkSha256:benchmark.sha256,independentHumanReviews:0};
const save=async(file:string,value:unknown)=>writeFile(join(directory,file),JSON.stringify(value,null,2)+'\n');
await save('manifest.json',manifest);
const db=new DatabaseSync(resolve('reports/milestone6/final/watchlayer.db'),{readOnly:true});
const evaluations=[],m6Checks=[],m7Checks=[],deltas=[];
const items:(import('../src/lawwatch/adjudication/types.js').AdjudicatedItem & {firm:string})[]=[];
try{for(const [index,firm] of benchmark.firms.entries()){
  const slug=String(index+1).padStart(2,'0')+'-'+firm.firm.replace(/[^a-z0-9]+/gi,'-');
  const m7=JSON.parse(await readFile(join(source,slug+'.report.json'),'utf8')) as LawReport;
  const m6=JSON.parse(await readFile(join('reports/milestone6/final',slug+'.report.json'),'utf8')) as LawReport;
  const row=db.prepare('SELECT metadata_json FROM scans WHERE scan_id=?').get(m6.scanId);if(!row)throw new Error('Missing retained scan');
  const rows=(table:string)=>db.prepare(`SELECT data_json FROM ${table} WHERE scan_id=? ORDER BY rowid`).all(m6.scanId).map(r=>JSON.parse(String(r.data_json)));
  const contacts=rows('contact_observations');
  const current={...JSON.parse(String(row.metadata_json)),pages:rows('page_observations'),documents:rows('document_observations'),forms:rows('form_observations'),contacts:{emails:contacts.filter(c=>c.value.includes('@')),phones:contacts.filter(c=>!c.value.includes('@'))},pdf:m7.pdf} as Snapshot;
  const facts=JSON.parse(String(db.prepare('SELECT data_json FROM scan_fact_sets WHERE scan_id=? AND namespace=?').get(m6.scanId,'lawwatch-england-wales')!.data_json)) as FactSet;
  facts.detectorVersion='1.3';facts.pages.push(...pdfLawFacts(current.pdf?.documents??[],facts.pages));
  const report=evaluateLawWatch({current,facts});const evaluation=evaluateBenchmark(firm,report);
  for(const result of [...report.results,...report.universalResults]){
    if(/\b(?:non.compliant|breach|illegal|compliant)\b/i.test(result.title+' '+result.explanation))throw new Error('Unsafe generated wording');
    if(result.status==='POTENTIAL_ISSUE'&&![...m7.results,...m7.universalResults].some(r=>r.ruleId===result.ruleId&&r.resource===result.resource&&r.status==='POTENTIAL_ISSUE'))throw new Error('New serious finding requires investigation');
  }
  const changes=report.results.flatMap(r=>{const before=m7.results.find(b=>b.ruleId===r.ruleId&&b.serviceType===r.serviceType);return before&&before.status!==r.status?[{firm:firm.firm,ruleId:r.ruleId,serviceType:r.serviceType,before:before.status,after:r.status,resource:r.resource}]:[];});
  deltas.push(...changes);evaluations.push(evaluation);m6Checks.push(...evaluateBenchmark(firm,m6).checks);m7Checks.push(...evaluateBenchmark(firm,m7).checks);
  items.push(...(report.adjudication?.items??[]).map(item=>({firm:firm.firm,...item})));
  await save(slug+'.report.json',report);await writeFile(join(directory,slug+'.report.txt'),lawWatchReport(report));await save(slug+'.evaluation.json',{...evaluation,changes});
  console.log(`${index+1}/50 ${firm.firm}: ${report.adjudication?.items.length??0} PDF evidence assessments`);
}}finally{db.close();}
const negative=[];for(const test of negativeCases){const report=await runNegativeCase(test);negative.push({...test,emitted:report.results.some(r=>r.ruleId===test.ruleId&&r.status==='POTENTIAL_ISSUE')});}
const serious=negativeMetrics(negative);if(serious.falsePositives||serious.falseNegatives||serious.truePositives!==4)throw new Error('Controlled M6 serious-finding gate regressed');
const counts=Object.fromEntries(['SUPPORTED','PARTIALLY_SUPPORTED','AMBIGUOUS','NOT_RELEVANT','INSUFFICIENT_CONTEXT'].map(s=>[s,items.filter(i=>i.state===s).length]));
await save('review-queue.json',{schemaVersion:1,manifest,statement:'Automated assessments are review candidates, not independent human decisions. Keep reviewer decisions separate.',items});
await save('negative.json',{scope:'Same M6 controlled cases; not live precision',metrics:serious,cases:negative});
await save('summary.json',{...manifest,m6:aggregate(m6Checks),m7:aggregate(m7Checks),m8:aggregate(evaluations.flatMap(e=>e.checks)),adjudication:{items:items.length,counts,rejectedAmbiguousOrNotRelevant:counts.AMBIGUOUS+counts.NOT_RELEVANT,independentHumanReviews:0},serious,deltas});
console.log('Completed offline benchmark: '+directory);
