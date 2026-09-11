import { load } from 'cheerio';
import { visibleText } from './text.js';
import { classify } from '../links/classify.js';
import { extractForms } from '../forms/extract.js';
import { extractContacts } from '../contacts/extract.js';
import type { Response } from '../crawler/http.js';
import type { Page } from '../schemas/scan.js';
export function extractPage(response: Response): Page {
  const $ = load(response.body); const contactText = visibleText(response.body, true); const text = contactText.replace(/\s+/g, ' '); const wordCount = text ? text.split(/\s+/).length : 0;
  let base = response.finalUrl; try { base = new URL($('base[href]').first().attr('href') ?? base, base).href; } catch { /* Use response URL. */ }
  const hrefs = $('a[href],area[href]').toArray().map(el => $(el).attr('href')!);
  const links = hrefs.map(h => { const link = classify(h, base); if (link.kind === 'internal' || link.kind === 'external') return classify(link.url, response.finalUrl); return link; });
  const ofKind = (kind: string) => [...new Set(links.filter(l => l.kind === kind).map(l => l.url))];
  let canonicalUrl: string|null = null; try { const declared = $('link[rel="canonical"]').attr('href'); if (declared) canonicalUrl = new URL(declared, base).href; } catch { /* Invalid canonical is not a crawl target. */ }
  const {body: _body, ...metadata} = response;
  return {...metadata, title: $('title').first().text().trim(), metaDescription: $('meta[name="description" i]').attr('content') ?? '', canonicalUrl, robots: $('meta[name="robots" i]').attr('content') ?? null, h1: $('h1').toArray().map(el => $(el).text().trim()), text, wordCount, links, internalLinks: ofKind('internal'), externalLinks: ofKind('external'), documentLinks: ofKind('document'), forms: extractForms($, response.finalUrl), ...extractContacts(contactText, hrefs), browser_render_recommended: (wordCount < 50 && $('script').length > 0) || /enable javascript|javascript is required/i.test(text)};
}
