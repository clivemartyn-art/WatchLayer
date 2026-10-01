import type {Data,Finding,Report,Review,Run} from './types.js';
import type {State} from '../rules/types.js';

export const customerLabels:Record<State,string>={PASS:'Confirmed',WARNING:'Review recommended',POTENTIAL_ISSUE:'Action recommended',UNKNOWN:'Could not confirm',NOT_APPLICABLE:'Not applicable'};
export const customerStatusOrder:State[]=['POTENTIAL_ISSUE','WARNING','UNKNOWN','PASS','NOT_APPLICABLE'];

export interface CustomerFinding {finding:Finding;review:Review}
export interface CustomerReportView {
  report:Report;run:Run;kind:'Baseline'|'Monitoring'|'Manual recheck';isBaseline:boolean;
  findings:CustomerFinding[];counts:Record<State,number>;attentionCount:number;changeCount:number;
  comparisonReport?:Report;relationship:string;
}

function latestReview(data:Data,reportId:string,findingId:string){return data.reviews.filter(r=>r.reportId===reportId&&r.findingId===findingId).at(-1);}
export function customerFindings(data:Data,report:Report):CustomerFinding[]{return report.findings.flatMap(f=>{const review=latestReview(data,report.id,f.id);return !review||review.status==='SUPPRESSED'?[]:[{finding:f,review}];});}
export function customerCounts(findings:CustomerFinding[]):Record<State,number>{return Object.fromEntries(Object.keys(customerLabels).map(status=>[status,findings.filter(x=>x.finding.raw.status===status).length])) as Record<State,number>;}
function sameResult(a:Finding['raw'],b:Finding['raw']){return a.ruleId===b.ruleId&&a.status===b.status&&a.resource===b.resource;}
export function customerReportView(data:Data,report:Report):CustomerReportView {
  const run=data.runs.find(r=>r.id===report.scanRunId);if(!run)throw new Error('Missing report run');
  const job=data.jobs.find(j=>j.id===report.jobId),kind=job?.type==='BASELINE'?'Baseline':job?.type==='MONITORING'?'Monitoring':'Manual recheck',findings=customerFindings(data,report),counts=customerCounts(findings),isBaseline=kind==='Baseline';
  const comparisonReport=run.comparisonBaseline?data.reports.find(candidate=>candidate.id!==report.id&&candidate.organisationId===report.organisationId&&candidate.status==='RELEASED'&&data.runs.find(r=>r.id===candidate.scanRunId)?.scanId===run.comparisonBaseline):undefined;
  const changeCount=isBaseline?0:findings.filter(({finding})=>finding.raw.ruleId.startsWith('LAW-C')||run.changes.some(change=>sameResult(finding.raw,change))).length;
  const relationship=isBaseline?'Baseline established':comparisonReport?`Compared with report released ${new Date(comparisonReport.releasedAt!).toISOString().slice(0,10)}`:run.comparisonBaseline?'Compared with the preceding monitored observation':'No comparison baseline was available';
  return {report,run,kind,isBaseline,findings,counts,attentionCount:counts.WARNING+counts.POTENTIAL_ISSUE,changeCount,comparisonReport,relationship};
}
