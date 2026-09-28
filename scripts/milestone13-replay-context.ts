import type {SqliteRepository} from '../src/storage/sqlite.js';
import type {Snapshot} from '../src/snapshots/types.js';
import type {LawContext,FactSet,LawReport} from '../src/lawwatch/types.js';
import {selectBaseline} from '../src/comparison/eligibility.js';
/** Same baseline selection as stored evaluation, without writing a run or changing original reports. */
export function replayContext(current:Snapshot,repository:SqliteRepository):LawContext{
  const history=repository.history(current.canonicalDomain),index=history.findIndex(s=>s.scanId===current.scanId);
  const previous=selectBaseline(index<0?[]:history.slice(index+1),current.crawlLimit,current.scanProfile);
  return {current,facts:repository.facts<FactSet>(current.scanId,'lawwatch-england-wales'),previous,
    previousFacts:previous?repository.facts<FactSet>(previous.scanId,'lawwatch-england-wales'):undefined,
    previousInventory:previous?repository.packReport<LawReport>(previous.scanId,'lawwatch-england-wales')?.inventory:undefined};
}
