import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import assert from 'node:assert/strict';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {createBrowserRenderer} from '../src/browser/render.js';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {compareBrowserEvidence} from './milestone11-comparison.js';
import {fixtureResponse} from '../tests/fixtures/milestone2.js';
import type {FactSet} from '../src/lawwatch/types.js';
const output=process.argv[2];if(!output)throw Error('Provide a new output directory. This command uses virtual public-URL fixtures only.');
await mkdir(dirname(output),{recursive:true});await mkdir(output,{recursive:false});
const url='https://example.com/',inject=(html:string)=>'document.getElementById("root").innerHTML='+JSON.stringify(html)+';';
const cases=[
  {name:'static-sufficient',html:'<main>'+('Useful public service information. '.repeat(100))+'</main>',expected:'BROWSER_NOT_REQUIRED'},
  {name:'spa-shell',script:inject('<main><h1>Our public services</h1><p>We advise clients on their legal matters.</p></main>')},
  {name:'dynamic-navigation',script:inject('<nav><a href="/services">Services</a><a href="/complaints">Complaints</a></nav>')},
  {name:'pricing',script:inject('<main><h1>Residential conveyancing pricing</h1><p>We provide residential conveyancing for buying your home.</p><p>Our fixed fee is £900.</p><p>Our legal fees exclude VAT at 20%.</p></main>')},
  {name:'complaints',script:inject('<main><h1>Complaints procedure</h1><p>To make a complaint contact our client care partner. We investigate your complaint and respond.</p><p>You may complain to the Legal Ombudsman by email to enquiries@legalombudsman.org.uk.</p></main>')},
  {name:'staff-service',script:inject('<main><h1>Uncontested probate</h1><p>Our solicitor Jane Smith has 20 years of experience in uncontested probate.</p></main>')},
  {name:'pdf-link',script:inject('<main><h1>Probate pricing</h1><a href="/fees.pdf">Uncontested probate fees PDF</a></main>')},
  {name:'cookie-overlay',script:inject('<div id="onetrust-banner-sdk">Accept marketing cookies</div><main><h1>Complaints procedure</h1><p>We investigate your complaint and respond.</p></main>')},
  {name:'script-error',script:'throw Error("fixture script failure");',expected:'BROWSER_FAILED'},
  {name:'infinite-loading',script:inject('<p>Loading...</p>')+'setInterval(()=>{},50);'},
  {name:'infinite-script-timeout',script:'while(true){}',expected:'BROWSER_TIMED_OUT'},
  {name:'client-redirect',script:'location.href="/target";'},
  {name:'mixed-service-tabs',script:inject('<main><h2>Uncontested probate</h2><p>Our fixed fee is £900.</p><h2>Complaints procedure</h2><p>We investigate your complaint.</p><section hidden><h2>Residential conveyancing</h2><p>Our fixed fee is £300.</p></section></main>')},
  {name:'delayed-content',script:'setTimeout(()=>{'+inject('<main><h1>Probate pricing</h1><p>Our fixed fee is £900.</p></main>')+'},100);'},
];
const rows=[];
for(const fixture of cases){
  const html=fixture.html??'<div id="root"></div><script>'+fixture.script+'</script>';
  const fetcher=async(u:string)=>fixtureResponse(u,u===url?html:u.endsWith('/target')?'<main><h1>Uncontested probate</h1><p>Our fixed fee is £900.</p></main>':'',u===url||u.endsWith('/target')?200:404);
  const repo=new SqliteRepository(':memory:');
  try{
    const options={maxPages:1,lawwatchEvidenceBudget:0,lawwatchStaffBudget:0,recheckBudget:0,pdfExtraction:false,fetcher};
    const before=await scanLawWatch(url,repo,options);
    const after=await scanLawWatch(url,repo,{...options,browserFallback:true,browserRenderer:createBrowserRenderer({fetcher})});
    const observation=after.snapshot.browser!.observations[0];assert.equal(observation.status,fixture.expected??'RENDERED',fixture.name+': '+observation.error);
    assert.equal(after.lawwatch.results.filter(r=>r.status==='POTENTIAL_ISSUE').length,0);
    const facts=repo.facts<FactSet>(after.snapshot.scanId,'lawwatch-england-wales')!;
    const comparison=compareBrowserEvidence(after.snapshot.browser!,facts,before.lawwatch,after.lawwatch);
    rows.push({name:fixture.name,status:observation.status,reason:observation.reason,error:observation.error,durationMs:observation.durationMs,comparison,documents:after.scan.pdf?.documents.map(d=>({url:d.requestedUrl,referrers:d.referrers}))});
    console.log(fixture.name+': '+observation.status);
  }finally{repo.close();}
}
const attempted=rows.filter(r=>r.status!=='BROWSER_NOT_REQUIRED'),rendered=rows.filter(r=>r.status==='RENDERED'),material=rendered.filter(r=>r.comparison.materiallyNewPages>0);
await writeFile(join(output,'summary.json'),JSON.stringify({schemaVersion:1,mode:'controlled-virtual-public-URL-Chromium-fixtures',rows,summary:{cases:rows.length,attempted:attempted.length,rendered:rendered.length,materiallyNew:material.length,materiallyNewFraction:material.length/rendered.length,averageMs:attempted.reduce((n,r)=>n+r.durationMs,0)/attempted.length,p95Ms:null,seriousFalsePositives:0},limitation:'Deterministic synthetic content, not live precision. Positive serious-finding controls are evaluated separately.'},null,2)+'\n');
