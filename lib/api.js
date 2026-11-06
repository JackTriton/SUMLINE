import {generate,course,replay,score,periodStart,jstDay} from '../public/engine.js';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const fail=(message,status=400,code='INVALID')=>{throw Object.assign(Error(message),{status,code});};
const text=(v,max,label)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail(`${label}を1〜${max}文字で入力してください`);return v.trim();};
const int=(v,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)fail('数値が範囲外です');return v;};
const all=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const first=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
const safePuzzle=p=>{const {solution,seed,...visible}=p;return visible;};
export async function handle(request,db,userId,now=Date.now()){
  try {
    const url=new URL(request.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=request.method;
    if(!db)return json({error:'オンライン機能の準備中です。端末内の練習プレイを利用できます。',code:'UNAVAILABLE'},503);
    let body={};
    if(method==='POST'){
      const origin=request.headers.get('Origin');if(origin&&origin!==url.origin)fail('別サイトからの操作は許可されていません',403);
      if(request.headers.get('Sec-Fetch-Site')==='cross-site')fail('別サイトからの操作は許可されていません',403);
      const raw=await request.text();if(raw.length>25000)fail('入力が大きすぎます',413);
      try{body=JSON.parse(raw);}catch{fail('JSONが不正です');}
      if(!userId)fail('オンライン機能にはオンラインIDへの接続が必要です',401,'AUTH');
    }
    if(path[0]==='me' && method==='GET'){
      if(!userId)return json({authenticated:false,serverNow:now,unlocked:1});
      const p=await first(db,'SELECT name FROM profiles WHERE id=?',userId);
      const progress=await first(db,"SELECT MAX(stage) AS n FROM results WHERE user_id=? AND mode='normal'",userId);
      return json({authenticated:true,id:userId,name:p?.name||'Player',unlocked:(progress?.n||0)+1,serverNow:now});
    }
    if(path[0]==='profile'&&method==='POST'){
      const name=text(body.name,24,'ユーザー名');await run(db,'INSERT INTO profiles(id,name,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',userId,name,now);return json({name});
    }
    if(path[0]==='tournaments'){
      if(method==='POST'){
        const name=text(body.name,60,'大会名'),seed=text(body.seed,100,'シード');
        const rows=int(body.rows,3,8),cols=int(body.cols,3,8),boards=int(body.boards,1,50);
        const startsAt=Number(body.startsAt),endsAt=Number(body.endsAt);
        if(!Number.isSafeInteger(startsAt)||!Number.isSafeInteger(endsAt)||endsAt<=startsAt||endsAt<=now||endsAt-startsAt>90*86400000||startsAt>now+365*86400000)fail('開催期間は終了が開始より後で、最大90日以内にしてください');
        const rate=await first(db,'SELECT COUNT(*) AS n FROM tournaments WHERE owner=? AND created_at>?',userId,now-86400000);if(rate.n>=20)fail('大会作成は1日20件までです',429);
        const id=crypto.randomUUID();await run(db,'INSERT INTO tournaments(id,owner,name,seed,rows,cols,boards,starts_at,ends_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)',id,userId,name,seed,rows,cols,boards,startsAt,endsAt,now);
        return json({id,name,seed,rows,cols,boards,starts_at:startsAt,ends_at:endsAt},201);
      }
      if(method==='GET'){
        if(path[1]){const t=await first(db,'SELECT id,name,seed,rows,cols,boards,starts_at,ends_at FROM tournaments WHERE id=?',path[1]);if(!t)fail('大会が見つかりません',404);return json({tournament:t,serverNow:now});}
        return json({tournaments:await all(db,'SELECT id,name,rows,cols,boards,starts_at,ends_at FROM tournaments ORDER BY created_at DESC LIMIT 50'),serverNow:now});
      }
    }
    if(path[0]==='session'&&method==='POST'){
      if(body.consent!==true)fail('ランキング提供の同意がありません');
      const mode=body.mode;if(!['normal','daily','tournament'].includes(mode))fail('カスタムは送信対象外です');
      const stage=int(body.stage,1,100000);let context='',t=null;
      if(mode==='daily'){
        context=jstDay(now);if(body.context!==context||stage>3)fail('当日のデイリーを選択してください');
      }
      if(mode==='tournament'){
        context=text(body.context,64,'大会ID');t=await first(db,'SELECT * FROM tournaments WHERE id=?',context);
        if(!t)fail('大会が見つかりません',404);
        if(now<t.starts_at)fail('大会はまだ始まっていません',409);
        if(now>=t.ends_at)fail('大会は終了しました',409);
        if(stage>t.boards)fail('盤面番号が大会の範囲外です');
      }
      const key=JSON.stringify([userId,mode,context,stage]);
      if(await first(db,'SELECT id FROM sessions WHERE first_key=?',key))fail('この盤面への再挑戦は練習記録になります',409,'PRACTICE');
      const cfg=course(mode,stage,context,t),p=generate(cfg.seed,cfg.rows,cfg.cols),id=crypto.randomUUID();
      const count=await first(db,'SELECT COUNT(*) AS n FROM sessions WHERE user_id=? AND started_at>?',userId,now-3600000);if(count.n>=120)fail('開始回数が上限に達しました。しばらくお待ちください',429);
      const name=text(body.name||'Player',24,'ユーザー名');
      await run(db,'INSERT INTO profiles(id,name,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name',userId,name,now);
      const inserted=await run(db,"INSERT OR IGNORE INTO sessions(id,user_id,mode,context,stage,first_key,puzzle,started_at,status) VALUES(?,?,?,?,?,?,?,?, 'open')",id,userId,mode,context,stage,key,JSON.stringify(p),now);
      if(!inserted.meta.changes)fail('この盤面はすでに開始されています。練習として再挑戦できます',409,'PRACTICE');
      return json({sessionId:id,puzzle:safePuzzle(p),startedAt:now});
    }
    if(path[0]==='submit'&&method==='POST'){
      if(body.consent!==true)fail('ランキング提供の同意がありません');
      const s=await first(db,'SELECT * FROM sessions WHERE id=? AND user_id=?',String(body.sessionId),userId);
      if(!s)fail('開始記録が見つかりません',404);if(s.status!=='open')fail('この記録はすでに処理されています',409);
      const elapsed=now-s.started_at;if(elapsed<1000||elapsed>86400000)fail('プレイ時間が無効です');
      if(s.mode==='tournament'){
        const t=await first(db,'SELECT starts_at,ends_at FROM tournaments WHERE id=?',s.context);
        if(!t||now<t.starts_at||now>=t.ends_at)fail('大会の受付期間外です',409);
      }
      const p=JSON.parse(s.puzzle);let state;try{state=replay(p,body.events);}catch{fail('操作履歴が不正です');}
      if(state.phase!=='won')fail('クリア状態を確認できません');
      const points=score(p,elapsed/1000,state.lives),id=crypto.randomUUID();
      const statements=[
        db.prepare("INSERT OR IGNORE INTO results(id,session_id,user_id,mode,context,stage,score,elapsed_ms,lives,accepted_at) SELECT ?,id,user_id,mode,context,stage,?,?,?,? FROM sessions WHERE id=? AND user_id=? AND status='open'").bind(id,points,elapsed,state.lives,now,s.id,userId),
        db.prepare("UPDATE sessions SET status='submitted' WHERE id=? AND user_id=? AND status='open'").bind(s.id,userId)
      ];
      const result=await db.batch(statements);if(!result[0].meta.changes)fail('同じ盤面の記録は登録済みです',409);
      return json({accepted:true,score:points,elapsedMs:elapsed,lives:state.lives});
    }
    if(path[0]==='ranking'&&method==='GET'){
      const period=url.searchParams.get('period')||'all';if(!['all','month','week','day'].includes(period))fail('集計期間が不正です');
      const since=periodStart(period,now),tournament=url.searchParams.get('tournament');
      let where=tournament?"r.mode='tournament' AND r.context=? AND r.accepted_at>=?":"r.mode IN ('normal','daily') AND r.accepted_at>=?";
      const params=tournament?[tournament,since]:[since];
      const detail=url.searchParams.get('user');
      if(detail){
        const records=await all(db,`SELECT r.mode,r.context,r.stage,r.score,r.elapsed_ms,r.accepted_at FROM results r WHERE ${where} AND r.user_id=? ORDER BY r.accepted_at DESC LIMIT 200`,...params,detail);
        return json({records,serverNow:now});
      }
      const entries=await all(db,`SELECT r.user_id,COALESCE(p.name,'Player') AS name,COUNT(*) AS boards,SUM(r.score) AS score,SUM(r.elapsed_ms) AS total_ms,CAST(ROUND(AVG(r.elapsed_ms)) AS INTEGER) AS average_ms FROM results r LEFT JOIN profiles p ON p.id=r.user_id WHERE ${where} GROUP BY r.user_id ORDER BY boards DESC,total_ms ASC,score DESC,r.user_id ASC LIMIT 100`,...params);
      return json({entries,period,since,serverNow:now});
    }
    return json({error:'APIが見つかりません'},404);
  }catch(e){if(!e.status)console.error('API',e.message);return json({error:e.status?e.message:'オンライン処理に失敗しました。少し待ってから再度お試しください',code:e.code||'SERVER'},e.status||500);}
}
