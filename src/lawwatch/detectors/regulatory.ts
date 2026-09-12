import type { CheerioAPI } from 'cheerio';
import type { Fact } from '../types.js';
import { fact,matches,FACT_LIMIT } from './common.js';
export function regulatorySignals($:CheerioAPI,text:string,segments:string[],relevant:boolean):Record<string,Fact[]> {
  const numbers:Fact[]=[];
  const pattern=/\b(?:SRA|Solicitors Regulation Authority)\s*(?:(?:under|authorisation|registration|registered|identification|ID|number|no\.?|reference|is)\s*){0,4}[:#-]?\s*(\d{5,8})\b/gi;
  for(const m of text.matchAll(pattern))if(!numbers.some(f=>f.value===m[1]))numbers.push(fact('labelled-sra-number',text.slice(Math.max(0,m.index!-55),m.index!+m[0].length+55),'HIGH',m[1]));
  for(const m of text.matchAll(/\bSRA\s+numbers?\s*:\s*((?:\d{5,8}(?:\s*(?:,|and|&)\s*)?){1,10})/gi))for(const n of m[1].matchAll(/\d{5,8}/g))if(!numbers.some(f=>f.value===n[0]))numbers.push(fact('labelled-sra-number-list',m[0],'HIGH',n[0]));
  for(const m of text.matchAll(/\bSRA\s*\(\s*(\d{4,8})\s*\)/gi))if(!numbers.some(f=>f.value===m[1]))numbers.push(fact('possible-sra-number',m[0],'MEDIUM',m[1]));
  const badges:Fact[]=[];
  $('iframe[src],script[src],a[href],img').each((_,el)=>{
    const node=$(el);const raw=node.attr('src')??node.attr('href')??'';let host='';try{host=new URL(raw,'https://invalid.example').hostname;}catch{}
    const recognized=(host==='yoshki.com'||host.endsWith('.yoshki.com'))&&/sra|57845/i.test(raw+' '+node.attr('title'));
    const label=[node.attr('alt'),node.attr('title'),node.attr('id'),raw].join(' ');
    if(recognized||/sra.{0,20}(?:badge|logo)|(?:badge|logo).{0,20}sra/i.test(label))badges.push(fact('static-badge-integration',label,recognized?'HIGH':'MEDIUM',raw));
  });
  $('script:not([src])').each((_,el)=>{
    for(const m of $(el).text().matchAll(/https?:\/\/[^\s"'<>\\]+/g)){
      try{const u=new URL(m[0]);if((u.hostname==='yoshki.com'||u.hostname.endsWith('.yoshki.com'))&&/sra|57845/i.test(u.pathname))badges.push(fact('inline-script-badge-url',u.href,'HIGH',u.href));}catch{}
    }
  });
  const ombudsman=/Legal Ombudsman/i;const sra=/\bSRA\b|Solicitors Regulation Authority/i;
  return {
    'LAW-U001':numbers.slice(0,20),'LAW-U002':badges.slice(0,FACT_LIMIT),
    'LAW-U005':relevant?matches(segments,'complaints-reference',[ombudsman]):[],
    'LAW-U006':relevant?matches(segments,'ombudsman-contact',[ombudsman,/complain|refer|contact/i,/telephone|call|email|0300\s*555\s*0333|legalombudsman\.org\.uk|write to/i],ombudsman):[],
    'LAW-U007':relevant?matches(segments,'ombudsman-timing',[ombudsman,/eight weeks|8 weeks|six months|6 months|one year|1 year/i,/after|within|response|resolve|refer|complain/i],ombudsman):[],
    'LAW-U008':relevant?matches(segments,'sra-conduct-route',[sra,/report|raise|contact/i,/conduct|behaviour|dishonest|concern/i],sra):[],
    'LAW-U009':relevant?matches(segments,'sra-escalation',[sra,/report|raise|contact/i,/dishonest|discriminat|conduct|behaviour/i,/sra\.org\.uk|when|if you|concerns about/i],sra):[],
  };
}
