import type { CheerioAPI } from 'cheerio';
import type { PageFacts,Service,Fact } from './types.js';
import type { Snapshot } from '../snapshots/types.js';
import { serviceMatches } from './detectors/services.js';
import { pricingSignals } from './detectors/pricing.js';
import { fact } from './detectors/common.js';
import { staffLink,urlPriority } from './discovery.js';
/** Heading-delimited sections prevent one service's costs or tax wording leaking to another. */
export function sectionSignals($:CheerioAPI):Partial<Record<Service,Record<string,Fact[]>>> {
  const output:Partial<Record<Service,Record<string,Fact[]>>>={};
  $('h2,h3').slice(0,40).each((_,el)=>{
    const heading=$(el).text();const blocks=$(el).nextUntil('h1,h2,h3');
    const text=heading+'\n'+blocks.text().replace(/\s+/g,' ');
    if(text.length>10000)return;
    const high=serviceMatches(text,true).filter(s=>s.state==='DETECTED_HIGH_CONFIDENCE');
    if(high.length!==1||!serviceMatches(heading,true).some(s=>s.service===high[0].service&&s.state.startsWith('DETECTED')))return;
    const parts=[text,...blocks.toArray().map(e=>$(e).text().replace(/\s+/g,' '))].filter(t=>t.length<=1000);
    // Individual cells/paragraphs remain available; all grouping stays within this heading.
    const signals=pricingSignals(parts);
    const service=high[0].service;const existing=output[service]??={};
    for(const [id,facts] of Object.entries(signals))existing[id]=[...(existing[id]??[]),...facts].slice(0,3);
  });
  return output;
}
export function associatePricingPages(pages:PageFacts[],snapshot:Snapshot):void {
  const byUrl=new Map(pages.map(p=>[p.url,p]));
  for(const source of pages)for(const link of source.links){
    if(link.document||staffLink(link)||urlPriority(link.url)<0||link.purpose!=='pricing'||link.associationConfidence!=='HIGH'||link.services?.length!==1)continue;
    const target=byUrl.get(link.url)??byUrl.get(snapshot.pages.find(p=>p.aliases.includes(link.url))?.finalUrl??'');
    if(!target||target.excludedContent)continue;
    const service=link.services[0];const match=target.services.find(s=>s.service===service);
    if(!match||match.excluded||target.services.some(s=>s.service!==service&&s.state==='DETECTED_HIGH_CONFIDENCE'))continue;
    target.pricing=true;
    if(match.state!=='DETECTED_HIGH_CONFIDENCE'){
      match.state='DETECTED_HIGH_CONFIDENCE';match.evidence=[fact('pricing-link-association',link.nearbyContext??link.label,'HIGH',source.url)];
    }
  }
}
