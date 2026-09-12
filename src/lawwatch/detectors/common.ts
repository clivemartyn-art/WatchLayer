import type { Fact } from '../types.js';
export const SNIPPET_LIMIT=240;
export const FACT_LIMIT=3;
export function fact(method:string,text:string,confidence:Fact['confidence']='HIGH',value?:string):Fact {return {method,snippet:text.replace(/\s+/g,' ').trim().slice(0,SNIPPET_LIMIT),confidence,...(value?{value}:{})};}
export function matches(segments:string[],method:string,patterns:RegExp[],partial?:RegExp):Fact[] {
  const strong=segments.filter(s=>patterns.every(p=>p.test(s))&&!/\b(?:do not|don't|does not|cannot|unable to) (?:provide|offer|confirm|publish|state)\b|\bnot (?:qualified|supervised)|\bunqualified\b/i.test(s)).slice(0,FACT_LIMIT).map(s=>{
    const found=patterns.map(p=>p.exec(s)!);const start=Math.min(...found.map(m=>m.index));const end=Math.max(...found.map(m=>m.index+m[0].length));
    return fact(method,s.slice(Math.max(0,start-20)),end-start<=SNIPPET_LIMIT-20?'HIGH':'MEDIUM',found.map(m=>m[0].slice(0,100)).join(' | '));
  });
  return strong.length?strong:partial?segments.filter(s=>partial.test(s)).slice(0,1).map(s=>fact(method,s,'MEDIUM')):[];
}
