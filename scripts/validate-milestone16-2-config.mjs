import {readFile} from 'node:fs/promises';

const read=path=>readFile(path,'utf8');
const [gateway,staging,production,caddy,stagingEnv,productionEnv]=await Promise.all([
  read('deploy/gateway.compose.yml'),read('deploy/staging-isolated.compose.yml'),read('deploy/production.compose.yml'),
  read('deploy/Caddyfile.m16-2'),read('config/regstead-staging.example'),read('config/regstead-production.example'),
]);
const requireText=(body,text,label)=>{if(!body.includes(text))throw new Error(`${label}: missing ${text}`);};
for(const [body,label] of [[gateway,'gateway'],[staging,'staging'],[production,'production']]){
  requireText(body,'restart: unless-stopped',label);
  if(/(?:sk_live_|rk_live_|whsec_|-----BEGIN .*PRIVATE KEY-----)/.test(body))throw new Error(`${label}: secret-like value present`);
}
requireText(gateway,'regstead-staging-edge','gateway');
requireText(gateway,'regstead-production-edge','gateway');
requireText(caddy,'{$REGSTEAD_STAGING_HOST}','caddy');
requireText(caddy,'{$REGSTEAD_PRODUCTION_HOST}','caddy');
requireText(staging,'regstead-staging_app-data','staging');
requireText(staging,'external: true','staging');
requireText(production,'regstead-production_app-data','production');
if(production.includes('regstead-staging_app-data'))throw new Error('production: staging volume reference');
if(staging.includes('regstead-production_app-data'))throw new Error('staging: production volume reference');
requireText(staging,"::ffff:172.30.15.254",'staging');
requireText(production,"::ffff:172.30.16.254",'production');
requireText(stagingEnv,'https://staging-app.regstead.co.uk','staging env');
requireText(stagingEnv,'STRIPE_LIVE_MODE=false','staging env');
requireText(productionEnv,'https://app.regstead.co.uk','production env');
requireText(productionEnv,'STRIPE_LIVE_MODE=true','production env');
requireText(productionEnv,'EMAIL_PROVIDER=resend','production env');
requireText(productionEnv,'REGSTEAD_TERMS_VERSION=monitor-2026-10-01','production env');
if(/STRIPE_TAX|automatic_tax/i.test(productionEnv))throw new Error('production env: Stripe Tax must remain disabled');
if(/(?:sk_live_[A-Za-z0-9]+|rk_live_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+)/.test([stagingEnv,productionEnv].join('\n')))throw new Error('secret-like value present');
console.log(JSON.stringify({status:'PASS',stagingHost:'staging-app.regstead.co.uk',productionHost:'app.regstead.co.uk',stagingVolume:'regstead-staging_app-data',productionVolume:'regstead-production_app-data',stripeTax:false},null,2));
