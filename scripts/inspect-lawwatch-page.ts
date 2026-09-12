import { createRequire } from 'node:module';
import { load } from 'cheerio';
import { createFetcher,USER_AGENT } from '../src/crawler/http.js';
import { extractLawFacts } from '../src/lawwatch/extract.js';
import { visibleText } from '../src/extractors/text.js';
const input=process.argv[2];if(!input)throw new Error('Supply one public URL for a bounded manual diagnostic (not benchmark discovery seeding).');
const parse=createRequire(import.meta.url)('robots-parser');const fetch=createFetcher(input,1000);const policies=new Map();
async function allowed(url:string){const origin=new URL(url).origin;if(!policies.has(origin)){const r=await fetch(origin+'/robots.txt');if(r.status!==404&&(r.status<200||r.status>=300))throw new Error('Robots unavailable');policies.set(origin,parse(origin+'/robots.txt',r.status===404?'':r.body));}if(policies.get(origin).isAllowed(url,USER_AGENT)===false)throw new Error('Robots exclusion');}
const response=await fetch(input,{beforeRequest:allowed});const $=load(response.body);const text=visibleText(response.body,true);const facts=extractLawFacts(response);
console.log(JSON.stringify({url:response.finalUrl,status:response.status,title:$('title').text(),h1:$('h1').map((_,e)=>$(e).text()).get(),textLength:text.length,yearFragments:[...text.matchAll(/.{0,100}\b(?:2018|2019)\b.{0,100}/g)].map(m=>m[0]).slice(0,8),pricingFragments:text.split('\n').filter(s=>/£|\bVAT\b/.test(s)).slice(0,8).map(s=>s.slice(0,240)),imageCount:$('img').length,pricing:facts?.pricing,services:facts?.services.filter(s=>s.state.startsWith('DETECTED')),signals:facts?Object.fromEntries(Object.entries(facts.signals).map(([k,v])=>[k,v.length])):null},null,2));
