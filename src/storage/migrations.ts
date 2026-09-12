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
];
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
