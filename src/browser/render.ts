import {chromium,type BrowserServer,type Browser} from 'playwright';
import {createFetcher,USER_AGENT,type Response} from '../crawler/http.js';
import {normalize,sameDomain,publicAddress} from '../utils/urls.js';
import {isIP} from 'node:net';
import {BROWSER_LIMITS as L,type BrowserRenderer,type RenderOptions} from './types.js';
import {EXTRACT_VISIBLE_DOM} from './dom.js';
export function browserRequestUrl(raw:string,target:string):string {
  const url=normalize(raw),host=new URL(url).hostname.replace(/^\[|\]$/g,'');
  if(!sameDomain(url,target)||isIP(host)&&!publicAddress(host)||/^(?:localhost)$|\.(?:local|internal|lan|home|test|invalid)$/i.test(host))throw Error('BROWSER_NETWORK_POLICY');
  return url;
}
/** No route.continue: Chromium never owns the public network connection. */
export function createBrowserRenderer(options:RenderOptions={}):BrowserRenderer {
  return async(seed,target,allowed)=>{
    const began=Date.now();let server:BrowserServer|undefined,browser:Browser|undefined,closed=false,timer:ReturnType<typeof setTimeout>|undefined;
    const output:{requests:number;bytes:number;blockedRequests:number;scriptErrors:string[]}={requests:0,bytes:0,blockedRequests:0,scriptErrors:[]};
    const fetch=options.fetcher??createFetcher(target,100,5000);let navigationCount=0,redirects=0,resourceFailure=false,resourceError='';
    const task=async()=>{
      await allowed(browserRequestUrl(seed.finalUrl,target));
      server=await chromium.launchServer({host:'127.0.0.1',headless:true,chromiumSandbox:true,timeout:L.launchMs,proxy:{server:'http://127.0.0.1:9'},args:['--proxy-bypass-list=<-loopback>','--disable-background-networking','--disable-quic','--force-webrtc-ip-handling-policy=disable_non_proxied_udp']});
      if(closed){await server.kill();throw Error('BROWSER_TIMED_OUT');}
      browser=await chromium.connect(server.wsEndpoint(),{timeout:L.launchMs});
      const context=await browser.newContext({serviceWorkers:'block',acceptDownloads:false,userAgent:USER_AGENT,viewport:{width:1280,height:900},locale:'en-GB',timezoneId:'Europe/London',permissions:[]});
      await context.routeWebSocket('**/*',socket=>socket.close());
      const page=await context.newPage();context.on('page',other=>{if(other!==page)void other.close();});
      page.on('dialog',dialog=>void dialog.dismiss());page.on('download',download=>void download.cancel());
      page.on('pageerror',error=>{if(output.scriptErrors.length<5)output.scriptErrors.push(error.message.slice(0,240));});
      page.on('crash',()=>{resourceFailure=true;});
      let chain=Promise.resolve();
      await context.route('**/*',route=>{
        // Cap requests before queuing work, including a burst issued by one script.
        if(closed||output.requests>=L.requests){resourceFailure=true;closed=true;void page.close().catch(()=>{});return route.abort().catch(()=>{});}
        output.requests++;
        const run=async()=>{
          try{
            const request=route.request();
            if(closed||output.requests>L.requests)throw Error('REQUEST_LIMIT');
            const url=browserRequestUrl(request.url(),target),kind=request.resourceType();
            if(kind==='document'&&/\/(?:login|sign-in|account|dashboard|portal|checkout|wp-admin)(?:\/|$)/i.test(new URL(url).pathname))throw Error('ACCOUNT_ROUTE_EXCLUDED');
            if(request.method()!=='GET'||['image','media','font','websocket','eventsource','manifest','other'].includes(kind)||request.frame()!==page.mainFrame()||/google-analytics|doubleclick|facebook\.com\/tr|\/analytics\b|\/tracking\b/i.test(url)){output.blockedRequests++;await route.abort();return;}
            if(request.isNavigationRequest()&&++navigationCount>L.redirects+1)throw Error('REDIRECT_LIMIT');
            await allowed(url);
            let response:Response;
            if(url===seed.finalUrl&&navigationCount===1)response=seed;
            else {
              const remaining=L.totalBytes-output.bytes;if(remaining<=0)throw Error('TOTAL_BYTES_LIMIT');
              response=await fetch(url,{binary:true,maxBytes:Math.min(L.resourceBytes,remaining),beforeRequest:async next=>{browserRequestUrl(next,target);await allowed(next);},onBytes:n=>{output.bytes+=n;}});
            }
            if(closed)throw Error('CLOSED');
            browserRequestUrl(response.finalUrl,target);
            redirects+=response.redirects.length;if(redirects+navigationCount-1>L.redirects)throw Error('REDIRECT_LIMIT');
            if(response.finalUrl!==url){await route.fulfill({status:302,headers:{location:response.finalUrl}});return;}
            if(response.status>=400){resourceFailure=true;resourceError||='BROWSER_RESOURCE_HTTP_'+response.status;}
            const body=response.bytes?Buffer.from(response.bytes):Buffer.from(response.body);
            if(body.length>L.resourceBytes)throw Error('RESOURCE_BYTES_LIMIT');
            // No response cookies, downloads, workers or framed content are enabled.
            await route.fulfill({status:response.status,body,contentType:response.contentType,headers:{'content-security-policy':"worker-src 'none'; object-src 'none'; frame-src 'none'",'x-content-type-options':'nosniff'}});
          }catch(error){resourceFailure=true;resourceError||=error instanceof Error?error.message:'BROWSER_RESOURCE_FAILED';output.blockedRequests++;await route.abort().catch(()=>{});}
        };
        chain=chain.then(run,run);return chain;
      });
      await page.goto(seed.finalUrl,{waitUntil:'domcontentloaded',timeout:L.loadMs});
      await page.waitForTimeout(L.settleMs);
      const finalUrl=browserRequestUrl(page.url(),target);await allowed(finalUrl);
      if(resourceFailure||output.scriptErrors.length)throw Error(resourceError||'BROWSER_INCOMPLETE_EXECUTION');
      const representation=await page.evaluate<{html:string;duplicates:number}>(EXTRACT_VISIBLE_DOM+'('+JSON.stringify(L)+')');
      return {finalUrl,representation:representation.html,duplicatesSuppressed:representation.duplicates};
    };
    try{
      const result=await Promise.race([task(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{closed=true;reject(Error('BROWSER_TIMED_OUT'));},L.totalMs);})]);
      return {...output,...result,status:'RENDERED',durationMs:Date.now()-began};
    }catch(error){const message=error instanceof Error?error.message:String(error);return {...output,status:/timeout|timed.out/i.test(message)?'BROWSER_TIMED_OUT':'BROWSER_FAILED',error:message.slice(0,240),durationMs:Date.now()-began};}
    finally{closed=true;clearTimeout(timer);if(server)await server.kill().catch(()=>{});}
  };
}
