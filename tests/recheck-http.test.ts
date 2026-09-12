import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import https from 'node:https';
import { createFetcher } from '../src/crawler/http.js';
vi.mock('node:dns/promises',()=>({lookup:vi.fn(async()=>[{address:'93.184.216.34',family:4}])}));
afterEach(()=>vi.restoreAllMocks());
it('checks every redirect against the recheck robots guard and preserves HEAD',async()=>{
  const methods:string[]=[];const destroyed=vi.fn();
  vi.spyOn(https,'request').mockImplementation(((url:URL,options:any,callback:any)=>{
    methods.push(options.method);const req=new EventEmitter() as any;
    req.end=()=>{const res=new EventEmitter() as any;res.statusCode=url.pathname==='/file.pdf'?302:200;res.headers={'content-type':'application/pdf',location:'/new.pdf'};res.destroy=()=>{destroyed();req.emit('close');};callback(res);};
    req.destroy=(error:Error)=>{req.emit('error',error);req.emit('close');};return req;
  }) as any);
  const guard=vi.fn(async()=>{});const response=await createFetcher('https://example.com',0)('https://example.com/file.pdf',{method:'HEAD',beforeRequest:guard});
  expect(methods).toEqual(['HEAD','HEAD']);expect(response.body).toBe('');expect(destroyed).toHaveBeenCalledTimes(2);expect(guard.mock.calls).toHaveLength(2);
});
it('does not connect if the per-hop policy guard excludes a URL',async()=>{
  const request=vi.spyOn(https,'request');await expect(createFetcher('https://example.com',0)('https://example.com/file.pdf',{method:'HEAD',beforeRequest:async()=>{throw new Error('Excluded by robots.txt');}})).rejects.toThrow('Excluded');expect(request).not.toHaveBeenCalled();
});
