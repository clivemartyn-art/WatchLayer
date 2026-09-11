export interface ScanError { url: string; stage: string; message: string; status?: number }
export interface Link { url: string; kind: 'internal'|'external'|'document'|'email'|'telephone'|'fragment'|'unsupported' }
export interface Form { pageUrl: string; method: string; action: string; fields: { name: string; type: string }[]; hasSubmit: boolean; classification: 'contact'|'enquiry'|'newsletter'|'search'|'login'|'unknown' }
export interface Page { requestedUrl: string; finalUrl: string; status: number; title: string; metaDescription: string; canonicalUrl: string|null; robots: string|null; h1: string[]; text: string; wordCount: number; internalLinks: string[]; externalLinks: string[]; documentLinks: string[]; links: Link[]; forms: Form[]; emails: string[]; phones: string[]; contentType: string; responseTimeMs: number; redirects: string[]; browser_render_recommended: boolean }
export interface Document { url: string; filename: string; type: string; sourcePages: string[] }
export interface Contact { value: string; sourcePages: string[] }
export interface ScanResult {
  schemaVersion: 1;
  site: { inputUrl: string; canonicalUrl: string; hostname: string; scannedAt: string };
  discovery: { robotsFound: boolean; sitemapFound: boolean; sitemapUrlsFound: number };
  summary: { pagesDiscovered: number; pagesScanned: number; pagesFailed: number; brokenInternalLinks: number; documentsFound: number; formsFound: number; emailsFound: number; phoneNumbersFound: number; browserRenderRecommended: number; crawlLimitReached: boolean };
  pages: Page[]; documents: Document[]; forms: Form[];
  brokenLinks: { sourcePage: string; destinationUrl: string; status?: number; error?: string }[];
  contacts: { emails: Contact[]; phones: Contact[] }; errors: ScanError[];
}
