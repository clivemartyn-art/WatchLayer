import { load,type CheerioAPI } from 'cheerio';
import { normalize } from '../../utils/urls.js';
import { documentType } from '../../links/classify.js';
import { serviceMatches } from './services.js';
import type { SourceLink } from '../types.js';
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
/** Local blocks retain table/list relationships without joining unrelated service sections. */
export function evidenceSegments($:CheerioAPI,text:string):string[] {
  const segments=text.split(/\n+|;\s*|(?<=[.!?])\s+/).map(clean).filter(s=>s.length>0&&s.length<=1000);
  $('p,li,tr,dd').each((_,el)=>{const value=clean($(el).text());if(value&&value.length<=1000)segments.push(value);});
  $('h2,h3,h4').each((_,el)=>{
    const heading=clean($(el).text());const following=$(el).next();
    if(following.is('ul,ol,table,p')){const value=clean(heading+' '+following.text());if(value.length<=1000)segments.push(value);}
  });
  return [...new Set(segments)].slice(0,2000);
}
export function sourceLinks($:CheerioAPI,sourceUrl:string,pricingPage:boolean):SourceLink[] {
  $=load($.html());$('script,style,noscript').remove();
  let base=sourceUrl;try{base=normalize($('base[href]').first().attr('href')??base,base);}catch{}
  const links:SourceLink[]=[];
  $('a[href]').slice(0,500).each((_,el)=>{try{
    const node=$(el);const url=normalize(node.attr('href')!,base);const label=clean(node.text()||node.find('img').attr('alt')||'').slice(0,160);
    const footer=node.closest('footer,[role="contentinfo"],.footer,#footer,[class*="footer_"]');
    const navigation=node.closest('nav,header,[role="navigation"]');
    const region=footer.length?'footer':navigation.length?'navigation':'body';
    let block=node.closest('p,li,td,section');if(!block.length)block=node.parent();
    let heading=clean(block.find('h2,h3,h4').first().text());let scope=block;
    for(let depth=0;!heading&&depth<4&&scope.length;depth++,scope=scope.parent())heading=clean(scope.prevAll('h2,h3,h4').first().text());
    const local=region==='body'?clean(block.text()):label;const at=label?local.indexOf(label):0;
    const nearbyContext=clean((region==='body'?heading:'')+' '+local.slice(Math.max(0,at-60),Math.max(0,at-60)+180)).slice(0,240);
    let path=new URL(url).pathname;try{path=decodeURIComponent(path);}catch{}
    const context=label+' '+path.replace(/[-_/+.]/g,' ')+' '+nearbyContext;
    const matches=serviceMatches(context,true).filter(s=>s.state.startsWith('DETECTED'));
    const services=matches.map(s=>s.service);
    const document=!!documentType(url);
    const purpose=/complaints? (?:procedure|policy)|how to complain/i.test(context)||/complaint/i.test(label+' '+path)?'complaints':/pricing|prices?|fees?|costs?|charges?/i.test(context)||pricingPage&&region==='body'&&services.length?'pricing':undefined;
    links.push({url,label,region,document,sourceUrl,nearbyContext,services,purpose,associationConfidence:matches.length&&matches.every(s=>s.state==='DETECTED_HIGH_CONFIDENCE')?'HIGH':'MEDIUM'});
  }catch{/* Invalid and non-HTTP links are not candidates. */}});
  return links;
}
