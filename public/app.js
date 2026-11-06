import {generate,course,remaining,replay,score,jstDay,validateSkin,canSelectCell,toggleFlag} from './engine.js';
import {runtime} from './config.js';
import {createTapController,usesTouchControls,movedBeyondTap} from './input.js';
import {resolveRuntime,randomSeed} from './runtime.js';
const {appBase,apiBase,authMode}=resolveRuntime(runtime,import.meta.url);
const storagePrefix=appBase.pathname==='/'?'sumline:':'sumline:'+appBase.pathname+':';
let guestToken='';
const $=s=>document.querySelector(s), e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={flag:'<path d="M5 21V3m0 1c4-4 9 4 14 0v10c-5 4-10-4-14 0"/>',grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',sliders:'<path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',trophy:'<path d="M8 3h8v6a4 4 0 0 1-8 0V3Zm4 10v5m-4 3h8M8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4"/>',chart:'<path d="M5 20V10h4v10m2 0V4h4v16m2 0v-7h4v7M3 20h19"/>',settings:'<path d="m10 3-1 3-3 1-3 3 2 2-1 4 3 1 2 4 3-1 3 1 2-4 3-1-1-4 2-2-3-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',pause:'<path d="M8 5v14M16 5v14"/>',play:'<path d="m8 4 12 8-12 8Z"/>',redo:'<path d="M4 9a8 8 0 1 1-1 7m1-7V3m0 6h6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',check:'<path d="m5 12 5 5 10-10"/>',share:'<path d="M12 15V3m-4 4 4-4 4 4M5 11v9h14v-9"/>',volume:'<path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 4 3l-1 1v2m0 2v1"/>',leaf:'<path d="M20 3C7 1 1 11 7 17s16 0 13-14ZM5 20 16 9"/>'};
const icon=(name,cls='')=>`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.grid}</svg>`;
const presets={light:{background:'#f6f7f2',surface:'#ffffff',text:'#26392e',accent:'#c9ef54',selected:'#e4efbc',danger:'#ce533e'},dark:{background:'#17221e',surface:'#21312a',text:'#e5ede4',accent:'#c9ef54',selected:'#354b35',danger:'#f38c7c'},mint:{background:'#edf5f0',surface:'#ffffff',text:'#25413a',accent:'#a9e5d0',selected:'#d3eade',danger:'#bd4f44'}};
const defaults={name:'Player',clickMode:'double',inputMode:'auto',longPress:true,timer:true,rta:false,bgm:false,se:true,bgmVolume:25,seVolume:45,ranking:false,quality:'standard',skin:'light',customSkin:null};
let storageOK=true;
function read(key,fallback){try{const v=localStorage.getItem(storagePrefix+key);return v?JSON.parse(v):fallback;}catch{return fallback;}}
function write(key,value){try{localStorage.setItem(storagePrefix+key,JSON.stringify(value));}catch{storageOK=false;}}
const settings={...defaults,...read('settings',{})};
if(!['single','double'].includes(settings.clickMode))settings.clickMode='double';
if(!['auto','desktop','touch'].includes(settings.inputMode))settings.inputMode='auto';
if(typeof settings.name!=='string')settings.name='Player';settings.name=settings.name.slice(0,24)||'Player';
let progress=read('progress',{unlocked:1,history:[],attempted:[],daily:{}});
if(!progress||!Array.isArray(progress.history)||!Array.isArray(progress.attempted)||!progress.daily)progress={unlocked:1,history:[],attempted:[],daily:{}};
progress.unlocked=Math.max(1,Math.min(100000,Number(progress.unlocked)||1));
let view='normal',stage=progress.unlocked,game=null,loading=false,generationId=0,worker=null,me={authenticated:false,unlocked:1},apiAvailable=false,tournaments=[],tournament=null,rankPeriod='all',rankScope='',rankEntries=[],rankLoading=false,rankError='',rankRequest=0,serverOffset=0;
let toastTimer,press=null,suppressClickUntil=0,audioCtx=null,musicInterval=null,musicStep=0,interacted=false;
const coarsePointer=matchMedia('(pointer:coarse)');
let lastPointerType='';
const activePointers=new Set();
const touchTaps=createTapController({onSingle:i=>flagCell(i),onDouble:i=>confirmCell(i,{clearFlag:true})});
function touchMode(pointerType=lastPointerType){return usesTouchControls(settings.inputMode,pointerType,coarsePointer.matches);}
function operationHelp(){return touchMode()?'シングルタップでフラグ切り替え。ダブルタップで選択（フラグ付きでも選択）。':(settings.clickMode==='double'?'1回でハイライト、同じマスをもう1回で確定。':'1回クリックで確定。')+' Shift＋クリック／右クリックでフラグ。';}
function updateInputPresentation(){document.documentElement.dataset.inputMode=touchMode()?'touch':'desktop';const help=$('.help-strip');if(help)help.innerHTML=icon('info')+'<span>'+operationHelp()+'</span>';}
function cancelInput(){touchTaps.cancel();clearTimeout(press?.timer);press=null;activePointers.clear();}
function measureBoard(){const scroll=$('.board-scroll'),note=$('.board-scroll-note');if(scroll&&note)note.hidden=scroll.scrollWidth<=scroll.clientWidth+1;}
const fmt=(ms,precise=false)=>{const sec=Math.floor(Math.max(0,ms)/1000);return `${sec>=3600?Math.floor(sec/3600)+':':''}${String(Math.floor(sec/60)%60).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}${precise?'.'+String(Math.floor(ms%1000/10)).padStart(2,'0'):''}`;};
const dateText=ms=>new Date(ms).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
const day=()=>jstDay(Date.now()+serverOffset), keyFor=(mode,context,num)=>JSON.stringify([mode,context,num]);
function elapsed(){return !game?0:game.activeMs+(game.phase==='playing'?performance.now()-game.activeStart:0);}
function wall(){return !game?0:game.phase==='ready'?0:game.endedWall??Date.now()-game.wallStart;}
function toast(msg){clearTimeout(toastTimer);$('#toast')?.remove();const d=document.createElement('div');d.id='toast';d.className='toast';d.setAttribute('role','status');d.textContent=msg;document.body.append(d);toastTimer=setTimeout(()=>d.remove(),6000);}
function applyAppearance(){
  let skin=presets[settings.skin]||presets.light;
  if(settings.skin==='custom')try{skin=validateSkin(settings.customSkin);}catch{skin=presets.light;}
  for(const [k,v]of Object.entries(skin))document.documentElement.style.setProperty('--'+k,v);
  const dark=skin===presets.dark;document.documentElement.style.setProperty('--muted',dark?'#a8b7aa':'#758077');document.documentElement.style.setProperty('--border',dark?'#3c4d40':'#e2e7db');
  document.documentElement.dataset.quality=settings.quality;updateInputPresentation();
}
function tone(freq,duration=.12,volume=.1,type='sine'){
  try{if(!interacted)return;audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();audioCtx.resume().catch(()=>{});const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch{}
}
function sound(kind){if(!settings.se)return;const v=Number(settings.seVolume)/500;if(kind==='error')tone(170,.22,v,'triangle');else if(kind==='win'){[523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,.35,v),i*100));}else tone(kind==='select'?410:650,.1,v*.65);}
function music(){clearInterval(musicInterval);musicInterval=null;if(!settings.bgm||!interacted||document.hidden)return;const notes=[261.63,329.63,392,329.63,220,293.66,349.23,293.66];musicInterval=setInterval(()=>tone(notes[musicStep++%notes.length],.8,Number(settings.bgmVolume)/1800),650);}
function persistGame(){
  if(!game||!['playing','paused'].includes(game.phase)){write('active',null);return;}
  write('active',{...game,phase:'paused',highlight:null,activeMs:elapsed(),eligible:false,sessionId:null,submitMessage:'中断からの再開は端末内の練習記録です'});
}
async function connectGuest(){
  if(authMode!=='guest'||!apiBase)throw Error('共有サーバーが未設定です。GitHub Pages公開手順のAPI設定を確認してください');
  const saved=read('identity',null);if(saved?.apiBase===apiBase.href&&typeof saved.token==='string'&&/^[a-f0-9]{64}$/.test(saved.token)){guestToken=saved.token;return;}
  const response=await fetch(new URL('guest',apiBase),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok||!data.token)throw Error(data.error||'オンラインIDを作成できませんでした');
  guestToken=data.token;write('identity',{apiBase:apiBase.href,token:guestToken});
}
function authControl(){
  if(!apiBase)return '<span class="body-copy">共有サーバー未設定です。通常・デイリー・カスタムを端末内で遊べます。</span>';
  return '<button class="btn small" data-action="connect-online">オンラインIDを作成・接続</button>';
}

async function api(path,body){
  if(!apiBase)throw Object.assign(Error('共有サーバー未設定：GitHub Pages単体ではオンラインランキング・大会共有は利用できません'),{code:'DISABLED'});
  if(!navigator.onLine)throw Object.assign(Error('オフラインです。オンライン記録は送信されません'),{code:'OFFLINE'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(new URL(path,apiBase),{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(guestToken?{Authorization:'Bearer '+guestToken}:{})},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});const d=await r.json();if(!r.ok)throw Object.assign(Error(d.error||'オンライン処理に失敗しました'),{code:d.code,status:r.status});if(d.serverNow)serverOffset=d.serverNow-Date.now();return d;}catch(err){if(err.name==='AbortError')throw Error('接続がタイムアウトしました。この操作は自動再送されません');throw err;}finally{clearTimeout(timer);}
}
function navButton(id,name,symbol,tag=''){return `<button data-action="nav" data-view="${id}" class="${view===id?'active':''}" ${view===id?'aria-current="page"':''} title="${name}">${icon(symbol)}<span>${name}</span>${tag?`<span class="tag">${tag}</span>`:''}</button>`;}
function shell(content){
  const names={normal:['PLAY','通常プレイ'],daily:['DAILY','デイリーチャレンジ'],custom:['CREATE','カスタム'],tournaments:['COMPETE','大会'],ranking:['COMMUNITY','ランキング'],settings:['PERSONALIZE','設定']};const n=names[view]||names.normal;
  $('#app').innerHTML=`<div class="shell"><aside class="sidebar"><button class="brand" data-action="nav" data-view="normal" aria-label="SUMLINE ホーム"><span class="brand-mark"><i></i><i></i><i></i><i></i></span><span>SUMLINE</span></button><p class="brand-sub">MAKE ROOM FOR ZERO.</p><div class="nav-label">YOUR PLAYGROUND</div><nav class="nav" aria-label="モード">${navButton('normal','通常プレイ','grid')}${navButton('daily','デイリー','sun','TODAY')}${navButton('custom','カスタム','sliders')}${navButton('tournaments','大会','trophy')}${navButton('ranking','ランキング','chart')}</nav><div class="side-bottom"><div class="side-tip"><strong>${icon('leaf')} ひと息、ひとつのパズル。</strong>数字を選んで、頭を整える。<br>今日も自分のペースで。</div><nav class="nav">${navButton('settings','設定','settings')}<button data-action="help">${icon('help')}<span>遊び方</span></button></nav><div class="profile"><div class="avatar">${e(settings.name.slice(0,1).toUpperCase())}</div><div><strong>${e(settings.name)}</strong><small>${me.authenticated?'マイプレイヤー':'ローカルプレイヤー'}</small></div></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb"><span>SUMLINE</span><span>/</span><strong>${n[0]}</strong></div><div class="top-actions"><span class="status ${navigator.onLine?'':'off'}">${navigator.onLine?'オンライン':'オフライン'}</span><button class="icon-btn" data-action="sound" aria-label="SEを切り替え" title="SE ${settings.se?'オン':'オフ'}">${icon('volume')}</button><button class="icon-btn" data-action="nav" data-view="settings" aria-label="設定">${icon('settings')}</button></div></header><section id="content">${content}</section><footer class="footer"><span>SMALL NUMBERS. CLEAR MIND.</span><span>SUMLINE © 2026 · v1.3</span></footer></main></div><dialog id="modal"></dialog>`;
}
function hero(eyebrow,title,desc,side=''){return `<div class="hero"><div><div class="eyebrow">${eyebrow}</div><h1 class="${view==='normal'?'':'page-title'}">${title}</h1><p>${desc}</p></div>${side?`<div class="hero-label">${side}</div>`:''}</div>`;}
function allHistory(){return progress.history.filter(h=>h.won&&h.mode!=='custom');}
function rail(){const hist=allHistory();const avg=hist.length?hist.reduce((a,h)=>a+h.elapsedMs,0)/hist.length:0;return `<aside class="rail"><section class="daily-card"><div class="eyebrow">${icon('sun')} DAILY CHALLENGE</div><h2>今日だけの、<br>小さな挑戦。</h2><p>${day().replaceAll('-',' / ')}<br>みんなと同じ3つの盤面を。</p><button class="btn" data-action="nav" data-view="daily">デイリーに挑戦 ${icon('arrow')}</button></section><section class="card"><h2>あなたの記録 <small>この端末</small></h2><div class="stat-grid"><div><strong>${hist.length}</strong><small>クリアした盤面</small></div><div><strong style="font-size:22px">${fmt(avg)}</strong><small>平均クリア時間</small></div></div><div class="stat-bottom"><span>累計スコア</span><strong>${hist.reduce((a,h)=>a+(h.score||0),0).toLocaleString()}</strong></div></section><section class="instructions"><h2>HOW TO PLAY</h2><div class="instruction"><b>1</b><span>上と左の数字は、あと必要な合計。</span></div><div class="instruction"><b>2</b><span>マスを選び、行と列の数字を引こう。</span></div><div class="instruction"><b>3</b><span>すべて0になったらクリア！</span></div></section></aside>`;}
function boardMarkup(){
  if(!game)return '';
  const p=game.puzzle,r=remaining(p,game.confirmed),h=game.highlight;
  const hidden=game.phase!=='playing'&&!['won','lost'].includes(game.phase);
  let html=`<div class="corner" aria-hidden="true">↘</div>`;
  for(let c=0;c<p.cols;c++)html+=`<div class="indicator col ${r.col[c]===0?'done':''} ${h!==null&&h%p.cols===c?'linked':''}" aria-label="${c+1}列 残り ${r.col[c]}">${r.col[c]===0?'0 ✓':r.col[c]}</div>`;
  for(let row=0;row<p.rows;row++){
    html+=`<div class="indicator row ${r.row[row]===0?'done':''} ${h!==null&&Math.floor(h/p.cols)===row?'linked':''}" aria-label="${row+1}行 残り ${r.row[row]}">${r.row[row]===0?'0 ✓':r.row[row]}</div>`;
    for(let c=0;c<p.cols;c++){
      const i=row*p.cols+c,given=p.givens[i],confirmed=game.confirmed.includes(i),wrong=game.mistakes.includes(i),flagged=(game.flags||[]).includes(i),fixed=given||confirmed||wrong,highlight=h===i;
      const linked=h!==null&&(Math.floor(h/p.cols)===row||h%p.cols===c);
      html+=`<button class="cell ${given?'given':confirmed?'confirmed':wrong?'mistake':''} ${fixed?'fixed':''} ${flagged?'flagged':''} ${highlight?'highlight':''} ${linked?'linked':''}" data-cell="${i}" aria-label="${row+1}行${c+1}列 数字${p.values[i]}${given?' 初期選択済み':confirmed?' 正解確定済み':wrong?' 対象外':flagged?' フラグ設置済み':highlight?' 確認待ち':''}" aria-pressed="${given||confirmed||highlight}" ${hidden?'tabindex="-1"':''}>${p.values[i]}${fixed?`<span class="mark">${given?icon('lock'):confirmed?'✓':'×'}</span>`:flagged?`<span class="flag-mark">${icon('flag')}</span>`:''}</button>`;
    }
  }
  return `<div class="board-scroll" ${hidden?'aria-hidden="true" inert':''}><div class="board ${hidden?'hidden-board':''}" style="--cols:${p.cols}" aria-label="${p.rows}行${p.cols}列の盤面">${html}</div></div><div class="board-scroll-note" hidden>盤面を左右にスクロールできます</div>`;
}
function cover(){
  if(loading)return `<div class="board-cover"><div class="spinner"></div><h2>盤面を組み立てています</h2><p>別解がないか、確認中。</p></div>`;
  if(!game)return `<div class="board-cover"><h2>準備できませんでした</h2><p>新しい盤面を読み込んでください。</p><button class="btn primary" data-action="reload">再試行</button></div>`;
  if(game.phase==='ready')return `<div class="board-cover"><div class="cover-graphic"><span>3</span><span>0</span><span>7</span></div><h2>ひらめく準備は、できましたか？</h2><p>${game.puzzle.rows} × ${game.puzzle.cols} の数字を選んで、すべてをゼロに。<br>${settings.ranking&&me.authenticated&&game.mode!=='custom'?'初回挑戦はオンラインランキングの対象です。':'自分のペースで遊べる練習プレイです。'}</p><button class="btn primary" data-action="start">${icon('play')} プレイをはじめる</button></div>`;
  if(game.phase==='paused')return `<div class="board-cover"><div class="cover-graphic"><span>Ⅱ</span><span>0</span><span>Ⅱ</span></div><h2>ちょっと、ひと休み。</h2><p>オンラインの順位用時間は、停止中も進みます。</p><button class="btn primary" data-action="resume">${icon('play')} つづける</button></div>`;
  return '';
}
function gamePage(){
  const isCustom=game?.mode==='custom',isTour=game?.mode==='tournament',isDaily=view==='daily';const number=game?.stage||stage;
  const title=isCustom?'自分だけの、ゼロを。':isTour?'同じ盤面で、腕試し。':isDaily?'今日のひらめきを、ここに。':'ひとつずつ、<span class="serif">0</span> にしよう。';
  const subtitle=isCustom?'シードから生まれた、あなただけのパズル。':isTour?e(tournament?.name||'大会'):isDaily?`${day()} · みんなで挑む、共通の3盤面。`:'数字を選んで、行と列の合計をゼロに。小さな達成を、ひとつずつ。';
  const label=isCustom?'CUSTOM PUZZLE':isTour?'TOURNAMENT':isDaily?'DAILY CHALLENGE':'A LITTLE PUZZLE, A CLEARER MIND';
  const labelText=isCustom?'カスタム':isTour?'大会':isDaily?'デイリー':'ステージ';
  const completed=game&&['won','lost'].includes(game.phase);
  const result=completed?`<div class="notice ${game.phase==='lost'?'warning':''}" role="status"><strong>${game.phase==='won'?'CLEAR! お見事です。':'GAME OVER · また挑戦しよう。'}</strong>${game.phase==='won'?`<div class="result-score">${(game.resultScore||0).toLocaleString()}<small>pt</small></div>`:''}<div class="result-line"><span>プレイ <strong>${fmt(elapsed(),true)}</strong></span><span>実経過 <strong>${fmt(wall(),true)}</strong></span></div><div class="retry-note">${e(game.submitMessage||'端末内の記録として保存しました。')}</div></div>`:'';
  return `${hero(label,title,subtitle,icon('leaf')+' TAKE YOUR TIME. FIND YOUR FLOW.')}<div class="game-layout"><div><section class="game-card"><div class="game-head"><div class="stage-label">${labelText} ${String(number).padStart(2,'0')}<span class="tiny-label">${game?game.puzzle.rows+' × '+game.puzzle.cols:'—'}</span></div><div class="hearts" aria-label="残りライフ ${game?.lives??3}">${[0,1,2].map(i=>icon('heart',i>=(game?.lives??3)?'empty':'')).join('')}</div></div><div class="game-meta"><span>${game?.eligible?'<i class="ranked-dot"></i>オンライン記録':isCustom?'カスタム · ランキング対象外':'PRACTICE / 自分のペースで'}</span><div class="time">${settings.timer?icon('clock')+'<strong id="time">'+fmt(elapsed())+'</strong>':''}${settings.rta?'<span id="rta" title="一時停止を含むRTA時間">RTA '+fmt(wall(),true)+'</span>':''}<button class="icon-btn" data-action="pause" aria-label="一時停止" ${!game||game.phase!=='playing'?'disabled':''}>${icon('pause')}</button></div></div><div class="board-wrap" id="board-wrap">${boardMarkup()}${cover()}</div><div class="game-foot"><div class="legend"><span><i></i>未選択</span><span><i class="highlight"></i>ハイライト</span><span><i class="fixed"></i>初期ヒント</span></div><button class="btn small ${game?.flagMode?'lime':''}" data-action="flag-mode" aria-pressed="${!!game?.flagMode}" ${game?.phase!=='playing'?'disabled':''}>${icon('flag')} フラグ</button><button class="btn small" data-action="retry" ${!game||loading?'disabled':''}>${icon('redo')} やり直す</button></div></section><div class="help-strip">${icon('info')}<span>${operationHelp()}</span></div>${result}${completed?`<div class="form-actions">${game.phase==='won'&&!isCustom?'<button class="btn primary" data-action="next">次の盤面へ '+icon('arrow')+'</button>':''}<button class="btn" data-action="retry">同じ盤面を練習</button>${isTour?'<button class="btn" data-action="tour-ranking">大会ランキング</button>':''}</div>`:''}${stageList()}</div>${rail()}</div>`;
}
function stageList(){
  if(!game||game.mode==='custom')return '';
  const mode=game.mode,ctx=game.context,max=mode==='normal'?Math.min(progress.unlocked+3,100000):mode==='daily'?3:tournament?.boards||1;
  let start=mode==='normal'?Math.max(1,Math.min(game.stage-2,max-7)):Math.max(1,game.stage-3);const end=Math.min(max,start+7);
  let html='';for(let n=start;n<=end;n++){const done=progress.history.some(h=>h.mode===mode&&h.context===ctx&&h.stage===n&&h.won);const locked=mode==='normal'&&n>progress.unlocked;html+=`<button class="stage-tile ${game.stage===n?'current':done?'done':''}" data-action="stage" data-stage="${n}" ${locked?'disabled':''}><strong>${locked?icon('lock'):String(n).padStart(2,'0')}</strong><small>${done?'✓ クリア済み':locked?'未解放':game.stage===n?'プレイ中':'挑戦する'}</small></button>`;}
  return `<section class="stages"><div class="section-title"><span>${mode==='normal'?'あなたの道のり':'このコースの盤面'}</span><small>${mode==='normal'?'クリアした盤面は何度でも。':'初回挑戦のみオンライン記録対象'}</small></div><div class="stage-list">${html}</div>${mode==='normal'&&progress.unlocked>8?`<div class="form-actions"><label class="field" style="margin:0">過去ステージ<input id="history-stage" type="number" value="${game.stage}" min="1" max="${progress.unlocked}" style="width:110px"></label><button class="btn small" data-action="jump-stage">移動する</button></div>`:''}</section>`;
}
function customPage(){return `${hero('YOUR RULES, YOUR PUZZLE.','あなただけの盤面を。','サイズとシードを決めて遊ぶ。仲間を集めたら、大会にも。')}<div class="form-layout"><div class="card"><h2 class="subheading">カスタムパズル <span class="badge">ランキング対象外</span></h2><p class="body-copy">同じシードとサイズなら、いつでも同じ盤面が生まれます。</p><form id="custom-form"><div class="form-grid"><label class="field">行数<select name="rows">${sizeOptions(5)}</select></label><label class="field">列数<select name="cols">${sizeOptions(5)}</select></label><label class="field full">ロックマス数<input name="lockCount" type="number" min="0" step="1" placeholder="自動" value="${e(new URLSearchParams(location.search).get('lockCount')||'')}"><small>空欄は自動。指定時はその個数ちょうどで一意解を生成します。最大は行数×列数−5。</small></label><label class="field full">シード<input name="seed" maxlength="100" placeholder="例：a-little-good-day" value="${e(new URLSearchParams(location.search).get('seed')||'')}"><small>空欄なら新しいシードを作成します。</small></label></div><div class="form-actions"><button class="btn primary" type="submit">パズルを作る ${icon('arrow')}</button><button type="button" class="btn" data-action="share-custom">${icon('share')} 設定を共有</button></div></form><div class="divider"></div><h3 class="subheading">同じ盤面で、競い合おう。</h3><p class="body-copy">カスタムのサイズとシードを使って、大会を作成できます。大会のロック数は自動です。期間と盤面数を決めて、ランキングを共有しましょう。</p><button class="btn lime" data-action="create-tour">${icon('trophy')} この設定で大会を作成</button></div><section class="daily-card"><div class="eyebrow">A SEED OF AN IDEA</div><h2>小さな数字に、<br>大きな可能性。</h2><p>3 × 3 から 8 × 8 まで。<br>一意解を確認してから出題するので、<br>安心してひらめきを楽しめます。</p><span class="badge">文字列シード対応</span></section></div>`;}
const sizeOptions=n=>[3,4,5,6,7,8].map(x=>`<option value="${x}" ${n===x?'selected':''}>${x}</option>`).join('');
function tourStatus(t){const now=Date.now()+serverOffset;return now<t.starts_at?'開催前':now>=t.ends_at?'終了':'開催中';}
function tournamentPage(){return `${hero('PLAY TOGETHER.','同じ数字で、つながろう。','好きな条件で大会を作成。仲間と共有して、自分の記録に挑戦。')}<div class="rank-meta"><span class="body-copy">開催期間はすべて日本時間です。</span><div style="display:flex;gap:9px"><button class="btn" data-action="refresh-tour">更新</button><button class="btn primary" data-action="create-tour">${icon('trophy')} 大会をつくる</button></div></div><div class="tournament-list">${tournaments.length?tournaments.map(t=>`<article class="tournament-item"><div><h3>${e(t.name)} <span class="badge">${tourStatus(t)}</span></h3><p>${t.rows} × ${t.cols} · ${t.boards} 盤面<br>${dateText(t.starts_at)} 〜 ${dateText(t.ends_at)} JST</p></div><div style="display:flex;gap:7px"><button class="btn small" data-action="open-tour" data-id="${e(t.id)}">大会を見る ${icon('arrow')}</button><button class="btn small" data-action="tour-rank" data-id="${e(t.id)}">順位</button></div></article>`).join(''):`<div class="card empty">${icon('trophy')}<br>${apiAvailable?'まだ大会がありません。最初の大会を作ってみましょう。':'オンラインの大会一覧を取得できません。更新してお試しください。'}</div>`}</div><div class="notice">大会URLを共有する相手には、このサイトへの閲覧権限も必要です。カスタムの点数は全体ランキングに加算されません。</div>`;}
function rankingPage(){return `${hero('A LITTLE FRIENDLY COMPETITION.','積み重ねた、ひらめき。',rankScope?`${e(tournament?.name||'大会')} · 大会専用ランキング`:'通常プレイとデイリーの初回クリアを集計。カスタム・再挑戦・オフライン記録は含みません。')}<div class="rank-meta"><div class="tabs" style="margin:0">${[['all','サービス開始時から'],['month','マンスリー'],['week','ウィークリー'],['day','デイリー']].map(([k,n])=>`<button data-action="period" data-period="${k}" class="${rankPeriod===k?'active':''}">${n}</button>`).join('')}</div><div style="display:flex;gap:8px">${rankScope?'<button class="btn small" data-action="global-ranking">全体へ</button>':''}<button class="btn small" data-action="refresh-ranking">${icon('redo')} 更新</button>${rankScope?'<button class="btn small" data-action="share-ranking">'+icon('share')+' 共有</button>':''}</div></div><section class="card" style="padding:8px 12px">${rankLoading?'<div class="empty"><div class="spinner" style="margin:auto"></div><br>ランキングを読み込み中</div>':rankError?`<div class="empty">${e(rankError)}<br><button class="btn small" data-action="refresh-ranking">再読み込み</button></div>`:rankEntries.length?`<div class="table-scroll"><table><thead><tr><th>順位</th><th>プレイヤー</th><th>クリア盤面</th><th>平均タイム</th><th>スコア</th></tr></thead><tbody>${rankEntries.map((r,i)=>`<tr><td class="rank-number">${String(i+1).padStart(2,'0')}</td><td><button class="rank-user" data-action="record-detail" data-user="${e(r.user_id)}"><span class="avatar">${e(r.name.slice(0,1))}</span>${e(r.name)}${r.user_id===me.id?'<span class="badge">YOU</span>':''}</button></td><td><strong>${r.boards}</strong><small class="muted"> boards</small></td><td>${fmt(r.average_ms,true)}</td><td>${r.score.toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">'+icon('chart')+'<br>まだ記録がありません。<br>ランキング提供をオンにして、最初の記録を残しましょう。</div>'}</section><p class="body-copy">クリア盤面数 → 合計所要時間 → スコアの順で順位を決定。週は月曜始まり、日付の切り替えは日本時間です。プレイヤー名を押すと盤面ごとの記録を確認できます。</p><div class="notice">${settings.ranking?'ランキング提供はオンです。初回挑戦をオンラインで開始すると記録対象になります。':'現在はランキング提供がオフです。設定から有効にできます。'} ${!me.authenticated?authControl():''}</div>`;}
function toggle(name,title,desc){return `<label class="switch-row"><span>${title}<small>${desc}</small></span><input type="checkbox" data-setting="${name}" ${settings[name]?'checked':''}></label>`;}
function settingsPage(){return `${hero('MAKE IT YOURS.','心地よい遊び方に。','操作も、音も、色も。あなたのペースに合わせましょう。')}<div class="settings-grid"><div><section class="card"><h2>操作とタイマー</h2><label class="field">入力モード<select data-setting="inputMode"><option value="auto" ${settings.inputMode==='auto'?'selected':''}>自動（端末に合わせる）</option><option value="touch" ${settings.inputMode==='touch'?'selected':''}>タッチ操作</option><option value="desktop" ${settings.inputMode==='desktop'?'selected':''}>PC操作</option></select><small>タッチ操作：単タップでフラグ、ダブルタップで選択。フラグ付きでもダブルタップで選択できます。</small></label><label class="field">PCでの数字の選択方式<select data-setting="clickMode"><option value="double" ${settings.clickMode==='double'?'selected':''}>2回クリックで確定（標準）</option><option value="single" ${settings.clickMode==='single'?'selected':''}>1回クリックで確定</option></select></label>${toggle('longPress','長押しハイライト','450msで確認。長押しを離しても確定しません。')}${toggle('timer','プレイ時間を表示','一時停止中の時間を除いて計測します。')}${toggle('rta','RTAカウントアップを表示','開始からの実経過。停止中も計測を続けます。')}<label class="field" style="margin:20px 0 0">クオリティ<select data-setting="quality">${[['high','高：影と動きを有効'],['standard','標準'],['low','省電力：影と動きを抑える']].map(([v,n])=>`<option value="${v}" ${settings.quality===v?'selected':''}>${n}</option>`).join('')}</select></label></section><section class="card" style="margin-top:20px"><h2>サウンド</h2>${toggle('bgm','BGM','やわらかいシンセのループ。操作後に再生します。')}<label class="switch-row"><span>BGM音量</span><input data-setting="bgmVolume" type="range" min="0" max="100" value="${settings.bgmVolume}" aria-label="BGM音量"></label>${toggle('se','効果音','正解・ミス・クリアにサウンドを付けます。')}<label class="switch-row"><span>SE音量</span><input data-setting="seVolume" type="range" min="0" max="100" value="${settings.seVolume}" aria-label="SE音量"></label><div class="form-actions"><button class="btn small" data-action="test-sound">音を確認</button></div></section></div><div><section class="card"><h2>プレイヤーと記録</h2><label class="field">ユーザー名<input id="username" maxlength="24" value="${e(settings.name)}"><small>ランキングに表示する名前。1〜24文字。</small></label><button class="btn small" data-action="save-name">名前を保存</button>${toggle('ranking','ランキングに記録を提供','初期状態はオフ。オンラインの初回挑戦のみ送信。')}<p class="body-copy">途中でオフラインになったプレイは、復帰しても送信しません。送信失敗時の自動再送はありません。</p>${!me.authenticated?authControl():`<span class="badge">オンラインID接続済み</span>`}</section><section class="card" style="margin-top:20px"><h2>スキンとカラー</h2><p class="body-copy">プリセット、または自分だけの配色で。</p><div class="skin-presets">${[['light','ライト'],['dark','ダーク'],['mint','ミント']].map(([v,n])=>`<button data-action="skin" data-skin="${v}" style="background:${presets[v].background};color:${presets[v].text};border-color:${settings.skin===v?presets[v].text:'var(--border)'}">${n}</button>`).join('')}</div><div class="color-grid">${[['background','背景'],['surface','パネル'],['text','文字'],['accent','アクセント'],['selected','確定色'],['danger','ミス色']].map(([v,n])=>`<label><input type="color" data-color="${v}" value="${(settings.customSkin||presets.light)[v]}">${n}</label>`).join('')}</div><button class="btn small" data-action="apply-custom-skin">カスタム色を適用</button><div class="form-actions"><button class="btn small" data-action="export-skin">JSONを書き出す</button><button class="btn small" data-action="import-skin">JSONを読み込む</button><input id="skin-file" type="file" accept="application/json,.json" hidden></div><p class="body-copy">安全な色設定だけを読み込みます。文字が読みにくい配色は適用できません。</p></section></div></div>${storageOK?'':'<div class="notice warning">このブラウザーでは設定・履歴を保存できません。ページを閉じると記録が失われます。</div>'}`;}
function render(){applyAppearance();shell(view==='custom'&&(!game||game.mode!=='custom')?customPage():view==='tournaments'&&(!game||game.mode!=='tournament')?tournamentPage():view==='ranking'?rankingPage():view==='settings'?settingsPage():gamePage());updateInputPresentation();requestAnimationFrame(measureBoard);}
function modal(title,html){cancelInput();const d=$('#modal');d.innerHTML=`<button class="modal-close" data-action="close-modal" aria-label="閉じる">×</button><h2>${e(title)}</h2>${html}`;d.showModal();}
function pauseGame(){cancelInput();if(game?.phase==='playing'){game.activeMs=elapsed();game.phase='paused';game.highlight=null;persistGame();}}
function leaveCheck(){return !game||game.phase!=='playing'||confirm('プレイを中断して移動しますか？ この挑戦は再開時に練習記録になります。');}
async function setView(next){
  if(next==='settings'){pauseGame();view=next;render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(view==='settings'&&game&&((next===game.mode)||(next==='tournaments'&&game.mode==='tournament'))){view=next;render();window.scrollTo({top:0,behavior:'instant'});return;}
  if(!leaveCheck())return;pauseGame();if(game?.sessionId){game.eligible=false;game.sessionId=null;}
  if(worker){worker.terminate();worker=null;}generationId++;
  view=next;game=null;loading=false;
  const u=new URL(location.href);u.search='';history.replaceState({},'',u);
  if(next==='normal'){stage=progress.unlocked;await prepare('normal',stage);}
  else if(next==='daily'){stage=Math.min(3,(progress.daily[day()]||0)+1);await prepare('daily',stage,day());}
  else if(next==='tournaments'){render();await loadTournaments();}
  else if(next==='ranking'){rankScope='';render();await loadRanking();}
  else render();window.scrollTo({top:0,behavior:'instant'});
}
async function prepare(mode,num=1,context='',config=null){
  cancelInput();generationId++;const id=generationId;if(worker)worker.terminate();loading=true;game=null;stage=num;render();
  try{
    const cfg=config||course(mode,num,context,tournament);
    const p=await new Promise((resolve,reject)=>{
      worker=new Worker(new URL('generator-worker.js',appBase),{type:'module'});const current=worker;
      const timer=setTimeout(()=>{current.terminate();if(id===generationId)reject(Error('生成に時間がかかっています。別のシードをお試しください'));},15000);
      current.onmessage=({data})=>{clearTimeout(timer);current.terminate();if(id!==generationId)return;worker=null;data.error?reject(Error(data.error)):resolve(data.puzzle);};
      current.onerror=()=>{clearTimeout(timer);current.terminate();reject(Error('盤面生成を開始できませんでした。ページを再読み込みしてください'));};current.postMessage({id,...cfg});
    });
    if(id!==generationId)return;
    game={mode,stage:num,context,puzzle:p,confirmed:[],mistakes:[],flags:[],flagMode:false,events:[],lives:3,phase:'ready',highlight:null,activeMs:0,activeStart:0,wallStart:0,endedWall:null,sessionId:null,eligible:false,submitMessage:'',resultScore:0};
  }catch(err){if(id===generationId)toast(err.message);}finally{if(id===generationId){loading=false;render();}}
}
async function start(){
  if(!game||game.phase!=='ready'||loading)return;
  const g=game,key=keyFor(g.mode,g.context,g.stage),attempted=progress.attempted.includes(key);
  loading=true;render();
  if(g.mode==='tournament'&&tournament&&tourStatus(tournament)!=='開催中'){loading=false;render();toast('大会の開催期間外です');return;}
  if(settings.ranking&&navigator.onLine&&me.authenticated&&g.mode!=='custom'&&!attempted){
    try{
      const r=await api('session',{mode:g.mode,context:g.context,stage:g.stage,name:settings.name,consent:true});
      if(game!==g)return;
      if(['values','givens','rowTargets','columnTargets'].some(k=>JSON.stringify(g.puzzle[k])!==JSON.stringify(r.puzzle[k])))throw Error('盤面バージョンが一致しません。ページを再読み込みしてください');
      g.sessionId=r.sessionId;g.eligible=true;
    }catch(err){
      if(game!==g)return;
      g.submitMessage=err.message;
      if(err.code!=='PRACTICE'){loading=false;render();modal('オンラインで開始できませんでした',`<p>${e(err.message)}</p><p>このまま端末内の練習として始められます。</p><button class="btn primary" data-action="start-practice">練習としてはじめる</button>`);return;}
      toast(err.message);
    }
  }
  if(game!==g)return;beginPlay(g,key);
}
function beginPlay(g,key){if(g.phase!=='ready')return;loading=false;progress.attempted.push(key);progress.attempted=[...new Set(progress.attempted)];write('progress',progress);g.phase='playing';g.activeStart=performance.now();g.wallStart=Date.now();g.endedWall=null;sound('select');persistGame();render();}
function clickCell(i,forceHighlight=false){
  if(!game||game.phase!=='playing')return;const g=game;
  if((g.flags||[]).includes(i)){if(!forceHighlight)toast('フラグを解除してから選択してください');return;}
  if(!canSelectCell(g.puzzle,g,i)){g.highlight=null;renderBoard();return;}
  if(forceHighlight || (settings.clickMode==='double'&&g.highlight!==i)){g.highlight=i;sound('select');renderBoard();return;}
  confirmCell(i);
}
function confirmCell(i,{clearFlag=false}={}){
  if(!game||game.phase!=='playing')return;const g=game;
  if(clearFlag)g.flags=(g.flags||[]).filter(cell=>cell!==i);
  if(!canSelectCell(g.puzzle,g,i))return;
  g.highlight=null;g.events.push(i);
  const state=replay(g.puzzle,g.events);g.confirmed=state.confirmed;g.mistakes=state.mistakes;g.lives=state.lives;
  if(state.phase!=='playing'){finish(state.phase);return;}
  sound(g.puzzle.solution[i]?'correct':'error');persistGame();renderGame();
}

function flagCell(i){if(!game||game.phase!=='playing')return;const updated=toggleFlag(game.puzzle,game,i);if(updated===game)return;game=updated;persistGame();renderBoard();}
function restoreFocus(index){if(index!==undefined)$(`[data-cell="${index}"]`)?.focus({preventScroll:true});}
function renderBoard(){const index=document.activeElement?.dataset?.cell,left=$('.board-scroll')?.scrollLeft||0;const wrap=$('#board-wrap');if(wrap)wrap.innerHTML=boardMarkup()+cover();const scroll=$('.board-scroll');if(scroll)scroll.scrollLeft=left;restoreFocus(index);requestAnimationFrame(measureBoard);}
function renderGame(){const index=document.activeElement?.dataset?.cell,left=$('.board-scroll')?.scrollLeft||0;const content=$('#content');if(content)content.innerHTML=gamePage();const scroll=$('.board-scroll');if(scroll)scroll.scrollLeft=left;restoreFocus(index);updateInputPresentation();requestAnimationFrame(measureBoard);}
async function finish(phase){
  cancelInput();const g=game;g.activeMs=elapsed();g.endedWall=Date.now()-g.wallStart;g.phase=phase;g.highlight=null;
  g.resultScore=phase==='won'?score(g.puzzle,(g.eligible?g.endedWall:g.activeMs)/1000,g.lives):0;
  sound(phase==='won'?'win':'error');
  g.submitMessage=g.eligible&&phase==='won'?'記録を検証して送信中…':g.mode==='custom'?'カスタム記録 · ランキング対象外':'端末内の練習記録 · オンライン送信なし';
  if(phase==='won'){
    if(g.mode==='normal')progress.unlocked=Math.max(progress.unlocked,g.stage+1);
    if(g.mode==='daily')progress.daily[g.context]=Math.max(progress.daily[g.context]||0,g.stage);
    const existing=progress.history.findIndex(h=>h.mode===g.mode&&h.context===g.context&&h.stage===g.stage&&(g.mode!=='custom'||h.seed===g.puzzle.seed));
    const record={mode:g.mode,context:g.context,stage:g.stage,seed:g.puzzle.seed,won:true,elapsedMs:g.activeMs,score:g.resultScore,date:Date.now()};
    if(existing<0)progress.history.push(record);else if(record.elapsedMs<progress.history[existing].elapsedMs)progress.history[existing]=record;
  }
  write('progress',progress);write('active',null);render();
  if(phase==='won'&&g.eligible){
    if(!settings.ranking||!navigator.onLine){g.eligible=false;g.submitMessage='接続または提供設定が変わったため送信しません。後からの送信も行いません。';render();return;}
    try{const result=await api('submit',{sessionId:g.sessionId,events:g.events,consent:true});g.resultScore=result.score;g.submitMessage=`オンライン記録を登録しました · 順位用時間 ${fmt(result.elapsedMs,true)}`;me.unlocked=Math.max(me.unlocked,g.mode==='normal'?g.stage+1:me.unlocked);}
    catch(err){g.submitMessage=`送信されませんでした：${err.message}（自動再送なし）`;g.eligible=false;}
    if(game===g)render();
  }
}
async function retry(){if(!game)return;if(game.phase==='playing'&&!confirm('同じ盤面を最初から練習しますか？ 今回の進行はリセットされます。'))return;const g=game;pauseGame();write('active',null);await prepare(g.mode,g.stage,g.context,{seed:g.puzzle.seed,rows:g.puzzle.rows,cols:g.puzzle.cols,lockCount:g.puzzle.lockCount??null});}
async function nextBoard(){if(!game)return;const g=game;if(g.mode==='daily'&&g.stage>=3){toast('今日の3盤面をクリアしました。また明日！');return;}if(g.mode==='tournament'&&g.stage>=tournament.boards){rankScope=g.context;view='ranking';game=null;render();loadRanking();return;}prepare(g.mode,g.stage+1,g.context);}
async function loadTournaments(){try{const r=await api('tournaments');tournaments=r.tournaments;apiAvailable=true;}catch(err){toast(err.message);}if(view==='tournaments'&&!game)render();}
async function openTournament(id,rank=false){
  if(!leaveCheck())return;pauseGame();
  try{const r=await api('tournaments/'+encodeURIComponent(id));tournament=r.tournament;game=null;const u=new URL(location.href);u.search='';u.searchParams.set('tournament',id);if(rank)u.searchParams.set('view','ranking');history.replaceState({},'',u);
    if(rank){view='ranking';rankScope=id;render();loadRanking();return;}
    view='tournaments';render();const t=tournament;
    modal(t.name,`<span class="badge">${tourStatus(t)}</span><p>${t.rows} × ${t.cols} · ${t.boards}盤面<br>${dateText(t.starts_at)} 〜 ${dateText(t.ends_at)} JST</p><p>初回挑戦のクリア盤面数と所要時間で競います。</p><div class="form-actions"><button class="btn primary" data-action="join-tour" ${tourStatus(t)!=='開催中'?'disabled':''}>大会に参加 ${icon('arrow')}</button><button class="btn" data-action="tour-ranking">ランキング</button><button class="btn" data-action="share-tour">${icon('share')} 共有URL</button></div>`);
  }catch(err){toast(err.message);}
}
async function loadRanking(){
  const request=++rankRequest;rankLoading=true;rankError='';if(view==='ranking')render();
  try{const r=await api(`ranking?period=${rankPeriod}${rankScope?'&tournament='+encodeURIComponent(rankScope):''}`);if(request!==rankRequest)return;rankEntries=r.entries;}
  catch(err){if(request!==rankRequest)return;rankError=err.message;rankEntries=[];}
  if(request!==rankRequest)return;rankLoading=false;if(view==='ranking')render();
}
async function createTournamentModal(){
  pauseGame();if(authMode==='guest'&&apiBase&&!me.authenticated){try{await connectGuest();me=await api('me');}catch(err){toast(err.message);return;}}
  if(!me.authenticated){modal('オンライン接続が必要です','<p>大会の共有とランキング保存にはオンラインAPIへの接続が必要です。カスタムパズルはそのまま遊べます。</p>'+authControl());return;}
  const form=$('#custom-form'),now=Date.now()+serverOffset;const local=ms=>new Date(ms+9*3600000).toISOString().slice(0,16);
  const row=Number(form?.elements.rows.value||5),col=Number(form?.elements.cols.value||5),seed=form?.elements.seed.value||randomSeed();
  modal('あなたの大会をつくる',`<form id="tournament-form"><div class="form-grid"><label class="field full">大会名<input name="name" maxlength="60" required placeholder="週末のゼロ・チャレンジ"></label><label class="field">行数<select name="rows">${sizeOptions(row)}</select></label><label class="field">列数<select name="cols">${sizeOptions(col)}</select></label><label class="field full">シード<input name="seed" maxlength="100" required value="${e(seed)}"></label><label class="field full">盤面数<input name="boards" type="number" min="1" max="50" value="5" required></label><label class="field">開始（日本時間）<input name="start" type="datetime-local" value="${local(now)}" required></label><label class="field">終了（日本時間）<input name="end" type="datetime-local" value="${local(now+86400000)}" required></label></div><p class="body-copy">大会のロックマス数は自動です。開催期間は最大90日。作成後の条件変更はできません。URLを共有する相手にはサイトへのアクセス権も必要です。</p><button class="btn primary" type="submit">大会を作成する ${icon('arrow')}</button></form>`);
}
async function share(url){try{await navigator.clipboard.writeText(url);toast('共有URLをコピーしました');}catch{modal('共有URL',`<label class="field"><input readonly value="${e(url)}" onfocus="this.select()"></label><p>このURLをコピーしてください。</p>`);}}
function customConfig(form){const value=form.elements.lockCount.value.trim();return {rows:Number(form.elements.rows.value),cols:Number(form.elements.cols.value),seed:form.elements.seed.value.trim()||randomSeed(),lockCount:value===''?null:Number(value)};}
function saveSettings(){write('settings',settings);applyAppearance();music();}
function help(){pauseGame();render();modal('数字を選んで、すべてをゼロに。',`<p>左の数字はその行、上の数字はその列で、あと必要な合計です。正解マスを確定すると数字を両方の合計から引きます。</p><p>対象外を確定するとライフが1減ります。3回のミスでゲームオーバー。鍵のマスは、最初から選択済みのヒントです。</p><p>標準操作は<strong>1回目でハイライト、同じマスの2回目で確定</strong>。間隔の制限はありません。長押しでも確認でき、離したときに確定はしません。</p><p>矢印キーで移動、Enter／Spaceでクリック、Escでハイライトを解除できます。タッチ操作では単タップでフラグ設置／解除、ダブルタップで選択します。PCではShift＋クリック・右クリック・Fキーでフラグを設置／解除。タッチ操作のダブルタップはフラグを解除して選択します。PCではフラグを解除してから選択してください。ランキングの順位用時間には、一時停止中の時間も含みます。</p><button class="btn primary" data-action="close-modal">わかりました</button>`);}
document.addEventListener('click',async event=>{
  interacted=true;if(settings.bgm&&!musicInterval)music();
  const cell=event.target.closest('[data-cell]');
  if(cell){if(event.detail!==0&&Date.now()<suppressClickUntil){event.preventDefault();return;}const i=Number(cell.dataset.cell);if(event.detail===0){if(touchMode())confirmCell(i,{clearFlag:true});else clickCell(i);return;}if(touchMode(event.pointerType||lastPointerType)){event.preventDefault();return;}if(event.shiftKey||game?.flagMode){event.preventDefault();flagCell(i);return;}clickCell(i);return;}
  touchTaps.cancel();
  const button=event.target.closest('[data-action]');
  if(!button){if(game?.highlight!==null&&game?.phase==='playing'){game.highlight=null;renderBoard();}return;}
  const action=button.dataset.action;
  try{
    if(action==='nav')return setView(button.dataset.view);
    if(action==='start')return start();
    if(action==='flag-mode'){if(game?.phase==='playing'){game.flagMode=!game.flagMode;game.highlight=null;renderGame();}return;}
    if(action==='connect-online'){await connectGuest();me=await api('me');apiAvailable=true;render();toast('オンラインIDを接続しました。ランキング提供は設定で切り替えられます。');return;}
    if(action==='start-practice'){if(game?.phase==='ready'){game.eligible=false;game.sessionId=null;$('#modal').close();beginPlay(game,keyFor(game.mode,game.context,game.stage));}return;}
    if(action==='pause'){pauseGame();render();return;}
    if(action==='resume'){if(game?.phase==='paused'){game.phase='playing';game.activeStart=performance.now();persistGame();render();}return;}
    if(action==='retry')return retry();
    if(action==='next')return nextBoard();
    if(action==='reload')return prepare(view==='daily'?'daily':'normal',stage,view==='daily'?day():'');
    if(action==='stage'||action==='jump-stage'){
      const n=action==='stage'?Number(button.dataset.stage):Number($('#history-stage')?.value);if(!Number.isInteger(n)||n<1||game?.mode==='normal'&&n>progress.unlocked){toast('解放済みのステージを選んでください');return;}
      if(!leaveCheck())return;const g=game;pauseGame();return prepare(g.mode,n,g.context);
    }
    if(action==='help')return help();
    if(action==='sound'){settings.se=!settings.se;saveSettings();toast('効果音を'+(settings.se?'オン':'オフ')+'にしました');return;}
    if(action==='close-modal'){$('#modal')?.close();return;}
    if(action==='test-sound'){sound('win');return;}
    if(action==='save-name'){
      const value=$('#username').value.trim();if(!value||value.length>24){toast('名前は1〜24文字で入力してください');return;}settings.name=value;saveSettings();
      if(me.authenticated&&navigator.onLine)try{await api('profile',{name:value});}catch(err){toast('端末に保存しました。オンラインの名前変更は失敗しました：'+err.message);render();return;}
      toast('ユーザー名を保存しました');render();return;
    }
    if(action==='skin'){settings.skin=button.dataset.skin;saveSettings();render();return;}
    if(action==='apply-custom-skin'){
      const candidate=Object.fromEntries([...document.querySelectorAll('[data-color]')].map(x=>[x.dataset.color,x.value]));settings.customSkin=validateSkin(candidate);settings.skin='custom';saveSettings();render();toast('カスタムスキンを適用しました');return;
    }
    if(action==='export-skin'){
      const skin=settings.skin==='custom'?settings.customSkin:presets[settings.skin]||presets.light;const blob=new Blob([JSON.stringify(skin,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='sumline-skin.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
    }
    if(action==='import-skin'){$('#skin-file').click();return;}
    if(action==='create-tour')return createTournamentModal();
    if(action==='refresh-tour')return loadTournaments();
    if(action==='open-tour')return openTournament(button.dataset.id);
    if(action==='tour-rank')return openTournament(button.dataset.id,true);
    if(action==='join-tour'){
      $('#modal').close();const t=tournament;const cleared=progress.history.filter(h=>h.mode==='tournament'&&h.context===t.id).map(h=>h.stage);const next=Math.min(t.boards,Math.max(0,...cleared)+1);return prepare('tournament',next,t.id);
    }
    if(action==='tour-ranking'){if(!tournament)return;pauseGame();game=null;view='ranking';rankScope=tournament.id;const u=new URL(location.href);u.searchParams.set('tournament',tournament.id);u.searchParams.set('view','ranking');history.replaceState({},'',u);render();return loadRanking();}
    if(action==='share-tour'||action==='share-ranking'){if(tournament){const url=new URL(appBase);url.searchParams.set('tournament',tournament.id);if(action==='share-ranking')url.searchParams.set('view','ranking');return share(url.href);}return;}
    if(action==='share-custom'){
      const f=$('#custom-form');if(!f)return;const cfg=customConfig(f);f.elements.seed.value=cfg.seed;const u=new URL(appBase);u.searchParams.set('mode','custom');for(const [k,v]of Object.entries(cfg))if(v!==null)u.searchParams.set(k,v);return share(u.href);
    }
    if(action==='period'){rankPeriod=button.dataset.period;return loadRanking();}
    if(action==='refresh-ranking')return loadRanking();
    if(action==='global-ranking'){rankScope='';tournament=null;return loadRanking();}
    if(action==='record-detail'){
      const r=await api(`ranking?period=${rankPeriod}&user=${encodeURIComponent(button.dataset.user)}${rankScope?'&tournament='+encodeURIComponent(rankScope):''}`);
      modal('盤面ごとの記録',r.records.length?`<div class="table-scroll"><table><thead><tr><th>モード / 盤面</th><th>所要時間</th><th>スコア</th></tr></thead><tbody>${r.records.map(x=>`<tr><td>${x.mode==='normal'?'通常':x.mode==='daily'?'デイリー '+e(x.context):'大会'} #${x.stage}</td><td>${fmt(x.elapsed_ms,true)}</td><td>${x.score.toLocaleString()}</td></tr>`).join('')}</tbody></table></div>`:'<p>記録がありません。</p>');return;
    }
  }catch(err){toast(err.message);}
});
document.addEventListener('submit',async event=>{
  if(!['custom-form','tournament-form'].includes(event.target.id))return;
  event.preventDefault();const form=event.target;
  if(form.id==='custom-form'){
    if(!leaveCheck())return;const cfg=customConfig(form);const u=new URL(appBase);u.searchParams.set('mode','custom');Object.entries(cfg).forEach(([k,v])=>{if(v!==null)u.searchParams.set(k,v);});history.replaceState({},'',u);view='custom';await prepare('custom',1,'',cfg);return;
  }
  const submit=form.querySelector('[type=submit]');submit.disabled=true;
  try{
    const value=name=>form.elements[name].value;
    const r=await api('tournaments',{name:value('name'),seed:value('seed'),rows:Number(value('rows')),cols:Number(value('cols')),boards:Number(value('boards')),startsAt:Date.parse(value('start')+':00+09:00'),endsAt:Date.parse(value('end')+':00+09:00')});
    $('#modal').close();toast('大会を作成しました。共有URLをコピーできます。');await openTournament(r.id);
  }catch(err){toast(err.message);submit.disabled=false;}
});
document.addEventListener('change',async event=>{
  const input=event.target;
  if(input.matches('[data-setting]')){
    const key=input.dataset.setting;if(['inputMode','clickMode','longPress'].includes(key))cancelInput();settings[key]=input.type==='checkbox'?input.checked:input.value;
    if(key==='ranking'&&!settings.ranking&&game){game.eligible=false;game.sessionId=null;game.submitMessage='ランキング提供をオフにしたため送信しません。';persistGame();}
    if(key==='ranking'&&settings.ranking&&authMode==='guest')try{await connectGuest();me=await api('me');apiAvailable=true;}catch(err){settings.ranking=false;input.checked=false;toast(err.message);}
    if(key==='ranking'&&settings.ranking&&!apiBase){settings.ranking=false;input.checked=false;toast('共有サーバーを設定するとランキングを利用できます');}
    saveSettings();return;
  }
  if(input.id==='skin-file'&&input.files[0]){
    try{const f=input.files[0];if(f.size>10000)throw Error('スキンファイルは10KB以下にしてください');const s=validateSkin(JSON.parse(await f.text()));settings.customSkin=s;settings.skin='custom';saveSettings();render();toast('スキンを読み込みました');}catch(err){toast('読み込めませんでした：'+err.message);}input.value='';
  }
});
document.addEventListener('input',event=>{const input=event.target;if(input.matches('input[type=range][data-setting]')){settings[input.dataset.setting]=Number(input.value);saveSettings();}});
document.addEventListener('pointerdown',event=>{
  const pointerType=event.pointerType||'mouse';lastPointerType=pointerType;updateInputPresentation();
  const touch=touchMode(pointerType),target=event.target.closest('[data-cell]');
  if(touch&&event.button===0){activePointers.add(event.pointerId);if(activePointers.size>1||event.isPrimary===false){touchTaps.cancel();clearTimeout(press?.timer);press=null;suppressClickUntil=Date.now()+1000;return;}}
  if(!target||game?.phase!=='playing'||event.button!==0){touchTaps.cancel();return;}
  const i=Number(target.dataset.cell);
  if(game.puzzle.givens[i]||game.confirmed.includes(i)||game.mistakes.includes(i)){touchTaps.flush();return;}
  if(!touch)suppressClickUntil=0;
  if(!touch&&(event.shiftKey||game.flagMode))return;
  clearTimeout(press?.timer);
  press={id:event.pointerId,x:event.clientX,y:event.clientY,cell:i,long:false,moved:false,touch,timer:null};
  if(touch){suppressClickUntil=Date.now()+1000;touchTaps.begin(i);}
  if(settings.longPress){const p=press;p.timer=setTimeout(()=>{if(press!==p||p.moved)return;p.long=true;touchTaps.cancel();suppressClickUntil=Date.now()+1000;clickCell(p.cell,true);},450);}
});
document.addEventListener('pointermove',event=>{
  if(!press||event.pointerId!==press.id)return;
  if(movedBeyondTap(press.x,press.y,event.clientX,event.clientY)){press.moved=true;clearTimeout(press.timer);touchTaps.cancel();suppressClickUntil=Date.now()+1000;}
});
document.addEventListener('pointerup',event=>{
  activePointers.delete(event.pointerId);
  if(!press||event.pointerId!==press.id)return;
  const p=press;press=null;clearTimeout(p.timer);
  if(p.touch||p.long||p.moved)suppressClickUntil=Date.now()+1000;
  const released=document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-cell]');
  if(p.moved||p.long||movedBeyondTap(p.x,p.y,event.clientX,event.clientY)||Number(released?.dataset.cell)!==p.cell){touchTaps.cancel();return;}
  if(p.touch&&game?.phase==='playing')touchTaps.tap(p.cell);
});
document.addEventListener('pointercancel',()=>{cancelInput();suppressClickUntil=Date.now()+1000;});
document.addEventListener('scroll',()=>{if(press){press.moved=true;clearTimeout(press.timer);touchTaps.cancel();}},{capture:true,passive:true});
document.addEventListener('contextmenu',event=>{const cell=event.target.closest('[data-cell]');if(cell){event.preventDefault();touchTaps.cancel();clearTimeout(press?.timer);if(touchMode(event.pointerType||lastPointerType)){if(press)press.long=true;return;}press=null;flagCell(Number(cell.dataset.cell));}});
document.addEventListener('dblclick',event=>{if(event.target.closest('[data-cell]')&&touchMode(event.pointerType||lastPointerType))event.preventDefault();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')touchTaps.cancel();
  if(event.key==='Escape'&&game&&game.highlight!==null){game.highlight=null;renderBoard();return;}
  const b=event.target.closest('[data-cell]');if(!b)return;
  if(event.key.toLowerCase()==='f'){event.preventDefault();if(!event.repeat)flagCell(Number(b.dataset.cell));return;}
  if(event.repeat&&['Enter',' '].includes(event.key)){event.preventDefault();return;}
  const i=Number(b.dataset.cell),cols=game.puzzle.cols;let next=i;
  if(event.key==='ArrowRight')next=i+1;if(event.key==='ArrowLeft')next=i-1;if(event.key==='ArrowDown')next=i+cols;if(event.key==='ArrowUp')next=i-cols;
  if(event.key.startsWith('Arrow')){event.preventDefault();next=Math.max(0,Math.min(game.puzzle.values.length-1,next));$(`[data-cell="${next}"]`)?.focus();}
});
window.addEventListener('offline',()=>{if(game){game.eligible=false;game.sessionId=null;game.submitMessage='途中でオフラインになったため、この記録は送信しません。';persistGame();}render();toast('オフラインに切り替わりました。プレイは続けられます。');});
window.addEventListener('online',()=>{render();toast('オンラインに復帰しました。オフライン中の得点は送信しません。');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pauseGame();cancelInput();clearInterval(musicInterval);musicInterval=null;render();}else music();});
window.addEventListener('pagehide',()=>{cancelInput();persistGame();});
window.addEventListener('blur',cancelInput);
window.addEventListener('resize',()=>requestAnimationFrame(measureBoard));
coarsePointer.addEventListener('change',()=>{cancelInput();updateInputPresentation();});
setInterval(()=>{const t=$('#time');if(t)t.textContent=fmt(elapsed());const r=$('#rta');if(r)r.textContent='RTA '+fmt(wall(),true);},100);
async function boot(){
  applyAppearance();loading=true;render();
  const identity=read('identity',null);if(authMode==='guest'&&apiBase&&identity?.apiBase===apiBase.href&&/^[a-f0-9]{64}$/.test(identity.token||''))guestToken=identity.token;
  try{const r=await api('me');me=r;apiAvailable=true;progress.unlocked=Math.max(progress.unlocked,me.unlocked||1);write('progress',progress);}catch{apiAvailable=false;}
  const params=new URLSearchParams(location.search);
  if(params.get('tournament')){loading=false;view=params.get('view')==='ranking'?'ranking':'tournaments';render();await openTournament(params.get('tournament'),params.get('view')==='ranking');return;}
  if(params.get('mode')==='custom'){
    view='custom';if(params.get('rows')&&params.get('cols')){await prepare('custom',1,'',{rows:Number(params.get('rows')),cols:Number(params.get('cols')),seed:(params.get('seed')||'custom').slice(0,100),lockCount:params.has('lockCount')?Number(params.get('lockCount')):null});return;}
  }
  const active=read('active',null);
  if(active?.puzzle&&active.events&&['normal','daily','custom'].includes(active.mode))try{
    const checked=replay(active.puzzle,active.events);
    if(checked.phase==='playing'&&Number.isFinite(active.activeMs)&&active.activeMs>=0){game={...active,...checked,flags:[...new Set((Array.isArray(active.flags)?active.flags:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<active.puzzle.values.length&&!active.puzzle.givens[i]&&!checked.confirmed.includes(i)&&!checked.mistakes.includes(i)))],flagMode:false,phase:'paused',highlight:null,eligible:false,sessionId:null};view=active.mode;loading=false;render();toast('中断していた盤面を練習として再開できます');return;}
  }catch{write('active',null);}
  stage=progress.unlocked;await prepare('normal',stage);
  if(!storageOK)toast('このブラウザーでは履歴を保存できません。');
}
boot().catch(err=>{loading=false;render();toast(err.message);});
if('serviceWorker' in navigator)navigator.serviceWorker.register(new URL('sw.js',appBase),{scope:appBase.pathname}).catch(()=>{});
