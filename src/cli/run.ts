import { scanLawWatch } from '../lawwatch/service.js';
import { lawWatchReport } from '../lawwatch/report.js';
import { readFile, writeFile } from 'node:fs/promises';
import { runRules } from '../rules/engine.js';
import { universalPack, validatePack } from '../rules/pack.js';
import { findingsReport } from '../reporting/findings.js';
import type { Snapshot } from '../snapshots/types.js';
import { scan } from '../crawler/scan.js';
import { scanAndPersist } from '../snapshots/service.js';
import { SqliteRepository, DEFAULT_DATABASE } from '../storage/sqlite.js';
import { domain, normalize } from '../utils/urls.js';
import { selectBaseline } from '../comparison/eligibility.js';
import { compareSnapshots } from '../comparison/diff.js';
import { terminalReport } from '../reporting/terminal.js';
import { changeReport } from '../reporting/changes.js';

type Command = 'scan'|'compare'|'history'|'export-scan'|'rules'|'findings';
export async function runCli(command: Command, arguments_: string[]): Promise<void> {
  let repository: SqliteRepository | undefined;
  try {
    const args=[...arguments_];
    if (!args.length||args.includes('--help')) {
      console.log(`Usage: npm run ${command} -- <${command==='export-scan'?'scan-id':command==='rules'?'scan-id or URL':'URL'}> [--db path] [--json] [--output file]${command==='scan'?' [--compare] [--rules] [--lawwatch] [--lawwatch-evidence-budget 40] [--lawwatch-staff-budget 5] [--pack file.json] [--no-pdf-extraction] [--no-persist] [--max-pages 100] [--recheck-budget 20]':command==='rules'?' [--pack file.json]':''}`); return;
    }
    const input=args.shift()!;
    let db=DEFAULT_DATABASE; let json=false; let output: string|undefined; let compare=false; let persist=true; let maxPages=100; let recheckBudget=20;
    let pdfExtraction=true; let law=false; let rules=false; const packFiles:string[]=[];let lawwatchEvidenceBudget:number|undefined,lawwatchStaffBudget:number|undefined;
    while(args.length) {
      const flag=args.shift()!;
      const value=()=>{const next=args.shift();if(!next||next.startsWith('--'))throw new Error(`${flag} requires a value`);return next;};
      if(flag==='--json')json=true;
      else if(command==='scan'&&flag==='--no-pdf-extraction')pdfExtraction=false;
      else if(command==='scan'&&flag==='--lawwatch')law=true;
      else if(command==='scan'&&flag==='--lawwatch-evidence-budget')lawwatchEvidenceBudget=Number(value());
      else if(command==='scan'&&flag==='--lawwatch-staff-budget')lawwatchStaffBudget=Number(value());
      else if(command==='scan'&&flag==='--rules')rules=true;
      else if((command==='rules'||command==='scan')&&flag==='--pack')packFiles.push(value());
      else if(flag==='--db')db=value();
      else if(flag==='--output')output=value();
      else if(command==='scan'&&flag==='--compare')compare=true;
      else if(command==='scan'&&flag==='--no-persist')persist=false;
      else if(command==='scan'&&flag==='--max-pages')maxPages=Number(value());
      else if(command==='scan'&&flag==='--recheck-budget')recheckBudget=Number(value());
      else throw new Error(`Unknown option: ${flag}`);
    }
    if(compare&&!persist)throw new Error('--compare requires persistence');
    if(law&&!persist)throw new Error('--lawwatch requires persistence');
    if(!law&&(lawwatchEvidenceBudget!==undefined||lawwatchStaffBudget!==undefined))throw new Error('LawWatch budgets require --lawwatch');
    if(rules&&!persist)throw new Error('--rules requires persistence');
    if(packFiles.length&&command==='scan'&&!rules)throw new Error('--pack requires --rules');
    if(command!=='export-scan'&&command!=='rules')normalize(input);
    const packs=packFiles.length?await Promise.all(packFiles.map(async file=>validatePack(JSON.parse(await readFile(file,'utf8'))))):[universalPack];
    const execute=(snapshot:Snapshot)=>{
      const history=repository!.history(snapshot.canonicalDomain);
      const previous=selectBaseline(history.slice(history.findIndex(s=>s.scanId===snapshot.scanId)+1),snapshot.crawlLimit,snapshot.scanProfile);
      const runs=runRules({current:snapshot,previous},packs);
      runs.forEach(r=>repository!.saveRuleRun(r));return runs;
    };
    let data: unknown; let text: string;
    if(command==='scan'&&!persist) {
      const result=await scan(input,{maxPages,pdfExtraction});data=result;text=terminalReport(result);
      if(!result.summary.pagesScanned)process.exitCode=1;
    } else {
      repository=new SqliteRepository(db);
      if(command==='scan') {
        const run=law?await scanLawWatch(input,repository,{maxPages,recheckBudget,pdfExtraction,lawwatchEvidenceBudget,lawwatchStaffBudget}):await scanAndPersist(input,repository,{maxPages,recheckBudget,pdfExtraction});
        data={...run.scan,snapshot:{scanId:run.snapshot.scanId,siteId:run.snapshot.siteId,status:run.snapshot.status,comparisonEligible:run.snapshot.comparisonEligible,comparisonWarnings:run.snapshot.comparisonWarnings,coverage:run.snapshot.coverage},...(compare?{comparison:run.comparison}:{})};
        text=terminalReport(run.scan)+`\n\nSaved scan: ${run.snapshot.scanId}\nDatabase: ${db}`;
        if(compare)text+='\n\n'+(run.comparison?changeReport(run.comparison):'No suitable previous scan. This scan has been saved; no changes inferred.');
        if(rules){const runs=execute(run.snapshot);data={...(data as object),ruleReport:{schemaVersion:1,runs}};text+='\n\n'+findingsReport(runs);}
        if('lawwatch' in run){data={...(data as object),lawwatch:run.lawwatch};text+='\n\n'+lawWatchReport(run.lawwatch as import('../lawwatch/types.js').LawReport);}
        if(!run.snapshot.coverage.pagesScanned)process.exitCode=1;
      } else if(command==='rules'||command==='findings') {
        const snapshot=command==='rules'?repository.get(input)??(!input.startsWith('scan_')?repository.history(domain(normalize(input)))[0]:undefined):repository.history(domain(normalize(input)))[0];
        if(!snapshot)throw new Error(`Scan not found: ${input}`);
        const seen=new Set<string>();
        const runs=command==='rules'?execute(snapshot):repository.ruleRuns(snapshot.scanId).filter(r=>{if(seen.has(r.packId))return false;seen.add(r.packId);return true;});
        data={schemaVersion:1,runs};text=findingsReport(runs);
      } else if(command==='export-scan') {
        data=repository.get(input);if(!data)throw new Error(`Scan not found: ${input}`);text=JSON.stringify(data,null,2);json=true;
      } else {
        const history=repository.history(domain(normalize(input)));
        if(command==='history') {
          data=history.map(s=>({scanId:s.scanId,completedAt:s.completedAt,status:s.status,pagesScanned:s.coverage.pagesScanned,crawlLimit:s.crawlLimit,comparisonEligible:s.comparisonEligible}));
          text=`SCAN HISTORY\n\nSite: ${domain(normalize(input))}\n\nID | Completed | Status | Pages | Eligible\n`+(history.length?history.map(s=>`${s.scanId} | ${s.completedAt} | ${s.status} | ${s.coverage.pagesScanned} | ${s.comparisonEligible?'yes':'no'}`).join('\n'):'No scans stored.');
        } else {
          const current=history[0]; const previous=current?selectBaseline(history.slice(1),current.crawlLimit,current.scanProfile):undefined;
          if(!current||!previous){data={comparison:null,message:'No suitable previous scan to compare.'};text='No suitable previous scan to compare.';}
          else {const comparison=compareSnapshots(previous,current);data=comparison;text=changeReport(comparison);}
        }
      }
    }
    const serialized=JSON.stringify(data,null,2);
    if(output)await writeFile(output,serialized+'\n','utf8');
    console.log(json?serialized:text);
  } catch(error) { console.error(`WatchLayer: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1; }
  finally { repository?.close(); }
}
