import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {compareReviews,readReviewCsv} from './milestone9-review.js';
const [queuePath,decisionPath,output]=process.argv.slice(2);if(!queuePath||!decisionPath||!output)throw new Error('Usage: compare:milestone9-review -- queue.json decisions.json-or-csv new-output.json');
if([queuePath,decisionPath].some(p=>resolve(p)===resolve(output)))throw new Error('Output must be separate from inputs');
const queue=JSON.parse(await readFile(queuePath,'utf8')),text=await readFile(decisionPath,'utf8'),decisions=decisionPath.endsWith('.csv')?readReviewCsv(text):JSON.parse(text);
if(!Array.isArray(decisions))throw new Error('Expected human decision array');const result=compareReviews(queue.items,decisions);
await writeFile(output,JSON.stringify({...result,sourceManifest:queue.sourceManifest},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({humanReviewed:result.humanReviewed,exactAgreement:result.exactAgreement,falseSupportRate:result.falseSupportRate,falseRejectionRate:result.falseRejectionRate},null,2));
