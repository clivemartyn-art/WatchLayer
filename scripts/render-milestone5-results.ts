import { readFile,writeFile } from 'node:fs/promises';
import type { aggregate } from './milestone5-metrics.js';
type Summary=ReturnType<typeof aggregate>&{completedFirms:number;discovery:Record<string,number>;unknownCauses:Record<string,number>;perRuleUnknownCauses:Record<string,Record<string,number>>;pdfUnknownCount:number;issueReview:unknown[];firms:{firm:string;coverage?:{pagesScanned:number};metrics:ReturnType<typeof aggregate>['overall']}[]};
const read=async(path:string)=>JSON.parse(await readFile(path,'utf8'));
const baseline:Summary=await read('reports/milestone5/baseline/summary.json');
const final:Summary=await read('reports/milestone5/final/summary.json');
if(baseline.completedFirms!==50||final.completedFirms!==50)throw new Error('Both complete 50-firm phases are required.');
const baselineManifest=await read('reports/milestone5/baseline/manifest.json');const finalManifest=await read('reports/milestone5/final/manifest.json');
const pct=(n:number|null)=>n===null?'Unavailable':(100*n).toFixed(2)+'%';
const b=baseline.overall,f=final.overall;
const reduction=b.unknownCount?1-f.unknownCount/b.unknownCount:null;
const table=(headers:string[],rows:(string|number)[][])=>['| '+headers.join(' | ')+' |','| '+headers.map(()=> '---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const parts=[
  '## Final cohort results',
  table(['Metric','Baseline','Final'],[
    ['Scored checks',b.eligibleChecks,f.eligibleChecks],['Exact agreement',pct(b.exactAgreement.rate),pct(f.exactAgreement.rate)],['Acceptable agreement',pct(b.acceptableAgreement.rate),pct(f.acceptableAgreement.rate)],
    ['UNKNOWN',`${b.unknownCount} (${pct(b.unknownRate)})`,`${f.unknownCount} (${pct(f.unknownRate)})`],['Human-confirmed PASS precision',pct(b.passPrecision),pct(f.passPrecision)],['PASS recall',pct(b.passRecall),pct(f.passRecall)],
    ['WARNING precision','Unavailable','Unavailable'],['WARNING–Review compatibility',pct(b.warningReviewCompatibility),pct(f.warningReviewCompatibility)],['Potential issues',b.potentialIssuePredictions,f.potentialIssuePredictions],['Potential-issue precision',pct(b.potentialIssuePrecision),pct(f.potentialIssuePrecision)],
    ['High-severity false-positive issue candidates',b.highSeverityFalsePositiveCount,f.highSeverityFalsePositiveCount],['Confirmed false-positive issue rate',pct(b.confirmedFalsePositiveRate),pct(f.confirmedFalsePositiveRate)],['Release gate',b.releaseGate,f.releaseGate],
  ]),
  `Relative UNKNOWN reduction: **${pct(reduction)}** (${b.unknownCount-f.unknownCount} fewer unknown checks). The 25% target is ${reduction!==null&&reduction>=0.25?'met':'not met'}. This is not a production-readiness claim.`,
  '## Discovery coverage',
  table(['Coverage measure','Baseline firms / pages','Final firms / pages'],Object.entries(final.discovery).map(([key,value])=>[key,baseline.discovery[key],value])),
  '## Baseline rule-by-rule metrics',
  table(['Rule','Human Pass','Machine PASS','UNKNOWN','Exact agreement','Confirmed PASS precision'],Object.entries(baseline.perRule).map(([id,m])=>[id,m.humanCounts.Pass,m.passPredictions,m.unknownCount,pct(m.exactAgreement.rate),pct(m.passPrecision)])),
  '## Final rule-by-rule metrics',
  table(['Rule','PASS','WARNING','UNKNOWN','Exact','Acceptable','PASS precision','PASS recall'],Object.entries(final.perRule).map(([id,m])=>[id,m.passPredictions,m.warningPredictions,m.unknownCount,pct(m.exactAgreement.rate),pct(m.acceptableAgreement.rate),pct(m.passPrecision),pct(m.passRecall)])),
  'Every row above represents 50 firms. Full per-rule denominators, human/machine label counts, warning compatibility, issue precision and false-positive rates are in the reproducible phase `summary.json` files. WARNING precision is unavailable for every rule because the workbook has no machine-warning ground truth.',
  '## Remaining UNKNOWN causes',
  table(['Primary cause','Checks','Share of remaining UNKNOWN'],Object.entries(final.unknownCauses).sort((a,b)=>b[1]-a[1]).map(([cause,count])=>[cause,count,pct(f.unknownCount?count/f.unknownCount:null)])),
  `PDF-associated UNKNOWN: **${final.pdfUnknownCount}/${f.unknownCount} (${pct(f.unknownCount?final.pdfUnknownCount/f.unknownCount:null)})**. This is the primary document-unavailable category with a relevant PDF link, not a prediction that PDF parsing would resolve every such check.`,
  table(['Rule','UNKNOWN causes (counts)'],Object.entries(final.perRuleUnknownCauses).map(([id,causes])=>[id,Object.entries(causes).sort((a,b)=>b[1]-a[1]).map(([name,count])=>`${name}: ${count}`).join('; ')])),
  '## Firm-level coverage and uncertainty',
  table(['Firm','Baseline pages','Final pages','Baseline UNKNOWN','Final UNKNOWN'],final.firms.map(firm=>{const old=baseline.firms.find(x=>x.firm===firm.firm)!;return [firm.firm,old.coverage?.pagesScanned??0,firm.coverage?.pagesScanned??0,old.metrics.unknownCount,firm.metrics.unknownCount];})),
  '## Reproduction and provenance',
  `Baseline production-source SHA-256: \`${baselineManifest.sourceSha256}\`. Final production-source SHA-256: \`${finalManifest.sourceSha256}\`. Settings and the workbook hash are captured in each phase manifest. The source hash includes the production source tree, not generated build output.`,
  '```text\nnpm run summarize:milestone5 -- reports/milestone5/baseline\nnpm run summarize:milestone5 -- reports/milestone5/final\nnode node_modules/tsx/dist/cli.mjs scripts/render-milestone5-results.ts\n```',
  'These commands re-score preserved reports without network access. A new live evaluation will naturally reflect subsequent website changes. The original immutable databases, per-firm reports and checkpoints are retained locally under the ignored `reports/milestone5/` directory.',
];
const path='docs/MILESTONE_5_BENCHMARK.md';const marker='<!-- BENCHMARK_RESULTS -->';const original=await readFile(path,'utf8');
await writeFile(path,original.split(marker)[0].trimEnd()+'\n\n'+marker+'\n\n'+parts.join('\n\n')+'\n');
console.log('Benchmark result tables updated without crawling or changing the workbook.');
