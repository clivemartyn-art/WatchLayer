import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanAndPersist } from '../src/snapshots/service.js';
import { fixtureResponse as response, versionedWebsite, FIXTURE_SITE as site } from './fixtures/milestone2.js';
let repo:SqliteRepository;
beforeEach(()=>repo=new SqliteRepository(':memory:'));
afterEach(()=>repo.close());
const run=(version:'A'|'B',extra:Parameters<typeof scanAndPersist>[2]={})=>scanAndPersist(site,repo,{fetcher:versionedWebsite(version),...extra});
it('does not repeat removal events after subsequent observation gaps',async()=>{
  await run('A');const base=versionedWebsite('B');await run('B',{fetcher:async(u,o)=>u.endsWith('/services')?response(u,'',404):base(u,o)});
  await run('B',{recheckBudget:0});const last=await run('B');
  expect(last.comparison!.changes.filter(c=>c.type.includes('CONFIRMED_REMOVED'))).toEqual([]);
});
it('does not let a link on a rechecked page override a direct missing-document result',async()=>{
  await run('A');const base=versionedWebsite('B');const last=await run('B',{fetcher:async(u,o)=>u.endsWith('/services')?response(u,'<a href="/guide.pdf">Stale guide link</a>'):base(u,o)});
  expect(last.snapshot.documents[0].observationStatus).toBe('confirmed_missing');
  expect(last.comparison!.changes).toContainEqual(expect.objectContaining({type:'DOCUMENT_CONFIRMED_REMOVED'}));
});
it('records documents discovered on rechecked pages without downloading them',async()=>{
  await run('A');const base=versionedWebsite('B');const fetcher=vi.fn(async(u:string,o:any)=>u.endsWith('/services')?response(u,'<a href="/new.pdf">New</a>'):base(u,o));
  const last=await run('B',{fetcher});expect(last.comparison!.changes).toContainEqual(expect.objectContaining({type:'DOCUMENT_ADDED',url:site+'new.pdf'}));expect(fetcher.mock.calls.some(([u])=>u.endsWith('/new.pdf'))).toBe(false);
});
it('keeps robots-excluded known pages distinct from missing pages',async()=>{
  await run('A');const base=versionedWebsite('B');const fetcher=vi.fn(async(u:string,o:any)=>u.endsWith('/robots.txt')?response(u,'User-agent: *\nDisallow: /services',200,'text/plain'):base(u,o));
  const last=await run('B',{fetcher});expect(last.snapshot.pages.find(p=>p.url.endsWith('/services'))?.observationStatus).toBe('excluded_from_scan');expect(fetcher.mock.calls.some(([u])=>u.endsWith('/services'))).toBe(false);
});
it('never rechecks externally hosted known documents',async()=>{
  const a=versionedWebsite('A');await run('A',{fetcher:async(u,o)=>{const r=await a(u,o);return u===site?{...r,body:r.body+'<a href="https://other.example.org/guide.pdf">External</a>'}:r;}});
  const fetcher=vi.fn(versionedWebsite('B'));const last=await run('B',{fetcher});expect(fetcher.mock.calls.some(([u])=>u.startsWith('https://other.example.org'))).toBe(false);expect(last.snapshot.documents.find(d=>d.url.startsWith('https://other.example.org'))?.observationStatus).toBe('excluded_from_scan');
});
it('does not fallback to GET when a document does not support HEAD',async()=>{
  await run('A');const base=versionedWebsite('B');const fetcher=vi.fn(async(u:string,o:any)=>u.endsWith('.pdf')?response(u,'',405):base(u,o));const b=await run('B',{fetcher});
  expect(fetcher.mock.calls.filter(([u])=>u.endsWith('.pdf'))).toHaveLength(1);expect(b.comparison!.changes).toContainEqual(expect.objectContaining({type:'DOCUMENT_NOT_OBSERVED'}));
});
it('caps repeat rechecks at twenty even with many known resources',async()=>{
  const a=versionedWebsite('A');await run('A',{fetcher:async(u,o)=>{const r=await a(u,o);return u===site?{...r,body:r.body+Array.from({length:40},(_,i)=>`<a href="/doc-${i}.pdf">Doc</a>`).join('')}:r;}});
  const fetcher=vi.fn(versionedWebsite('B'));const b=await run('B',{fetcher});expect(b.snapshot.coverage.rechecksAttempted).toBe(20);expect(fetcher.mock.calls.filter(([u,o])=>o?.method==='HEAD'||u.endsWith('/services'))).toHaveLength(20);
});
it.each([-1,21,1.5])('rejects invalid recheck budget %s before requests',async recheckBudget=>{
  const fetcher=vi.fn(versionedWebsite('A'));await expect(run('A',{fetcher,recheckBudget})).rejects.toThrow(/budget/);expect(fetcher).not.toHaveBeenCalled();
});
it('does not duplicate forms when a rechecked old URL redirects to a naturally observed page',async()=>{
  await run('A');const base=versionedWebsite('B');const b=await run('B',{fetcher:async(u,o)=>u.endsWith('/services')?{...await base(site+'contact',o),requestedUrl:u,redirects:[u]}:base(u,o)});
  expect(b.snapshot.forms.filter(f=>f.observationStatus==='observed')).toHaveLength(1);expect(b.comparison!.changes).toContainEqual(expect.objectContaining({type:'PAGE_REDIRECT_CHANGED',url:site+'services'}));
});
it('retains contact facts when their source page is unobserved',async()=>{
  await run('A');const base=versionedWebsite('B');const fetcher=async(u:string,o:any)=>{const r=await base(u,o);return u===site?{...r,body:r.body.replace('<a href="/contact">Contact</a>','')}:r;};
  const b=await run('B',{fetcher,recheckBudget:0});expect(b.snapshot.contacts.emails[0].observationStatus).toBe('not_observed');expect(b.comparison!.changes.some(c=>c.type==='EMAIL_REMOVED_FROM_OBSERVED_SITE')).toBe(false);
});
it('retains unobserved source attribution even while the same contact is seen elsewhere',async()=>{
  const a=versionedWebsite('A');await run('A',{fetcher:async(u,o)=>{const r=await a(u,o);return u.endsWith('/services')?{...r,body:r.body+'<p>hello@example.com</p>'}:r;}});
  await run('B',{recheckBudget:0});
  const base=versionedWebsite('B');const c=await run('B',{recheckBudget:0,fetcher:async(u,o)=>{const r=await base(u,o);return {...r,body:r.body.replace('hello@example.com','')};}});
  expect(c.comparison!.changes.some(c=>c.type==='EMAIL_REMOVED_FROM_OBSERVED_SITE')).toBe(false);
  expect(c.snapshot.contacts.emails[0].unobservedSourcePages).toContain(site+'services');
});
it('marks a high rate of inconclusive recheck failures as ineligible',async()=>{
  await run('A');const base=versionedWebsite('B');const b=await run('B',{fetcher:async(u,o)=>u.endsWith('/services')||u.endsWith('.pdf')?response(u,'',503):base(u,o)});
  expect(b.snapshot.comparisonEligible).toBe(false);expect(b.snapshot.coverage.rechecksFailed).toBe(2);
});
it('does not invent a redirect change when a page returns after an unreachable observation',async()=>{
  await run('A');const base=versionedWebsite('B');await run('B',{fetcher:async(u,o)=>{if(u.endsWith('/services'))throw new Error('Timeout');return base(u,o);}});
  const c=await run('B');expect(c.comparison!.changes.filter(c=>c.type==='PAGE_REDIRECT_CHANGED')).toEqual([]);
});
