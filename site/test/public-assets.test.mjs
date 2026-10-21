import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {checkOutput} from '../build.mjs';

test('publication audit covers emitted JavaScript, CSS and SVG, including unlinked assets',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'mai-assets-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  await writeFile(path.join(dir,'index.html'),'<h1>Documentation</h1>');
  for(const extension of ['js','css','svg']) {
    const asset=path.join(dir,`asset.${extension}`);
    await writeFile(asset,'');
    await checkOutput(dir,'/');
    for(const value of ['ghp_'+'a'.repeat(36),'/Users/PRIVATE_PERSON/private']) {
      await writeFile(asset,value);
      await assert.rejects(checkOutput(dir,'/'),error=>/Publication audit failed/.test(error.message)&&!error.message.includes(value));
    }
    await rm(asset);
  }
});
