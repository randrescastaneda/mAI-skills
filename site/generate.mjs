import { createHash } from 'node:crypto';
import { readFile, readdir, lstat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const ROOT = path.resolve(import.meta.dirname, '..');
const digest = text => createHash('sha256').update(text).digest('hex');
const contacts = new Set(['itsai_platform_admin@worldbankgroup.org', 'sn-itsai-datascience-team-admins@worldbankgroup.org']);
export function auditText(text, file) {
  const rules = [
    /-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/,
    /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|(?:AKIA|ASIA)[A-Z0-9]{16})\b/,
    /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/,
    /https?:\/\/[^\s<>"']*[?&](?:sig|token|access_token|key)=[^\s<>"']+/i,
    /(?:api[_-]?key|apim[_-]?subscription[_-]?key|client[_-]?secret|password|access[_-]?token)["']?\s*[:=]\s*["'][A-Za-z0-9+/=._~-]{32,}["']/i,
    /<\/?(?:script|iframe|object|embed)\b/i,
  ];
  if (rules.some(rule => rule.test(text))) throw new Error(`Publication audit failed: ${file} (sensitive or active content; values withheld)`);
  for (const email of text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) {
    if (!contacts.has(email.toLowerCase())) throw new Error(`Publication audit failed: ${file} (unreviewed contact; value withheld)`);
  }
}

function referenceURL(file) {
  const relative = file.replace(/^skills\//, '').replace(/\/SKILL\.md$/, '').replace(/\.(md|py|R|toml)$/, '');
  return `/reference/${relative}/`;
}

export async function collectReference(root = ROOT) {
  const policy = JSON.parse(await readFile(path.join(root, 'site/public-sources.json'), 'utf8'));
  const approved = new Set(policy.files);
  if (approved.size !== policy.files.length) throw new Error('Duplicate public source');
  const actual = [];
  async function visit(dir) {
    for (const name of (await readdir(path.join(root, dir))).sort()) {
      const file = `${dir}/${name}`;
      const stat = await lstat(path.join(root, file));
      if (stat.isSymbolicLink()) throw new Error(`Public inputs must be regular files: ${file}`);
      if (stat.isDirectory()) {
        if (name === '__pycache__') continue;
        await visit(file);
      } else if (stat.isFile() && !/\.py[co]$/.test(name)) actual.push(file);
      else if (!stat.isFile()) throw new Error(`Public inputs must be regular files: ${file}`);
    }
  }
  await visit('skills');
  const actualSet = new Set(actual);
  if (actual.some(file => !approved.has(file))) throw new Error('New skill resource is not reviewed for publication; update site/public-sources.json after review');
  const files = [];
  for (const file of policy.files) {
    if (!/^skills\/mai-[a-z-]+\/(?:SKILL\.md|(?:references|assets|scripts)\/[A-Za-z0-9._-]+)$/.test(file)) throw new Error('Invalid public source path');
    if (!actualSet.has(file)) throw new Error(`Missing public source: ${file}`);
    const content = await readFile(path.join(root, file), 'utf8');
    auditText(content, file);
    const markdown = file.endsWith('.md');
    const heading = markdown ? content.match(/^# (.+)$/m)?.[1] : null;
    files.push({file, title: heading ?? path.basename(file), url: referenceURL(file), type: markdown ? 'markdown' : 'code', sha256: digest(content), content});
  }
  const skills = files.filter(f => f.file.endsWith('/SKILL.md')).map(f => {
    const fm = /^---\n([\s\S]*?)\n---/.exec(f.content)?.[1];
    const name = fm?.match(/^name: (.+)$/m)?.[1];
    let description = fm?.match(/^description: (.*(?:\n[ \t]+.*)*)/m)?.[1];
    description = description?.replace(/^[>|][-+]?\s*/, '').replace(/\s+/g, ' ').trim();
    if (!name || !description || f.file !== `skills/${name}/SKILL.md`) throw new Error(`Invalid skill metadata: ${f.file}`);
    return {name, title: f.title, description, url: f.url, resources: files.filter(r => r.file.startsWith(`skills/${name}/`) && r !== f).map(r => r.file)};
  });
  return {schema: 1, digest: digest(JSON.stringify(files)), skills, files};
}

export async function generate({check = false} = {}) {
  const value = JSON.stringify(await collectReference(), null, 2) + '\n';
  const target = path.join(ROOT, 'site/generated/reference.json');
  if (check) {
    if (await readFile(target, 'utf8').catch(() => '') !== value) throw new Error('Documentation reference drift. Run node site/generate.mjs and commit the generated snapshot.');
  } else {
    await mkdir(path.dirname(target), {recursive: true});
    await writeFile(target, value);
  }
  console.log(check ? 'Reference matches all reviewed skill sources.' : 'Generated reference from reviewed skill sources.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  generate({check: process.argv.includes('--check')}).catch(error => {console.error(error.message); process.exitCode = 1;});
}
