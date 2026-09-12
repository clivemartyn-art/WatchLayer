import { createHash } from 'node:crypto';
import type { Finding, Result } from './types.js';
export function priority(result: Pick<Result,'status'|'severity'|'confidence'>): number {
  const status={PASS:0,NOT_APPLICABLE:0,UNKNOWN:1,WARNING:2,POTENTIAL_ISSUE:3}[result.status];
  return status===0?0:status*100+{CRITICAL:5,HIGH:4,MEDIUM:3,LOW:2,INFO:1}[result.severity]*10+{HIGH:3,MEDIUM:2,LOW:1}[result.confidence];
}
export function projectFindings(results: Result[],runId:string,at:string):Finding[] {
  return results.map((r,i)=>({...r,findingId:`finding_${createHash('sha256').update(`${runId}:${i}`).digest('hex').slice(0,24)}`,firstDetected:at,currentState:r.status,description:r.explanation,recommendation:['WARNING','POTENTIAL_ISSUE'].includes(r.status)?'Review the recorded evidence and recheck the resource before acting.':r.status==='UNKNOWN'?'Obtain a reliable observation before drawing conclusions.':'',priority:priority(r)}));
}
