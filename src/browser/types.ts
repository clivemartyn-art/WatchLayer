import type {Response,Fetcher} from '../crawler/http.js';
export const BROWSER_LIMITS={pages:5,depth:2,loadMs:8000,totalMs:20000,settleMs:1500,launchMs:5000,requests:80,resourceBytes:2000000,totalBytes:10000000,domBytes:200000,textCharacters:50000,nodes:10000,redirects:5,retries:0,concurrency:1} as const;
export type BrowserReason='STATIC_CONTENT_SUFFICIENT'|'APP_SHELL_DETECTED'|'STATIC_BODY_TOO_SPARSE'|'RENDERED_LINK_DISCOVERY_REQUIRED'|'BROWSER_NOT_REQUIRED';
export type BrowserStatus='RENDERED'|'BROWSER_FAILED'|'BROWSER_TIMED_OUT'|'BROWSER_LIMIT_REACHED'|'BROWSER_NOT_REQUIRED';
export interface RenderedOrigin {sourceType:'RENDERED_DOM';url:string;requestedUrl:string;observedAt:string;domHash:string;staticHash:string;strategy:'initial-visible-dom-v1'}
export interface BrowserObservation {
  duplicatesSuppressed?:number;forms?:import('../schemas/scan.js').Form[];
  requestedUrl:string;staticUrl:string;staticStatus:number;staticHash:string;reason:BrowserReason;status:BrowserStatus;depth:number;
  attemptedAt?:string;durationMs:number;finalUrl?:string;domHash?:string;representation?:string;error?:string;scriptErrors:string[];
  requests:number;bytes:number;blockedRequests:number;staticEvidenceAvailable:true;
  comparison:{staticTextSize:number;renderedTextSize:number;staticLinks:number;renderedLinks:number;newLinks:string[];lostLinks:string[];newTextBlocks:number;lostTextBlocks:number;duplicateBlocks:number;outcome:'NOT_ATTEMPTED'|'NEW_CONTENT'|'BOILERPLATE_ONLY'|'NO_MATERIAL_CHANGE'|'FAILED'};
}
export interface BrowserReport {schemaVersion:1;policyVersion:'1.0';limits:typeof BROWSER_LIMITS;observations:BrowserObservation[]}
export interface BrowserSummary {attempted:number;rendered:number;failed:number;timedOut:number;limitReached:number;addedTimeMs:number;statement:string}
export function browserSummary(report:BrowserReport):BrowserSummary {
  const observations=report.observations;
  return {attempted:observations.filter(o=>o.attemptedAt).length,rendered:observations.filter(o=>o.status==='RENDERED').length,failed:observations.filter(o=>o.status==='BROWSER_FAILED').length,timedOut:observations.filter(o=>o.status==='BROWSER_TIMED_OUT').length,limitReached:observations.filter(o=>o.status==='BROWSER_LIMIT_REACHED').length,addedTimeMs:observations.reduce((n,o)=>n+o.durationMs,0),statement:'Selected public pages were observed after loading. Interactive content may remain unobserved; failed observation does not establish absence.'};
}
export type BrowserRenderer=(response:Response,target:string,allowed:(url:string)=>Promise<void>)=>Promise<Pick<BrowserObservation,'status'|'durationMs'|'finalUrl'|'representation'|'error'|'scriptErrors'|'requests'|'bytes'|'blockedRequests'|'duplicatesSuppressed'>>;
/** Transport override is exclusively a trusted deterministic fixture seam. */
export interface RenderOptions {fetcher?:Fetcher}
