import { createRequire } from 'node:module';
import { USER_AGENT, type Fetcher, type Response } from '../crawler/http.js';
import type { Snapshot } from './types.js';
import { normalize, sameDomain } from '../utils/urls.js';
const robotsParser = createRequire(import.meta.url)('robots-parser') as (url: string, body: string) => {isAllowed(url: string, agent: string): boolean | undefined};

export const MAX_RECHECK_BUDGET = 20;
export interface RecheckResult { url: string; kind: 'page' | 'document'; response?: Response; excluded?: boolean; error?: string }
export async function recheckKnown(previous: Snapshot | undefined, seenPages: Set<string>, start: string, budget: number, fetch: Fetcher, robotsCache: Map<string, Response>): Promise<{results: RecheckResult[]; attempted: number; skipped: number}> {
  if (!previous || !budget) return {results: [], attempted: 0, skipped: 0};
  const pages = previous.pages.filter(p => p.textHash !== null && p.lastKnownStatus !== 404 && p.lastKnownStatus !== 410 && p.observationStatus !== 'confirmed_missing' && !p.aliases.some(url => seenPages.has(url)) && !seenPages.has(p.url));
  const documents = previous.documents.filter(d => d.observationStatus !== 'confirmed_missing' && d.lastKnownStatus !== 404 && d.lastKnownStatus !== 410);
  const candidates: {url: string; kind: 'page'|'document'}[] = [];
  // Alternate types so documents cannot be starved by a large page list.
  for (let i=0; i<Math.max(pages.length,documents.length); i++) {
    if (documents[i]) candidates.push({url:documents[i].url,kind:'document'});
    if (pages[i]) candidates.push({url:pages[i].url,kind:'page'});
  }
  const policies = new Map<string, ReturnType<typeof robotsParser>>();
  const policyErrors = new Map<string,Error>();
  async function allowed(url: string): Promise<void> {
    if (!sameDomain(url,start)) throw new Error('Outside target domain');
    const origin = new URL(url).origin;
    if (policyErrors.has(origin)) throw policyErrors.get(origin)!;
    if (!policies.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      let response = robotsCache.get(robotsUrl);
      try {
        if (!response) { response = await fetch(robotsUrl); robotsCache.set(robotsUrl,response); }
        if (response.status !== 404 && (response.status < 200 || response.status >= 300)) throw new Error(`Robots unavailable (HTTP ${response.status})`);
      } catch (error) { policyErrors.set(origin,error as Error); throw error; }
      policies.set(origin, robotsParser(robotsUrl,response.status === 404 ? '' : response.body));
    }
    if (policies.get(origin)!.isAllowed(url,USER_AGENT) === false) throw new Error('Excluded by robots.txt');
  }
  const results: RecheckResult[] = []; let attempted = 0; let skipped = 0;
  const selected = new Set<string>();
  // The budget caps candidates as well as requests, bounding robots overhead.
  for (const candidate of candidates.slice(0,budget)) {
    const url = normalize(candidate.url); if (selected.has(url)) continue; selected.add(url);
    try { await allowed(url); }
    catch (error) { skipped++; results.push({...candidate,url,excluded:true,error:(error as Error).message}); continue; }
    attempted++;
    try { results.push({...candidate,url,response:await fetch(url,{method:candidate.kind==='document'?'HEAD':'GET',beforeRequest:allowed})}); }
    catch (error) { results.push({...candidate,url,error:(error as Error).message}); }
  }
  return {results,attempted,skipped};
}
