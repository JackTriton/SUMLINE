import {handle} from '../lib/api.js';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function hash(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function fetchAPI(request,env,now=Date.now()){
  const origin=request.headers.get('Origin'),allowed=String(env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
  const corsOK=!!origin&&allowed.includes(origin);
  const cors=response=>{const out=new Response(response.body,response);out.headers.set('Vary','Origin');out.headers.set('Cache-Control','no-store');if(corsOK){out.headers.set('Access-Control-Allow-Origin',origin);out.headers.set('Access-Control-Allow-Methods','GET, POST, OPTIONS');out.headers.set('Access-Control-Allow-Headers','Content-Type, Authorization');out.headers.set('Access-Control-Max-Age','600');}return out;};
  try{
    if(origin&&!corsOK)return cors(json({error:'この公開元はAPIの許可リストに登録されていません',code:'ORIGIN'},403));
    if(request.method==='OPTIONS')return cors(corsOK?new Response(null,{status:204}):json({error:'許可されたOriginが必要です'},403));
    const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return cors(json({error:'Not found'},404));
    if(!env.DB)return cors(json({error:'DB binding is missing'},503));
    if(request.method==='POST'&&!corsOK)return cors(json({error:'許可されたOriginが必要です'},403));
    if(url.pathname==='/api/guest'&&request.method==='POST'){
      const bucket=await hash((request.headers.get('CF-Connecting-IP')||'local')+'|'+Math.floor(now/3600000));
      const allowance=await env.DB.prepare('INSERT INTO guest_rate(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<10 RETURNING count').bind(bucket,now+3600000).first();
      if(!allowance)return cors(json({error:'ID作成は1時間10回までです。少し待ってから再試行してください'},429));
      const bytes=crypto.getRandomValues(new Uint8Array(32)),token=[...bytes].map(v=>v.toString(16).padStart(2,'0')).join(''),id='guest_'+crypto.randomUUID();
      await env.DB.batch([
        env.DB.prepare('DELETE FROM guest_rate WHERE expires_at<?').bind(now),
        env.DB.prepare('INSERT INTO guest_tokens(token_hash,user_id,created_at) VALUES(?,?,?)').bind(await hash(token),id,now)
      ]);
      return cors(json({token,id,serverNow:now},201));
    }
    let userId=null;
    const auth=request.headers.get('Authorization');
    if(auth){
      const match=/^Bearer ([a-f0-9]{64})$/.exec(auth);if(!match)return cors(json({error:'オンラインIDが無効です',code:'TOKEN_INVALID'},401));
      const user=await env.DB.prepare('SELECT user_id FROM guest_tokens WHERE token_hash=?').bind(await hash(match[1])).first();
      if(!user)return cors(json({error:'オンラインIDを確認できません',code:'TOKEN_INVALID'},401));userId=user.user_id;
    }
    // The adapter has validated CORS. The common API receives only its verified user ID.
    const headers=new Headers();
    const contentType=request.headers.get('Content-Type');if(contentType)headers.set('Content-Type',contentType);
    const internal=new Request(request,{headers});return cors(await handle(internal,env.DB,userId,now));
  }catch(error){console.error('SUM API',error.message);return cors(json({error:'APIを処理できません。DBのマイグレーションと設定を確認してください',code:'SERVER'},500));}
}
export default {fetch(request,env){return fetchAPI(request,env);}};
