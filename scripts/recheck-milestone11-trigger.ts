import {writeFile} from 'node:fs/promises';
import {scan} from '../src/crawler/scan.js';
const output=process.argv[2];if(!output)throw Error('Provide a new JSON file. Rechecks the one public archive page from the fresh M11 sample.');
const url='https://www.stephens-scown.co.uk/tag/customer-service/';
const result=await scan(url,{maxPages:1,delayMs:1000,browserFallback:true,pdfExtraction:false});
await writeFile(output,JSON.stringify({capturedAt:new Date().toISOString(),url,summary:result.summary,browser:result.browser,errors:result.errors,limitation:'One bounded post-correction observation; not an additional independent firm or an accuracy estimate.'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({pages:result.summary.pagesScanned,attempts:result.browser?.observations.filter(o=>o.attemptedAt).length,reasons:result.browser?.observations.map(o=>o.reason)}));
