import {createHash} from 'node:crypto';
import type {AdjudicationState,AdjudicatedItem} from '../src/lawwatch/adjudication/types.js';
export const HUMAN_LABELS=['SUPPORTS_RULE','PARTIALLY_SUPPORTS','AMBIGUOUS','NOT_RELEVANT','INSUFFICIENT_CONTEXT'] as const;
export type HumanLabel=typeof HUMAN_LABELS[number];
export const HUMAN_TO_AUTO:Record<HumanLabel,AdjudicationState>={SUPPORTS_RULE:'SUPPORTED',PARTIALLY_SUPPORTS:'PARTIALLY_SUPPORTED',AMBIGUOUS:'AMBIGUOUS',NOT_RELEVANT:'NOT_RELEVANT',INSUFFICIENT_CONTEXT:'INSUFFICIENT_CONTEXT'};
export interface ReviewItem {id:string;firm:string;sourceType:'PDF'|'HTML';url:string;title:string;pageNumber?:number;referrers:string[];ruleId:string;service:string;snippet:string;context:string;automated:AdjudicationState|'NOT_ASSESSED';rationale:string;tags:string[];affectedResults:{ruleId:string;service?:string;status:string}[];duplicateIds:string[];headingContext:string;sourceHash?:string}
export interface ReviewDecision {itemId:string;label:HumanLabel;reviewer:string;reviewedAt:string;note?:string;pattern?:string}
export function reviewTags(item:ReviewItem):string[]{
  const text=item.title+' '+item.snippet+' '+item.context, tags=new Set(item.tags);
  if(item.ruleId.startsWith('PRICE'))tags.add('pricing');if(/^LAW-U00[4-9]$/.test(item.ruleId))tags.add('complaints');if(item.ruleId==='LAW-U001')tags.add('regulatory_identifier');
  if(/\bwe (?:offer|provide|act|advise)|\bservices?\b/i.test(text))tags.add('service_description');
  if(/staff|supervis|qualif|team|solicitor.{0,30}experience/i.test(text)||['PRICE-004','PRICE-005'].includes(item.ruleId))tags.add('people_staff');
  if(/terms|complaint|regulat|policy/i.test(item.title))tags.add('regulatory_document');
  if(/our firm|our clients|our service|our commitment|we aim/i.test(text))tags.add('corporate_wording');
  if(/different service|mixed|service scope/i.test(item.rationale))tags.add('service_context_risk');
  if(!item.context||/context|surrounding|locat/i.test(item.rationale))tags.add('context_limit');
  if(/appendi|contents|index of|table of/i.test(text))tags.add('contents_or_appendix');
  if(item.headingContext==='UNAVAILABLE')tags.add('heading_proximity_unavailable');
  return [...tags].sort();
}
const rank=(id:string)=>createHash('sha256').update('watchlayer-m9-sample-v1|'+id).digest('hex');
export function sampleReviewQueue(input:ReviewItem[],perState=12,perTag=3,htmlControls=12){
  if(!Number.isInteger(perState)||perState<1||!Number.isInteger(perTag)||perTag<1)throw new Error('Positive integer quotas required');
  // Collapse identical rule/service snippets within a firm; retain alias IDs for audit.
  const unique=new Map<string,ReviewItem>();
  for(const item of [...input].sort((a,b)=>a.id.localeCompare(b.id))){const key=JSON.stringify([item.firm,item.ruleId,item.service,item.sourceType,item.automated,item.title,item.snippet.replace(/\s+/g,' ').trim(),item.context.replace(/\s+/g,' ').trim()]);const old=unique.get(key);if(old)old.duplicateIds.push(item.id);else unique.set(key,{...structuredClone(item),tags:reviewTags(item)});}
  const candidates=[...unique.values()].sort((a,b)=>rank(a.id).localeCompare(rank(b.id))||a.id.localeCompare(b.id)),selected=new Map<string,ReviewItem>();
  const take=(pool:ReviewItem[],quota:number)=>{const counts=new Map<string,number>();for(const i of selected.values())counts.set(i.firm,(counts.get(i.firm)??0)+1);let have=pool.filter(i=>selected.has(i.id)).length;const remaining=pool.filter(i=>!selected.has(i.id));while(have<quota&&remaining.length){remaining.sort((a,b)=>(counts.get(a.firm)??0)-(counts.get(b.firm)??0)||rank(a.id).localeCompare(rank(b.id)));const i=remaining.shift()!;selected.set(i.id,i);counts.set(i.firm,(counts.get(i.firm)??0)+1);have++;}};
  const states:AdjudicationState[]=['SUPPORTED','PARTIALLY_SUPPORTED','AMBIGUOUS','NOT_RELEVANT','INSUFFICIENT_CONTEXT'];for(const state of states)take(candidates.filter(i=>i.automated===state),perState);
  const tags=['pricing','complaints','regulatory_identifier','service_description','people_staff','regulatory_document','mixed_service_pdf','corporate_wording','repeated_boilerplate','heading_proximity_unavailable','service_context_risk','contents_or_appendix','context_limit'];
  for(const tag of tags)take(candidates.filter(i=>i.tags.includes(tag)),perTag);take(candidates.filter(i=>i.sourceType==='HTML'),htmlControls);
  const items=[...selected.values()].sort((a,b)=>rank(a.id).localeCompare(rank(b.id)));
  return {schemaVersion:1,algorithm:'sha256-v1-firm-balanced-strata',seed:'watchlayer-m9-sample-v1',candidateCount:input.length,uniqueCount:candidates.length,sampleSize:items.length,quotas:{perState,perTag,htmlControls},coverage:Object.fromEntries(tags.map(tag=>[tag,{available:candidates.filter(i=>i.tags.includes(tag)).length,selected:items.filter(i=>i.tags.includes(tag)).length}])),items};
}
export function toReviewCsv(items:ReviewItem[],blind=true):string{
  const headers=['item_id','firm','source_type','source_url','document_title','page_number','referrers','target_rule','target_service','extracted_evidence','surrounding_context','heading_context',...(!blind?['affected_results','automated_assessment','automated_rationale']:[]),'human_label','reviewer','reviewed_at','reviewer_note','pattern'];
  // Quoted CSV plus spreadsheet-formula neutralization for all untrusted cells.
  const cell=(value:unknown)=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const rows=items.map(i=>[i.id,i.firm,i.sourceType,i.url,i.title,i.pageNumber??'',i.referrers.join(' | '),i.ruleId,i.service,i.snippet,i.context,i.headingContext,...(!blind?[JSON.stringify(i.affectedResults),i.automated,i.rationale]:[]),'','','','','']);
  return '\uFEFF'+[headers,...rows].map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function compareReviews(items:ReviewItem[],decisions:ReviewDecision[]){
  const map=new Map(items.map(i=>[i.id,i])),seen=new Set<string>();
  for(const d of decisions){if(!map.has(d.itemId)||seen.has(d.itemId))throw new Error('Unknown or duplicate review item');seen.add(d.itemId);if(!HUMAN_LABELS.includes(d.label)||!d.reviewer?.trim()||!Number.isFinite(Date.parse(d.reviewedAt)))throw new Error('Each human decision requires a valid label, reviewer and date');}
  const reviewed=decisions.map(d=>({item:map.get(d.itemId)!,decision:d}));const scored=reviewed.filter(r=>r.item.automated!=='NOT_ASSESSED');
  const ratio=(n:number,d:number)=>({count:n,denominator:d,rate:d?n/d:null});const exact=(r:typeof scored[number])=>r.item.automated===HUMAN_TO_AUTO[r.decision.label];
  const groups=(key:(r:typeof reviewed[number])=>string)=>Object.fromEntries([...new Set(reviewed.map(key))].sort().map(k=>{const group=reviewed.filter(r=>key(r)===k),s=group.filter(r=>r.item.automated!=='NOT_ASSESSED');return[k,{reviewed:group.length,scored:s.length,disagreements:s.filter(r=>!exact(r)).length}];}));
  const autoSupport=scored.filter(r=>r.item.automated==='SUPPORTED'),humanSupport=scored.filter(r=>r.decision.label==='SUPPORTS_RULE');
  const disagreements=scored.filter(r=>!exact(r));
  return {schemaVersion:1,sampleSize:items.length,humanReviewed:reviewed.length,unreviewed:items.length-reviewed.length,exactAgreement:ratio(scored.filter(exact).length,scored.length),supportedVsOtherAgreement:ratio(scored.filter(r=>(r.item.automated==='SUPPORTED')===(r.decision.label==='SUPPORTS_RULE')).length,scored.length),falseSupportRate:ratio(autoSupport.filter(r=>r.decision.label!=='SUPPORTS_RULE').length,autoSupport.length),falseRejectionRate:ratio(humanSupport.filter(r=>r.item.automated!=='SUPPORTED').length,humanSupport.length),ambiguousCaseAgreement:ratio(scored.filter(r=>r.decision.label==='AMBIGUOUS'&&r.item.automated==='AMBIGUOUS').length,scored.filter(r=>r.decision.label==='AMBIGUOUS').length),byAutomatedLabel:groups(r=>r.item.automated),byRule:groups(r=>r.item.ruleId),bySourceType:groups(r=>r.item.sourceType),byService:groups(r=>r.item.service),confusion:Object.fromEntries(['SUPPORTED','PARTIALLY_SUPPORTED','AMBIGUOUS','NOT_RELEVANT','INSUFFICIENT_CONTEXT'].map(a=>[a,Object.fromEntries(HUMAN_LABELS.map(h=>[h,scored.filter(r=>r.item.automated===a&&r.decision.label===h).length]))])),patterns:Object.fromEntries([...new Set(disagreements.map(r=>r.decision.pattern??'UNCLASSIFIED'))].sort().map(p=>[p,disagreements.filter(r=>(r.decision.pattern??'UNCLASSIFIED')===p).length])),disagreements:disagreements.map(r=>({itemId:r.item.id,firm:r.item.firm,rule:r.item.ruleId,service:r.item.service,automated:r.item.automated,human:r.decision.label,note:r.decision.note??'',pattern:r.decision.pattern??'UNCLASSIFIED'})),mapping:'Binary support means SUPPORTED/SUPPORTS_RULE only. Every other label means support not established, not that information is false. HTML NOT_ASSESSED controls are reviewed but excluded from agreement. False-support denominator is automated SUPPORTED; false-rejection denominator is human SUPPORTS_RULE. Stratified sample rates are not population/live precision.'};
}
export function pdfReviewItem(item:AdjudicatedItem&{firm:string}):ReviewItem{return {id:item.id,firm:item.firm,sourceType:'PDF',url:item.source.url,title:item.source.title,pageNumber:item.source.pageNumber,referrers:item.source.referrers.map(r=>r.url),ruleId:item.ruleId,service:item.serviceType??(item.ruleId.startsWith('PRICE')?'UNRESOLVED':'FIRM_WIDE'),snippet:item.extracted.snippet,context:item.context.text,automated:item.state,rationale:item.reason,tags:[...(item.context.documentServices.length>1?['mixed_service_pdf']:[]),...(item.context.repeatedOnPages>1?['repeated_boilerplate']:[])],affectedResults:[],duplicateIds:[],headingContext:'UNAVAILABLE',sourceHash:item.source.sha256};}
export function readReviewCsv(text:string):ReviewDecision[]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('Unclosed CSV quote');if(cell||row.length){row.push(cell);rows.push(row);}const headers=rows.shift()??[];
  for(const h of ['item_id','human_label','reviewer','reviewed_at'])if(!headers.includes(h))throw new Error('Missing CSV column: '+h);
  return rows.flatMap(r=>{if(r.length!==headers.length)throw new Error('CSV row length mismatch');const v=Object.fromEntries(headers.map((h,i)=>[h,r[i]]));return v.human_label.trim()?[{itemId:v.item_id,label:v.human_label.trim() as HumanLabel,reviewer:v.reviewer,reviewedAt:v.reviewed_at,note:v.reviewer_note||undefined,pattern:v.pattern||undefined}]:[];});
}
