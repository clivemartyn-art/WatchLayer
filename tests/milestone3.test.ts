import { beforeEach,afterEach,expect,it } from 'vitest';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanAndPersist } from '../src/snapshots/service.js';
import { rulesWebsite } from './fixtures/milestone3.js';
import { evaluate,runRules } from '../src/rules/engine.js';
import { universalPack,validatePack } from '../src/rules/pack.js';
import { priority } from '../src/rules/findings.js';
import { findingsReport } from '../src/reporting/findings.js';
import { resultSchema,findingSchema } from '../src/rules/json-schema.js';
import type { Snapshot } from '../src/snapshots/types.js';
import type { RulePack,State } from '../src/rules/types.js';
let repo:SqliteRepository,a:Snapshot,b:Snapshot;
beforeEach(async()=>{repo=new SqliteRepository(':memory:');a=(await scanAndPersist('https://example.com/',repo,{fetcher:rulesWebsite('A'),recheckBudget:1})).snapshot;b=(await scanAndPersist('https://example.com/',repo,{fetcher:rulesWebsite('B'),recheckBudget:1})).snapshot;});
afterEach(()=>repo.close());
const results=()=>evaluate({current:b,previous:a},universalPack);
const result=(id:string,suffix?:string)=>results().find(r=>r.ruleId===id&&(!suffix||r.resource.endsWith(suffix)))!;
it.each([
  ['WEB-U001','PASS','/'],['WEB-U002','PASS','/'],['WEB-U003','PASS','/'],
  ['WEB-U004','POTENTIAL_ISSUE','/retired'],['WEB-U004','UNKNOWN','/services'],['WEB-U005','POTENTIAL_ISSUE','.pdf'],
  ['WEB-U006','WARNING','sitemap.xml'],['WEB-U007','PASS','robots.txt'],['WEB-U008','WARNING','/'],
  ['WEB-U009','PASS','contact'],['WEB-U010','WARNING','contact'],['WEB-U011','PASS','/'],
  ['WEB-U012','PASS','/'],['WEB-U013','PASS','/'],['WEB-U014','WARNING','pricing'],['WEB-U015','UNKNOWN','/'],
] as const)('%s returns %s for %s',(id,state,suffix)=>expect(result(id,suffix).status).toBe(state));
it('produces deterministic results with structured source evidence',()=>{
  expect(results()).toEqual(results());const r=result('WEB-U004','retired');expect(r.evidence[0]).toMatchObject({scanId:b.scanId,previousScanId:a.scanId,observed:{status:404,observationStatus:'confirmed_missing'}});expect(r.confidence).toBe('HIGH');expect(r.severity).toBe('HIGH');
});
it.each([403,429,500,null])('keeps page status %s inconclusive',status=>{const page=b.pages.find(p=>p.url.endsWith('retired'))!;page.status=status;page.observationStatus='unreachable';expect(result('WEB-U004','retired').status).toBe('UNKNOWN');});
it.each(['not_observed','excluded_from_scan','uncertain'] as const)('does not turn %s plus retained 404 into a failure',state=>{const page=b.pages.find(p=>p.url.endsWith('retired'))!;page.observationStatus=state;page.evidence='not_requested';expect(result('WEB-U004','retired').status).toBe('UNKNOWN');});
it('does not claim a linked but unchecked document is available',()=>{b.documents[0].evidence='linked';b.documents[0].status=null;b.documents[0].observationStatus='observed';expect(result('WEB-U005').status).toBe('UNKNOWN');});
it('recognizes a directly checked healthy document',()=>{b.documents[0].status=200;b.documents[0].observationStatus='observed';expect(result('WEB-U005').status).toBe('PASS');});
it('does not count access restrictions as broken links',()=>{b.brokenLinks=[{sourcePage:b.canonicalStartUrl,destinationUrl:'https://example.com/private',status:403}];expect(result('WEB-U008').status).toBe('PASS');});
it('older snapshots without transport facts remain readable and uncertain',()=>{delete b.requests;delete b.brokenLinks;for(const id of ['WEB-U002','WEB-U003','WEB-U008'])expect(result(id).status).toBe('UNKNOWN');});
it.each([404,410,503])('reports direct homepage HTTP %s',status=>{b.pages[0].status=status;b.pages[0].observationStatus='unreachable';b.pages[0].evidence='http';expect(result('WEB-U001').status).toBe('POTENTIAL_ISSUE');});
it.each(['CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID'])('uses positive TLS failure %s',errorCode=>{b.requests=[{url:b.canonicalStartUrl,errorCode}];expect(result('WEB-U002').status).toBe('POTENTIAL_ISSUE');expect(result('WEB-U003').status).toBe('POTENTIAL_ISSUE');});
it('keeps generic network errors unknown',()=>{b.requests=[{url:b.canonicalStartUrl,errorCode:'ETIMEDOUT'}];expect(result('WEB-U002').status).toBe('UNKNOWN');});
it('warns near certificate expiry relative to scan time',()=>{b.requests!.find(r=>r.url===b.canonicalStartUrl)!.tls!.validTo=new Date(Date.parse(b.completedAt)+86400000).toISOString();expect(result('WEB-U003').status).toBe('WARNING');});
it('honours central per-rule threshold configuration',()=>{const pack=structuredClone(universalPack);pack.rules[13].configuration.threshold=90;expect(evaluate({current:b,previous:a},pack).find(r=>r.ruleId==='WEB-U014'&&r.resource.endsWith('pricing'))!.status).toBe('PASS');});
it('confirms form absence only on reliable observed HTML',()=>{b.forms=[];expect(result('WEB-U009').status).toBe('POTENTIAL_ISSUE');b.pages.find(p=>p.url.endsWith('contact'))!.browserRenderRecommended=true;expect(result('WEB-U009').status).toBe('UNKNOWN');});
it('does not match many changed forms arbitrarily',()=>{b.forms.push({...b.forms[0],fingerprint:'other'});expect(result('WEB-U010').status).toBe('UNKNOWN');});
it('detects a missing critical title',()=>{b.pages[0].title='';expect(result('WEB-U011').status).toBe('WARNING');});
it('detects newly introduced noindex',()=>{b.pages[0].robots='noindex';expect(result('WEB-U012').status).toBe('WARNING');a.pages[0].robots='noindex';expect(result('WEB-U012').status).toBe('UNKNOWN');});
it('detects canonical declaration changes',()=>{b.pages[0].canonicalUrl='https://example.com/new';expect(result('WEB-U013').status).toBe('WARNING');});
it('does not compare content on rendering-dependent pages',()=>{b.pages.find(p=>p.url.endsWith('pricing'))!.browserRenderRecommended=true;expect(result('WEB-U014','pricing').status).toBe('UNKNOWN');});
it('suppresses change conclusions across incompatible versions',()=>{a.applicationVersion='0.0.0';expect(result('WEB-U004','retired')?.status??result('WEB-U004').status).toBe('UNKNOWN');expect(result('WEB-U014').status).toBe('UNKNOWN');});
it.each(['crawlLimitReached','pagesFailed','discoveryErrors','rechecksFailed'] as const)('site size requires reliable %s',field=>{b.coverage[field]=true as never;expect(result('WEB-U015').status).toBe('UNKNOWN');});
it('100 to 25 incomplete pages never yields high-confidence issue',()=>{a.coverage.pagesScanned=100;b.coverage.pagesScanned=25;b.coverage.crawlLimitReached=true;const r=result('WEB-U015');expect(r.status).toBe('UNKNOWN');expect(r.confidence).toBe('LOW');});
it('permits a size signal only with reliable comparable coverage',()=>{a.coverage.pagesScanned=10;b.coverage.pagesScanned=6;b.coverage.pagesFailed=0;b.pages=b.pages.filter(p=>p.observationStatus==='observed');expect(result('WEB-U015').status).toBe('WARNING');});
it('returns uncertain applicability without a baseline',()=>{expect(evaluate({current:a},universalPack).find(r=>r.ruleId==='WEB-U004')).toMatchObject({status:'UNKNOWN',applicability:'uncertain'});});
it('returns not applicable when no forms are expected',()=>{a.forms=[];expect(result('WEB-U009').status).toBe('NOT_APPLICABLE');});
it('supports disabled rules',()=>{const p=structuredClone(universalPack);p.rules[0].enabled=false;expect(evaluate({current:b},p)[0].status).toBe('NOT_APPLICABLE');});
it.each(['schemaVersion','engineVersion','rules','id'] as const)('rejects invalid pack %s',key=>{const pack=structuredClone(universalPack);(pack as unknown as Record<string,unknown>)[key]=null;expect(()=>validatePack(pack)).toThrow();});
it.each(['severity','detector','applicability','configuration','resultMapping','evidenceRequirements','version'] as const)('rejects invalid rule %s',key=>{const p=structuredClone(universalPack);(p.rules[0] as unknown as Record<string,unknown>)[key]=null;expect(()=>validatePack(p)).toThrow();});
it.each([-1,101,NaN,Infinity])('rejects invalid percentage threshold %s',threshold=>{const p=structuredClone(universalPack);p.rules[13].configuration.threshold=threshold;expect(()=>validatePack(p)).toThrow();});
it('rejects duplicate rules and unsafe mappings',()=>{const p=structuredClone(universalPack);p.rules.push(p.rules[0]);expect(()=>validatePack(p)).toThrow();p.rules.pop();p.rules[13].resultMapping.changed='POTENTIAL_ISSUE';expect(()=>validatePack(p)).toThrow();});
it('supports several distinct packs per scan',()=>{const custom:RulePack=structuredClone(universalPack);custom.id='custom';custom.rules.forEach(r=>r.packId='custom');expect(runRules({current:b,previous:a},[universalPack,custom])).toHaveLength(2);expect(()=>runRules({current:b},[universalPack,universalPack])).toThrow();});
it('persists exact definitions, results and separate finding projections',()=>{const [run]=runRules({current:b,previous:a});repo.saveRuleRun(run);expect(repo.ruleRuns(b.scanId)).toEqual([JSON.parse(JSON.stringify(run))]);expect(()=>repo.saveRuleRun(run)).toThrow();expect(repo.ruleRuns(b.scanId)).toHaveLength(1);});
it('retains attribution when a later version is run',()=>{const [first]=runRules({current:b,previous:a});repo.saveRuleRun(first);const p=structuredClone(universalPack);p.version='1.1';p.rules[0].version='1.1';repo.saveRuleRun(runRules({current:b,previous:a},[p])[0]);expect(repo.ruleRuns(b.scanId).map(r=>r.packVersion)).toEqual(['1.1','1.0']);expect(repo.ruleRuns(b.scanId)[1].definition).toEqual(universalPack);});
it('priority separates severity, confidence and status',()=>{const base={severity:'HIGH' as const,status:'POTENTIAL_ISSUE' as const};expect(priority({...base,confidence:'HIGH'})).toBeGreaterThan(priority({...base,confidence:'LOW'}));expect(priority({severity:'CRITICAL',status:'PASS',confidence:'HIGH'})).toBe(0);});
it('reports every state and uses a separate UNKNOWN section',()=>{a.forms=[];const report=findingsReport(runRules({current:b,previous:a}));for(const text of ['WATCHLAYER FINDINGS','CRITICAL','UNKNOWN','NOT_APPLICABLE','Summary','/services'])expect(report).toContain(text);});
it('exports versioned complete schemas for results and findings',()=>{const [run]=runRules({current:b,previous:a});for(const [schema,objects] of [[resultSchema,run.results],[findingSchema,run.findings]] as const)for(const object of objects){expect(Object.keys(object).sort()).toEqual([...schema.required].sort());expect(object.schemaVersion).toBe(1);}expect(resultSchema.properties.status.enum).toEqual(['PASS','WARNING','POTENTIAL_ISSUE','UNKNOWN','NOT_APPLICABLE']);});
it('does not use incompatible current snapshot formats',()=>{b.schemaVersion=999;expect(results().every(r=>r.status==='UNKNOWN')).toBe(true);});
it('does not infer baseline metadata changes from another site',()=>{a.canonicalDomain='different.example';b.pages[0].robots='noindex';expect(result('WEB-U012').status).toBe('UNKNOWN');});
it('keeps ambiguous multiple form replacements unknown',()=>{a.forms.push({...a.forms[0],fingerprint:'second-original'});b.forms.push({...b.forms[0],fingerprint:'second-new'});expect(result('WEB-U009').status).toBe('UNKNOWN');});
it('warns on a reliably fetched invalid sitemap',()=>{b.requests!.find(r=>r.url.endsWith('sitemap.xml'))!.status=200;b.errors.push({url:'https://example.com/sitemap.xml',stage:'sitemap',message:'Not a sitemap'});expect(result('WEB-U006').status).toBe('WARNING');});
it('keeps a sitemap timeout unknown',()=>{const r=b.requests!.find(r=>r.url.endsWith('sitemap.xml'))!;delete r.status;r.errorCode='ETIMEDOUT';expect(result('WEB-U006').status).toBe('UNKNOWN');});
it('does not let another origin robots file mask starting-origin absence',()=>{b.requests!.find(r=>r.url.endsWith('robots.txt'))!.status=404;b.coverage.discovery.robotsFound=true;expect(result('WEB-U007').status).toBe('WARNING');});
it('rolls back the entire rule run if finding insertion fails',()=>{const [run]=runRules({current:b,previous:a});run.findings.push(run.findings[0]);expect(()=>repo.saveRuleRun(run)).toThrow();expect(repo.ruleRuns(b.scanId)).toEqual([]);});
