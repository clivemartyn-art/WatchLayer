import {it,expect} from 'vitest';
import {distinctReviewFacts,classifyRecovery,dependencyCategory,expectedMatches} from '../scripts/milestone13-evidence.js';
const target={url:'https://example.com/',expectedTexts:['Residential conveyancing','Our fees are £900'],expectedLinks:['https://example.com/fees.pdf']};
const observed=(representation:string)=>({status:'RENDERED' as const,representation,finalUrl:target.url});
it('classifies complete expected recovery without claiming completeness or absence',()=>{expect(classifyRecovery(observed('<p>Residential conveyancing. Our fees are £900.</p><a href="/fees.pdf">Fees</a>'),target,false)).toEqual({state:'COMPLETE_EXPECTED_RECOVERY',matched:[true,true,true],canInferAbsence:false});});
it('classifies partial text/link recovery conservatively',()=>{expect(classifyRecovery(observed('<p>Residential conveyancing</p>'),target,true)).toEqual({state:'PARTIAL_EXPECTED_RECOVERY',matched:[true,false,false],canInferAbsence:false});});
it('distinguishes useful alternate links from expected-content recovery',()=>{expect(classifyRecovery(observed('<a href="/team">Our team</a>'),target,true).state).toBe('USEFUL_BUT_DIFFERENT_RECOVERY');});
it('does not call a loading message useful without an evidence candidate',()=>{expect(classifyRecovery(observed('<p>Loading...</p>'),target,false).state).toBe('NON_USEFUL_RENDER');});
it.each(['','<title>Empty</title><main></main>'])('classifies empty visible output: %s',html=>{expect(classifyRecovery(observed(html||' '),target,false).state).toBe('EMPTY_VISIBLE_OUTPUT');});
it('retains EMPTY_VISIBLE_DOM diagnostics despite failed status',()=>{expect(classifyRecovery({status:'BROWSER_FAILED',error:'EMPTY_VISIBLE_DOM'},target,false).state).toBe('EMPTY_VISIBLE_OUTPUT');});
it.each(['BROWSER_FAILED','BROWSER_TIMED_OUT'] as const)('does not admit diagnostic HTML after %s',status=>{expect(classifyRecovery({status,representation:'<p>Residential conveyancing. Our fees are £900.</p>'},target,true).state).toBe('FAILED_RENDER');});
it('does not count hidden text or a PDF label as observed PDF contents',()=>{expect(expectedMatches('<p hidden>Our fees are £900</p><a href="/fees.pdf">Pricing PDF</a>',target.url,target.expectedTexts,target.expectedLinks)).toEqual([false,false,true]);});
it('does not grant complete recovery with no expected observations',()=>{expect(classifyRecovery(observed('<p>Content</p>'),{...target,expectedTexts:[],expectedLinks:[]},false).state).toBe('NON_USEFUL_RENDER');});
it.each([
 ['https://example.com/app.js','script','FIRST_PARTY'],
 ['https://unpkg.com/aos@next/dist/aos.js','script','STATIC_LIBRARY'],
 ['https://cdn.contentful.com/spaces/example/entries?[redacted]','fetch','DYNAMIC_PUBLIC_API'],
 ['https://www.googletagmanager.com/gtag/js?[redacted]','script','TRACKING_ANALYTICS'],
 ['https://app.chatsguru.co/web.js','script','CHAT_WIDGET'],
 ['https://ad.doubleclick.net/ad','script','ADVERTISING'],
 ['https://unverified.example.org/resource','script','UNKNOWN_THIRD_PARTY']
])('records a descriptive dependency category without allowing access: %s',(url,resourceType,expected)=>{expect(dependencyCategory({url,resourceType,action:'FAILED'},target.url)).toBe(expected);});

it('samples distinct rule/context facts instead of overlapping extraction windows',()=>{
  const facts=[{text:'Our fixed fee is agreed.',rule:'PRICE-002'},{text:'In Scotland. Our fixed fee is agreed.',rule:'PRICE-002'},{text:'Our fixed fee is agreed.',rule:'PRICE-003'},{text:'Stage one is an initial examination.',rule:'PRICE-013'},{text:'Typically six weeks.',rule:'PRICE-014'}];
  expect(distinctReviewFacts(facts).map(f=>f.rule)).toEqual(['PRICE-002','PRICE-013','PRICE-014']);
});
it('bounds review facts and does not create candidates for missing evidence',()=>{
  expect(distinctReviewFacts([])).toEqual([]);
  expect(distinctReviewFacts([{text:'',rule:null},{text:'First',rule:'A'},{text:'Second',rule:'B'}],1)).toEqual([{text:'First',rule:'A'}]);
});
