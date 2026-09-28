import {replayContext} from '../scripts/milestone13-replay-context.js';
import {evaluateLawWatch} from '../src/lawwatch/evaluate.js';
import {it,expect} from 'vitest';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {lawWebsite,LAW_SITE,strongPricing} from './fixtures/lawwatch.js';
import {fixtureResponse} from './fixtures/milestone2.js';
import type {BrowserRenderer} from '../src/browser/types.js';
import {browserAnalysis} from '../src/browser/analyze.js';
import {renderedLawFacts} from '../src/lawwatch/rendered.js';
import {extractLawFacts} from '../src/lawwatch/extract.js';
import {classifyServices} from '../src/lawwatch/inventory.js';
import {attributeEvidence,attributionAllowsService} from '../src/lawwatch/context/attribution.js';
const url='https://example.com/';
const renderer=(representation:string):BrowserRenderer=>async r=>({status:'RENDERED',durationMs:1,finalUrl:r.finalUrl,representation,scriptErrors:[],requests:1,bytes:0,blockedRequests:0});
async function facts(html:string){const analysis=browserAnalysis(url,renderer(html));const r=await analysis.analyze(fixtureResponse(url,'<div id="root"></div><script src="/app.js"></script>'),0,async()=>{});return r?renderedLawFacts(r.response,r.observation):undefined;}
it('keeps navigation-only rendered service absence UNKNOWN',async()=>{const page=(await facts('<title>Team</title><nav><a href="/probate">Probate</a><a href="/conveyancing">Conveyancing</a></nav><h1>Our team</h1>'))!;expect(classifyServices({schemaVersion:1,detectorVersion:'1.5',scanId:'test',pages:[page]}).every(s=>s.state==='UNKNOWN')).toBe(true);});
it('retains a positive observed service while leaving unobserved services UNKNOWN',async()=>{const page=(await facts('<title>Residential conveyancing</title>'+strongPricing))!;const c=classifyServices({schemaVersion:1,detectorVersion:'1.5',scanId:'test',pages:[page]});expect(c.find(s=>s.service==='residential_conveyancing')?.state).toBe('DETECTED_HIGH_CONFIDENCE');expect(c.find(s=>s.service==='immigration')?.state).toBe('UNKNOWN');});
it('preserves stronger static facts alongside partial rendered content',async()=>{const staticPage=extractLawFacts(fixtureResponse(url,'<title>Residential conveyancing</title>'+strongPricing))!,partial=(await facts('<title>Team</title><nav><a href="/probate">Probate</a></nav>'))!;const c=classifyServices({schemaVersion:1,detectorVersion:'1.5',scanId:'test',pages:[staticPage,partial]});expect(c.find(s=>s.service==='residential_conveyancing')?.state).toBe('DETECTED_HIGH_CONFIDENCE');expect(c.find(s=>s.service==='immigration')?.state).toBe('NOT_DETECTED');});
it('retains discovered PDF provenance without inferring its contents',async()=>{const page=(await facts('<title>Documents</title><main><a href="/fees.pdf">Conveyancing pricing PDF</a></main>'))!;expect(page.observation?.sourceType).toBe('RENDERED_DOM');expect(page.links.some(l=>l.document&&l.url===url+'fees.pdf')).toBe(true);expect(page.signals['PRICE-001']??[]).toHaveLength(0);});
it('does not infer a vanished SRA number from useful partial rendered output',async()=>{const repo=new SqliteRepository(':memory:'),base=lawWebsite();const fetcher=async(u:string,o?:Parameters<typeof base>[1])=>u.endsWith('/pricing')?fixtureResponse(u,'<title>Residential conveyancing</title><div id="root"></div><script src="/app.js"></script>'):base(u,o);try{await scanLawWatch(LAW_SITE,repo,{fetcher,browserFallback:true,browserRenderer:renderer('<title>Regulatory information</title><p>Our firm is regulated by the SRA number 876543.</p>')});const run=await scanLawWatch(LAW_SITE,repo,{fetcher,browserFallback:true,browserRenderer:renderer('<title>Regulatory information</title><main><h1>Our firm</h1><p>Public contact information is available from our team.</p></main><nav><a href="/contact">Contact</a></nav>')});expect(run.lawwatch.results.find(r=>r.ruleId==='LAW-C003'&&r.resource.endsWith('/pricing'))?.status).toBe('UNKNOWN');expect(run.lawwatch.results.some(r=>r.ruleId.startsWith('LAW-C')&&r.status==='POTENTIAL_ISSUE')).toBe(false);}finally{repo.close();}});
it('keeps mixed-service rendered facts out of an unrelated service',async()=>{const page=(await facts('<title>Mixed pricing</title><main><h2>Probate</h2><p>Our probate legal fees are £1500 plus VAT.</p><h2>Residential conveyancing</h2><p>Our residential conveyancing fees are £900 plus VAT.</p></main>'))!;const ds=Object.values(page.serviceAttributions??{});expect(ds.some(d=>d.services.includes('probate'))).toBe(true);expect(ds.filter(d=>d.services.includes('probate')).every(d=>!attributionAllowsService(d,'employment_employer'))).toBe(true);});
it('retains firm-wide complaints context inside a service URL',()=>{const d=attributeEvidence({ruleId:'PRICE-001',url:url+'conveyancing',title:'Complaints policy',snippet:'Our complaints procedure applies to clients.',context:'How to make a formal complaint.',sourceType:'HTML'});expect(d.state).toBe('FIRM_WIDE');expect(attributionAllowsService(d,'residential_conveyancing')).toBe(false);});

it('replays the same historical context without fabricating monitoring deltas',async()=>{
  const repo=new SqliteRepository(':memory:');try{
    const options={fetcher:lawWebsite(),recheckBudget:0};
    const before=await scanLawWatch(LAW_SITE,repo,options),after=await scanLawWatch(LAW_SITE,repo,options);
    const context=replayContext(after.snapshot,repo);
    expect(context.previous?.scanId).toBe(before.snapshot.scanId);
    const replay=evaluateLawWatch(context);
    expect(replay.changes.map(r=>[r.ruleId,r.status])).toEqual(after.lawwatch.changes.map(r=>[r.ruleId,r.status]));
    expect(repo.packReport(after.snapshot.scanId,'lawwatch-england-wales')).toEqual(after.lawwatch);
  }finally{repo.close();}
});
