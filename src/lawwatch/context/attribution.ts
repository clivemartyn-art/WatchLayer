import {createHash} from 'node:crypto';
import {serviceMatches} from '../detectors/services.js';
import type {Service,PageFacts,Fact} from '../types.js';
export type AttributionState='SERVICE_SPECIFIC'|'MULTI_SERVICE'|'FIRM_WIDE'|'NO_SERVICE_CONTEXT'|'INSUFFICIENT_CONTEXT';
export interface AttributionDecision {state:AttributionState;services:Service[];reason:string}
export interface AttributionInput {
  ruleId:string;title:string;snippet:string;context?:string;sourceType?:'HTML'|'PDF';url?:string;
  nearestHeading?:string|null;nearestServiceHeading?:string|null;distanceCharacters?:number|null;
  distanceBlocks?:number|null;boilerplateOnly?:boolean;contentsLike?:boolean;
}
export const attributionKey=(rule:string,snippet:string)=>createHash('sha256').update(rule+'\0'+snippet).digest('hex');
const normalize=(s:string)=>s.replace(/[-_]/g,' ').replace(/\s+/g,' ').trim();
/** Contextual service identity only: never upgrades service applicability or rule confidence. */
export function serviceAnchors(value:string):Service[]{
  const text=normalize(value);
  const services=serviceMatches(text,true).filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service);
  // Property purchase context identifies the service, not whether an amount is a legal fee.
  if(/\b(?:sale (?:or|\/) purchase|buy (?:their|your|a) home|conveyancers?)\b/i.test(text)&&!services.includes('residential_conveyancing'))services.push('residential_conveyancing');
  const employer=/\bemployers?\b|\bbusinesses\b/i.test(text),employee=/\bemployees?\b|\bindividuals?\b/i.test(text);
  return services.filter(s=>{
    if(s==='employment_employee')return employee&&!employer;
    if(s==='employment_employer')return employer&&!employee;
    if(s==='remortgage')return /\bre\s?mortgag/i.test(text)||/\bresidential mortgage\b/i.test(text);
    if(s==='residential_conveyancing')return !/\bcommercial (?:property|conveyancing)\b/i.test(text);
    return true;
  });
}
const firmContext=/\bcomplaints? (?:policy|procedure|handling)|\bterms (?:and conditions )?of (?:business|engagement)|\bTCs\b|\bequality.{0,20}diversity policy|\banti slavery\b|\b(?:data protection|privacy) (?:policy|notice)|\bpersonal data.{0,50}(?:supplier|processing)|\bsupplier.{0,50}personal data/i;
export function attributeEvidence(input:AttributionInput):AttributionDecision {
  const answer=(state:AttributionState,services:Service[],reason:string)=>({state,services,reason});
  const title=normalize(input.title),snippet=normalize(input.snippet),context=normalize(input.context??''),heading=normalize(input.nearestHeading??'');
  // Regulatory checks remain organisation-scoped; ownership/support is evaluated separately.
  if(input.ruleId.startsWith('LAW-U'))return answer('FIRM_WIDE',[],'REGULATORY_RULE_SCOPE');
  if(input.boilerplateOnly)return answer('NO_SERVICE_CONTEXT',[],'BOILERPLATE_ONLY');
  if(firmContext.test(heading)||firmContext.test(title)||/\b(?:our|full|formal) complaints? (?:procedure|policy)|\b(?:make|making) a (?:formal )?complaint/i.test(context))return answer('FIRM_WIDE',[],'FIRM_WIDE_CONTEXT');
  if(input.contentsLike)return answer('NO_SERVICE_CONTEXT',[],'CONTENTS_ONLY');
  const local=serviceAnchors(snippet+' '+context),namedTitle=serviceAnchors(title),namedHeading=serviceAnchors(heading);
  const assign=(services:Service[],reason:string)=>answer('SERVICE_SPECIFIC',services,reason);
  const explicitMulti=/\b(?:apply|applies|applicable) to (?:both|all|each)\b/i.test(snippet+' '+context);
  if(explicitMulti&&local.length>1)return answer('MULTI_SERVICE',local,'EXPLICIT_MULTI_SERVICE');
  const statement=serviceAnchors(snippet);
  // A neighbouring sentence may describe a different service and a different price.
  // Retain an explicit matched statement only when the page independently corroborates it.
  if(statement.length===1&&namedTitle.length===1&&statement[0]===namedTitle[0]&&!namedHeading.some(s=>s!==statement[0]))return assign(statement,'CORROBORATED_STATEMENT');
  // Use the current heading only, never a previous service heading across another section.
  const near=input.sourceType==='HTML'&&heading&&input.distanceCharacters!=null&&input.distanceCharacters<=1200&&input.distanceBlocks!=null&&input.distanceBlocks<=3;
  if(near&&namedHeading.length===1){
    if(local.some(s=>s!==namedHeading[0]))return answer('NO_SERVICE_CONTEXT',[],'CONFLICTING_ANCHORS');
    return assign(namedHeading,'DIRECT_SECTION_HEADING');
  }
  if(namedTitle.length===1){
    if(local.some(s=>s!==namedTitle[0])||namedHeading.some(s=>s!==namedTitle[0]))return answer('NO_SERVICE_CONTEXT',[],'CONFLICTING_ANCHORS');
    return assign(namedTitle,input.sourceType==='PDF'?'DOCUMENT_TITLE_MATCH':'PAGE_TITLE_MATCH');
  }
  if(local.length===1)return assign(local,'EXPLICIT_LOCAL_SERVICE');
  if(local.length>1||namedHeading.length>1||namedTitle.length>1)return answer('NO_SERVICE_CONTEXT',[],'CONFLICTING_ANCHORS');
  // An explicitly audience-named employment route can disambiguate a generic title.
  // Use the path only; host names and query strings are not service evidence.
  let path='';try{if(input.url)path=new URL(input.url).pathname;}catch{}
  const route=serviceAnchors(path);
  if(/\bemployment|\btribunal|\bdismissal/i.test(title)&&route.length===1&&['employment_employee','employment_employer'].includes(route[0]))return assign(route,'EXPLICIT_EMPLOYMENT_ROUTE');
  if(/\bemployment|\btribunal|\bdismissal/i.test(title+' '+heading+' '+context))return answer('NO_SERVICE_CONTEXT',[],'EMPLOYMENT_AUDIENCE_UNRESOLVED');
  if(input.nearestServiceHeading&&input.distanceCharacters!=null)return answer('NO_SERVICE_CONTEXT',[],'DISTANT_HEADING');
  return answer(context?'NO_SERVICE_CONTEXT':'INSUFFICIENT_CONTEXT',[],'NO_ANCHOR');
}
/** Additional exclusions only. Existing applicability, PDF support and confidence gates still apply. */
export function attributionAllowsService(a:AttributionDecision,service:Service):boolean {
  if(a.state==='FIRM_WIDE')return false;
  if(a.services.length)return a.services.includes(service);
  return a.reason==='NO_ANCHOR';
}
export function factAttribution(page:PageFacts,ruleId:string,fact:Fact):AttributionDecision {
  return page.serviceAttributions?.[attributionKey(ruleId,fact.snippet)]??attributeEvidence({ruleId,url:page.url,title:page.title,snippet:fact.snippet,context:fact.snippet,sourceType:page.sourceType??'HTML'});
}
