import {Pool} from 'pg';
import {SqliteCommercialRepository,PostgresCommercialRepository} from './repository.js';
import {required,versions} from './operations.js';
import type {BillingConfig} from './billing.js';
import type {Repository} from './types.js';
export interface Config {databaseUrl:string;root:string;storage:string;emailSpool:string;adminToken:string;release:string;concurrency:number;cadenceMs:number;port:number;stripeKey?:string;webhookSecret?:string;billing:BillingConfig}
export function configuration(env:NodeJS.ProcessEnv=process.env):Config {
  const integer=(key:string,fallback:number,min:number,max:number)=>{const n=Number(env[key]??fallback);if(!Number.isSafeInteger(n)||n<min||n>max)throw new Error(`Invalid ${key}`);return n;};
  const baseUrl=env.REGSTEAD_BASE_URL??'https://regstead.example';const u=new URL(baseUrl);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('REGSTEAD_BASE_URL must be an HTTPS origin');
  const adminToken=required(env.REGSTEAD_ADMIN_TOKEN??'',256);if(adminToken.length<32)throw new Error('REGSTEAD_ADMIN_TOKEN needs at least 32 characters');
  if(env.EMAIL_PROVIDER&&env.EMAIL_PROVIDER!=='spool')throw new Error('Only the configured spool adapter is installed');
  const release=required(env.REGSTEAD_RELEASE??'',100);if(!/^[a-f0-9]{40}$/.test(release))throw new Error('REGSTEAD_RELEASE must be the deployed Git SHA');
  const monitorPriceId=env.REGSTEAD_STRIPE_MONITOR_PRICE_ID??'price_monitor_placeholder';
  return {databaseUrl:env.DATABASE_URL??'sqlite:.watchlayer/regstead.db',root:env.REGSTEAD_ENGINE_STORAGE??'.watchlayer/regstead-engine',storage:env.REGSTEAD_REPORT_STORAGE??'.watchlayer/regstead-reports',emailSpool:env.REGSTEAD_EMAIL_SPOOL??'.watchlayer/regstead-mail',adminToken,release,concurrency:integer('WORKER_CONCURRENCY',1,1,4),cadenceMs:integer('MONITORING_DEFAULT_CADENCE',86400000,3600000,31536000000),port:integer('PORT',8080,1,65535),stripeKey:env.STRIPE_SECRET_KEY,webhookSecret:env.STRIPE_WEBHOOK_SECRET,billing:{productId:env.REGSTEAD_STRIPE_PRODUCT_ID??'prod_regstead_placeholder',monitorPriceId,baseUrl:u.origin,termsVersion:env.REGSTEAD_TERMS_VERSION??'beta-v1',graceMs:integer('PAYMENT_GRACE_MS',0,0,2592000000),liveMode:env.STRIPE_LIVE_MODE==='true'}};
}
export async function repositoryFor(config:Config):Promise<Repository>{if(config.databaseUrl.startsWith('sqlite:'))return new SqliteCommercialRepository(config.databaseUrl.slice(7));if(/^postgres(?:ql)?:\/\//.test(config.databaseUrl)){const repository=new PostgresCommercialRepository(new Pool({connectionString:config.databaseUrl,max:5,connectionTimeoutMillis:10000,statement_timeout:10000}));await repository.migrate();return repository;}throw new Error('Unsupported database URL');}
export async function readiness(repository:Repository,config:Config,now=Date.now()){let database=false,worker=false;try{const d=await repository.read();database=true;worker=(d.heartbeats.worker??0)>now-90000;}catch{}const engine=!!versions(config.release).packVersion&&Number(process.versions.node.split('.')[0])>=22;const configured=!!config.stripeKey&&!!config.webhookSecret&&![config.billing.productId,config.billing.monitorPriceId].some(v=>v.includes('placeholder'));return {ready:database&&worker&&engine&&configured,database,worker,engine,configuration:configured};}
