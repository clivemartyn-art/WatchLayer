/** Read-only metadata investigation. Never used by the production browser. */
import https from 'node:https';
import {writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolvePublic} from '../src/utils/urls.js';
const output=process.argv[2];if(!output)throw Error('Provide a new JSON output path');
// Exact resources observed in preserved failed browser requests; no APIs or trackers.
const urls=['https://unpkg.com/aos@next/dist/aos.js','https://unpkg.com/aos@next/dist/aos.css','https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css','https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js','https://code.jquery.com/jquery-3.5.1.slim.min.js'];
const rows=[];
for(const raw of urls){
  const url=new URL(raw);let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    const addresses=await Promise.race([resolvePublic(url.hostname),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('DNS_TIMEOUT')),5000);})]).finally(()=>clearTimeout(timer));
    const address=addresses[0];
    const result=await new Promise<object>((resolve,reject)=>{
      const req=https.request(url,{method:'GET',agent:false,signal:AbortSignal.timeout(5000),headers:{'user-agent':'WatchLayer/0.2 library metadata investigation','accept-encoding':'identity'},lookup:(_host,options,cb)=>{if(options.all)(cb as unknown as (err:null,records:typeof addresses)=>void)(null,[address]);else cb(null,address.address,address.family);}},res=>{
        const metadata={status:res.statusCode,contentType:res.headers['content-type'],location:res.headers.location??null,setsCookie:Boolean(res.headers['set-cookie']),cacheControl:res.headers['cache-control']??null};
        if((res.statusCode??0)>=300&&(res.statusCode??0)<400){res.destroy();resolve({...metadata,redirectFollowed:false,bytes:0});return;}
        const hash=createHash('sha256');let bytes=0;
        res.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>256000){req.destroy(Error('BYTE_LIMIT'));return;}hash.update(chunk);});
        res.on('error',reject);res.on('end',()=>resolve({...metadata,redirectFollowed:false,bytes,sha256:hash.digest('hex')}));
      });req.on('error',reject);req.end();
    });rows.push({url:raw,...result});
  }catch(error){rows.push({url:raw,error:error instanceof Error?error.message:'FAILED'});}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
await writeFile(output,JSON.stringify({schemaVersion:1,observedAt:new Date().toISOString(),method:'GET; validated public DNS pinned to connection; HTTPS; no cookies, credentials, referrer or query; 256KB/5s bound; no redirects followed; bytes hashed but never executed or retained',rows},null,2)+'\n',{flag:'wx'});
