import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {readBenchmark,evaluateBenchmark} from './lawwatch-benchmark.js';
import {evaluateLawWatch} from '../src/lawwatch/evaluate.js';
import {lawWatchReport} from '../src/lawwatch/report.js';
import type {FactSet,LawReport} from '../src/lawwatch/types.js';
import type {Snapshot} from '../src/snapshots/types.js';
const [source,output]=process.argv.slice(2);
if(!source||!output||resolve(source)===resolve(output))throw new Error('Usage: tsx scripts/evaluate-milestone8-subset.ts saved-subset-directory new-output-directory');
const input=JSON.parse(await readFile(join(source,'evaluation.json'),'utf8'));
if(!Array.isArray(input.evaluations)||input.evaluations.length>3)throw new Error('Expected an existing subset of up to three firms');
await mkdir(output,{recursive:false});const benchmark=readBenchmark(),rows=[];
const db=new DatabaseSync(resolve(source,'watchlayer.db'),{readOnly:true});
try{for(const old of input.evaluations){
  const firm=benchmark.firms.find(f=>f.firm===old.firm);if(!firm)throw new Error('Unknown benchmark firm');
  const slug=firm.firm.replace(/[^a-z0-9]+/gi,'-');const before=JSON.parse(await readFile(join(source,slug+'.json'),'utf8')) as LawReport;
  const scanId=before.scanId;const records=(table:string)=>db.prepare(`SELECT data_json FROM ${table} WHERE scan_id=? ORDER BY rowid`).all(scanId).map(r=>JSON.parse(String(r.data_json)));
  const metadata=JSON.parse(String(db.prepare('SELECT metadata_json FROM scans WHERE scan_id=?').get(scanId)!.metadata_json));
  const contacts=records('contact_observations');const current={...metadata,pages:records('page_observations'),documents:records('document_observations'),forms:records('form_observations'),contacts:{emails:contacts.filter(c=>c.value.includes('@')),phones:contacts.filter(c=>!c.value.includes('@'))}} as Snapshot;
  if(current.pdf)current.pdf.documents=records('document_extractions');
  const facts=JSON.parse(String(db.prepare('SELECT data_json FROM scan_fact_sets WHERE scan_id=? AND namespace=?').get(scanId,'lawwatch-england-wales')!.data_json)) as FactSet;
  const report=evaluateLawWatch({current,facts});
  await writeFile(join(output,slug+'.report.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(output,slug+'.report.txt'),lawWatchReport(report));
  rows.push({firm:firm.firm,capturedAt:current.completedAt,scanId,coverage:current.coverage,pdf:current.pdf?.summary,before:evaluateBenchmark(firm,before),after:evaluateBenchmark(firm,report),adjudication:report.adjudication?.counts});
}}finally{db.close();}
await writeFile(join(output,'summary.json'),JSON.stringify({schemaVersion:1,mode:'M8 offline replay of previous fresh M7 subset; no fresh M8 network validation',source:resolve(source),benchmarkSha256:benchmark.sha256,rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({firm:r.firm,metrics:r.after.metrics,adjudication:r.adjudication})),null,2));
