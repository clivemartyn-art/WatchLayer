import type { Fetcher } from '../../src/crawler/http.js';
import { fixtureResponse } from './milestone2.js';
export const hubHtml=`<title>Our charges</title><main><h1>Our charges</h1>
<section><h2>Residential conveyancing</h2><p>For the sale and purchase of your home, see our detailed charges.</p><a href="/details/a">View fees</a></section>
<section><h2>Uncontested probate</h2><p>Grant of probate and estate administration pricing.</p><a href="/files/guide.pdf">Download information</a></section></main>`;
export const tablePricing=`<title>Residential conveyancing fees</title><main><h1>Residential conveyancing fees</h1>
<p>We provide residential conveyancing services.</p><table><tr><th>Our fixed fee</th><td>£950 to £1,800 plus VAT at 20%</td></tr></table>
<h2>Work included in our fees</h2><ul><li>Preparing the contract</li><li>Registering ownership</li></ul>
<h2>Key stages</h2><ol><li>Initial instructions</li><li>Completion and registration</li></ol>
<p>Your work is carried out by <a href="/people/alex">Alex, our solicitor</a>.</p>
<p>The work is supervised by <a href="/people/sam">Sam, our supervising solicitor</a>.</p></main>`;
export const mixedServicePricing=`<title>Our fees</title><main><h1>Our fees</h1>
<section><h2>Residential conveyancing</h2><p>We offer residential conveyancing. Our fixed fee is £900. Our legal fees exclude VAT at 20%.</p></section>
<section><h2>Uncontested probate</h2><p>We provide uncontested probate. Our fixed fee is £2,000. Ask us about tax treatment.</p></section></main>`;
export const feedbackHtml=`<title>Client care</title><main><h1>Client care</h1><p>If you are unhappy with our service and wish to complain, contact our client care partner. We will investigate your complaint and respond.</p>
<p>If we cannot resolve the complaint you can contact the Legal Ombudsman.</p>
<p>Concerns about dishonest conduct can be reported to the Solicitors Regulation Authority.</p></main>`;
/** Fictional routes recreate architecture patterns; never embeds benchmark host exceptions. */
export function discoveryWebsite(log:string[],extra:Record<string,string>={},newsCount=150):Fetcher{
  const pages:Record<string,string>={
    '/':'<h1>Example Solicitors</h1><footer><a href="/our-charges">Fees</a><a href="/client-care">Client care</a></footer>',
    '/our-charges':hubHtml,'/client-care':feedbackHtml,'/details/a':tablePricing,
    '/people/alex':'<h1>Alex</h1><p>Alex is a qualified solicitor with 12 years of experience in residential conveyancing.</p>',
    '/people/sam':'<h1>Sam</h1><p>Sam is a qualified solicitor with 20 years of experience.</p>',...extra};
  return async(url,options)=>{
    log.push(url);await options?.beforeRequest?.(url);
    const path=new URL(url).pathname;
    if(path==='/robots.txt')return fixtureResponse(url,'User-agent: *\nDisallow: /private',200,'text/plain');
    if(path==='/sitemap.xml')return fixtureResponse(url,'<urlset>'+Array.from({length:newsCount},(_,i)=>`<url><loc>https://example.com/news/story-${i}</loc></url>`).join('')+'<url><loc>https://example.com/our-charges</loc></url><url><loc>https://example.com/client-care</loc></url></urlset>',200,'application/xml');
    if(path.startsWith('/news/'))return fixtureResponse(url,'<h1>News</h1><p>Our latest news article.</p>');
    return fixtureResponse(url,pages[path]??'',pages[path]?200:404);
  };
}
