import test from 'node:test';
import assert from 'node:assert/strict';
import {generate,solve,toggleFlag,canSelectCell,remaining,replay} from '../public/engine.js';
import {resolveRuntime,shareURL} from '../public/runtime.js';
test('exact lock counts include zero, requested counts and the maximum while remaining unique',()=>{
  for(const [r,c,k]of [[3,3,0],[3,3,1],[3,3,4],[3,5,2],[5,3,4],[5,5,5],[8,8,59]]){
    const p=generate('exact-count-test',r,c,k);assert.equal(p.givens.filter(Boolean).length,k);assert.deepEqual(solve(p).solutions,[p.solution]);assert.ok(p.solution.filter((v,i)=>v&&!p.givens[i]).length>=3);assert.deepEqual(p,generate('exact-count-test',r,c,k));
  }
});
test('invalid lock counts fail instead of silently changing the request',()=>{for(const n of [-1,5,1.1,NaN])assert.throws(()=>generate('test',3,3,n));assert.deepEqual(generate('normal-v1-1',4,4),generate('normal-v1-1',4,4,null));});
test('flags toggle without changing lives, events, totals or knowing the solution',()=>{
  const p=generate('flags');const state={phase:'playing',lives:3,confirmed:[],mistakes:[],flags:[],events:[],highlight:0};const i=p.givens.findIndex(v=>!v);
  const flagged=toggleFlag(p,state,i);assert.deepEqual(flagged.flags,[i]);assert.equal(flagged.lives,3);assert.deepEqual(flagged.events,[]);assert.deepEqual(remaining(p,flagged.confirmed),remaining(p,state.confirmed));assert.equal(canSelectCell(p,flagged,i),false);assert.equal(flagged.highlight,null);assert.equal(state.flags.length,0);
  const unflagged=toggleFlag(p,flagged,i);assert.equal(canSelectCell(p,unflagged,i),true);assert.deepEqual(unflagged.flags,[]);
});
test('fixed, paused, finished and invalid cells cannot receive flags',()=>{
  const p=generate('flags');const open=p.givens.findIndex(v=>!v),given=p.givens.findIndex(Boolean);const s={phase:'playing',confirmed:[],mistakes:[],flags:[],lives:3};
  assert.equal(toggleFlag(p,s,given),s);assert.equal(toggleFlag(p,s,-1),s);assert.equal(toggleFlag(p,s,Infinity),s);
  for(const phase of ['ready','paused','won','lost']){const t={...s,phase};assert.equal(toggleFlag(p,t,open),t);}
  for(const kind of ['confirmed','mistakes']){const t={...s,[kind]:[open]};assert.equal(toggleFlag(p,t,open),t);assert.equal(canSelectCell(p,t,open),false);}
});
test('notes do not change replay-based wins or scores',()=>{const p=generate('flag-replay');const events=p.solution.flatMap((v,i)=>v&&!p.givens[i]?[i]:[]);assert.equal(replay(p,events).phase,'won');});
test('project-relative assets, APIs and shared seeds retain GitHub project prefix',()=>{
  const config=resolveRuntime({apiBase:'',authMode:'none'},'https://example.github.io/sumline/app.js');assert.equal(config.appBase.href,'https://example.github.io/sumline/');assert.equal(config.apiBase,null);
  assert.equal(new URL('generator-worker.js',config.appBase).pathname,'/sumline/generator-worker.js');
  assert.equal(new URL('sw.js',config.appBase).pathname,'/sumline/sw.js');
  const shared=shareURL(config.appBase,{mode:'custom',seed:'a b',lockCount:0});assert.equal(shared.pathname,'/sumline/');assert.equal(shared.searchParams.get('lockCount'),'0');
  const remote=resolveRuntime({apiBase:'https://api.example.com/api/',authMode:'guest'},'https://example.github.io/sumline/app.js');assert.equal(new URL('ranking?period=day',remote.apiBase).href,'https://api.example.com/api/ranking?period=day');
  assert.throws(()=>resolveRuntime({apiBase:'javascript:alert(1)'},'https://example.github.io/sumline/app.js'));
  assert.throws(()=>resolveRuntime({apiBase:'http://external.example/api/'},'https://example.github.io/sumline/app.js'));
});
