import type { Fetcher } from '../../src/crawler/http.js';
import { fixtureResponse } from './milestone2.js';
export const PDF_SITE='https://example.com/';
/** Minimal deterministic PDF 1.4 with WinAnsi text. No runtime fixture dependency. */
export function textPdf(pages:string[],title='Fixture document',passwordRequired=false):Uint8Array{
  const literal=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',`<< /Title (${literal(title)}) >>`];
  // Password-required Standard encryption dictionary; intentionally no known password.
  if(passwordRequired)objects.push('<< /Filter /Standard /V 1 /R 2 /Length 40 /P -4 /O <'+'00'.repeat(32)+'> /U <'+'00'.repeat(32)+'> >>');
  const kids:number[]=[];
  for(const text of pages){const page=objects.length+1;const content=page+1;kids.push(page);
    const stream='BT /F1 10 Tf 40 780 Td 13 TL\n'+text.split('\n').map((line,i)=>(i?'T* ':'')+`(${literal(line)}) Tj`).join('\n')+'\nET';
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 1000 850] /Resources << /Font << /F1 3 0 R >> >> /Contents ${content} 0 R >>`,`<< /Length ${Buffer.byteLength(stream,'latin1')} >>\nstream\n${stream}\nendstream`);
  }
  objects[1]=`<< /Type /Pages /Kids [${kids.map(n=>`${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  let pdf='%PDF-1.4\n';const offsets=[0];for(const [i,body]of objects.entries()){offsets.push(Buffer.byteLength(pdf,'latin1'));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;}
  const start=Buffer.byteLength(pdf,'latin1');pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R /Info 4 0 R ${passwordRequired?'/Encrypt 5 0 R /ID [<00112233445566778899aabbccddeeff><00112233445566778899aabbccddeeff>]':''} >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(pdf,'latin1');
}
export const PDF_PRICING=`We provide residential conveyancing services for buying your home.
Our fees range from £900 to £1,500 for this service.
Our fixed fee is £900. Our hourly rate is £200 per hour.
The work is carried out by a qualified solicitor with 12 years of experience.
Your supervisor is a qualified solicitor with 20 years of experience.
Likely disbursements include court fees of £100 and search fees of £200.
Our legal fees exclude VAT at 20%.
Search fees and other disbursements include VAT at 20%.
Our fee includes preparing documents, advising you and registering ownership.
Our fees exclude contested disputes and tax advice.
Key stages of the process: initial review, preparation, submission and completion.
The typical timescale is 8 to 12 weeks from initial instructions.`;
export const PDF_COMPLAINTS=`To make a complaint, contact our client care partner who will investigate and respond.
You can contact the Legal Ombudsman to complain by email at enquiries@legalombudsman.org.uk.
You may refer your complaint to the Legal Ombudsman after eight weeks if we have not resolved it.
If you have concerns about dishonest conduct, report them to the Solicitors Regulation Authority at https://www.sra.org.uk/consumers/problems/report-solicitor/.
Our SRA number: 123456.`;
export function pdfWebsite(bytes=textPdf([PDF_PRICING],'Residential conveyancing fees'),extra=''):Fetcher{
  return async(url,options)=>{
    await options?.beforeRequest?.(url);
    if(url.endsWith('/robots.txt'))return fixtureResponse(url,'User-agent: *\nAllow: /',200,'text/plain');
    if(url.endsWith('/sitemap.xml'))return fixtureResponse(url,'',404,'application/xml');
    if(url.endsWith('.pdf'))return {...fixtureResponse(url,'',200,'application/pdf'),bytes};
    if(url===PDF_SITE)return fixtureResponse(url,'<title>Our services</title><h1>Legal services</h1><p>We offer residential conveyancing and uncontested probate.</p><a href="/fees.pdf">Residential conveyancing fees</a>'+extra);
    return fixtureResponse(url,'',404);
  };
}
