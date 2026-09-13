import type { LawReport } from '../src/lawwatch/types.js';
/** Exact snippet reuse is a review prompt; shared legal facts can be legitimate. */
export function reusedEvidence(results:LawReport['results']):{snippet:string;uses:{rule:string;service?:string;url:string}[]}[]{
  const byFact=new Map<string,{rule:string;service?:string;url:string}[]>();
  for(const r of results.filter(r=>r.status==='PASS'))for(const e of r.evidence){
    const observed=e.observed as {matches?:{url:string;fact:{snippet:string;confidence:string}}[]}|null;
    for(const match of observed?.matches??[]){if(match.fact.confidence!=='HIGH')continue;const uses=byFact.get(match.fact.snippet)??[];const use={rule:r.ruleId,service:r.serviceType,url:match.url};if(!uses.some(u=>u.rule===use.rule&&u.service===use.service&&u.url===use.url))uses.push(use);byFact.set(match.fact.snippet,uses);}
  }
  return [...byFact.entries()].filter(([,uses])=>new Set(uses.map(u=>u.rule+'|'+u.service)).size>1).map(([snippet,uses])=>({snippet,uses}));
}
