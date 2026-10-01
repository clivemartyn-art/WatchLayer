import {readFile} from 'node:fs/promises';
import {describe,expect,it} from 'vitest';

const read=(path:string)=>readFile(path,'utf8');
describe('M16.2 production separation',()=>{
  it('uses distinct staging and production volumes, networks and proxy peers',async()=>{const [s,p,g]=await Promise.all([read('deploy/staging-isolated.compose.yml'),read('deploy/production.compose.yml'),read('deploy/gateway.compose.yml')]);expect(s).toContain('regstead-staging_app-data');expect(p).toContain('regstead-production_app-data');expect(p).not.toContain('regstead-staging_app-data');expect(s).toContain('172.30.15.254');expect(p).toContain('172.30.16.254');expect(g).toContain('regstead-staging-edge');expect(g).toContain('regstead-production-edge');});
  it('locks the approved hosts and live-mode split without enabling Stripe Tax',async()=>{const [s,p,c]=await Promise.all([read('config/regstead-staging.example'),read('config/regstead-production.example'),read('deploy/Caddyfile.m16-2')]);expect(s).toContain('https://staging-app.regstead.co.uk');expect(s).toContain('STRIPE_LIVE_MODE=false');expect(p).toContain('https://app.regstead.co.uk');expect(p).toContain('STRIPE_LIVE_MODE=true');expect(p).not.toMatch(/STRIPE_TAX|automatic_tax/i);expect(c).toContain('{$REGSTEAD_STAGING_HOST}');expect(c).toContain('{$REGSTEAD_PRODUCTION_HOST}');});
  it('contains placeholders rather than committed provider credentials',async()=>{const text=(await Promise.all([read('config/regstead-staging.example'),read('config/regstead-production.example')])).join('\n');expect(text).not.toMatch(/(?:sk_live_|rk_live_|whsec_|re_[A-Za-z0-9]{20,})/);expect(text).toContain('replace-with-restricted-live-key');});
});
