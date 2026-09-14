import {it,expect} from 'vitest';
import {adjudicatePdfEvidence} from '../src/lawwatch/adjudication/index.js';
import {extractAnalysisSource} from '../src/lawwatch/pdf.js';
import type {PdfExtraction} from '../src/documents/types.js';
import type {FactSet} from '../src/lawwatch/types.js';
function assess(texts:string[],title='Client complaints and service pricing'){
  const url='https://example.com/guide.pdf',sha256='b'.repeat(64);
  const doc:PdfExtraction={documentId:'guide',requestedUrl:url,finalUrl:url,filename:'guide.pdf',title,sha256,status:'EXTRACTED',parserVersion:'pdfjs-dist@6.3.289',normalizationVersion:1,referrers:[{url:'https://example.com/',anchor:'Service guide'}],pages:texts.map((text,i)=>({pageNumber:i+1,text}))};
  const pages=doc.pages.map(p=>extractAnalysisSource({sourceType:'PDF',url,title,text:p.text,pageNumber:p.pageNumber,documentId:doc.documentId,sha256,referrers:doc.referrers})!);pages.forEach(p=>{p.pricing=true;p.pricingServices=['residential_conveyancing'];});
  const raw:FactSet={schemaVersion:1,detectorVersion:'1.3',scanId:'fixture',pages};return adjudicatePdfEvidence(raw,[doc]);
}
it('withholds family, conveyancing and employment pricing in a mixed brochure',()=>{const a=assess(['Family legal services: our fees are £900 for the work described.','Residential conveyancing: our fees are £1000.','Employment tribunal claims for employees: our fees are £2000.']);expect(a.report.items.filter(i=>i.ruleId==='PRICE-001').every(i=>i.state==='AMBIGUOUS')).toBe(true);});
it('keeps firm-wide complaints information eligible in a mixed-service document',()=>{const a=assess(['Residential conveyancing and uncontested probate services.','Our complaints procedure: if you are unhappy with our service you can contact the Legal Ombudsman to complain by email.']);expect(a.report.items.some(i=>i.ruleId==='LAW-U006'&&i.state==='SUPPORTED')).toBe(true);});
it('keeps an explicitly attributed firm-wide regulatory number eligible',()=>{const a=assess(['Residential conveyancing and uncontested probate services.','Our firm is regulated by the Solicitors Regulation Authority. Our SRA number: 123456.']);expect(a.report.items.some(i=>i.ruleId==='LAW-U001'&&i.state==='SUPPORTED')).toBe(true);});
it('does not assign prices several pages away across mixed-service headings',()=>{const a=assess(['Residential conveyancing services.','Uncontested probate services.','General terms.','Our legal fees are £900. Please contact our firm for estimate details.']);expect(a.report.items.filter(i=>i.ruleId==='PRICE-001').every(i=>i.state==='AMBIGUOUS')).toBe(true);});
it('does not treat repeated service headings as proof that mixed prices belong to one service',()=>{const a=assess(['Residential conveyancing and employment services: our fees are £900.','Residential conveyancing and employment services: our fees are £1200.']);expect(a.report.items.filter(i=>i.ruleId==='PRICE-001').every(i=>i.state==='AMBIGUOUS')).toBe(true);});
it('does not lend an appendix table to the wrong service',()=>{const a=assess(['Residential conveyancing services.','Appendix: uncontested probate costs. Our fees are £900.']);expect(a.report.items.filter(i=>i.ruleId==='PRICE-001').every(i=>i.state==='AMBIGUOUS')).toBe(true);});
it('contents headings alone never supply pricing evidence',()=>{const a=assess(['Contents: residential conveyancing page 2; employment page 5; uncontested probate page 8.']);expect(a.facts!.pages.flatMap(p=>p.signals['PRICE-001']??[])).toEqual([]);});
