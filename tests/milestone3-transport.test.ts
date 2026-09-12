import { afterEach,expect,it,vi } from 'vitest';
import { EventEmitter } from 'node:events';
import https from 'node:https';
import { createFetcher } from '../src/crawler/http.js';
vi.mock('node:dns/promises',()=>({lookup:vi.fn(async()=>[{address:'93.184.216.34',family:4}])}));
afterEach(()=>vi.restoreAllMocks());
it('records validated certificate evidence without disabling TLS validation',async()=>{
  vi.spyOn(https,'request').mockImplementation(((_url:unknown,options:any,callback:any)=>{
    expect(options.rejectUnauthorized).not.toBe(false);const req=new EventEmitter() as any;
    req.end=()=>{const res=new EventEmitter() as any;res.statusCode=200;res.headers={'content-type':'application/pdf'};res.socket={authorized:true,getPeerCertificate:()=>({valid_to:'Jan 1 00:00:00 2030 GMT'})};res.destroy=()=>req.emit('close');callback(res);};
    req.destroy=(error:Error)=>{req.emit('error',error);req.emit('close');};return req;
  }) as any);
  const response=await createFetcher('https://example.com',0)('https://example.com/file.pdf',{method:'HEAD'});expect(response.tls).toEqual({authorized:true,validTo:'Jan 1 00:00:00 2030 GMT'});
});
