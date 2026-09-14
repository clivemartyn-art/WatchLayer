import type { PdfReport } from './types.js';
export function pdfReport(report:PdfReport):string{
  const s=report.summary;
  return `PDF EXTRACTION\nDiscovered: ${s.discovered} | Attempted: ${s.attempted} | Extracted: ${s.extracted} | Skipped: ${s.skipped} | No text: ${s.noText} | Failures: ${s.failures}\nDownloaded: ${s.bytesDownloaded} bytes\n`+report.documents.map(d=>`${d.status} ${d.title||d.filename||d.requestedUrl}${d.pageCount!==undefined?` (${d.pageCount} pages)`:''}${d.duplicateOf?' [duplicate content]':''}\n  ${d.finalUrl??d.requestedUrl}\n  Linked from: ${d.referrers.map(r=>r.url).join(', ')}${d.errorCode?'\n  '+d.errorCode:''}`).join('\n')+'\nMachine-readable text only. Scanned/image-only PDFs remain unresolved; no OCR is performed.';
}
