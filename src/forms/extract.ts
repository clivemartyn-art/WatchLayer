import type { CheerioAPI } from 'cheerio';
import type { Form } from '../schemas/scan.js';
export function extractForms($: CheerioAPI, pageUrl: string): Form[] {
  return $('form').toArray().map(el => {
    const form = $(el); const fields = form.find('input,select,textarea,button').toArray().map(field => ({ name: $(field).attr('name') ?? '', type: $(field).attr('type')?.toLowerCase() ?? (field.tagName === 'input' ? 'text' : field.tagName === 'button' ? 'submit' : field.tagName) }));
    const hint = `${form.attr('id')} ${form.attr('class')} ${form.text()} ${fields.map(f => f.name).join(' ')}`.toLowerCase();
    // Newsletter headings often sit immediately outside the form. Limit context
    // to its small wrapper so unrelated page copy cannot classify a form.
    const wrapper = form.parent();
    const context = wrapper.find('form').length === 1 && !wrapper.is('body,html') && wrapper.text().length < 1500 ? wrapper.text().toLowerCase() : '';
    const newsletter = /newsletter|subscrib/.test(hint) || (fields.some(f => f.type === 'email') && !fields.some(f => f.type === 'textarea') && /newsletter|subscrib|monthly updates/.test(context));
    const classification = fields.some(f => f.type === 'password') ? 'login' : fields.some(f => f.type === 'search') || /\bsearch\b/.test(hint) ? 'search' : newsletter ? 'newsletter' : /enquir|inquir/.test(hint) ? 'enquiry' : /contact|message/.test(hint) ? 'contact' : 'unknown';
    let action = form.attr('action') ?? pageUrl; try { action = new URL(action, pageUrl).href; } catch { /* Preserve malformed declaration. */ }
    return {pageUrl, method: (form.attr('method') ?? 'GET').toUpperCase(), action, fields, hasSubmit: fields.some(f => ['submit','image'].includes(f.type)), classification};
  });
}
