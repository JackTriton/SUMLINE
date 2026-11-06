export const GENERATOR_VERSION = 1;
export function seeded(seed) {
  let h = 2166136261;
  for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function targets(values, selected, rows, cols) {
  const row = Array(rows).fill(0), col = Array(cols).fill(0);
  values.forEach((v,i) => { if (selected[i]) { row[Math.floor(i/cols)] += v; col[i%cols] += v; } });
  return {row,col};
}
export function solve(p, limit = 2, budget = 250000) {
  const {rows,cols,values,givens,rowTargets,columnTargets} = p;
  const choices = [];
  for (let r=0;r<rows;r++) {
    const list=[];
    for(let mask=0;mask<(1<<cols);mask++) {
      let sum=0,ok=true;
      for(let c=0;c<cols;c++) { if(givens[r*cols+c] && !(mask & (1<<c))) {ok=false;break;} if(mask&(1<<c))sum+=values[r*cols+c]; }
      if(ok && sum===rowTargets[r]) list.push(mask);
    }
    if(!list.length)return {solutions:[],exhausted:false,nodes:0};
    choices.push({r,list});
  }
  choices.sort((a,b)=>a.list.length-b.list.length || a.r-b.r);
  const mins=Array.from({length:rows+1},()=>Array(cols).fill(0)), maxs=mins.map(a=>a.slice());
  for(let d=rows-1;d>=0;d--)for(let c=0;c<cols;c++) {
    const {r,list}=choices[d],v=values[r*cols+c];
    mins[d][c]=mins[d+1][c]+(list.every(mask=>mask&(1<<c))?v:0);
    maxs[d][c]=maxs[d+1][c]+(list.some(mask=>mask&(1<<c))?v:0);
  }
  const solutions=[], sums=Array(cols).fill(0), picked=Array(rows*cols).fill(false);let nodes=0,exhausted=false;
  function dfs(d) {
    if(solutions.length>=limit || exhausted)return;
    if(++nodes>budget){exhausted=true;return;}
    if(d===rows){if(sums.every((v,c)=>v===columnTargets[c]))solutions.push(picked.slice());return;}
    const {r,list}=choices[d];
    for(const mask of list){
      let ok=true;
      for(let c=0;c<cols;c++){const v=(mask&(1<<c))?values[r*cols+c]:0;const n=sums[c]+v;if(n+mins[d+1][c]>columnTargets[c] || n+maxs[d+1][c]<columnTargets[c]){ok=false;break;}}
      if(!ok)continue;
      for(let c=0;c<cols;c++){picked[r*cols+c]=!!(mask&(1<<c));if(picked[r*cols+c])sums[c]+=values[r*cols+c];}
      dfs(d+1);
      for(let c=0;c<cols;c++)if(mask&(1<<c))sums[c]-=values[r*cols+c];
      if(solutions.length>=limit || exhausted)break;
    }
  }
  dfs(0);return {solutions,exhausted,nodes};
}
export function generate(seed,rows=5,cols=5,lockCount=null) {
  if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<3||rows>8||cols<3||cols>8)throw Error('盤面サイズは3〜8で指定してください');
  if(lockCount!==null)return generateExactLocks(seed,rows,cols,lockCount);
  const random=seeded(`g${GENERATOR_VERSION}|${rows}|${cols}|${seed}`);
  for(let attempt=0;attempt<100;attempt++) {
    const values=Array.from({length:rows*cols},()=>1+Math.floor(random()*9));
    const solution=values.map(()=>random()<0.52);const n=solution.filter(Boolean).length;
    const t=targets(values,solution,rows,cols);
    if(n<4 || n>rows*cols-2 || t.row.some(v=>!v)||t.col.some(v=>!v))continue;
    const p={version:GENERATOR_VERSION,seed:String(seed),rows,cols,values,solution,givens:values.map(()=>false),rowTargets:t.row,columnTargets:t.col};
    for(let clues=0;clues<=n-3;clues++) {
      const result=solve(p);
      if(result.exhausted || !result.solutions.length)break;
      if(result.solutions.length===1){
        if(!p.givens.some(Boolean)){const opts=solution.flatMap((v,i)=>v?[i]:[]);p.givens[opts[Math.floor(random()*opts.length)]]=true;}
        if(solution.filter((v,i)=>v&&!p.givens[i]).length>=3)return p;
        break;
      }
      const other=result.solutions.find(a=>a.some((v,i)=>v!==solution[i]));
      const opts=solution.flatMap((v,i)=>v&&!other[i]&&!p.givens[i]?[i]:[]);
      if(!opts.length)break;
      p.givens[opts[Math.floor(random()*opts.length)]]=true;
    }
  }
  throw Error('盤面を生成できませんでした。シードを変更してください');
}
function generateExactLocks(seed,rows,cols,lockCount) {
  const size=rows*cols,max=size-5;
  if(!Number.isInteger(lockCount)||lockCount<0||lockCount>max)throw Error(`ロック数は0〜${max}、または自動を指定してください`);
  const random=seeded(`locks-v1|${rows}|${cols}|${seed}|${lockCount}`);
  for(let attempt=0;attempt<200;attempt++){
    const values=Array.from({length:size},()=>1+Math.floor(random()*9));
    const order=Array.from({length:size},(_,i)=>i);
    for(let i=size-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    const n=Math.max(lockCount+3,Math.min(size-2,Math.round(size*.52)));
    const solution=Array(size).fill(false);order.slice(0,n).forEach(i=>solution[i]=true);
    const t=targets(values,solution,rows,cols);if(t.row.some(v=>!v)||t.col.some(v=>!v))continue;
    const p={version:GENERATOR_VERSION,lockVersion:1,lockCount,seed:String(seed),rows,cols,values,solution,givens:Array(size).fill(false),rowTargets:t.row,columnTargets:t.col};
    for(let used=0;used<=lockCount;used++){
      const result=solve(p,2,100000);if(result.exhausted||!result.solutions.length)break;
      if(result.solutions.length===1){
        const available=order.filter(i=>solution[i]&&!p.givens[i]);
        available.slice(0,lockCount-used).forEach(i=>p.givens[i]=true);
        return p;
      }
      if(used===lockCount)break;
      const other=result.solutions.find(a=>a.some((v,i)=>v!==solution[i]));
      const options=order.filter(i=>solution[i]&&!other[i]&&!p.givens[i]);
      if(!options.length)break;p.givens[options[Math.floor(random()*options.length)]]=true;
    }
  }
  throw Error(`ロック${lockCount}個で一意解を生成できませんでした。個数を増やすか、シードを変えるか、自動にしてください`);
}
export function canSelectCell(p,state,i){
  return state.phase==='playing'&&Number.isInteger(i)&&i>=0&&i<p.values.length&&!p.givens[i]&&!state.confirmed.includes(i)&&!state.mistakes.includes(i)&&!(state.flags||[]).includes(i);
}
export function toggleFlag(p,state,i){
  if(state.phase!=='playing'||!Number.isInteger(i)||i<0||i>=p.values.length||p.givens[i]||state.confirmed.includes(i)||state.mistakes.includes(i))return state;
  const flags=state.flags||[];
  return {...state,highlight:null,flags:flags.includes(i)?flags.filter(x=>x!==i):[...flags,i]};
}
export function remaining(p,confirmed) {
  const t=targets(p.values,p.givens.map((v,i)=>v||confirmed.includes(i)),p.rows,p.cols);
  return {row:p.rowTargets.map((v,i)=>v-t.row[i]),col:p.columnTargets.map((v,i)=>v-t.col[i])};
}
export function replay(p,events) {
  if(!Array.isArray(events)||events.length>p.rows*p.cols)throw Error('操作履歴が不正です');
  const confirmed=[],mistakes=[];let lives=3,phase='playing';
  for(const i of events){
    if(!Number.isInteger(i)||i<0||i>=p.values.length||p.givens[i]||confirmed.includes(i)||mistakes.includes(i)||phase!=='playing')throw Error('無効な操作が含まれています');
    if(p.solution[i])confirmed.push(i);else{mistakes.push(i);lives--;}
    const left=remaining(p,confirmed);
    if(!lives)phase='lost';else if(left.row.every(v=>v===0)&&left.col.every(v=>v===0))phase='won';
  }
  return {confirmed,mistakes,lives,phase};
}
export function score(p,seconds,lives) {
  const k=p.solution.filter((v,i)=>v&&!p.givens[i]).length;
  return 100*p.rows*p.cols+50*k+Math.floor(3000*(p.rows*p.cols/25)/(1+Math.max(0,seconds)/60))+250*lives;
}
export function jstDay(now=Date.now()){return new Date(now+9*3600000).toISOString().slice(0,10);}
export function periodStart(period,now=Date.now()) {
  if(period==='all')return 0;
  const d=new Date(now+9*3600000);d.setUTCHours(0,0,0,0);
  if(period==='month')d.setUTCDate(1);
  if(period==='week')d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
  return d.getTime()-9*3600000;
}
export function course(mode,stage=1,context='',tournament=null) {
  if(mode==='normal'){const size=stage<=5?4:stage<=15?5:6;return {rows:size,cols:size,seed:`normal-v1-${stage}`};}
  if(mode==='daily')return {rows:5,cols:5,seed:`daily-v1-${context}-${stage}`};
  if(mode==='tournament' && tournament)return {rows:tournament.rows,cols:tournament.cols,seed:`tournament-v1-${tournament.id}-${tournament.seed}-${stage}`};
  throw Error('不明なモードです');
}
export function contrast(a,b){
  const lum=h=>{const v=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
export function validateSkin(s){
  const keys=['background','surface','text','accent','selected','danger'];
  if(!s||typeof s!=='object'||keys.some(k=>typeof s[k]!=='string'||!/^#[a-f0-9]{6}$/i.test(s[k])))throw Error('スキンは6項目の #RRGGBB 色指定にしてください');
  if(contrast(s.text,s.surface)<4.5||contrast(s.text,s.background)<4.5||contrast(s.text,s.selected)<4.5||contrast('#26392e',s.accent)<4.5||contrast(s.danger,s.surface)<3)throw Error('文字と背景・選択色のコントラストが不足しています');
  return Object.fromEntries(keys.map(k=>[k,s[k]]));
}
