import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import type {LawReport} from '../src/lawwatch/types.js';
import {evidenceKey,sampleServiceReview,serviceCsv,type ServiceReviewItem,type Attribution} from './milestone10-review.js';
import {detected,observePdfPage,type Structure} from './milestone10-structure.js';
const source='reports/milestone9/corrected',fresh='reports/milestone10/live';
const output=process.argv[2]??'reports/milestone10/review-ready';
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
const old=await read('docs/Validation/milestone9/review-queue.json');
const sourceManifest=await read(join(source,'manifest.json'));
const freshManifest=await read(join(fresh,'manifest.json'));
const excluded=new Set<string>(old.items.map((i:any)=>evidenceKey(i.url,i.pageNumber,i.snippet)));
const excludedIds=new Set<string>(old.items.flatMap((i:any)=>[i.id,...i.duplicateIds]));
const items:ServiceReviewItem[]=[];
function attribution(rule:string,services:string[],matched:boolean):Attribution {
  if(rule.startsWith('LAW-U'))return 'FIRM_WIDE';
  if(services.length===1)return 'SERVICE_SPECIFIC';
  if(services.length>1)return 'MULTI_SERVICE';
  return matched?'NO_SERVICE_CONTEXT':'INSUFFICIENT_CONTEXT';
}
function tags(i:ServiceReviewItem):string[]{
  const t:string[]=[];if(i.structure.proximity==='NEAR')t.push('near_heading');if(i.structure.proximity==='DISTANT')t.push('distant_heading');
  if(i.sourceType==='PDF'&&i.detectedServices.length>1)t.push('mixed_pdf');
  if(/^LAW-U00[4-9]$/.test(i.ruleId))t.push('complaints');if(i.ruleId==='LAW-U001')t.push('regulatory_identifier');
  if(i.ruleId.startsWith('PRICE'))t.push('pricing');if(['PRICE-008','PRICE-009','PRICE-010'].includes(i.ruleId))t.push('vat');if(i.ruleId==='PRICE-002')t.push('charging_basis');
  if(i.structure.contentsLike)t.push('contents');if(i.structure.boilerplateOnly)t.push('boilerplate');
  if(/terms|policy|policies|general conditions/i.test(i.title))t.push('general_terms');
  if(!i.title||/^(?:document|untitled|microsoft word)/i.test(i.title))t.push('ambiguous_title');return t;
}
for(const file of(await readdir(source)).filter(f=>f.endsWith('.report.json')).sort()){
  const report=await read(join(source,file)) as LawReport;
  const evaluation=await read(join(source,file.replace('.report.json','.evaluation.json')));
  for(const a of report.adjudication?.items??[]){
    if(excludedIds.has(a.id))continue;
    const doc=report.pdf?.documents.find(d=>d.documentId===a.source.documentId);
    const text=doc?.pages.find(p=>p.pageNumber===a.source.pageNumber)?.text;
    const structure=observePdfPage(text,a.extracted.snippet);
    // Verified compound clauses retain their original bounded context, without invented headings.
    if(!structure.matched&&a.context.matched){structure.matched=true;structure.context=a.context.text;}
    const assignedServices=a.ruleId.startsWith('LAW-U')?[]:a.serviceType?[a.serviceType]:[];
    const i:ServiceReviewItem={id:'m10-'+a.id,evidenceKey:evidenceKey(a.source.url,a.source.pageNumber,a.extracted.snippet),firm:evaluation.firm,sourceType:'PDF',url:a.source.url,title:a.source.title,pageNumber:a.source.pageNumber,referrers:a.source.referrers.map(r=>r.url),ruleId:a.ruleId,snippet:a.extracted.snippet,context:structure.context,detectedServices:a.context.documentServices,assignedServices,automatedAttribution:attribution(a.ruleId,assignedServices,structure.matched),automatedAdjudication:a.state,affectedResults:report.results.filter(r=>r.ruleId===a.ruleId&&(!r.serviceType||assignedServices.includes(r.serviceType))).map(r=>({service:r.serviceType,status:r.status})),structure,tags:[],sourceHash:a.source.sha256};
    i.tags=tags(i);const lineServices=structure.candidateServiceLines.flatMap(detected);if(lineServices.some(s=>lineServices.filter(other=>other===s).length>1))i.tags.push('repeated_services');items.push(i);
  }
}
const live=await read(join(fresh,'summary.json'));if(live.completed!==8)throw new Error('Wait for the completed eight-firm fresh capture');
for(const file of(await readdir(fresh)).filter(f=>f.endsWith('.structure.json')).sort()){
  const report=await read(join(fresh,file.replace('.structure.json','.report.json'))) as LawReport;
  for(const s of await read(join(fresh,file))){
    if(s.ruleId.startsWith('LAW-U'))s.assignedServices=[];
    const key=evidenceKey(s.url,undefined,s.snippet);const structure=s.structure as Structure;
    const i:ServiceReviewItem={id:'m10-'+createHash('sha256').update(s.ruleId+'|'+key).digest('hex'),evidenceKey:key,firm:s.firm,sourceType:'HTML',url:s.url,title:s.title,referrers:[],ruleId:s.ruleId,snippet:s.snippet,context:structure.context,detectedServices:s.services,assignedServices:s.assignedServices,automatedAttribution:attribution(s.ruleId,s.assignedServices,structure.matched),automatedAdjudication:'NOT_ASSESSED',affectedResults:report.results.filter(r=>r.ruleId===s.ruleId&&(!r.serviceType||s.assignedServices.includes(r.serviceType))).map(r=>({service:r.serviceType,status:r.status})),structure,tags:[]};
    i.tags=tags(i);items.push(i);
  }
}
const sample=sampleServiceReview(items,excluded);
if(sample.sampleSize<60)throw new Error('Insufficient independent review candidates');
await mkdir(output,{recursive:false});
await writeFile(join(output,'queue.json'),JSON.stringify({...sample,humanReviewed:0,source,fresh,sourceManifest,freshManifest,captureKinds:{PDF:'Preserved M9 corpus',HTML:'Fresh M10 validation'},excludedM9EvidenceKeys:excluded.size,attributionDefinition:'Existing candidate service assignment; firm-wide denotes LAW-U rule scope, not proof of organisation ownership or rule support. Structural telemetry does not change these assignments.',limitations:['Not a random population sample.','PDF service-bearing lines are candidates, not verified headings.','Fresh HTML is separate from preserved PDF observations.','A multi-service assignment is an automated proposal, not independent evidence of shared applicability.','Structural heading buckets measure distance, not correctness.']},null,2)+'\n');
await writeFile(join(output,'service-review.csv'),serviceCsv(sample.items));
await writeFile(join(output,'service-review-with-automated.csv'),serviceCsv(sample.items,false));
await writeFile(join(output,'human-decisions.json'),'[]\n');
console.log(JSON.stringify({size:sample.sampleSize,coverage:sample.coverage},null,2));
