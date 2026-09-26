import {it,expect} from 'vitest';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {lawWebsite,LAW_SITE,strongPricing} from './fixtures/lawwatch.js';
import {fixtureResponse} from './fixtures/milestone2.js';
import type {BrowserRenderer} from '../src/browser/types.js';
const rendered:BrowserRenderer=async r=>({status:'RENDERED',durationMs:1,finalUrl:r.finalUrl,representation:'<title>Residential conveyancing pricing</title>'+strongPricing+'<p>Our firm is regulated by the SRA number 876543.</p>',scriptErrors:[],requests:1,bytes:0,blockedRequests:0});
it.each(['BROWSER_FAILED','BROWSER_TIMED_OUT'] as const)('keeps earlier rendered surfaces uncertain after %s, without a removal finding',async status=>{
  const repo=new SqliteRepository(':memory:'),base=lawWebsite();const fetcher=async(u:string,o?:Parameters<typeof base>[1])=>u.endsWith('/pricing')?fixtureResponse(u,'<title>Residential conveyancing</title><div id="root"></div><script src="/app.js"></script>'):base(u,o);
  try{
    await scanLawWatch(LAW_SITE,repo,{fetcher,browserFallback:true,browserRenderer:rendered});
    const run=await scanLawWatch(LAW_SITE,repo,{fetcher,browserFallback:true,browserRenderer:async()=>({status,durationMs:1,scriptErrors:[],requests:1,bytes:0,blockedRequests:0,error:'Fixture failure'})});
    expect(run.lawwatch.results.filter(r=>r.ruleId.startsWith('LAW-C')).every(r=>r.status!=='POTENTIAL_ISSUE')).toBe(true);
    expect(run.lawwatch.results.find(r=>r.ruleId==='LAW-C003'&&r.resource.endsWith('/pricing'))!.status).toBe('UNKNOWN');
    expect(run.snapshot.pages.find(p=>p.url.endsWith('/pricing'))!.status).toBe(200);
  }finally{repo.close();}
});
it('keeps browser-enabled and static-only comparison histories separate',async()=>{const repo=new SqliteRepository(':memory:');try{await scanLawWatch(LAW_SITE,repo,{fetcher:lawWebsite()});const run=await scanLawWatch(LAW_SITE,repo,{fetcher:lawWebsite(),browserFallback:true,browserRenderer:rendered});expect(run.comparison).toBeNull();expect(run.snapshot.scanProfile).toContain('browser-v1');}finally{repo.close();}});
