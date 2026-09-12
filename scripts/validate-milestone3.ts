import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanAndPersist } from '../src/snapshots/service.js';
import { runRules } from '../src/rules/engine.js';
import { findingsReport } from '../src/reporting/findings.js';
import { rulesWebsite } from '../tests/fixtures/milestone3.js';
await mkdir('reports/milestone3',{recursive:true});
const directory=await mkdtemp(resolve('reports/milestone3/scenario-'));
const repository=new SqliteRepository(join(directory,'watchlayer.db'));
try {
  const a=await scanAndPersist('https://example.com/',repository,{fetcher:rulesWebsite('A'),recheckBudget:1});
  const b=await scanAndPersist('https://example.com/',repository,{fetcher:rulesWebsite('B'),recheckBudget:1});
  const runs=runRules({current:b.snapshot,previous:a.snapshot});
  for(const [id,status,suffix] of [['WEB-U001','PASS','/'],['WEB-U004','POTENTIAL_ISSUE','/retired'],['WEB-U004','UNKNOWN','/services'],['WEB-U008','WARNING','/'],['WEB-U010','WARNING','/contact'],['WEB-U014','WARNING','/pricing'],['WEB-U006','WARNING','/sitemap.xml'],['WEB-U007','PASS','/robots.txt']])assert(runs[0].results.some(r=>r.ruleId===id&&r.status===status&&r.resource.endsWith(suffix)),`${id} ${status}`);
  runs.forEach(r=>repository.saveRuleRun(r));
  const report=findingsReport(runs);
  await writeFile(join(directory,'findings.txt'),report+'\n');
  await writeFile(join(directory,'findings.json'),JSON.stringify({schemaVersion:1,runs},null,2)+'\n');
  console.log(report+`\n\nScenario assertions passed. Artifacts: ${directory}`);
}finally{repository.close();}
