import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {load} from 'cheerio';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {createBrowserRenderer} from '../src/browser/render.js';
import {createFetcher,type Response} from '../src/crawler/http.js';
import {visibleText} from '../src/extractors/text.js';
import {sameDomain} from '../src/utils/urls.js';
import {compareBrowserEvidence} from './milestone11-comparison.js';
import type {FactSet} from '../src/lawwatch/types.js';
const [phase,output,continuationManifest]=process.argv.slice(2);if(!['baseline','post-fix','continuation-baseline','continuation-post-fix'].includes(phase)||!output)throw Error('Use baseline|post-fix|continuation-baseline|continuation-post-fix new-output-directory [continuation-manifest].');
if(phase.startsWith('continuation-')!==Boolean(continuationManifest))throw Error('A separate manifest is required only for continuation runs');
const sha=execFileSync('git',['-c','safe.directory=C:/Users/clive/OneDrive/Documents/WatchLayer','rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(phase==='baseline'){
  if(sha!=='ea7efac581022ec0c803d711706243c6e5e4466a')throw Error('Baseline requires the M11 commit');
  execFileSync('git',['-c','safe.directory=C:/Users/clive/OneDrive/Documents/WatchLayer','diff','--exit-code','HEAD','--','src']);
}
const targetFiles=continuationManifest?[continuationManifest]:['docs/Validation/milestone12/confirmed-targets.json','docs/Validation/milestone12/confirmed-additional.json'];
const targetBytes=await Promise.all(targetFiles.map(p=>readFile(p))),targets=targetBytes.flatMap(b=>JSON.parse(b.toString()).targets).filter(t=>t.label==='CONFIRMED_RENDER_GAP');
const sourceHash=createHash('sha256');async function hashTree(path:string):Promise<void>{for(const e of(await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(path,e.name);if(e.isDirectory())await hashTree(p);else sourceHash.update(p).update(await readFile(p));}}
await hashTree('src');sourceHash.update(await readFile('package-lock.json'));
await mkdir(output,{recursive:false});const save=(file:string,data:unknown)=>writeFile(join(output,file),JSON.stringify(data,null,2)+'\n');
const manifest={schemaVersion:1,phase,startingCommit:sha,sourceSha256:sourceHash.digest('hex'),targetSha256:createHash('sha256').update(Buffer.concat(targetBytes)).digest('hex'),frozenAt:new Date().toISOString(),targets:targets.map(t=>({id:t.id,organisation:t.organisation,url:t.url,expectedText:t.expectedText,expectedLink:t.expectedLink,jurisdiction:t.jurisdiction})),humanReviewed:false,limitation:'Independently observed through separate browser tooling, not yet independent human review. Non-E&W firms and a directory test generic observability, not territorial regulatory applicability. No forms, cookies, buttons, account areas or third-party egress exceptions.'};
await save('manifest.json',manifest);const repo=new SqliteRepository(join(output,'watchlayer.db')),rows:any[]=[];
try{for(const target of targets){
  console.log(phase+' '+target.id+' '+target.organisation);
  const allowedTransport:any[]=[],transport=createFetcher(target.url,100,5000);let raw:Response|undefined;
  const renderer=createBrowserRenderer({fetcher:async(url,options)=>{const began=Date.now();try{const response=await transport(url,options);allowedTransport.push({url,finalUrl:response.finalUrl,status:response.status,type:response.contentType,bytes:response.bytes?.length??Buffer.byteLength(response.body),durationMs:Date.now()-began});return response;}catch(error){allowedTransport.push({url,error:error instanceof Error?error.message:String(error),durationMs:Date.now()-began});throw error;}}});
  const common={maxPages:1,lawwatchEvidenceBudget:0,lawwatchStaffBudget:0,recheckBudget:0,pdfExtraction:false,delayMs:1000};
  const before=await scanLawWatch(target.url,repo,common);
  const run=await scanLawWatch(target.url,repo,{...common,browserFallback:true,browserRenderer:renderer,onResponse:r=>{if(r.requestedUrl===target.url)raw=r;}});
  if([...before.lawwatch.results,...run.lawwatch.results,...run.lawwatch.universalResults].some(r=>r.status==='POTENTIAL_ISSUE'))throw Error('STOP: new live serious-looking finding requires investigation');
  const facts=repo.facts<FactSet>(run.snapshot.scanId,'lawwatch-england-wales')!,observation=run.snapshot.browser!.observations[0];
  const comparison=compareBrowserEvidence(run.snapshot.browser!,facts,before.lawwatch,run.lawwatch);
  const normalize=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase(),text=visibleText(observation?.representation??'');
  const expectedTextRecovered=observation?.status==='RENDERED'&&normalize(text).includes(normalize(target.expectedText));
  const $=load(raw?.body??''),declaredExternalResources=$('script[src],link[rel="stylesheet"][href]').toArray().flatMap(e=>{try{const url=new URL($(e).attr('src')??$(e).attr('href')!,target.url).href;return sameDomain(url,target.url)?[]:[{url,tag:e.tagName,observation:'STATIC_DECLARATION_ONLY_NOT_PROOF_REQUESTED'}];}catch{return [];}});
  const row={target,scanId:run.snapshot.scanId,browser:run.lawwatch.browser,observation,expectedTextRecovered,expectedLinkRecovered:target.expectedLink?observation?.comparison.newLinks.includes(target.expectedLink)??false:null,comparison,allowedTransport,declaredExternalResources,staticAvailable:run.snapshot.pages.some(p=>p.observationStatus==='observed'),seriousFindings:0};rows.push(row);
  await save(target.id+'.json',row);await save(target.id+'.static.report.json',before.lawwatch);await save(target.id+'.report.json',run.lawwatch);await save(target.id+'.facts.json',facts);
  const attempts=rows.filter(r=>r.observation?.attemptedAt),success=attempts.filter(r=>r.observation.status==='RENDERED'),durations=attempts.map(r=>r.observation.durationMs).sort((a,b)=>a-b),ratio=(n:number,d:number)=>d?n/d:null;
  await save('summary.json',{manifest,completed:rows.length,rows:rows.map(r=>({id:r.target.id,organisation:r.target.organisation,url:r.target.url,status:r.observation?.status,reason:r.observation?.reason,expectedTextRecovered:r.expectedTextRecovered,expectedLinkRecovered:r.expectedLinkRecovered,comparison:r.comparison,durationMs:r.observation?.durationMs,error:r.observation?.error,scriptErrors:r.observation?.scriptErrors,requests:r.observation?.requests,blockedRequests:r.observation?.blockedRequests,bytes:r.observation?.bytes})),metrics:{confirmedTargets:rows.length,triggers:rows.filter(r=>['APP_SHELL_DETECTED','STATIC_BODY_TOO_SPARSE','RENDERED_LINK_DISCOVERY_REQUIRED'].includes(r.observation?.reason)).length,attempts:attempts.length,triggerRecall:ratio(attempts.length,rows.length),successfulRenders:success.length,renderSuccess:ratio(success.length,attempts.length),recovered:success.filter(r=>r.expectedTextRecovered).length,evidenceRecovery:ratio(success.filter(r=>r.expectedTextRecovered).length,success.length),materiallyNew:success.filter(r=>r.comparison.materiallyNewPages>0).length,ruleChanges:rows.reduce((n,r)=>n+r.comparison.resultChanges.length,0),unknownToSupported:rows.reduce((n,r)=>n+r.comparison.unknownToSupported,0),supportedToUnknown:rows.reduce((n,r)=>n+r.comparison.supportedToUnknown,0),classificationChanges:rows.reduce((n,r)=>n+r.comparison.serviceChanges.length,0),serviceAttributionChanges:rows.reduce((n,r)=>n+r.comparison.pages.reduce((m:number,p:any)=>m+p.serviceContextChanges.length,0),0),medianMs:durations.length?durations.length%2?durations[(durations.length-1)/2]:(durations[durations.length/2-1]+durations[durations.length/2])/2:null,p95Ms:durations.length>=20?durations[Math.ceil(durations.length*.95)-1]:null,timeoutRate:ratio(attempts.filter(r=>r.observation.status==='BROWSER_TIMED_OUT').length,attempts.length),humanReviewed:0,independentlyValidEvidence:null}});
  console.log(target.id+': '+observation?.status+'; recovered='+expectedTextRecovered+'; '+observation?.error);
}}finally{repo.close();}
