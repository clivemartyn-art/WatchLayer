import {replayContext} from './milestone13-replay-context.js';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {evaluateLawWatch} from '../src/lawwatch/evaluate.js';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {compareBrowserEvidence} from './milestone11-comparison.js';
import {classifyRecovery,expectedMatches,dependencyCategory} from './milestone13-evidence.js';
import type {FactSet} from '../src/lawwatch/types.js';
const [phase,input,output]=process.argv.slice(2);if(!['baseline','post-fix'].includes(phase)||!input||!output)throw Error('Use baseline|post-fix frozen-targets.json new-output-directory');
const git=(...args:string[])=>execFileSync('git',['-c','safe.directory=C:/Users/clive/OneDrive/Documents/WatchLayer',...args],{encoding:'utf8'}).trim();
if(phase==='baseline'){if(git('rev-parse','HEAD')!=='1ce044f0a55f39c88fc764967f92fc2fa6a11bad')throw Error('Baseline must be M12');git('diff','--exit-code','HEAD','--','src');}
const targetBytes=await readFile(input),cohort=JSON.parse(targetBytes.toString());
const hash=createHash('sha256');async function tree(p:string):Promise<void>{for(const e of(await readdir(p,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const f=join(p,e.name);if(e.isDirectory())await tree(f);else hash.update(f).update(await readFile(f));}}
await tree('src');hash.update(await readFile('package-lock.json'));
await mkdir(output,{recursive:false});const save=(file:string,data:unknown)=>writeFile(join(output,file),JSON.stringify(data,null,2)+'\n');
const manifest={schemaVersion:1,phase,head:git('rev-parse','HEAD'),sourceSha256:hash.digest('hex'),targetSha256:createHash('sha256').update(targetBytes).digest('hex'),startedAt:new Date().toISOString(),pagesPerScan:1,evidenceBudget:0,staffBudget:0,recheckBudget:0,delayMs:1000,pdfExtraction:true,targets:cohort.targets.length,scope:'Sequential one-page static/assisted pairs; existing PDF limits. No interaction or network exceptions. Non-E&W rule results are experimental only.'};
await save('manifest.json',manifest);const repo=new SqliteRepository(join(output,'watchlayer.db')),rows:any[]=[];
try{for(const target of cohort.targets){
  if(target.label==='OUT_OF_SCOPE'){rows.push({id:target.id,skipped:true,target});continue;}
  console.log(target.id+' '+target.organisation);const started=Date.now();
  const opts={maxPages:1,lawwatchEvidenceBudget:0,lawwatchStaffBudget:0,recheckBudget:0,delayMs:1000};
  const before=await scanLawWatch(target.url,repo,opts),staticMs=Date.now()-started;let raw='';
  const began=Date.now(),run=await scanLawWatch(target.url,repo,{...opts,browserFallback:true,onResponse:r=>{if(r.requestedUrl===target.url)raw=r.body;}});
  const facts=repo.facts<FactSet>(run.snapshot.scanId,'lawwatch-england-wales')!,browser=run.snapshot.browser!,observation=browser.observations[0];
  const comparison=compareBrowserEvidence(browser,facts,before.lawwatch,run.lawwatch);
  const ablated=evaluateLawWatch({...replayContext(run.snapshot,repo),current:{...run.snapshot,browser:undefined},facts:{...facts,pages:facts.pages.filter(p=>!p.observation)}});
  const direct=compareBrowserEvidence(browser,facts,ablated,run.lawwatch).resultChanges;
  const serious=[...before.lawwatch.results,...run.lawwatch.results,...run.lawwatch.universalResults].filter(r=>r.status==='POTENTIAL_ISSUE');
  const recovery=observation?.attemptedAt?classifyRecovery(observation,target,comparison.materiallyNewPages>0):null;
  const row={id:target.id,target,scanId:run.snapshot.scanId,staticMs,assistedMs:Date.now()-began,staticCoverage:before.snapshot.coverage,assistedCoverage:run.snapshot.coverage,observation,recovery,staticExpectedMatches:expectedMatches(raw,target.url,target.expectedTexts,target.expectedLinks),comparison,directRenderedChanges:direct,pdf:run.snapshot.pdf,documents:run.snapshot.documents,seriousFindings:serious.length,dependencyEvents:observation?.resourceEvents?.map(e=>({...e,category:dependencyCategory(e,target.url)}))??[]};
  rows.push(row);await save(target.id+'.json',row);await save(target.id+'.static.report.json',before.lawwatch);await save(target.id+'.report.json',run.lawwatch);await save(target.id+'.facts.json',facts);
  await save('summary.json',{manifest,completed:rows.length,rows:rows.map(r=>({...r,pdf:r.pdf?.summary,documents:undefined,observation:r.observation?{...r.observation,representation:undefined}:undefined})),humanReviewed:0});
  if(serious.length)throw Error('STOP: serious live finding requires manual investigation');
  console.log(target.id+': '+(recovery?.state??'NOT_ATTEMPTED')+'; '+observation?.reason);
}}finally{repo.close();}
