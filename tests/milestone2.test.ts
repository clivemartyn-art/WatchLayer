import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { DATABASE_SCHEMA_VERSION } from '../src/storage/migrations.js';
import { scanAndPersist } from '../src/snapshots/service.js';
import { compareSnapshots } from '../src/comparison/diff.js';
import { selectBaseline } from '../src/comparison/eligibility.js';
import { pageObservation, formObservation, normalizedText, hash } from '../src/snapshots/fingerprints.js';
import { extractPage } from '../src/extractors/page.js';
import { changeReport } from '../src/reporting/changes.js';
import { versionedWebsite, fixtureResponse, FIXTURE_SITE } from './fixtures/milestone2.js';
import type { Snapshot } from '../src/snapshots/types.js';

let repository: SqliteRepository;
let tick: number;
const now=()=>new Date(Date.UTC(2026,8,11,12,0,tick++));
const run=(version:'A'|'B',extra: Parameters<typeof scanAndPersist>[2]={})=>scanAndPersist(FIXTURE_SITE,repository,{fetcher:versionedWebsite(version),now,...extra});
beforeEach(()=>{repository=new SqliteRepository(':memory:');tick=0;});
afterEach(()=>repository.close());

describe('persistent lifecycle and controlled A → B website',()=>{
  it('persists the first site and scan, with fingerprints but no raw HTML or visible text',async()=>{
    const {snapshot,comparison,scan}=await scanAndPersist('example.com',repository,{fetcher:versionedWebsite('A'),now});
    expect(scan.site.inputUrl).toBe('example.com');
    expect(comparison).toBeNull();expect(repository.findSite('example.com')?.siteId).toBe(snapshot.siteId);
    const saved=repository.get(snapshot.scanId)!;
    expect(saved.pages).toHaveLength(4);expect(saved.pages[0].textHash).toHaveLength(64);
    expect(saved).not.toHaveProperty('body');expect(saved.pages[0]).not.toHaveProperty('text');
    expect(saved.documents[0].firstObservedAt).toBe(snapshot.startedAt);expect(saved.comparisonEligible).toBe(true);
  });
  it('creates unique immutable scans and orders history newest first',async()=>{
    const a=await run('A');const original=JSON.stringify(repository.get(a.snapshot.scanId));const b=await run('B');
    expect(a.snapshot.scanId).not.toBe(b.snapshot.scanId);expect(a.snapshot.siteId).toBe(b.snapshot.siteId);
    expect(JSON.stringify(repository.get(a.snapshot.scanId))).toBe(original);
    expect(repository.history('example.com').map(s=>s.scanId)).toEqual([b.snapshot.scanId,a.snapshot.scanId]);
    expect(()=>repository.save(a.snapshot)).toThrow();expect(repository.history('example.com')).toHaveLength(2);
  });
  it('distinguishes additions, content/form changes, a confirmed missing PDF and an unvisited live page',async()=>{
    await run('A');const {comparison,snapshot}=await run('B',{recheckBudget:1});const changes=comparison!.changes;
    expect(changes).toEqual(expect.arrayContaining([
      expect.objectContaining({type:'PAGE_ADDED',url:FIXTURE_SITE+'team'}),
      expect.objectContaining({type:'PAGE_TITLE_CHANGED',url:FIXTURE_SITE}),
      expect.objectContaining({type:'PAGE_CONTENT_CHANGED',url:FIXTURE_SITE+'pricing',materiality:'major'}),
      expect.objectContaining({type:'DOCUMENT_CONFIRMED_REMOVED',url:FIXTURE_SITE+'guide.pdf',confidence:'confirmed'}),
      expect.objectContaining({type:'FORM_CHANGED',url:FIXTURE_SITE+'contact'}),
      expect.objectContaining({type:'PHONE_ADDED'}),expect.objectContaining({type:'PHONE_REMOVED_FROM_OBSERVED_SITE'}),
      expect.objectContaining({type:'PAGE_NOT_OBSERVED',url:FIXTURE_SITE+'services'}),
    ]));
    expect(changes.some(c=>c.type==='PAGE_CONFIRMED_REMOVED')).toBe(false);expect(snapshot.coverage.rechecksAttempted).toBe(1);
    const report=changeReport(comparison!);expect(report).toContain('NOT OBSERVED — NOT REMOVED');expect(report).toContain('HTTP 404');expect(report).toContain('words 100 → 150');
  });
  it('recognizes unchanged pages despite insignificant whitespace',async()=>{
    const a=await run('A');const b=structuredClone(a.snapshot);b.scanId='second';
    const page=extractPage(fixtureResponse(FIXTURE_SITE,'<p>Hello  world</p>'));
    a.snapshot.pages=[pageObservation(page)];b.pages=[pageObservation({...page,text:' Hello\r\n world '})];
    const diff=compareSnapshots(a.snapshot,b);expect(diff.summary.unchanged).toBe(1);expect(diff.changes.filter(c=>c.type.startsWith('PAGE_'))).toEqual([]);
  });
  it('rechecks missing pages without crawling their links',async()=>{
    await run('A');const fetcher=vi.fn(versionedWebsite('B'));const {snapshot,comparison}=await run('B',{fetcher});
    expect(fetcher.mock.calls.some(([u])=>u.endsWith('/services'))).toBe(true);
    expect(snapshot.pages.find(p=>p.url.endsWith('/services'))?.observationStatus).toBe('observed');expect(comparison!.changes.some(c=>c.type==='PAGE_NOT_OBSERVED')).toBe(false);
  });
  it('uses HEAD, not a document download, for known document rechecks',async()=>{
    await run('A');const fetcher=vi.fn(versionedWebsite('B'));await run('B',{fetcher});
    const calls=fetcher.mock.calls.filter(([url])=>url.endsWith('.pdf'));expect(calls).toHaveLength(1);expect(calls[0][1]?.method).toBe('HEAD');
  });
  it('keeps a document NOT_OBSERVED when there is no recheck budget',async()=>{
    await run('A');const b=await run('B',{recheckBudget:0});expect(b.comparison!.changes).toContainEqual(expect.objectContaining({type:'DOCUMENT_NOT_OBSERVED'}));expect(b.comparison!.changes.some(c=>c.type==='DOCUMENT_CONFIRMED_REMOVED')).toBe(false);
  });
  it('does not forget an unobserved page across repeat scans',async()=>{
    await run('A');await run('B',{recheckBudget:0});const c=await run('B',{recheckBudget:0});
    expect(c.comparison!.changes).toContainEqual(expect.objectContaining({type:'PAGE_NOT_OBSERVED',url:FIXTURE_SITE+'services'}));
    const d=await run('B',{recheckBudget:20});expect(d.snapshot.pages.find(p=>p.url.endsWith('/services'))?.observationStatus).toBe('observed');
  });
});

describe('deterministic changes and conservative evidence',()=>{
  async function pair():Promise<[Snapshot,Snapshot]> {const {snapshot}=await run('A');const next=structuredClone(snapshot);next.scanId='next';return [snapshot,next];}
  it.each([
    ['title','New title','PAGE_TITLE_CHANGED'],['metaDescription','New description','PAGE_META_CHANGED'],
    ['canonicalUrl','https://example.com/new','PAGE_CANONICAL_CHANGED'],['robots','noindex','PAGE_ROBOTS_CHANGED'],
    ['finalUrl','https://example.com/new','PAGE_REDIRECT_CHANGED'],['browserRenderRecommended',true,'PAGE_BROWSER_RENDER_STATE_CHANGED'],
  ] as const)('detects %s changes',async(field,value,type)=>{
    const [a,b]=await pair();Object.assign(b.pages[0],{[field]:value});expect(compareSnapshots(a,b).changes).toContainEqual(expect.objectContaining({type}));
  });
  it.each([[102,'minor'],[110,'moderate'],[150,'major']] as const)('classifies content with %s words as %s',async(words,materiality)=>{
    const [a,b]=await pair();a.pages[0].wordCount=100;b.pages[0].wordCount=words;b.pages[0].textHash=hash('changed');expect(compareSnapshots(a,b).changes).toContainEqual(expect.objectContaining({type:'PAGE_CONTENT_CHANGED',materiality}));
  });
  it('detects changed text even when word count is unchanged',async()=>{
    const [a,b]=await pair();b.pages[0].textHash=hash('same length new words');expect(compareSnapshots(a,b).changes).toContainEqual(expect.objectContaining({type:'PAGE_CONTENT_CHANGED',context:expect.objectContaining({percentageDifference:0})}));
  });
  it.each([404,410])('requires positive HTTP %s for page removal',async status=>{
    await run('A');const base=versionedWebsite('B');const b=await run('B',{fetcher:async(u,o)=>u.endsWith('/services')?fixtureResponse(u,'',status):base(u,o)});expect(b.comparison!.changes).toContainEqual(expect.objectContaining({type:'PAGE_CONFIRMED_REMOVED',url:FIXTURE_SITE+'services',current:{status}}));
  });
  it.each([403,429,500])('does not infer removal from HTTP %s',async status=>{
    await run('A');const base=versionedWebsite('B');const b=await run('B',{fetcher:async(u,o)=>u.endsWith('/services')?fixtureResponse(u,'',status):base(u,o)});expect(b.comparison!.changes).toContainEqual(expect.objectContaining({type:'PAGE_NOT_OBSERVED',url:FIXTURE_SITE+'services'}));expect(b.comparison!.changes.some(c=>c.type==='PAGE_CONFIRMED_REMOVED')).toBe(false);
  });
  it('records a new document',async()=>{
    const [a,b]=await pair();b.documents.push({...b.documents[0],url:FIXTURE_SITE+'new.pdf'});expect(compareSnapshots(a,b).changes).toContainEqual(expect.objectContaining({type:'DOCUMENT_ADDED'}));
  });
  it('records a new form and a positively missing form on an observed page',async()=>{
    const [a,b]=await pair();b.forms=[];expect(compareSnapshots(a,b).changes).toContainEqual(expect.objectContaining({type:'FORM_CONFIRMED_REMOVED'}));expect(compareSnapshots(b,a).changes).toContainEqual(expect.objectContaining({type:'FORM_ADDED'}));
  });
  it('does not remove a form when its page was not observed',async()=>{
    const [a,b]=await pair();b.pages=b.pages.filter(p=>!p.url.endsWith('/contact'));b.forms=[];expect(compareSnapshots(a,b).changes).toContainEqual(expect.objectContaining({type:'FORM_NOT_OBSERVED'}));
  });
  it('records new emails and phones',async()=>{
    const [a,b]=await pair();b.contacts.emails.push({value:'new@example.com',sourcePages:[FIXTURE_SITE],observationStatus:'observed'});b.contacts.phones.push({value:'+442079460000',sourcePages:[FIXTURE_SITE],observationStatus:'observed'});expect(compareSnapshots(a,b).changes.map(c=>c.type)).toEqual(expect.arrayContaining(['EMAIL_ADDED','PHONE_ADDED']));
  });
  it('requires all known source pages to be observed before removing a contact',async()=>{
    const [a,b]=await pair();a.contacts.emails[0].sourcePages.push(FIXTURE_SITE+'services');b.contacts.emails=[];b.pages=b.pages.filter(p=>!p.url.endsWith('/services'));expect(compareSnapshots(a,b).changes.some(c=>c.type==='EMAIL_REMOVED_FROM_OBSERVED_SITE')).toBe(false);
  });
  it('suppresses comparisons across schema versions',async()=>{
    const [a,b]=await pair();a.schemaVersion=999;const diff=compareSnapshots(a,b);expect(diff.comparisonEligible).toBe(false);expect(diff.changes).toEqual([]);
  });
  it('does not confirm removal across different crawl limits',async()=>{
    const [a,b]=await pair();b.crawlLimit=10;b.pages[0].observationStatus='confirmed_missing';b.pages[0].status=404;expect(compareSnapshots(a,b).changes.some(c=>c.type==='PAGE_CONFIRMED_REMOVED')).toBe(false);
  });
});

describe('eligibility and SQLite migrations',()=>{
  it('persists a failed scan but selects the older suitable baseline next time',async()=>{
    const a=await run('A');const failed=await run('B',{fetcher:async()=>{throw new Error('DNS failure');}});expect(failed.snapshot.comparisonEligible).toBe(false);expect(failed.snapshot.status).toBe('failed');const c=await run('B');expect(c.comparison!.previousScanId).toBe(a.snapshot.scanId);
  });
  it('marks a dramatic coverage collapse ineligible',async()=>{
    await run('A');const b=await run('B',{fetcher:async url=>fixtureResponse(url,url===FIXTURE_SITE?'<h1>Only homepage</h1>':'',url===FIXTURE_SITE?200:404)});expect(b.snapshot.comparisonEligible).toBe(false);expect(b.snapshot.comparisonWarnings.join(' ')).toContain('half');
  });
  it('rejects baselines with different crawl limits or application versions',async()=>{
    const {snapshot}=await run('A');expect(selectBaseline([snapshot],10)).toBeUndefined();snapshot.applicationVersion='0.0.0';expect(selectBaseline([snapshot],100)).toBeUndefined();
  });
  it('migrates an empty database and survives reopening with identical exports',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'watchlayer-test-'));const path=join(dir,'history.db');
    try {
      const storage=new SqliteRepository(path);const {snapshot}=await scanAndPersist(FIXTURE_SITE,storage,{fetcher:versionedWebsite('A'),now});const exported=storage.get(snapshot.scanId);storage.close();
      const raw=new DatabaseSync(path);expect(raw.prepare('PRAGMA user_version').get()?.user_version).toBe(DATABASE_SCHEMA_VERSION);expect(()=>raw.prepare('UPDATE scans SET status=? WHERE scan_id=?').run('changed',snapshot.scanId)).toThrow(/immutable/);raw.close();
      const reopened=new SqliteRepository(path);expect(reopened.get(snapshot.scanId)).toEqual(exported);reopened.close();
    } finally {rmSync(dir,{recursive:true,force:true});}
  });
  it('rolls back an incomplete snapshot transaction',async()=>{
    const {snapshot}=await run('A');const broken=structuredClone(snapshot);broken.scanId='duplicate-pages';broken.pages.push(broken.pages[0]);expect(()=>repository.save(broken)).toThrow();expect(repository.get(broken.scanId)).toBeUndefined();
  });
  it('rejects a database from a newer application without modifying its version',()=>{
    const dir=mkdtempSync(join(tmpdir(),'watchlayer-test-'));const path=join(dir,'future.db');try{const raw=new DatabaseSync(path);raw.exec('PRAGMA user_version=99');raw.close();expect(()=>new SqliteRepository(path)).toThrow(/newer/);}finally{rmSync(dir,{recursive:true,force:true});}
  });
  it('excludes database files and journals from Git',()=>{
    const ignore=readFileSync('.gitignore','utf8');expect(ignore.split(/\r?\n/)).toEqual(expect.arrayContaining(['.watchlayer/','*.db','*.db-*']));
  });
  it('normalizes insignificant text formatting and form field order/values',()=>{
    expect(normalizedText(' A\r\n B ')).toBe('A B');const a=extractPage(fixtureResponse(FIXTURE_SITE,'<form><input name="email"><input type="hidden" name="nonce" value="one"></form>')).forms[0];const b=extractPage(fixtureResponse(FIXTURE_SITE,'<form><input type="hidden" name="nonce" value="two"><input name="email"></form>')).forms[0];expect(formObservation(a).fingerprint).toBe(formObservation(b).fingerprint);
  });
});
