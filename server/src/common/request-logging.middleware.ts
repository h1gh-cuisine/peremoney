import { Logger } from '@nestjs/common';
import { resolveRequestId } from './request-context';
export function requestLogging(req: { headers: Record<string,string|string[]|undefined>; method?:string; originalUrl?:string; url?:string }, res: { setHeader(name:string,value:string):void; statusCode:number; on(event:string, cb:()=>void):void }, next:()=>void) {
  const started=Date.now(); const id=resolveRequestId(req.headers['x-request-id']); res.setHeader('X-Request-Id',id);
  res.on('finish',()=>Logger.log(JSON.stringify({event:'http_request',requestId:id,method:req.method,path:(req.originalUrl??req.url??'').split('?')[0],status:res.statusCode,durationMs:Date.now()-started}),'HTTP'));
  next();
}
