import { SEVERITIES, STATES, type Rule, type RulePack, type Detector } from './types.js';
export const DEFAULT_THRESHOLDS = {certificateDays: 30, contentReductionPercent: 30, siteReductionPercent: 30};
const detectors: Detector[] = ['availability','https','certificate','discovery','broken_links','form_presence','form_structure','title','indexability','canonical','content_reduction','site_reduction'];
export function validatePack(input: unknown): RulePack {
  const p = input as RulePack;
  const string = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
  if (!p || p.schemaVersion!==1 || p.engineVersion!=='1' || ![p.id,p.name,p.version,p.description].every(string) || !Array.isArray(p.rules) || !p.rules.length) throw new Error('Invalid or incompatible rule pack');
  const ids = new Set<string>();
  for (const r of p.rules) {
    if (!r || r.schemaVersion!==1 || r.engineVersion!=='1' || r.packId!==p.id || ![r.id,r.name,r.version,r.description,r.category,r.documentation].every(string) || ids.has(r.id) || !SEVERITIES.includes(r.severity) || typeof r.enabled!=='boolean' || !detectors.includes(r.detector) || !['always','previous_pages','previous_documents','previous_forms','comparison'].includes(r.applicability) || !Array.isArray(r.evidenceRequirements) || !r.evidenceRequirements.length || !r.evidenceRequirements.every(string) || !r.resultMapping || !STATES.includes(r.resultMapping.healthy) || !STATES.includes(r.resultMapping.changed) || !r.configuration || typeof r.configuration!=='object') throw new Error('Invalid rule definition');
    const c=r.configuration;
    if (Object.keys(c).some(k=>!['target','urls','threshold'].includes(k)) || c.target!==undefined&&!['homepage','pages','documents','robots','sitemap'].includes(c.target) || c.threshold!==undefined&&(!Number.isFinite(c.threshold)||c.threshold<0||r.detector!=='certificate'&&c.threshold>100) || c.urls!==undefined&&(!Array.isArray(c.urls)||!c.urls.every(u=>{try{return ['http:','https:'].includes(new URL(u).protocol);}catch{return false;}}))) throw new Error('Invalid rule configuration');
    if (r.detector==='availability'&&!['homepage','pages','documents'].includes(c.target??'') || r.detector==='discovery'&&!['robots','sitemap'].includes(c.target??'') || ['certificate','content_reduction','site_reduction'].includes(r.detector)&&c.threshold===undefined) throw new Error('Missing detector configuration');
    // Configurable mappings cannot promote a bounded warning into a confirmed issue.
    if(r.resultMapping.healthy!=='PASS'||!['WARNING','POTENTIAL_ISSUE'].includes(r.resultMapping.changed)||r.resultMapping.changed==='POTENTIAL_ISSUE'&&!['availability','https','certificate','form_presence'].includes(r.detector)) throw new Error('Unsafe result mapping');
    ids.add(r.id);
  }
  return structuredClone(p);
}
const rows: [string,Rule['severity'],Detector,Rule['applicability'],Rule['configuration']][] = [
  ['Homepage available','CRITICAL','availability','always',{target:'homepage'}],
  ['HTTPS available','CRITICAL','https','always',{}],
  ['SSL certificate healthy','HIGH','certificate','always',{threshold:DEFAULT_THRESHOLDS.certificateDays}],
  ['Previously known important page available','HIGH','availability','previous_pages',{target:'pages'}],
  ['Previously known document available','HIGH','availability','previous_documents',{target:'documents'}],
  ['Sitemap available','MEDIUM','discovery','always',{target:'sitemap'}],
  ['robots.txt available','LOW','discovery','always',{target:'robots'}],
  ['No confirmed broken internal links','MEDIUM','broken_links','always',{}],
  ['Previously known important form present','HIGH','form_presence','previous_forms',{}],
  ['Known form structure unchanged','MEDIUM','form_structure','previous_forms',{}],
  ['Critical page has title','LOW','title','always',{}],
  ['Critical page indexable','MEDIUM','indexability','always',{}],
  ['Canonical URL stable','MEDIUM','canonical','comparison',{}],
  ['No major unexplained content reduction','MEDIUM','content_reduction','comparison',{threshold:DEFAULT_THRESHOLDS.contentReductionPercent}],
  ['No large unexplained site-size reduction','HIGH','site_reduction','comparison',{threshold:DEFAULT_THRESHOLDS.siteReductionPercent}],
];
export const universalPack: RulePack = validatePack({schemaVersion:1,id:'watchlayer-universal',name:'WatchLayer Universal',version:'1.0',description:'Deterministic public website observations',engineVersion:'1',rules:rows.map(([name,severity,detector,applicability,configuration],i)=>({schemaVersion:1,id:`WEB-U${String(i+1).padStart(3,'0')}`,name,description:name,category:detector,severity,version:'1.0',engineVersion:'1',enabled:true,applicability,detector,configuration,evidenceRequirements:['current observation state','source scan and URL'],resultMapping:{healthy:'PASS',changed:['availability','https','form_presence'].includes(detector)?'POTENTIAL_ISSUE':'WARNING'},documentation:'Evaluate only recorded observations. Unobserved resources are uncertain; findings are not legal judgments.',packId:'watchlayer-universal'}))});
