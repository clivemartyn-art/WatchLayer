import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { LawReport,Service } from '../src/lawwatch/types.js';
import type { State } from '../src/rules/types.js';
export interface BenchmarkFirm {firm:string;url:string;service:string;rules:Record<string,string>;pricingSource:string;complaintsSource:string;notes:string}
export interface Benchmark {schemaVersion:1;sha256:string;firms:BenchmarkFirm[]}
export function readBenchmark():Benchmark {
  const bundled=join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
  const python=process.env.WATCHLAYER_PYTHON??(existsSync(bundled)?bundled:process.platform==='win32'?'python':'python3');
  return JSON.parse(execFileSync(python,['scripts/read-lawwatch-benchmark.py'],{encoding:'utf8',maxBuffer:2_000_000}));
}
export function benchmarkServices(label:string):Service[] {
  const services:Service[]=[];
  for(const [pattern,service] of [[/conveyancing|residential/i,'residential_conveyancing'],[/remortgage/i,'remortgage'],[/probate|estate/i,'probate'],[/immigration/i,'immigration'],[/appeals/i,'immigration_appeals'],[/motoring/i,'motoring'],[/employment|dismissal/i,'employment_employee'],[/employer/i,'employment_employer'],[/debt/i,'debt_recovery'],[/licensing/i,'business_licensing']] as const)if(pattern.test(label))services.push(service);
  return services;
}
export function evaluateBenchmark(firm:BenchmarkFirm,report:LawReport) {
  const services=benchmarkServices(firm.service);
  const checks=Object.entries(firm.rules).map(([ruleId,human])=>{
    const candidates=report.results.filter(r=>r.ruleId===ruleId&&(!r.serviceType||services.includes(r.serviceType)));
    let machine:State='UNKNOWN';
    if(candidates.length){const states=candidates.map(r=>r.status);machine=states.includes('POTENTIAL_ISSUE')?'POTENTIAL_ISSUE':states.every(s=>s==='PASS')?'PASS':states.every(s=>s==='NOT_APPLICABLE')?'NOT_APPLICABLE':states.includes('UNKNOWN')?'UNKNOWN':'WARNING';}
    return {ruleId,human,machine,severity:candidates[0]?.severity??'HIGH'};
  });
  const exactLabels:Record<string,State>={Pass:'PASS',Unknown:'UNKNOWN',Fail:'POTENTIAL_ISSUE'};
  const eligible=checks.filter(c=>c.human!=='N/A');
  const scored=eligible.filter(c=>c.human in exactLabels);
  const predictedPass=eligible.filter(c=>c.machine==='PASS');const predictedIssue=eligible.filter(c=>c.machine==='POTENTIAL_ISSUE');
  const falsePositives=predictedIssue.filter(c=>c.human!=='Fail');
  const ratio=(n:number,d:number)=>d?n/d:null;
  return {firm:firm.firm,checks,metrics:{exactAgreementRate:ratio(scored.filter(c=>exactLabels[c.human]===c.machine).length,scored.length),exactAgreementDenominator:scored.length,passPrecision:ratio(predictedPass.filter(c=>c.human==='Pass').length,predictedPass.length),passPredictions:predictedPass.length,potentialIssuePrecision:ratio(predictedIssue.filter(c=>c.human==='Fail').length,predictedIssue.length),potentialIssuePredictions:predictedIssue.length,unknownRate:ratio(eligible.filter(c=>c.machine==='UNKNOWN').length,eligible.length),falsePositiveCount:falsePositives.length,highSeverityFalsePositiveCount:falsePositives.filter(c=>['HIGH','CRITICAL'].includes(c.severity)).length,confirmedFalsePositiveCount:falsePositives.filter(c=>c.human==='Pass').length,unsupportedPassCount:predictedPass.filter(c=>c.human!=='Pass').length,reviewCount:checks.filter(c=>c.human==='Review').length,reviewCompatibleCount:checks.filter(c=>c.human==='Review'&&['UNKNOWN','WARNING'].includes(c.machine)).length,excludedNotApplicableCount:checks.filter(c=>c.human==='N/A').length}};
}
