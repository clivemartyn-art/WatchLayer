import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {createFetcher,USER_AGENT} from '../src/crawler/http.js';
import {visibleText} from '../src/extractors/text.js';
const robotsParser=createRequire(import.meta.url)('robots-parser') as (url:string,body:string)=>{isAllowed(url:string,agent:string):boolean|undefined};
const [output,path='docs/Validation/milestone12/target-candidates.json',manifestOutput='docs/Validation/milestone12/confirmed-targets.json']=process.argv.slice(2);if(!output)throw Error('Provide a new raw-capture directory, optionally a candidate manifest and a new confirmation file.');
await mkdir(output,{recursive:false});
const bytes=await readFile(path),manifest=JSON.parse(bytes.toString());
const rows=[];
for(const target of manifest.targets){
  const fetch=createFetcher(target.url,1000,10000),robotsUrl=new URL('/robots.txt',target.url).href;
  try{
    const robots=await fetch(robotsUrl);if(robots.status>=500||[401,403,429].includes(robots.status))throw Error('Robots unavailable');
    const policy=robotsParser(robotsUrl,robots.status===200?robots.body:'');
    const response=await fetch(target.url,{beforeRequest:async url=>{if(policy.isAllowed(url,USER_AGENT)===false)throw Error('Robots exclusion');}});
    await writeFile(join(output,target.id+'.static.json'),JSON.stringify(response,null,2)+'\n',{flag:'wx'});
    const text=visibleText(response.body),normalize=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
    const absent=!normalize(text).includes(normalize(target.expectedText));
    const label=response.status!==200?'OUT_OF_SCOPE':absent?'CONFIRMED_RENDER_GAP':'STATIC_ALREADY_SUFFICIENT';
    rows.push({...target,label,confirmedAt:new Date().toISOString(),staticStatus:response.status,staticTextCharacters:text.length,staticHtmlBytes:Buffer.byteLength(response.body),staticSha256:createHash('sha256').update(response.body).digest('hex'),expectedTextAbsentFromStatic:absent,staticExcerpt:text.slice(0,600),staticCapture:join(output,target.id+'.static.json'),independentBrowserObservation:target.visibleContext});
    console.log(target.id+': '+label+'; static text '+text.length+' characters');
  }catch(error){rows.push({...target,label:'GAP_UNCERTAIN',error:error instanceof Error?error.message:String(error)});}
}
await writeFile(manifestOutput,JSON.stringify({...manifest,candidateManifestSha256:createHash('sha256').update(bytes).digest('hex'),targets:rows,productionChangesDuringConfirmation:false},null,2)+'\n',{flag:'wx'});
