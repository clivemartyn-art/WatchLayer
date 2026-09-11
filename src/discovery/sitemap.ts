import { XMLParser, XMLValidator } from 'fast-xml-parser';
export function parseSitemap(xml: string): {pages: string[]; sitemaps: string[]} {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Malformed or unsafe XML sitemap');
  const parsed = new XMLParser({ignoreAttributes: true, removeNSPrefix: true, parseTagValue: false}).parse(xml);
  const locs = (value: unknown): string[] => (Array.isArray(value) ? value : value ? [value] : []).flatMap((entry: {loc?: unknown}) => typeof entry.loc === 'string' ? [entry.loc.trim()] : []);
  if (parsed.urlset !== undefined) return {pages: locs(parsed.urlset?.url), sitemaps: []};
  if (parsed.sitemapindex !== undefined) return {pages: [], sitemaps: locs(parsed.sitemapindex?.sitemap)};
  throw new Error('No sitemap root element');
}
