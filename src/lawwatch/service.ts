import { scanAndPersist,type PersistentScanOptions } from '../snapshots/service.js';
import type { SqliteRepository } from '../storage/sqlite.js';
import { selectBaseline } from '../comparison/eligibility.js';
import type { Snapshot } from '../snapshots/types.js';
import { extractLawFacts } from './extract.js';
import { evaluateLawWatch } from './evaluate.js';
import { LAW_PACK_ID } from './pack.js';
import type { FactSet,LawReport,PageFacts,Service } from './types.js';
export function evaluateStoredLawWatch(snapshot:Snapshot,repository:SqliteRepository,overrides?:Partial<Record<Service,boolean>>):LawReport {
  const history=repository.history(snapshot.canonicalDomain);const index=history.findIndex(s=>s.scanId===snapshot.scanId);
  const previous=selectBaseline(index<0?[]:history.slice(index+1),snapshot.crawlLimit);
  const report=evaluateLawWatch({current:snapshot,facts:repository.facts<FactSet>(snapshot.scanId,LAW_PACK_ID),previous,previousFacts:previous?repository.facts<FactSet>(previous.scanId,LAW_PACK_ID):undefined,previousInventory:previous?repository.packReport<LawReport>(previous.scanId,LAW_PACK_ID)?.inventory:undefined,overrides});
  for(const run of report.runs)repository.saveRuleRun(run);
  repository.savePackReport(report.runs[1].runId,snapshot.scanId,LAW_PACK_ID,report);
  return report;
}
export async function scanLawWatch(input:string,repository:SqliteRepository,options:PersistentScanOptions={}) {
  const collected=new Map<string,PageFacts>();
  const run=await scanAndPersist(input,repository,{...options,onResponse:r=>{options.onResponse?.(r);const facts=extractLawFacts(r);if(facts)collected.set(facts.url,facts);}});
  const facts:FactSet={schemaVersion:1,detectorVersion:'1.0',scanId:run.snapshot.scanId,pages:[...collected.values()].filter(f=>run.snapshot.pages.some(p=>p.finalUrl===f.url&&p.observationStatus==='observed'&&p.evidence==='html'))};
  repository.saveFacts(run.snapshot.scanId,LAW_PACK_ID,'1.0',facts);
  return {...run,lawwatch:evaluateStoredLawWatch(run.snapshot,repository)};
}
