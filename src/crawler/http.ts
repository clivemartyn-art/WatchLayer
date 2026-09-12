import http from 'node:http';
import https from 'node:https';
import { normalize, resolvePublic, sameDomain } from '../utils/urls.js';
export interface Response { requestedUrl: string; finalUrl: string; status: number; contentType: string; body: string; responseTimeMs: number; redirects: string[] }
export interface RequestOptions { method?: 'GET' | 'HEAD'; beforeRequest?: (url: string) => Promise<void> }
export type Fetcher = (url: string, options?: RequestOptions) => Promise<Response>;
export const USER_AGENT = 'WatchLayer/0.2 (local website scanner)';
export function createFetcher(target: string, delayMs = 300, timeoutMs = 10000): Fetcher {
  let last = 0;
  return async (requestedUrl, options = {}) => {
    const started = Date.now(); const redirects: string[] = []; let current = normalize(requestedUrl);
    for (let hop = 0; hop <= 5; hop++) {
      if (!sameDomain(current, target)) throw new Error('Redirect or request leaves the target domain');
      await options.beforeRequest?.(current);
      await new Promise(r => setTimeout(r, Math.max(0, last + delayMs - Date.now()))); last = Date.now();
      const deadline = Date.now() + timeoutMs;
      const url = new URL(current);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const addresses = await Promise.race([resolvePublic(url.hostname), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('DNS timeout')), timeoutMs); })]).finally(() => clearTimeout(timer));
      const response = await new Promise<{status: number; contentType: string; location?: string; body: string}>((resolve, reject) => {
        // Pin the validated address to this connection, preventing DNS rebinding.
        const address = addresses[0];
        const req = (url.protocol === 'https:' ? https : http).request(url, {
          method: options.method ?? 'GET', agent: false, headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xml,text/plain;q=0.9', 'accept-encoding': 'identity' },
          lookup: (_host, lookupOptions, cb) => {
            if (lookupOptions.all) (cb as unknown as (error: null, records: {address: string; family: number}[]) => void)(null, [address]);
            else cb(null, address.address, address.family);
          },
        }, res => {
          const status = res.statusCode ?? 0; const contentType = String(res.headers['content-type'] ?? '');
          if (options.method === 'HEAD' || status >= 300 && status < 400 || !/text\/|xml|html/i.test(contentType)) { resolve({status, contentType, location: res.headers.location, body: ''}); res.destroy(); return; }
          const chunks: Buffer[] = []; let size = 0;
          res.on('data', (chunk: Buffer) => { size += chunk.length; if (size > 2_000_000) req.destroy(new Error('Response exceeds 2 MB limit')); else chunks.push(chunk); });
          res.on('error', reject);
          res.on('end', () => resolve({status, contentType, body: Buffer.concat(chunks).toString('utf8')}));
        });
        const timeout = setTimeout(() => req.destroy(new Error('Request timeout')), Math.max(1, deadline - Date.now()));
        req.on('close', () => clearTimeout(timeout)); req.on('error', reject); req.end();
      });
      if ([301,302,303,307,308].includes(response.status) && response.location) {
        const next = normalize(response.location, current);
        if (redirects.includes(next) || next === current) throw new Error('Redirect loop');
        redirects.push(current); current = next; continue;
      }
      return { requestedUrl, finalUrl: current, ...response, responseTimeMs: Date.now() - started, redirects };
    }
    throw new Error('Too many redirects');
  };
}
