import {it,expect} from 'vitest';
import {omittedResource,diagnosticUrl} from '../src/browser/resources.js';
import {createBrowserRenderer} from '../src/browser/render.js';
import {browserEligibility} from '../src/browser/eligibility.js';
import {BROWSER_LIMITS} from '../src/browser/types.js';
import {fixtureResponse} from './fixtures/milestone2.js';
import {browserAnalysis} from '../src/browser/analyze.js';
const url='https://example.com/';
it.each(['<title>Firm</title><div></div>','<title>Services</title>   '])('does not forward empty visible output as reliable evidence: %s',async representation=>{
  const analysis=browserAnalysis(url,async()=>({status:'RENDERED',representation,finalUrl:url,durationMs:1,requests:1,bytes:0,blockedRequests:0,scriptErrors:[]}));
  const result=await analysis.analyze(fixtureResponse(url,'<div id="root"></div><script src="/app.js"></script>'),0,async()=>{});
  expect(result).toBeUndefined();expect(analysis.report.observations[0]).toMatchObject({status:'BROWSER_FAILED',error:'EMPTY_VISIBLE_DOM',staticEvidenceAvailable:true,comparison:{outcome:'FAILED'}});expect(analysis.report.observations[0].domHash).toBeUndefined();
});
it.each(['<p>Public legal service information</p>','<a href="/services">Services</a>'])('retains useful visible text or navigation without requiring both: %s',async representation=>{
  const analysis=browserAnalysis(url,async()=>({status:'RENDERED',representation,finalUrl:url,durationMs:1,requests:1,bytes:0,blockedRequests:0,scriptErrors:[]}));
  expect(await analysis.analyze(fixtureResponse(url,'<div id="root"></div><script src="/app.js"></script>'),0,async()=>{})).toBeDefined();expect(analysis.report.observations[0].status).toBe('RENDERED');
});
it.each(['/css','/css2'])('omits a font-only stylesheet without granting third-party access: %s',path=>{expect(omittedResource('https://fonts.googleapis.com'+path+'?family=Inter','stylesheet')).toBe('FONT_STYLESHEET_OMITTED');});
it.each(['https://fonts.googleapis.com.evil.org/css2','https://fonts.googleapis.com/application.css','http://fonts.googleapis.com/css2','https://fonts.googleapis.com:8443/css2','https://user:secret@fonts.googleapis.com/css2'])('does not classify an unrelated or unsafe stylesheet as font-only: %s',u=>{expect(omittedResource(u,'stylesheet')).toBeUndefined();});
it('does not omit a script by matching the font endpoint',()=>{expect(omittedResource('https://fonts.googleapis.com/css2','script')).toBeUndefined();});
it('removes credentials, query values and fragments from dependency diagnostics',()=>{expect(diagnosticUrl('https://user:secret@example.com/data?token=private#fragment')).toBe('https://example.com/data?[redacted]');expect(diagnosticUrl('not a URL')).toBe('INVALID_URL');});
it('keeps observed app-shell eligibility and does not bypass deep-route HTTP errors',()=>{const shell='<div id="root"></div><script src="/static/js/main.js"></script>';expect(browserEligibility(fixtureResponse(url,shell)).reason).toBe('APP_SHELL_DETECTED');expect(browserEligibility(fixtureResponse(url,shell,404)).eligible).toBe(false);});
it('keeps ordinary public pages static despite external fonts and scripts',()=>{expect(browserEligibility(fixtureResponse(url,'<main>'+('Public service description. '.repeat(100))+'</main><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><script src="/main.js"></script>')).eligible).toBe(false);});
it('recovers content while deliberately omitting third-party images/fonts, and preserves hidden CSS',async()=>{
  const requested:string[]=[];
  const html='<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter"><style>.hidden{display:none}</style><div id="root"></div><script>document.getElementById("root").innerHTML=\'<h1>Public probate service</h1><p>Our fixed fee is £900.</p><p class="hidden">Wrong service £100</p><img src="https://outside.org/banner.png"><a href="/fees.pdf">Fees PDF</a>\';</script>';
  const renderer=createBrowserRenderer({fetcher:async u=>{requested.push(u);return fixtureResponse(u,'',404);}});
  const r=await renderer(fixtureResponse(url,html),url,async()=>{});
  expect(r.status,r.error).toBe('RENDERED');expect(requested).toEqual([]);expect(r.representation).toContain('£900');expect(r.representation).not.toContain('Wrong service');expect(r.representation).toContain(url+'fees.pdf');expect(r.resourceEvents?.filter(e=>e.action==='OMITTED')).toHaveLength(2);
},30000);
it.each(['script','stylesheet'])('keeps an essential off-site %s failure conservative with exact resource diagnostics',async kind=>{
  const resource='https://outside.org/essential?token=not-retained';const html=kind==='script'?'<script src="'+resource+'"></script>':'<link rel="stylesheet" href="'+resource+'">';const calls:string[]=[];
  const r=await createBrowserRenderer({fetcher:async u=>{calls.push(u);return fixtureResponse(u,'',200);}})(fixtureResponse(url,html+'<p>Partial content must not establish support.</p>'),url,async()=>{});
  expect(r.status).toBe('BROWSER_FAILED');expect(r.representation).toBeUndefined();expect(calls).toEqual([]);expect(r.resourceEvents?.some(e=>e.url==='https://outside.org/essential?[redacted]'&&e.action==='FAILED'&&e.reason==='BROWSER_NETWORK_POLICY')).toBe(true);
},30000);
it('allows sequential same-site dependencies to become ready within the unchanged total deadline',async()=>{
  const renderer=createBrowserRenderer({fetcher:async u=>{await new Promise(r=>setTimeout(r,4500));return fixtureResponse(u,u.endsWith('/two.js')?'document.getElementById("root").innerHTML="<h1>Probate</h1><p>Visible delayed service fees.</p>";':'window.firstLoaded=true;',200,'application/javascript');}});
  const r=await renderer(fixtureResponse(url,'<div id="root"></div><script src="/one.js"></script><script src="/two.js"></script>'),url,async()=>{});
  expect(BROWSER_LIMITS.loadMs).toBe(8000);expect(BROWSER_LIMITS.totalMs).toBe(20000);expect(r.status,r.error).toBe('RENDERED');expect(r.durationMs).toBeGreaterThan(9000);expect(r.durationMs).toBeLessThan(20000);expect(r.representation).toContain('Visible delayed service fees');
},30000);
it('captures same-site data without permitting POST or losing resource provenance',async()=>{
  const fetcher=async(u:string)=>fixtureResponse(u,'{"text":"Our public complaints procedure"}',200,'application/json');
  const html='<div id="root"></div><script>fetch("/api/public?section=complaints").then(r=>r.json()).then(v=>document.getElementById("root").textContent=v.text);</script>';
  const r=await createBrowserRenderer({fetcher})(fixtureResponse(url,html),url,async()=>{});expect(r.status,r.error).toBe('RENDERED');expect(r.representation).toContain('public complaints procedure');expect(r.resourceEvents?.some(e=>e.url===url+'api/public?[redacted]'&&e.action==='FETCHED')).toBe(true);
},30000);
