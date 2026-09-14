import { afterEach,expect,it,vi } from 'vitest';
import { EventEmitter } from 'node:events';
import https from 'node:https';
import { createFetcher } from '../src/crawler/http.js';
vi.mock('node:dns/promises',()=>({lookup:vi.fn(async()=>[{address:'93.184.216.34',family:4}])}));
afterEach(()=>vi.restoreAllMocks());
const site='https://example.com';
function transport(reply:(url:URL)=>{status?:number;location?:string;bytes?:Buffer;length?:string;slow?:boolean}){
 return vi.spyOn(https,'request').mockImplementation(((url:URL,options:any,callback:any)=>{
  const req=new EventEmitter() as any;let closed=false;
  req.destroy=(error?:Error)=>{closed=true;if(error)req.emit('error',error);req.emit('close');};
  req.end=()=>{const data=reply(url);const res=new EventEmitter() as any;res.statusCode=data.status??200;res.headers={'content-type':'application/pdf',...(data.location?{location:data.location}:{}),...(data.length?{'content-length':data.length}:{})};res.destroy=()=>req.destroy();
   callback(res);if(!closed&&!data.slow){if(data.bytes)res.emit('data',data.bytes);if(!closed)res.emit('end');req.emit('close');}
  };options.lookup('example.com',{},(err:unknown,address:string)=>{expect(err).toBeNull();expect(address).toBe('93.184.216.34');});return req;
 }) as any);
}
it.each(['https://localhost/a.pdf','https://127.0.0.1/a.pdf','https://10.0.0.1/a.pdf','https://172.16.0.1/a.pdf','https://192.168.0.1/a.pdf','https://169.254.169.254/a.pdf','https://[::1]/a.pdf','https://other.org/a.pdf','file:///a.pdf','ftp://example.com/a.pdf','http://example.com/a.pdf'])('blocks unsafe PDF redirect %s',async location=>{const spy=transport(()=>({status:302,location}));await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true})).rejects.toThrow();expect(spy).toHaveBeenCalledTimes(1);});
it.each(['file:///a.pdf','ftp://example.com/a.pdf','https://user:password@example.com/a.pdf','https://example.com:8080/a.pdf'])('blocks malicious PDF URL %s',async url=>{const spy=transport(()=>({}));await expect(createFetcher(site,0)(url,{binary:true})).rejects.toThrow();expect(spy).not.toHaveBeenCalled();});
it('rechecks DNS at PDF redirect destinations',async()=>{const {lookup}=await import('node:dns/promises');vi.mocked(lookup).mockResolvedValueOnce([{address:'93.184.216.34',family:4}] as never).mockResolvedValueOnce([{address:'10.0.0.1',family:4}] as never);const spy=transport(()=>({status:302,location:'https://cdn.example.com/a.pdf'}));await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true})).rejects.toThrow('unsafe');expect(spy).toHaveBeenCalledTimes(1);});
it('bounds PDF redirect chains',async()=>{const spy=transport(url=>({status:302,location:url.href+'a'}));await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true})).rejects.toThrow('Too many redirects');expect(spy).toHaveBeenCalledTimes(6);});
it('rejects a PDF redirect loop',async()=>{transport(()=>({status:302,location:'/a.pdf'}));await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true})).rejects.toThrow('loop');});
it('checks robots at each PDF redirect hop',async()=>{transport(()=>({status:302,location:'/blocked.pdf'}));const guard=vi.fn(async url=>{if(url.endsWith('blocked.pdf'))throw new Error('Excluded by robots.txt');});await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true,beforeRequest:guard})).rejects.toThrow('robots');expect(guard).toHaveBeenCalledTimes(2);});
it('rejects an oversized Content-Length before buffering',async()=>{transport(()=>({length:'10000001',bytes:Buffer.from('short')}));await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true})).rejects.toMatchObject({code:'TOO_LARGE'});});
it('bounds streamed bytes when headers lie',async()=>{transport(()=>({length:'1',bytes:Buffer.alloc(101)}));await expect(createFetcher(site,0)(site+'/a.pdf',{binary:true,maxBytes:100})).rejects.toMatchObject({code:'TOO_LARGE'});});
it('enforces a deadline on slow PDF responses',async()=>{transport(()=>({slow:true}));await expect(createFetcher(site,0,20)(site+'/a.pdf',{binary:true})).rejects.toThrow('timeout');});
it('returns binary bytes without decoding them as HTML',async()=>{const data=Buffer.from('%PDF-1.4\x00\xff','latin1');transport(()=>({bytes:data}));const response=await createFetcher(site,0)(site+'/a.pdf',{binary:true});expect(response.bytes).toEqual(data);expect(response.body).toBe('');});
