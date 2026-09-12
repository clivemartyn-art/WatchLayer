import type { State } from '../src/rules/types.js';
export interface Check {ruleId:string;human:string;machine:State;severity:string}
const strict:Record<string,State>={Pass:'PASS',Unknown:'UNKNOWN',Fail:'POTENTIAL_ISSUE'};
const ratio=(n:number,d:number)=>d?n/d:null;
/** Review is uncertain human evidence, not a labelled machine WARNING. */
export function metrics(checks:Check[]){
  const eligible=checks.filter(c=>c.human!=='N/A');
  const exact=eligible.filter(c=>c.human in strict);
  const passes=eligible.filter(c=>c.machine==='PASS');
  const issues=eligible.filter(c=>c.machine==='POTENTIAL_ISSUE');
  const highIssues=issues.filter(c=>['HIGH','CRITICAL'].includes(c.severity));
  const warnings=eligible.filter(c=>c.machine==='WARNING');
  const negatives=eligible.filter(c=>c.human==='Fail');
  const falseIssues=issues.filter(c=>c.human!=='Fail');
  const highFalse=highIssues.filter(c=>c.human!=='Fail');
  const exactCount=exact.filter(c=>strict[c.human]===c.machine).length;
  const reviewCompatible=eligible.filter(c=>c.human==='Review'&&['WARNING','UNKNOWN'].includes(c.machine)).length;
  return {
    eligibleChecks:eligible.length,excludedNotApplicable:checks.length-eligible.length,
    humanCounts:Object.fromEntries(['Pass','Review','Unknown','Fail'].map(label=>[label,eligible.filter(c=>c.human===label).length])),
    machineCounts:Object.fromEntries(['PASS','WARNING','POTENTIAL_ISSUE','UNKNOWN','NOT_APPLICABLE'].map(label=>[label,eligible.filter(c=>c.machine===label).length])),
    exactAgreement:{count:exactCount,denominator:exact.length,rate:ratio(exactCount,exact.length)},
    acceptableAgreement:{count:exactCount+reviewCompatible,denominator:eligible.length,rate:ratio(exactCount+reviewCompatible,eligible.length)},
    unknownCount:eligible.filter(c=>c.machine==='UNKNOWN').length,
    unknownRate:ratio(eligible.filter(c=>c.machine==='UNKNOWN').length,eligible.length),
    passPredictions:passes.length,passPrecision:ratio(passes.filter(c=>c.human==='Pass').length,passes.length),
    passRecall:ratio(passes.filter(c=>c.human==='Pass').length,eligible.filter(c=>c.human==='Pass').length),
    warningPredictions:warnings.length,warningPrecision:null,
    warningReviewCompatibility:ratio(warnings.filter(c=>c.human==='Review').length,warnings.length),
    potentialIssuePredictions:issues.length,potentialIssuePrecision:ratio(issues.filter(c=>c.human==='Fail').length,issues.length),
    highSeverityPotentialIssuePrecision:ratio(highIssues.filter(c=>c.human==='Fail').length,highIssues.length),
    falsePositiveCount:falseIssues.length,highSeverityFalsePositiveCount:highFalse.length,
    falsePositiveRate:ratio(falseIssues.length,eligible.length),highSeverityFalsePositiveRate:ratio(highFalse.length,eligible.filter(c=>['HIGH','CRITICAL'].includes(c.severity)).length),
    confirmedFalsePositiveCount:issues.filter(c=>c.human==='Pass').length,
    confirmedFalsePositiveRate:ratio(issues.filter(c=>c.human==='Pass').length,eligible.filter(c=>c.human==='Pass').length),
    confirmedHighSeverityFalsePositiveRate:ratio(highIssues.filter(c=>c.human==='Pass').length,eligible.filter(c=>c.human==='Pass'&&['HIGH','CRITICAL'].includes(c.severity)).length),
    unsupportedPassCount:passes.filter(c=>c.human!=='Pass').length,
    releaseGate:!highIssues.length||!negatives.length?'UNPROVEN':highFalse.length/highIssues.length<=0.05?'MET':'NOT_MET',
    limitations:['Human Review has no exact machine-state mapping. WARNING precision is unavailable; review compatibility is separate.','PASS precision is the human-confirmed fraction; unconfirmed predictions are not proven errors.','No potential-issue predictions or no negative ground truth cannot demonstrate the release precision gate.'],
  };
}
export function aggregate(checks:Check[]){return {overall:metrics(checks),perRule:Object.fromEntries([...new Set(checks.map(c=>c.ruleId))].sort().map(id=>[id,metrics(checks.filter(c=>c.ruleId===id))]))};}
