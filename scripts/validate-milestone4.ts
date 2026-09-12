import { mkdir,mkdtemp,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import assert from 'node:assert/strict';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanLawWatch } from '../src/lawwatch/service.js';
import { lawWatchReport } from '../src/lawwatch/report.js';
import { lawWebsite } from '../tests/fixtures/lawwatch.js';
await mkdir('reports/milestone4',{recursive:true});const directory=await mkdtemp(resolve('reports/milestone4/scenario-'));const repo=new SqliteRepository(join(directory,'watchlayer.db'));
try{
  const first=await scanLawWatch('https://example.com/',repo,{fetcher:lawWebsite('removed','A')});
  await writeFile(join(directory,'healthy-report.txt'),lawWatchReport(first.lawwatch)+'\n');
  await writeFile(join(directory,'healthy-report.json'),JSON.stringify(first.lawwatch,null,2)+'\n');
  const {lawwatch}=await scanLawWatch('https://example.com/',repo,{fetcher:lawWebsite('removed','B')});
  assert(lawwatch.results.some(r=>r.ruleId==='LAW-C001'&&r.status==='POTENTIAL_ISSUE'));
  const report=lawWatchReport(lawwatch);assert(!/non.compliant|\bbreach\b|\billegal\b/i.test(report));
  await writeFile(join(directory,'lawwatch.json'),JSON.stringify(lawwatch,null,2)+'\n');await writeFile(join(directory,'lawwatch.txt'),report+'\n');console.log(report+'\n\nArtifacts: '+directory);
}finally{repo.close();}
