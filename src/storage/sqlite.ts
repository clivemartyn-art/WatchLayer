import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { migrate } from './migrations.js';
import type { SnapshotRepository } from './repository.js';
import type { Site, Snapshot } from '../snapshots/types.js';
import type { RuleRun } from '../rules/types.js';
import type { RuleRepository } from '../rules/repository.js';

export const DEFAULT_DATABASE = '.watchlayer/watchlayer.db';
export class SqliteRepository implements SnapshotRepository, RuleRepository {
  private readonly db: DatabaseSync;
  constructor(path = DEFAULT_DATABASE) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), {recursive: true});
    this.db = new DatabaseSync(path);
    try {
      this.db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
      migrate(this.db);
    } catch (error) { this.db.close(); throw error; }
  }
  findSite(canonicalDomain: string): Site | undefined {
    const row = this.db.prepare('SELECT site_id AS siteId, canonical_domain AS canonicalDomain, canonical_start_url AS canonicalStartUrl, first_seen AS firstSeen, last_scanned AS lastScanned, created_at AS createdAt FROM sites WHERE canonical_domain=?').get(canonicalDomain);
    return row as unknown as Site | undefined;
  }
  save(snapshot: Snapshot): void {
    const {pages, documents, forms, contacts, ...metadata} = snapshot;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare(`INSERT INTO sites VALUES (?,?,?,?,?,?) ON CONFLICT(canonical_domain) DO UPDATE SET
        canonical_start_url=CASE WHEN excluded.last_scanned>=sites.last_scanned THEN excluded.canonical_start_url ELSE sites.canonical_start_url END,
        last_scanned=MAX(sites.last_scanned,excluded.last_scanned)`).run(snapshot.siteId,snapshot.canonicalDomain,snapshot.canonicalStartUrl,snapshot.startedAt,snapshot.completedAt,snapshot.startedAt);
      const site = this.findSite(snapshot.canonicalDomain)!;
      if (site.siteId !== snapshot.siteId) throw new Error('Site identity changed during scan; retry the scan');
      this.db.prepare('INSERT INTO scans VALUES (?,?,?,?,?,?,?,?,?,?)').run(snapshot.scanId,snapshot.siteId,snapshot.startedAt,snapshot.completedAt,snapshot.status,snapshot.crawlLimit,Number(snapshot.comparisonEligible),snapshot.applicationVersion,snapshot.schemaVersion,JSON.stringify(metadata));
      const pageInsert = this.db.prepare('INSERT INTO page_observations VALUES (?,?,?,?)');
      for (const page of pages) pageInsert.run(snapshot.scanId,page.url,page.observationStatus,JSON.stringify(page));
      const docInsert = this.db.prepare('INSERT INTO document_observations VALUES (?,?,?,?)');
      for (const doc of documents) docInsert.run(snapshot.scanId,doc.url,doc.observationStatus,JSON.stringify(doc));
      const formInsert = this.db.prepare('INSERT INTO form_observations VALUES (?,?,?,?,?)');
      forms.forEach((form,i) => formInsert.run(snapshot.scanId,i,form.pageUrl,form.fingerprint,JSON.stringify(form)));
      const contactInsert = this.db.prepare('INSERT INTO contact_observations VALUES (?,?,?,?)');
      for (const kind of ['emails','phones'] as const) for (const contact of contacts[kind]) contactInsert.run(snapshot.scanId,kind,contact.value,JSON.stringify(contact));
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  get(scanId: string): Snapshot | undefined {
    const row = this.db.prepare('SELECT metadata_json FROM scans WHERE scan_id=?').get(scanId);
    if (!row) return undefined;
    const parseRows = (table: string, order: string) => this.db.prepare(`SELECT data_json FROM ${table} WHERE scan_id=? ORDER BY ${order}`).all(scanId).map(r => JSON.parse(String(r.data_json)));
    return {...JSON.parse(String(row.metadata_json)), pages: parseRows('page_observations','url'), documents: parseRows('document_observations','url'), forms: parseRows('form_observations','ordinal'), contacts: Object.fromEntries(['emails','phones'].map(kind => [kind,this.db.prepare('SELECT data_json FROM contact_observations WHERE scan_id=? AND kind=? ORDER BY value').all(scanId,kind).map(r => JSON.parse(String(r.data_json)))]))} as Snapshot;
  }
  history(canonicalDomain: string): Snapshot[] {
    return this.db.prepare(`SELECT scan_id FROM scans JOIN sites USING(site_id) WHERE canonical_domain=? ORDER BY completed_at DESC, scans.rowid DESC`).all(canonicalDomain).map(row => this.get(String(row.scan_id))!);
  }
  saveRuleRun(run: RuleRun): void {
    const {results,findings,...metadata}=run;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('INSERT INTO rule_runs VALUES (?,?,?,?,?,?,?,?,?)').run(run.runId,run.scanId,run.comparisonId,run.packId,run.packVersion,run.startedAt,run.completedAt,run.status,JSON.stringify(metadata));
      const insert=this.db.prepare('INSERT INTO rule_results VALUES (?,?,?,?,?,?,?,?,?,?,?)');
      results.forEach((r,i)=>insert.run(run.runId,i,r.ruleId,r.ruleVersion,r.status,r.confidence,r.severity,r.resource,JSON.stringify(r.evidence),r.explanation,JSON.stringify(r)));
      const finding=this.db.prepare('INSERT INTO findings VALUES (?,?,?)');
      for(const f of findings)finding.run(f.findingId,run.runId,JSON.stringify(f));
      this.db.exec('COMMIT');
    } catch(error){this.db.exec('ROLLBACK');throw error;}
  }
  ruleRuns(scanId: string): RuleRun[] {
    return this.db.prepare('SELECT run_id,data_json FROM rule_runs WHERE scan_id=? ORDER BY completed_at DESC,rowid DESC').all(scanId).map(row=>({...JSON.parse(String(row.data_json)),results:this.db.prepare('SELECT data_json FROM rule_results WHERE run_id=? ORDER BY ordinal').all(row.run_id!).map(r=>JSON.parse(String(r.data_json))),findings:this.db.prepare('SELECT data_json FROM findings WHERE run_id=? ORDER BY rowid').all(row.run_id!).map(r=>JSON.parse(String(r.data_json)))}));
  }
  saveFacts(scanId:string,namespace:string,version:string,data:unknown):void {
    this.db.prepare('INSERT INTO scan_fact_sets VALUES (?,?,?,?)').run(scanId,namespace,version,JSON.stringify(data));
  }
  facts<T>(scanId:string,namespace:string):T|undefined {
    const row=this.db.prepare('SELECT data_json FROM scan_fact_sets WHERE scan_id=? AND namespace=?').get(scanId,namespace);
    return row?JSON.parse(String(row.data_json)) as T:undefined;
  }
  savePackReport(runId:string,scanId:string,namespace:string,data:unknown):void {
    this.db.prepare('INSERT INTO pack_reports VALUES (?,?,?,?)').run(runId,scanId,namespace,JSON.stringify(data));
  }
  packReport<T>(scanId:string,namespace:string):T|undefined {
    const row=this.db.prepare('SELECT data_json FROM pack_reports WHERE scan_id=? AND namespace=? ORDER BY rowid DESC LIMIT 1').get(scanId,namespace);
    return row?JSON.parse(String(row.data_json)) as T:undefined;
  }
  close(): void { this.db.close(); }
}
