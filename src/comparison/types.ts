export type ChangeType =
  | 'PAGE_ADDED' | 'PAGE_CONFIRMED_REMOVED' | 'PAGE_NOT_OBSERVED' | 'PAGE_STATUS_CHANGED'
  | 'PAGE_REDIRECT_CHANGED' | 'PAGE_TITLE_CHANGED' | 'PAGE_META_CHANGED' | 'PAGE_CANONICAL_CHANGED'
  | 'PAGE_ROBOTS_CHANGED' | 'PAGE_CONTENT_CHANGED' | 'PAGE_WORD_COUNT_CHANGED_SIGNIFICANTLY' | 'PAGE_BROWSER_RENDER_STATE_CHANGED'
  | 'DOCUMENT_ADDED' | 'DOCUMENT_CONFIRMED_REMOVED' | 'DOCUMENT_NOT_OBSERVED'
  | 'FORM_ADDED' | 'FORM_CONFIRMED_REMOVED' | 'FORM_CHANGED' | 'FORM_NOT_OBSERVED'
  | 'EMAIL_ADDED' | 'EMAIL_REMOVED_FROM_OBSERVED_SITE' | 'PHONE_ADDED' | 'PHONE_REMOVED_FROM_OBSERVED_SITE';
export interface Change {
  type: ChangeType;
  url: string;
  severity: 'low' | 'medium' | 'high';
  confidence: 'confirmed' | 'observed' | 'uncertain';
  previous?: unknown;
  current?: unknown;
  materiality?: 'minor' | 'moderate' | 'major';
  context?: {previousWordCount: number; currentWordCount: number; percentageDifference: number};
  previousObservationScanId?: string;
  reason?: string;
}
export interface Comparison {
  schemaVersion: 1;
  site: string;
  previousScanId: string;
  currentScanId: string;
  previousScanAt: string;
  currentScanAt: string;
  comparisonEligible: boolean;
  comparisonWarnings: string[];
  confidence: 'high' | 'reduced';
  /** Category totals count distinct resources; unchanged counts pages. */
  summary: {added: number; confirmedRemoved: number; changed: number; notObserved: number; unchanged: number};
  changes: Change[];
}
