import {expect,it} from 'vitest';
import {assessSupport} from '../src/lawwatch/adjudication/policy.js';
import {extractAnalysisSource} from '../src/lawwatch/pdf.js';
import {containingStatement} from '../src/lawwatch/adjudication/pricing-context.js';
import type {EvidenceContext} from '../src/lawwatch/adjudication/types.js';
function assess(rule:string,snippet:string,text=snippet,overrides:Partial<EvidenceContext>={}){
  const page=extractAnalysisSource({sourceType:'PDF',url:'https://example.com/debt-pricing.pdf',title:'Debt recovery pricing',text,pageNumber:1,documentId:'fixture',sha256:'a'.repeat(64),referrers:[]})!;
  page.pricing=true;page.pricingServices=['debt_recovery'];
  return assessSupport(rule,{snippet,method:'fixture',confidence:'MEDIUM'},page,{text,matched:true,start:0,end:text.length,locationMethod:'exact-snippet',repeatedOnPages:1,documentServices:['debt_recovery'],...overrides},'debt_recovery');
}
it('recognizes explicit we-charge VAT wording without upgrading raw extraction confidence',()=>{expect(assess('PRICE-008','We charge £750 + 20% VAT on average for this work if it remains uncontested.').state).toBe('SUPPORTED');});
it.each(['PRICE-008','PRICE-009'])('keeps mixed-service safeguards before explicit VAT support for %s',rule=>{expect(assess(rule,'We charge £750 + 20% VAT on average for this work.',undefined,{documentServices:['probate','debt_recovery']}).state).toBe('AMBIGUOUS');});
it('keeps missing location safeguards before explicit VAT support',()=>{expect(assess('PRICE-008','We charge £750 + 20% VAT on average for this work.',undefined,{matched:false}).state).toBe('INSUFFICIENT_CONTEXT');});
it('does not upgrade uncertain VAT construction',()=>{expect(assess('PRICE-008','We charge £750 + 20% VAT but this may change for your work.').state).toBe('PARTIALLY_SUPPORTED');});
it('does not classify a tax-only sentence as identification of a likely expense',()=>{expect(assess('PRICE-006','There is no VAT on court fees.','Debt recovery charges. There is no VAT on court fees. Other costs depend on your claim.').state).toBe('NOT_RELEVANT');});
it('retains actual expense statements containing tax information',()=>{expect(assess('PRICE-006','Your disbursements include court fees of £119 with no VAT.').state).toBe('PARTIALLY_SUPPORTED');});
it('does not affirm a negated charging basis from a truncated fragment',()=>{expect(assess('PRICE-002','of a percentage of the gross estate value.','We do not charge for administering the estate in terms of a percentage of the gross estate value. Our fees are calculated on time spent.').state).toBe('PARTIALLY_SUPPORTED');});
it('does not apply a neighboring negative sentence to an affirmative basis',()=>{expect(containingStatement('We do not charge a fixed fee. Our fees use a percentage of the estate.','Our fees use a percentage of the estate.')).toBe('Our fees use a percentage of the estate.');});
it('does not split a sentence at the decimal point in a price',()=>{expect(containingStatement('Our charge is £750.50 plus VAT. Other fees vary.','£750.50')).toBe('Our charge is £750.50 plus VAT.');});
