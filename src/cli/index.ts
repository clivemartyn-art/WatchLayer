import { writeFile } from 'node:fs/promises';
import { scan } from '../crawler/scan.js';
import { terminalReport } from '../reporting/terminal.js';
const args = process.argv.slice(2);
async function main() {
  if (!args.length || args.includes('--help')) { console.log('Usage: npm run scan -- <URL> [--json] [--output report.json] [--max-pages 100]'); return; }
  const input = args.shift()!; let json = false; let output: string|undefined; let maxPages = 100;
  while (args.length) { const flag = args.shift(); if (flag === '--json') json = true; else if (flag === '--output') { output = args.shift(); if (!output || output.startsWith('--')) throw new Error('--output requires a filename'); } else if (flag === '--max-pages') maxPages = Number(args.shift()); else throw new Error(`Unknown option: ${flag}`); }
  const result = await scan(input,{maxPages}); const serialized = JSON.stringify(result,null,2);
  if (output) await writeFile(output,serialized + '\n','utf8');
  console.log(json ? serialized : terminalReport(result));
  if (!result.summary.pagesScanned) process.exitCode = 1;
}
main().catch(error => { console.error(`WatchLayer: ${error.message}`); process.exitCode = 1; });
