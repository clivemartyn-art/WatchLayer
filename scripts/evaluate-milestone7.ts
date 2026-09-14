import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile,writeFile,mkdir,readdir,rename } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { readBenchmark,evaluateBenchmark } from './lawwatch-benchmark.js';
import { aggregate,type Check } from './milestone5-metrics.js';
import { createFetcher,USER_AGENT } from '../src/crawler/http.js';
import { sameDomain,normalize } from '../src/utils/urls.js';
import { processPdfs } from '../src/documents/process.js';
import { pdfLawFacts } from '../src/lawwatch/pdf.js';
import { evaluateLawWatch } from '../src/lawwatch/evaluate.js';
import { lawWatchReport } from '../src/lawwatch/report.js';
import type { FactSet,LawReport } from '../src/lawwatch/types.js';
import type { Snapshot } from '../src/snapshots/types.js';
import { PDF_LIMITS } from '../src/documents/types.js';
import { PDF_PARSER_VERSION } from '../src/documents/parser.js';

// Paired PDF enrichment: original HTML observations stay fixed, and ONLY PDFs
// already discovered in M6 are requested. This is not a fresh 50-site HTML crawl.
const args=process.argv.slice(2);const names=args.flatMap((a,i)=>a==='--firm'?[args[i+1]]:[]);
if(!args.includes('--all')&&!names.length)throw new Error('Use --firm "Name" or --all for explicit paired M6/PDF evaluation.');
if(!args.includes('--all')&&names.length>3)throw new Error('Use at most three firms or explicit --all.');
const benchmark=readBenchmark();const firms=benchmark.firms.filter(f=>args.includes('--all')||names.includes(f.firm));
if(!firms.length||names.some(name=>!benchmark.firms.some(f=>f.firm===name)))throw new Error('Unknown benchmark firm.');
const reuse=args.includes('--reuse-pdf')?resolve(args[args.indexOf('--reuse-pdf')+1]):undefined;
const directory=resolve(args.includes('--output')?args[args.indexOf('--output')+1]:'reports/milestone7/paired');await mkdir(directory,{recursive:true});
if(reuse===directory)throw new Error('Replay output must differ from its read-only PDF input.');
const sourceHash=createHash('sha256');async function hashTree(path:string):Promise<void>{for(const e of(await readdir(path,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=join(path,e.name);if(e.isDirectory())await hashTree(p);else{sourceHash.update(p);sourceHash.update(await readFile(p));}}}
await hashTree('src');sourceHash.update(await readFile('package-lock.json'));
const manifest={mode:reuse?'paired-M6-HTML-retained-PDF':'paired-M6-HTML-current-PDF',...(reuse?{pdfSource:reuse}:{}),sourceSha256:sourceHash.digest('hex'),benchmarkSha256:benchmark.sha256,parser:PDF_PARSER_VERSION,limits:PDF_LIMITS,baseline:'reports/milestone6/final',delayMs:1000};
async function atomic(path:string,value:unknown){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
let oldManifest;try{oldManifest=JSON.parse(await readFile(join(directory,'manifest.json'),'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
if(oldManifest&&JSON.stringify(oldManifest)!==JSON.stringify(manifest))throw new Error('Source changed; refusing to mix paired evaluation versions. Preserve this directory and choose a new experiment.');
if(!oldManifest)await atomic(join(directory,'manifest.json'),manifest);
// Read-only raw connection deliberately avoids migrations or writes to M6 history.
const db=new DatabaseSync(resolve('reports/milestone6/final/watchlayer.db'),{readOnly:true});
const robotsParser=createRequire(import.meta.url)('robots-parser') as (url:string,body:string)=>{isAllowed:(url:string,agent:string)=>boolean|undefined};
try{
 for(const firm of firms){
  const index=benchmark.firms.indexOf(firm),slug=String(index+1).padStart(2,'0')+'-'+firm.firm.replace(/[^a-z0-9]+/gi,'-');const path=join(directory,slug+'.evaluation.json');
  try{await readFile(path);console.log(`Resume: ${firm.firm}`);continue;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  const before=JSON.parse(await readFile(join(manifest.baseline,slug+'.report.json'),'utf8')) as LawReport;
  const row=db.prepare('SELECT metadata_json FROM scans WHERE scan_id=?').get(before.scanId)!;
  const rows=(table:string)=>db.prepare(`SELECT data_json FROM ${table} WHERE scan_id=? ORDER BY rowid`).all(before.scanId).map(r=>JSON.parse(String(r.data_json)));
  const contacts=rows('contact_observations');
  const current={...JSON.parse(String(row.metadata_json)),pages:rows('page_observations'),documents:rows('document_observations'),forms:rows('form_observations'),contacts:{emails:contacts.filter(r=>r.value.includes('@')),phones:contacts.filter(r=>!r.value.includes('@'))}} as Snapshot;
  const facts=JSON.parse(String(db.prepare('SELECT data_json FROM scan_fact_sets WHERE scan_id=? AND namespace=?').get(before.scanId,'lawwatch-england-wales')!.data_json)) as FactSet;
  const sourceFacts=structuredClone(facts);facts.detectorVersion='1.3';
  const fetcher=createFetcher(current.inputUrl,1000);const policies=new Map<string,ReturnType<typeof robotsParser>>();
  const allowed=async(url:string)=>{
   if(!sameDomain(normalize(url),current.inputUrl))throw new Error('Outside target domain');
   const origin=new URL(url).origin;
   if(!policies.has(origin)){const robots=await fetcher(origin+'/robots.txt');const body=robots.status>=200&&robots.status<300?robots.body:robots.status===404?'': 'User-agent: *\nDisallow: /';policies.set(origin,robotsParser(origin+'/robots.txt',body));}
   if(policies.get(origin)!.isAllowed(url,USER_AGENT)===false)throw new Error('Excluded by robots.txt');
  };
  const candidates=current.documents.filter(d=>d.type==='pdf'&&d.observationStatus==='observed').map(d=>({url:d.url,referrers:d.sourcePages.map(url=>({url,anchor:sourceFacts.pages.find(p=>p.url===url)?.links.find(l=>l.url===d.url)?.label??''}))}));
  console.log(`${index+1}/50 ${firm.firm}: ${candidates.length} discovered PDF candidates`);const started=Date.now();
  const pdf:import('../src/documents/types.js').PdfReport=reuse?JSON.parse(await readFile(join(reuse,slug+'.report.json'),'utf8')).pdf:await processPdfs(candidates,current.inputUrl,fetcher,allowed);
  if(pdf.documents.some(d=>d.parserVersion!==PDF_PARSER_VERSION||d.normalizationVersion!==1))throw new Error('Retained PDF parser version is incompatible.');
  facts.pages.push(...pdfLawFacts(pdf.documents,facts.pages));
  // New report/run objects only; M6 snapshots, fact sets and reports are never changed.
  const report=evaluateLawWatch({current:{...current,pdf},facts});
  const beforeEvaluation=evaluateBenchmark(firm,before),evaluation=evaluateBenchmark(firm,report);
  const changes=evaluation.checks.flatMap(check=>{const old=beforeEvaluation.checks.find(c=>c.ruleId===check.ruleId)!;return old.machine===check.machine?[]:[{...check,before:old.machine}];});
  await atomic(join(directory,slug+'.report.json'),report);await writeFile(join(directory,slug+'.report.txt'),lawWatchReport(report));
  const pdfFetchedAt=reuse?JSON.parse(await readFile(join(reuse,slug+'.evaluation.json'),'utf8')).pdfFetchedAt:new Date().toISOString();
  await atomic(path,{...evaluation,mode:manifest.mode,baselineScanId:before.scanId,htmlObservedAt:current.completedAt,pdfFetchedAt,durationMs:Date.now()-started,pdf:pdf.summary,changes,before:beforeEvaluation});
  console.log(`Completed ${firm.firm}: ${pdf.summary.extracted} extracted, ${changes.length} changed checks.`);
 }
 const evaluations=[];for(const file of(await readdir(directory)).filter(f=>f.endsWith('.evaluation.json')).sort())evaluations.push(JSON.parse(await readFile(join(directory,file),'utf8')));
 const checks:Check[]=evaluations.flatMap(e=>e.checks);const before:Check[]=evaluations.flatMap(e=>e.before.checks);
 await atomic(join(directory,'summary.json'),{...manifest,completedFirms:evaluations.length,before:aggregate(before),after:aggregate(checks),pdf: evaluations.reduce((a,e)=>{for(const [k,v]of Object.entries(e.pdf))a[k]=(a[k]??0)+Number(v);return a;},{} as Record<string,number>),changes:evaluations.flatMap(e=>e.changes.map((c:unknown)=>({firm:e.firm,...c as object}))),evaluations});
 console.log(`Paired evaluation complete: ${evaluations.length} firms. ${directory}`);
}finally{db.close();}
