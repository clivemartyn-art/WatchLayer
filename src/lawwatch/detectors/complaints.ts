import { fact } from './common.js';
import type { Fact } from '../types.js';

/** A procedure is a client-service process, not simply a mention of complaints. */
export function complaintsProcedure(identity:string, segments:string[], excluded:boolean):Fact[] {
  if(excluded||/privacy|data.protection|data breach|\bICO\b|grievance|testimonials?|reviews?/i.test(identity))return [];
  const relevant=segments.filter(s=>!/\bICO\b|personal data|data.protection|privacy|employment grievance/i.test(s));
  const text=relevant.join('\n');
  if(/no complaints? (?:procedure|policy)|do not (?:have|publish).{0,20}complaint/i.test(text))return [];
  const procedure=/complaint|client.care|feedback/i.test(identity);
  const contact=relevant.find(s=>/complain|unhappy|dissatisfied/i.test(s)&&/contact|write|email|partner|manager/i.test(s));
  const process=relevant.find(s=>/investigat|acknowledg|respond|resolve|review your complaint/i.test(s)&&/complaint|\bwe\b|\bour\b/i.test(s));
  const client=relevant.find(s=>/our (?:service|client)|client complaints?|Legal Ombudsman/i.test(s));
  if((procedure||client)&&contact&&process)return [fact('client-complaints-process',contact+' '+process)];
  return [];
}

export function complaintsDocument(label:string,context:string):boolean {
  return /complaint/i.test(label+' '+context)&&!/privacy|data.protection|data breach|\bICO\b|grievance|news|blog/i.test(label+' '+context);
}
