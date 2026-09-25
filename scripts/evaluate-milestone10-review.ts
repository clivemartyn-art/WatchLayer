import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {attributeEvidence} from '../src/lawwatch/context/attribution.js';
import {parseServiceCsv,compareServiceReviews,type ServiceReviewItem} from './milestone10-review.js';
const output=process.argv[2];if(!output)throw new Error('Provide a new output directory');
const queue=JSON.parse(await readFile('docs/Validation/milestone10/review-queue.json','utf8'));
const decisions=parseServiceCsv(await readFile('docs/Validation/milestone10/clive-review-original.csv','utf8'));
// No reviewed expectations or firm names enter the production attribution policy.
const assessments=Object.fromEntries(queue.items.map((i:ServiceReviewItem)=>[i.id,attributeEvidence({ruleId:i.ruleId,url:i.url,title:i.title,snippet:i.snippet,sourceType:i.sourceType,...i.structure,context:i.context})]));
const before=compareServiceReviews(queue.items,decisions),after=compareServiceReviews(queue.items,decisions,assessments);
await mkdir(output,{recursive:false});
for(const [name,value] of Object.entries({before,after,decisions,assessments}))await writeFile(join(output,name+'.json'),JSON.stringify(value,null,2)+'\n');
console.log(JSON.stringify({before:{exact:before.exactAgreement,falseAssignments:before.falseServiceAssignment},after:{exact:after.exactAgreement,falseAssignments:after.falseServiceAssignment,firmWide:after.byExpectedAttribution.FIRM_WIDE,abstention:after.overConservativeNoContext}},null,2));
