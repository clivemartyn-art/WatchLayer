import type { AnalysisSource,PdfExtraction } from '../documents/types.js';
import type { PageFacts,Fact,Service } from './types.js';
import { extractLawFacts } from './extract.js';
import { serviceMatches } from './detectors/services.js';

const escape=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function extractAnalysisSource(source:AnalysisSource):PageFacts|undefined{
  // Escaping prevents document text that looks like HTML from becoming DOM facts.
  // Page breaks are never combined: every snippet retains its real PDF page.
  const body=`<title>${escape(source.title)}</title><main>${source.text.split(/\n+/).map(line=>`<p>${escape(line)}</p>`).join('')}</main>`;
  const facts=extractLawFacts({requestedUrl:source.url,finalUrl:source.url,status:200,contentType:'text/html',body,responseTimeMs:0,redirects:[]});
  if(!facts)return;
  facts.sourceType=source.sourceType;
  if(source.sourceType==='PDF'){
    facts.links=[];facts.quote_generator_detected=false;
    const provenance={sourceType:'PDF' as const,url:source.url,title:source.title,pageNumber:source.pageNumber!,documentId:source.documentId!,sha256:source.sha256!,referrers:source.referrers??[]};
    const cite=(fact:Fact):Fact=>({...fact,source:provenance});
    for(const [id,values] of Object.entries(facts.signals))facts.signals[id]=['LAW-U002','LAW-U003','LAW-U010','PRICE-016'].includes(id)?[]:values.map(cite);
    for(const service of facts.services)service.evidence=service.evidence.map(cite);
    facts.serviceSignals={};
  }
  return facts;
}
export function pdfLawFacts(documents:PdfExtraction[],html:PageFacts[]):PageFacts[]{
  const output:PageFacts[]=[];
  for(const doc of documents){
    if(doc.status!=='EXTRACTED'||!doc.finalUrl||!doc.sha256)continue;
    const refs=doc.referrers.filter(ref=>html.some(p=>p.url===ref.url&&!p.excludedContent));
    if(!refs.length)continue;
    const title=doc.title||doc.filename;
    const identity=(title+' '+doc.filename).replace(/[-_]/g,' ');
    const personnel=/\b(?:team|staff|people|profiles?|biograph\w*|fee earners?)\b/i.test(identity);
    const contentServices=serviceMatches(doc.pages.map(p=>p.text).join('\n'),true).filter(s=>s.state.startsWith('DETECTED'));
    const identityServices=serviceMatches(identity,true).filter(s=>s.state.startsWith('DETECTED'));
    // A single document scope may carry onto later pages. Mixed-service documents
    // abstain from pricing; generic referrers cannot distribute costs.
    const explicit=new Set([...contentServices,...identityServices].map(s=>s.service));
    const linkServices=new Set<Service>();
    for(const ref of refs){const p=html.find(p=>p.url===ref.url)!;
      for(const match of serviceMatches(ref.anchor,true).filter(s=>s.state==='DETECTED_HIGH_CONFIDENCE'))linkServices.add(match.service);
      const high=p.services.filter(s=>s.state==='DETECTED_HIGH_CONFIDENCE');
      if(high.length===1&&/fees?|pric|cost|charges/i.test(ref.anchor))linkServices.add(high[0].service);
    }
    const scope=explicit.size===1?[...explicit][0]:undefined;
    const strong=scope&&(contentServices.some(s=>s.service===scope&&s.state==='DETECTED_HIGH_CONFIDENCE')||identityServices.some(s=>s.service===scope&&s.state==='DETECTED_HIGH_CONFIDENCE')||linkServices.size===1&&linkServices.has(scope));
    const pricing=!personnel&&(/fees?|pric|cost|charges/i.test(identity)||refs.some(r=>/fees?|pric|cost|charges/i.test(r.anchor)));
    for(const page of doc.pages){
      const facts=extractAnalysisSource({sourceType:'PDF',url:doc.finalUrl,title,text:page.text,pageNumber:page.pageNumber,documentId:doc.documentId,sha256:doc.sha256,referrers:doc.referrers});
      if(!facts||facts.excludedContent)continue;
      if(scope&&strong){
        const service=facts.services.find(s=>s.service===scope)!;
        if(service.excluded)continue;
        service.state='DETECTED_HIGH_CONFIDENCE';service.evidence=[{method:'pdf-document-service-scope',snippet:identity.slice(0,240),confidence:'HIGH',source:{sourceType:'PDF',url:doc.finalUrl,title,pageNumber:page.pageNumber,documentId:doc.documentId,sha256:doc.sha256,referrers:doc.referrers}}];
        facts.pricingServices=[scope];facts.pricing||=pricing;
        if(personnel){
          facts.pricing=false;
          const linked=refs.some(ref=>{const source=html.find(p=>p.url===ref.url)!;return source.pricing&&source.services.filter(s=>s.state.startsWith('DETECTED')).length===1&&source.services.some(s=>s.service===scope&&s.state.startsWith('DETECTED'))&&source.links.some(l=>l.url===doc.requestedUrl&&l.region==='body'&&/team|staff|people|profile|solicitor|supervis/i.test(l.label));});
          if(linked)facts.staffServices=[scope];
        }
      }else if(explicit.size>1){
        // No structural heading model is inferred from PDF coordinates. Abstain
        // on mixed-service document pricing until section provenance is supported.
        facts.pricingServices=[];
      }
      output.push(facts);
    }
  }
  return output;
}
