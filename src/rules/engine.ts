import { randomUUID, createHash } from 'node:crypto';
import { applicability } from './applicability.js';
import { detect } from './detectors.js';
import { validatePack, universalPack } from './pack.js';
import { projectFindings } from './findings.js';
import type { Context, Result, RulePack, RuleRun } from './types.js';
import { APPLICATION_VERSION, SNAPSHOT_SCHEMA_VERSION } from '../snapshots/types.js';
export function evaluate(context:Context, input:RulePack):Result[] {
  const pack=validatePack(input);
  const {current,previous}=context;
  const supported=current.schemaVersion===SNAPSHOT_SCHEMA_VERSION&&current.applicationVersion===APPLICATION_VERSION;
  if(previous&&(previous.scanId===current.scanId||previous.canonicalDomain!==current.canonicalDomain||previous.schemaVersion!==current.schemaVersion||previous.applicationVersion!==current.applicationVersion||previous.crawlLimit!==current.crawlLimit||previous.completedAt>current.completedAt))context={current,factResults:context.factResults};
  return pack.rules.flatMap(rule=>{
    const applies=supported?applicability(rule,context):'uncertain';
    const detections=applies==='applicable'?detect(rule,context):[{url:context.current.canonicalStartUrl,state:applies==='uncertain'?'UNKNOWN' as const:'NOT_APPLICABLE' as const,confidence:applies==='uncertain'?'LOW' as const:'HIGH' as const,reason:!rule.enabled?'Rule disabled.':applies==='uncertain'?'Applicability requires a compatible previous observation.':'No previously tracked resources.',observed:null}];
    return detections.map(d=>({schemaVersion:1 as const,ruleId:rule.id,ruleVersion:rule.version,packId:pack.id,packVersion:pack.version,status:d.state,severity:rule.severity,confidence:d.state==='UNKNOWN'?'LOW' as const:d.confidence,confidenceReason:d.state==='UNKNOWN'?'Insufficient reliable evidence.':d.confidence==='HIGH'?'Direct recorded evidence supports this limited observation.':'A deterministic signal requires contextual review.',applicability:applies,title:rule.name,explanation:d.reason,resource:d.url,evidence:[{scanId:context.current.scanId,previousScanId:context.previous?.scanId,url:d.url,observed:d.observed,previous:d.previous,explanation:d.reason}]}));
  });
}
export function runRules(context:Context,packs:RulePack[]=[universalPack],now=()=>new Date()):RuleRun[] {
  if(new Set(packs.map(p=>p.id)).size!==packs.length)throw new Error('Duplicate pack IDs in one execution');
  const validated=packs.map(validatePack);
  return validated.map(pack=>{
    const startedAt=now().toISOString();const runId=`rules_${randomUUID()}`;const results=evaluate(context,pack);
    return {schemaVersion:1,runId,scanId:context.current.scanId,previousScanId:context.previous?.scanId??null,comparisonId:context.previous?`comparison_${createHash('sha256').update(JSON.stringify([context.previous.scanId,context.current.scanId])).digest('hex')}`:null,packId:pack.id,packVersion:pack.version,engineVersion:'1',startedAt,completedAt:now().toISOString(),status:'completed',definition:pack,results,findings:projectFindings(results,runId,context.current.completedAt)};
  });
}
