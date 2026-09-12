import type { DatabaseSync } from 'node:sqlite';

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE sites (
        site_id TEXT PRIMARY KEY, canonical_domain TEXT NOT NULL UNIQUE,
        canonical_start_url TEXT NOT NULL, first_seen TEXT NOT NULL,
        last_scanned TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE scans (
        scan_id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES sites(site_id),
        started_at TEXT NOT NULL, completed_at TEXT NOT NULL, status TEXT NOT NULL,
        crawl_limit INTEGER NOT NULL, comparison_eligible INTEGER NOT NULL,
        application_version TEXT NOT NULL, schema_version INTEGER NOT NULL,
        metadata_json TEXT NOT NULL
      );
      CREATE INDEX scan_history ON scans(site_id, completed_at DESC, scan_id DESC);
      CREATE INDEX eligible_history ON scans(site_id, comparison_eligible, completed_at DESC);
      CREATE TABLE page_observations (
        scan_id TEXT NOT NULL REFERENCES scans(scan_id), url TEXT NOT NULL,
        observation_status TEXT NOT NULL, data_json TEXT NOT NULL, PRIMARY KEY(scan_id,url)
      );
      CREATE TABLE document_observations (
        scan_id TEXT NOT NULL REFERENCES scans(scan_id), url TEXT NOT NULL,
        observation_status TEXT NOT NULL, data_json TEXT NOT NULL, PRIMARY KEY(scan_id,url)
      );
      CREATE TABLE form_observations (
        scan_id TEXT NOT NULL REFERENCES scans(scan_id), ordinal INTEGER NOT NULL,
        page_url TEXT NOT NULL, fingerprint TEXT NOT NULL, data_json TEXT NOT NULL,
        PRIMARY KEY(scan_id,ordinal)
      );
      CREATE INDEX forms_by_page ON form_observations(scan_id,page_url);
      CREATE TABLE contact_observations (
        scan_id TEXT NOT NULL REFERENCES scans(scan_id), kind TEXT NOT NULL,
        value TEXT NOT NULL, data_json TEXT NOT NULL, PRIMARY KEY(scan_id,kind,value)
      );
    `,
  },
  {
    version: 2,
    sql: ['scans','page_observations','document_observations','form_observations','contact_observations'].flatMap(table => ['UPDATE','DELETE'].map(operation => `
      CREATE TRIGGER immutable_${table}_${operation.toLowerCase()} BEFORE ${operation} ON ${table}
      BEGIN SELECT RAISE(ABORT, 'Historical scans are immutable'); END;
    `)).join('\n'),
  },
  {
    version: 3,
    sql: `CREATE TABLE rule_runs (
      run_id TEXT PRIMARY KEY, scan_id TEXT NOT NULL REFERENCES scans(scan_id),
      comparison_id TEXT, pack_id TEXT NOT NULL, pack_version TEXT NOT NULL,
      started_at TEXT NOT NULL, completed_at TEXT NOT NULL, status TEXT NOT NULL, data_json TEXT NOT NULL
    );
    CREATE INDEX rule_runs_scan ON rule_runs(scan_id,completed_at DESC);
    CREATE TABLE rule_results (
      run_id TEXT NOT NULL REFERENCES rule_runs(run_id), ordinal INTEGER NOT NULL,
      rule_id TEXT NOT NULL, rule_version TEXT NOT NULL, state TEXT NOT NULL,
      confidence TEXT NOT NULL, severity TEXT NOT NULL, resource TEXT NOT NULL,
      evidence_json TEXT NOT NULL, explanation TEXT NOT NULL, data_json TEXT NOT NULL,
      PRIMARY KEY(run_id,ordinal)
    );
    CREATE TABLE findings (
      finding_id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES rule_runs(run_id),
      data_json TEXT NOT NULL
    );` + ['rule_runs','rule_results','findings'].flatMap(table=>['UPDATE','DELETE'].map(op=>`
      CREATE TRIGGER immutable_${table}_${op.toLowerCase()} BEFORE ${op} ON ${table}
      BEGIN SELECT RAISE(ABORT, 'Historical rule results are immutable'); END;
    `)).join('\n'),
  },
];
migrations.push({version:4,sql:`
  CREATE TABLE scan_fact_sets (scan_id TEXT NOT NULL REFERENCES scans(scan_id), namespace TEXT NOT NULL, version TEXT NOT NULL, data_json TEXT NOT NULL, PRIMARY KEY(scan_id,namespace));
  CREATE TABLE pack_reports (run_id TEXT PRIMARY KEY REFERENCES rule_runs(run_id), scan_id TEXT NOT NULL REFERENCES scans(scan_id), namespace TEXT NOT NULL, data_json TEXT NOT NULL);
  CREATE INDEX pack_reports_scan ON pack_reports(scan_id,namespace);
`+['scan_fact_sets','pack_reports'].flatMap(table=>['UPDATE','DELETE'].map(op=>`CREATE TRIGGER immutable_${table}_${op.toLowerCase()} BEFORE ${op} ON ${table} BEGIN SELECT RAISE(ABORT, 'Historical pack evidence is immutable'); END;`)).join('\n')});
export const DATABASE_SCHEMA_VERSION = migrations.at(-1)!.version;
export function migrate(db: DatabaseSync): void {
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);
    if (current > DATABASE_SCHEMA_VERSION) throw new Error(`Database version ${current} is newer than this application supports`);
    for (const migration of migrations) if (migration.version > current) {
      db.exec(migration.sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
