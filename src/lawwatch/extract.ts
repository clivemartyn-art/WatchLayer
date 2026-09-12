import { load } from 'cheerio';
import type { Response } from '../crawler/http.js';
import { visibleText } from '../extractors/text.js';
import { hash } from '../snapshots/fingerprints.js';
import { normalize } from '../utils/urls.js';
import { documentType } from '../links/classify.js';
import { serviceMatches } from './detectors/services.js';
import { regulatorySignals } from './detectors/regulatory.js';
import { pricingSignals } from './detectors/pricing.js';
import type { PageFacts,SourceLink } from './types.js';
import { fact } from './detectors/common.js';
export function extractLawFacts(response:Response):PageFacts|undefined {
  if(response.status<200||response.status>=300||!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(response.contentType))return;
  const $=load(response.body);const title=$('title').first().text().trim().slice(0,240);
  const full=visibleText(response.body,true);const main=load(response.body);main('nav,footer,header,script,style,noscript,[role="navigation"],[role="contentinfo"],.footer,#footer,[class*="footer_"]').remove();
  const text=visibleText(main.html(),true);
  const heading=main('h1,h2').map((_,e)=>main(e).text()).get().join('\n');
  const segments=text.split(/\n+|;\s*|(?<=[.!?])\s+/).map(s=>s.trim()).filter(s=>s.length>0&&s.length<=1000);
  const fullSegments=full.split(/\n+/).map(s=>s.trim()).filter(s=>s.length>0&&s.length<=1000);
  const privacy=/privacy|cookie/i.test(title+' '+main('h1').first().text()+' '+new URL(response.finalUrl).pathname);
  const complaints=!privacy&&/complaints?|regulatory|legal notices/i.test(title+' '+heading+' '+new URL(response.finalUrl).pathname);
  const pricing=!privacy&&/pric(?:e|es|ing)|fees?|costs?|charges/i.test(title+' '+heading+' '+new URL(response.finalUrl).pathname);
  const offering=!/\/(?:news|blog|insights|articles)\//i.test(response.finalUrl)&&(/services?|we (?:offer|provide|advise|act|assist)|our (?:fees|team)|fixed fee/i.test(text)||pricing);
  const services=serviceMatches([title,heading,text].join('\n'),offering);
  const signals={...regulatorySignals($,full,fullSegments,complaints),...(pricing?pricingSignals(segments):{})};
  if(complaints&&!/no complaints? (?:procedure|policy)|do not (?:have|publish).{0,20}complaint/i.test(text)&&(/complaints? (?:procedure|policy)|how to complain|client complaints|feedback and complaints/i.test(title+' '+heading+' '+text)||/complaints?/i.test(title+' '+heading)&&/contact|investigate|respond/i.test(text)))signals['LAW-U004']=[fact('complaints-page',title+' '+text.slice(0,180))];
  const links:SourceLink[]=[];let base=response.finalUrl;try{base=normalize($('base[href]').first().attr('href')??base,base);}catch{}
  $('a[href]').each((_,e)=>{try{const url=normalize($(e).attr('href')!,base);links.push({url,label:$(e).text().trim().slice(0,160),region:$(e).closest('footer').length?'footer':$(e).closest('nav,header').length?'navigation':'body',document:!!documentType(url)});}catch{}});
  const quote=/get (?:a |an instant )?quote|instant quote|conveyancing quote|quote calculator|calculate (?:your )?fees/i.test(text);
  if(pricing){
    signals['LAW-I001']=[...text.matchAll(/(?:reviewed|updated|revised)[^.!?\n]{0,55}\b(20\d{2})\b/gi)].slice(0,3).map(m=>fact('explicit-review-year',m[0],'HIGH',m[1]));
    signals['LAW-I002']=[...text.matchAll(/(?:fees?|rates?|pric(?:es|ing))[^.!?\n]{0,60}\b(20\d{2})\b/gi)].slice(0,3).map(m=>fact('pricing-year',m[0],'HIGH',m[1]));
  }
  return {url:response.finalUrl,title,contentHash:hash(text),reliable:!(/enable javascript|javascript is required/i.test(full)||full.split(/\s+/).length<50&&$('script').length>0),services,signals,links:links.slice(0,500),pricing,complaints,quote_generator_detected:quote};
}
