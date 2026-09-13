import { mkdir,writeFile } from 'node:fs/promises';
import { negativeCases,runNegativeCase } from '../tests/fixtures/milestone6.js';
import { negativeMetrics } from './negative-metrics.js';
const rows:(typeof negativeCases[number]&{emitted:boolean;results:Awaited<ReturnType<typeof runNegativeCase>>['results']})[]=[];
for(const test of negativeCases){const report=await runNegativeCase(test);const results=report.results.filter(r=>r.ruleId===test.ruleId);rows.push({...test,emitted:results.some(r=>r.status==='POTENTIAL_ISSUE'),results});}
const output={schemaVersion:1,scope:'Controlled local longitudinal fixtures; not an estimate of live deployment precision',overall:negativeMetrics(rows),perRule:Object.fromEntries([...new Set(rows.map(r=>r.ruleId))].map(id=>[id,negativeMetrics(rows.filter(r=>r.ruleId===id))])),cases:rows};
await mkdir('reports/milestone6',{recursive:true});await writeFile('reports/milestone6/negative.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output.overall,null,2));
