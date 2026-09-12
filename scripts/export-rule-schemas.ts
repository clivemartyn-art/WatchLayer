import { mkdir,writeFile } from 'node:fs/promises';
import { resultSchema,findingSchema } from '../src/rules/json-schema.js';
import { lawReportSchema } from '../src/lawwatch/report-schema.js';
await mkdir('docs/schemas',{recursive:true});
await writeFile('docs/schemas/rule-result-v1.schema.json',JSON.stringify(resultSchema,null,2)+'\n');
await writeFile('docs/schemas/finding-v1.schema.json',JSON.stringify(findingSchema,null,2)+'\n');
await writeFile('docs/schemas/lawwatch-report-v1.schema.json',JSON.stringify(lawReportSchema,null,2)+'\n');
