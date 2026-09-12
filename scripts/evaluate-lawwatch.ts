import { mkdir,writeFile,readFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { readBenchmark,evaluateBenchmark } from './lawwatch-benchmark.js';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanLawWatch } from '../src/lawwatch/service.js';
import { lawWatchReport } from '../src/lawwatch/report.js';
import type { LawReport } from '../src/lawwatch/types.js';
const args=process.argv.slice(2);const names:string[]=[];let all=false,maxPages=20,reportFile:string|undefined;
for(let i=0;i<args.length;i++){if(args[i]==='--firm'){if(!args[++i])throw new Error('--firm requires a name');names.push(args[i]);}else if(args[i]==='--all')all=true;else if(args[i]==='--max-pages')maxPages=Number(args[++i]);else if(args[i]==='--report')reportFile=args[++i];else throw new Error(`Unknown option: ${args[i]}`);}
if(!all&&!names.length){console.log('Select --firm "Exact benchmark name" (repeat for up to 3 firms). --all explicitly authorizes all 50. Optional --max-pages 1..100, or --report stored-report.json for offline evaluation.');process.exit(0);}
if(all&&names.length)throw new Error('Choose --all or named firms');
if(!all&&names.length>3)throw new Error('Small subsets are limited to 3 firms; all-firm work requires --all');
if(!Number.isInteger(maxPages)||maxPages<1||maxPages>100)throw new Error('Page budget must be 1..100');
const benchmark=readBenchmark();const selected=all?benchmark.firms:names.map(name=>{const f=benchmark.firms.find(f=>f.firm.toLowerCase()===name.toLowerCase());if(!f)throw new Error(`Benchmark firm not found: ${name}`);return f;});
if(reportFile&&selected.length!==1)throw new Error('--report requires one firm');
const directory=resolve('reports/lawwatch-evaluation',new Date().toISOString().replace(/[:.]/g,'-'));await mkdir(directory,{recursive:true});
const repository=new SqliteRepository(join(directory,'watchlayer.db'));const evaluations=[];
try{
  for(const firm of selected){
    console.log(`Evaluating ${firm.firm}: maximum ${maxPages} pages, 1000 ms request spacing.`);
    const report:LawReport=reportFile?JSON.parse(await readFile(reportFile,'utf8')):(await scanLawWatch(firm.url,repository,{maxPages,delayMs:1000,recheckBudget:0})).lawwatch;
    if(new URL(firm.url).hostname.replace(/^www\./,'')!==report.site)throw new Error('Stored report does not match benchmark firm');
    const evaluation=evaluateBenchmark(firm,report);evaluations.push(evaluation);const slug=firm.firm.replace(/[^a-z0-9]+/gi,'-');
    await writeFile(join(directory,slug+'.json'),JSON.stringify(report,null,2)+'\n');await writeFile(join(directory,slug+'.txt'),lawWatchReport(report)+'\n');console.log(JSON.stringify(evaluation.metrics,null,2));
  }
  await writeFile(join(directory,'evaluation.json'),JSON.stringify({schemaVersion:1,benchmarkSha256:benchmark.sha256,evaluations},null,2)+'\n');console.log(`Evaluation saved: ${directory}`);
}finally{repository.close();}
