import { mkdir,writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { negativeCases,runNegativeCase } from '../tests/fixtures/milestone6.js';
import { negativeMetrics } from './negative-metrics.js';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanLawWatch } from '../src/lawwatch/service.js';
import { pdfWebsite,PDF_SITE } from '../tests/fixtures/milestone7.js';
import { lawWatchReport } from '../src/lawwatch/report.js';
const directory='reports/milestone7';await mkdir(directory,{recursive:true});
const rows=[];for(const test of negativeCases){const report=await runNegativeCase(test);const results=report.results.filter(r=>r.ruleId===test.ruleId);rows.push({...test,emitted:results.some(r=>r.status==='POTENTIAL_ISSUE'),results});}
const metrics=negativeMetrics(rows);assert.equal(metrics.precision,1);assert.equal(metrics.falsePositives,0);
await writeFile(directory+'/negative.json',JSON.stringify({schemaVersion:1,scope:'Same M6 controlled removal fixtures, not a live precision estimate',overall:metrics,cases:rows},null,2));
const repo=new SqliteRepository(':memory:');try{const run=await scanLawWatch(PDF_SITE,repo,{fetcher:pdfWebsite(),recheckBudget:0});
 await writeFile(directory+'/fixture.report.json',JSON.stringify(run.lawwatch,null,2));await writeFile(directory+'/fixture.report.txt',lawWatchReport(run.lawwatch));await writeFile(directory+'/fixture.snapshot.json',JSON.stringify(run.snapshot,null,2));
 for(const r of [...run.lawwatch.results,...run.lawwatch.universalResults])assert(!/non.compliant|\bbreach\b|\billegal\b|\bcompliant\b/i.test(r.title+' '+r.explanation));
 console.log(JSON.stringify({negative:metrics,fixturePdf:run.snapshot.pdf?.summary,packVersion:run.lawwatch.packVersion},null,2));
}finally{repo.close();}
