/** These resources remain blocked: this is an omission policy, never an egress allowlist. */
export function omittedResource(raw:string,kind:string):string|undefined {
  if(['image','media','font','websocket','eventsource','manifest','other'].includes(kind))return 'RESOURCE_TYPE_OMITTED';
  try {
    const url=new URL(raw);
    // Font-only provider endpoints: do not fetch their stylesheet or font files.
    // Arbitrary third-party stylesheets remain essential/unknown and fail closed.
    if(kind==='stylesheet'&&url.protocol==='https:'&&url.hostname==='fonts.googleapis.com'&&!url.port&&!url.username&&!url.password&&['/css','/css2'].includes(url.pathname))return 'FONT_STYLESHEET_OMITTED';
  }catch{}
  return undefined;
}
/** Diagnostics retain resource identity, not query values, credentials or fragments. */
export function diagnosticUrl(raw:string):string {
  try{const u=new URL(raw);return (u.origin+u.pathname+(u.search?'?[redacted]':'')).slice(0,800);}catch{return 'INVALID_URL';}
}
