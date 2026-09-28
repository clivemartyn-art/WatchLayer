import {load} from 'cheerio';
import {sameDomain} from '../src/utils/urls.js';
import {visibleText} from '../src/extractors/text.js';
import type {BrowserObservation,BrowserResourceEvent} from '../src/browser/types.js';
export const norm=(s:string)=>s.normalize('NFKC').replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
export type Recovery='COMPLETE_EXPECTED_RECOVERY'|'PARTIAL_EXPECTED_RECOVERY'|'USEFUL_BUT_DIFFERENT_RECOVERY'|'EMPTY_VISIBLE_OUTPUT'|'NON_USEFUL_RENDER'|'FAILED_RENDER';
export function expectedMatches(html:string,url:string,texts:string[],links:string[]){
  const text=norm(visibleText(html)),$=load(html);
  const found=$('a[href]').toArray().flatMap(e=>{try{return [new URL($(e).attr('href')!,url).href];}catch{return [];}});
  return [...texts.map(t=>Boolean(norm(t))&&text.includes(norm(t))),...links.map(l=>found.includes(l))];
}
/** Evaluation-only: frozen expectations never enter production or imply complete site visibility. */
export function classifyRecovery(observation:Pick<BrowserObservation,'status'|'error'|'representation'|'finalUrl'>|undefined,target:{url:string;expectedTexts:string[];expectedLinks:string[]},usefulAlternate:boolean):{state:Recovery;matched:boolean[];canInferAbsence:false}{
  const result=(state:Recovery,matched:boolean[]=[])=>({state,matched,canInferAbsence:false as const});
  if(observation?.error==='EMPTY_VISIBLE_DOM')return result('EMPTY_VISIBLE_OUTPUT');
  if(observation?.status!=='RENDERED'||!observation.representation)return result('FAILED_RENDER');
  const html=observation.representation,$=load(html);
  if(!visibleText(html)&&!$('a[href]').length)return result('EMPTY_VISIBLE_OUTPUT');
  const matched=expectedMatches(html,observation.finalUrl??target.url,target.expectedTexts,target.expectedLinks);
  if(matched.length&&matched.every(Boolean))return result('COMPLETE_EXPECTED_RECOVERY',matched);
  if(matched.some(Boolean))return result('PARTIAL_EXPECTED_RECOVERY',matched);
  return result(usefulAlternate?'USEFUL_BUT_DIFFERENT_RECOVERY':'NON_USEFUL_RENDER',matched);
}
export function dependencyCategory(event:BrowserResourceEvent,site:string){
  let u:URL;try{u=new URL(event.url);}catch{return 'UNKNOWN_THIRD_PARTY';}
  if(sameDomain(u.href,site))return 'FIRST_PARTY';
  if(/(^|\.)(?:googletagmanager\.com|google-analytics\.com)$/.test(u.hostname))return 'TRACKING_ANALYTICS';
  if(/(^|\.)(?:doubleclick\.net|googlesyndication\.com)$/.test(u.hostname))return 'ADVERTISING';
  if(/(^|\.)(?:tawk\.to|chatsguru\.co|crisp\.chat)$/.test(u.hostname))return 'CHAT_WIDGET';
  if(['xhr','fetch'].includes(event.resourceType))return 'DYNAMIC_PUBLIC_API';
  if(['script','stylesheet'].includes(event.resourceType)&&/\.(?:js|css)$/.test(u.pathname))return 'STATIC_LIBRARY';
  return 'UNKNOWN_THIRD_PARTY';
}

/** Review sampling keeps overlapping detector windows from crowding out distinct evidence. */
export function distinctReviewFacts<T extends {text:string;rule:string|null}>(facts:T[],limit=3):T[]{
  const selected:T[]=[];
  for(const fact of facts){
    const text=norm(fact.text);
    if(!text||selected.some(other=>other.rule===fact.rule||norm(other.text).includes(text)||text.includes(norm(other.text))))continue;
    selected.push(fact);if(selected.length===limit)break;
  }
  return selected;
}
