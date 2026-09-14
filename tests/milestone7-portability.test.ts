import { expect,it } from 'vitest';
import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { textPdf } from './fixtures/milestone7.js';
it('extracts text without the optional native canvas package',async()=>{
 const module=pathToFileURL(createRequire(import.meta.url).resolve('pdfjs-dist/legacy/build/pdf.mjs')).href;
 const text=await new Promise<string>((resolve,reject)=>{
  const worker=new Worker(String.raw`
   const {workerData,parentPort}=require('node:worker_threads');
   const Module=require('node:module'),original=Module._load;
   Module._load=function(id,...args){if(id==='@napi-rs/canvas')throw new Error('Optional native canvas unavailable in this portability test');return original.call(this,id,...args);};
   (async()=>{const {getDocument}=await import(workerData.module);const task=getDocument({data:new Uint8Array(workerData.bytes),isEvalSupported:false,disableFontFace:true,useSystemFonts:false,useWorkerFetch:false,verbosity:0});const doc=await task.promise;const page=await doc.getPage(1);const content=await page.getTextContent();parentPort.postMessage(content.items.filter(i=>'str' in i).map(i=>i.str).join(' '));await task.destroy();})().catch(e=>{throw e;});
  `,{eval:true,workerData:{module,bytes:textPdf(['Portable machine-readable PDF text.'])},stdout:true,stderr:true});
  const timer=setTimeout(()=>{void worker.terminate();reject(new Error('Portability check timed out'));},15000);
  worker.on('message',text=>{clearTimeout(timer);void worker.terminate();resolve(text);});worker.on('error',e=>{clearTimeout(timer);void worker.terminate();reject(e);});worker.stdout.resume();worker.stderr.resume();
 });expect(text).toContain('Portable machine-readable PDF text.');
},20000);
