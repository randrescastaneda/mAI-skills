import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Marked } from 'marked';
import { ROOT, auditText, collectReference } from './generate.mjs';

const repository = 'https://github.com/randrescastaneda/mAI-skills';
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function normalizeBase(value = '/') {
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value)) throw new Error('Use a base path such as / or /mAI-skills/');
  return value;
}
const withBase = (url, base) => `${base}${url.replace(/^\//, '')}`;
const plain = value => value.replace(/<[^>]*>/g, '').replace(/&[a-z#0-9]+;/g, ' ').replace(/[`#*]/g, '').replace(/\s+/g, ' ').trim();

export function renderMarkdown(markdown, base, links = new Map(), sourceFile = '') {
  const ids = new Map();
  const renderer = {
    html({text}) { return escapeHTML(text); },
    heading({tokens, depth}) {
      const body = this.parser.parseInline(tokens);
      const stem = plain(body).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
      const count = ids.get(stem) ?? 0; ids.set(stem, count + 1);
      const id = `${stem}${count ? `-${count}` : ''}`;
      return `<h${depth} id="${id}">${body}<a class="heading-link" href="#${id}" aria-label="Link to ${escapeHTML(plain(body))}">#</a></h${depth}>`;
    },
    link({href, title, tokens}) {
      const label = this.parser.parseInline(tokens);
      if (!href || /^(?!https?:|mailto:)[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return label;
      let url = href;
      if (!/^(?:https?:|mailto:|#)/.test(href)) {
        const [file, fragment] = href.split('#');
        const resolved = path.posix.join(path.posix.dirname(sourceFile), file);
        url = withBase(file.startsWith('/') ? file : links.get(resolved) ?? file, base) + (fragment ? `#${fragment}` : '');
      }
      return `<a href="${escapeHTML(url)}"${title ? ` title="${escapeHTML(title)}"` : ''}>${label}</a>`;
    },
    image({text}) { return escapeHTML(text); },
    code({text, lang}) {
      const language = (lang ?? 'text').split(/\s/)[0];
      return `<div class="code-block"><div class="code-toolbar"><span>${escapeHTML(language)}</span><button class="copy-button" type="button" aria-label="Copy ${escapeHTML(language)} example">Copy</button></div><pre tabindex="0"><code>${escapeHTML(text)}</code></pre></div>`;
    },
    table({header, rows}) {
      const cell = (c, tag) => `<${tag}>${this.parser.parseInline(c.tokens)}</${tag}>`;
      return `<div class="table-scroll" role="region" aria-label="Reference table" tabindex="0"><table><thead><tr>${header.map(c=>cell(c,'th')).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>cell(c,'td')).join('')}</tr>`).join('')}</tbody></table></div>`;
    },
  };
  return new Marked({gfm: true, renderer}).parse(markdown);
}

export async function checkOutput(directory, base) {
  const files = [];
  async function visit(dir = '') {
    for (const item of await readdir(path.join(directory, dir), {withFileTypes: true})) {
      const file = path.posix.join(dir, item.name);
      if (item.isDirectory()) await visit(file);
      else {
        if (!item.isFile() || !(/\.(?:html|css|js|json|svg)$/.test(file) || ['.nojekyll', 'robots.txt'].includes(file))) throw new Error(`Unexpected publication file: ${file}`);
        files.push(file);
      }
    }
  }
  await visit();
  const fileSet = new Set(files);
  const html = new Map(await Promise.all(files.filter(f=>f.endsWith('.html')).map(async f => [f, await readFile(path.join(directory,f),'utf8')])));
  for (const [file, content] of html) {
    const ids = [...content.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate fragment ID in ${file}`);
    for (const [, raw] of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const url = raw.replaceAll('&amp;', '&');
      if (/^(https?:|mailto:|data:)/.test(url)) continue;
      if (url.startsWith('/') && !url.startsWith(base)) throw new Error(`Link escapes base path in ${file}`);
      const [part, fragment] = url.split('#');
      let target = part ? (part.startsWith('/') ? part.slice(base.length) : path.posix.join(path.posix.dirname(file), part)) : file;
      target = decodeURIComponent(target);
      if (!target || target.endsWith('/')) target += 'index.html';
      if (!fileSet.has(target)) throw new Error(`Missing local target ${target} in ${file}`);
      if (fragment && !(html.get(target) ?? '').includes(`id="${fragment}"`)) throw new Error(`Missing fragment ${fragment} in ${file}`);
    }
  }
  for (const file of files) {
    const content = html.get(file) ?? await readFile(path.join(directory,file),'utf8');
    auditText(content.replace(/<script\b[^>]*><\/script>/g, ''), file);
  }
  return files.length;
}

export async function build({base = process.env.DOCS_BASE_PATH ?? '/', output = path.join(ROOT, 'site-dist')} = {}) {
  base = normalizeBase(base);
  const reference = await collectReference();
  const guides = JSON.parse(await readFile(path.join(ROOT, 'site/guides.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: ROOT, encoding: 'utf8'}).trim();
  const links = new Map(reference.files.map(f=>[f.file,f.url]));
  const allowedSources = new Set(['README.md','package.json',...reference.files.map(f=>f.file)]);
  const seen = new Set();
  for (const guide of guides) {
    if (!/^[a-z-]+$/.test(guide.slug) || seen.has(guide.slug)) throw new Error('Invalid or duplicate guide slug');
    seen.add(guide.slug);
    auditText(JSON.stringify(guide), `guide/${guide.slug}`);
    if (!guide.sourcePaths?.length || guide.sourcePaths.some(p=>!allowedSources.has(p))) throw new Error(`Unreviewed guide source: ${guide.slug}`);
  }
  const guidePages = guides.map(g=>({...g,url:`/guide/${g.slug}/`,kind:'guide'}));
  const resourcePages = reference.files.map(f=>({...f, markdown: f.type === 'markdown' ? f.content.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^\s*# [^\n]+\n/, '') : `\`\`\`${path.extname(f.file).slice(1) || 'text'}\n${f.content}\n\`\`\``, description: f.file, kind:'reference'}));
  const pages = [...guidePages,...resourcePages];
  const href = url => escapeHTML(withBase(url, base));
  function sidebar(active) {
    const groups = [...new Set(guides.map(g=>g.category))];
    return `<nav id="sidebar" class="sidebar" aria-label="Documentation"><a class="nav-overview${active==='/'?' active':''}" href="${href('/')}"${active==='/'?' aria-current="page"':''}>Overview <span>↗</span></a>${groups.map(category=>`<p class="nav-label">${escapeHTML(category)}</p><ul>${guidePages.filter(g=>g.category===category).map(g=>`<li><a href="${href(g.url)}"${active===g.url?' aria-current="page" class="active"':''}>${escapeHTML(g.title)}</a></li>`).join('')}</ul>`).join('')}<p class="nav-label">Skill reference <span class="small-count">${reference.skills.length}</span></p><ul>${reference.skills.map(s=>`<li><a href="${href(s.url)}"${active.startsWith(s.url)?' aria-current="page" class="active"':''}>${escapeHTML(s.name)}</a></li>`).join('')}</ul><div class="sidebar-note"><span class="live-dot"></span>Source connected<p>Reference generated from the plugin. Guides maintained by hand.</p><a href="${href('/guide/updates/')}">How updates work →</a></div></nav>`;
  }
  function shell({title, description, url, body, toc = '', kind = 'guide'}) {
    const preview = process.env.SITE_PREVIEW === '1';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHTML(description)}"><meta name="color-scheme" content="light"><meta name="docs-source" content="${sha}"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'"><title>${escapeHTML(title)} · mAI Skills</title><link rel="canonical" href="https://randrescastaneda.github.io/mAI-skills${url}">${preview?'<meta name="robots" content="noindex,nofollow">':''}<link rel="icon" href="${href('/assets/favicon.svg')}" type="image/svg+xml"><link rel="stylesheet" href="${href('/assets/style.css')}"><script src="${href('/assets/app.js')}" defer></script></head><body data-base="${base}"><a class="skip" href="#main">Skip to content</a><header class="header"><a class="brand" href="${href('/')}" aria-label="mAI Skills home"><span class="brand-mark">m<span>AI</span></span><span>Skills<span class="brand-divider">/</span><span class="brand-docs">Documentation</span></span></a><div class="header-actions"><button id="search-open" class="search-trigger" type="button" aria-label="Search documentation"><span aria-hidden="true">⌕</span> <span>Search docs</span><kbd>⌘ K</kbd></button><a class="github-link" href="${repository}">GitHub <span aria-hidden="true">↗</span></a><button id="menu-toggle" class="menu-toggle" type="button" aria-label="Open documentation menu" aria-controls="sidebar" aria-expanded="false">☰</button></div></header><div class="layout">${sidebar(url)}<div class="page-wrap"><main id="main" tabindex="-1" class="${kind==='home'?'home':'document'}">${body}</main>${toc?`<aside class="toc" aria-label="On this page"><p>On this page</p>${toc}</aside>`:''}<footer class="footer"><span>mAI Skills <span class="footer-dot">·</span> Agent instructions for mAI Factory</span><a href="${repository}/commit/${sha}">Source ${sha.slice(0,7)} ↗</a></footer></div></div><dialog id="search-dialog" aria-labelledby="search-title"><div class="search-heading"><label id="search-title" for="search-input">Search documentation</label><button id="search-close" type="button" aria-label="Close search">Esc</button></div><input id="search-input" type="search" placeholder="Try Python, 401, installation…" autocomplete="off" aria-controls="search-results" aria-describedby="search-help"><p id="search-help">Guides, all nine skills, and every bundled resource. Use ↑ ↓ to browse.</p><p id="search-status" role="status" aria-live="polite"></p><ul id="search-results"></ul></dialog><div class="sr-only" id="copy-status" role="status" aria-live="polite"></div></body></html>`;
  }
  async function emit(url, html) {
    const destination = path.join(output, url.replace(/^\//,''), 'index.html');
    await mkdir(path.dirname(destination),{recursive:true}); await writeFile(destination, html);
  }
  await rm(output,{recursive:true,force:true});
  await mkdir(path.join(output,'assets'),{recursive:true});
  for (const file of ['style.css','app.js','favicon.svg']) await cp(path.join(ROOT,'site/assets',file),path.join(output,'assets',file));
  for (const page of pages) {
    const content = renderMarkdown(page.markdown, base, links, page.file);
    const headings = [...content.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
    const toc = headings.map(([,id,text])=>`<a href="#${id}">${escapeHTML(plain(text).replace(/#$/,''))}</a>`).join('');
    const isRef = page.kind==='reference';
    const skill = isRef ? reference.skills.find(s=>page.file.startsWith(`skills/${s.name}/`)) : null;
    const sources = isRef ? [page.file] : page.sourcePaths;
    const siblings = isRef ? reference.files.filter(f=>skill.resources.includes(f.file)) : [];
    const resources = isRef && page.file.endsWith('/SKILL.md') && siblings.length ? `<section class="resources"><h2 id="bundled-resources">Bundled resources</h2><p>Browse every reference, starter, and helper included with this skill.</p><ul>${siblings.map(f=>`<li><a href="${href(f.url)}">${escapeHTML(f.title)}</a><span>${escapeHTML(path.posix.dirname(f.file).split('/').at(-1))}</span></li>`).join('')}</ul></section>` : '';
    const guideIndex = guidePages.findIndex(g=>g.url===page.url);
    const next = !isRef && guidePages[guideIndex+1];
    const body = `<div class="eyebrow">${isRef?'SOURCE REFERENCE':'THE HANDBOOK'}<span>/</span>${escapeHTML(isRef?skill.name:page.category)}</div><div class="page-title-row"><h1>${escapeHTML(page.title)}</h1><span class="badge ${isRef?'generated':'editorial'}">${isRef?'Auto-generated':'Editorial guide'}</span></div><p class="lede">${escapeHTML(isRef?skill.description:page.description)}</p>${isRef?`<div class="reference-note">Rendered directly from <code>${escapeHTML(page.file)}</code>. These instructions describe the plugin; live API contracts still require current platform verification.</div>`:''}<div class="prose">${content}${resources}</div><div class="source-note"><strong>${isRef?'Automatic source reference':'Guide sources'}</strong><p>${isRef?'Source changes regenerate this page during the build.':'This guide requires editorial review when its source workflow changes.'}</p>${sources.map(p=>`<a href="${repository}/blob/${sha}/${p}">${escapeHTML(p)} ↗</a>`).join('')}</div>${next?`<a class="next-page" href="${href(next.url)}"><span>Continue reading</span><strong>${escapeHTML(next.title)} →</strong></a>`:''}`;
    await emit(page.url,shell({...page,body,toc:toc+(resources?'<a href="#bundled-resources">Bundled resources</a>':''),kind:page.kind}));
  }
  const homeBody = `<div class="eyebrow"><span class="live-dot"></span> mAI SKILLS <span>/</span> THE FIELD GUIDE</div><section class="hero"><div class="hero-copy"><span class="pill">World Bank mAI Factory · ${reference.skills.length} portable skills</span><h1>From first setup<br>to <em>confident use.</em></h1><p>A practical handbook for working with mAI Factory through your coding agent. Choose your workflow, install the right skills, and build on verified foundations.</p><div class="hero-buttons"><a class="button-primary" href="${href('/guide/getting-started/')}">Start here <span>→</span></a><a class="button-secondary" href="${href('/guide/installation/')}">Install the skills <span>↗</span></a></div><div class="hero-meta"><span>SKILL.md format</span><span>Python + R</span><span>Offline-first checks</span></div></div><div class="hero-terminal"><div class="terminal-top"><span><i></i><i></i><i></i></span><span>your coding agent</span></div><div class="terminal-body"><p class="terminal-label">01 / ASK EXPLICITLY</p><p><span class="terminal-prompt">›</span> Use <strong>mai-factory</strong> to help me connect from my local IDE. Confirm my access type. Do not request or display secrets.</p><div class="terminal-rule"></div><p class="terminal-label">02 / WORK IN ORDER</p><ol class="terminal-steps"><li><span>✓</span> Choose the approved access path</li><li><span>✓</span> Match environment and credentials</li><li><span>○</span> Check offline before connecting</li><li><span>○</span> Verify a small live request</li></ol></div><div class="terminal-bottom"><span class="live-dot"></span>Instructions for your agent. Access comes separately.</div></div></section><div class="stat-strip"><div><strong>${reference.skills.length}</strong><span>independent skills</span></div><div><strong>4</strong><span>access paths explained</span></div><div><strong>${reference.files.length}</strong><span>source files, browsable</span></div><div><strong>0</strong><span>runtime dependencies</span></div></div><section class="home-section"><div class="section-heading"><div><div class="eyebrow">FIND YOUR STARTING POINT</div><h2>What are you building?</h2></div><a href="${href('/guide/clients/')}">Clients & prerequisites →</a></div><div class="workflow-grid">${[['01','A first Python connection','Set up Desktop or Application Access, check configuration offline, then verify a public sample.','python-workflow','Python · uv · Responses'],['02','R or Shiny on Connect','Keep Connect OAuth separate from model requests, and move carefully from legacy chat APIs.','r-workflow','R · httr2 · Posit Connect'],['03','A repeatable bulk workflow','Validate JSONL, submit against a verified contract, and reconcile every request by its ID.','batch-workflow','JSONL · batch · recovery']].map(([n,t,d,s,tags])=>`<a class="workflow-card" href="${href(`/guide/${s}/`)}"><span class="card-number">${n}<span>↗</span></span><h3>${t}</h3><p>${d}</p><span class="card-tags">${tags}</span></a>`).join('')}</div></section><section class="home-section catalog-section" id="skill-library"><div class="section-heading"><div><div class="eyebrow">THE COMPLETE COLLECTION</div><h2>One skill for each next step.</h2></div><span class="badge generated">Source-generated reference</span></div><div class="skill-list">${reference.skills.map((s,i)=>`<a href="${href(s.url)}"><span class="skill-index">${String(i+1).padStart(2,'0')}</span><div><h3>${escapeHTML(s.name)}</h3><p>${escapeHTML(s.description)}</p></div><span class="skill-arrow">↗</span></a>`).join('')}</div></section><section class="confidence-panel"><div><div class="eyebrow">KNOW WHAT IS VERIFIED</div><h2>Good setup starts<br>with clear boundaries.</h2></div><div><p>These skills give your agent instructions, secure starters, and offline tools. They do not grant mAI access or establish a current API contract.</p><p>Model availability, routes, schemas, and permissions need current platform verification before live calls. The guides make those checkpoints explicit.</p><a href="${href('/guide/security/')}">Read the source & security rules →</a></div></section><section class="quick-install home-section"><div><div class="eyebrow">READY WHEN YOU ARE</div><h2>Install. Then ask your agent.</h2><p>Git, Node.js ${escapeHTML(pkg.engines.node.replace('>=',''))}+ and npm required.</p></div>${renderMarkdown('```bash\nnpx skills@1.7.4 add randrescastaneda/mAI-skills --list\nnpx skills@1.7.4 add randrescastaneda/mAI-skills\n```',base)}</section>`;
  await emit('/',shell({title:'The field guide',description:'Install and use nine portable agent skills for World Bank mAI Factory. Secure Python and R workflows, batch tools, and a complete source-generated reference.',url:'/',body:homeBody,kind:'home'}));
  const search = [{title:'mAI Skills overview',url:base,text:'Install and use portable skills for World Bank mAI Factory',kind:'Overview'},...pages.map(p=>({title:p.title,url:withBase(p.url,base),kind:p.kind==='guide'?'Guide':'Reference',keywords:p.file?.split('/')[1] ?? '',text:plain(p.markdown)}))];
  await writeFile(path.join(output,'search-index.json'),JSON.stringify(search));
  await writeFile(path.join(output,'build-info.json'),JSON.stringify({commit:sha,referenceDigest:reference.digest,skillCount:reference.skills.length,resourceCount:reference.files.length,basePath:base,preview:process.env.SITE_PREVIEW==='1'},null,2)+'\n');
  await writeFile(path.join(output,'.nojekyll'),'');
  await writeFile(path.join(output,'404.html'),shell({title:'Page not found',description:'Find your way back to the mAI Skills documentation.',url:'/',body:`<div class="eyebrow">404 / PAGE NOT FOUND</div><h1>Let’s find your next step.</h1><p class="lede">This page may have moved. Search the documentation or return to the overview.</p><a class="button-primary" href="${href('/')}">Back to the field guide →</a>`}));
  const count = await checkOutput(output,base);
  console.log(`Built ${pages.length+1} pages; checked ${count} output files, local links, fragments, assets and privacy. Base: ${base}; source: ${sha}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) build().catch(error=>{console.error(error.message);process.exitCode=1;});
