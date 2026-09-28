import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {load} from 'cheerio';
import {createFetcher,USER_AGENT} from '../src/crawler/http.js';
import {visibleText} from '../src/extractors/text.js';
const [input,output,confirmation]=process.argv.slice(2);
if(!input||!output||!confirmation)throw Error('Use candidates.json new-capture-directory new-confirmation.json');
const robotsParser=createRequire(import.meta.url)('robots-parser');
const bytes=await readFile(input),manifest=JSON.parse(bytes.toString()),targets=[];
await mkdir(output,{recursive:false});
const norm=(s:string)=>s.normalize('NFKC').replace(/[\u2018\u2019]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
for(const target of manifest.targets){
  const fetch=createFetcher(target.url,1000,10000);
  try{
    const robotsUrl=new URL('/robots.txt',target.url).href,robots=await fetch(robotsUrl);
    if(robots.status>=500||[401,403,429].includes(robots.status))throw Error('Robots unavailable');
    const policy=robotsParser(robotsUrl,robots.status===200?robots.body:'');
    const response=await fetch(target.url,{beforeRequest:async url=>{if(policy.isAllowed(url,USER_AGENT)===false)throw Error('Robots exclusion');}});
    await writeFile(join(output,target.id+'.static.json'),JSON.stringify(response,null,2)+'\n',{flag:'wx'});
    const text=visibleText(response.body),$=load(response.body);
    const links=$('a[href]').toArray().flatMap(e=>{try{return [{url:new URL($(e).attr('href')!,response.finalUrl).href,label:$(e).text().replace(/\s+/g,' ').trim()}];}catch{return [];}});
    const expectedTextPresent=target.expectedTexts.map((s:string)=>norm(text).includes(norm(s)));
    const expectedLinkPresent=target.expectedLinks.map((s:string)=>links.some(l=>l.url===s));
    const all=[...expectedTextPresent,...expectedLinkPresent].every(Boolean);
    targets.push({...target,label:response.status!==200?'OUT_OF_SCOPE':all?'STATIC_SUFFICIENT':'CONFIRMED_RENDER_GAP',confirmedAt:new Date().toISOString(),static:{status:response.status,finalUrl:response.finalUrl,textCharacters:text.length,htmlBytes:Buffer.byteLength(response.body),sha256:createHash('sha256').update(response.body).digest('hex'),expectedTextPresent,expectedLinkPresent,documents:links.filter(l=>/\.pdf(?:$|\?)/i.test(l.url)),capture:join(output,target.id+'.static.json')},limitation:'Raw HTML visibility cannot resolve external CSS; browser observation was separately recorded before execution.'});
    console.log(target.id+': '+targets.at(-1)!.label+'; text='+text.length+'; expected='+expectedTextPresent.join(','));
  }catch(error){targets.push({...target,label:'GAP_UNCERTAIN',error:error instanceof Error?error.message:String(error)});console.log(target.id+': GAP_UNCERTAIN');}
}
await writeFile(confirmation,JSON.stringify({...manifest,candidateSha256:createHash('sha256').update(bytes).digest('hex'),frozenAt:new Date().toISOString(),productionEdits:false,targets},null,2)+'\n',{flag:'wx'});
