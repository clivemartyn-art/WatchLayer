import type { RuleRun } from './types.js';
export interface RuleRepository {saveRuleRun(run:RuleRun):void; ruleRuns(scanId:string):RuleRun[]}
