import {createServer} from 'node:http';
import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const projectRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.webp':'image/webp'};
export function createGameServer({root=resolve(projectRoot,'pages-dist')}={}){
  const absolute=resolve(root);
  return createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end('Method not allowed');return;}
    try{
      const raw=(req.url||'/').split('?')[0];
      let path;try{path=decodeURIComponent(raw);}catch{res.writeHead(400);res.end('Invalid path');return;}
      if(path.includes('\0')||path.includes('\\')||path.split('/').some(p=>p==='..'||p.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
      let candidate=resolve(absolute,'.'+path);if(path.endsWith('/'))candidate=resolve(candidate,'index.html');
      const actual=await realpath(candidate),actualRoot=await realpath(absolute);
      if(!actual.startsWith(actualRoot+sep)){res.writeHead(403);res.end('Forbidden');return;}
      const meta=await stat(actual);if(!meta.isFile()){res.writeHead(404);res.end('Not found');return;}
      if(extname(actual)==='.html')res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
      const data=await readFile(actual);res.writeHead(200,{'Content-Type':mime[extname(actual)]||'application/octet-stream','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
    }catch(err){res.writeHead(['ENOENT','ENOTDIR'].includes(err.code)?404:500);res.end(['ENOENT','ENOTDIR'].includes(err.code)?'Not found':'Server error');}
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);
  function option(name,fallback){const i=args.indexOf(name);return i>=0?args[i+1]:fallback;}
  const port=Number(option('--port','8000')),host=option('--host','127.0.0.1');
  if(!Number.isInteger(port)||port<1||port>65535){console.error('Port must be an integer between 1 and 65535');process.exitCode=1;}
  else{
    await import('./build-pages.mjs');
    const server=createGameServer();
    server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`Port ${port} is already in use. Try: npm run dev -- --port 8001`:err.message);process.exitCode=1;});
    server.listen(port,host,()=>console.log(`SUMLINE: http://${host==='127.0.0.1'?'localhost':host}:${port}/\nPress Ctrl+C to stop. Re-run npm run dev after source changes.`));
    for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
  }
}
