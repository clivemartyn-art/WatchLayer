import { matches } from './common.js';
import type { Fact } from '../types.js';
const money=/£\s*\d[\d,]*(?:\.\d{2})?/i;
const fees=/\b(?:our|legal|fixed|total|average|estimated|typical) (?:fees?|costs?|charges?)\b|\b(?:fees?|costs?) (?:range|from|between|start)/i;
const vat=/\bVAT\b|value added tax/i;
const disbursement=/disbursement|third.party costs?|court fee|land registry|search fees?/i;
export function pricingSignals(segments:string[]):Record<string,Fact[]> {
  const spec:[RegExp[],RegExp?][]=[
    [[money,fees],money],
    [[/fixed fee|hourly (?:rate|basis)|charge.*per hour|percentage (?:of|basis)/i],/charging|fees/i],
    [[money,/fixed fee|hourly|per hour/i],/fixed fee|hourly/i],
    [[/solicitor|lawyer|conveyancer|caseworker|legal executive/i,/\bqualified\b|\bqualifications?\b|\d+ years.{0,25}experience|admitted in \d{4}/i],/experience|qualifications/i],
    [[/supervis(?:or|ed|ing|ion)/i,/\bqualified\b|\bqualifications?\b|\d+ years.{0,25}experience|admitted in \d{4}/i],/supervis/i],
    [[disbursement,/include|such as|court fee|land registry|search fees/i],disbursement],
    [[disbursement,money],disbursement],
    [[vat,/fees?|charges?/i,/includ|exclud|plus|subject to|not.*(?:payable|applicable)|exempt/i],vat],
    [[vat,/VAT\s*(?:(?:at|of|is|amounts to)\s*)?[:(]?\s*(?:20\s*%|0\s*%|£\s*\d)|(?:20\s*%|0\s*%)\s*VAT|(?:not|no) VAT|VAT exempt/i,/fees?|charges?/i],vat],
    [[vat,disbursement,/(?:disbursements?|third.party costs?|court fees?|land registry(?: fees?)?|search fees?)[^.!?]{0,60}(?:includ|exclud|plus|no |exempt|not applicable)[^.!?]{0,15}VAT|VAT[^.!?]{0,30}(?:on|for) (?:the )?disbursements?[^.!?]{0,35}(?:includ|exclud|payable|exempt)/i],disbursement],
    [[/(?:our|the|quoted) (?:fees?|price|service).{0,30}(?:includes?|covers?)|includ(?:ed|sions?).{0,25}(?:fees?|price)|what is included/i,/advis|draft|prepar|register|submit|collect|correspond|review/i],/included|inclusions/i],
    [[/exclud|not include|additional (?:fee|cost|work)|outside (?:the|our) (?:fee|price)/i,/disput|tax advice|appeal|hearing|complex|sale|litigation|separate charge|charged separately/i],/exclud|not include/i],
    [[/stages?|process/i,/initial|first|then|finally|completion|application|submission/i,/instruct|review|prepar|draft|submit|register|complet|investigat|collect|exchange/i],/stages?|process/i],
    [[/\b\d+(?:\s*(?:to|[-–])\s*\d+)?\s*(?:days?|weeks?|months?)\b/i,/typical|usually|likely|normally|takes?|timescale|duration|stage/i],/timescale|duration/i],
    [[/conditional fee|damages.based|no win.{0,5}no fee/i,/you (?:may|will|must) (?:pay|be liable)|deduct.{0,30}damages/i],/conditional fee|damages.based|no win.{0,5}no fee/i],
  ];
  return Object.fromEntries(spec.map(([required,partial],i)=>{
    const scoped=i===10?segments.filter(s=>!/not includ|does not (?:include|cover)|exclud/i.test(s)):segments;
    return [`PRICE-${String(i+1).padStart(3,'0')}`,matches(scoped,'pricing-pattern',required,partial).map(f=>i>=7&&i<=9&&/unclear|unknown|not (?:confirmed|specified|stated)|may apply/i.test(f.snippet)?{...f,confidence:'MEDIUM' as const}:f)];
  }));
}
