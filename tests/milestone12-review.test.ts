import {it,expect} from 'vitest';
import {compareRenderReviews,reviewableRecovery,renderedReviewContext,type RenderReviewItem,type RenderDecision} from '../scripts/milestone12-review.js';
import {SqliteRepository} from '../src/storage/sqlite.js';
import {scanLawWatch} from '../src/lawwatch/service.js';
import {LAW_SITE,lawWebsite} from './fixtures/lawwatch.js';
import {BROWSER_POLICY_VERSION} from '../src/browser/types.js';
const item={id:'a'} as RenderReviewItem;
it.each([{status:'BROWSER_FAILED',expectedTextRecovered:true},{status:'BROWSER_TIMED_OUT',expectedTextRecovered:true},{status:'RENDERED',expectedTextRecovered:false}])('excludes failed or incomplete recovery from human evidence review %j',row=>expect(reviewableRecovery(row)).toBe(false));
it('admits successful expected live recovery',()=>expect(reviewableRecovery({status:'RENDERED',expectedTextRecovered:true})).toBe(true));
it('provides captured visible link label context, without inventing destination content',()=>{expect(renderedReviewContext('<nav><a href="https://example.com/team">Team</a></nav>','https://example.com/team')).toContain('Visible link label: Team');});
it('keeps unavailable and oversized review context explicit and bounded',()=>{expect(renderedReviewContext('<p>Text</p>','Absent')).toContain('not located');expect(renderedReviewContext('<p>'+('Text '.repeat(1000))+'</p>','Text').length).toBeLessThanOrEqual(1400);});
const decision:RenderDecision={itemId:'a',label:'VALID_RENDERED_EVIDENCE',usefulPublicEvidence:'YES',serviceContext:'NOT_APPLICABLE',ruleSupport:'NOT_APPLICABLE',reviewer:'Independent reviewer',reviewedAt:'2026-09-26',notes:'Public directory link; no regulatory applicability inferred.'};
it('does not call an empty queue reviewed or infer precision',()=>{const r=compareRenderReviews([],[]);expect(r.reviewComplete).toBe(false);expect(r.independentlyValidEvidence.rate).toBeNull();});
it('separates useful public evidence from regulatory support',()=>{const r=compareRenderReviews([item],[decision]);expect(r.reviewComplete).toBe(true);expect(r.independentlyValidEvidence.rate).toBe(1);expect(r.justifiedRuleSupport.rate).toBeNull();});
it('counts unreviewed items without calling them invalid evidence',()=>{const r=compareRenderReviews([item],[]);expect(r.pending).toBe(1);expect(r.independentlyValidEvidence.rate).toBeNull();});
it.each([{reviewer:''},{notes:''},{reviewedAt:'2026-02-30'},{label:''},{usefulPublicEvidence:'UNCERTAIN'},{serviceContext:'WRONG'},{ruleSupport:'UNJUSTIFIED'}])('rejects incomplete or contradictory decisions %j',change=>{expect(()=>compareRenderReviews([item],[{...decision,...change} as RenderDecision])).toThrow();});
it('rejects unknown and duplicate decisions',()=>{expect(()=>compareRenderReviews([item],[decision,decision])).toThrow();expect(()=>compareRenderReviews([],[decision])).toThrow();});
it.each(['1.0','1.1'] as const)('does not compare current browser policy against a historical policy %s scan',async policy=>{
  const source=new SqliteRepository(':memory:'),current=new SqliteRepository(':memory:');
  try{
    const before=await scanLawWatch(LAW_SITE,source,{fetcher:lawWebsite(),browserFallback:true});
    expect(before.snapshot.scanProfile).toContain('browser-v'+BROWSER_POLICY_VERSION);
    current.save({...before.snapshot,scanProfile:before.snapshot.scanProfile!.replace('browser-v'+BROWSER_POLICY_VERSION,policy==='1.0'?'browser-v1':'browser-v'+policy),browser:before.snapshot.browser?{...before.snapshot.browser,policyVersion:policy}:undefined});
    const after=await scanLawWatch(LAW_SITE,current,{fetcher:lawWebsite(),browserFallback:true});
    expect(after.comparison).toBeNull();
    expect(after.lawwatch.results.some(r=>r.ruleId.startsWith('LAW-C')&&r.status==='POTENTIAL_ISSUE')).toBe(false);
  }finally{source.close();current.close();}
});
