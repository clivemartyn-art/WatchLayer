import type { PdfExtraction } from '../../documents/types.js';
import type { Fact } from '../types.js';
import { serviceMatches } from '../detectors/services.js';
import type { EvidenceContext } from './types.js';
export const CONTEXT_LIMIT=1200;
export const normalizeContext=(text:string)=>text.normalize('NFC').replace(/\s+/g,' ').trim();
export function prepareDocumentContext(doc:PdfExtraction){return {pages:new Map(doc.pages.map(p=>[p.pageNumber,normalizeContext(p.text)])),documentServices:serviceMatches([doc.title??'',doc.filename,...doc.pages.map(p=>p.text)].join('\n'),true).filter(s=>s.state.startsWith('DETECTED')).map(s=>s.service)};}
export function evidenceContext(fact:Fact,doc:PdfExtraction|undefined,prepared?:ReturnType<typeof prepareDocumentContext>):EvidenceContext {
  const empty:EvidenceContext={text:'',start:0,end:0,matched:false,locationMethod:'unavailable',repeatedOnPages:0,documentServices:[]};
  if(!doc||doc.status!=='EXTRACTED'||!fact.source||doc.sha256!==fact.source.sha256||doc.finalUrl!==fact.source.url)return empty;
  const document=prepared??prepareDocumentContext(doc);const text=document.pages.get(fact.source.pageNumber);if(text===undefined)return empty;
  const snippet=normalizeContext(fact.snippet);let at=snippet?text.indexOf(snippet):-1,span=snippet.length;
  let locationMethod:EvidenceContext['locationMethod']='exact-snippet';
  // The existing procedure detector concatenates its contact/process sentences.
  // Verify every clause on this page; never search another page or infer omitted text.
  if(at<0&&fact.method==='client-complaints-process'){
    const clauses=[...new Set(snippet.split(/(?<=[.!?])\s+/).filter(Boolean))];
    const starts=clauses.map(s=>text.indexOf(s));
    if(clauses.length&&clauses.every(s=>s.length>=15)&&starts.every(i=>i>=0)){at=Math.min(...starts);span=Math.max(...starts.map((n,i)=>n+clauses[i].length))-at;locationMethod='verified-clauses';}
  }
  if(at<0||span>CONTEXT_LIMIT)return empty;
  const margin=Math.min(350,Math.floor((CONTEXT_LIMIT-span)/2));const start=Math.max(0,at-margin),end=Math.min(text.length,at+span+margin);
  return {text:text.slice(start,end),start,end,matched:true,locationMethod,
    repeatedOnPages:[...document.pages.values()].filter(text=>text.includes(snippet)).length,
    documentServices:document.documentServices};
}
