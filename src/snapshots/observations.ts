import type { CrawlObservation } from '../crawler/observations.js';
import type { PageObservation } from './types.js';

export function emptyPage(url: string, evidence?: CrawlObservation): PageObservation {
  const status = evidence?.status ?? null;
  const state = evidence?.state;
  return {
    url, finalUrl: evidence?.finalUrl ?? null, aliases: [url, ...(evidence?.finalUrl ? [evidence.finalUrl] : [])], status,
    observationStatus: status === 404 || status === 410 ? 'confirmed_missing' : state === 'retrieved' ? (status !== null && status >= 200 && status < 300 ? 'uncertain' : 'unreachable') : state ?? 'not_observed',
    evidence: state === 'retrieved' ? 'http' : 'not_requested', reason: evidence?.reason,
    responseTimeMs: evidence?.responseTimeMs ?? null, redirects: evidence?.redirects ?? [],
    title: null, metaDescription: null, canonicalUrl: null, h1: [], textHash: null, metadataHash: null, structureHash: null, wordCount: null, robots: null, browserRenderRecommended: null,
  };
}
