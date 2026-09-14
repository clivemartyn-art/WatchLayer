import type { AdjudicatedItem,AdjudicationState } from '../src/lawwatch/adjudication/types.js';
import { ADJUDICATION_STATES } from '../src/lawwatch/adjudication/types.js';
export interface HumanDecision {itemId:string;state:AdjudicationState;reviewer:string;reviewedAt:string;reason:string;reviewerKind:'human'}
/** Separate decisions never mutate machine reports or benchmark labels. */
export function validateHumanDecisions(items:AdjudicatedItem[],decisions:HumanDecision[]){
  const known=new Map(items.map(i=>[i.id,i]));const seen=new Set<string>();
  for(const d of decisions){if(!known.has(d.itemId)||seen.has(d.itemId))throw new Error('Unknown or duplicate evidence item');seen.add(d.itemId);
    if(d.reviewerKind!=='human'||!d.reviewer?.trim()||!d.reason?.trim()||!Number.isFinite(Date.parse(d.reviewedAt))||!ADJUDICATION_STATES.includes(d.state))throw new Error('Human decisions require reviewer, date, state and reason');}
  return {reviewed:decisions.length,unreviewed:known.size-decisions.length,agreements:decisions.filter(d=>known.get(d.itemId)!.state===d.state).length,decisions};
}
