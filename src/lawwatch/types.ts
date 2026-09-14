import type { Confidence, Result, RuleRun, State } from '../rules/types.js';
import type { Snapshot } from '../snapshots/types.js';
export const SERVICE_IDS=['residential_conveyancing','remortgage','probate','immigration','immigration_appeals','motoring','employment_employee','employment_employer','debt_recovery','business_licensing'] as const;
export type Service=typeof SERVICE_IDS[number];
export type ClassificationState='DETECTED_HIGH_CONFIDENCE'|'DETECTED_LOW_CONFIDENCE'|'NOT_DETECTED'|'UNKNOWN';
export interface PdfProvenance {sourceType:"PDF";url:string;title:string;pageNumber:number;documentId:string;sha256:string;referrers:import("../documents/types.js").DocumentReferrer[]}
export interface Fact {source?:PdfProvenance;method:string; snippet:string; value?:string; confidence:Confidence}
export interface ServiceMatch {service:Service; state:ClassificationState; evidence:Fact[]; excluded?:boolean}
export interface SourceLink {url:string; label:string; region:'navigation'|'footer'|'body'; document:boolean; sourceUrl?:string; nearbyContext?:string; services?:Service[]; purpose?:'pricing'|'complaints'; associationConfidence?:Confidence}
export interface PageFacts {sourceType?:"HTML"|"PDF";staffServices?:Service[];url:string; title:string; contentHash:string; reliable:boolean; services:ServiceMatch[]; signals:Record<string,Fact[]>; links:SourceLink[]; pricing:boolean; pricingServices?:Service[]; complaints:boolean; quote_generator_detected:boolean; excludedContent?:boolean; serviceSignals?:Partial<Record<Service,Record<string,Fact[]>>>}
export interface FactSet {schemaVersion:1; detectorVersion:'1.0'|'1.1'|'1.2'|'1.3'; scanId:string; pages:PageFacts[]}
export interface ServiceClassification extends ServiceMatch {sourceUrls:string[]; origin:'detector'|'override'; explanation:string}
export interface Surface {document?:Pick<import('../documents/types.js').PdfExtraction,'documentId'|'status'|'title'|'pageCount'|'referrers'|'sha256'>;signal:string; service?:Service; url:string; type:'page'|'document'; confidence:Confidence; firstObserved:string; latestObserved:string; observationState:'observed'|'not_observed'|'confirmed_missing'; sourceEvidence:{url:string; facts:Fact[]; link?:SourceLink; clickDepth?:number|null}[]}
export const UNKNOWN_REASONS=['PAGE_NOT_DISCOVERED','DOCUMENT_CONTENT_UNAVAILABLE','BROWSER_REQUIRED','DETECTOR_INSUFFICIENT','SERVICE_APPLICABILITY_UNCERTAIN','STAFF_INFORMATION_NOT_DISCOVERED','CRAWL_BUDGET_EXHAUSTED','NETWORK_FAILURE','AMBIGUOUS_EVIDENCE'] as const;
export type UnknownReason=typeof UNKNOWN_REASONS[number];
export interface LawResult extends Result {serviceType?:Service;unknownReasonCodes?:UnknownReason[]}
export interface LawReport {adjudication?:import('./adjudication/types.js').AdjudicationReport;pdf?:import("../documents/types.js").PdfReport;schemaVersion:1; site:string; scanId:string; packId:'lawwatch-england-wales'; packVersion:'1.0'|'1.1'|'1.2'|'1.3'|'1.4'|'1.5'; universalResults:Result[]; classifications:ServiceClassification[]; inventory:Surface[]; results:LawResult[]; changes:LawResult[]; drift:LawResult[]; summary:Record<State,number>; runs:RuleRun[]; statement:string}
export interface LawContext {current:Snapshot; facts?:FactSet; previous?:Snapshot; previousFacts?:FactSet; previousInventory?:Surface[]; overrides?:Partial<Record<Service,boolean>>}
