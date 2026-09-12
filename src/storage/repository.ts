import type { Site, Snapshot } from '../snapshots/types.js';

/** Persistence boundary; neither crawler nor comparison imports SQLite. */
export interface SnapshotRepository {
  findSite(canonicalDomain: string): Site | undefined;
  save(snapshot: Snapshot): void;
  get(scanId: string): Snapshot | undefined;
  history(canonicalDomain: string): Snapshot[];
  close(): void;
}
