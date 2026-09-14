import { pdfReport } from '../documents/report.js';
import type { ScanResult } from '../schemas/scan.js';
export function terminalReport(r: ScanResult): string {
  const s = r.summary;
  return `WATCHLAYER SCAN\n\nSite: ${r.site.hostname}\n\nDiscovery\n---------\nRobots.txt: ${r.discovery.robotsFound ? 'Found' : 'Not found'}\nSitemap: ${r.discovery.sitemapFound ? 'Found' : 'Not found'}\n\nCrawl\n-----\nPages discovered: ${s.pagesDiscovered}\nPages scanned: ${s.pagesScanned}\nPages failed: ${s.pagesFailed}\n\nWebsite content\n---------------\nDocuments: ${s.documentsFound}\nForms: ${s.formsFound}\nEmail addresses: ${s.emailsFound}\nTelephone numbers: ${s.phoneNumbersFound}\n\nPotential issues\n----------------\nBroken internal links: ${s.brokenInternalLinks}\nPages potentially requiring browser rendering: ${s.browserRenderRecommended}\nRecorded errors or skipped pages: ${r.errors.length}\n\n${s.crawlLimitReached ? 'Page limit reached; report covers the scanned portion.\n' : ''}${s.pagesScanned ? 'Scan completed' + (r.errors.length ? ' with issues.' : ' successfully.') : 'Scan finished without retrieving any HTML pages.'}`+(r.pdf?'\n\n'+pdfReport(r.pdf):'');
}
