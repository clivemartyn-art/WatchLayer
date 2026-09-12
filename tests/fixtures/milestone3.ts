import type { Fetcher } from '../../src/crawler/http.js';
import { versionedWebsite, fixtureResponse } from './milestone2.js';
export function rulesWebsite(version:'A'|'B'):Fetcher {
  const base=versionedWebsite(version);
  return async(url,options)=>{
    const path=new URL(url).pathname;
    let response=await base(url,options);
    if(path==='/')response.body+='<a href="/retired">Retired service</a>';
    if(path==='/retired')response=fixtureResponse(url,version==='A'?'<title>Retired service</title><p>Available service</p>':'',version==='A'?200:404);
    if(path==='/pricing'&&version==='B')response.body='<title>Pricing</title><p>'+Array.from({length:20},(_,i)=>`word${i}`).join(' ')+'</p>';
    response.tls={authorized:true,validTo:'2030-01-01T00:00:00Z'};
    return response;
  };
}
