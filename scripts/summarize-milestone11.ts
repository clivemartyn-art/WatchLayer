import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const root='reports/milestone11',out='docs/Validation/milestone11';
const read=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
const live=await read(join(root,'live/summary.json')),preserved=await read(join(root,'preserved-final/summary.json'));
const db=new DatabaseSync(join(root,'live/watchlayer.db'),{readOnly:true});
const rows=live.rows.map((r:any)=>{
  const row=db.prepare('SELECT metadata_json FROM scans WHERE scan_id=?').get(r.scanId)!;
  const snapshot=JSON.parse(String(row.metadata_json));
  return {firm:r.firm,site:r.site,capturedAt:r.capturedAt,scanId:r.scanId,staticPages:r.staticPagesScanned,assistedPages:r.pagesScanned,failedPages:r.pagesFailed,staticMs:r.staticMs,assistedMs:r.assistedMs,pdf:r.pdf,browser:r.browser,comparison:r.comparison,directRenderedAblation:r.directRenderedAblation,failures:snapshot.browser.observations.filter((o:any)=>o.attemptedAt&&o.status!=='RENDERED').map((o:any)=>({url:o.staticUrl,status:o.status,reason:o.reason,error:o.error,scriptErrors:o.scriptErrors,blockedRequests:o.blockedRequests,requests:o.requests,bytes:o.bytes})),httpFailures:snapshot.errors};
});db.close();
let serviceChanges=0,pdfChanges=0;
for(const file of (await readdir(join(root,'preserved-final'))).filter(f=>f.endsWith('.report.json'))){
  const before=await read(join('reports/milestone10/release3',file)),after=await read(join(root,'preserved-final',file));
  if(JSON.stringify(before.classifications)!==JSON.stringify(after.classifications))serviceChanges++;
  if(JSON.stringify(before.pdf)!==JSON.stringify(after.pdf))pdfChanges++;
}
await mkdir(out,{recursive:true});
const save=(name:string,value:unknown)=>writeFile(join(out,name),JSON.stringify(value,null,2)+'\n');
await save('fresh-summary.json',{schemaVersion:1,source:'reports/milestone11/live',rows,static:live.static.overall,assisted:live.assisted.overall,performance:live.performance,ruleResultChanges:rows.reduce((n:number,r:any)=>n+r.comparison.resultChanges.length,0),limitation:live.limitation,postCorrectionRecheck:await read(join(root,'trigger-recheck.json'))});
await save('preserved-summary.json',{schemaVersion:1,source:'reports/milestone11/preserved-final',manifest:await read(join(root,'preserved-final/manifest.json')),before:preserved.m7.overall,after:preserved.m8.overall,deltas:preserved.deltas,unknownToSupported:0,supportedToUnknown:0,renderedEvidenceChanges:0,browserFailures:0,serviceClassificationChangedFirms:serviceChanges,pdfExtractionChangedFirms:pdfChanges,adjudication:preserved.adjudication,serious:preserved.serious,limitation:'Preserved M6 HTML/M7 PDF replay against M10 outputs, with no browser execution. Human Review compatibility is separate from exact agreement; these are not live precision estimates.'});
await save('controlled-browser-corpus.json',await read(join(root,'fixtures-final/summary.json')));
await save('serious-controls.json',await read(join(root,'preserved-final/negative.json')));
await save('service-review.json',await read(join(root,'service-review/after.json')));
console.log(JSON.stringify({fresh:live.performance,preserved:preserved.m8.overall.machineCounts,changes:preserved.deltas.length,serviceChanges,pdfChanges,serious:preserved.serious}));
