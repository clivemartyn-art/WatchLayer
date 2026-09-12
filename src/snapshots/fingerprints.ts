import { createHash } from 'node:crypto';
import type { Form, Page } from '../schemas/scan.js';
import { normalize } from '../utils/urls.js';
import type { FormObservation, PageObservation } from './types.js';

export const normalizedText = (value: string): string => value.normalize('NFC').replace(/\s+/g, ' ').trim();
export const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function canonical(value: string | null): string | null {
  if (!value) return null;
  try { return normalize(value); } catch { return value; }
}
export function pageObservation(page: Page): PageObservation {
  const metadata = {title: normalizedText(page.title), metaDescription: normalizedText(page.metaDescription), canonicalUrl: canonical(page.canonicalUrl), robots: page.robots?.toLowerCase().split(/[,\s]+/).filter(Boolean).sort().join(',') ?? null};
  return {
    url: normalize(page.requestedUrl), finalUrl: normalize(page.finalUrl), aliases: [...new Set([page.requestedUrl, page.finalUrl, ...page.redirects].map(u => normalize(u)))],
    status: page.status, observationStatus: 'observed', evidence: 'html', responseTimeMs: page.responseTimeMs, redirects: page.redirects,
    ...metadata, h1: page.h1.map(normalizedText), textHash: hash(normalizedText(page.text)), metadataHash: hash(metadata),
    structureHash: hash({h1: page.h1.map(normalizedText)}), wordCount: page.wordCount, browserRenderRecommended: page.browser_render_recommended,
  };
}
export function formObservation(form: Form): FormObservation {
  const fields = form.fields.map(f => ({name: normalizedText(f.name), type: f.type.toLowerCase()})).sort((a,b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type));
  const stable = {method: form.method.toUpperCase(), action: canonical(form.action) ?? '', fields, classification: form.classification, hasSubmit: form.hasSubmit};
  return {pageUrl: normalize(form.pageUrl), ...stable, fingerprint: hash(stable), fieldSignature: hash(fields), observationStatus: 'observed'};
}
