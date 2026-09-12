import type { Snapshot } from '../snapshots/types.js';
export const STATES = ['PASS','WARNING','POTENTIAL_ISSUE','UNKNOWN','NOT_APPLICABLE'] as const;
export const SEVERITIES = ['CRITICAL','HIGH','MEDIUM','LOW','INFO'] as const;
export type State = typeof STATES[number];
export type Severity = typeof SEVERITIES[number];
export type Confidence = 'HIGH'|'MEDIUM'|'LOW';
export type Detector = 'availability'|'https'|'certificate'|'discovery'|'broken_links'|'form_presence'|'form_structure'|'title'|'indexability'|'canonical'|'content_reduction'|'site_reduction';
export interface Rule {
  schemaVersion: 1; id: string; name: string; description: string; category: string;
  severity: Severity; version: string; engineVersion: '1'; enabled: boolean;
  applicability: 'always'|'previous_pages'|'previous_documents'|'previous_forms'|'comparison';
  detector: Detector; configuration: {target?: 'homepage'|'pages'|'documents'|'robots'|'sitemap'; urls?: string[]; threshold?: number};
  evidenceRequirements: string[]; resultMapping: {healthy: State; changed: State};
  documentation: string; packId: string;
}
export interface RulePack {schemaVersion: 1; id: string; name: string; version: string; description: string; engineVersion: '1'; rules: Rule[]}
export interface Evidence {scanId: string; previousScanId?: string; url: string; observed: unknown; previous?: unknown; explanation: string}
export interface Result {
  schemaVersion: 1; ruleId: string; ruleVersion: string; packId: string; packVersion: string;
  status: State; severity: Severity; confidence: Confidence; confidenceReason: string;
  applicability: 'applicable'|'not_applicable'|'uncertain'; title: string; explanation: string;
  resource: string; evidence: Evidence[];
}
export interface Finding extends Result {findingId: string; firstDetected: string; currentState: State; description: string; recommendation: string; priority: number}
export interface RuleRun {schemaVersion: 1; runId: string; scanId: string; comparisonId: string|null; previousScanId: string|null; packId: string; packVersion: string; engineVersion: '1'; startedAt: string; completedAt: string; status: 'completed'; definition: RulePack; results: Result[]; findings: Finding[]}
export interface Context {current: Snapshot; previous?: Snapshot}
