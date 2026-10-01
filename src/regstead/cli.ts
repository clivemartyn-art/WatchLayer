import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {configuration,readiness,repositoryFor} from './config.js';
import {authenticate,digest,Operations,versions} from './operations.js';
import {StripeProvider,Billing} from './billing.js';
import {FileArtifactStore,releaseReport} from './reports.js';
import {WatchLayerEngine} from './engine.js';
import {Worker} from './worker.js';
import {Notifications,SpoolEmailProvider} from './notifications.js';
import {PortalAccess} from './portal-access.js';
import {CustomerPortal} from './portal-http.js';
import {ResendEmailProvider,UnavailableAuthEmail} from './email-provider.js';
import {httpService} from './http.js';
import {AdminAccess} from './admin-access.js';
import {AdminPortal} from './admin-http.js';
export const HELP=`Regstead operator CLI (REGSTEAD_OPERATOR_TOKEN + REGSTEAD_OPERATOR required)
  onboard <input.json>        identity, URL, explicit pack/packConfirmed/sectorApplicability
  list <organisations|sites|subscriptions|checkouts|jobs|runs|reports|webhooks|notifications|audit>
  review-queue | failures | inspect <report-id>
  queue <site-id> <BASELINE|MANUAL_RECHECK> <request-key>
  review <report-id> <finding-id> <APPROVED|SUPPRESSED|ANNOTATED> <note> [title] [explanation]
  release <report-id> | export <report-id> <output.html>
  retry <job-id> | retry-webhook <event-id> | retry-email <notification-id>
  pause <site-id> | resume <site-id> | schedule
  checkout <organisation-id> <accepted-terms-version> | billing-portal <organisation-id>
  portal-user-create <input.json> (organisationId, email, displayName, approvedPilot)
  portal-user-list | portal-user-disable <user-id> | portal-invite <user-id>
  operator-user-create <input.json> (email, displayName) | operator-user-list
  operator-user-disable <user-id> | operator-invite <user-id>
  health | ready | worker [--once] | serve
Cancellation is performed through the Stripe Billing Portal; verified subscription webhooks stop monitoring.`;
export async function main(args:string[]){if(!args.length||args[0]==='--help'){console.log(HELP);return;}const config=configuration();const actor=authenticate(process.env.REGSTEAD_OPERATOR_TOKEN,config.adminToken,process.env.REGSTEAD_OPERATOR??'');const repository=await repositoryFor(config),ops=new Operations(repository,versions(config.release)),storage=new FileArtifactStore(config.storage);const billing=config.stripeKey&&config.webhookSecret?new Billing(repository,new StripeProvider(config.stripeKey,config.webhookSecret,config.billing),config.billing,versions(config.release)):undefined;const email=config.emailProvider==='resend'?new ResendEmailProvider(repository,config.emailKey??'',config.emailFrom??'',fetch,Date.now,config.emailReplyTo):new SpoolEmailProvider(config.emailSpool);const notifications=new Notifications(repository,email,config.portalOrigin);const authEmail=config.emailProvider==='resend'?email:new UnavailableAuthEmail(),access=new PortalAccess(repository,authEmail,config.portalOrigin),adminAccess=new AdminAccess(repository,authEmail,config.portalOrigin);const portal=new CustomerPortal(access,storage,billing,config.trustedProxyAddress),admin=new AdminPortal(adminAccess,ops,storage,billing,notifications,()=>readiness(repository,config),config.trustedProxyAddress);const [command,a,b,c,d,e,f]=args;const output=(value:unknown)=>console.log(JSON.stringify(value,null,2));let keepOpen=false;
  try{switch(command){
    case 'portal-user-create':{const input=JSON.parse(await readFile(a,'utf8'));if(input.approvedPilot!==undefined&&typeof input.approvedPilot!=='boolean')throw new Error('Invalid pilot approval');output(await access.create(input.organisationId,input.email,input.displayName,actor,input.approvedPilot===true));break;}
    case 'portal-user-list':output((await repository.read()).portalUsers);break;
    case 'portal-user-disable':await access.disable(a,actor);break;
    case 'portal-invite':await access.invite(a,actor);output({requested:true});break;
    case 'operator-user-create':{const input=JSON.parse(await readFile(a,'utf8'));output(await adminAccess.create(input.email,input.displayName,actor));break;}
    case 'operator-user-list':output((await repository.read()).operatorUsers);break;
    case 'operator-user-disable':await adminAccess.disable(a,actor);break;
    case 'operator-invite':await adminAccess.invite(a,actor);output({requested:true});break;
    case 'onboard':output(await ops.onboard({...JSON.parse(await readFile(a,'utf8')),cadenceMs:config.cadenceMs},actor));break;
    case 'list':{if(!['organisations','sites','subscriptions','checkouts','jobs','runs','reports','webhooks','notifications','audit'].includes(a))throw new Error('Unsupported collection');output((await repository.read())[a as 'jobs']);break;}
    case 'review-queue':output((await repository.read()).jobs.filter(j=>j.status==='AWAITING_REVIEW'||j.status==='APPROVED'));break;
    case 'failures':{const data=await repository.read();output({jobs:data.jobs.filter(j=>j.status==='FAILED'),webhooks:data.webhooks.filter(j=>j.status==='FAILED'),notifications:data.notifications.filter(j=>j.status==='FAILED')});break;}
    case 'inspect':{const data=await repository.read();output({report:data.reports.find(r=>r.id===a),reviews:data.reviews.filter(r=>r.reportId===a)});break;}
    case 'queue':if(!['BASELINE','MANUAL_RECHECK'].includes(b))throw new Error('Invalid job type');output(await ops.queue(a,b as 'BASELINE'|'MANUAL_RECHECK',c,actor));break;
    case 'review':await ops.review(a,b,c as 'APPROVED',d,actor,e,f);break;
    case 'release':output(await releaseReport(repository,storage,a,actor));break;
    case 'export':{const report=(await repository.read()).reports.find(r=>r.id===a&&r.status==='RELEASED');if(!report?.artifact)throw new Error('No released artifact');const artifact=await storage.get(report.artifact);if(digest(artifact)!==report.hash)throw new Error('Artifact integrity mismatch');await writeFile(b,artifact,{flag:'wx',mode:0o600});break;}
    case 'retry':await ops.retry(a,actor);break;
    case 'retry-webhook':if(!billing)throw new Error('Stripe not configured');await billing.retry(a,actor);break;
    case 'retry-email':await notifications.retry(a,actor);break;
    case 'pause':case 'resume':await ops.pause(a,command==='pause',actor);break;
    case 'schedule':output({queued:await ops.schedule()});break;
    case 'checkout':if(!billing)throw new Error('Stripe not configured');output(await billing.checkout(a,b,actor));break;
    case 'billing-portal':if(!billing)throw new Error('Stripe not configured');output({url:await billing.billingPortal(a)});break;
    case 'health':output({alive:true});break;
    case 'ready':{const state=await readiness(repository,config);output(state);if(!state.ready)process.exitCode=1;break;}
    case 'serve':{if(!billing)throw new Error('Stripe not configured');const server=httpService(billing,()=>readiness(repository,config),portal,admin);server.requestTimeout=20000;server.headersTimeout=10000;server.listen(config.port);keepOpen=true;const shutdown=()=>server.close(()=>{void repository.close();});process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);break;}
    case 'worker':{let stop=false;const shutdown=()=>{stop=true;};process.once('SIGTERM',shutdown);process.once('SIGINT',shutdown);const engine=new WatchLayerEngine(config.root,repository,undefined,config.release);const heartbeat=setInterval(()=>{void repository.transaction(d=>{d.heartbeats.worker=Date.now();}).catch(()=>{stop=true;});},20000);let lastAudit=0;try{do{await repository.transaction(d=>{d.heartbeats.worker=Date.now();});await ops.schedule();if(billing)await billing.processOne();await Promise.all(Array.from({length:config.concurrency},()=>new Worker(repository,engine).once()));await notifications.once();const data=await repository.read();for(const entry of data.audit.slice(lastAudit))console.log(JSON.stringify(entry));lastAudit=data.audit.length;if(b==='--once'||a==='--once')break;if(!stop)await new Promise(r=>setTimeout(r,1000));}while(!stop);}finally{clearInterval(heartbeat);process.removeListener('SIGTERM',shutdown);process.removeListener('SIGINT',shutdown);}break;}
    default:throw new Error('Unknown command');
  }}finally{if(!keepOpen)await repository.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).catch(error=>{console.error(JSON.stringify({event:'operator_error',code:error?.code??'OPERATION_REJECTED'}));process.exitCode=1;});
