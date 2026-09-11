export function extractContacts(text: string, hrefs: string[]): {emails: string[]; phones: string[]} {
  const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
  const emails = new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map(e => e.toLowerCase()));
  const phones = new Set<string>();
  for (const href of hrefs) {
    if (/^mailto:/i.test(href)) for (const e of decode(href.slice(7).split('?')[0]).split(',')) if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) emails.add(e.toLowerCase());
    if (/^tel:/i.test(href)) phones.add(decode(href.slice(4)).split(';')[0].replace(/[^+\d]/g, ''));
  }
  for (const match of text.match(/(?:\+\d{1,3}[\s(.-]*|\b0)[\d\s().-]{8,20}\d/g) ?? []) {
    const phone = match.replace(/[^+\d]/g, ''); if (phone.replace(/\D/g,'').length >= 10 && phone.replace(/\D/g,'').length <= 15) phones.add(phone);
  }
  return {emails: [...emails], phones: [...phones].filter(p => p.replace(/\D/g,'').length >= 7)};
}
