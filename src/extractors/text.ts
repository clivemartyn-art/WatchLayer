import { load } from 'cheerio';
export function visibleText(html: string): string {
  const $ = load(html);
  $('script,style,svg,noscript,template,[hidden],[aria-hidden="true"],head').remove();
  $('[style]').each((_, el) => { if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test($(el).attr('style') ?? '')) $(el).remove(); });
  $('br,p,div,li,h1,h2,h3,h4,section,article,td,th,header,footer').each((_, el) => { $(el).append(' '); });
  return $('body').text().replace(/\s+/g, ' ').trim();
}
