import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { PDF_LIMITS,type DocumentPage,type PdfStatus } from './types.js';
const require=createRequire(import.meta.url);
export const PDF_PARSER_VERSION=`pdfjs-dist@${(require('pdfjs-dist/package.json') as {version:string}).version}`;
export interface ParsedPdf {status:PdfStatus;pages:DocumentPage[];pageCount?:number;characterCount?:number;title?:string;errorCode?:string}
// An isolated Node worker gives CPU-bound parsing a real deadline. Only our fixed
// parser code runs here: PDF JavaScript, actions, attachments and URLs never execute.
const workerCode=String.raw`
const {parentPort,workerData}=require('node:worker_threads');
(async()=>{
 let task;
 try {
  const {getDocument}=await import(workerData.module);
  task=getDocument({data:new Uint8Array(workerData.bytes),isEvalSupported:false,disableFontFace:true,
    useSystemFonts:false,useWorkerFetch:false,isOffscreenCanvasSupported:false,isImageDecoderSupported:false,
    stopAtErrors:true,verbosity:0});
  const pdf=await task.promise;
  if(pdf.numPages>workerData.limits.pages)throw Object.assign(new Error(),{code:'PAGE_LIMIT'});
  const metadata=await pdf.getMetadata();
  if(metadata.info?.EncryptFilterName){parentPort.postMessage({status:'ENCRYPTED',pages:[],errorCode:'ENCRYPTED'});return;}
  const pages=[];let count=0;
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n);const content=await page.getTextContent();
   let text='';let lastY;
   for(const item of content.items){if(!('str' in item))continue;
    const y=item.transform?.[5];if(lastY!==undefined&&y!==undefined&&Math.abs(y-lastY)>2)text+='\n';
    text+=item.str+(item.hasEOL?'\n':' ');lastY=y;
   }
   text=text.normalize('NFC').replace(/[^\S\n]+/g,' ').split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
   count+=text.length;if(count>workerData.limits.characters)throw Object.assign(new Error(),{code:'TEXT_LIMIT'});
   if(text.includes('\uFFFD'))throw Object.assign(new Error(),{code:'TEXT_ENCODING'});
   pages.push({pageNumber:n,text});page.cleanup();
  }
  const letters=pages.reduce((sum,p)=>sum+(p.text.match(/[\p{L}\p{N}]/gu)||[]).length,0);
  parentPort.postMessage({status:letters>=20?'EXTRACTED':'NO_TEXT',pages,pageCount:pdf.numPages,characterCount:count,
    title:typeof metadata.info?.Title==='string'?metadata.info.Title.slice(0,240):undefined});
 }catch(e){parentPort.postMessage({status:e.name==='PasswordException'?'ENCRYPTED':e.code==='PAGE_LIMIT'||e.code==='TEXT_LIMIT'||e.code==='TEXT_ENCODING'?'UNSUPPORTED':'PARSE_FAILED',pages:[],errorCode:e.code||e.name||'PARSER_ERROR'});}
 finally{await task?.destroy();}
})().catch(()=>parentPort.postMessage({status:'PARSE_FAILED',pages:[],errorCode:'PARSER_ERROR'}));`;
export function parsePdf(bytes:Uint8Array):Promise<ParsedPdf>{
  return new Promise(resolve=>{
    const worker=new Worker(workerCode,{eval:true,workerData:{bytes,module:pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href,limits:PDF_LIMITS},resourceLimits:{maxOldGenerationSizeMb:192},stdout:true,stderr:true});
    // Resolve the package rather than depending on source versus compiled location.
    let finished=false;
    const done=(result:ParsedPdf)=>{if(finished)return;finished=true;clearTimeout(timer);void worker.terminate();resolve(result);};
    const timer=setTimeout(()=>done({status:'UNSUPPORTED',pages:[],errorCode:'PARSE_TIMEOUT'}),PDF_LIMITS.parseTimeoutMs);
    worker.on('message',done);worker.on('error',()=>done({status:'PARSE_FAILED',pages:[],errorCode:'WORKER_ERROR'}));
    worker.on('exit',()=>done({status:'PARSE_FAILED',pages:[],errorCode:'WORKER_EXIT'}));
    worker.stdout.resume();worker.stderr.resume();
  });
}
