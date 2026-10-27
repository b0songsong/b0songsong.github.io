(() => {
  'use strict';
  const root = document.documentElement;
  const rootPath = root.dataset.root || '';
  const data = Array.isArray(window.BLOG_SEARCH) ? window.BLOG_SEARCH : [];
  const dialog = document.querySelector('.search-dialog');
  const input = document.querySelector('#search-input');
  const results = document.querySelector('.search-results');
  let searchOpener = null;
  const icons = {
    sun: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/></svg>',
    moon: '<svg class="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 13A9 9 0 0 1 11 3a9 9 0 1 0 10 10Z"/></svg>'
  };

  function syncTheme() {
    const dark = root.dataset.theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach(button => {
      button.setAttribute('aria-label', dark ? '밝은 테마로 변경' : '어두운 테마로 변경');
      button.title = dark ? '밝은 테마로 변경' : '어두운 테마로 변경';
      button.innerHTML = icons[dark ? 'sun' : 'moon'];
    });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17181e' : '#f7f6f2');
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('bosongsong-theme', root.dataset.theme); } catch {}
    syncTheme();
  }));
  syncTheme();

  const normal = text => String(text).normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, ' ').trim();
  const indexed = data.map(post => ({post, all:normal([post.title,post.excerpt,post.category,...post.tags,post.text].join(' ')), title:normal(post.title), tags:normal(post.tags.join(' '))}));
  function search() {
    const query = normal(input.value);
    const terms = query.split(' ').filter(Boolean);
    const matches = indexed.filter(item => terms.every(term => item.all.includes(term))).map(item => ({...item,score:terms.reduce((score,term)=>score+(item.title.includes(term)?5:0)+(item.tags.includes(term)?3:0),0)})).sort((a,b)=>b.score-a.score).slice(0,30);
    results.replaceChildren();
    if (!matches.length) {
      const message = document.createElement('p');
      message.className = 'search-empty';
      message.textContent = '일치하는 기록이 없다. 다른 단어로 검색해 보자.';
      results.append(message);
      return;
    }
    const summary = document.createElement('p');
    summary.className = 'search-count search-hint';
    summary.textContent = terms.length ? `${matches.length}개의 기록을 찾았다.` : '최근 기록 · 검색어를 입력하면 본문까지 검색한다.';
    results.append(summary);
    for (const {post} of matches) {
      const link = document.createElement('a');
      link.className = 'search-result';
      link.href = rootPath + post.url;
      const meta = document.createElement('small');
      meta.textContent = `${post.category} · ${post.date.replaceAll('-','.')} ${post.example ? '· 예시 노트' : ''}`;
      const title = document.createElement('h3');
      title.textContent = post.title;
      const excerpt = document.createElement('p');
      excerpt.textContent = post.excerpt;
      link.append(meta,title,excerpt);
      results.append(link);
    }
  }
  const openSearch = opener => {
    if (dialog.open) { input.focus(); return; }
    const previous = opener || document.activeElement;
    closeMenu(false);
    searchOpener = previous?.closest('#sidebar') && mobile.matches ? menuButton : previous;
    if (!dialog.open) dialog.showModal();
    search();
    input.focus();
  };
  document.querySelectorAll('[data-search-open]').forEach(button => button.addEventListener('click', () => openSearch(button)));
  document.querySelector('[data-search-close]')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => { if (searchOpener?.isConnected) searchOpener.focus(); });
  dialog?.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) dialog.close();
  });
  input?.addEventListener('input', search);
  input?.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); results.querySelector('a')?.focus(); }
    if (event.key === 'Enter') results.querySelector('a')?.click();
  });
  results?.addEventListener('keydown', event => {
    const links = [...results.querySelectorAll('a')];
    const at = links.indexOf(document.activeElement);
    if (event.key==='ArrowDown') { event.preventDefault(); links[Math.min(at+1,links.length-1)]?.focus(); }
    if (event.key==='ArrowUp') { event.preventDefault(); if (at>0) links[at-1].focus(); else input.focus(); }
  });

  const menuButton = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('#sidebar');
  const backdrop = document.querySelector('.sidebar-backdrop');
  const mainShell = document.querySelector('.main-shell');
  const mobile = matchMedia('(max-width: 900px)');
  function closeMenu(restoreFocus = true) {
    const wasOpen = document.body.classList.contains('menu-open');
    document.body.classList.remove('menu-open');
    menuButton?.setAttribute('aria-expanded','false');
    menuButton?.setAttribute('aria-label','메뉴 열기');
    if (backdrop) backdrop.hidden = true;
    if (sidebar) sidebar.inert = mobile.matches;
    if (mainShell) mainShell.inert = false;
    if (wasOpen && restoreFocus) menuButton?.focus();
  }
  function openMenu() {
    document.body.classList.add('menu-open');
    menuButton?.setAttribute('aria-expanded','true');
    menuButton?.setAttribute('aria-label','메뉴 닫기');
    if (backdrop) backdrop.hidden = false;
    sidebar.inert = false;
    mainShell.inert = true;
    sidebar.querySelector('a')?.focus();
  }
  menuButton?.addEventListener('click', () => document.body.classList.contains('menu-open') ? closeMenu() : openMenu());
  backdrop?.addEventListener('click', () => closeMenu());
  sidebar?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { if(mobile.matches) closeMenu(false); }));
  mobile.addEventListener('change', () => closeMenu(false));
  closeMenu(false);
  document.addEventListener('keydown', event => {
    const editing = event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable);
    if ((event.key==='/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase()==='k')) {
      event.preventDefault();
      openSearch(document.activeElement);
    }
    if (event.key==='Escape' && document.body.classList.contains('menu-open')) closeMenu();
    if (event.key==='Tab' && document.body.classList.contains('menu-open')) {
      const focusable = [...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(node=>node.getClientRects().length);
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement===focusable[0]) { event.preventDefault();focusable.at(-1).focus(); }
      if (!event.shiftKey && document.activeElement===focusable.at(-1)) { event.preventDefault();focusable[0].focus(); }
    }
  });

  document.querySelectorAll('.article-body pre').forEach(pre => {
    const button = document.createElement('button');
    button.className = 'code-copy';
    button.type = 'button';
    button.textContent = '복사';
    button.setAttribute('aria-label','코드 복사');
    button.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || '';
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(code);
        else {
          const textarea = document.createElement('textarea');
          textarea.value = code;
          textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
          document.body.append(textarea);
          textarea.select();
          const copied = document.execCommand('copy');
          textarea.remove();
          if (!copied) throw new Error('Copy is not available.');
        }
        button.textContent = '복사됨';
      } catch { button.textContent = '직접 선택해 복사'; }
      setTimeout(()=>{button.textContent='복사';},2200);
    });
    pre.append(button);
  });

  const progress = document.querySelector('.reading-progress');
  const article = document.querySelector('.article-body');
  const topButton = document.querySelector('.back-to-top');
  let scrollFrame = false;
  function updateScroll() {
    scrollFrame = false;
    if (topButton) topButton.hidden = scrollY < 500;
    if (progress && article) {
      const start = article.getBoundingClientRect().top + scrollY;
      const end = start + article.offsetHeight - innerHeight;
      const ratio = Math.max(0,Math.min(1,(scrollY-start)/Math.max(1,end-start)));
      progress.style.width = `${ratio*100}%`;
    }
  }
  addEventListener('scroll',()=>{if(!scrollFrame){scrollFrame=true;requestAnimationFrame(updateScroll);}},{passive:true});
  addEventListener('resize', updateScroll);
  topButton?.addEventListener('click',()=>scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  updateScroll();
  const headings = [...document.querySelectorAll('.article-body h2[id],.article-body h3[id]')];
  if ('IntersectionObserver' in window && headings.length) {
    const observer = new IntersectionObserver(entries=>{
      const visible = entries.filter(entry=>entry.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      if (!visible.length) return;
      document.querySelectorAll('.article-toc a').forEach(link=>{
        const active = link.getAttribute('href')===`#${visible[0].target.id}`;
        link.classList.toggle('active',active);
        if(active) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
      });
    },{rootMargin:'-10% 0px -65% 0px'});
    headings.forEach(heading=>observer.observe(heading));
  }
})();
