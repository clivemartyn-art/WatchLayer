import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {readBenchmark,evaluateBenchmark} from './lawwatch-benchmark.js';
import {evaluateLawWatch} from '../src/lawwatch/evaluate.js';
import {lawWatchReport} from '../src/lawwatch/report.js';
import type {FactSet,LawReport} from '../src/lawwatch/types.js';
import type {Snapshot} from '../src/snapshots/types.js';
import {attributeEvidence,attributionKey} from '../src/lawwatch/context/attribution.js';
import type {Structure} from '../src/lawwatch/context/structure.js';
const [source,output]=process.argv.slice(2);
if(!source||!output||resolve(source)===resolve(output))throw new Error('Usage: tsx scripts/replay-milestone10-live.ts saved-subset-directory new-output-directory');
const input=JSON.parse(await readFile(join(source,'summary.json'),'utf8'));
if(!Array.isArray(input.rows)||input.rows.length!==8)throw new Error('Expected the completed eight-firm fresh capture');
await mkdir(output,{recursive:false});const benchmark=readBenchmark(),rows=[];
const db=new DatabaseSync(resolve(source,'watchlayer.db'),{readOnly:true});
try{for(const old of input.rows){
  const firm=benchmark.firms.find(f=>f.firm===old.firm);if(!firm)throw new Error('Unknown benchmark firm');
  const slug=firm.firm.replace(/[^a-z0-9]+/gi,'-');const before=JSON.parse(await readFile(join(source,slug+'.report.json'),'utf8')) as LawReport;
  const scanId=before.scanId;const records=(table:string)=>db.prepare(`SELECT data_json FROM ${table} WHERE scan_id=? ORDER BY rowid`).all(scanId).map(r=>JSON.parse(String(r.data_json)));
  const metadata=JSON.parse(String(db.prepare('SELECT metadata_json FROM scans WHERE scan_id=?').get(scanId)!.metadata_json));
  const contacts=records('contact_observations');const current={...metadata,pages:records('page_observations'),documents:records('document_observations'),forms:records('form_observations'),contacts:{emails:contacts.filter(c=>c.value.includes('@')),phones:contacts.filter(c=>!c.value.includes('@'))}} as Snapshot;
  if(current.pdf)current.pdf.documents=records('document_extractions');
  const facts=JSON.parse(String(db.prepare('SELECT data_json FROM scan_fact_sets WHERE scan_id=? AND namespace=?').get(scanId,'lawwatch-england-wales')!.data_json)) as FactSet;
  const observations=JSON.parse(await readFile(join(source,slug+'.structure.json'),'utf8')) as {url:string;title:string;ruleId:string;snippet:string;structure:Structure}[];
  let attached=0;
  for(const page of facts.pages){
    if(page.sourceType==='PDF')continue;
    for(const observation of observations.filter(o=>o.url===page.url)){
      const {ruleId,snippet,structure}=observation;
      if(!ruleId.startsWith('PRICE')||![page.signals,...Object.values(page.serviceSignals??{})].some(group=>group[ruleId]?.some(f=>f.snippet===snippet)))continue;
      (page.serviceAttributions??={})[attributionKey(ruleId,snippet)]=attributeEvidence({ruleId,url:page.url,title:page.title,snippet,sourceType:'HTML',...structure});attached++;
    }
  }
  const report=evaluateLawWatch({current,facts});
  if([...report.results,...report.universalResults].some(r=>r.status==='POTENTIAL_ISSUE'))throw new Error('Serious finding requires investigation');
  await writeFile(join(output,slug+'.report.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(output,slug+'.report.txt'),lawWatchReport(report));
  rows.push({firm:firm.firm,capturedAt:current.completedAt,scanId,coverage:current.coverage,pdf:current.pdf?.summary,structuralDecisionsAttached:attached,before:evaluateBenchmark(firm,before),after:evaluateBenchmark(firm,report),adjudication:report.adjudication?.counts});
}}finally{db.close();}
await writeFile(join(output,'summary.json'),JSON.stringify({schemaVersion:1,mode:'M10 corrected-policy offline replay of the 14 September fresh capture, attaching saved bounded HTML observations to cloned facts; no additional requests or source changes',source:resolve(source),benchmarkSha256:benchmark.sha256,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({firm:r.firm,metrics:r.after.metrics,adjudication:r.adjudication})),null,2));
