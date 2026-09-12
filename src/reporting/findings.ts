import { SEVERITIES, STATES, type RuleRun } from '../rules/types.js';
export function findingsReport(runs:RuleRun[]):string {
  if(!runs.length)return 'WATCHLAYER FINDINGS\n\nNo stored rule runs for this scan.';
  const findings=runs.flatMap(r=>r.findings).sort((a,b)=>b.priority-a.priority||a.ruleId.localeCompare(b.ruleId)||a.resource.localeCompare(b.resource));
  const line=(f:typeof findings[number])=>`${f.status}  ${f.title} (${f.confidence} confidence)\n  ${f.resource}\n  ${f.description}`;
  return ['WATCHLAYER FINDINGS',`Scan: ${runs[0].scanId}`,`Rule Packs: ${runs.map(r=>`${r.definition.name} v${r.packVersion}`).join(', ')}`,...SEVERITIES.map(s=>`${s}\n${findings.filter(f=>f.severity===s&&f.status!=='UNKNOWN').map(line).join('\n')||'None'}`),`UNKNOWN\n${findings.filter(f=>f.status==='UNKNOWN').map(line).join('\n')||'None'}`,`Summary (resource results)\n${STATES.map(s=>`${s}: ${findings.filter(f=>f.status===s).length}`).join('\n')}`].join('\n\n');
}
