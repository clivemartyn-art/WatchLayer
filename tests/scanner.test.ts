import { describe, it, expect, vi } from 'vitest';
import { normalize, sameDomain, publicAddress, resolvePublic } from '../src/utils/urls.js';
import { classify, documentType } from '../src/links/classify.js';
import { parseSitemap } from '../src/discovery/sitemap.js';
import { extractPage } from '../src/extractors/page.js';
import { visibleText } from '../src/extractors/text.js';
import { scan } from '../src/crawler/scan.js';
import type { Response } from '../src/crawler/http.js';
const response = (url: string, body = '', status = 200, contentType = 'text/html'): Response => ({requestedUrl:url,finalUrl:url,status,contentType,body,responseTimeMs:1,redirects:[]});
describe('URL policy', () => {
  it('adds HTTPS and normalizes host', () => expect(normalize('EXAMPLE.com')).toBe('https://example.com/'));
  it('removes fragments and tracking while retaining functional queries', () => expect(normalize('https://example.com/a?utm_source=x&b=2&a=1&fbclid=z#top')).toBe('https://example.com/a?a=1&b=2'));
  it('preserves meaningful trailing slashes', () => expect(normalize('https://example.com/a/')).not.toBe(normalize('https://example.com/a')));
  it.each(['ftp://example.com','http://user:pass@example.com','https://','https://example.com:8080'])('rejects %s', value => expect(() => normalize(value)).toThrow());
  it('accepts subdomains and understands public suffixes', () => { expect(sameDomain('https://www.example.co.uk','https://blog.example.co.uk')).toBe(true); expect(sameDomain('https://a.co.uk','https://b.co.uk')).toBe(false); expect(sameDomain('https://a.github.io','https://b.github.io')).toBe(false); });
  it.each(['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.2','169.254.169.254','::1','fc00::1','fe80::1','::ffff:127.0.0.1','0.0.0.0','100.64.0.1'])('blocks %s', ip => expect(publicAddress(ip)).toBe(false));
  it('allows public IPs', () => expect(publicAddress('8.8.8.8')).toBe(true));
  it.each(['localhost','host.local','metadata.internal','intranet'])('blocks internal hostname %s', async host => expect(resolvePublic(host)).rejects.toThrow());
  it('blocks mixed public/private DNS answers', async () => { const resolver = vi.fn().mockResolvedValue([{address:'8.8.8.8',family:4},{address:'10.1.2.3',family:4}]); await expect(resolvePublic('example.com',resolver as never)).rejects.toThrow(); });
});
describe('extraction', () => {
  it.each([['/about','internal'],['https://other.com','external'],['/a.pdf','document'],['mailto:a@b.com','email'],['tel:+441234567890','telephone'],['#top','fragment'],['javascript:void(0)','unsupported']])('classifies %s', (url,kind) => expect(classify(url,'https://example.com').kind).toBe(kind));
  it.each(['pdf','doc','docx','xls','xlsx','csv','txt'])('detects %s documents', ext => expect(documentType(`https://example.com/file.${ext}?download=1`)).toBe(ext));
  it('extracts readable text without hidden markup', () => expect(visibleText('<p>Hello</p><p>world</p><script>secret</script><svg>secret</svg><div hidden>secret</div><div style="display:none">secret</div>')).toBe('Hello world'));
  it('extracts forms, metadata and contacts', () => {
    const page = extractPage(response('https://example.com/', '<title>Test</title><meta name="description" content="Description"><h1>Welcome</h1><p>Email hello@example.com. Call +44 20 7946 0958</p><form action="/contact" method="post"><input name="email" type="email"><textarea name="message"></textarea><button>Send</button></form><a href="tel:02079460958">Call</a>'));
    expect(page.title).toBe('Test'); expect(page.h1).toEqual(['Welcome']); expect(page.emails).toContain('hello@example.com'); expect(page.phones).toContain('+442079460958'); expect(page.phones).toContain('02079460958'); expect(page.forms[0]).toMatchObject({method:'POST',action:'https://example.com/contact',classification:'contact',hasSubmit:true}); expect(page.forms[0].fields).toContainEqual({name:'message',type:'textarea'});
  });
  it('flags JS shells', () => expect(extractPage(response('https://example.com','<div id="app"></div><script src="app.js"></script>')).browser_render_recommended).toBe(true));
});
describe('sitemaps', () => {
  it('parses namespaces and escaped locations', () => expect(parseSitemap('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://example.com/?a=1&amp;b=2</loc></url></urlset>').pages).toEqual(['https://example.com/?a=1&b=2']));
  it('parses indexes', () => expect(parseSitemap('<sitemapindex><sitemap><loc>https://example.com/child.xml</loc></sitemap></sitemapindex>').sitemaps).toHaveLength(1));
  it.each(['<urlset><url>','<html></html>','<!DOCTYPE a><urlset/>'])('rejects malformed XML %s', xml => expect(() => parseSitemap(xml)).toThrow());
});
describe('fixture scans', () => {
  function fixture() {
    const pages: Record<string,string> = {'/':'<a href="/a">A</a><a href="/a?utm_source=x#top">A again</a><a href="/missing">Broken</a><a href="https://outside.org/">Outside</a><a href="/file.pdf">PDF</a>', '/a':'<a href="/">Loop</a><a href="/missing">Broken again</a>'};
    return vi.fn(async (url: string) => response(url,pages[new URL(url).pathname] ?? '',new URL(url).pathname in pages ? 200 : 404));
  }
  it('deduplicates, avoids loops/external/doc downloads and records each broken source', async () => { const fetcher = fixture(); const r = await scan('example.com',{fetcher}); expect(r.summary.pagesScanned).toBe(2); expect(r.summary.pagesFailed).toBe(1); expect(r.brokenLinks).toHaveLength(2); expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/missing'))).toHaveLength(1); expect(fetcher.mock.calls.some(([url]) => /outside|file.pdf/.test(url))).toBe(false); expect(r.documents[0].sourcePages).toEqual(['https://example.com/']); });
  it('enforces the page limit', async () => { const r = await scan('example.com',{fetcher:fixture(),maxPages:1}); expect(r.pages).toHaveLength(1); expect(r.summary.crawlLimitReached).toBe(true); });
  it('continues after malformed sitemap', async () => { const f = fixture(); const r = await scan('example.com',{fetcher:async url => url.endsWith('sitemap.xml') ? response(url,'<bad>') : f(url)}); expect(r.pages).toHaveLength(2); expect(r.errors.some(e => e.stage === 'sitemap')).toBe(true); });
  it('discovers nested sitemaps and honors robots', async () => {
    const f = vi.fn(async (url: string) => { const path = new URL(url).pathname; return response(url, path === '/robots.txt' ? 'User-agent: *\nDisallow: /private\nSitemap: https://example.com/index.xml' : path === '/index.xml' ? '<sitemapindex><sitemap><loc>https://example.com/child.xml</loc></sitemap></sitemapindex>' : path === '/child.xml' ? '<urlset><url><loc>https://example.com/discovered</loc></url><url><loc>https://example.com/private</loc></url></urlset>' : '<p>Page</p>',path === '/sitemap.xml' ? 404 : 200); });
    const r = await scan('example.com',{fetcher:f}); expect(r.discovery).toEqual({robotsFound:true,sitemapFound:true,sitemapUrlsFound:2}); expect(r.pages).toHaveLength(2); expect(f.mock.calls.some(([url]) => url.endsWith('/private'))).toBe(false);
  });
  it('records timeouts and continues', async () => { const f = fixture(); const r = await scan('example.com',{fetcher:async url => { if(url.endsWith('/a')) throw new Error('Request timeout'); return f(url); }}); expect(r.pages).toHaveLength(1); expect(r.errors.some(e => e.message === 'Request timeout')).toBe(true); });
});
