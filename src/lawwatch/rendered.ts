import type {Response} from '../crawler/http.js';
import type {BrowserObservation,RenderedOrigin} from '../browser/types.js';
import type {Fact,PageFacts} from './types.js';
import {extractLawFacts} from './extract.js';
export function renderedLawFacts(response:Response,observation:BrowserObservation):PageFacts|undefined {
  if(observation.status!=='RENDERED'||!observation.domHash||!observation.attemptedAt)return;
  const page=extractLawFacts(response);if(!page)return;
  const origin:RenderedOrigin={sourceType:'RENDERED_DOM',url:response.finalUrl,requestedUrl:response.requestedUrl,observedAt:observation.attemptedAt,domHash:observation.domHash,staticHash:observation.staticHash,strategy:'initial-visible-dom-v1'};
  page.observation=origin;
  const cite=(f:Fact):Fact=>({...f,observation:origin});
  for(const group of [page.signals,...Object.values(page.serviceSignals??{})])for(const [key,values] of Object.entries(group))group[key]=values.map(cite);
  for(const service of page.services)service.evidence=service.evidence.map(cite);
  return page;
}
