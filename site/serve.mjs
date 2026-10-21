import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './generate.mjs';
const directory = path.join(ROOT, 'site-dist');
const base = '/mAI-skills/';
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  try {
    const url = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (!url.startsWith(base)) {res.writeHead(404);res.end();return;}
    let file = path.resolve(directory,url.slice(base.length));
    if (!file.startsWith(directory+path.sep) && file!==directory) throw new Error();
    if ((await stat(file)).isDirectory()) file=path.join(file,'index.html');
    const body = await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Documentation preview: http://127.0.0.1:4173/mAI-skills/'));
