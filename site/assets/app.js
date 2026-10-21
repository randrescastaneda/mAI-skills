const dialog = document.querySelector('#search-dialog');
const searchOpen = document.querySelector('#search-open');
const input = document.querySelector('#search-input');
const results = document.querySelector('#search-results');
const status = document.querySelector('#search-status');
const menu = document.querySelector('#menu-toggle');
let index;
let loading;
let selected = -1;

function closeMenu() {
  document.body.classList.remove('menu-open');
  menu.setAttribute('aria-expanded', 'false');
  menu.setAttribute('aria-label', 'Open documentation menu');
}
menu.addEventListener('click', () => {
  const open = document.body.classList.toggle('menu-open');
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', `${open ? 'Close' : 'Open'} documentation menu`);
  if (open) document.querySelector('#sidebar a').focus();
});
document.addEventListener('click', event => {
  if (!event.target.closest('#sidebar, #menu-toggle')) closeMenu();
});
document.addEventListener('keydown', event => {
  const editing = event.target.closest('input, textarea, [contenteditable="true"]');
  if ((event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !editing)) {
    event.preventDefault(); openSearch();
  }
  if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {closeMenu();menu.focus();}
});
async function loadIndex() {
  if (index) return;
  if (!loading) loading = fetch(`${document.body.dataset.base}search-index.json`).then(response => {
    if (!response.ok) throw new Error('Search unavailable');
    return response.json();
  }).then(data => {index = data.map(page => ({...page, titleSearch: `${page.title} ${page.keywords ?? ''}`.toLowerCase(), textSearch: `${page.title} ${page.keywords ?? ''} ${page.text}`.toLowerCase()}));}).catch(() => {loading = null; throw new Error('Search unavailable');});
  await loading;
}
async function openSearch() {
  closeMenu();
  if (!dialog.open) dialog.showModal();
  input.focus();
  status.textContent = 'Loading the search index…';
  try {await loadIndex(); renderResults();} catch {status.textContent = 'Search could not load. Use the documentation menu or try again.';}
}
function renderResults() {
  if (!index) return;
  const query = input.value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  const hits = index.map(page => {
    const title = page.titleSearch;
    const text = page.textSearch;
    return {...page, score: terms.every(term => text.includes(term)) ? terms.reduce((n, term) => n + (title.includes(term) ? 10 : 1), 0) + (page.kind === 'Guide' ? 1 : 0) : -1};
  }).filter(page=>page.score >= 0).sort((a,b)=>b.score-a.score).slice(0,15);
  results.replaceChildren(); selected = -1;
  status.textContent = query ? (hits.length ? `${hits.length}${hits.length === 15 ? ' top' : ''} results` : 'No results. Try a skill name, error code, or workflow.') : 'Explore the documentation or start typing.';
  for (const page of hits) {
    const li = document.createElement('li');
    const a = document.createElement('a');a.href=page.url;
    const small = document.createElement('small');small.textContent=page.kind;
    const strong = document.createElement('strong');strong.textContent=page.title;
    const p = document.createElement('p');
    const position = Math.max(0,page.text.toLowerCase().indexOf(terms[0] ?? '')-40);
    p.textContent=`${position ? '…' : ''}${page.text.slice(position,position+155)}…`;
    a.append(small,strong,p);li.append(a);results.append(li);
  }
}
searchOpen.addEventListener('click',openSearch);
document.querySelector('#search-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>searchOpen.focus());
dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}});
input.addEventListener('input',renderResults);
dialog.addEventListener('keydown',event=>{
  const links=[...results.querySelectorAll('a')];
  if (event.key==='ArrowDown'||event.key==='ArrowUp') {
    event.preventDefault();if(!links.length)return;
    selected=selected<0 ? (event.key==='ArrowDown'?0:links.length-1) : (selected+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;
    links[selected].focus();
  } else if(event.key==='Enter'&&event.target===input&&links[0]) {event.preventDefault();links[0].click();}
});
for (const button of document.querySelectorAll('.copy-button')) {
  button.addEventListener('click',async()=>{
    const code=button.closest('.code-block').querySelector('code');
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.textContent='Copied';
      document.querySelector('#copy-status').textContent='Example copied to clipboard.';
      setTimeout(()=>{button.textContent='Copy';},1800);
    } catch {
      const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(code);selection.removeAllRanges();selection.addRange(range);
      document.querySelector('#copy-status').textContent='Clipboard unavailable. Example selected; use your system copy shortcut.';
    }
  });
}
