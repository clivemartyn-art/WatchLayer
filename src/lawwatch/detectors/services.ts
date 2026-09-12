import { SERVICE_IDS,type Service,type ServiceMatch } from '../types.js';
import { fact } from './common.js';
const patterns:Record<Service,{broad:RegExp; strong:RegExp}>={
  residential_conveyancing:{broad:/conveyancing|residential property/i,strong:/residential conveyancing|(?:sale|purchase|buying|selling) (?:of )?(?:a |your )?(?:home|house|residential property)/i},
  remortgage:{broad:/mortgage/i,strong:/re-?mortgage|residential mortgage/i},
  probate:{broad:/probate|estate administration/i,strong:/uncontested probate|(?:UK|uncontested) estate administration|probate and estate administration/i},
  immigration:{broad:/immigration|visa application/i,strong:/visa applications?|immigration applications? (?:excluding|other than) asylum/i},
  immigration_appeals:{broad:/immigration.*appeal|visa.*appeal/i,strong:/(?:visa|immigration) appeals?.*(?:first-tier|excluding asylum)|first-tier tribunal.*(?:visa|immigration) appeals?/i},
  motoring:{broad:/motoring|road traffic|driving offen/i,strong:/summary.only.*(?:motoring|road traffic)|(?:motoring|road traffic).*(?:summary.only|single hearing)/i},
  employment_employee:{broad:/employment|dismissal/i,strong:/(?:employees?|individuals?).*(?:unfair|wrongful) dismissal.*tribunal|employment tribunal.*(?:unfair|wrongful) dismissal.*employees?/i},
  employment_employer:{broad:/employment|dismissal/i,strong:/employers?.*defen.*(?:unfair|wrongful) dismissal|defen.*(?:unfair|wrongful) dismissal.*employers?/i},
  debt_recovery:{broad:/debt recovery|debt collection/i,strong:/debt (?:recovery|collection).*(?:up to|under|below|not exceeding)\s*£?100,?000/i},
  business_licensing:{broad:/licensing|premises licen/i,strong:/(?:business |commercial )?premises licen[cs](?:e|ing).*applications?|applications?.*premises licen[cs]/i},
};
export function serviceMatches(text:string,offering:boolean):ServiceMatch[] {
  return SERVICE_IDS.map(service=>{
    const p=patterns[service];
    const fragments=text.split(/(?<=[.!?])\s+|\n/).filter(Boolean);
    const excluded=fragments.some(s=>/\b(?:do not|don't|no longer|not) (?:offer|provide|undertake|handle)\b/i.test(s)&&p.broad.test(s));
    const strong=fragments.find(s=>p.strong.test(s)&&!/(?:asylum only|contested probate only)/i.test(s)&&
      (service!=='motoring'||/single hearing/i.test(s)&&/magistrates/i.test(s))&&
      (service!=='employment_employer'||/tribunal/i.test(s)));
    const broad=fragments.find(s=>p.broad.test(s));
    const state=excluded?'NOT_DETECTED':strong&&offering?'DETECTED_HIGH_CONFIDENCE':broad?'DETECTED_LOW_CONFIDENCE':'NOT_DETECTED';
    const source=strong??broad;const at=source?(strong?p.strong:p.broad).exec(source)?.index??0:0;
    return {service,state,excluded,evidence:source?[fact('service-wording',source.slice(Math.max(0,at-30)),state==='DETECTED_HIGH_CONFIDENCE'?'HIGH':'MEDIUM')]:[]};
  });
}
