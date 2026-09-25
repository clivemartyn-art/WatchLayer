import {createHash} from 'node:crypto';
import {SERVICE_IDS} from '../src/lawwatch/types.js';
import type {Structure} from './milestone10-structure.js';
export const SERVICE_LABELS=['SERVICE_SPECIFIC_CORRECT','SERVICE_SPECIFIC_WRONG','MULTI_SERVICE','FIRM_WIDE','NO_SERVICE_CONTEXT','INSUFFICIENT_CONTEXT'] as const;
export type ServiceLabel=typeof SERVICE_LABELS[number];
export type Attribution='SERVICE_SPECIFIC'|'MULTI_SERVICE'|'FIRM_WIDE'|'NO_SERVICE_CONTEXT'|'INSUFFICIENT_CONTEXT';
export interface ServiceReviewItem {
  id:string; evidenceKey:string; firm:string; sourceType:'PDF'|'HTML'; url:string; title:string;
  pageNumber?:number; referrers:string[]; ruleId:string; snippet:string; context:string;
  detectedServices:string[]; assignedServices:string[]; automatedAttribution:Attribution;
  automatedAdjudication:string; affectedResults:{service?:string;status:string}[];
  structure:Structure; tags:string[]; sourceHash?:string;
}
export interface ServiceDecision {itemId:string;label:ServiceLabel;expectedServices:string[];reviewer:string;reviewedAt:string;note:string}
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export const evidenceKey=(url:string,page:number|undefined,snippet:string)=>hash(JSON.stringify([url,page??null,snippet.replace(/\s+/g,' ').trim()]));
const rank=(id:string)=>hash('watchlayer-m10-service-v1|'+id);
export function sampleServiceReview(input:ServiceReviewItem[],excludedKeys:Set<string>,size=80){
  if(!Number.isInteger(size)||size<60||size>100)throw new Error('Sample size must be 60..100');
  const unique=new Map<string,ServiceReviewItem>();
  for(const item of [...input].sort((a,b)=>a.id.localeCompare(b.id)))if(!excludedKeys.has(item.evidenceKey)&&!unique.has(item.evidenceKey))unique.set(item.evidenceKey,item);
  const pool=[...unique.values()],selected=new Map<string,ServiceReviewItem>();
  const take=(subset:ServiceReviewItem[],quota:number)=>{
    while(subset.filter(i=>selected.has(i.id)).length<quota&&selected.size<size){
      const choices=subset.filter(i=>!selected.has(i.id));if(!choices.length)break;
      const count=(firm:string)=>[...selected.values()].filter(i=>i.firm===firm).length;
      choices.sort((a,b)=>count(a.firm)-count(b.firm)||rank(a.id).localeCompare(rank(b.id)));
      selected.set(choices[0].id,choices[0]);
    }
  };
  const strata=['SERVICE_SPECIFIC','MULTI_SERVICE','FIRM_WIDE','NO_SERVICE_CONTEXT','INSUFFICIENT_CONTEXT'];
  for(const state of strata)take(pool.filter(i=>i.automatedAttribution===state),10);
  const tags=['near_heading','distant_heading','mixed_pdf','complaints','regulatory_identifier','pricing','vat','charging_basis','contents','boilerplate','repeated_services','ambiguous_title','general_terms'];
  for(const tag of tags)take(pool.filter(i=>i.tags.includes(tag)),2);
  take(pool.filter(i=>i.sourceType==='HTML'),12);take(pool,size);
  return {schemaVersion:1,seed:'watchlayer-m10-service-v1',requestedSize:size,sampleSize:selected.size,candidates:input.length,eligibleUnique:pool.length,
    coverage:Object.fromEntries([...strata,...tags].map(s=>[s,{available:pool.filter(i=>i.automatedAttribution===s||i.tags.includes(s)).length,selected:[...selected.values()].filter(i=>i.automatedAttribution===s||i.tags.includes(s)).length}])),
    items:[...selected.values()].sort((a,b)=>rank(a.id).localeCompare(rank(b.id)))};
}
const sameSet=(a:string[],b:string[])=>JSON.stringify([...new Set(a)].sort())===JSON.stringify([...new Set(b)].sort());
export function validateServiceDecisions(items:ServiceReviewItem[],decisions:ServiceDecision[]){
  const byId=new Map(items.map(i=>[i.id,i])),seen=new Set<string>();
  for(const d of decisions){
    const item=byId.get(d.itemId);if(!item||seen.has(d.itemId))throw new Error('Unknown or duplicate review item');seen.add(d.itemId);
    if(!SERVICE_LABELS.includes(d.label)||!d.reviewer.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(d.reviewedAt)||new Date(d.reviewedAt).toISOString().slice(0,10)!==d.reviewedAt)throw new Error('Valid label, reviewer and ISO review date required');
    if(!Array.isArray(d.expectedServices)||d.expectedServices.some(s=>![...SERVICE_IDS,'OTHER'].includes(s)))throw new Error('Invalid expected service');
    const count=new Set(d.expectedServices).size;
    if(d.label.startsWith('SERVICE_SPECIFIC')&&count!==1||d.label==='MULTI_SERVICE'&&count<2||['FIRM_WIDE','NO_SERVICE_CONTEXT','INSUFFICIENT_CONTEXT'].includes(d.label)&&count!==0)throw new Error('Expected services do not match the review label');
    if(d.label==='SERVICE_SPECIFIC_CORRECT'&&(item.automatedAttribution!=='SERVICE_SPECIFIC'||!sameSet(item.assignedServices,d.expectedServices)))throw new Error('CORRECT requires the same proposed service; use WRONG for a correction');
    if(d.label==='SERVICE_SPECIFIC_WRONG'&&item.automatedAttribution==='SERVICE_SPECIFIC'&&sameSet(item.assignedServices,d.expectedServices))throw new Error('WRONG requires a different service proposal');
  }
}
export function compareServiceReviews(items:ServiceReviewItem[],decisions:ServiceDecision[],reassessments?:Record<string,import('../src/lawwatch/context/attribution.js').AttributionDecision>){
  validateServiceDecisions(items,decisions);const byId=new Map(items.map(i=>[i.id,i]));
  const rows=decisions.map(d=>{const original=byId.get(d.itemId)!;
    if(reassessments&&!reassessments[d.itemId])throw new Error('Missing reassessment for reviewed item');
    const updated=reassessments?.[d.itemId];const item=updated?{...original,automatedAttribution:updated.state,assignedServices:updated.services}:original;
    const expected:Attribution=d.label.startsWith('SERVICE_SPECIFIC')?'SERVICE_SPECIFIC':d.label as Attribution;
    return {item,decision:d,expected,agree:item.automatedAttribution===expected&&(!['SERVICE_SPECIFIC','MULTI_SERVICE'].includes(expected)||sameSet(item.assignedServices,d.expectedServices))};});
  const ratio=(n:number,d:number)=>({count:n,denominator:d,rate:d?n/d:null});
  const group=(key:(r:typeof rows[number])=>string)=>Object.fromEntries([...new Set(rows.map(key))].sort().map(k=>{const r=rows.filter(x=>key(x)===k);return[k,{reviewed:r.length,disagreements:r.filter(x=>!x.agree).length}];}));
  const assigned=rows.filter(r=>['SERVICE_SPECIFIC','MULTI_SERVICE'].includes(r.item.automatedAttribution));
  const expectedAssignment=rows.filter(r=>['SERVICE_SPECIFIC','MULTI_SERVICE'].includes(r.expected));
  return {schemaVersion:1,humanReviewed:rows.length,unreviewed:items.length-rows.length,exactAgreement:ratio(rows.filter(r=>r.agree).length,rows.length),
    byExpectedAttribution:Object.fromEntries(['SERVICE_SPECIFIC','MULTI_SERVICE','FIRM_WIDE','NO_SERVICE_CONTEXT','INSUFFICIENT_CONTEXT'].map(s=>{const r=rows.filter(r=>r.expected===s);return[s,ratio(r.filter(r=>r.agree).length,r.length)];})),
    falseServiceAssignment:ratio(assigned.filter(r=>!['SERVICE_SPECIFIC','MULTI_SERVICE'].includes(r.expected)||r.item.assignedServices.some(s=>!r.decision.expectedServices.includes(s))).length,assigned.length),
    overConservativeNoContext:ratio(expectedAssignment.filter(r=>['NO_SERVICE_CONTEXT','INSUFFICIENT_CONTEXT'].includes(r.item.automatedAttribution)).length,expectedAssignment.length),
    byRule:group(r=>r.item.ruleId),byService:group(r=>r.decision.expectedServices.join('|')||r.expected),bySource:group(r=>r.item.sourceType),byProximity:group(r=>r.item.structure.proximity),
    disagreements:rows.filter(r=>!r.agree).map(r=>({automated:r.item.automatedAttribution,assignedServices:r.item.assignedServices,...r.decision})),
    limitation:'Stratified review sample, not population or live precision. Exact agreement includes the expected service set. False assignment counts any assigned service outside the human set; abstention rate is restricted to human service-specific/multi-service cases.'};
}
export function serviceCsv(items:ServiceReviewItem[],blind=true):string {
  const columns=['item_id','firm','source_type','url','title','page_number','referrers','rule','evidence','context','nearest_heading','nearest_service_heading','following_heading','distance_characters','distance_blocks','heading_method','candidate_service_lines','proposed_services',...(!blind?['detected_services','automated_attribution','automated_adjudication','affected_results']:[]),'human_label','expected_service','reviewer','reviewed_at','reviewer_note'];
  const cell=(v:unknown)=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return '\uFEFF'+[columns,...items.map(i=>[i.id,i.firm,i.sourceType,i.url,i.title,i.pageNumber??'',i.referrers.join(' | '),i.ruleId,i.snippet,i.context,i.structure.nearestHeading,i.structure.nearestServiceHeading,i.structure.followingHeading,i.structure.distanceCharacters,i.structure.distanceBlocks,i.structure.headingMethod,i.structure.candidateServiceLines.join(' | '),i.assignedServices.join('|'),...(!blind?[i.detectedServices.join('|'),i.automatedAttribution,i.automatedAdjudication,JSON.stringify(i.affectedResults)]:[]),'','','','',''])].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
}
export function parseServiceCsv(text:string):ServiceDecision[]{
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if(/[\r\n]/.test(c)&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('Unclosed CSV quote');if(cell||row.length){row.push(cell);rows.push(row);}
  const headers=rows.shift()??[];for(const name of ['item_id','human_label','expected_service','reviewer','reviewed_at','reviewer_note'])if(!headers.includes(name))throw new Error('Missing review column '+name);
  return rows.flatMap(r=>{if(r.length!==headers.length)throw new Error('CSV row length mismatch');const v=Object.fromEntries(headers.map((h,i)=>[h,r[i]]));return v.human_label.trim()?[{itemId:v.item_id,label:v.human_label.trim() as ServiceLabel,expectedServices:v.expected_service.split('|').map(s=>s.trim()).filter(Boolean),reviewer:v.reviewer,reviewedAt:v.reviewed_at,note:v.reviewer_note}]:[];});
}
