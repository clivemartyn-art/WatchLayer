import { mkdir, readFile, writeFile, rename, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { readBenchmark, evaluateBenchmark } from './lawwatch-benchmark.js';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanLawWatch } from '../src/lawwatch/service.js';
import { lawWatchReport } from '../src/lawwatch/report.js';

// Each completed firm is a durable checkpoint. Resume never repeats completed firms.
const args=process.argv.slice(2);
const phase=args[args.indexOf('--phase')+1];
if(!args.includes('--all')||!['baseline','final'].includes(phase)) throw new Error('Use --phase baseline|final --all; this explicitly selects the full cohort.');
const benchmark=readBenchmark();
const hash=createHash('sha256');
async function hashTree(directory:string):Promise<void>{for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=join(directory,entry.name);if(entry.isDirectory())await hashTree(path);else{hash.update(path);hash.update(await readFile(path));}}}
await hashTree('src');
const identity={benchmarkSha256:benchmark.sha256,sourceSha256:hash.digest('hex'),maxPages:20,delayMs:1000,recheckBudget:0,...(phase==='final'?{lawwatchEvidenceBudget:40,lawwatchStaffBudget:5}:{})};
const directory=resolve('reports/milestone5',phase);await mkdir(directory,{recursive:true});
async function atomic(path:string,value:unknown){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
const manifestPath=join(directory,'manifest.json');
let existing:unknown;try{existing=JSON.parse(await readFile(manifestPath,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
if(existing&&JSON.stringify(existing)!==JSON.stringify(identity))throw new Error('Baseline/configuration changed: refusing to mix scanner versions in one evaluation.');
if(!existing)await atomic(manifestPath,identity);
const repository=new SqliteRepository(join(directory,'watchlayer.db'));
try{
  for(const [index,firm] of benchmark.firms.entries()){
    const slug=String(index+1).padStart(2,'0')+'-'+firm.firm.replace(/[^a-z0-9]+/gi,'-');
    const checkpoint=join(directory,slug+'.evaluation.json');
    try{await readFile(checkpoint);console.log(`Resume: ${firm.firm} already complete.`);continue;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
    console.log(`${new Date().toISOString()} ${index+1}/${benchmark.firms.length} ${firm.firm}`);
    const started=Date.now();
    // One database per phase retains immutable snapshots and selected facts, never raw HTML.
    try{
      let responses=0;
      const run=await scanLawWatch(firm.url,repository,{...identity,onResponse:r=>{if(r.status>=200&&r.status<300&&/html/i.test(r.contentType)&&++responses%10===0)console.log(`${firm.firm}: ${responses} HTML responses observed.`);}});
      await atomic(join(directory,slug+'.report.json'),run.lawwatch);
      await writeFile(join(directory,slug+'.report.txt'),lawWatchReport(run.lawwatch)+'\n');
      await atomic(checkpoint,{...evaluateBenchmark(firm,run.lawwatch),scanId:run.snapshot.scanId,durationMs:Date.now()-started,coverage:run.snapshot.coverage,documents:run.snapshot.documents.length,errors:run.snapshot.errors});
      console.log(`Completed ${firm.firm}: ${run.snapshot.coverage.pagesScanned} pages.`);
    }catch(error){await atomic(checkpoint,{firm:firm.firm,durationMs:Date.now()-started,error:error instanceof Error?error.message:String(error)});console.log(`Recorded unsuccessful scan: ${firm.firm}`);}
  }
  const evaluations=[];for(const file of (await readdir(directory)).filter(f=>f.endsWith('.evaluation.json')).sort())evaluations.push(JSON.parse(await readFile(join(directory,file),'utf8')));
  await atomic(join(directory,'evaluation.json'),{schemaVersion:1,...identity,evaluations});
  console.log(`Evaluation complete: ${directory}`);
}finally{repository.close();}
