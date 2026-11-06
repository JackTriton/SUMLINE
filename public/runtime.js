export function resolveRuntime(config,moduleURL){
  const appBase=new URL('.',moduleURL);
  const apiBase=config.apiBase?new URL(config.apiBase,appBase):null;
  if(apiBase&&!['http:','https:'].includes(apiBase.protocol))throw Error('API URLはHTTPまたはHTTPSを指定してください');
  if(apiBase){
    if(apiBase.username||apiBase.password||apiBase.search||apiBase.hash)throw Error('API URLに認証情報・クエリ・フラグメントは指定できません');
    apiBase.pathname=apiBase.pathname.replace(/\/?$/,'/');
    if(!apiBase.pathname.endsWith('/api/'))throw Error('API URLの末尾は /api/ を指定してください');
    if(apiBase.origin!==appBase.origin&&apiBase.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(apiBase.hostname))throw Error('外部APIにはHTTPSが必要です');
  }
  const authMode=config.authMode??(apiBase?'guest':'none');
  if(!['guest','none'].includes(authMode))throw Error('authModeは guest または none を指定してください');
  if(apiBase&&authMode!=='guest')throw Error('共有API利用時は authMode: guest を指定してください');
  if(!apiBase&&authMode!=='none')throw Error('authMode: guest を使うには共有APIのURLが必要です');
  return {appBase,apiBase,authMode};
}
export function shareURL(appBase,params={}){const u=new URL(appBase);u.search='';u.hash='';for(const [k,v]of Object.entries(params))if(v!==null&&v!==undefined)u.searchParams.set(k,String(v));return u;}
export function randomSeed(random=globalThis.crypto){
  if(!random?.getRandomValues)throw Error('このブラウザーではシード用の乱数を作成できません。シードを入力してください');
  const bytes=new Uint8Array(8);random.getRandomValues(bytes);
  return [...bytes].map(v=>v.toString(16).padStart(2,'0')).join('');
}
