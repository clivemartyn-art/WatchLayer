import type { LawReport,LawResult } from './types.js';
export function lawWatchReport(report:LawReport):string {
  const line=(r:LawResult)=>`${r.severity==='INFO'?'INFO':r.status}  ${r.title}\n  ${r.explanation}${r.resource?'\n  '+r.resource:''}`;
  const show=(rows:LawResult[])=>rows.map(line).join('\n')||'None';
  const services=report.classifications.map(s=>`${s.service}: ${s.state}${s.excluded?' (explicitly excluded)':''}`).join('\n');
  return [`LAW WATCH REPORT\n\nFirm/site: ${report.site}\nScan: ${report.scanId}\nRule Pack: LawWatch England & Wales v${report.packVersion}`,
    'REGULATORY SIGNALS\n'+show(report.results.filter(r=>r.ruleId.startsWith('LAW-U'))),'SERVICES DETECTED\n'+services,
    ...report.classifications.filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service.toUpperCase()+'\n'+show(report.results.filter(r=>r.serviceType===s.service))),
    'MONITORING\n'+show(report.changes),'DRIFT\n'+(report.drift.some(r=>r.status==='WARNING')?show(report.drift.filter(r=>r.status==='WARNING')):'No old explicit pricing date signal observed.'),
    'SUMMARY\n'+Object.entries(report.summary).map(([state,count])=>`${state}: ${count}`).join('\n')+'\nCounts include pricing checks for all ten service categories, including unresolved applicability.',report.statement].join('\n\n');
}
