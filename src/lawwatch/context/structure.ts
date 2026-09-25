import {load} from 'cheerio';
import {serviceMatches} from '../detectors/services.js';
export const normalize=(s:string)=>s.normalize('NFC').replace(/\s+/g,' ').trim();
export const detected=(s:string)=>serviceMatches(s,true).filter(m=>m.state.startsWith('DETECTED')).map(m=>m.service);
export interface Block {text:string;kind:'heading'|'body'|'table-heading';region:'body'|'navigation'|'footer';level?:number}
export interface Structure {
  matched:boolean; context:string; nearestHeading:string|null; nearestServiceHeading:string|null;
  followingHeading:string|null; distanceCharacters:number|null; distanceBlocks:number|null;
  proximity:'NEAR'|'DISTANT'|'UNAVAILABLE'; competingHeadings:boolean; boilerplateOnly:boolean;
  contentsLike:boolean; candidateServiceLines:string[]; headingMethod:'HTML_DOM'|'UNAVAILABLE';
}
/** Bounded structural observations; these are not themselves service assignments. */
export function observeBlocks(blocks:Block[],snippet:string):Structure {
  const s=normalize(snippet);let at=s?blocks.findIndex(b=>normalize(b.text).includes(s)):-1;
  // Extraction can retain the end of a heading together with its first paragraph.
  // Locate only this verified adjacent pair, not arbitrary text across sections.
  if(at<0&&s)at=blocks.findIndex((b,i)=>i>0&&b.kind==='body'&&blocks[i-1].kind==='heading'&&b.region===blocks[i-1].region&&normalize(blocks[i-1].text+' '+b.text).includes(s));
  const empty:Structure={matched:false,context:'',nearestHeading:null,nearestServiceHeading:null,followingHeading:null,distanceCharacters:null,distanceBlocks:null,proximity:'UNAVAILABLE',competingHeadings:false,boilerplateOnly:false,contentsLike:false,candidateServiceLines:[],headingMethod:'HTML_DOM'};
  if(at<0)return empty;
  const before=blocks.slice(0,at+1);const headings=before.map((b,i)=>({b,i})).filter(x=>x.b.kind==='heading'&&x.b.region==='body');
  const nearest=headings.at(-1);const serviceHeading=headings.filter(x=>detected(x.b.text).length).at(-1);
  const after=blocks.slice(at+1).find(b=>b.kind==='heading'&&b.region==='body');
  const source=normalize(blocks[at].text),offset=Math.max(0,source.indexOf(s)),start=Math.max(0,offset-300);
  const distance=serviceHeading?blocks.slice(serviceHeading.i+1,at).reduce((n,b)=>n+normalize(b.text).length+1,0)+offset:null;
  const names=serviceHeading?detected(serviceHeading.b.text):[];
  const competing=!!serviceHeading&&((nearest!==serviceHeading&&!!nearest)||names.length>1);
  return {...empty,matched:true,context:source.slice(start,Math.min(source.length,start+1200)),nearestHeading:nearest?.b.text.slice(0,240)??null,nearestServiceHeading:serviceHeading?.b.text.slice(0,240)??null,followingHeading:after?.text.slice(0,240)??null,distanceCharacters:distance,distanceBlocks:serviceHeading?at-serviceHeading.i:null,proximity:distance===null?'UNAVAILABLE':distance<=600&&at-serviceHeading!.i<=3?'NEAR':'DISTANT',competingHeadings:competing,boilerplateOnly:blocks[at].region!=='body',contentsLike:/\bcontents\b/i.test(nearest?.b.text??'')||/\.{3,}\s*\d/.test(source)};
}
export function htmlBlocks(html:string):Block[]{
  const $=load(html);$('script,style,noscript,template').remove();const blocks:Block[]=[];
  $('h1,h2,h3,p,li,th,td').each((_,el)=>{
    const node=$(el);if(node.find('h1,h2,h3,p,li,th,td').length)return;
    const text=normalize(node.text());if(!text)return;
    const region=node.closest('footer,[role="contentinfo"]').length?'footer':node.closest('nav,header,[role="navigation"]').length?'navigation':'body';
    const tag=el.tagName.toLowerCase();blocks.push({text,region,kind:/^h[123]$/.test(tag)?'heading':tag==='th'?'table-heading':'body',...(/^h[123]$/.test(tag)?{level:Number(tag[1])}:{})});
  });return blocks;
}
export function observePdfPage(text:string|undefined,snippet:string):Structure {
  const result=observeBlocks(text?[{text:normalize(text),kind:'body',region:'body'}]:[],snippet);
  return {...result,headingMethod:'UNAVAILABLE',candidateServiceLines:(text??'').split('\n').map(normalize).filter(l=>l.length<=120&&detected(l).length>0).slice(0,8),contentsLike:/\bcontents\b|\.{3,}\s*\d/i.test((text??'').slice(0,1200))};
}
