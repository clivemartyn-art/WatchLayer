import { pdfReport } from '../documents/report.js';
import type { LawReport,LawResult } from './types.js';
import { CUSTOMER_STATUS_LABELS } from './status-labels.js';
export function lawWatchReport(report:LawReport,includeReasonCodes=false):string {
  const citations=(r:LawResult)=>{const found:string[]=[];const walk=(v:unknown):void=>{if(!v||typeof v!=='object')return;const x=v as Record<string,unknown>;if(x.sourceType==='PDF'&&typeof x.pageNumber==='number')found.push('PDF: '+x.title+', page '+x.pageNumber+' — '+x.url);for(const child of Object.values(x))walk(child);};walk(r.evidence);return [...new Set(found)].slice(0,6).map(s=>'\n  '+s).join('');};
  const support=(r:LawResult)=>{const items=report.adjudication?.items.filter(i=>i.ruleId===r.ruleId&&(!r.serviceType||i.serviceType===r.serviceType))??[];return items.length?'\n  PDF evidence assessment: '+[...new Set(items.map(i=>i.state))].join(', '):'';};
  const line=(r:LawResult)=>`${r.severity==='INFO'?'INFO':r.status+' — '+CUSTOMER_STATUS_LABELS[r.status]}  ${r.title}\n  ${r.explanation}${includeReasonCodes&&r.unknownReasonCodes?'\n  '+r.unknownReasonCodes.join(', '):''}${r.resource?'\n  '+r.resource:''}${citations(r)}${support(r)}`;
  const show=(rows:LawResult[])=>rows.map(line).join('\n')||'None';
  const services=report.classifications.map(s=>`${s.service}: ${s.state}${s.excluded?' (explicitly excluded)':''}`).join('\n');
  return [`LAW WATCH REPORT\n\nFirm/site: ${report.site}\nScan: ${report.scanId}\nRule Pack: LawWatch England & Wales v${report.packVersion}`,
    'REGULATORY SIGNALS\n'+show(report.results.filter(r=>r.ruleId.startsWith('LAW-U'))),'SERVICES DETECTED\n'+services,
    ...report.classifications.filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service.toUpperCase()+'\n'+show(report.results.filter(r=>r.serviceType===s.service))),
    'MONITORING\n'+show(report.changes),'DRIFT\n'+(report.drift.some(r=>r.status==='WARNING')?show(report.drift.filter(r=>r.status==='WARNING')):'No old explicit pricing date signal observed.'),
    'SUMMARY\n'+Object.entries(report.summary).map(([state,count])=>`${state}: ${count}`).join('\n')+'\nCounts include pricing checks for all ten service categories, including unresolved applicability.',...(report.pdf?[pdfReport(report.pdf)]:[]),...(report.adjudication?['EVIDENCE ADJUDICATION\nPolicy: '+report.adjudication.policyVersion+'\n'+Object.entries(report.adjudication.counts).map(([state,count])=>state+': '+count).join('\n')+'\n'+report.adjudication.statement]:[]),report.statement].join('\n\n');
}
