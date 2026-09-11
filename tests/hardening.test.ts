import { describe, expect, it } from 'vitest';
import { extractPage } from '../src/extractors/page.js';
import { visibleText } from '../src/extractors/text.js';
import { extractContacts } from '../src/contacts/extract.js';
import { scan } from '../src/crawler/scan.js';
import { vi } from 'vitest';
import type { Response } from '../src/crawler/http.js';
const response = (body: string): Response => ({requestedUrl:'https://example.com/',finalUrl:'https://example.com/',status:200,contentType:'text/html',body,responseTimeMs:1,redirects:[]});
describe('real-site extraction regressions', () => {
  it('does not append opening hours across an HTML line break to a phone', () => {
    const page = extractPage(response('<p>Telephone: 0300 123 4321<br>24-hour service</p>'));
    expect(page.phones).toEqual(['03001234321']);
    expect(page.text).toBe('Telephone: 0300 123 4321 24-hour service');
  });
  it('does not append a street number after a phone and sentence-ending period', () => {
    expect(extractContacts('Call 01473 219282. 29 High Street.', []).phones).toEqual(['01473219282']);
  });
  it('still recognizes dotted telephone formatting', () => {
    expect(extractContacts('Call 01473.219282 today.', []).phones).toEqual(['01473219282']);
  });
  it('recognizes a newsletter with its subscription heading outside the form', () => {
    const page = extractPage(response('<footer><div><h2>Monthly updates</h2><p>Join our subscribers</p><form><input name="email" type="email"><button>Sign up</button></form></div></footer>'));
    expect(page.forms[0].classification).toBe('newsletter');
  });
  it('does not classify a contact form from unrelated subscription copy', () => {
    const page = extractPage(response('<body><h2>Subscribe</h2><form><input type="email"><textarea name="message"></textarea></form></body>'));
    expect(page.forms[0].classification).toBe('contact');
  });
  it('recognizes search by field type without English labels', () => {
    expect(extractPage(response('<form><input type="search" name="q"><button>Go</button></form>')).forms[0].classification).toBe('search');
  });
  it('excludes the observed consent banner while keeping cookie-policy content and footer contacts', () => {
    const text = visibleText('<main><h1>Cookie policy</h1><p>Our cookie policy explains storage.</p></main><div id="cmplz-cookiebanner-container">Manage consent Statistics Marketing {vendor_count}</div><div id="cmplz-manage-consent">Manage consent</div><footer>Contact hello@example.com</footer>');
    expect(text).toContain('Our cookie policy'); expect(text).toContain('hello@example.com'); expect(text).not.toMatch(/Manage consent|vendor_count|Statistics/);
  });
});

describe('redirect and failure regressions', () => {
  const reply = (url: string, body = '', status = 200, finalUrl = url): Response => ({...response(body),requestedUrl:url,finalUrl,status,redirects:url===finalUrl?[]:[url]});
  it('does not retrieve a sitemap again under its declared redirect destination', async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.endsWith('/robots.txt')) return reply(url,'User-agent: *\nSitemap: https://example.com/sitemap_index.xml');
      if (url.endsWith('/sitemap.xml')) return reply(url,'<urlset><url><loc>https://example.com/about</loc></url></urlset>',200,'https://example.com/sitemap_index.xml');
      return reply(url,'<p>Page</p>');
    });
    const r = await scan('example.com',{fetcher});
    expect(r.discovery.sitemapUrlsFound).toBe(1);
    expect(fetcher.mock.calls.some(([url])=>url.endsWith('/sitemap_index.xml'))).toBe(false);
  });
  it('does not duplicate a page, forms or contacts through a www redirect alias', async () => {
    const fetcher = async (url: string) => {
      if (url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml')) return reply(url,'',404);
      return reply(url,'<a href="https://www.example.com/">Home</a><form><input type="email"></form>',200,'https://example.com/');
    };
    const r = await scan('example.com',{fetcher});
    expect(r.pages).toHaveLength(1); expect(r.forms).toHaveLength(1); expect(r.summary.pagesFailed).toBe(0);
  });
  it.each([403,429,500])('records HTTP %s as inconclusive instead of a broken link', async status => {
    const r = await scan('example.com',{fetcher:async url => url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml') ? reply(url,'',404) : url.endsWith('/target') ? reply(url,'',status) : reply(url,'<a href="/target">Target</a>')});
    expect(r.brokenLinks).toEqual([]); expect(r.summary.pagesFailed).toBe(1); expect(r.errors.some(e=>e.status===status)).toBe(true);
  });
  it('keeps timeout evidence without declaring the destination broken', async () => {
    const r = await scan('example.com',{fetcher:async url => { if (url.endsWith('/target')) throw new Error('Request timeout'); return url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml') ? reply(url,'',404) : reply(url,'<a href="/target">Target</a>'); }});
    expect(r.brokenLinks).toEqual([]); expect(r.errors.some(e=>e.message==='Request timeout')).toBe(true);
  });
  it('records a gone destination for both a redirect alias and its final URL', async () => {
    const r = await scan('example.com',{fetcher:async url => url.endsWith('/robots.txt') || url.endsWith('/sitemap.xml') ? reply(url,'',404) : url.endsWith('/old') ? reply(url,'',410,'https://example.com/gone') : reply(url,'<a href="/old">Old</a><a href="/gone">Gone</a>')});
    expect(r.brokenLinks.map(b=>b.destinationUrl).sort()).toEqual(['https://example.com/gone','https://example.com/old']);
  });
});
