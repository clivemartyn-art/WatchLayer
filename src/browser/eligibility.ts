import {load} from 'cheerio';
import {visibleText} from '../extractors/text.js';
import type {Response} from '../crawler/http.js';
import type {BrowserReason} from './types.js';
export function browserEligibility(response:Response):{eligible:boolean;reason:BrowserReason}{
  if(/\/(?:login|sign-in|account|dashboard|portal|checkout|wp-admin)(?:\/|$)/i.test(new URL(response.finalUrl).pathname))return {eligible:false,reason:'BROWSER_NOT_REQUIRED'};
  if(response.status<200||response.status>=300||!/html/i.test(response.contentType))return {eligible:false,reason:'BROWSER_NOT_REQUIRED'};
  const $=load(response.body),staticLinks=$('a[href]').length;$('nav,header,footer,[role="navigation"],[role="contentinfo"]').remove();
  const text=visibleText($.html()),words=text.split(/\s+/).filter(Boolean).length;
  if(words>=80)return {eligible:false,reason:'STATIC_CONTENT_SUFFICIENT'};
  const scripts=$('script[src],script[type="module"],script:not([type])').length>0;
  const shell=$('#root:empty,#app:empty,app-root:empty,#__next:empty').length>0||/enable javascript|javascript is required|loading\.{0,3}$/i.test(text);
  if(scripts&&shell&&words<35)return {eligible:true,reason:'APP_SHELL_DETECTED'};
  if(scripts&&words<15&&staticLinks===0)return {eligible:true,reason:'RENDERED_LINK_DISCOVERY_REQUIRED'};
  if(scripts&&words<30&&($('[aria-busy="true"]').length>0||staticLinks===0&&$('main:empty').length>0))return {eligible:true,reason:'STATIC_BODY_TOO_SPARSE'};
  return {eligible:false,reason:words>=30?'STATIC_CONTENT_SUFFICIENT':'BROWSER_NOT_REQUIRED'};
}
