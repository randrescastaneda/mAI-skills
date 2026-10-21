import assert from 'node:assert/strict';
import {readFile,stat,rm} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import test from 'node:test';
const root=path.resolve(import.meta.dirname,'../..');

test('real build emits the static directory supported by the Sites packaging contract',async()=>{
  const hosting=JSON.parse(await readFile(path.join(root,'.openai/hosting.json'),'utf8'));
  assert.ok(['dist','dist/client','out','build','.output/public'].includes(hosting.static.directory),'Sites requires a supported static directory');
  await rm(path.join(root,hosting.static.directory),{recursive:true,force:true});
  execFileSync(process.execPath,['site/build.mjs'],{cwd:root,env:{...process.env,DOCS_BASE_PATH:'/'}});
  assert.ok((await stat(path.join(root,hosting.static.directory,'index.html'))).isFile());
  const provenance=JSON.parse(await readFile(path.join(root,hosting.static.directory,'build-info.json'),'utf8'));
  assert.equal(provenance.commit,execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim());
  assert.equal(provenance.basePath,'/');
});
