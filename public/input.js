export const TAP_WINDOW_MS=320;
export function usesTouchControls(mode='auto',pointerType='',coarsePointer=false){
  if(mode==='touch')return true;
  if(mode==='desktop')return false;
  if(pointerType==='touch')return true;
  if(pointerType==='mouse'||pointerType==='pen')return false;
  return coarsePointer;
}
export function movedBeyondTap(startX,startY,x,y,slop=10){return Math.hypot(x-startX,y-startY)>slop;}
export function createTapController({onSingle,onDouble,delay=TAP_WINDOW_MS,now=()=>performance.now(),schedule=setTimeout,unschedule=clearTimeout}){
  let pending=null;
  function take(){const p=pending;pending=null;if(p?.timer!==null&&p?.timer!==undefined)unschedule(p.timer);return p;}
  function cancel(){take();}
  function flush(){const p=take();if(p)onSingle(p.cell);}
  function begin(cell){
    if(!pending)return;
    if(pending.cell===cell&&now()-pending.at<=delay){
      if(pending.timer!==null)unschedule(pending.timer);
      pending.timer=null;pending.held=true;
    }else flush();
  }
  function tap(cell){
    if(pending&&pending.cell===cell&&(pending.held||now()-pending.at<=delay)){
      take();onDouble(cell);return;
    }
    flush();
    const p={cell,at:now(),held:false,timer:null};pending=p;
    p.timer=schedule(()=>{if(pending!==p)return;pending=null;onSingle(p.cell);},delay);
  }
  return {begin,tap,cancel,flush,hasPending:()=>pending!==null};
}
