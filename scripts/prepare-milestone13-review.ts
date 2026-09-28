import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {attributionKey} from '../src/lawwatch/context/attribution.js';
import {visibleText} from '../src/extractors/text.js';
import type {FactSet,LawReport} from '../src/lawwatch/types.js';
import {reviewHash,renderedReviewContext,type RenderReviewItem} from './milestone12-review.js';
import {norm,distinctReviewFacts} from './milestone13-evidence.js';
const [source,output]=process.argv.slice(2);if(!source||!output)throw Error('Use completed-run-directory new-review-directory');
const summary=JSON.parse(await readFile(join(source,'summary.json'),'utf8'));
if(summary.completed!==summary.manifest.targets)throw Error('Run must be complete before review sampling');
const items:(RenderReviewItem&{expectedContentClassification:string;expectedTexts:string[];evidenceKind:string})[]=[];
for(const row of summary.rows){
  if(row.observation?.status!=='RENDERED'||!['COMPLETE_EXPECTED_RECOVERY','PARTIAL_EXPECTED_RECOVERY','USEFUL_BUT_DIFFERENT_RECOVERY'].includes(row.recovery?.state))continue;
  const data=JSON.parse(await readFile(join(source,row.id+'.json'),'utf8'));
  const facts:FactSet=JSON.parse(await readFile(join(source,row.id+'.facts.json'),'utf8'));
  const report:LawReport=JSON.parse(await readFile(join(source,row.id+'.report.json'),'utf8'));
  const representation=data.observation.representation,sourceHash=createHash('sha256').update(representation).digest('hex');
  if(sourceHash!==data.observation.domHash)throw Error('Rendered representation hash mismatch');
  const pages=facts.pages.filter(p=>p.observation?.domHash===sourceHash),staticPages=facts.pages.filter(p=>!p.observation&&p.sourceType!=='PDF');
  const newFacts=data.comparison.pages.flatMap((p:any)=>p.newEvidence).map((f:any)=>({text:f.snippet,rule:f.ruleId,kind:'EXTRACTED_FACT'}));
  const text=norm(visibleText(representation));
  const expected=data.target.expectedTexts.filter((s:string)=>text.includes(norm(s))).map((s:string)=>({text:s,rule:null,kind:'EXPECTED_TEXT'}));
  const links=data.comparison.pages.flatMap((p:any)=>p.newRelevantLinks).map((url:string)=>({text:url,rule:null,kind:'LINK_LOCATION_ONLY'}));
  const seen=new Set<string>();
  // Deterministic bounded sample: at most three distinct actual facts, two expected phrases, then links, max six/page.
  for(const candidate of [...distinctReviewFacts(newFacts),...expected.slice(0,2),...links].filter(c=>{const key=c.rule+'|'+c.text;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,6)){
    const context=renderedReviewContext(representation,candidate.text);
    if(context==='Context not located in retained visible text.')continue;
    const attribution=pages.map(p=>p.serviceAttributions?.[attributionKey(candidate.rule??'',candidate.text)]).find(Boolean);
    const duplicate=candidate.rule&&staticPages.some(p=>(p.signals[candidate.rule]??[]).some(f=>f.snippet===candidate.text));if(duplicate)continue;
    const id=reviewHash([row.id,sourceHash,candidate.rule,candidate.text]);
    items.push({id,organisation:data.target.organisation,url:data.target.url,jurisdiction:data.target.jurisdiction,sourceType:'RENDERED_DOM',sourceHash,evidenceText:candidate.text.slice(0,1000),context,targetRule:candidate.rule,targetServices:attribution?.services??[],staticEvidenceState:'NOT_PRESENT_IN_PAIRED_STATIC_FACTS_OR_LINKS',renderedEvidenceState:'RECOVERED_CANDIDATE_NOT_HUMAN_VALIDATED',automatedAdjudication:report.results.filter(r=>r.ruleId===candidate.rule).map(r=>({rule:r.ruleId,service:r.serviceType??null,status:r.status})),serviceAttribution:attribution??null,ruleResultChanged:data.comparison.resultChanges.some((c:any)=>c.ruleId===candidate.rule),expectedContentClassification:data.recovery.state,expectedTexts:data.target.expectedTexts,evidenceKind:candidate.kind});
  }
}
await mkdir(output,{recursive:false});const queueSha256=reviewHash(items);
const save=(name:string,value:unknown)=>writeFile(join(output,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
await save('automated-queue.json',{schemaVersion:1,source,queueSha256,items});
await save('reviewer-context.json',{schemaVersion:1,queueSha256,items:items.map(({automatedAdjudication,serviceAttribution,ruleResultChanged,expectedContentClassification,staticEvidenceState,renderedEvidenceState,...blind})=>blind)});
await save('human-decisions.json',{schemaVersion:1,queueSha256,decisions:items.map(i=>({itemId:i.id,label:'',usefulPublicEvidence:'',serviceContext:'',ruleSupport:'',reviewer:'',reviewedAt:'',notes:''}))});
await writeFile(join(output,'START_HERE.md'),'# M13 blind human review\n\nRead reviewer-context.json and complete a copy of human-decisions.json. Do not open automated-queue.json until judgments are saved. Keep item IDs and queue hash unchanged. Enter your name, actual review date and independent notes on every row. No expected answer is supplied.\n\nLabels: VALID_RENDERED_EVIDENCE, PARTIAL_OR_AMBIGUOUS, NOT_RELEVANT, WRONG_SERVICE, INSUFFICIENT_CONTEXT. usefulPublicEvidence: YES/NO/UNCERTAIN; serviceContext: CORRECT/WRONG/UNCERTAIN/NOT_APPLICABLE; ruleSupport: JUSTIFIED/UNJUSTIFIED/UNCERTAIN/NOT_APPLICABLE. Use NOT_APPLICABLE when no service/rule is proposed. A navigation or PDF link establishes a location only, not destination contents or a service offering. A partial observation does not establish absence. Scottish items test generic observation; do not treat them as E&W regulatory applicability. All outcomes are sample judgments, not live precision. Return the completed copy for validation.\n',{flag:'wx'});
console.log(items.length+' items prepared; no human decisions inferred.');
