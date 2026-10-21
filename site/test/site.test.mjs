import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { auditText, collectReference } from '../generate.mjs';
import { normalizeBase, renderMarkdown, checkOutput } from '../build.mjs';

const root = path.resolve(import.meta.dirname, '../..');
async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'mai-docs-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await cp(path.join(root, 'skills'), path.join(dir, 'skills'), {recursive: true});
  await mkdir(path.join(dir, 'site'));
  await cp(path.join(root, 'site/public-sources.json'), path.join(dir, 'site/public-sources.json'));
  return dir;
}

test('publication audit rejects secrets and personal paths without echoing them', () => {
  for (const value of ['ghp_' + 'a'.repeat(36), '/Users/PRIVATE_PERSON/work',
    'someone@private.example', 'https://host.example/?sig=SECRET',
    'api_key = "' + 'aB3'.repeat(12) + '"', '<script>alert(1)</script>']) {
    assert.throws(() => auditText(value, 'fixture'), e => !e.message.includes(value));
  }
  assert.doesNotThrow(() => auditText('APIM_SUBSCRIPTION_KEY=\nitsai_platform_admin@worldbankgroup.org\napi_key=token_provider', 'fixture'));
});

test('reference covers all installed skill resources and rejects unreviewed additions', async t => {
  const dir = await fixture(t);
  const reference = await collectReference(dir);
  assert.equal(reference.skills.length, 9);
  assert.equal(reference.files.length, 23);
  await writeFile(path.join(dir, 'skills/mai-factory/private-notes.md'), 'Not public');
  await assert.rejects(collectReference(dir), /not reviewed/);
});

test('publication rejects symlinks and detects source drift', async t => {
  const dir = await fixture(t);
  const before = await collectReference(dir);
  await writeFile(path.join(dir, 'skills/mai-factory/SKILL.md'), '---\nname: mai-factory\ndescription: Changed public instructions.\n---\n# Changed\n');
  assert.notEqual((await collectReference(dir)).digest, before.digest);
  await rm(path.join(dir, 'skills/mai-factory/SKILL.md'));
  await symlink(path.join(root, 'README.md'), path.join(dir, 'skills/mai-factory/SKILL.md'));
  await assert.rejects(collectReference(dir), /regular/);
});

test('base paths and Markdown links preserve subpath navigation and reject active HTML', () => {
  assert.equal(normalizeBase('/mAI-skills/'), '/mAI-skills/');
  assert.throws(() => normalizeBase('//host/'));
  const html = renderMarkdown('## Heading\n\n[Install](/guide/installation/)\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1))', '/mAI-skills/', new Map());
  assert.match(html, /href="\/mAI-skills\/guide\/installation\/"/);
  assert.doesNotMatch(html, /<script|href="javascript:/);
});

test('built output links, fragments, assets and publication surface are validated', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'mai-output-'));
  t.after(() => rm(dir, {recursive: true, force: true}));
  await writeFile(path.join(dir, 'index.html'), '<a href="/mAI-skills/missing/">Broken</a>');
  await assert.rejects(checkOutput(dir, '/mAI-skills/'), /Missing/);
  await writeFile(path.join(dir, 'index.html'), '<a href="#missing">Broken anchor</a>');
  await assert.rejects(checkOutput(dir, '/mAI-skills/'), /fragment/);
  await writeFile(path.join(dir, 'index.html'), '<h1 id="ok">Good</h1><a href="#ok">Valid</a>');
  await checkOutput(dir, '/mAI-skills/');
});
