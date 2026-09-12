import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { scanAndPersist } from '../src/snapshots/service.js';
import { terminalReport } from '../src/reporting/terminal.js';
import { changeReport } from '../src/reporting/changes.js';
import { FIXTURE_SITE, versionedWebsite } from '../tests/fixtures/milestone2.js';

await mkdir('reports/milestone2',{recursive:true});
const directory=await mkdtemp(resolve('reports/milestone2/scenario-'));
const database=join(directory,'watchlayer.db');
const repository=new SqliteRepository(database);
try {
  const first=await scanAndPersist(FIXTURE_SITE,repository,{fetcher:versionedWebsite('A'),recheckBudget:1});
  const second=await scanAndPersist(FIXTURE_SITE,repository,{fetcher:versionedWebsite('B'),recheckBudget:1});
  const report=changeReport(second.comparison!);
  console.log(`${terminalReport(first.scan)}\n\nFirst saved scan: ${first.snapshot.scanId}\n\n${report}\n\nValidation database: ${database}`);
  await writeFile(join(directory,'change-report.txt'),report+'\n');
  await writeFile(join(directory,'comparison.json'),JSON.stringify(second.comparison,null,2)+'\n');
  await writeFile(join(directory,'first-snapshot.json'),JSON.stringify(repository.get(first.snapshot.scanId),null,2)+'\n');
  await writeFile(join(directory,'second-snapshot.json'),JSON.stringify(repository.get(second.snapshot.scanId),null,2)+'\n');
} finally { repository.close(); }
