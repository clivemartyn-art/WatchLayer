/** Interpret the sentence containing the located fact, not an unrelated nearby sentence. */
export function containingStatement(text:string,snippet:string):string {
  const at=text.indexOf(snippet);
  if(at<0)return snippet;
  // Decimal points do not end a sentence. PDF line breaks have already been normalized.
  const boundaries=[...text.matchAll(/[.!?](?=\s|$)/g)].map(m=>m.index!);
  const start=boundaries.filter(i=>i<at).at(-1);
  const end=boundaries.find(i=>i>=at+snippet.replace(/[.!?]$/,'').length);
  return text.slice(start===undefined?0:start+1,end===undefined?text.length:end+1).trim();
}
export function negatedChargingBasis(text:string,snippet:string):boolean {
  return /\b(?:do not|don't|does not|doesn't|never) charge\b[^.!?]{0,180}\b(?:percentage|fixed fee|hourly|per hour)\b/i.test(containingStatement(text,snippet));
}
export function taxOnlyExpense(snippet:string):boolean {
  return /^(?:there is |there's )?(?:no VAT|VAT is (?:not payable|payable|not applicable)) on (?:court fees?|land registry fees?|search fees?)[.!]?$/i.test(snippet.trim());
}
export function explicitChargeVat(snippet:string):boolean {
  return /\bwe charge £\s*\d[\d,]*(?:\.\d{2})?\s*(?:\+|plus)\s*20\s*%\s*VAT\b/i.test(snippet)
    && !/\b(?:not|example|hypothetical|may|might)\b/i.test(snippet);
}
