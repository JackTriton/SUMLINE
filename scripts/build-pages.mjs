import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=resolve(root,'pages-dist');
let config=JSON.parse(await readFile(resolve(root,'pages.config.json'),'utf8'));
if(process.env.SUMLINE_API_BASE)config={apiBase:process.env.SUMLINE_API_BASE,authMode:'guest'};
if(config.apiBase){const u=new URL(config.apiBase);if(u.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(u.hostname))throw Error('外部APIはHTTPS URLを指定してください');if(u.username||u.password||u.search||u.hash||!u.pathname.endsWith('/api/'))throw Error('API URLは認証情報なしの /api/ で終わるURLを指定してください');if(config.authMode!=='guest')throw Error('PagesのAPI接続時は authMode: guest を指定してください');}
else config={apiBase:'',authMode:'none'};
await rm(destination,{recursive:true,force:true});await mkdir(destination,{recursive:true});
const files=['index.html','offline.html','app.js','runtime.js','input.js','style.css','mobile.css','engine.js','generator-worker.js','favicon.svg','sw.js'];
for(const name of files)await copyFile(resolve(root,'public',name),resolve(destination,name));
await writeFile(resolve(destination,'config.js'),'// Public connection configuration. Never put private keys here.\nexport const runtime = '+JSON.stringify(config,null,2)+';\n');
await writeFile(resolve(destination,'.nojekyll'),'');
console.log(`GitHub Pages files: ${destination} (${config.apiBase?'shared API enabled':'local play, no shared API'})`);
