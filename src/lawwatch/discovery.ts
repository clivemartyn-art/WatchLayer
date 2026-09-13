import type { CrawlPolicy } from '../crawler/scan.js';
import type { PageFacts,SourceLink } from './types.js';
const pricing=/\b(?:pricing|prices?|fees?|costs?|charges?|transparency|quote|charging)\b/i;
const service=/\b(?:conveyancing|property|probate|wills?|estate administration|employment|immigration|motoring|road traffic|debt|licensing)\b/i;
export function urlPriority(url:string):number {
  const u=new URL(url);let path=u.pathname;try{path=decodeURIComponent(path);}catch{}
  const words=path.replace(/[-_/+.]/g,' ');
  if(/[?&](?:s|search|q|page|paged|month|year|calendar)=/i.test(u.search)||/\b(?:calendar|search)\b/i.test(words))return -200;
  if(/\b(?:news|blogs?|insights?|events?|articles?|authors?)\b/i.test(words))return -100;
  if(/\b(?:people|team|staff|profiles?|biograph)/i.test(words))return -80;
  if(/privacy|cookies?|testimonials?/i.test(words))return -60;
  if(/\b(?:complaints?|client care|customer service|feedback|ombudsman)\b/i.test(words))return 400;
  if(pricing.test(words))return 350;
  if(/\b(?:regulatory|sra|legal information|legal notices?|terms)\b/i.test(words)||/^\/legal\/?$/i.test(path))return 140;
  if(service.test(words))return 60;
  return 0;
}
export function staffLink(link:SourceLink):boolean {
  if(link.region!=='body'||link.document)return false;
  const context=link.label+' '+(link.nearbyContext??'');
  return /\b(?:people|team|staff|profiles?)\b/i.test(new URL(link.url).pathname.replace(/[-_/]/g,' '))||/\b(?:supervisor|solicitor|lawyer|partner|profile|head of)\b/i.test(link.label)&&/\b(?:our|meet|your|supervis\w*|carried out by|handled by)\b/i.test(context)||/\b(?:supervised by|supervisor is)\b/i.test(context);
}
/** Sector vocabulary stays here; the crawler only sees a neutral ranking policy. */
export function lawDiscovery(evidenceBudget:number,staffBudget:number):{policy:CrawlPolicy;observe:(page:PageFacts)=>void} {
  const weights=new Map<string,number>();const staff=new Set<string>();const baseScores=new Map<string,number>();
  const base=(url:string)=>{if(!baseScores.has(url))baseScores.set(url,urlPriority(url));return baseScores.get(url)!;};
  const score=(url:string)=>Math.max(base(url),weights.get(url)??-Infinity);
  return {
    policy:{profile:`lawwatch-1.2:evidence=${evidenceBudget}:staff=${staffBudget}`,
      priority:url=>staff.has(url)||base(url)===-80&&/\/(?:people|team|staff|profiles?)\/[^/]+/i.test(new URL(url).pathname)?null:score(url),
      stages:[
        {name:'regulatory-evidence',budget:evidenceBudget,priority:url=>staff.has(url)||base(url)<0?null:score(url)>0?score(url):null},
        {name:'linked-staff',budget:staffBudget,priority:url=>staff.has(url)?1:null},
      ]},
    observe(page){
      // Profiles do not seed further biographies. Only links from pricing material qualify.
      if(staff.has(page.url))return;
      for(const link of page.links){
        if(link.document)continue;
        if(page.pricing&&staffLink(link)){staff.add(link.url);continue;}
        if(base(link.url)<0)continue;
        const context=link.label+' '+(link.nearbyContext??'');
        let weight=base(link.url);
        if(/complaints?|client care|customer service|regulatory|ombudsman|legal information/i.test(link.label))weight=Math.max(weight,410);
        if(pricing.test(link.label))weight=Math.max(weight,380);
        if(page.pricing&&link.region==='body'&&(pricing.test(context)||service.test(context)))weight=Math.max(weight,220);
        if(weight>0&&link.region!=='body')weight+=20;
        weights.set(link.url,Math.max(weights.get(link.url)??0,weight));
      }
    },
  };
}
