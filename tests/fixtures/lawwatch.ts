import type { Fetcher } from '../../src/crawler/http.js';
import { fixtureResponse } from './milestone2.js';
export const LAW_SITE='https://example.com/';
export const strongPricing=`<h1>Residential conveyancing pricing</h1>
<p>We provide residential conveyancing services for the sale and purchase of your home.</p>
<p>Our fees range from £900 to £1,500 for this service.</p>
<p>Our fixed fee is £900. Our hourly rate is £200 per hour.</p>
<p>The work is carried out by a qualified solicitor with 12 years of experience.</p>
<p>Your supervisor is a qualified solicitor with 20 years of experience.</p>
<p>Likely disbursements include court fees of £100 and search fees of £200.</p>
<p>Our legal fees exclude VAT at 20%.</p>
<p>Search fees and other disbursements include VAT at 20%.</p>
<p>Our fee includes preparing documents, advising you and registering ownership.</p>
<p>Our fees exclude contested disputes and tax advice.</p>
<p>Key stages of the process: initial review, preparation, submission and completion.</p>
<p>The typical timescale is 8 to 12 weeks from initial instructions.</p>`;
export const complaintsHtml=`<h1>Feedback and Complaints Procedure</h1>
<p>To make a complaint, contact our client care partner who will investigate and respond.</p>
<p>You can contact the Legal Ombudsman to complain by email at enquiries@legalombudsman.org.uk or call 0300 555 0333.</p>
<p>You may refer your complaint to the Legal Ombudsman after eight weeks if we have not resolved it, or within six months of our final response.</p>
<p>If you have concerns about dishonest conduct or discriminatory behaviour, you can report them to the Solicitors Regulation Authority at https://www.sra.org.uk/consumers/problems/report-solicitor/.</p>`;
export type FixtureKind='strong'|'no_vat'|'pdf'|'quote'|'multi_office'|'stale'|'historic'|'removed'|'unobserved'|'ambiguous'|'excluded';
export function lawWebsite(kind:FixtureKind='strong',version:'A'|'B'='A'):Fetcher {
  const pricing=kind==='pdf'?'<h1>Residential conveyancing pricing</h1><p>We offer residential conveyancing services.</p><a href="/residential-conveyancing-fees.pdf">Residential conveyancing fees PDF</a>':kind==='quote'?'<h1>Residential conveyancing pricing</h1><p>We provide residential conveyancing. Get an instant quote using our quote calculator to calculate fees.</p><form><input name="property"><button>Get a quote</button></form>':kind==='ambiguous'?'<h1>Employment pricing</h1><p>We offer employment advice.</p>':kind==='excluded'?'<h1>Family services</h1><p>We do not offer residential conveyancing. We offer family mediation.</p>':strongPricing;
  const adjusted=kind==='no_vat'?pricing.replace(/<p>[^<]*VAT[^<]*<\/p>/g,''):pricing;
  const footer='<footer><p>Authorised and regulated by the Solicitors Regulation Authority. SRA number: 123456.</p>'+(kind==='multi_office'?'<p>Our second office is regulated under SRA number 654321.</p>':'')+'<a href="/complaints">Complaints Procedure</a></footer>';
  const pages:Record<string,string>={
    '/':'<h1>Example Solicitors</h1><nav><a href="/pricing">Residential conveyancing pricing</a><a href="/complaints">Complaints</a><a href="/team">Our team</a></nav><p>We offer legal services and support individuals and businesses with their matters.</p>'+footer,
    '/pricing':adjusted+(kind==='stale'?'<p>Our rates were last reviewed in 2018.</p>':'')+(kind==='historic'?'<p>Our pricing fees for 2019 are shown here.</p>':'')+footer,
    '/complaints':complaintsHtml+footer,
    '/team':'<h1>Our team</h1><p>Our experienced team helps clients with their legal matters.</p>'+footer,
  };
  if((kind==='unobserved'||kind==='removed')&&version==='B')pages['/']=pages['/'].replace('<a href="/pricing">Residential conveyancing pricing</a>','');
  return async(url,options)=>{
    const path=new URL(url).pathname;
    if(path==='/robots.txt')return fixtureResponse(url,'User-agent: *\nAllow: /',200,'text/plain');
    if(path==='/sitemap.xml')return fixtureResponse(url,'',404,'application/xml');
    if(path.endsWith('.pdf'))return fixtureResponse(url,'',200,'application/pdf');
    if(kind==='removed'&&version==='B'&&path==='/pricing')return fixtureResponse(url,'',404);
    const body=pages[path];return fixtureResponse(url,options?.method==='HEAD'?'':body?'<title>'+ (path==='/pricing'?'Residential conveyancing pricing':path==='/complaints'?'Complaints Procedure':'Example Solicitors')+'</title>'+body:'',body?200:404);
  };
}
