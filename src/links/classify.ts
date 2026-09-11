import { normalize, sameDomain } from '../utils/urls.js';
import type { Link } from '../schemas/scan.js';
export function documentType(url: string): string|null { return new URL(url).pathname.match(/\.(pdf|docx?|xlsx?|csv|txt)$/i)?.[1].toLowerCase() ?? null; }
export function classify(raw: string, base: string): Link {
  const value = raw.trim();
  if (value.startsWith('#')) return {url: value, kind: 'fragment'};
  if (/^mailto:/i.test(value)) return {url: value, kind: 'email'};
  if (/^tel:/i.test(value)) return {url: value, kind: 'telephone'};
  try { const url = normalize(value, base); return {url, kind: documentType(url) ? 'document' : sameDomain(url, base) ? 'internal' : 'external'}; }
  catch { return {url: value, kind: 'unsupported'}; }
}
