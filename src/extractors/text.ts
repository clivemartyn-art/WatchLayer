import { load } from 'cheerio';
export function visibleText(html: string, preserveLines = false): string {
  const $ = load(html);
  $('script,style,svg,noscript,template,[hidden],[aria-hidden="true"],head').remove();
  // Recognizable consent controls are UI, not page content. Do not remove
  // arbitrary elements mentioning cookies: policy articles are useful content.
  $('#cmplz-cookiebanner-container,#cmplz-manage-consent,#onetrust-banner-sdk,#onetrust-consent-sdk,#CybotCookiebotDialog,.govuk-cookie-banner,[data-nosnippet="cookie-banner"]').remove();
  $('[style]').each((_, el) => { if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test($(el).attr('style') ?? '')) $(el).remove(); });
  $('br').replaceWith('\n');
  $('p,div,li,h1,h2,h3,h4,h5,h6,section,article,td,th,header,footer').each((_, el) => { $(el).prepend('\n').append('\n'); });
  const text = $('body').text();
  return preserveLines ? text.replace(/[^\S\n]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n+/g, '\n').trim() : text.replace(/\s+/g, ' ').trim();
}
