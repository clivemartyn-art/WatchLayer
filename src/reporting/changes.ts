import type { Comparison, Change } from '../comparison/types.js';

function describe(change: Change): string {
  let detail = change.type.toLowerCase().replaceAll('_',' ');
  if (change.type==='PAGE_TITLE_CHANGED') detail=`Title: ${JSON.stringify(change.previous)} → ${JSON.stringify(change.current)}`;
  if (change.type==='PAGE_STATUS_CHANGED' || change.type==='PAGE_CONFIRMED_REMOVED') detail=`HTTP ${(change.previous as {status?:number})?.status??'unknown'} → ${(change.current as {status?:number})?.status??'unknown'}`;
  if (change.context) detail+=` (${change.materiality}; words ${change.context.previousWordCount} → ${change.context.currentWordCount}, ${change.context.percentageDifference}%)`;
  if (change.type==='DOCUMENT_CONFIRMED_REMOVED') detail+=` (HTTP ${(change.current as {status?:number})?.status??'unknown'})`;
  if (change.type==='FORM_CHANGED') {
    const old=(change.previous as {fields:{name:string;type:string}[]}).fields;
    const current=(change.current as {fields:{name:string;type:string}[]}).fields;
    detail+=`\n  Fields: ${old.map(f=>`${f.name||'(unnamed)'}:${f.type}`).join(', ')} → ${current.map(f=>`${f.name||'(unnamed)'}:${f.type}`).join(', ')}`;
  }
  if (/^(EMAIL|PHONE)_/.test(change.type)) detail+=`: ${((change.current??change.previous) as {value:string}).value}`;
  return `${change.url}\n  ${detail}${change.reason?` — ${change.reason}`:''}`;
}
export function changeReport(comparison: Comparison): string {
  const changes=comparison.changes;
  const sections: [string,string,Change[]][] = [
    ['NEW','+',changes.filter(c=>c.type.endsWith('_ADDED'))],
    ['CONFIRMED MISSING / REMOVED','!',changes.filter(c=>c.type.includes('REMOVED'))],
    ['CHANGED','~',changes.filter(c=>!c.type.includes('REMOVED')&&!c.type.endsWith('_ADDED')&&!c.type.endsWith('_NOT_OBSERVED'))],
    ['NOT OBSERVED — NOT REMOVED','?',changes.filter(c=>c.type.endsWith('_NOT_OBSERVED'))],
  ];
  return [
    'WATCHLAYER CHANGE REPORT',`Site: ${comparison.site}`,
    `Previous scan: ${comparison.previousScanAt}\n${comparison.previousScanId}`,
    `Current scan: ${comparison.currentScanAt}\n${comparison.currentScanId}`,
    `Comparison confidence: ${comparison.confidence.toUpperCase()}${comparison.comparisonEligible?'':' — unsuitable for removal conclusions'}`,
    ...comparison.comparisonWarnings.map(w=>`Warning: ${w}`),
    ...sections.map(([label,symbol,items])=>`${label}\n${'-'.repeat(label.length)}\n${items.length?items.map(c=>`${symbol} ${describe(c)}`).join('\n'):'None'}`),
    `UNCHANGED\n---------\n${comparison.summary.unchanged} ${comparison.summary.unchanged===1?'page':'pages'}`,
    'Not observed means there is no reliable current observation. It does not mean removed.',
  ].join('\n\n');
}
