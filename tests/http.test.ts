import { afterEach, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import https from 'node:https';
import { createFetcher } from '../src/crawler/http.js';
vi.mock('node:dns/promises', () => ({lookup: vi.fn(async () => [{address:'93.184.216.34',family:4}])}));
afterEach(() => vi.restoreAllMocks());
function redirect(location: string) {
  return vi.spyOn(https,'request').mockImplementation(((_url: unknown, options: any, callback: any) => {
    const req = new EventEmitter() as any;
    req.end = () => { const res = new EventEmitter() as any; res.statusCode = 302; res.headers = {location}; res.destroy = () => req.emit('close'); callback(res); };
    req.destroy = (error: Error) => { req.emit('error',error); req.emit('close'); };
    options.lookup('example.com',{},(error: unknown,address: string) => { expect(error).toBeNull(); expect(address).toBe('93.184.216.34'); });
    options.lookup('example.com',{all:true},(error: unknown,records: unknown) => { expect(error).toBeNull(); expect(records).toEqual([{address:'93.184.216.34',family:4}]); });
    return req;
  }) as any);
}
it.each(['https://127.0.0.1/','https://169.254.169.254/latest/meta-data','https://other.org/'])('blocks redirect to %s', async location => {
  const request = redirect(location); await expect(createFetcher('https://example.com',0)('https://example.com/')).rejects.toThrow('leaves'); expect(request).toHaveBeenCalledTimes(1);
});
it('revalidates a same-domain redirect DNS destination', async () => {
  const { lookup } = await import('node:dns/promises');
  vi.mocked(lookup).mockResolvedValueOnce([{address:'93.184.216.34',family:4}] as never).mockResolvedValueOnce([{address:'10.0.0.1',family:4}] as never);
  const request = redirect('https://private.example.com/'); await expect(createFetcher('https://example.com',0)('https://example.com/')).rejects.toThrow('unsafe'); expect(request).toHaveBeenCalledTimes(1);
});
it('rejects redirect loops', async () => { redirect('https://example.com/'); await expect(createFetcher('https://example.com',0)('https://example.com/')).rejects.toThrow('loop'); });
