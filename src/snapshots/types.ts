import type { ScanError, ScanResult } from '../schemas/scan.js';

export const APPLICATION_VERSION = '0.2.0';
export const SNAPSHOT_SCHEMA_VERSION = 2;
export type ObservationStatus = 'observed' | 'confirmed_missing' | 'not_observed' | 'unreachable' | 'excluded_from_scan' | 'uncertain';
export interface ResourceObservation {
  url: string;
  finalUrl: string | null;
  status: number | null;
  observationStatus: ObservationStatus;
  evidence: 'html' | 'http' | 'linked' | 'not_requested';
  reason?: string;
  responseTimeMs: number | null;
  redirects: string[];
  /** Fingerprints on an unobserved record are explicitly last-known facts. */
  lastObservedScanId?: string;
  lastKnownStatus?: number;
  lastKnownFinalUrl?: string;
}
export interface PageObservation extends ResourceObservation {
  aliases: string[];
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  h1: string[];
  textHash: string | null;
  metadataHash: string | null;
  structureHash: string | null;
  wordCount: number | null;
  robots: string | null;
  browserRenderRecommended: boolean | null;
}
export interface DocumentObservation extends ResourceObservation {
  filename: string;
  type: string;
  sourcePages: string[];
  firstObservedAt: string;
}
export interface FormObservation {
  pageUrl: string;
  method: string;
  action: string;
  classification: string;
  fields: { name: string; type: string }[];
  hasSubmit: boolean;
  fingerprint: string;
  fieldSignature: string;
  observationStatus: 'observed' | 'not_observed';
  lastObservedScanId?: string;
}
export interface ContactObservation { value: string; sourcePages: string[]; unobservedSourcePages?: string[]; observationStatus: 'observed' | 'not_observed'; lastObservedScanId?: string }
export interface Coverage {
  crawlStages?:ScanResult['crawlStages'];
  homepageReached: boolean;
  crawlLimitReached: boolean;
  pagesDiscovered: number;
  pagesScanned: number;
  pagesFailed: number;
  naturalAttempts: number;
  recheckBudget: number;
  rechecksAttempted: number;
  rechecksSkipped: number;
  rechecksFailed: number;
  discovery: ScanResult['discovery'];
  discoveryErrors: number;
}
export interface Snapshot {
  scanProfile?:string;
  /** Optional additive transport evidence; older snapshots remain readable. */
  requests?: {url: string; finalUrl?: string; status?: number; tls?: {authorized: boolean; validTo: string}; errorCode?: string}[];
  brokenLinks?: ScanResult['brokenLinks'];
  scanId: string;
  siteId: string;
  canonicalDomain: string;
  canonicalStartUrl: string;
  inputUrl: string;
  startedAt: string;
  completedAt: string;
  status: 'complete' | 'partial' | 'failed';
  crawlLimit: number;
  applicationVersion: string;
  schemaVersion: number;
  comparisonEligible: boolean;
  comparisonWarnings: string[];
  coverage: Coverage;
  pages: PageObservation[];
  documents: DocumentObservation[];
  forms: FormObservation[];
  contacts: { emails: ContactObservation[]; phones: ContactObservation[] };
  errors: ScanError[];
}
export interface Site {
  siteId: string;
  canonicalDomain: string;
  canonicalStartUrl: string;
  firstSeen: string;
  lastScanned: string;
  createdAt: string;
}
