import { scanAndPersist,type PersistentScanOptions } from '../snapshots/service.js';
import type { SqliteRepository } from '../storage/sqlite.js';
import { selectBaseline } from '../comparison/eligibility.js';
import type { Snapshot } from '../snapshots/types.js';
import { extractLawFacts } from './extract.js';
import { evaluateLawWatch } from './evaluate.js';
import { LAW_PACK_ID } from './pack.js';
import { lawDiscovery } from './discovery.js';
import { associatePricingPages } from './association.js';
import type { FactSet,LawReport,PageFacts,Service } from './types.js';
export function evaluateStoredLawWatch(snapshot:Snapshot,repository:SqliteRepository,overrides?:Partial<Record<Service,boolean>>):LawReport {
  const history=repository.history(snapshot.canonicalDomain);const index=history.findIndex(s=>s.scanId===snapshot.scanId);
  const previous=selectBaseline(index<0?[]:history.slice(index+1),snapshot.crawlLimit,snapshot.scanProfile);
  const report=evaluateLawWatch({current:snapshot,facts:repository.facts<FactSet>(snapshot.scanId,LAW_PACK_ID),previous,previousFacts:previous?repository.facts<FactSet>(previous.scanId,LAW_PACK_ID):undefined,previousInventory:previous?repository.packReport<LawReport>(previous.scanId,LAW_PACK_ID)?.inventory:undefined,overrides});
  for(const run of report.runs)repository.saveRuleRun(run);
  repository.savePackReport(report.runs[1].runId,snapshot.scanId,LAW_PACK_ID,report);
  return report;
}
export interface LawScanOptions extends Omit<PersistentScanOptions,'crawlPolicy'> {lawwatchEvidenceBudget?:number;lawwatchStaffBudget?:number}
export async function scanLawWatch(input:string,repository:SqliteRepository,options:LawScanOptions={}) {
  const evidenceBudget=options.lawwatchEvidenceBudget??40,staffBudget=options.lawwatchStaffBudget??5;
  if(!Number.isInteger(evidenceBudget)||evidenceBudget<0||evidenceBudget>50)throw new Error('LawWatch evidence budget must be 0..50');
  if(!Number.isInteger(staffBudget)||staffBudget<0||staffBudget>10)throw new Error('LawWatch staff budget must be 0..10');
  if((options.maxPages??100)>100)throw new Error('LawWatch normal page budget cannot exceed 100');
  const discovery=lawDiscovery(evidenceBudget,staffBudget);
  const collected=new Map<string,PageFacts>();
  const run=await scanAndPersist(input,repository,{delayMs:1000,...options,crawlPolicy:discovery.policy,onResponse:r=>{options.onResponse?.(r);const facts=extractLawFacts(r);if(facts){collected.set(facts.url,facts);discovery.observe(facts);}}});
  const facts:FactSet={schemaVersion:1,detectorVersion:'1.1',scanId:run.snapshot.scanId,pages:[...collected.values()].filter(f=>run.snapshot.pages.some(p=>p.finalUrl===f.url&&p.observationStatus==='observed'&&p.evidence==='html'))};
  associatePricingPages(facts.pages,run.snapshot);
  repository.saveFacts(run.snapshot.scanId,LAW_PACK_ID,'1.1',facts);
  return {...run,lawwatch:evaluateStoredLawWatch(run.snapshot,repository)};
}
