import type {Engine,EngineResult,Job,Repository,Site} from './types.js';
import {OperationalError} from './types.js';
import {audit,entitled,id} from './operations.js';
export const LEASE_MS=120000,MAX_RETRIES=2;
export async function claim(repository:Repository,now:number){return repository.transaction(d=>{
  for(const j of d.jobs)if(j.status==='RUNNING'&&(j.leaseUntil??0)<=now){j.status=j.retryCount<MAX_RETRIES?'QUEUED':'FAILED';j.retryCount++;j.failureCode='NETWORK_TRANSIENT';j.token=undefined;}
  for(const j of d.jobs)if(j.status==='QUEUED'&&j.type==='MONITORING'&&!j.manualAuthorisation&&!entitled(d,j.organisationId,now))j.status='CANCELLED';
  const job=d.jobs.filter(j=>j.status==='QUEUED'&&j.scheduledAt<=now&&(j.manualAuthorisation||d.sites.some(s=>s.id===j.siteId&&s.active&&!s.paused))&&!d.jobs.some(other=>other.organisationId===j.organisationId&&other.status==='RUNNING')).sort((a,b)=>(d.organisations.find(o=>o.id===a.organisationId)?.lastClaimAt??0)-(d.organisations.find(o=>o.id===b.organisationId)?.lastClaimAt??0)||a.scheduledAt-b.scheduledAt)[0];if(!job)return undefined;job.status='RUNNING';job.token=id();job.leaseUntil=now+LEASE_MS;job.startedAt??=now;d.organisations.find(o=>o.id===job.organisationId)!.lastClaimAt=now;audit(d,'job_started',now,{organisationId:job.organisationId,siteId:job.siteId,jobId:job.id});return {job,site:d.sites.find(s=>s.id===job.siteId)!};
});}
export function fenced(job:Job|undefined,token:string,now:number):asserts job is Job {if(!job||job.status!=='RUNNING'||job.token!==token||(job.leaseUntil??0)<=now)throw new Error('Lost worker lease');}
export class Worker {
  constructor(private repository:Repository,private engine:Engine,private now=Date.now){}
  async once(){const claimed=await claim(this.repository,this.now());if(!claimed)return false;const {job,site}=claimed,token=job.token!;let leaseLost=false;
    const heartbeat=setInterval(()=>{void this.repository.transaction(d=>{const current=d.jobs.find(j=>j.id===job.id);fenced(current,token,this.now());current.leaseUntil=this.now()+LEASE_MS;d.heartbeats.worker=this.now();}).catch(()=>{leaseLost=true;});},20000);
    try{
      const existing=(await this.repository.read()).runs.find(r=>r.jobId===job.id);const result:EngineResult=existing??await this.engine.run(job,site);if(leaseLost)throw new Error('Lost worker lease');
      // Durable checkpoint is separate from draft publication, so retries reuse the run.
      const run=await this.repository.transaction(d=>{fenced(d.jobs.find(j=>j.id===job.id),token,this.now());const old=d.runs.find(r=>r.jobId===job.id);if(old)return old;const run={...result,id:id(),jobId:job.id,createdAt:this.now()};d.runs.push(run);audit(d,'scan_completed',this.now(),{organisationId:job.organisationId,siteId:site.id,jobId:job.id,scanRunId:run.id});if(result.metrics.browserAttempts) audit(d,'browser_fallback_attempted',this.now(),{jobId:job.id,scanRunId:run.id});return run;});
      await this.repository.transaction(d=>{const current=d.jobs.find(j=>j.id===job.id);fenced(current,token,this.now());if(!d.reports.some(r=>r.jobId===job.id)){const findings=run.results.map((raw,index)=>({id:`finding-${index}`,raw,title:raw.title,explanation:raw.explanation}));if(!findings.length)throw new OperationalError('REPORT_GENERATION_FAILURE');d.reports.push({id:id(),jobId:job.id,scanRunId:run.id,organisationId:job.organisationId,siteId:site.id,version:1,status:'DRAFT',findings,createdAt:this.now()});}current.status='AWAITING_REVIEW';current.completedAt=this.now();current.runId=run.id;current.token=undefined;current.leaseUntil=undefined;current.failureCode=undefined;d.sites.find(s=>s.id===site.id)!.lastSuccessfulRunAt=this.now();audit(d,'report_awaiting_review',this.now(),{jobId:job.id,scanRunId:run.id});});
    }catch(error){await this.repository.transaction(d=>{const current=d.jobs.find(j=>j.id===job.id);if(!current||current.token!==token||current.status!=='RUNNING')return;const failure=error instanceof OperationalError?error:new OperationalError('ENGINE_FAILURE');current.failureCode=failure.code;current.status=failure.transient&&current.retryCount<MAX_RETRIES?'QUEUED':'FAILED';if(current.status==='QUEUED'){current.retryCount++;current.scheduledAt=this.now()+30000*2**current.retryCount;}current.token=undefined;current.leaseUntil=undefined;audit(d,'scan_failed',this.now(),{jobId:job.id,organisationId:job.organisationId,code:failure.code});});
    }finally{clearInterval(heartbeat);}return true;
  }
}
