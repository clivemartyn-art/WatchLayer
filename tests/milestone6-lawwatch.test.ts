import { expect,it } from 'vitest';
import { extractLawFacts } from '../src/lawwatch/extract.js';
import { pricingSignals } from '../src/lawwatch/detectors/pricing.js';
import { fixtureResponse } from './fixtures/milestone2.js';
import { falseComplaints,negativeCases,runNegativeCase } from './fixtures/milestone6.js';
import { complaintsHtml,lawWebsite } from './fixtures/lawwatch.js';
import { CUSTOMER_STATUS_LABELS } from '../src/lawwatch/status-labels.js';
import { evaluateLawWatch } from '../src/lawwatch/evaluate.js';
import type { FactSet } from '../src/lawwatch/types.js';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanLawWatch } from '../src/lawwatch/service.js';
import { discoveryWebsite } from './fixtures/milestone5.js';
import { staffLink } from '../src/lawwatch/discovery.js';
const facts=(path:string,html:string)=>extractLawFacts(fixtureResponse('https://example.com/'+path,html))!;
it.each(falseComplaints)('rejects misleading complaints surface %s',(path,title,body)=>{expect(facts(path,`<h1>${title}</h1><p>${body}</p>`).signals['LAW-U004']??[]).toEqual([]);});
it('keeps a real client procedure supported',()=>expect(facts('client-care',complaintsHtml).signals['LAW-U004'][0].method).toBe('client-complaints-process'));
it.each(negativeCases)('$id respects serious-finding policy',async c=>{const report=await runNegativeCase(c);const rows=report.results.filter(r=>r.ruleId===c.ruleId);expect(rows.some(r=>r.status==='POTENTIAL_ISSUE')).toBe(c.expectedIssue);for(const row of rows.filter(r=>r.status==='POTENTIAL_ISSUE'))expect(row.confidence).toBe('HIGH');});
it.each([
  ['Our fee covers preparing the application and advising you.','PRICE-011'],
  ['What is included: drafting contracts and registering ownership.','PRICE-011'],
  ['Additional work: a disputed hearing is charged separately.','PRICE-012'],
  ['Outside our price: tax advice and litigation.','PRICE-012'],
  ['The process usually takes 6 to 9 weeks.','PRICE-014'],
])('recognises contextual paraphrase %s',(text,id)=>expect(pricingSignals([text])[id].some(f=>f.confidence==='HIGH')).toBe(true));
it('combines a timescale heading with its immediately following explanation',()=>expect(facts('fees','<h1>Residential conveyancing fees</h1><h2>Typical timescale</h2><p>8 to 12 weeks from instructions.</p>').signals['PRICE-014'].some(f=>f.confidence==='HIGH')).toBe(true));
it('does not infer supervision from partner seniority',()=>expect(pricingSignals(['Our managing partner is a qualified solicitor with 25 years of experience.'])['PRICE-005'].some(f=>f.confidence==='HIGH')).toBe(false));
it('does not infer explicit absence from missing VAT text',()=>expect(pricingSignals(['Our fixed fee is £900.'])['PRICE-008']).toEqual([]));
it('does not turn an express exclusion into an inclusion',()=>expect(pricingSignals(['Our fee does not include preparing an appeal.'])['PRICE-011'].some(f=>f.confidence==='HIGH')).toBe(false));
it.each([
  ['residential_conveyancing','Residential conveyancing','We offer residential conveyancing.'],
  ['probate','Uncontested probate','We offer uncontested probate.'],
  ['employment_employee','Employee unfair dismissal','We act for employees on unfair dismissal claims at the Employment Tribunal.'],
  ['immigration','Immigration applications','We prepare visa applications.'],
  ['motoring','Summary motoring offences','We handle summary-only road traffic offences at Magistrates Court in a single hearing.'],
  ['debt_recovery','Debt recovery','We offer debt recovery up to £100,000.'],
  ['business_licensing','Premises licensing','We handle premises licensing applications.'],
] as const)('keeps %s pricing separate from another service',async(service,heading,offering)=>{
  const other=service==='probate'?'Residential conveyancing':'Uncontested probate';
  const html=`<h1>Our pricing</h1><section><h2>${heading}</h2><p>${offering} Our fixed fee is £950.</p></section><section><h2>${other}</h2><p>We offer ${other}. Our fixed fee is £2000. Our legal fees exclude VAT at 20%.</p></section>`;
  const repo=new SqliteRepository(':memory:');try{const {lawwatch}=await scanLawWatch('https://example.com/',repo,{maxPages:1,lawwatchEvidenceBudget:4,lawwatchStaffBudget:0,fetcher:discoveryWebsite([],{'/our-charges':html})});expect(lawwatch.results.find(r=>r.ruleId==='PRICE-008'&&r.serviceType===service)?.status).not.toBe('PASS');}finally{repo.close();}
});
it.each([
  ['<iframe data-src="//www.yoshki.com/57845r.html"></iframe>','HIGH'],
  ['<script src="https://www.yoshki.com/57845r.js"></script>','HIGH'],
  ['<img alt="SRA logo" src="/logo.png">','MEDIUM'],
  ['<div data-sra-badge></div>','MEDIUM'],
] as const)('classifies badge markup without claiming operation: %s',(html,confidence)=>expect(facts('',html).signals['LAW-U002'][0]?.confidence).toBe(confidence));
it('does not invent a badge when none exists',()=>expect(facts('','<h1>Solicitors</h1>').signals['LAW-U002']).toEqual([]));
it('does not classify first-time buyer marketing as process stages',()=>expect(pricingSignals(['For a first-time buyer, the process can seem stressful.'])['PRICE-013'].some(f=>f.confidence==='HIGH')).toBe(false));
it('does not borrow fee VAT for disbursements',()=>expect(pricingSignals(['Our hourly rate is £250 plus VAT plus any disbursements.'])['PRICE-010'].some(f=>f.confidence==='HIGH')).toBe(false));
it('rejects a service page near a generic team mention as a staff profile',()=>expect(staffLink({url:'https://example.com/commercial-property',label:'Commercial property',region:'body',document:false,nearbyContext:'Contact our specialist team for advice.'})).toBe(false));
it('retains both office numbers and their local office labels',()=>{const p=facts('offices','<p>North office: SRA number 123456.</p><p>South office: SRA number 654321.</p>');expect(p.signals['LAW-U001'].map(f=>f.value)).toEqual(['123456','654321']);expect(p.signals['LAW-U001'].every(f=>/office/i.test(f.snippet))).toBe(true);});
it('does not treat a driving disqualification as a staff qualification',()=>expect(pricingSignals(['Our solicitors advise drivers facing disqualification.'])['PRICE-004'].some(f=>f.confidence==='HIGH')).toBe(false));
it('excludes stylesheet noise from link evidence',()=>{const p=facts('fees','<h1>Probate fees</h1><section><style>.grid { color: red }</style><a href="/people/jo">Our solicitor Jo</a></section>');expect(p.links[0].nearbyContext).not.toContain('color');});
it('does not permit a residential link to repurpose commercial pricing',async()=>{
  const repo=new SqliteRepository(':memory:');try{const {lawwatch}=await scanLawWatch('https://example.com/',repo,{maxPages:1,lawwatchEvidenceBudget:4,lawwatchStaffBudget:0,fetcher:discoveryWebsite([],{'/our-charges':'<h1>Residential conveyancing fees</h1><p>We offer residential conveyancing.</p><a href="/details/a">Residential conveyancing fees</a>','/details/a':'<h1>Commercial property fees</h1><p>Our fixed fee is £950. We also offer residential conveyancing.</p>'})});expect(lawwatch.results.find(r=>r.ruleId==='PRICE-001'&&r.serviceType==='residential_conveyancing')?.status).not.toBe('PASS');}finally{repo.close();}
});
it('keeps document-only pricing contents unknown with the document reason',async()=>{const repo=new SqliteRepository(':memory:');try{const {lawwatch}=await scanLawWatch('https://example.com/',repo,{fetcher:lawWebsite('pdf')});const r=lawwatch.results.find(r=>r.ruleId==='PRICE-011'&&r.serviceType==='residential_conveyancing')!;expect(r.status).toBe('UNKNOWN');expect(r.unknownReasonCodes).toContain('DOCUMENT_CONTENT_UNAVAILABLE');expect(lawwatch.inventory.some(s=>s.type==='document'&&s.signal==='pricing')).toBe(true);}finally{repo.close();}});
it('does not invent operation for a statically embedded resource returning an error',async()=>{const repo=new SqliteRepository(':memory:');const base=lawWebsite();try{const {lawwatch}=await scanLawWatch('https://example.com/',repo,{fetcher:async(u,o)=>{if(u.includes('yoshki.com'))return fixtureResponse(u,'Not found',404);const r=await base(u,o);if(u==='https://example.com/')r.body+='<iframe src="https://www.yoshki.com/sra/badge"></iframe>';return r;}});expect(lawwatch.results.find(r=>r.ruleId==='LAW-U002')?.status).toBe('PASS');expect(lawwatch.results.find(r=>r.ruleId==='LAW-U003')?.status).toBe('UNKNOWN');}finally{repo.close();}});
it('does not emit a pricing-content issue for a first scan with a broken linked page',async()=>{const repo=new SqliteRepository(':memory:');const base=lawWebsite();try{const {lawwatch}=await scanLawWatch('https://example.com/',repo,{fetcher:async(u,o)=>u.endsWith('/pricing')?fixtureResponse(u,'Gone',410):base(u,o)});expect(lawwatch.results.some(r=>r.status==='POTENTIAL_ISSUE')).toBe(false);}finally{repo.close();}});
it('excludes a case-study review year from current pricing drift',()=>{const p=facts('case-studies/property','<h1>Residential conveyancing fees</h1><p>Our fees were reviewed in 2018 for this completed case.</p>');expect(p.signals['LAW-I001']??[]).toEqual([]);});
it('keeps customer status wording distinct from internal enums',()=>{expect(CUSTOMER_STATUS_LABELS.UNKNOWN).toBe('Could not confirm');expect(CUSTOMER_STATUS_LABELS.PASS).toBe('Detected / Confirmed');expect(CUSTOMER_STATUS_LABELS.POTENTIAL_ISSUE).toBe('Potential issue / Action recommended');});
it('requires fresh detector facts without mutating saved rule history',async()=>{const repo=new SqliteRepository(':memory:');try{const {snapshot,lawwatch}=await scanLawWatch('https://example.com/',repo,{fetcher:lawWebsite()});const old=repo.facts<FactSet>(snapshot.scanId,'lawwatch-england-wales')!;old.detectorVersion='1.1';const reevaluated=evaluateLawWatch({current:snapshot,facts:old});expect(reevaluated.results.find(r=>r.ruleId==='LAW-U001')?.status).toBe('UNKNOWN');expect(repo.packReport(snapshot.scanId,'lawwatch-england-wales')).toEqual(JSON.parse(JSON.stringify(lawwatch)));}finally{repo.close();}});
