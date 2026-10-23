import { lstat, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseDocument } from 'yaml';

export const REQUIRED_SKILLS = Object.freeze([
  'mai-factory',
  'mai-credentials',
  'mai-python',
  'mai-r',
  'mai-foundation-models',
  'mai-platform-apis',
  'mai-batch',
  'mai-databricks',
  'mai-troubleshooting',
]);

const FRONTMATTER_FIELDS = new Set([
  'name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools',
]);
const SECRET_PATTERNS = [
  ['private key', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
];

function isInside(directory, target) {
  const relative = path.relative(directory, target);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}

function markdownTargets(markdown) {
  // Code samples are not active Markdown links.
  const text = markdown.replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[ \t]*$/gm, '')
    .replace(/(`+)[\s\S]*?\1/g, '');
  const targets = [];
  const inline = /!?\[[^\]\n]*\]\(\s*/g;
  for (const match of text.matchAll(inline)) {
    let index = match.index + match[0].length;
    let target = '';
    if (text[index] === '<') {
      const end = text.indexOf('>', index + 1);
      if (end === -1) continue;
      target = text.slice(index + 1, end);
      index = end + 1;
    } else {
      let depth = 0;
      for (; index < text.length; index++) {
        const character = text[index];
        if (character === '\\' && index + 1 < text.length) {
          target += character + text[++index];
          continue;
        }
        if (/\s/.test(character) || (character === ')' && depth === 0)) break;
        if (character === '(') depth++;
        if (character === ')') depth--;
        target += character;
      }
    }
    if (/^(?:\s*|\s+(?:"[^"\n]*"|'[^'\n]*'|\([^\n]*?\))\s*)\)/.test(text.slice(index))) {
      targets.push(target);
    }
  }
  const definitions = /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^>\n]+>|[^\s]+)/gm;
  for (const match of text.matchAll(definitions)) {
    targets.push(match[1].replace(/^<|>$/g, ''));
  }
  return targets;
}

function validateFrontmatter(content, name, report) {
  const frontmatter = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!frontmatter) {
    report('SKILL.md needs YAML frontmatter delimited by ---');
    return;
  }
  let fields;
  try {
    const document = parseDocument(frontmatter[1]);
    if (document.errors.length || document.warnings.length) {
      report('frontmatter is not valid, unambiguous YAML');
      return;
    }
    fields = document.toJS({ maxAliasCount: 0 });
  } catch {
    report('frontmatter cannot contain YAML aliases');
    return;
  }
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    report('frontmatter must be a mapping');
    return;
  }
  for (const field of Object.keys(fields)) {
    if (!FRONTMATTER_FIELDS.has(field)) report(`unsupported frontmatter field: ${field}`);
  }
  if (typeof fields.name !== 'string' || fields.name.length > 64
    || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name)) {
    report('name must use 1-64 lowercase letters, numbers, and single hyphens');
  }
  if (fields.name !== name) report('name must match the skill directory');
  if (typeof fields.description !== 'string' || !fields.description.trim()
    || fields.description.length > 1024) {
    report('description must be a non-empty string of at most 1024 characters');
  } else if (!/\b(?:when|use for|triggers?)\b/i.test(fields.description)) {
    report('description must include an activation trigger, such as "Use when"');
  }
  for (const field of ['license', 'allowed-tools', 'compatibility']) {
    if (fields[field] !== undefined
      && (typeof fields[field] !== 'string' || !fields[field].trim())) {
      report(`${field} must be a non-empty string`);
    }
  }
  if (typeof fields.compatibility === 'string' && fields.compatibility.length > 500) {
    report('compatibility must have at most 500 characters');
  }
  if (fields.metadata !== undefined && (!fields.metadata || typeof fields.metadata !== 'object'
    || Array.isArray(fields.metadata) || Object.values(fields.metadata).some(value => typeof value !== 'string'))) {
    report('metadata must map string keys to string values');
  }
  if (!content.slice(frontmatter[0].length).trim()) report('SKILL.md needs instruction text');
}

async function validateLinks(content, file, skillRoot, report) {
  for (const target of markdownTargets(content)) {
    if (!target || target.startsWith('#')) continue;
    if (/^file:/i.test(target) || /^[A-Za-z]:[\\/]/.test(target)) {
      report('local Markdown links must be relative to the skill');
      continue;
    }
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target) || target.startsWith('//')) continue;
    let localPath;
    try {
      localPath = decodeURIComponent(target.split(/[?#]/, 1)[0].replace(/\\([\\()])/g, '$1'));
    } catch {
      report('local Markdown link has invalid URL encoding');
      continue;
    }
    if (!localPath) continue;
    const resolved = path.resolve(path.dirname(file), localPath);
    if (path.isAbsolute(localPath) || localPath.includes('\\') || !isInside(skillRoot, resolved)) {
      report('local Markdown link leaves the individual skill');
      continue;
    }
    try {
      let current = skillRoot;
      for (const segment of path.relative(skillRoot, resolved).split(path.sep).filter(Boolean)) {
        current = path.join(current, segment);
        if ((await lstat(current)).isSymbolicLink()) {
          report('local Markdown link points to a symbolic link');
          break;
        }
      }
    } catch {
      report(`missing local Markdown target: ${localPath}`);
    }
  }
}

function isCredentialFile(name) {
  const isTemplate = /(?:^|[._-])(?:example|sample|template)(?:\.[^.]+)?$/i.test(name);
  return !isTemplate && (/^\.env(?:\..+)?$/i.test(name)
    || /^(?:credentials|client[-_]secret|service[-_]account)\.json$/i.test(name)
    || /\.(?:pem|p12|pfx|key)$/i.test(name));
}

function validateSecrets(content, report) {
  for (const [label, pattern] of SECRET_PATTERNS) {
    if (pattern.test(content)) report(`possible ${label}; remove it or use a placeholder`);
  }
  // Only long literal values in credential fields; environment lookups and placeholders do not match.
  const assignments = /["']?(?:api[_-]?key|apim[_-]?subscription[_-]?key|ocp-apim-subscription-key|access[_-]?token|jfrog[_-]?token|token|client[_-]?secret|password)["']?\s*[:=]\s*["']([A-Za-z0-9+/=._~-]{32,})["']/gi;
  for (const match of content.matchAll(assignments)) {
    if ((/[a-z]/.test(match[1]) && /[A-Z]/.test(match[1]) && /[0-9]/.test(match[1]))
      || /^[a-f0-9]{32,}$/i.test(match[1])) {
      report('possible literal credential; use an environment lookup or placeholder');
    }
  }
}

export async function validateRepository(root) {
  root = path.resolve(root);
  const errors = [];
  const reportFor = file => message => errors.push(`${path.relative(root, file)}: ${message}`);
  const skillsRoot = path.join(root, 'skills');
  let entries;
  try {
    const stat = await lstat(skillsRoot);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('not a directory');
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch {
    return ['skills/: expected a directory containing the nine mAI skills'];
  }
  for (const entry of entries) {
    if (!REQUIRED_SKILLS.includes(entry.name) || !entry.isDirectory()) {
      reportFor(path.join(skillsRoot, entry.name))('unexpected entry; skills/ must contain only the nine skill directories');
    }
  }
  for (const name of REQUIRED_SKILLS) {
    const skillRoot = path.join(skillsRoot, name);
    if (!entries.some(entry => entry.name === name && entry.isDirectory())) {
      reportFor(skillRoot)('required skill directory is missing');
      continue;
    }
    let hasSkillFile = false;
    async function visit(directory) {
      const children = await readdir(directory, { withFileTypes: true });
      for (const entry of children.sort((a, b) => a.name.localeCompare(b.name))) {
        const file = path.join(directory, entry.name);
        const report = reportFor(file);
        if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) {
          report('only regular files and directories are allowed inside a skill');
          continue;
        }
        if (entry.isDirectory()) {
          await visit(file);
          continue;
        }
        if (isCredentialFile(entry.name)) {
          report('credential files must not be distributed; use a template with placeholders');
          continue;
        }
        const content = await readFile(file, 'utf8');
        validateSecrets(content, report);
        if (file === path.join(skillRoot, 'SKILL.md')) {
          hasSkillFile = true;
          validateFrontmatter(content, name, report);
          if (content.replace(/\r?\n$/, '').split(/\r?\n/).length >= 500) {
            report('SKILL.md must have fewer than 500 lines');
          }
        }
        if (/\.md$/i.test(file)) await validateLinks(content, file, skillRoot, report);
      }
    }
    await visit(skillRoot);
    if (!hasSkillFile) reportFor(path.join(skillRoot, 'SKILL.md'))('required SKILL.md is missing');
  }
  for (const name of ['README.md', 'SOURCES.md']) {
    const file = path.join(root, name);
    try {
      const stat = await lstat(file);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        reportFor(file)('distribution documents must be regular files');
        continue;
      }
      validateSecrets(await readFile(file, 'utf8'), reportFor(file));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      if (name === 'README.md') reportFor(file)('required README.md is missing');
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url));
  try {
    const errors = await validateRepository(root);
    if (errors.length) {
      console.error(errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`Validated ${REQUIRED_SKILLS.length} self-contained mAI skills.`);
    }
  } catch (error) {
    console.error(`Validation failed: ${error.code ?? error.name}`);
    process.exitCode = 1;
  }
}
