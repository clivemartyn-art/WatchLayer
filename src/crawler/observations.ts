/** Transport evidence from page attempts, including failures and exclusions. */
export interface CrawlObservation {
  url: string;
  finalUrl?: string;
  status?: number;
  contentType?: string;
  responseTimeMs?: number;
  redirects?: string[];
  state: 'retrieved' | 'unreachable' | 'excluded_from_scan' | 'not_observed';
  reason?: string;
}
