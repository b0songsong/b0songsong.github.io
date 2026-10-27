import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Create an offline, single-file preview of the actual generated pages.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.resolve(process.argv[2] || path.join(root,'bosongsong-blog-preview.html'));
const docs = path.join(root,'docs');
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?walk(path.join(dir,item.name)):[path.join(dir,item.name)]);
const pages = {};
const favicon = 'data:image/svg+xml;base64,'+fs.readFileSync(path.join(docs,'assets/favicon.svg')).toString('base64');
for (const file of walk(docs).filter(file=>file.endsWith('.html'))) {
  pages[path.relative(docs,file).split(path.sep).join('/')] = fs.readFileSync(file,'utf8')
    .replace(/<link[^>]+href="[^"]*assets\/site\.css"[^>]*>/g,'')
    .replace(/<script[^>]+src="[^"]*assets\/(?:site|search-index)\.js"[^>]*><\/script>/g,'')
    .replace(/href="[^"]*assets\/favicon\.svg"/g,`href="${favicon}"`);
}
const bundle = {
  pages,
  css:fs.readFileSync(path.join(docs,'assets/site.css'),'utf8'),
  js:fs.readFileSync(path.join(docs,'assets/site.js'),'utf8'),
  search:fs.readFileSync(path.join(docs,'assets/search-index.js'),'utf8')
};
const payload = JSON.stringify(bundle).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>보송송의 보안 노트 — 미리보기</title><link rel="icon" href="${favicon}"><style>
*{box-sizing:border-box}html,body{height:100%;margin:0}body{font-family:system-ui,-apple-system,"Malgun Gothic",sans-serif;color:#25232b;background:#e7e5df}.preview-toolbar{height:54px;background:#fff;border-bottom:1px solid #dedbe4;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 22px}.preview-title{font-size:13px;font-weight:700;letter-spacing:.04em}.preview-title span{font-size:11px;font-weight:400;color:#777;margin-left:10px}.preview-controls{display:flex;gap:6px}.preview-controls button{border:1px solid #dedbe4;border-radius:7px;background:#fff;color:#58515f;padding:7px 13px;font:inherit;font-size:12px;cursor:pointer}.preview-controls button[aria-pressed=true]{background:#eee9ff;border-color:#c2b6e3;color:#604499}.preview-controls button:focus-visible{outline:3px solid #7459b3;outline-offset:3px}.preview-stage{height:calc(100% - 54px);display:flex;justify-content:center;align-items:stretch;padding:0}iframe{border:0;background:#f7f6f2;width:100%;height:100%;box-shadow:0 4px 30px #2221}.preview-stage[data-view=mobile]{padding:14px 0}.preview-stage[data-view=mobile] iframe{width:390px;max-width:100%;border-radius:16px;border:1px solid #d4d0dc}@media(max-width:600px){.preview-toolbar{padding:0 12px}.preview-title span{display:none}.preview-controls button{padding:7px 9px}.preview-stage[data-view=mobile]{padding:0}.preview-stage[data-view=mobile] iframe{border-radius:0;border:0}}
</style></head><body><header class="preview-toolbar"><div class="preview-title">BOSONGSONG <span>블로그 미리보기 · 메뉴와 글을 눌러 볼 수 있다</span></div><div class="preview-controls" aria-label="미리보기 화면 크기"><button data-view="desktop" aria-pressed="true">데스크톱</button><button data-view="mobile" aria-pressed="false">모바일</button></div></header><main class="preview-stage" data-view="desktop"><iframe id="site-frame" title="보송송의 보안 노트 미리보기"></iframe></main><script>
const bundle=${payload};
const frame=document.getElementById('site-frame');
const stage=document.querySelector('.preview-stage');
const closeScript='<'+'/script>';
const closeBody='<'+'/body>';
const closeHead='<'+'/head>';
function render(){
  const route=decodeURIComponent(location.hash.startsWith('#/')?location.hash.slice(2):'index.html');
  const parts=route.split('#');
  const page=bundle.pages[parts[0]]?parts[0]:'index.html';
  const anchor=parts[1]||'';
  const bridge='const previewPath='+JSON.stringify(page)+';document.addEventListener("click",function(event){const a=event.target.closest("a");if(!a)return;const href=a.getAttribute("href");if(!href)return;if(/^(https?:|mailto:|tel:|data:)/i.test(href)||href.startsWith("//")){a.target="_blank";a.rel="noopener noreferrer";return;}event.preventDefault();if(href[0]==="#"){const el=document.getElementById(decodeURIComponent(href.slice(1)));if(el){el.scrollIntoView();if(el.hasAttribute("tabindex"))el.focus({preventScroll:true});}return;}const u=new URL(href,"https://preview.invalid/"+previewPath);parent.postMessage({type:"bosongsong-preview-navigate",path:decodeURIComponent(u.pathname.slice(1)),hash:u.hash},"*");},true);'+(anchor?'requestAnimationFrame(function(){document.getElementById('+JSON.stringify(anchor)+')?.scrollIntoView();});':'');
  const scripts='<script>'+bundle.search+closeScript+'<script>'+bundle.js+closeScript+'<script>'+bridge+closeScript;
  frame.srcdoc=bundle.pages[page].replace(closeHead,'<style>'+bundle.css+'</style>'+closeHead).replace(closeBody,scripts+closeBody);
}
window.addEventListener('message',function(event){if(event.source!==frame.contentWindow||event.data?.type!=='bosongsong-preview-navigate'||!bundle.pages[event.data.path])return;const next='#/'+event.data.path+(event.data.hash||'');if(location.hash===next)render();else location.hash=next;});
window.addEventListener('hashchange',render);
document.querySelectorAll('.preview-controls button').forEach(function(button){button.addEventListener('click',function(){stage.dataset.view=button.dataset.view;document.querySelectorAll('.preview-controls button').forEach(function(other){other.setAttribute('aria-pressed',String(other===button));});});});
render();
</script></body></html>`;
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,html,'utf8');
console.log(`Created offline preview with ${Object.keys(pages).length} working pages: ${target}`);
