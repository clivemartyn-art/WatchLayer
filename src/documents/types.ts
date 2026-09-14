export const PDF_LIMITS={documents:25,bytesPerDocument:10_000_000,totalBytes:50_000_000,pages:200,characters:500_000,parseTimeoutMs:15_000} as const;
export const PDF_STATUSES=['EXTRACTED','NO_TEXT','TOO_LARGE','DOWNLOAD_FAILED','INVALID_PDF','PARSE_FAILED','ENCRYPTED','UNSUPPORTED','BLOCKED_BY_POLICY','NOT_ATTEMPTED'] as const;
export type PdfStatus=typeof PDF_STATUSES[number];
export interface DocumentReferrer {url:string;anchor:string}
export interface DocumentPage {pageNumber:number;text:string}
export interface PdfExtraction {
  documentId:string;requestedUrl:string;finalUrl?:string;filename:string;title?:string;mimeType?:string;
  byteSize?:number;sha256?:string;status:PdfStatus;errorCode?:string;httpStatus?:number;
  pageCount?:number;characterCount?:number;pages:DocumentPage[];referrers:DocumentReferrer[];
  parserVersion:string;normalizationVersion:1;duplicateOf?:string;
}
export interface PdfReport {schemaVersion:1;documents:PdfExtraction[];summary:{discovered:number;attempted:number;extracted:number;skipped:number;bytesDownloaded:number;failures:number;noText:number}}
/** Transport-independent text with an exact, immutable source locator. */
export interface AnalysisSource {sourceType:'HTML'|'PDF';url:string;title:string;text:string;pageNumber?:number;documentId?:string;sha256?:string;referrers?:DocumentReferrer[]}
