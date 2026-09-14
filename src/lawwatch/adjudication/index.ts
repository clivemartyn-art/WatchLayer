import { createHash } from 'node:crypto';
import type { FactSet,PageFacts,Service } from '../types.js';
import type { PdfExtraction } from '../../documents/types.js';
import { evidenceContext,prepareDocumentContext } from './context.js';
import { assessSupport } from './policy.js';
import { ADJUDICATION_STATES,type AdjudicationReport } from './types.js';
/** Raw extraction is immutable. Only this separate view is eligible for rule support. */
export function adjudicatePdfEvidence(raw:FactSet|undefined,documents:PdfExtraction[]):{facts:FactSet|undefined;report:AdjudicationReport}{
  const report:AdjudicationReport={schemaVersion:1,policyVersion:'1.0',mode:'deterministic',items:[],counts:Object.fromEntries(ADJUDICATION_STATES.map(s=>[s,0])) as AdjudicationReport['counts'],statement:'Deterministic evidence assessment, not independent human adjudication or regulatory certification.'};
  if(!raw)return {facts:undefined,report};
  const facts=structuredClone(raw);const seen=new Set<string>();
  const prepared=new Map(documents.filter(d=>d.status==='EXTRACTED').map(d=>[d.documentId,prepareDocumentContext(d)]));
  for(const page of facts.pages){
    if(page.sourceType!=='PDF')continue;
    const filtered:PageFacts['signals']={};
    for(const [ruleId,values] of Object.entries(page.signals))for(const fact of values){
      if(!fact.source)continue;
      const doc=documents.find(d=>d.documentId===fact.source!.documentId);
      const context=evidenceContext(fact,doc,doc?prepared.get(doc.documentId):undefined);
      const services:(Service|undefined)[]=ruleId.startsWith('PRICE')?(page.pricingServices?.length?page.pricingServices:[undefined]):[undefined];
      for(const serviceType of services){
        const assessment=assessSupport(ruleId,fact,page,context,serviceType);
        const id=createHash('sha256').update(JSON.stringify([fact.source.documentId,fact.source.sha256,fact.source.pageNumber,ruleId,serviceType,fact.method,fact.snippet])).digest('hex');
        if(!seen.has(id)){const {source,...extracted}=fact;report.items.push({id,ruleId,...(serviceType?{serviceType}:{}),source,extracted,context,...assessment});report.counts[assessment.state]++;seen.add(id);}
        // Partial evidence remains available for review but cannot promote a result.
        if(assessment.state==='SUPPORTED')(filtered[ruleId]??=[]).push(fact);
      }
    }
    page.signals=filtered;
    // No synthetic section facts bypass this gate; the M7 adapter produces none.
    page.serviceSignals={};
  }
  return {facts,report};
}
