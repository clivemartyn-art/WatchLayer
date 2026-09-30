import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
const [envFile,output]=process.argv.slice(2);
if(!envFile||!output)throw new Error('Usage: node scripts/validate-milestone15-container.mjs <external-env-file> <new-output-json>');
const args=['compose','--env-file',envFile,'-f','deploy/staging.compose.yml'];
const run=(...command)=>execFileSync('docker',command,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:600000});
run(...args,'build');run(...args,'up','-d');
const inspect=(service,code)=>run(...args,'exec','-T',service,'node','--input-type=module','-e',code).trim();
const runtime=inspect('service',"import fs from 'node:fs';if(process.getuid()===0)throw Error('Root user');fs.writeFileSync('/data/m15-persistence-marker','m15');try{fs.writeFileSync('/app/m15-write-probe','bad');throw Error('Source tree is writable');}catch(e){if(e.code!=='EACCES')throw e;}console.log(JSON.stringify({uid:process.getuid(),node:process.version}));");
const chromium=inspect('worker',"import {chromium} from 'playwright';const b=await chromium.launch({headless:true});console.log(b.version());await b.close();");
run(...args,'restart','service','worker');
let ready=false;for(let attempt=0;attempt<30&&!ready;attempt++){try{const result=inspect('service',"const h=await fetch('http://127.0.0.1:8080/health'),r=await fetch('http://127.0.0.1:8080/ready');if(!h.ok||!r.ok)process.exit(1);console.log('ready');");ready=result==='ready';}catch{await new Promise(r=>setTimeout(r,1000));}}
if(!ready)throw new Error('Staging readiness failed');
inspect('service',"import fs from 'node:fs';if(fs.readFileSync('/data/m15-persistence-marker','utf8')!=='m15')throw Error('Persistence failed');");
const image=run('image','inspect','regstead:m15-staging','--format','{{.Id}}').trim();
writeFileSync(output,JSON.stringify({at:new Date().toISOString(),image,runtime:JSON.parse(runtime),chromium,health:true,ready:true,restartStorage:true,limitations:['Does not replace Stripe/email/customer-journey/restore validation']},null,2),{flag:'wx'});
console.log('Container checks passed; staging services and volumes retained.');
