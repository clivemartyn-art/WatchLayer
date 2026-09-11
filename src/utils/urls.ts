import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import { getDomain } from 'tldts';

export function normalize(input: string, base?: string): string {
  const value = input.trim();
  const url = new URL(base || /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`, base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !url.hostname) throw new Error('Only public HTTP/HTTPS URLs without credentials are supported');
  if (url.port && !['80', '443'].includes(url.port)) throw new Error('Only standard web ports are supported');
  url.hash = '';
  url.hostname = url.hostname.replace(/\.$/, '');
  for (const key of [...url.searchParams.keys()]) if (/^(utm_.+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
export function domain(url: string): string {
  const host = new URL(url).hostname;
  return getDomain(host, { allowPrivateDomains: true }) ?? host;
}
export const sameDomain = (a: string, b: string): boolean => domain(a) === domain(b);
export function publicAddress(address: string): boolean {
  try { return ipaddr.process(address.replace(/^\[|\]$/g, '')).range() === 'unicast'; } catch { return false; }
}
export async function resolvePublic(hostname: string, resolver = lookup): Promise<{ address: string; family: number }[]> {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host.includes('.') && !ipaddr.isValid(host) || /(^|\.)(localhost|local|internal|lan|home|test|invalid)$/.test(host)) throw new Error('Unsafe internal hostname');
  const addresses = ipaddr.isValid(host) ? [{ address: host, family: ipaddr.parse(host).kind() === 'ipv4' ? 4 : 6 }] : await resolver(host, { all: true });
  if (!addresses.length || addresses.some(a => !publicAddress(a.address))) throw new Error('Target resolves to an unsafe network address');
  return addresses;
}
