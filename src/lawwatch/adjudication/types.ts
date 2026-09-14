import type { Fact,PdfProvenance,Service } from '../types.js';
export const ADJUDICATION_STATES=['SUPPORTED','PARTIALLY_SUPPORTED','AMBIGUOUS','NOT_RELEVANT','INSUFFICIENT_CONTEXT'] as const;
export type AdjudicationState=typeof ADJUDICATION_STATES[number];
export interface EvidenceContext {text:string;start:number;end:number;matched:boolean;locationMethod:'exact-snippet'|'verified-clauses'|'unavailable';repeatedOnPages:number;documentServices:Service[]}
export interface AdjudicatedItem {
  id:string;ruleId:string;serviceType?:Service;source:PdfProvenance;extracted:Pick<Fact,'method'|'snippet'|'value'|'confidence'>;
  context:EvidenceContext;state:AdjudicationState;reason:string;
}
export interface AdjudicationReport {
  schemaVersion:1;policyVersion:'1.0';mode:'deterministic';items:AdjudicatedItem[];
  counts:Record<AdjudicationState,number>;statement:string;
}
