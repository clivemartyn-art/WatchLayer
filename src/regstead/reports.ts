import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import {OperationalError} from './types.js';
import type {ArtifactStore,Data,Report,Repository,Review} from './types.js';
import {audit,digest,notify,required} from './operations.js';
export class FileArtifactStore implements ArtifactStore {
  constructor(private root:string){}
  private path(key:string){if(!/^[a-zA-Z0-9_-]+\.(html|json)$/.test(key))throw new Error('Invalid artifact key');return resolve(this.root,key);}
  async put(key:string,body:Buffer){const path=this.path(key);await mkdir(dirname(path),{recursive:true});try{const old=await readFile(path);if(!old.equals(body))throw new Error('Immutable artifact conflict');return key;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,body,{flag:'wx',mode:0o600,flush:true});try{// link publishes without replacing an existing immutable artifact.
      const {link}=await import('node:fs/promises');await link(temp,path);
    }catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;if(!(await readFile(path)).equals(body))throw new Error('Immutable artifact conflict');}finally{await unlink(temp);}return key;}
  async get(key:string){return readFile(this.path(key));}
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const labels={PASS:'Confirmed',WARNING:'Review recommended',POTENTIAL_ISSUE:'Action recommended',UNKNOWN:'Could not confirm',NOT_APPLICABLE:'Not applicable'} as const;
export const disclaimer='Regstead, operated by Foundry Vale Ltd, reports observable public website signals only. This report does not certify regulatory compliance. Could not confirm means uncertainty, not absence. Browser observation is selective and best-effort; robots, network policy, PDFs and interactive content can limit visibility.';
function latest(data:Data,report:Report):Review[]{return report.findings.map(f=>data.reviews.filter(r=>r.reportId===report.id&&r.findingId===f.id).at(-1)).filter((r):r is Review=>!!r);}
/** Selected, bounded provenance details; never dump an unrestricted observation body. */
export function evidenceDetails(value:unknown):string {
  const details=new Set<string>(),seen=new Set<unknown>();let visited=0;
  function walk(item:unknown,depth:number){if(!item||typeof item!=='object'||depth>10||visited++>1000||seen.has(item))return;seen.add(item);const record=item as Record<string,unknown>;
    if(record.sourceType==='PDF'&&Number.isInteger(record.pageNumber))details.add('PDF page '+record.pageNumber);
    if(record.sourceType==='RENDERED_DOM')details.add('Rendered website content');
    if(typeof record.snippet==='string'&&record.snippet.trim())details.add('“'+record.snippet.slice(0,1000)+'”');
    for(const child of Object.values(record))walk(child,depth+1);
  }walk(value,0);return [...details].slice(0,8).join(' · ');
}
export function renderReport(data:Data,report:Report):string {
  const reviews=latest(data,report);if(!report.findings.length||reviews.length!==report.findings.length)throw new Error('Every finding requires human review');
  const org=data.organisations.find(o=>o.id===report.organisationId)!,site=data.sites.find(s=>s.id===report.siteId)!,run=data.runs.find(r=>r.id===report.scanRunId)!;
  const entries=report.findings.flatMap(f=>{const review=reviews.find(r=>r.findingId===f.id)!;if(review.status==='SUPPRESSED')return [];const citations=f.raw.evidence.map(e=>{let safe=false;try{safe=['https:','http:'].includes(new URL(e.url).protocol);}catch{}return `<li>${safe?`<a href="${escape(e.url)}" rel="noreferrer">${escape(e.url)}</a>`:escape(e.url)} — ${escape(e.explanation)} ${escape(evidenceDetails(e.observed))}</li>`;}).join('');return [`<section><h2>${escape(labels[f.raw.status])}: ${escape(review.title??f.title)}${'serviceType' in f.raw&&typeof f.raw.serviceType==='string'?' — '+escape(f.raw.serviceType.replaceAll('_',' ')):''}</h2><p>${escape(review.explanation??f.explanation)}</p><ul>${citations}</ul></section>`];}).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Regstead report ${escape(report.id)}</title><style>body{font:17px/1.6 system-ui;max-width:900px;margin:40px auto;padding:20px;color:#172b35}section{border-top:1px solid #ccc;padding:12px 0}h1,h2{line-height:1.25}a{overflow-wrap:anywhere}</style></head><body><h1>Regstead website monitoring report</h1><p>${escape(org.displayName)} — ${escape(site.canonicalUrl)}</p><p>Report ${report.id}, version ${report.version}. Scan completed: ${escape(run.completedAt)}.</p>${entries}<footer><p>${disclaimer}</p><p>Changes are observed website changes; no legal conclusion is implied.</p></footer></body></html>`;
}
export async function releaseReport(repository:Repository,storage:ArtifactStore,reportId:string,actor:string,now=Date.now()){
  required(actor);const data=await repository.read(),report=data.reports.find(r=>r.id===reportId);if(!report)throw new Error('Unknown report');if(report.status==='RELEASED')return report;
  const html=renderReport(data,report),reviewHash=digest(JSON.stringify(latest(data,report))),hash=digest(html);const key=`${report.id}-${hash}.html`;try{await storage.put(key,Buffer.from(html));}catch{await repository.transaction(d=>{audit(d,'report_release_failed',now,{reportId,code:'STORAGE_FAILURE',actor});});throw new OperationalError('STORAGE_FAILURE',true);}
  return repository.transaction(d=>{const current=d.reports.find(r=>r.id===reportId)!;if(current.status==='RELEASED')return current;if(digest(JSON.stringify(latest(d,current)))!==reviewHash)throw new Error('Review changed; release again');const job=d.jobs.find(j=>j.id===current.jobId)!;if(job.status!=='APPROVED')throw new Error('Report is not approved');Object.assign(current,{status:'RELEASED',artifact:key,hash,reviewHash,releasedAt:now,customerVersion:1,customerSummary:Object.fromEntries(Object.keys(labels).map(status=>[status,current.findings.filter(f=>f.raw.status===status&&latest(d,current).some(r=>r.findingId===f.id&&r.status!=='SUPPRESSED')).length]))});job.status='RELEASED';audit(d,'report_released',now,{organisationId:current.organisationId,siteId:current.siteId,jobId:job.id,scanRunId:current.scanRunId,reportId,actor});notify(d,`report:${reportId}`,current.organisationId,job.type==='BASELINE'?'BASELINE_READY':'MONITORING_READY',now,reportId);if(current.findings.some(f=>f.raw.status==='POTENTIAL_ISSUE'&&latest(d,current).some(r=>r.findingId===f.id&&r.status!=='SUPPRESSED')))notify(d,`material:${reportId}`,current.organisationId,'MATERIAL_REVIEW',now,reportId);return current;});
}
