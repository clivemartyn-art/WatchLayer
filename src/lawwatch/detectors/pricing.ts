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
    [[/solicitor|lawyer|conveyancer|caseworker|legal executive/i,/qualified|qualifications?|\d+ years.{0,25}experience|admitted in \d{4}/i],/experience|qualifications/i],
    [[/supervis(?:or|ed|ing|ion)/i,/qualified|qualifications?|\d+ years.{0,25}experience|admitted in \d{4}/i],/supervis/i],
    [[disbursement,/include|such as|court fee|land registry|search fees/i],disbursement],
    [[disbursement,money],disbursement],
    [[vat,/fees?|charges?/i,/includ|exclud|plus|subject to|not.*(?:payable|applicable)|exempt/i],vat],
    [[vat,/VAT\s*(?:(?:at|of|is|amounts to)\s*)?[:(]?\s*(?:20\s*%|0\s*%|£\s*\d)|(?:20\s*%|0\s*%)\s*VAT|(?:not|no) VAT|VAT exempt/i,/fees?|charges?/i],vat],
    [[vat,disbursement,/includ|exclud|plus|subject to|not.*(?:payable|applicable)|exempt/i],disbursement],
    [[/our (?:fee|price|service).{0,30}includes?|included in (?:the|our) (?:fee|price)/i,/advis|draft|prepar|register|submit|collect|correspond|review/i],/included|inclusions/i],
    [[/exclud|not include|additional (?:fee|cost)/i,/disput|tax advice|appeal|hearing|complex|sale|litigation/i],/exclud|not include/i],
    [[/stages?|process/i,/initial|first|then|finally|completion|application|submission/i],/stages?|process/i],
    [[/\b\d+(?:\s*(?:to|[-–])\s*\d+)?\s*(?:days?|weeks?|months?)\b/i,/typical|usually|likely|normally|takes?|timescale|duration|stage/i],/timescale|duration/i],
    [[/conditional fee|damages.based|no win.{0,5}no fee/i,/you (?:may|will|must) (?:pay|be liable)|deduct.{0,30}damages/i],/conditional fee|damages.based|no win.{0,5}no fee/i],
  ];
  return Object.fromEntries(spec.map(([required,partial],i)=>[`PRICE-${String(i+1).padStart(3,'0')}`,matches(segments,'pricing-pattern',required,partial).map(f=>i>=7&&i<=9&&/unclear|unknown|not (?:confirmed|specified|stated)|may apply/i.test(f.snippet)?{...f,confidence:'MEDIUM' as const}:f)]));
}
