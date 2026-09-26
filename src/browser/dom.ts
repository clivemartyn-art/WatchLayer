/** Executed in the page. No interactions, network calls or raw DOM archive. */
export const EXTRACT_VISIBLE_DOM=String.raw`(limits => {
  let nodes=0,characters=0,heading=0; const seen=new Set();let duplicates=0;
  const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const excluded='script,style,noscript,template,svg,canvas,iframe,object,embed,video,audio,head,#cmplz-cookiebanner-container,#onetrust-banner-sdk,#onetrust-consent-sdk,#CybotCookiebotDialog,.govuk-cookie-banner,[data-nosnippet="cookie-banner"]';
  const tags=new Set('main section article div p span h1 h2 h3 h4 h5 h6 a nav header footer aside ul ol li dl dt dd table tbody thead tr th td form label input select option textarea button strong em br details summary'.split(' '));
  function walk(node){
    if(++nodes>limits.nodes)throw Error('DOM node limit');
    if(node.nodeType===3){const text=node.textContent.replace(/\s+/g,' ');characters+=text.length;if(characters>limits.textCharacters)throw Error('DOM text limit');return escape(text);}
    if(node.nodeType!==1)return '';
    if(node.matches(excluded)||node.hidden||node.getAttribute('aria-hidden')==='true')return '';
    const style=getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden'||style.visibility==='collapse'||Number(style.opacity)===0||style.contentVisibility==='hidden')return '';
    const detail=node.closest('details:not([open])');if(detail&&node!==detail&&!node.closest('summary'))return '';
    const tag=node.tagName.toLowerCase();if(/^h[123]$/.test(tag))heading++;let attr='';
    for(const key of ['href','action','method','name','type','role'])if(node.hasAttribute(key)){
      let value=node.getAttribute(key);if(key==='href'||key==='action'){try{value=new URL(value,document.baseURI).href;}catch{continue;}}
      attr+=' '+key+'="'+escape(value.slice(0,2048))+'"';
    }
    // Suppress repeated responsive leaf blocks within the same structural region.
    if(node.matches('p,li')&&!node.querySelector('h1,h2,h3,p,li,form')){const region=node.closest('nav,header,footer,main,section,article')||document.body;const index=Array.from(document.querySelectorAll('nav,header,footer,main,section,article')).indexOf(region);const key=index+'|'+heading+'|'+tag+'|'+node.textContent.trim()+'|'+Array.from(node.querySelectorAll('a')).map(a=>a.href).join('|');if(seen.has(key)){duplicates++;return '';}seen.add(key);}
    const body=Array.from(node.childNodes).map(walk).join('');return tags.has(tag)?'<'+tag+attr+'>'+body+'</'+tag+'>':body;
  }
  const html='<title>'+escape(document.title.slice(0,240))+'</title>'+walk(document.body);
  if(new TextEncoder().encode(html).length>limits.domBytes)throw Error('DOM byte limit');
  return {html,duplicates};
})`;
