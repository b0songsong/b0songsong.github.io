import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from '../vendor/marked.esm.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'docs');
const site = JSON.parse(fs.readFileSync(path.join(root, 'data/site.json'), 'utf8'));
const categories = JSON.parse(fs.readFileSync(path.join(root, 'data/categories.json'), 'utf8'));
const expected = ['development','ctf-wargame','bug-bounty','blog-docs','papers-conferences','contests-certifications'];
if (categories.length !== 6 || categories.some((c,i) => c.slug !== expected[i])) {
  throw new Error('data/categories.json must contain the six required categories in order.');
}
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plain = html => String(html).replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39);/g, c => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[c])).replace(/\s+/g, ' ').trim();
const jsonSafe = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
const humanDate = date => date.replaceAll('-', '.');
const catFor = slug => categories.find(category => category.slug === slug);
const localLink = (from, to) => path.posix.relative(path.posix.dirname(from), to) || path.posix.basename(to);
const httpUrl = value => !value || /^https?:\/\//i.test(value);
if (!httpUrl(site.siteUrl) || !httpUrl(site.githubUrl)) throw new Error('siteUrl and githubUrl must be empty or start with https:// or http://.');
const baseUrl = site.siteUrl ? site.siteUrl.replace(/\/+$/, '') + '/' : '';
const absoluteUrl = file => baseUrl ? new URL(file, baseUrl).href : '';

function icon(name, cls = '') {
  const paths = {
    code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-13-2 16"/>',
    flag: '<path d="M5 21V4m0 0c4-4 8 4 14 0v10c-6 4-10-4-14 0"/>',
    bug: '<rect x="7" y="7" width="10" height="13" rx="5"/><path d="m9 7-2-4m8 4 2-4M3 10h4m10 0h4M3 15h4m10 0h4M5 21l3-3m8 0 3 3M12 8v11"/>',
    book: '<path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1m0-15c3-2 6-2 10-1v15c-4-1-7-1-10 1V5"/>',
    paper: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 11h8m-8 4h8m-8 4h5"/>',
    award: '<circle cx="12" cy="8" r="5"/><path d="m8 12-2 10 6-3 6 3-2-10m-6-4 1 1 3-3"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
    archive: '<rect x="3" y="3" width="18" height="5" rx="1"/><path d="M5 8v13h14V8m-10 4h6"/>',
    user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    diagonal: '<path d="M6 18 18 6M6 6h12v12"/>',
    moon: '<path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-4a3.5 3.5 0 0 0-1-3c3-.4 6-1.5 6-6a5 5 0 0 0-1.4-3.5 4.5 4.5 0 0 0-.1-3.5S17 1.6 15 3a13 13 0 0 0-6 0C7 1.6 5.5 2 5.5 2a4.5 4.5 0 0 0-.1 3.5A5 5 0 0 0 4 9c0 4.5 3 5.6 6 6a3.5 3.5 0 0 0-1 3v4"/>',
    up: '<path d="m6 12 6-6 6 6M12 6v15"/>'
  };
  return `<svg class="icon ${escape(cls)}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
}

function readPost(file) {
  const input = fs.readFileSync(path.join(root, 'content/posts', file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = input.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if (!match) throw new Error(`${file}: metadata must be enclosed by --- lines.`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const pair = line.match(/^([a-zA-Z][a-zA-Z0-9_]*):\s*(.*?)\s*$/);
    if (!pair) throw new Error(`${file}: invalid metadata line: ${line}`);
    const [, key, value] = pair;
    if (Object.hasOwn(meta, key)) throw new Error(`${file}: duplicate metadata field ${key}`);
    try { meta[key] = /^[\[\{"\d]|^(true|false|null)$/.test(value) ? JSON.parse(value) : value; }
    catch { if (key === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) meta[key] = value; else throw new Error(`${file}: quote text values and use JSON arrays for tags (${key}).`); }
  }
  if (meta.draft === true) return null;
  for (const key of ['title','date','category','excerpt']) if (typeof meta[key] !== 'string' || !meta[key].trim()) throw new Error(`${file}: ${key} is required.`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || Number.isNaN(Date.parse(meta.date)) || new Date(meta.date).toISOString().slice(0,10) !== meta.date) throw new Error(`${file}: use a valid YYYY-MM-DD date.`);
  if (!catFor(meta.category)) throw new Error(`${file}: unknown category ${meta.category}.`);
  if (!Array.isArray(meta.tags) || !meta.tags.every(tag => typeof tag === 'string')) throw new Error(`${file}: tags must be an array of strings.`);
  for (const key of ['example','featured']) if (meta[key] !== undefined && typeof meta[key] !== 'boolean') throw new Error(`${file}: ${key} must be true or false.`);
  const slug = file.slice(0,-3);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${file}: use lowercase English words separated by hyphens for filenames.`);
  const markdown = new Marked({ gfm: true, breaks: false, renderer: { html({text}) { return escape(text); } } });
  let body = markdown.parse(match[2]);
  const toc = [];
  let headingIndex = 0;
  body = body.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_, level, content) => {
    const depth = Number(level) === 1 ? 2 : Number(level);
    const id = `section-${++headingIndex}`;
    if (depth <= 3) toc.push({id, title: plain(content), depth});
    return `<h${depth} id="${id}">${content}</h${depth}>`;
  });
  return {...meta, slug, url:`posts/${slug}.html`, body, toc, text:plain(body), reading:Math.max(1, Math.ceil(plain(body).length / 650))};
}

const posts = fs.readdirSync(path.join(root, 'content/posts')).filter(file => file.endsWith('.md')).map(readPost).filter(Boolean).sort((a,b) => b.date.localeCompare(a.date) || Number(Boolean(b.featured))-Number(Boolean(a.featured)) || a.slug.localeCompare(b.slug));
const countFor = slug => posts.filter(p => p.category === slug).length;
const badges = tags => `<div class="tag-list">${tags.map(tag => `<span class="tag">${escape(tag)}</span>`).join('')}</div>`;

function postRow(post, file) {
  const category = catFor(post.category);
  return `<article class="post-row">
    <div class="post-meta"><a class="category-pill" href="${localLink(file, `categories/${category.slug}.html`)}">${escape(category.name)}</a><time datetime="${post.date}">${humanDate(post.date)}</time>${post.example ? '<span class="example-label">예시 노트</span>' : ''}</div>
    <h3><a href="${localLink(file, post.url)}">${escape(post.title)}</a></h3>
    <p class="post-excerpt">${escape(post.excerpt)}</p>
    <div class="post-bottom">${badges(post.tags)}<span class="reading-time">약 ${post.reading}분 읽기</span></div>
    <a class="post-arrow" href="${localLink(file, post.url)}" aria-label="${escape(post.title)} 읽기">${icon('arrow')}</a>
  </article>`;
}

function layout(file, {title, description, active='', breadcrumb='기록의 시작', content, article=false}) {
  const rootPath = localLink(file, 'index.html').replace(/index\.html$/, '');
  const href = to => localLink(file, to);
  const nav = (name, target, navIcon, key, count='') => `<a class="nav-link${active===key?' active':''}" href="${href(target)}"${active===key?' aria-current="page"':''}><span class="nav-icon">${icon(navIcon)}</span><span class="nav-label">${escape(name)}</span>${count!==''?`<span class="nav-count">${count}</span>`:''}</a>`;
  const canonical = absoluteUrl(file);
  return `<!doctype html>
<html lang="ko" data-theme="light" data-root="${escape(rootPath)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escape(description || site.description)}">
  <meta name="theme-color" content="#f7f6f2">
  <title>${escape(title ? `${title} — ${site.title}` : site.title)}</title>
  <meta property="og:title" content="${escape(title || site.title)}">
  <meta property="og:description" content="${escape(description || site.description)}">
  <meta property="og:type" content="${article?'article':'website'}">
  <meta property="og:locale" content="ko_KR">
  ${canonical?`<link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}">`:''}
  <link rel="icon" type="image/svg+xml" href="${href('assets/favicon.svg')}">
  <link rel="stylesheet" href="${href('assets/site.css')}">
  ${baseUrl?`<link rel="alternate" type="application/atom+xml" title="${escape(site.title)}" href="${href('feed.xml')}">`:''}
  <script>try{var t=localStorage.getItem('bosongsong-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;}catch(e){}</script>
  <script src="${href('assets/search-index.js')}" defer></script>
  <script src="${href('assets/site.js')}" defer></script>
</head>
<body>
<a class="skip-link" href="#main-content">본문으로 바로 가기</a>
${article?'<div class="reading-progress" aria-hidden="true"></div>':''}
<div class="site-shell">
  <aside class="sidebar" id="sidebar" aria-label="블로그 메뉴">
    <a class="brand" href="${href('index.html')}" aria-label="${escape(site.title)} 홈"><div class="brand-copy"><strong>${escape(site.shortTitle)}</strong><small>SECURITY NOTES</small></div></a>
    <div class="profile-mini"><span class="avatar-mark" aria-hidden="true">${icon('code')}</span><strong>${escape(site.author)}의 보안 노트</strong><p>${escape(site.tagline)}</p></div>
    <nav class="side-nav" aria-label="주 메뉴">
      ${nav('홈','index.html','home','home')}
      ${nav('전체 기록','archive.html','archive','archive',posts.length)}
      <h2 class="nav-section-label">EXPLORE / 카테고리</h2>
      ${categories.map(c => nav(c.name,`categories/${c.slug}.html`,c.icon,c.slug,countFor(c.slug))).join('')}
      <h2 class="nav-section-label">ABOUT / 이 공간</h2>
      ${nav('소개','about.html','user','about')}
    </nav>
    <div class="sidebar-bottom"><p class="availability"><span aria-hidden="true"></span>작은 기록, 꾸준한 탐구</p><div class="sidebar-tools">${site.githubUrl?`<a class="icon-button" href="${escape(site.githubUrl)}" aria-label="GitHub 프로필">${icon('github')}</a>`:''}<button class="icon-button" data-search-open aria-label="글 검색">${icon('search')}</button><button class="icon-button theme-toggle" data-theme-toggle aria-label="어두운 테마로 변경">${icon('moon')}</button></div></div>
  </aside>
  <button class="sidebar-backdrop" aria-label="메뉴 닫기" tabindex="-1" hidden></button>
  <div class="main-shell">
    <header class="topbar"><button class="menu-toggle icon-button" aria-label="메뉴 열기" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><div class="breadcrumb"><span>${escape(site.author)}의 노트</span><span aria-hidden="true">/</span><strong>${escape(breadcrumb)}</strong></div><div class="topbar-actions"><button class="search-trigger" data-search-open aria-label="글 검색">${icon('search')}<span>기록 검색</span><kbd>/</kbd></button><button class="theme-toggle icon-button" data-theme-toggle aria-label="어두운 테마로 변경">${icon('moon')}</button></div></header>
    <main id="main-content" class="page-content" tabindex="-1">${content}</main>
    <footer class="site-footer"><p>© ${new Date().getUTCFullYear()} ${escape(site.author)}. 배움의 과정을 차곡차곡.</p><div class="footer-links"><a href="${href('archive.html')}">전체 기록</a><a href="${href('about.html')}">소개</a>${baseUrl?`<a href="${href('feed.xml')}">RSS</a>`:''}<span>Made for curious minds.</span></div></footer>
  </div>
</div>
<dialog class="search-dialog" aria-label="블로그 글 검색"><div class="search-head">${icon('search')}<label for="search-input" class="sr-only">검색어</label><input id="search-input" type="search" autocomplete="off" placeholder="제목, 태그, 궁금한 내용을 검색한다" aria-describedby="search-help"><button class="icon-button" data-search-close aria-label="검색 닫기">${icon('close')}</button></div><p class="search-hint" id="search-help">제목 · 카테고리 · 태그 · 본문을 검색한다. <kbd>Esc</kbd> 닫기</p><div class="search-results" aria-live="polite" aria-atomic="true"></div></dialog>
<button class="back-to-top icon-button" aria-label="맨 위로 이동" hidden>${icon('up')}</button>
</body></html>`;
}

function write(file, html) {
  const target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), {recursive:true});
  fs.writeFileSync(target, html, 'utf8');
}

// Only the generated docs directory is replaced. Source files are never removed.
fs.mkdirSync(output, {recursive:true});
for (const entry of fs.readdirSync(output)) fs.rmSync(path.join(output,entry), {recursive:true,force:true});
fs.cpSync(path.join(root, 'assets'), path.join(output, 'assets'), {recursive:true});
write('.nojekyll', '');
write('assets/search-index.js', `window.BLOG_SEARCH=${jsonSafe(posts.map(p => ({title:p.title,excerpt:p.excerpt,category:catFor(p.category).name,tags:p.tags,date:p.date,text:p.text,url:p.url,example:Boolean(p.example)})))};\n`);

const homeFile = 'index.html';
const categoryTiles = categories.map((c,i) => `<a class="category-tile" href="categories/${c.slug}.html"><span class="category-number">0${i+1}</span><span class="category-icon">${icon(c.icon)}</span><h3>${escape(c.name)}</h3><p>${escape(c.description)}</p><span class="category-meta">${countFor(c.slug)}개의 기록 ${icon('diagonal')}</span></a>`).join('');
write(homeFile, layout(homeFile, {active:'home', content:`
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy"><p class="eyebrow">A NOTEBOOK FOR CURIOUS MINDS</p><h1 id="hero-title" class="hero-title">${escape(site.heroHeading[0])}<br><em>${escape(site.heroHeading[1])}</em></h1><p class="hero-description">${escape(site.intro)}</p><div class="hero-actions"><a class="button primary" href="#notes">최근 기록 읽기 ${icon('arrow')}</a><a class="button secondary" href="about.html">이 공간에 대하여</a></div></div>
    <div class="hero-bottom"><span class="mono">LEARN / BUILD / UNDERSTAND</span><span>작은 질문에서 시작되는 깊은 이해</span></div>
  </section>
  <section class="focus-strip" aria-label="관심 분야"><span>지금 탐구하는 것</span><div class="focus-tags">${site.interests.map(x=>`<span>${escape(x)}</span>`).join('')}</div></section>
  <section class="section-block" aria-labelledby="categories-heading"><div class="section-heading"><div><p class="eyebrow">SIX WAYS TO EXPLORE</p><h2 id="categories-heading">궁금한 것들을 여섯 갈래로</h2></div><span class="count-label">06 CATEGORIES</span></div><div class="category-grid">${categoryTiles}</div></section>
  <section class="section-block" id="notes" aria-labelledby="notes-heading"><div class="section-heading"><div><p class="eyebrow">RECENT NOTES</p><h2 id="notes-heading">차곡차곡 쌓이는 기록</h2></div><a class="text-link" href="archive.html">전체 ${posts.length}개 보기 ${icon('arrow')}</a></div><div class="notes-layout"><div class="post-list">${posts.slice(0,6).map(p=>postRow(p,homeFile)).join('') || '<div class="empty-state"><h3>첫 기록을 기다리는 중이다.</h3><p>곧 새로운 학습 노트를 남길 예정이다.</p></div>'}</div><aside class="side-note"><span class="note-kicker">MY NOTE-TAKING RULE</span><h3>결과보다,<br>과정을 남기는 곳.</h3><p>무엇을 알게 되었는지,<br>어디에서 막혔는지,<br>다음에는 무엇을 확인할지.</p><p>작은 기록들이 모여<br>나만의 지도가 된다.</p><a class="text-link" href="about.html">기록하는 사람 ${icon('diagonal')}</a></aside></div></section>
  <section class="about-preview"><div><p class="eyebrow">HELLO, I'M ${escape(site.shortTitle)}</p><h2>${escape(site.tagline)}</h2><p>개발과 보안 사이를 오가며, 코드 너머의 동작 원리를 탐구한다.</p></div><a class="button secondary" href="about.html">소개 읽기 ${icon('arrow')}</a></section>`}));

function categoryFilter(file, selected='') {
  return `<nav class="category-filter" aria-label="카테고리 선택"><a class="filter-chip${!selected?' active':''}" href="${localLink(file,'archive.html')}"${!selected?' aria-current="page"':''}>전체</a>${categories.map(c=>`<a class="filter-chip${selected===c.slug?' active':''}" href="${localLink(file,`categories/${c.slug}.html`)}"${selected===c.slug?' aria-current="page"':''}>${escape(c.name)}</a>`).join('')}</nav>`;
}

write('archive.html', layout('archive.html', {title:'전체 기록',active:'archive',breadcrumb:'전체 기록',content:`<header class="page-heading"><p class="eyebrow">THE NOTEBOOK / ARCHIVE</p><h1>전체 기록</h1><p>질문을 남기고, 확인하고, 다시 읽는다. ${posts.length}개의 노트를 한곳에 모았다.</p></header>${categoryFilter('archive.html')}<section class="post-list" aria-label="전체 글 목록">${posts.map(p=>postRow(p,'archive.html')).join('') || '<div class="empty-state"><h2>첫 기록을 기다리는 중이다.</h2></div>'}</section>`}));

for (const category of categories) {
  const file = `categories/${category.slug}.html`;
  const selected = posts.filter(p=>p.category===category.slug);
  write(file, layout(file, {title:category.name,description:category.description,active:category.slug,breadcrumb:category.name,content:`<header class="page-heading"><p class="eyebrow">${escape(category.english)}</p><h1>${escape(category.name)}</h1><p>${escape(category.description)}</p></header><div class="category-intro">${badges(category.topics)}<span class="count-label">${selected.length}개의 기록</span></div>${categoryFilter(file,category.slug)}<section class="post-list" aria-label="${escape(category.name)} 글 목록">${selected.map(p=>postRow(p,file)).join('') || '<div class="empty-state"><h2>첫 기록을 기다리는 중이다.</h2><p>새롭게 배우고 확인한 내용을 이곳에 차근차근 남길 예정이다.</p></div>'}</section>`}));
}

write('about.html', layout('about.html', {title:'소개',active:'about',breadcrumb:'기록하는 사람',content:`<header class="about-hero"><div><p class="eyebrow">THE PERSON BEHIND THE NOTES</p><h1>${escape(site.author)}, 기록하는 사람.</h1><p>${escape(site.tagline)}</p></div></header><div class="about-grid"><section class="about-section"><h2>코드에서 시작된 궁금증</h2>${site.about.map(p=>`<p>${escape(p)}</p>`).join('')}<div class="profile-links">${site.githubUrl?`<a class="button secondary" href="${escape(site.githubUrl)}">${icon('github')} GitHub에서 만나기 ${icon('diagonal')}</a>`:''}<a class="text-link" href="archive.html">학습 기록 둘러보기 ${icon('arrow')}</a></div></section><section class="about-section"><p class="eyebrow">CURRENT INTERESTS</p><h2>관심을 두고 있는 분야</h2><div class="interest-list">${site.interests.map(s=>`<span>${escape(s)}</span>`).join('')}</div><p>시스템의 기본기를 익히고, 그 이해를 임베디드와 펌웨어 분석으로 넓혀 가는 것이 학습의 방향이다.</p></section></div><section class="about-section"><p class="eyebrow">HOW I KEEP NOTES</p><h2>이 공간에서 지키고 싶은 세 가지</h2><ol class="principle-list"><li><strong>01. 동작의 이유를 이해한다.</strong><p>정답과 결과에 앞서, 어떤 구조와 조건에서 동작하는지 살핀다.</p></li><li><strong>02. 관찰과 추측을 구분한다.</strong><p>직접 확인한 사실, 자료에서 읽은 내용, 검증이 필요한 가설을 나누어 적는다.</p></li><li><strong>03. 다시 따라갈 수 있게 남긴다.</strong><p>환경과 과정, 참고 자료를 함께 정리해 미래의 나에게 도움이 되는 글을 쓴다.</p></li></ol></section><section class="about-preview"><div><p class="eyebrow">SIX SUBJECTS, ONE NOTEBOOK</p><h2>관심은 넓게, 기록은 차분하게.</h2><p>개발부터 논문과 도전의 기록까지, 여섯 가지 주제로 배움을 이어 간다.</p></div><a class="button primary" href="archive.html">노트 읽기 ${icon('arrow')}</a></section>`}));

for (const post of posts) {
  const file = post.url;
  const category = catFor(post.category);
  const related = posts.filter(p=>p.slug!==post.slug).sort((a,b)=>Number(b.category===post.category)-Number(a.category===post.category)).slice(0,2);
  write(file, layout(file, {title:post.title,description:post.excerpt,active:post.category,breadcrumb:category.name,article:true,content:`<div class="article-layout"><article class="article"><header class="article-header"><nav class="article-breadcrumb" aria-label="글 위치"><a href="${localLink(file,'archive.html')}">전체 기록</a><span aria-hidden="true">/</span><a href="${localLink(file,`categories/${category.slug}.html`)}">${escape(category.name)}</a></nav><p class="eyebrow">${escape(category.english)}</p><h1>${escape(post.title)}</h1><p class="article-summary">${escape(post.excerpt)}</p><div class="article-meta"><span>${escape(site.author)}</span><time datetime="${post.date}">${humanDate(post.date)}</time><span>약 ${post.reading}분 읽기</span>${post.example?'<span class="example-label">예시 노트</span>':''}</div>${badges(post.tags)}</header>${post.example?'<aside class="example-notice"><strong>블로그 구성을 위한 예시 노트이다.</strong> 실제 문제 풀이, 취약점 제보, 수상 또는 자격 취득 실적을 의미하지 않는다.</aside>':''}<div class="article-body">${post.body}</div><footer class="article-footer"><p>기록은 다음 질문의 출발점이다.</p><a class="text-link" href="${localLink(file,`categories/${category.slug}.html`)}">${escape(category.name)} 목록으로 ${icon('arrow')}</a></footer>${related.length?`<section class="related-posts"><div class="section-heading"><h2>함께 읽을 노트</h2></div>${related.map(p=>postRow(p,file)).join('')}</section>`:''}</article><aside class="article-toc" aria-label="이 글의 목차"><strong>ON THIS PAGE</strong><ol>${post.toc.map(t=>`<li class="toc-level-${t.depth}"><a href="#${t.id}">${escape(t.title)}</a></li>`).join('')}</ol></aside></div>`}));
}

if (baseUrl) {
  const pages = ['index.html','about.html','archive.html',...categories.map(c=>`categories/${c.slug}.html`),...posts.map(p=>p.url)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(file=>`<url><loc>${escape(absoluteUrl(file))}</loc></url>`).join('')}</urlset>`);
  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${absoluteUrl('sitemap.xml')}\n`);
  const updated = (posts[0]?.date || new Date().toISOString().slice(0,10)) + 'T00:00:00+09:00';
  write('feed.xml', `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>${escape(site.title)}</title><id>${escape(baseUrl)}</id><link href="${escape(baseUrl)}"/><link href="${escape(absoluteUrl('feed.xml'))}" rel="self"/><updated>${updated}</updated><author><name>${escape(site.author)}</name></author>${posts.slice(0,20).map(p=>`<entry><title>${escape(p.title)}</title><id>${escape(absoluteUrl(p.url))}</id><link href="${escape(absoluteUrl(p.url))}"/><updated>${p.date}T00:00:00+09:00</updated><summary>${escape(p.excerpt)}</summary></entry>`).join('')}</feed>`);
}

console.log(`Built ${9+posts.length} HTML pages, ${posts.length} posts, ${categories.length} categories → docs/`);
console.log(baseUrl ? `Canonical URL / sitemap / Atom feed enabled for ${baseUrl}` : 'siteUrl is empty: canonical links, sitemap, and Atom feed are omitted until you set the actual site URL.');
