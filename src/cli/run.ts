import { writeFile } from 'node:fs/promises';
import { scan } from '../crawler/scan.js';
import { scanAndPersist } from '../snapshots/service.js';
import { SqliteRepository, DEFAULT_DATABASE } from '../storage/sqlite.js';
import { domain, normalize } from '../utils/urls.js';
import { selectBaseline } from '../comparison/eligibility.js';
import { compareSnapshots } from '../comparison/diff.js';
import { terminalReport } from '../reporting/terminal.js';
import { changeReport } from '../reporting/changes.js';

type Command = 'scan'|'compare'|'history'|'export-scan';
export async function runCli(command: Command, arguments_: string[]): Promise<void> {
  let repository: SqliteRepository | undefined;
  try {
    const args=[...arguments_];
    if (!args.length||args.includes('--help')) {
      console.log(`Usage: npm run ${command} -- <${command==='export-scan'?'scan-id':'URL'}> [--db path] [--json] [--output file]${command==='scan'?' [--compare] [--no-persist] [--max-pages 100] [--recheck-budget 20]':''}`); return;
    }
    const input=args.shift()!;
    let db=DEFAULT_DATABASE; let json=false; let output: string|undefined; let compare=false; let persist=true; let maxPages=100; let recheckBudget=20;
    while(args.length) {
      const flag=args.shift()!;
      const value=()=>{const next=args.shift();if(!next||next.startsWith('--'))throw new Error(`${flag} requires a value`);return next;};
      if(flag==='--json')json=true;
      else if(flag==='--db')db=value();
      else if(flag==='--output')output=value();
      else if(command==='scan'&&flag==='--compare')compare=true;
      else if(command==='scan'&&flag==='--no-persist')persist=false;
      else if(command==='scan'&&flag==='--max-pages')maxPages=Number(value());
      else if(command==='scan'&&flag==='--recheck-budget')recheckBudget=Number(value());
      else throw new Error(`Unknown option: ${flag}`);
    }
    if(compare&&!persist)throw new Error('--compare requires persistence');
    if(command!=='export-scan')normalize(input);
    let data: unknown; let text: string;
    if(command==='scan'&&!persist) {
      const result=await scan(input,{maxPages});data=result;text=terminalReport(result);
      if(!result.summary.pagesScanned)process.exitCode=1;
    } else {
      repository=new SqliteRepository(db);
      if(command==='scan') {
        const run=await scanAndPersist(input,repository,{maxPages,recheckBudget});
        data={...run.scan,snapshot:{scanId:run.snapshot.scanId,siteId:run.snapshot.siteId,status:run.snapshot.status,comparisonEligible:run.snapshot.comparisonEligible,comparisonWarnings:run.snapshot.comparisonWarnings,coverage:run.snapshot.coverage},...(compare?{comparison:run.comparison}:{})};
        text=terminalReport(run.scan)+`\n\nSaved scan: ${run.snapshot.scanId}\nDatabase: ${db}`;
        if(compare)text+='\n\n'+(run.comparison?changeReport(run.comparison):'No suitable previous scan. This scan has been saved; no changes inferred.');
        if(!run.snapshot.coverage.pagesScanned)process.exitCode=1;
      } else if(command==='export-scan') {
        data=repository.get(input);if(!data)throw new Error(`Scan not found: ${input}`);text=JSON.stringify(data,null,2);json=true;
      } else {
        const history=repository.history(domain(normalize(input)));
        if(command==='history') {
          data=history.map(s=>({scanId:s.scanId,completedAt:s.completedAt,status:s.status,pagesScanned:s.coverage.pagesScanned,crawlLimit:s.crawlLimit,comparisonEligible:s.comparisonEligible}));
          text=`SCAN HISTORY\n\nSite: ${domain(normalize(input))}\n\nID | Completed | Status | Pages | Eligible\n`+(history.length?history.map(s=>`${s.scanId} | ${s.completedAt} | ${s.status} | ${s.coverage.pagesScanned} | ${s.comparisonEligible?'yes':'no'}`).join('\n'):'No scans stored.');
        } else {
          const current=history[0]; const previous=current?selectBaseline(history.slice(1),current.crawlLimit):undefined;
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
