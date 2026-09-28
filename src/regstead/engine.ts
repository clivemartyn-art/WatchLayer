import {mkdir,readFile,writeFile,copyFile,open,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {hostname} from 'node:os';
import {SqliteRepository} from '../storage/sqlite.js';
import {scanLawWatch,evaluateStoredLawWatch} from '../lawwatch/service.js';
import {LAW_PACK_ID,lawPack} from '../lawwatch/pack.js';
import {domain} from '../utils/urls.js';
import type {LawReport} from '../lawwatch/types.js';
import type {Engine,EngineResult,Job,Repository,Site} from './types.js';
import {OperationalError} from './types.js';
import {APPLICATION_VERSION} from '../snapshots/types.js';
import {BROWSER_POLICY_VERSION} from '../browser/types.js';
export class WatchLayerEngine implements Engine {
  constructor(private root:string,private commercial:Repository,private scanImplementation:typeof scanLawWatch=scanLawWatch,private deployedRelease?:string){}
  async run(job:Job,site:Site):Promise<EngineResult>{
    if(this.deployedRelease&&(job.release!==this.deployedRelease||job.engineVersion!==APPLICATION_VERSION||job.packVersion!==lawPack.version||job.browserPolicyVersion!==BROWSER_POLICY_VERSION))throw new OperationalError('INVALID_CONFIGURATION');
    if(!/^[a-f0-9-]{36}$/.test(job.id))throw new OperationalError('INVALID_CONFIGURATION');const dir=join(this.root,job.id);await mkdir(dir,{recursive:true});const lockPath=join(dir,'worker.lock');
    try{const old=JSON.parse(await readFile(lockPath,'utf8')) as {host:string;pid:number};if(old.host!==hostname())throw new OperationalError('NETWORK_TRANSIENT',true);let alive=true;try{process.kill(old.pid,0);}catch(e){alive=(e as NodeJS.ErrnoException).code!=='ESRCH';}if(alive)throw new OperationalError('NETWORK_TRANSIENT',true);await unlink(lockPath);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
    const lock=await open(lockPath,'wx',0o600);await lock.writeFile(JSON.stringify({host:hostname(),pid:process.pid}));const dbPath=join(dir,'watchlayer.db');let repository:SqliteRepository|undefined;
    try{
      const manifestPath=join(dir,'input.json');let manifest:{baseline:string|null};
      try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;const data=await this.commercial.read();const baseline=data.runs.filter(r=>data.jobs.find(j=>j.id===r.jobId)?.siteId===site.id&&r.jobId!==job.id).at(-1);if(baseline)await copyFile(baseline.reference,dbPath);manifest={baseline:baseline?.scanId??null};await writeFile(manifestPath,JSON.stringify(manifest),{flag:'wx',mode:0o600});}
      repository=new SqliteRepository(dbPath);let snapshot=repository.history(domain(site.canonicalUrl)).find(s=>s.scanId!==manifest.baseline&&(!manifest.baseline||s.startedAt>=(repository!.get(manifest.baseline)?.completedAt??'')));let law=snapshot?repository.packReport<LawReport>(snapshot.scanId,LAW_PACK_ID):undefined;
      if(snapshot&&!law&&repository.facts(snapshot.scanId,LAW_PACK_ID))law=evaluateStoredLawWatch(snapshot,repository);
      if(!snapshot||!law||snapshot.status==='failed'){const result=await this.scanImplementation(site.canonicalUrl,repository,{maxPages:100,browserFallback:site.browserFallback,pdfExtraction:true,delayMs:1000});snapshot=result.snapshot;law=result.lawwatch;}
      if(snapshot.status==='failed'){const transient=snapshot.requests?.some(r=>['ETIMEDOUT','ECONNRESET','EAI_AGAIN','ECONNREFUSED'].includes(r.errorCode??'')||(r.status??0)>=500||r.status===429)||snapshot.errors.some(e=>/^(?:DNS|Request) timeout$/.test(e.message));throw transient?new OperationalError('NETWORK_TRANSIENT',true):new OperationalError(snapshot.errors.some(e=>e.stage==='robots')?'ROBOTS_BLOCKED':'ENGINE_FAILURE');}
      return {scanId:snapshot.scanId,reference:dbPath,sourceProfile:snapshot.scanProfile??'static-v1',comparisonBaseline:law.runs[0]?.previousScanId??null,metrics:{pages:snapshot.coverage.pagesScanned,failedPages:snapshot.coverage.pagesFailed,browserAttempts:law.browser?.attempted??0,browserFailures:law.browser?.failed??0,unknown:law.summary.UNKNOWN},results:[...law.universalResults,...law.results],changes:law.changes,startedAt:snapshot.startedAt,completedAt:snapshot.completedAt,versions:{engineVersion:snapshot.applicationVersion,packVersion:law.packVersion,browserPolicyVersion:snapshot.browser?.policyVersion??job.browserPolicyVersion,release:job.release}};
    }finally{repository?.close();await lock.close();await unlink(lockPath);}
  }
}
