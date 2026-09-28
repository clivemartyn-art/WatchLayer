import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {visibleText} from '../src/extractors/text.js';
export const reviewableRecovery=(row:{status?:string;expectedTextRecovered?:boolean})=>row.status==='RENDERED'&&row.expectedTextRecovered===true;
export function renderedReviewContext(html:string,evidence:string):string {
  const text=visibleText(html),offset=text.indexOf(evidence);
  if(offset>=0)return text.slice(Math.max(0,offset-350),offset+evidence.length+350).slice(0,1400);
  const $=load(html),anchor=$('a[href]').toArray().find(a=>$(a).attr('href')===evidence);
  if(anchor)return ('Visible link label: '+$(anchor).text().trim()+'; surrounding text: '+$(anchor).parent().text().replace(/\s+/g,' ').trim()).slice(0,1400);
  return 'Context not located in retained visible text.';
}
export const REVIEW_LABELS=['VALID_RENDERED_EVIDENCE','PARTIAL_OR_AMBIGUOUS','NOT_RELEVANT','WRONG_SERVICE','INSUFFICIENT_CONTEXT'] as const;
export interface RenderReviewItem {
  id:string; organisation:string; url:string; sourceType:'RENDERED_DOM'; sourceHash:string;
  evidenceText:string; context:string; targetRule:string|null; targetServices:string[];
  staticEvidenceState:string; renderedEvidenceState:string; automatedAdjudication:unknown;
  serviceAttribution:unknown; ruleResultChanged:boolean; jurisdiction:string;
}
export interface RenderDecision {
  itemId:string; label:typeof REVIEW_LABELS[number]; usefulPublicEvidence:'YES'|'NO'|'UNCERTAIN';
  serviceContext:'CORRECT'|'WRONG'|'UNCERTAIN'|'NOT_APPLICABLE';
  ruleSupport:'JUSTIFIED'|'UNJUSTIFIED'|'UNCERTAIN'|'NOT_APPLICABLE';
  reviewer:string; reviewedAt:string; notes:string;
}
export const reviewHash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function compareRenderReviews(items:RenderReviewItem[],decisions:RenderDecision[]){
  const ids=new Set(items.map(i=>i.id)),seen=new Set<string>();
  if(ids.size!==items.length)throw Error('Duplicate source items');
  for(const d of decisions){
    if(!ids.has(d.itemId)||seen.has(d.itemId))throw Error('Unknown or duplicate decision');seen.add(d.itemId);
    const date=new Date(d.reviewedAt);
    if(!REVIEW_LABELS.includes(d.label)||!d.reviewer?.trim()||!d.notes?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.reviewedAt)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==d.reviewedAt)throw Error('Completed label, reviewer, real ISO date and notes required');
    if(!['YES','NO','UNCERTAIN'].includes(d.usefulPublicEvidence)||!['CORRECT','WRONG','UNCERTAIN','NOT_APPLICABLE'].includes(d.serviceContext)||!['JUSTIFIED','UNJUSTIFIED','UNCERTAIN','NOT_APPLICABLE'].includes(d.ruleSupport))throw Error('Invalid review dimension');
    if(d.label==='VALID_RENDERED_EVIDENCE'&&(d.usefulPublicEvidence!=='YES'||!['CORRECT','NOT_APPLICABLE'].includes(d.serviceContext)||!['JUSTIFIED','NOT_APPLICABLE'].includes(d.ruleSupport)))throw Error('Valid evidence requires consistent supporting dimensions');
    if(d.label==='WRONG_SERVICE'&&d.serviceContext!=='WRONG')throw Error('Wrong-service label requires wrong service context');
  }
  const ratio=(n:number,d:number)=>({count:n,denominator:d,rate:d?n/d:null});
  const supported=decisions.filter(d=>d.ruleSupport!=='NOT_APPLICABLE');
  return {schemaVersion:1,items:items.length,reviewed:decisions.length,pending:items.length-decisions.length,
    reviewComplete:items.length>0&&items.length===decisions.length,
    independentlyValidEvidence:ratio(decisions.filter(d=>d.label==='VALID_RENDERED_EVIDENCE').length,decisions.length),
    justifiedRuleSupport:ratio(supported.filter(d=>d.ruleSupport==='JUSTIFIED').length,supported.length),
    wrongServiceCount:decisions.filter(d=>d.serviceContext==='WRONG').length,
    labels:Object.fromEntries(REVIEW_LABELS.map(label=>[label,decisions.filter(d=>d.label===label).length])),
    limitation:'Selected sample review only. No population-level or live serious-finding precision estimate. Empty queues are not completed reviews.'};
}
