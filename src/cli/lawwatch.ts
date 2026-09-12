import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { SqliteRepository,DEFAULT_DATABASE } from '../storage/sqlite.js';
import { evaluateStoredLawWatch } from '../lawwatch/service.js';
import { lawWatchReport } from '../lawwatch/report.js';
import { normalize,domain } from '../utils/urls.js';
export async function runLawCli(args:string[]):Promise<void> {
  let repository:SqliteRepository|undefined;
  try{
    if(!args.length||args.includes('--help')){console.log('Usage: npm run lawwatch -- <scan-id or URL> [--db path] [--json] [--output file]');return;}
    const input=args[0];let db=DEFAULT_DATABASE,json=false,output:string|undefined;
    for(let i=1;i<args.length;i++){const flag=args[i];if(flag==='--json')json=true;else if(flag==='--db'||flag==='--output'){const value=args[++i];if(!value||value.startsWith('--'))throw new Error(`${flag} requires a value`);if(flag==='--db')db=value;else output=value;}else throw new Error(`Unknown option: ${flag}`);}
    repository=new SqliteRepository(db);const snapshot=repository.get(input)??(!input.startsWith('scan_')?repository.history(domain(normalize(input)))[0]:undefined);
    if(!snapshot)throw new Error(`Scan not found: ${input}`);
    const report=evaluateStoredLawWatch(snapshot,repository);const serialized=JSON.stringify(report,null,2);
    if(output)await writeFile(output,serialized+'\n');console.log(json?serialized:lawWatchReport(report));
  }catch(error){console.error(`WatchLayer: ${error instanceof Error?error.message:String(error)}`);process.exitCode=1;}finally{repository?.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await runLawCli(process.argv.slice(2));
