import { readFile,readdir,writeFile,mkdir } from 'node:fs/promises';
import { join,resolve } from 'node:path';
import type { LawReport } from '../src/lawwatch/types.js';
import { benchmarkServices,readBenchmark } from './lawwatch-benchmark.js';
import { reusedEvidence } from './lawwatch-adjudication.js';
const directory=resolve(process.argv[2]??'reports/milestone5/final');
// Optional human decisions never modify the workbook or an immutable rule run.
const decisionPath=process.argv[3];
const decisions:Record<string,{verdict:'SUPPORTED'|'FALSE_PASS'|'NEEDS_REVIEW';reviewer:string;reason:string}>=decisionPath?JSON.parse(await readFile(decisionPath,'utf8')):{};
for(const d of Object.values(decisions))if(!['SUPPORTED','FALSE_PASS','NEEDS_REVIEW'].includes(d.verdict)||!d.reviewer?.trim()||!d.reason?.trim())throw new Error('Each adjudication needs verdict, reviewer and reason');
const benchmark=readBenchmark();const rows:{key:string;firm:string;ruleId:string;human:string;verdict:string;reviewer:string|null;reason:string;flags:string[];sharedSourceWith:{rule:string;service?:string}[];evidence:LawReport['results'][number]['evidence']}[]=[];
const reuseByFirm:Record<string,ReturnType<typeof reusedEvidence>>={};
for(const file of (await readdir(directory)).filter(f=>f.endsWith('.evaluation.json')).sort()){
  const evaluation=JSON.parse(await readFile(join(directory,file),'utf8'));if(!evaluation.checks)continue;
  const report:LawReport=JSON.parse(await readFile(join(directory,file.replace('.evaluation.json','.report.json')),'utf8'));
  const services=benchmarkServices(benchmark.firms.find(f=>f.firm===evaluation.firm)!.service);
  reuseByFirm[evaluation.firm]=reusedEvidence(report.results);
  for(const check of evaluation.checks.filter((c:{machine:string})=>c.machine==='PASS')){
    const results=report.results.filter(r=>r.ruleId===check.ruleId&&(!r.serviceType||services.includes(r.serviceType)));
    const evidence=results.flatMap(r=>r.evidence);
    const key=evaluation.firm+'|'+check.ruleId;const decision=decisions[key];
    const text=JSON.stringify(evidence);const flags:string[]=[];
    if(check.human!=='Pass')flags.push('HUMAN_REVIEW_NOT_CONFIRMATION');
    if(check.ruleId==='LAW-U004'&&/data.breach|data.protection|privacy|\/news\/|\/blog\//i.test(text))flags.push('MIXED_COMPLAINT_CONTEXT');
    if(check.ruleId.startsWith('PRICE')&&results.length>1)flags.push('MULTI_SERVICE_AGGREGATION');
    if(check.ruleId.startsWith('PRICE')&&/footer|navigation/.test(text)&&!['PRICE-016','PRICE-017'].includes(check.ruleId))flags.push('GLOBAL_TEXT_REVIEW');
    if(reuseByFirm[evaluation.firm].some(r=>r.uses.some(u=>u.rule===check.ruleId)&&new Set(r.uses.map(u=>u.service)).size>1))flags.push('CROSS_SERVICE_SNIPPET_REUSE');
    const reuse=report.results.filter(r=>r.status==='PASS'&&r.ruleId!==check.ruleId&&r.evidence.some(e=>e.url&&evidence.some(other=>other.url===e.url))).map(r=>({rule:r.ruleId,service:r.serviceType}));
    rows.push({key,firm:evaluation.firm,ruleId:check.ruleId,human:check.human,verdict:decision?.verdict??(check.human==='Pass'?'BENCHMARK_CONFIRMED':'NEEDS_REVIEW'),reviewer:decision?.reviewer??null,reason:decision?.reason??flags[0]??'HUMAN_PASS',flags,sharedSourceWith:reuse,evidence});
  }
}
const perRule=Object.fromEntries(Object.keys(benchmark.firms[0].rules).map(id=>{const group=rows.filter(r=>r.ruleId===id);const confirmed=group.filter(r=>r.human==='Pass').length;const falsePass=group.filter(r=>r.verdict==='FALSE_PASS').length;return [id,{machinePass:group.length,humanConfirmed:confirmed,falsePass,unresolved:group.filter(r=>r.verdict==='NEEDS_REVIEW').length,passPrecision:group.length?confirmed/group.length:null,adjudicatedPrecision:group.some(r=>r.verdict==='SUPPORTED'||r.verdict==='FALSE_PASS')?group.filter(r=>r.verdict==='SUPPORTED').length/group.filter(r=>r.verdict==='SUPPORTED'||r.verdict==='FALSE_PASS').length:null,primaryDisagreementReason:group.find(r=>r.human!=='Pass')?.reason??null}];}));
for(const key of Object.keys(decisions))if(!rows.some(r=>r.key===key))throw new Error('Decision does not match a PASS row: '+key);
const firms=Object.keys(reuseByFirm).map(firm=>({firm,passCount:rows.filter(r=>r.firm===firm).length,unconfirmedPass:rows.filter(r=>r.firm===firm&&r.human!=='Pass').length,reusedSnippets:reuseByFirm[firm]})).sort((a,b)=>b.unconfirmedPass-a.unconfirmedPass);
const output={schemaVersion:1,benchmarkSha256:benchmark.sha256,sourceDirectory:directory,notes:'Flags and shared URLs nominate review, not errors. Human Review is not WARNING. False PASS counts include explicit reviewer decisions only; unresolved rows are not declared correct.',perRule,firms,rows};
await mkdir('reports/milestone6',{recursive:true});const path=join('reports/milestone6',directory.includes('milestone5')?'m5-adjudication.json':'m6-adjudication.json');await writeFile(path,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({rows:rows.length,unresolved:rows.filter(r=>r.verdict==='NEEDS_REVIEW').length,perRule},null,2));
