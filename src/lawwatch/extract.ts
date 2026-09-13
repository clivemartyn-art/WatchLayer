import { load } from 'cheerio';
import type { Response } from '../crawler/http.js';
import { visibleText } from '../extractors/text.js';
import { hash } from '../snapshots/fingerprints.js';
import { serviceMatches } from './detectors/services.js';
import { regulatorySignals } from './detectors/regulatory.js';
import { pricingSignals } from './detectors/pricing.js';
import { evidenceSegments,sourceLinks } from './detectors/context.js';
import { sectionSignals } from './association.js';
import type { PageFacts } from './types.js';
import { fact } from './detectors/common.js';
import { complaintsProcedure } from './detectors/complaints.js';
export function extractLawFacts(response:Response):PageFacts|undefined {
  if(response.status<200||response.status>=300||!/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(response.contentType))return;
  const $=load(response.body);const title=$('title').first().text().trim().slice(0,240);
  const full=visibleText(response.body,true);const main=load(response.body);
  main('nav,footer,header,aside,script,style,noscript,[role="navigation"],[role="contentinfo"],[role="complementary"],.footer,#footer,[class*="footer_"],.sidebar,#sidebar').remove();
  const text=visibleText(main.html(),true);
  const heading=main('h1,h2').map((_,e)=>main(e).text()).get().join('\n');
  const segments=evidenceSegments(main,text);const fullSegments=evidenceSegments($,full);
  const identity=title+' '+main('h1').first().text()+' '+new URL(response.finalUrl).pathname;
  const privacy=/privacy|cookie|data.protection|data.breach|\bICO\b|grievance/i.test(identity);
  const article=/\/(?:news|news-blog|blogs?|insights?|articles?|events?|case-studies)\//i.test(response.finalUrl)||$('body.single-post,[itemtype*="BlogPosting"],[itemtype*="NewsArticle"]').length>0;
  const excludedContent=privacy||article;
  const complaints=!excludedContent&&/complaints?|regulatory|legal notices?|legal information|client.care|customer.service|feedback|terms/i.test(identity+' '+heading);
  const headingPrice=/\b(?:pric(?:e|es|ing)|fees?|costs?|charg(?:es|ing)|transparency)\b/i.test((identity+' '+heading).replace(/[-_/]/g,' '));
  const offering=!excludedContent&&(/services?|we (?:offer|provide|advise|act|assist)|our (?:fees|team)|fixed fee/i.test(text)||headingPrice);
  const services=serviceMatches([title,heading,text].join('\n'),offering);
  const headingServices=serviceMatches(title+'\n'+heading,true).filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service);
  const pricingServices=headingServices.length?headingServices:/commercial (?:property|leases?)|property litigation|will writing/i.test(title+' '+heading)?[]:undefined;
  const priceFacts=excludedContent?{}:pricingSignals(segments);
  const pricing=!excludedContent&&(headingPrice||(priceFacts['PRICE-001']??[]).some(f=>f.confidence==='HIGH')&&services.some(s=>s.state==='DETECTED_HIGH_CONFIDENCE'));
  const signals={...regulatorySignals($,full,fullSegments,complaints),...priceFacts};
  const procedure=complaintsProcedure(identity,segments,excludedContent);
  if(procedure.length)signals['LAW-U004']=procedure;
  const links=sourceLinks($,response.finalUrl,pricing);
  const quote=/get (?:a |an instant )?quote|instant quote|conveyancing quote|quote calculator|calculate (?:your )?fees/i.test(text);
  if(pricing){
    const currentPricing=segments.filter(s=>!/(?:copyright|qualified|admitted|graduated|founded|established)|(?:historically|previously|used to|ended in|temporary pilot|at that time)/i.test(s));
    signals['LAW-I001']=currentPricing.flatMap(s=>[...s.matchAll(/(?:reviewed|updated|revised)[^.!?\n]{0,55}\b(20\d{2})\b/gi)]).slice(0,3).map(m=>fact('explicit-review-year',m[0],'HIGH',m[1]));
    signals['LAW-I002']=currentPricing.flatMap(s=>[...s.matchAll(/(?:fees?|rates?|pric(?:es|ing))[^.!?\n]{0,60}\b(20\d{2})\b/gi)]).slice(0,3).map(m=>fact('pricing-year',m[0],'HIGH',m[1]));
  }
  return {url:response.finalUrl,title,contentHash:hash(text),reliable:!(/enable javascript|javascript is required/i.test(full)||full.split(/\s+/).length<50&&$('script').length>0),services,signals,links,pricing,pricingServices,complaints,quote_generator_detected:quote,excludedContent,serviceSignals:pricing?sectionSignals(main):{}};
}
