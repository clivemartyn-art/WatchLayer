import type { Confidence, Result, RuleRun, State } from '../rules/types.js';
import type { Snapshot } from '../snapshots/types.js';
export const SERVICE_IDS=['residential_conveyancing','remortgage','probate','immigration','immigration_appeals','motoring','employment_employee','employment_employer','debt_recovery','business_licensing'] as const;
export type Service=typeof SERVICE_IDS[number];
export type ClassificationState='DETECTED_HIGH_CONFIDENCE'|'DETECTED_LOW_CONFIDENCE'|'NOT_DETECTED'|'UNKNOWN';
export interface Fact {method:string; snippet:string; value?:string; confidence:Confidence}
export interface ServiceMatch {service:Service; state:ClassificationState; evidence:Fact[]; excluded?:boolean}
export interface SourceLink {url:string; label:string; region:'navigation'|'footer'|'body'; document:boolean}
export interface PageFacts {url:string; title:string; contentHash:string; reliable:boolean; services:ServiceMatch[]; signals:Record<string,Fact[]>; links:SourceLink[]; pricing:boolean; complaints:boolean; quote_generator_detected:boolean}
export interface FactSet {schemaVersion:1; detectorVersion:'1.0'; scanId:string; pages:PageFacts[]}
export interface ServiceClassification extends ServiceMatch {sourceUrls:string[]; origin:'detector'|'override'; explanation:string}
export interface Surface {signal:string; service?:Service; url:string; type:'page'|'document'; confidence:Confidence; firstObserved:string; latestObserved:string; observationState:'observed'|'not_observed'|'confirmed_missing'; sourceEvidence:{url:string; facts:Fact[]; link?:SourceLink; clickDepth?:number|null}[]}
export interface LawResult extends Result {serviceType?:Service}
export interface LawReport {schemaVersion:1; site:string; scanId:string; packId:'lawwatch-england-wales'; packVersion:'1.0'; universalResults:Result[]; classifications:ServiceClassification[]; inventory:Surface[]; results:LawResult[]; changes:LawResult[]; drift:LawResult[]; summary:Record<State,number>; runs:RuleRun[]; statement:string}
export interface LawContext {current:Snapshot; facts?:FactSet; previous?:Snapshot; previousFacts?:FactSet; previousInventory?:Surface[]; overrides?:Partial<Record<Service,boolean>>}
