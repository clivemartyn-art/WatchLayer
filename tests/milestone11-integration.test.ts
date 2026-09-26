import {expect,it} from 'vitest';
import {createBrowserRenderer} from '../src/browser/render.js';
import {browserAnalysis} from '../src/browser/analyze.js';
import {fixtureResponse} from './fixtures/milestone2.js';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {lawWatchReport} from '../src/lawwatch/report.js';
import type {FactSet} from '../src/lawwatch/types.js';
import {renderedLawFacts} from '../src/lawwatch/rendered.js';
const url='https://example.com/';
const response=(script:string)=>fixtureResponse(url,'<div id="root"></div><script>'+script+'</script>');
const render=(script:string)=>createBrowserRenderer({fetcher:async u=>fixtureResponse(u,'',404)})(response(script),url,async()=>{});
const inject=(html:string)=>'document.getElementById("root").innerHTML='+JSON.stringify(html)+';';
it.each([
  ['hidden tabs','<h1>Conveyancing</h1><p>Visible service.</p><section hidden><h2>Probate</h2><p>Hidden price £500</p></section>','Hidden price'],
  ['CSS hidden sections','<style>.secret{display:none}</style><p>Visible text.</p><div class="secret">Hidden service £500</div>','Hidden service'],
  ['closed accordions','<details><summary>Probate</summary><p>Unopened price £500</p></details><p>Visible text</p>','Unopened price'],
  ['hidden templates','<template><p>Template price £500</p></template><p>Visible text</p>','Template price'],
  ['cookie overlay','<div id="onetrust-banner-sdk">Marketing consent</div><main><p>Visible page content</p></main>','Marketing consent'],
])('observes only visible public content: %s',async(_name,html,excluded)=>{const result=await render(inject(html));expect(result.status,result.error).toBe('RENDERED');expect(result.representation).not.toContain(excluded);},30000);
it('keeps an already open accordion without clicking anything',async()=>{const r=await render(inject('<details open><summary>Probate</summary><p>Our probate fees are £900.</p></details>'));expect(r.representation).toContain('£900');},30000);
it('captures delayed initial content and its actual headings',async()=>{const r=await render('setTimeout(()=>{'+inject('<main><h2>Probate</h2><p>Our fixed fee is £900.</p></main>')+'},100);');expect(r.representation).toContain('<h2>Probate</h2>');},30000);
it('suppresses duplicate text only within the same heading context',async()=>{const r=await render(inject('<main><h2>Uncontested probate</h2><p>Our fixed fee is £900.</p><p>Our fixed fee is £900.</p><h2>Residential conveyancing</h2><p>Our fixed fee is £900.</p></main>'));expect(r.status,r.error).toBe('RENDERED');expect(r.representation!.match(/Our fixed fee/g)).toHaveLength(2);expect(r.duplicatesSuppressed).toBe(1);},30000);
it('bounds a burst of script requests before they enter the transport queue',async()=>{const r=await render('for(let i=0;i<120;i++)fetch("/data?i="+i).catch(()=>{});');expect(r.status).not.toBe('RENDERED');expect(r.requests).toBeLessThanOrEqual(80);},30000);
it('reports script failures without discarding the static observation',async()=>{const r=await render('throw Error("fixture-script-error");');expect(r.status).toBe('BROWSER_FAILED');expect(r.scriptErrors[0]).toContain('fixture-script-error');expect(r.representation).toBeUndefined();},30000);
it('bounds an infinite script and closes its browser',async()=>{const r=await render('while(true){}');expect(r.status).toBe('BROWSER_TIMED_OUT');expect(r.durationMs).toBeLessThan(25000);},30000);
it('revalidates client-side redirects before any network access',async()=>{const requests:string[]=[];const renderer=createBrowserRenderer({fetcher:async u=>{requests.push(u);return fixtureResponse(u,'',404);}});const r=await renderer(response('location.href="http://169.254.169.254/latest/meta-data/";'),url,async()=>{});expect(r.status).not.toBe('RENDERED');expect(requests).toEqual([]);},30000);
it('records the final public SPA route and visible state without clicking tabs',async()=>{const r=await render('history.replaceState({},"","/services/probate");'+inject('<h1>Uncontested probate</h1><p>Our fixed fee is £900.</p>'));expect(r.status,r.error).toBe('RENDERED');expect(r.finalUrl).toBe(url+'services/probate');},30000);
it('blocks script POSTs without submitting public forms',async()=>{const requests:string[]=[];const renderer=createBrowserRenderer({fetcher:async u=>{requests.push(u);return fixtureResponse(u,'',200);}});const r=await renderer(response(inject('<form action="/enquire"><input name="email"></form><p>Visible public content.</p>')+'fetch("/submit",{method:"POST",body:"data"}).catch(()=>{});'),url,async()=>{});expect(requests).toEqual([]);expect(r.blockedRequests).toBeGreaterThan(0);},30000);
it('caps redirected public navigations',async()=>{const renderer=createBrowserRenderer({fetcher:async u=>fixtureResponse(u,'<script>location.href="/next'+Math.random()+'"</script>')});const r=await renderer(response('location.href="/next";'),url,async()=>{});expect(r.status).not.toBe('RENDERED');expect(r.requests).toBeLessThan(15);},30000);
it('rejects huge DOM evidence rather than treating truncated output as complete',async()=>{const r=await render('document.body.textContent="a".repeat(60000);');expect(r.status).toBe('BROWSER_FAILED');expect(r.error).toContain('limit');},30000);
it('renders dynamic navigation/PDF routes once within the existing crawler and persists source separation',async()=>{
  const html='<main><h1>Residential conveyancing pricing</h1><p>We provide residential conveyancing services for buying your home.</p><p>Our fixed fee is £900.</p><p>Our legal fees exclude VAT at 20%.</p><nav><a href="/complaints">Complaints</a><a href="/people">Our team</a><a href="/fees.pdf">Pricing PDF</a><a href="/fees.pdf">Pricing PDF</a><a href="/search?q=1">Search</a></nav><form action="/enquire"><input name="email"><button>Enquire</button></form></main>';
  const requests:string[]=[];
  const fetcher=async(u:string)=>{requests.push(u);if(u===url)return response(inject(html));if(u.endsWith('/complaints'))return fixtureResponse(u,'<title>Complaints procedure</title><h1>Complaints procedure</h1><p>To make a complaint contact our client care partner. We investigate your complaint and respond.</p>');if(u.endsWith('/people'))return fixtureResponse(u,'<title>Our people</title><p>Our solicitor has 20 years of experience.</p>');return fixtureResponse(u,'',404);};
  const repo=new SqliteRepository(':memory:');try{
    const run=await scanLawWatch(url,repo,{maxPages:5,lawwatchEvidenceBudget:0,lawwatchStaffBudget:0,recheckBudget:0,pdfExtraction:false,browserFallback:true,fetcher,browserRenderer:createBrowserRenderer({fetcher})});
    expect(run.snapshot.browser!.observations.filter(o=>o.status==='RENDERED')).toHaveLength(1);
    expect(run.scan.documents.filter(d=>d.url.endsWith('/fees.pdf'))).toHaveLength(1);expect(requests.some(u=>u.includes('?q='))).toBe(false);
    expect(run.scan.pdf!.documents.find(d=>d.requestedUrl.endsWith('/fees.pdf'))!.referrers.some(r=>r.observationSource==='RENDERED_DOM')).toBe(true);
    expect(run.snapshot.browser!.observations.find(o=>o.status==='RENDERED')!.forms).toHaveLength(1);
    expect(run.scan.pages[0].text).not.toContain('£900');
    const facts=repo.facts<FactSet>(run.snapshot.scanId,'lawwatch-england-wales')!;
    expect(facts.pages.filter(p=>p.url===url)).toHaveLength(2);expect(facts.pages.find(p=>p.observation)?.signals['PRICE-003'][0].observation?.sourceType).toBe('RENDERED_DOM');
    expect(run.lawwatch.results.find(r=>r.ruleId==='PRICE-003'&&r.serviceType==='residential_conveyancing')!.status).toBe('PASS');
    expect(lawWatchReport(run.lawwatch)).toContain('Rendered website content');expect(repo.get(run.snapshot.scanId)!.browser).toEqual(run.snapshot.browser);
  }finally{repo.close();}
},30000);
it('retains mixed-service and firm-wide context safeguards on rendered DOM',async()=>{
  const html='<title>Probate and conveyancing fees</title><main><h2>Uncontested probate fees</h2><p>Our fixed fee for uncontested probate is £900.</p><h2>Complaints procedure</h2><p>Our fixed fee is £500.</p><section hidden><h2>Conveyancing</h2><p>Our fixed fee is £300.</p></section></main>';
  const analysis=browserAnalysis(url,createBrowserRenderer({fetcher:async u=>fixtureResponse(u,'',404)}));const result=await analysis.analyze(response(inject(html)),0,async()=>{});
  expect(result).toBeDefined();const facts=renderedLawFacts(result!.response,result!.observation)!;
  expect(facts.signals['PRICE-003'].some(f=>f.snippet.includes('£300'))).toBe(false);
  expect(Object.values(facts.serviceAttributions??{}).some(a=>a.state==='FIRM_WIDE')).toBe(true);
  expect(facts.serviceSignals?.probate?.['PRICE-003']).toBeDefined();expect(facts.serviceSignals?.residential_conveyancing).toBeUndefined();
},30000);
