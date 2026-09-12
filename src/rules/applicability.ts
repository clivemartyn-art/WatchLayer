import type { Context, Rule, Result } from './types.js';
export function applicability(rule: Rule, {current,previous}: Context): Result['applicability'] {
  if (!rule.enabled) return 'not_applicable';
  if(rule.applicability==='always')return 'applicable';
  if(!previous || previous.canonicalDomain!==current.canonicalDomain || previous.schemaVersion!==current.schemaVersion || previous.applicationVersion!==current.applicationVersion || previous.crawlLimit!==current.crawlLimit)return 'uncertain';
  const resources = rule.applicability==='previous_pages'?previous.pages:rule.applicability==='previous_documents'?previous.documents:rule.applicability==='previous_forms'?previous.forms:undefined;
  return resources?.length===0?'not_applicable':'applicable';
}
