/* ======================================================================
   Logica del sito. Non serve modificarla per aggiungere post:
   1) crea un file  posts/<id>.md  con il contenuto in Markdown
   2) aggiungi una riga in  posts/index.json
   ====================================================================== */

marked.setOptions({ breaks: false });

let posts = [];
const cache = new Map();

const MATH_DELIMS = [
  {left: '$$', right: '$$', display: true},
  {left: '$', right: '$', display: false},
  {left: '\\(', right: '\\)', display: false},
  {left: '\\[', right: '\\]', display: true}
];

/* Protegge le formule dal parser Markdown (altrimenti \( \) e _ vengono alterati) */
function parseMarkdown(src){
  const maths = [];
  const re = /\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$[^$\n]+?\$/g;
  const safe = src.replace(re, m => {
    maths.push(m);
    return `MATHTOKEN${maths.length - 1}ENDTOKEN`;
  });
  let html = marked.parse(safe);
  html = html.replace(/MATHTOKEN(\d+)ENDTOKEN/g, (_, i) =>
    maths[+i].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  );
  return html;
}

async function loadPostContent(post){
  if(cache.has(post.id)) return cache.get(post.id);
  const res = await fetch(`posts/${post.id}.md`);
  if(!res.ok) throw new Error(`posts/${post.id}.md non trovato (${res.status})`);
  const text = await res.text();
  cache.set(post.id, text);
  return text;
}

function groupByCategory(items){
  const map = new Map();
  items.forEach(p => {
    if(!map.has(p.category)) map.set(p.category, []);
    map.get(p.category).push(p);
  });
  return map;
}

function buildSidebar(){
  const wrap = document.getElementById('tocWrap');
  wrap.innerHTML = '';
  const groups = groupByCategory(posts);
  groups.forEach((items, cat) => {
    const g = document.createElement('div');
    g.className = 'toc-group';
    g.innerHTML = `<p class="toc-group-title">${cat}</p>`;
    const ul = document.createElement('ul');
    ul.className = 'toc-list';
    items.forEach(p => {
      const li = document.createElement('li');
      li.className = 'toc-item';
      li.innerHTML = `<a class="toc-link" href="#${p.id}" data-id="${p.id}">
        ${p.chapterNumber ? `<span class="toc-num">${String(p.chapterNumber).padStart(2,'0')}</span>` : '<span class="toc-num">—</span>'}
        <span>${p.title}</span>
      </a>`;
      ul.appendChild(li);
    });
    g.appendChild(ul);
    wrap.appendChild(g);
  });
}

function formatDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function renderIndex(){
  const el = document.getElementById('content');
  const rows = posts.map((p, i) => `
    <li class="index-row" data-id="${p.id}">
      <span class="index-num">${p.chapterNumber ? String(p.chapterNumber).padStart(2,'0') : String(i+1).padStart(2,'0')}</span>
      <div class="index-meta">
        <p class="index-title">${p.title}</p>
        <p class="index-cat">${p.category} · ${formatDate(p.date)}</p>
      </div>
    </li>`).join('');

  el.innerHTML = `
    <svg class="hero-weave" viewBox="0 0 420 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <pattern id="weave2" width="18" height="18" patternUnits="userSpaceOnUse">
          <rect width="9" height="9" fill="#1C1E1B" opacity="0.85"/>
          <rect x="9" y="9" width="9" height="9" fill="#1C1E1B" opacity="0.85"/>
        </pattern>
      </defs>
      <rect width="420" height="90" fill="url(#weave2)"/>
      <line x1="0" y1="45" x2="420" y2="45" stroke="#A85C34" stroke-width="1.5" opacity="0.7"/>
    </svg>
    <h1 class="hero-title">Quaderno di Ingegneria Meccanica</h1>
    <p class="hero-lede">Concetti, capitoli di tesi e appunti di corso, raccolti in un unico indice consultabile.</p>
    <ul class="index-list">${rows}</ul>
  `;
  el.querySelectorAll('.index-row').forEach(row => {
    row.addEventListener('click', () => { location.hash = row.dataset.id; });
  });
  document.title = 'Quaderno di Ingegneria Meccanica';
}

async function renderPost(post){
  const el = document.getElementById('content');
  el.innerHTML = `
    <a class="back-link" href="#">← Indice</a>
    <p class="article-cat">${post.category}</p>
    <h1 class="article-title">${post.title}</h1>
    <p class="article-date">${formatDate(post.date)}</p>
    <div class="article-body">Caricamento…</div>
  `;
  document.title = post.title + ' — Quaderno di Meccanica';
  window.scrollTo(0,0);

  const body = el.querySelector('.article-body');
  try{
    const md = await loadPostContent(post);
    body.innerHTML = parseMarkdown(md);
    renderMathInElement(body, { delimiters: MATH_DELIMS });
  }catch(err){
    body.innerHTML = `<p><strong>Impossibile caricare il capitolo.</strong></p>
      <p>${err.message}</p>
      <p>Se stai aprendo il file con doppio clic, usa un server locale
      (es. <code>python -m http.server</code>) oppure pubblica il sito online.</p>`;
  }
}

function route(){
  const id = location.hash.replace('#','');
  document.querySelectorAll('.toc-link').forEach(a => a.classList.toggle('active', a.dataset.id === id));
  const post = posts.find(p => p.id === id);
  if(post) renderPost(post); else renderIndex();
}

async function init(){
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('tocWrap').classList.toggle('collapsed');
  });
  try{
    const res = await fetch('posts/index.json');
    if(!res.ok) throw new Error(`posts/index.json non trovato (${res.status})`);
    posts = await res.json();
  }catch(err){
    document.getElementById('content').innerHTML =
      `<h1 class="hero-title">Errore di caricamento</h1>
       <p class="hero-lede">${err.message}<br>Apri il sito tramite un server (es. <code>python -m http.server</code>), non con doppio clic sul file.</p>`;
    return;
  }
  buildSidebar();
  window.addEventListener('hashchange', route);
  route();
}

init();
