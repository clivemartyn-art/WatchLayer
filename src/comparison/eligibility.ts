import { APPLICATION_VERSION, SNAPSHOT_SCHEMA_VERSION, type Snapshot } from '../snapshots/types.js';

export const ELIGIBILITY = { maxFailureRatio: 0.25, minCoverageRatio: 0.5 } as const;
export function selectBaseline(history: Snapshot[], crawlLimit: number,scanProfile?:string): Snapshot | undefined {
  return history.find(s => s.comparisonEligible && s.schemaVersion === SNAPSHOT_SCHEMA_VERSION && s.applicationVersion === APPLICATION_VERSION && s.crawlLimit === crawlLimit&&s.scanProfile===scanProfile);
}
export function assessEligibility(current: Snapshot, previous?: Snapshot): {eligible: boolean; warnings: string[]} {
  const warnings: string[] = [];
  let eligible = true;
  const reject = (warning: string) => { eligible = false; warnings.push(warning); };
  if (!current.coverage.homepageReached) reject('The starting page could not be retrieved as HTML.');
  if (!current.coverage.pagesScanned) reject('No HTML pages were observed.');
  const attempts = current.coverage.naturalAttempts;
  if (attempts && current.coverage.pagesFailed / attempts > ELIGIBILITY.maxFailureRatio) reject('More than 25% of crawl page requests failed.');
  const allAttempts=attempts+current.coverage.rechecksAttempted;
  if (current.coverage.rechecksFailed && allAttempts && (current.coverage.pagesFailed+current.coverage.rechecksFailed)/allAttempts > ELIGIBILITY.maxFailureRatio) reject('Crawl and recheck failures exceed 25% of attempted resources.');
  if (previous && current.coverage.pagesScanned < previous.coverage.pagesScanned * ELIGIBILITY.minCoverageRatio) reject('Fewer than half as many HTML pages were scanned as in the previous suitable scan.');
  if (current.coverage.crawlLimitReached) warnings.push('Crawl limit reached: unvisited resources are not evidence of removal.');
  if (current.coverage.discoveryErrors) warnings.push('Discovery errors may have reduced coverage.');
  if (current.coverage.rechecksFailed || current.coverage.rechecksSkipped) warnings.push('Some known-resource rechecks failed or were excluded.');
  if (current.pages.some(p=>p.observationStatus==='not_observed'&&p.textHash&&![404,410].includes(p.lastKnownStatus??0)) || current.documents.some(d=>d.observationStatus==='not_observed'&&![404,410].includes(d.lastKnownStatus??0))) warnings.push('Some known resources remain outside the observed set.');
  if (current.pages.some(p => p.observationStatus === 'excluded_from_scan')) warnings.push('Some pages were excluded by scope or robots policy.');
  if (current.pages.some(p => p.browserRenderRecommended)) warnings.push('Some page content may require browser rendering.');
  if (previous && previous.crawlLimit !== current.crawlLimit) reject('Different crawl limits make this comparison unsuitable.');
  if (previous && previous.scanProfile !== current.scanProfile) reject('Different discovery profiles make this comparison unsuitable.');
  if (current.schemaVersion !== SNAPSHOT_SCHEMA_VERSION || current.applicationVersion !== APPLICATION_VERSION) reject('Unsupported scanner or snapshot version.');
  return {eligible,warnings};
}
