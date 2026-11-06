import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {get} from 'node:http';
import {resolveRuntime} from '../public/runtime.js';
import {createGameServer} from '../scripts/dev-server.mjs';

test('connection supports only offline play and dedicated online identities',()=>{
  const moduleURL='https://example.github.io/sumline/app.js';
  assert.equal(resolveRuntime({apiBase:''},moduleURL).authMode,'none');
  assert.equal(resolveRuntime({apiBase:'https://api.example.com/api/'},moduleURL).authMode,'guest');
  assert.throws(()=>resolveRuntime({apiBase:'',authMode:'unknown'},moduleURL));
  assert.throws(()=>resolveRuntime({apiBase:'',authMode:'guest'},moduleURL));
  assert.throws(()=>resolveRuntime({apiBase:'https://api.example.com/api/',authMode:'none'},moduleURL));
});
test('API settings reject embedded credentials, query strings, fragments and invalid paths',()=>{
  const base='https://example.github.io/sumline/app.js';
  for(const url of ['https://user:secret@api.example.com/api/','https://api.example.com/api/?token=secret','https://api.example.com/api/#x','https://api.example.com/wrong/'])assert.throws(()=>resolveRuntime({apiBase:url,authMode:'guest'},base));
});
async function setup(t){
  const temp=await mkdtemp(join(tmpdir(),'sumline-http-')),root=join(temp,'public');await mkdir(root);await writeFile(join(root,'index.html'),'<!doctype html><html><body>SUMLINE</body></html>');await writeFile(join(root,'engine.js'),'export const version=1;');await writeFile(join(root,'.env'),'private');
  const server=createGameServer({root});server.listen(0,'127.0.0.1');await once(server,'listening');
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});});
  return {temp,root,port:server.address().port,base:`http://127.0.0.1:${server.address().port}`};
}
function rawGet(port,path){return new Promise((resolve,reject)=>{get({hostname:'127.0.0.1',port,path},res=>{let body='';res.setEncoding('utf8');res.on('data',s=>body+=s);res.on('end',()=>resolve({status:res.statusCode,body}));}).on('error',reject);});}
test('local server serves the game, JS MIME type, cache control and HEAD requests',async t=>{
  const {base}=await setup(t);
  const home=await fetch(base+'/?mode=custom');assert.equal(home.status,200);assert.match(await home.text(),/SUMLINE/);assert.match(home.headers.get('Content-Type'),/text\/html/);assert.equal(home.headers.get('Cache-Control'),'no-store');
  const script=await fetch(base+'/engine.js');assert.equal(script.status,200);assert.match(script.headers.get('Content-Type'),/javascript/);assert.equal(script.headers.get('X-Content-Type-Options'),'nosniff');
  const head=await fetch(base+'/engine.js',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');assert.ok(Number(head.headers.get('Content-Length'))>0);
  assert.equal((await fetch(base+'/missing')).status,404);assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
});
test('local server rejects traversal, hidden files and malformed escapes',async t=>{
  const {port}=await setup(t);
  for(const path of ['/../private','/%2e%2e/private','/%2eenv','/\\private'])assert.equal((await rawGet(port,path)).status,403);
  assert.equal((await rawGet(port,'/%invalid')).status,400);
});
test('local server cannot expose symlink targets outside its static root',async t=>{
  const {base,temp,root}=await setup(t);const target=join(temp,'secret.txt');await writeFile(target,'private');
  try{await symlink(target,join(root,'linked.txt'));}catch(err){if(['EPERM','EACCES','ENOSYS'].includes(err.code)){t.skip('Symbolic links unavailable');return;}throw err;}
  const response=await fetch(base+'/linked.txt');assert.equal(response.status,403);assert.doesNotMatch(await response.text(),/private/);
});
