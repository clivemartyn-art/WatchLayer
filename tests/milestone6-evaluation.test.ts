import { expect,it } from 'vitest';
import { negativeMetrics } from '../scripts/negative-metrics.js';
import { reusedEvidence } from '../scripts/lawwatch-adjudication.js';
import type { LawReport } from '../src/lawwatch/types.js';
it('keeps zero-emission precision unavailable while exposing missed negatives',()=>{const m=negativeMetrics([{expectedIssue:true,emitted:false},{expectedIssue:false,emitted:false}]);expect(m.precision).toBeNull();expect(m.recall).toBe(0);expect(m.falseNegatives).toBe(1);});
it('counts true positives, false positives and misses independently',()=>{expect(negativeMetrics([{expectedIssue:true,emitted:true},{expectedIssue:false,emitted:true},{expectedIssue:true,emitted:false}])).toMatchObject({precision:0.5,recall:0.5,truePositives:1,falsePositives:1,falseNegatives:1});});
const row=(ruleId:string,serviceType:string,snippet:string)=>({ruleId,serviceType,status:'PASS',evidence:[{observed:{matches:[{url:'https://example.com/prices',fact:{snippet,confidence:'HIGH'}}]}}]}) as unknown as LawReport['results'][number];
it('flags exact evidence reuse across services without declaring a false PASS',()=>{const flags=reusedEvidence([row('PRICE-008','probate','Fees include VAT'),row('PRICE-008','residential_conveyancing','Fees include VAT')]);expect(flags).toHaveLength(1);expect(flags[0].uses).toHaveLength(2);expect(flags[0]).not.toHaveProperty('verdict');});
it('does not confuse sharing a URL or duplicate extraction with cross-rule reuse',()=>{expect(reusedEvidence([row('PRICE-008','probate','Fees include VAT'),row('PRICE-008','probate','Fees include VAT'),row('PRICE-001','probate','Our fee is £900')])).toEqual([]);});
