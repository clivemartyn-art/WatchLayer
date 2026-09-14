import { createHash } from 'node:crypto';
import type { Fetcher } from '../crawler/http.js';
import { normalize,sameDomain } from '../utils/urls.js';
import { parsePdf,PDF_PARSER_VERSION,type ParsedPdf } from './parser.js';
import { PDF_LIMITS,type PdfReport,type DocumentReferrer,type PdfExtraction } from './types.js';
export interface PdfCandidate {url:string;referrers:DocumentReferrer[]}
export async function processPdfs(candidates:PdfCandidate[],target:string,fetch:Fetcher,allowed:(url:string)=>Promise<void>,enabled=true,parser=parsePdf):Promise<PdfReport>{
  const documents:PdfExtraction[]=[];let attempted=0,bytesDownloaded=0;
  const parsed=new Map<string,ParsedPdf>();const finalSeen=new Map<string,PdfExtraction>();
  const unique=new Map<string,PdfCandidate>();
  for(const candidate of candidates){let url=candidate.url;try{url=normalize(url);}catch{}
    const old=unique.get(url);if(old)old.referrers.push(...candidate.referrers);else unique.set(url,{...candidate,url,referrers:[...candidate.referrers]});}
  for(const candidate of unique.values()){
    const documentId='document_'+createHash('sha256').update(candidate.url).digest('hex').slice(0,24);
    const doc:PdfExtraction={documentId,requestedUrl:candidate.url,filename:'',status:'NOT_ATTEMPTED',pages:[],referrers:[...new Map(candidate.referrers.map(r=>[r.url+'\0'+r.anchor,r])).values()],parserVersion:PDF_PARSER_VERSION,normalizationVersion:1};documents.push(doc);
    try{
      const url=normalize(candidate.url);doc.filename=new URL(url).pathname.split('/').pop()??'';
      if(!sameDomain(url,target)){doc.status='BLOCKED_BY_POLICY';doc.errorCode='EXTERNAL_DOCUMENT';continue;}
      if(!enabled||attempted>=PDF_LIMITS.documents||bytesDownloaded>=PDF_LIMITS.totalBytes){doc.errorCode=!enabled?'DISABLED':'SCAN_BUDGET';continue;}
      const duplicate=finalSeen.get(url);if(duplicate){Object.assign(doc,{...duplicate,documentId,requestedUrl:url,referrers:doc.referrers,duplicateOf:duplicate.documentId});continue;}
      attempted++;await allowed(url);
      let transferred=0;const remaining=Math.min(PDF_LIMITS.bytesPerDocument,PDF_LIMITS.totalBytes-bytesDownloaded);
      const response=await fetch(url,{binary:true,maxBytes:remaining,beforeRequest:allowed,onBytes:n=>{transferred+=n;bytesDownloaded+=n;}});
      doc.finalUrl=normalize(response.finalUrl);doc.mimeType=response.contentType;doc.httpStatus=response.status;
      if(!sameDomain(doc.finalUrl,target)||new URL(doc.finalUrl).protocol!==new URL(url).protocol){doc.status='BLOCKED_BY_POLICY';doc.errorCode='UNSAFE_FINAL_URL';continue;}
      if(response.status<200||response.status>=300){doc.status='DOWNLOAD_FAILED';doc.errorCode=`HTTP_${response.status}`;continue;}
      const bytes=response.bytes??new Uint8Array();doc.byteSize=bytes.length;
      if(!transferred)bytesDownloaded+=bytes.length;
      if(bytes.length>remaining){doc.status='TOO_LARGE';doc.errorCode='BYTE_LIMIT';continue;}
      if(Buffer.from(bytes.subarray(0,5)).toString('ascii')!=='%PDF-'){doc.status='INVALID_PDF';doc.errorCode='PDF_SIGNATURE';continue;}
      doc.sha256=createHash('sha256').update(bytes).digest('hex');
      const old=documents.find(d=>d!==doc&&d.sha256===doc.sha256);
      let extraction=parsed.get(doc.sha256);
      if(!extraction){try{extraction=await parser(bytes);}catch{extraction={status:'PARSE_FAILED',pages:[],errorCode:'PARSER_EXCEPTION'};}parsed.set(doc.sha256,extraction);}
      Object.assign(doc,structuredClone(extraction));if(old)doc.duplicateOf=old.documentId;
      finalSeen.set(doc.finalUrl,doc);
    }catch(error){const message=error instanceof Error?error.message:'';const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
      doc.status=code==='TOO_LARGE'?'TOO_LARGE':/domain|protocol|robots|unsafe|public HTTP|ports|hostname|network address/i.test(message)?'BLOCKED_BY_POLICY':'DOWNLOAD_FAILED';
      doc.errorCode=code||(/robots/i.test(message)?'ROBOTS_POLICY':doc.status);
    }
  }
  return {schemaVersion:1,documents,summary:{discovered:documents.length,attempted,extracted:documents.filter(d=>d.status==='EXTRACTED').length,skipped:documents.filter(d=>['NOT_ATTEMPTED','BLOCKED_BY_POLICY'].includes(d.status)).length,bytesDownloaded,failures:documents.filter(d=>['TOO_LARGE','DOWNLOAD_FAILED','INVALID_PDF','PARSE_FAILED','ENCRYPTED','UNSUPPORTED'].includes(d.status)).length,noText:documents.filter(d=>d.status==='NO_TEXT').length}};
}
