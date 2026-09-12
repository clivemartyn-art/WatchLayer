import type { Snapshot, PageObservation, FormObservation } from '../snapshots/types.js';
import { SNAPSHOT_SCHEMA_VERSION } from '../snapshots/types.js';
import { contentMateriality, MATERIALITY } from './materiality.js';
import type { Change, Comparison } from './types.js';

function pageIndex(pages: PageObservation[]): Map<string,PageObservation> {
  const index = new Map<string,PageObservation>();
  for (const page of pages) for (const alias of page.aliases) if (!index.has(alias)) index.set(alias,page);
  for (const page of pages) index.set(page.url,page);
  return index;
}
export function compareSnapshots(previous: Snapshot, current: Snapshot): Comparison {
  if (previous.canonicalDomain !== current.canonicalDomain) throw new Error('Cannot compare different sites');
  const warnings = [...current.comparisonWarnings];
  const compatible = previous.schemaVersion===current.schemaVersion && current.schemaVersion===SNAPSHOT_SCHEMA_VERSION && previous.applicationVersion===current.applicationVersion;
  if (!compatible) warnings.push('Scanner or snapshot versions are incompatible; comparison suppressed.');
  if (previous.crawlLimit!==current.crawlLimit) warnings.push('Crawl limits differ; removal conclusions are suppressed.');
  if (!previous.comparisonEligible) warnings.push('Previous scan is unsuitable for comparison.');
  if(previous.scanProfile!==current.scanProfile)warnings.push('Discovery profiles differ; removal conclusions are suppressed.');
  const eligible = compatible && previous.comparisonEligible && current.comparisonEligible && previous.crawlLimit===current.crawlLimit&&previous.scanProfile===current.scanProfile;
  const result: Comparison = {schemaVersion:1,site:current.canonicalDomain,previousScanId:previous.scanId,currentScanId:current.scanId,previousScanAt:previous.completedAt,currentScanAt:current.completedAt,comparisonEligible:eligible,comparisonWarnings:warnings,confidence:eligible&&!warnings.length?'high':'reduced',summary:{added:0,confirmedRemoved:0,changed:0,notObserved:0,unchanged:0},changes:[]};
  if (!compatible) return result;
  const categories = {added:new Set<string>(),confirmedRemoved:new Set<string>(),changed:new Set<string>(),notObserved:new Set<string>()};
  function add(change: Change, identity = change.url) {
    result.changes.push(change);
    const entity = change.type.split('_')[0]+':'+identity;
    if (change.type.endsWith('_ADDED')) categories.added.add(entity);
    else if (change.type.includes('REMOVED')) categories.confirmedRemoved.add(entity);
    else if (change.type.endsWith('_NOT_OBSERVED')) categories.notObserved.add(entity);
    else categories.changed.add(entity);
  }
  const before = pageIndex(previous.pages); const after = pageIndex(current.pages);
  const matched = new Set<PageObservation>();
  const unchangedPages = new Set<string>();
  for (const old of previous.pages) {
    if (!old.textHash) continue; // An unvisited discovered URL is not an old page.
    const page = after.get(old.url) ?? (old.finalUrl?after.get(old.finalUrl):undefined);
    if (page) matched.add(page);
    const base = {url:old.url,previousObservationScanId:old.lastObservedScanId};
    const wasMissing = old.observationStatus==='confirmed_missing'||old.lastKnownStatus===404||old.lastKnownStatus===410;
    if (wasMissing) {
      if (page?.observationStatus==='observed') add({...base,type:'PAGE_STATUS_CHANGED',severity:'low',confidence:eligible?'observed':'uncertain',previous:{status:old.lastKnownStatus??old.status},current:{status:page.status},reason:'Previously missing page was retrieved again'});
      continue;
    }
    if (!page || page.observationStatus !== 'observed') {
      if (eligible && page?.observationStatus==='confirmed_missing') {
        add({...base,type:'PAGE_CONFIRMED_REMOVED',severity:'high',confidence:'confirmed',previous:{status:old.lastKnownStatus??old.status},current:{status:page.status}});
        add({...base,type:'PAGE_STATUS_CHANGED',severity:'high',confidence:'confirmed',previous:{status:old.lastKnownStatus??old.status},current:{status:page.status}});
      } else {
        add({...base,type:'PAGE_NOT_OBSERVED',severity:'low',confidence:'uncertain',current:{observationStatus:page?.observationStatus??'not_observed',status:page?.status??null},reason:page?.reason??'No reliable current HTML observation'});
        if (page?.status!==null&&page?.status!==undefined&&page.status!==(old.lastKnownStatus??old.status)) add({...base,type:'PAGE_STATUS_CHANGED',severity:'medium',confidence:'observed',previous:{status:old.lastKnownStatus??old.status},current:{status:page.status}});
      }
      continue;
    }
    const initial = result.changes.length;
    const emit = (type: Change['type'], oldValue: unknown, value: unknown, severity: Change['severity']='low') => {
      if (JSON.stringify(oldValue)!==JSON.stringify(value)) add({...base,type,severity,confidence:eligible?'observed':'uncertain',previous:oldValue,current:value});
    };
    emit('PAGE_STATUS_CHANGED',old.lastKnownStatus??old.status,page.status,'medium');
    emit('PAGE_REDIRECT_CHANGED',old.lastKnownFinalUrl??old.finalUrl,page.finalUrl,'medium');
    emit('PAGE_TITLE_CHANGED',old.title,page.title);
    emit('PAGE_META_CHANGED',{description:old.metaDescription,h1:old.h1},{description:page.metaDescription,h1:page.h1});
    emit('PAGE_CANONICAL_CHANGED',old.canonicalUrl,page.canonicalUrl);
    emit('PAGE_ROBOTS_CHANGED',old.robots,page.robots,'medium');
    emit('PAGE_BROWSER_RENDER_STATE_CHANGED',old.browserRenderRecommended,page.browserRenderRecommended,'medium');
    if (old.textHash!==page.textHash) {
      const materiality=contentMateriality(old.wordCount??0,page.wordCount??0);
      add({...base,type:'PAGE_CONTENT_CHANGED',severity:materiality.materiality==='major'?'high':materiality.materiality==='moderate'?'medium':'low',confidence:eligible?'observed':'uncertain',previous:{textHash:old.textHash},current:{textHash:page.textHash},...materiality});
      if (materiality.context.percentageDifference>=MATERIALITY.moderatePercent) add({...base,type:'PAGE_WORD_COUNT_CHANGED_SIGNIFICANTLY',severity:'medium',confidence:eligible?'observed':'uncertain',...materiality});
    }
    if (result.changes.length===initial) unchangedPages.add(old.url);
  }
  for (const page of current.pages) if (page.observationStatus==='observed'&&!matched.has(page)) {
    const old=before.get(page.url)??(page.finalUrl?before.get(page.finalUrl):undefined);
    if (!old?.textHash) add({type:'PAGE_ADDED',url:page.url,severity:'low',confidence:eligible?'observed':'uncertain',current:{status:page.status,title:page.title}});
  }
  const oldDocs = new Map(previous.documents.map(d=>[d.url,d])); const newDocs = new Map(current.documents.map(d=>[d.url,d]));
  for (const old of previous.documents) {
    if (old.observationStatus==='confirmed_missing' || old.lastKnownStatus===404 || old.lastKnownStatus===410) continue;
    const doc=newDocs.get(old.url);
    if (doc?.observationStatus==='observed') continue;
    const removed=eligible&&doc?.observationStatus==='confirmed_missing';
    add({type:removed?'DOCUMENT_CONFIRMED_REMOVED':'DOCUMENT_NOT_OBSERVED',url:old.url,severity:removed?'high':'low',confidence:removed?'confirmed':'uncertain',current:{status:doc?.status??null,observationStatus:doc?.observationStatus??'not_observed'},reason:doc?.reason,previousObservationScanId:old.lastObservedScanId});
  }
  for (const doc of current.documents) if (doc.observationStatus==='observed' && (!oldDocs.has(doc.url)||oldDocs.get(doc.url)!.observationStatus==='confirmed_missing'||[404,410].includes(oldDocs.get(doc.url)!.lastKnownStatus??0))) add({type:'DOCUMENT_ADDED',url:doc.url,severity:'low',confidence:eligible?'observed':'uncertain',current:{filename:doc.filename,type:doc.type}});
  const reliable = (url: string) => { const page=after.get(url); return eligible&&page?.observationStatus==='observed'&&page.evidence==='html'&&!page.browserRenderRecommended; };
  const groupForms = (forms: FormObservation[]) => { const groups=new Map<string,FormObservation[]>(); for(const form of forms) { const page=after.get(form.pageUrl)??before.get(form.pageUrl); const key=page?.url??form.pageUrl; const group=groups.get(key)??[];group.push(form);groups.set(key,group); } return groups; };
  const oldGroups=groupForms(previous.forms); const newGroups=groupForms(current.forms.filter(f=>f.observationStatus==='observed'));
  for(const pageUrl of new Set([...oldGroups.keys(),...newGroups.keys()])) {
    const oldForms=oldGroups.get(pageUrl)??[]; const newForms=newGroups.get(pageUrl)??[];
    const buckets=new Map<string,FormObservation[]>(); for(const form of newForms){const bucket=buckets.get(form.fingerprint)??[];bucket.push(form);buckets.set(form.fingerprint,bucket);}
    const unmatchedOld=oldForms.filter(f=>!buckets.get(f.fingerprint)?.pop());
    const unmatchedNew=[...buckets.values()].flat();
    // Without stable HTML form IDs, only an unambiguous remaining pair is a
    // changed form; ambiguous matches are not claimed to be removals.
    if(unmatchedOld.length===1&&unmatchedNew.length===1) {
      add({type:'FORM_CHANGED',url:pageUrl,severity:'medium',confidence:reliable(pageUrl)?'observed':'uncertain',previous:unmatchedOld[0],current:unmatchedNew[0]},pageUrl+':'+unmatchedOld[0].fingerprint);
    } else {
      unmatchedOld.forEach((form,i)=>add({type:reliable(pageUrl)&&!unmatchedNew.length?'FORM_CONFIRMED_REMOVED':'FORM_NOT_OBSERVED',url:pageUrl,severity:reliable(pageUrl)&&!unmatchedNew.length?'medium':'low',confidence:reliable(pageUrl)&&!unmatchedNew.length?'confirmed':'uncertain',previous:form},pageUrl+':'+form.fingerprint+':'+i));
      unmatchedNew.forEach((form,i)=>add({type:'FORM_ADDED',url:pageUrl,severity:'low',confidence:reliable(pageUrl)?'observed':'uncertain',current:form},pageUrl+':'+form.fingerprint+':'+i));
    }
  }
  for (const kind of ['emails','phones'] as const) {
    const oldFacts=new Map(previous.contacts[kind].map(c=>[c.value,c])); const newFacts=new Map(current.contacts[kind].filter(c=>c.observationStatus==='observed').map(c=>[c.value,c]));
    for(const fact of newFacts.values()) if(!oldFacts.has(fact.value)) add({type:kind==='emails'?'EMAIL_ADDED':'PHONE_ADDED',url:fact.sourcePages[0]??current.canonicalStartUrl,severity:'low',confidence:eligible?'observed':'uncertain',current:fact},fact.value);
    for(const fact of oldFacts.values()) if(!newFacts.has(fact.value)&&fact.sourcePages.length&&fact.sourcePages.every(reliable)) add({type:kind==='emails'?'EMAIL_REMOVED_FROM_OBSERVED_SITE':'PHONE_REMOVED_FROM_OBSERVED_SITE',url:fact.sourcePages[0],severity:'medium',confidence:'confirmed',previous:fact},fact.value);
  }
  for(const key of Object.keys(categories) as (keyof typeof categories)[]) result.summary[key]=categories[key].size;
  for (const change of result.changes) {const page=before.get(change.url);if(page)unchangedPages.delete(page.url);}
  result.summary.unchanged=unchangedPages.size;
  result.changes.sort((a,b)=>a.url.localeCompare(b.url)||a.type.localeCompare(b.type));
  return result;
}
