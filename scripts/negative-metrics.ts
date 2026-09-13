export function negativeMetrics(rows:{expectedIssue:boolean;emitted:boolean}[]){
  const tp=rows.filter(r=>r.expectedIssue&&r.emitted).length,fp=rows.filter(r=>!r.expectedIssue&&r.emitted).length,fn=rows.filter(r=>r.expectedIssue&&!r.emitted).length;
  return {totalCases:rows.length,expectedIssues:tp+fn,emittedIssues:tp+fp,truePositives:tp,falsePositives:fp,falseNegatives:fn,precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null};
}
