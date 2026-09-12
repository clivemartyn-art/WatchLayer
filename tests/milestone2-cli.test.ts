import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { runCli } from '../src/cli/run.js';
import { SqliteRepository } from '../src/storage/sqlite.js';
import { DATABASE_SCHEMA_VERSION } from '../src/storage/migrations.js';
const fixture=vi.hoisted(()=>({version:'A' as 'A'|'B'}));
vi.mock('../src/crawler/http.js',async importOriginal=>{
  const original=await importOriginal<typeof import('../src/crawler/http.js')>();
  const {versionedWebsite}=await import('./fixtures/milestone2.js');
  return {...original,createFetcher:()=>versionedWebsite(fixture.version)};
});
let dir:string;
let db:string;
let output:ReturnType<typeof vi.spyOn>;
beforeEach(()=>{dir=mkdtempSync(join(tmpdir(),'watchlayer-cli-'));db=join(dir,'history.db');fixture.version='A';output=vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'error').mockImplementation(()=>{});process.exitCode=0;});
afterEach(()=>{vi.restoreAllMocks();process.exitCode=0;rmSync(dir,{recursive:true,force:true});});
const text=()=>output.mock.calls.map((call:unknown[])=>String(call[0])).join('\n');
it('scans, persists, compares, lists history and exports JSON through the CLI',async()=>{
  await runCli('scan',['example.com','--db',db,'--compare']);expect(text()).toContain('No suitable previous scan');
  fixture.version='B';await runCli('scan',['example.com','--db',db,'--compare','--recheck-budget','1']);expect(text()).toContain('NOT OBSERVED — NOT REMOVED');
  output.mockClear();await runCli('history',['example.com','--db',db,'--json']);const history=JSON.parse(text());expect(history).toHaveLength(2);
  output.mockClear();await runCli('compare',['example.com','--db',db,'--json']);expect(JSON.parse(text()).currentScanId).toBe(history[0].scanId);
  output.mockClear();const file=join(dir,'export.json');await runCli('export-scan',[history[0].scanId,'--db',db,'--output',file]);expect(JSON.parse(readFileSync(file,'utf8')).scanId).toBe(history[0].scanId);expect(process.exitCode).toBe(0);
});
it('preserves the Milestone 1 JSON fields when persistence is disabled',async()=>{
  await runCli('scan',['example.com','--no-persist','--json']);const json=JSON.parse(text());expect(json.schemaVersion).toBe(1);expect(json.pages).toHaveLength(4);expect(json.snapshot).toBeUndefined();
});
it('returns a clean error for a nonexistent exported scan',async()=>{
  await runCli('export-scan',['missing','--db',db]);expect(process.exitCode).toBe(1);expect(console.error).toHaveBeenCalledWith('WatchLayer: Scan not found: missing');
});
it('does not silently compare incompatible persistence options',async()=>{
  await runCli('scan',['example.com','--no-persist','--compare']);expect(process.exitCode).toBe(1);expect(console.error).toHaveBeenCalledWith('WatchLayer: --compare requires persistence');
});
it('upgrades a populated version-one database without discarding history',async()=>{
  await runCli('scan',['example.com','--db',db]);const before=new SqliteRepository(db);const history=before.history('example.com');before.close();
  const raw=new DatabaseSync(db);
  for(const row of raw.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all())raw.exec(`DROP TRIGGER ${row.name}`);
  raw.exec('DROP TABLE pack_reports; DROP TABLE scan_fact_sets; DROP TABLE findings; DROP TABLE rule_results; DROP TABLE rule_runs; PRAGMA user_version=1');raw.close();
  const upgraded=new SqliteRepository(db);expect(upgraded.history('example.com')).toEqual(history);upgraded.close();
  const check=new DatabaseSync(db);expect(check.prepare('PRAGMA user_version').get()?.user_version).toBe(DATABASE_SCHEMA_VERSION);expect(()=>check.prepare('DELETE FROM scans').run()).toThrow(/immutable/);check.close();
});
