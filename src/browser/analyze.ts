import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {extractPage} from '../extractors/page.js';
import {visibleText} from '../extractors/text.js';
import type {Response} from '../crawler/http.js';
import {browserEligibility} from './eligibility.js';
import {BROWSER_LIMITS,type BrowserReport,type BrowserRenderer,type BrowserObservation} from './types.js';
export const browserHash=(text:string)=>createHash('sha256').update(text).digest('hex');
export function browserAnalysis(target:string,renderer?:BrowserRenderer){
  const report:BrowserReport={schemaVersion:1,policyVersion:'1.0',limits:BROWSER_LIMITS,observations:[]};let attempts=0;
  return {report,async analyze(response:Response,depth:number,allowed:(url:string)=>Promise<void>){
    const decision=browserEligibility(response),staticPage=extractPage(response);
    const observation:BrowserObservation={requestedUrl:response.requestedUrl,staticUrl:response.finalUrl,staticStatus:response.status,staticHash:browserHash(response.body),reason:decision.reason,status:'BROWSER_NOT_REQUIRED',depth,durationMs:0,scriptErrors:[],requests:0,bytes:0,blockedRequests:0,staticEvidenceAvailable:true,
      comparison:{staticTextSize:staticPage.text.length,renderedTextSize:0,staticLinks:staticPage.links.length,renderedLinks:0,newLinks:[],lostLinks:[],newTextBlocks:0,lostTextBlocks:0,duplicateBlocks:0,outcome:'NOT_ATTEMPTED'}};
    report.observations.push(observation);
    if(!decision.eligible)return;
    if(attempts>=BROWSER_LIMITS.pages||depth>BROWSER_LIMITS.depth){observation.status='BROWSER_LIMIT_REACHED';return;}
    attempts++;observation.attemptedAt=new Date().toISOString();
    const began=Date.now();let result:Awaited<ReturnType<BrowserRenderer>>;
    try{renderer??=(await import('./render.js')).createBrowserRenderer();result=await renderer(response,target,allowed);}
    catch(error){observation.durationMs=Date.now()-began;observation.status='BROWSER_FAILED';observation.error=error instanceof Error?error.message.slice(0,240):'Browser failed';observation.comparison.outcome='FAILED';return;}
    Object.assign(observation,result);observation.durationMs=Date.now()-began;
    if(result.status!=='RENDERED'||!result.representation||!result.finalUrl){observation.comparison.outcome='FAILED';return;}
    observation.domHash=browserHash(result.representation);
    const rendered:Response={requestedUrl:response.requestedUrl,finalUrl:result.finalUrl,status:200,contentType:'text/html',body:result.representation,redirects:[],responseTimeMs:result.durationMs};
    const page=extractPage(rendered),before=new Set(staticPage.links.map(l=>l.url)),after=new Set(page.links.map(l=>l.url));
    observation.forms=page.forms;
    const lines=(html:string)=>visibleText(html,true).split('\n').filter(t=>t.trim().length>10);
    const oldLines=new Set(lines(response.body)),newLines=lines(rendered.body),newSet=new Set(newLines);
    const meaningfulNew=newLines.filter(l=>!oldLines.has(l));
    const contentLines=(html:string)=>{const $=load(html);$('nav,header,footer,[role="navigation"],[role="contentinfo"]').remove();return lines($.html());};
    const oldContent=new Set(contentLines(response.body)),newContent=contentLines(rendered.body).some(l=>!oldContent.has(l));
    observation.comparison={...observation.comparison,renderedTextSize:page.text.length,renderedLinks:page.links.length,newLinks:[...after].filter(l=>!before.has(l)),lostLinks:[...before].filter(l=>!after.has(l)),newTextBlocks:meaningfulNew.length,lostTextBlocks:[...oldLines].filter(l=>!newSet.has(l)).length,duplicateBlocks:(result.duplicatesSuppressed??0)+newLines.length-newSet.size,outcome:meaningfulNew.length||[...after].some(l=>!before.has(l))?'NEW_CONTENT':'NO_MATERIAL_CHANGE'};
    if(observation.comparison.outcome==='NEW_CONTENT'&&!newContent)observation.comparison.outcome='BOILERPLATE_ONLY';
    return {response:rendered,observation};
  }};
}
