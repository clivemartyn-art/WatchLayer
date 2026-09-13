import { SqliteRepository } from '../../src/storage/sqlite.js';
import { scanLawWatch } from '../../src/lawwatch/service.js';
import { lawWebsite,LAW_SITE,strongPricing,complaintsHtml } from './lawwatch.js';
import { fixtureResponse } from './milestone2.js';
import type { LawReport } from '../../src/lawwatch/types.js';

export const falseComplaints=[
  ['data-protection','Data protection complaints procedure','Contact our data protection officer about your personal data. We investigate your complaint and respond.'],
  ['ico','ICO complaints','Contact the ICO if you are unhappy. They investigate your complaint.'],
  ['news/complaints','Client complaints procedure in the news','Contact our partner to complain. We investigate and respond.'],
  ['grievance','Employment grievance procedure','If employees complain, contact the manager. We investigate and respond.'],
  ['reviews','Client reviews','Clients complain that other firms are slow. Contact us for advice.'],
  ['complaints','Complaints procedure','Contact us if unhappy.'],
] as const;

export interface NegativeCase {id:string;ruleId:string;expectedIssue:boolean;kind:'removed'|'replacement'|'timeout'|'server'|'unobserved'|'healthy';status?:number}
export const negativeCases:NegativeCase[]=['LAW-C001','LAW-C002'].flatMap(ruleId=>[
  ...[404,410].map(status=>({id:ruleId+'-'+status,ruleId,expectedIssue:true,kind:'removed' as const,status})),
  ...(['replacement','timeout','server','unobserved','healthy'] as const).map(kind=>({id:ruleId+'-'+kind,ruleId,expectedIssue:false,kind})),
]);

/** Full local website and two real scan snapshots; no synthetic precomputed rule results. */
export async function runNegativeCase(test:NegativeCase):Promise<LawReport>{
  const repo=new SqliteRepository(':memory:');const base=lawWebsite();
  try{
    await scanLawWatch(LAW_SITE,repo,{fetcher:base});
    const target=test.ruleId==='LAW-C001'?'/pricing':'/complaints';
    const body=test.ruleId==='LAW-C001'?strongPricing:complaintsHtml;
    const result=await scanLawWatch(LAW_SITE,repo,{recheckBudget:test.kind==='unobserved'?0:20,fetcher:async(url,options)=>{
      const path=new URL(url).pathname;
      if(path===target){
        if(test.kind==='timeout')throw new Error('Controlled timeout');
        if(test.kind==='server')return fixtureResponse(url,'Service temporarily unavailable',503);
        if(test.kind==='removed'||test.kind==='replacement')return fixtureResponse(url,'This page is no longer available',test.status??410);
      }
      if(path==='/replacement')return fixtureResponse(url,body);
      const response=await base(url,options);
      if(test.kind==='unobserved')response.body=response.body.replace(new RegExp('<a href="'+target+'">[^<]*</a>','g'),'');
      if(test.kind==='replacement'&&path==='/')response.body+='<a href="/replacement">'+(test.ruleId==='LAW-C001'?'Residential conveyancing pricing':'Complaints Procedure')+'</a>';
      return response;
    }});
    return result.lawwatch;
  }finally{repo.close();}
}
