import {readFile,writeFile} from 'node:fs/promises';
import {compareRenderReviews,reviewHash} from './milestone12-review.js';
const [queueFile,decisionsFile,output]=process.argv.slice(2);if(!queueFile||!decisionsFile||!output)throw Error('Use automated-queue.json human-decisions.json new-comparison.json');
const queue=JSON.parse(await readFile(queueFile,'utf8')),human=JSON.parse(await readFile(decisionsFile,'utf8'));
if(queue.schemaVersion!==1||human.schemaVersion!==1||queue.queueSha256!==reviewHash(queue.items)||human.queueSha256!==queue.queueSha256)throw Error('Review/source hash mismatch');
const result=compareRenderReviews(queue.items,human.decisions);
await writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));
