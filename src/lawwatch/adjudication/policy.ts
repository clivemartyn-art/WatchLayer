import type { Fact,PageFacts,Service } from '../types.js';
import type { AdjudicationState,EvidenceContext } from './types.js';
import { serviceMatches } from '../detectors/services.js';
import { explicitChargeVat,negatedChargingBasis,taxOnlyExpense } from './pricing-context.js';
export function assessSupport(ruleId:string,fact:Fact,page:PageFacts,context:EvidenceContext,service?:Service):{state:AdjudicationState;reason:string}{
  const result=(state:AdjudicationState,reason:string)=>({state,reason});
  if(!context.matched||context.text.length<40)return result('INSUFFICIENT_CONTEXT','Exact evidence location or sufficient surrounding page text is unavailable.');
  const identity=(page.title+' '+new URL(page.url).pathname).replace(/[-_]/g,' ');
  const text=context.text,snippet=fact.snippet;
  if(/newsletter|case stud|news\b|insight|impact report|survey|privacy|data protection|marketing/i.test(identity))return result('NOT_RELEVANT','Document purpose does not support a current firm regulatory or pricing observation.');
  if(/\b(?:hypothetical|illustrative example|sample wording|example only|other firm|another firm|third.party firm|intervention agent)\b/i.test(text))return result('AMBIGUOUS','Illustrative or third-party context needs independent review.');
  if(ruleId.startsWith('PRICE')||ruleId.startsWith('LAW-I')){
    if(context.documentServices.length!==1)return result('AMBIGUOUS','Document service scope is absent or mixed; no section model is inferred.');
    const scoped=context.documentServices[0];
    if(service&&service!==scoped)return result('NOT_RELEVANT','Document evidence belongs to a different service.');
    if(!page.pricing&&!page.staffServices?.includes(scoped))return result('NOT_RELEVANT','No pricing or explicitly linked staff context supports this evidence.');
    const local=serviceMatches(text,true).filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service);
    if(local.some(s=>s!==scoped))return result('AMBIGUOUS','Surrounding evidence mentions a different service.');
    if(context.repeatedOnPages>1&&!local.includes(scoped))return result('AMBIGUOUS','Repeated boilerplate lacks local service context.');
    if(ruleId==='PRICE-001'&&/house prices?|property valu|mortgage value|average home/i.test(snippet)&&!/legal fee/i.test(snippet))return result('NOT_RELEVANT','The monetary reference describes property value rather than the firm fee.');
    if(ruleId==='PRICE-002'&&negatedChargingBasis(text,snippet))return result('PARTIALLY_SUPPORTED','The located statement negates the named charging basis; it does not affirm that basis.');
    if(ruleId==='PRICE-006'&&taxOnlyExpense(snippet))return result('NOT_RELEVANT','The statement describes tax treatment, not whether this expense is likely for the service.');
    if(['PRICE-008','PRICE-009'].includes(ruleId)&&explicitChargeVat(snippet))return result('SUPPORTED','The located statement explicitly connects the firm charge to a VAT rate; extraction confidence is retained separately.');
    if(['PRICE-008','PRICE-009'].includes(ruleId)&&!/\b(?:our|legal|total|fixed|hourly|professional|average|estimated|typical) (?:fees?|charges?|costs?)\b|\bfees? (?:are|exclude|include|plus|subject)\b/i.test(snippet))return result('PARTIALLY_SUPPORTED','VAT is mentioned, but treatment of the firm legal fee is not explicit in the matched statement.');
    if(ruleId==='PRICE-013'&&!/(?:initial|first|then|next|finally|completion|submission)/i.test(snippet))return result('PARTIALLY_SUPPORTED','A process is mentioned without a sufficiently explicit stage sequence.');
    if(ruleId==='PRICE-014'&&/if.{0,40}not received|payment.{0,30}(?:days|weeks)|\bwithin 14 days\b/i.test(snippet))return result('PARTIALLY_SUPPORTED','A payment or response deadline may not describe the service duration.');
  }
  if(ruleId==='LAW-U001'){
    const label=new URL(page.url).hostname.replace(/^www\./,'').split('.')[0];
    const own=/\b(?:we|our|this firm)\b/i.test(text)||label.length>=4&&text.toLowerCase().replace(/[^a-z0-9]/g,'').includes(label.replace(/[^a-z0-9]/g,''));
    if(!own||!/(?:authorised|authorized|regulated)\b.{0,100}(?:SRA|Solicitors Regulation Authority)|(?:SRA|Solicitors Regulation Authority).{0,80}(?:authorised|regulated)|\bour SRA (?:number|registration|ID)\b/i.test(text))return result('INSUFFICIENT_CONTEXT','A number was extracted but its relationship to the scanned firm is not established.');
  }
  if(/^LAW-U00[4-9]$/.test(ruleId)){
    if(!/complaint|client care|terms|regulatory|legal information/i.test(identity)||!/\b(?:you|your|we|our|client)\b/i.test(text))return result('NOT_RELEVANT','Generic regulatory wording lacks an identifiable client-facing complaints context.');
    if(!/complain|unhappy|dissatisfied/i.test(text))return result('INSUFFICIENT_CONTEXT','No client complaint relationship can be established from the surrounding text.');
    if(ruleId==='LAW-U005'&&!/Legal Ombudsman.{0,100}(?:complain|contact|refer|help)|(?:complain|contact|refer).{0,120}Legal Ombudsman/i.test(text))return result('PARTIALLY_SUPPORTED','The named body is present without a sufficiently clear complaints relationship.');
  }
  if(fact.confidence!=='HIGH')return result('PARTIALLY_SUPPORTED','The extracted match is partial; context does not upgrade extraction confidence.');
  return result('SUPPORTED','Located page evidence and deterministic rule/service context support this limited observation.');
}
