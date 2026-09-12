import type { Fetcher, Response } from '../../src/crawler/http.js';
export const FIXTURE_SITE='https://example.com/';
export function versionedWebsite(version: 'A'|'B'): Fetcher {
  const pages: Record<string,string> = {
    '/':`<title>${version==='A'?'Example Services':'Example Services — Our team'}</title><h1>Example Services</h1><a href="/contact">Contact</a><a href="/pricing">Pricing</a>${version==='A'?'<a href="/services">Services</a><a href="/guide.pdf">Guide</a>':'<a href="/team">Team</a>'}`,
    '/contact':`<h1>Contact</h1><p>hello@example.com</p><a href="tel:${version==='A'?'+441234567890':'+441234567891'}">Call</a><form method="post" action="/enquiry"><input type="email" name="email"><textarea name="message"></textarea>${version==='B'?'<input type="tel" name="phone">':''}<button>Send</button></form>`,
    '/pricing':`<title>Pricing</title><p>${Array.from({length:version==='A'?100:150},(_,i)=>`word${i}`).join(' ')}</p>`,
    '/services':'<h1>Services</h1><p>This page still exists but is not linked in version B.</p>',
    '/team':'<h1>Team</h1><p>Our new team page.</p>',
  };
  return async (url,options) => {
    const path=new URL(url).pathname;
    if(path==='/guide.pdf') return fixtureResponse(url,'',version==='A'?200:404,'application/pdf');
    if(path==='/robots.txt')return fixtureResponse(url,'User-agent: *\nAllow: /',200,'text/plain');
    if(path==='/sitemap.xml')return fixtureResponse(url,'',404,'application/xml');
    const body=pages[path];return fixtureResponse(url,options?.method==='HEAD'?'':body??'',body?200:404);
  };
}
export function fixtureResponse(url: string,body: string,status=200,contentType='text/html'): Response {
  return {requestedUrl:url,finalUrl:url,status,contentType,body,responseTimeMs:1,redirects:[]};
}
