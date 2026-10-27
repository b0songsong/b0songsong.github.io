import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root,'docs');
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
const files = walk(output).filter(file=>file.endsWith('.html'));
const errors = [];
let linkCount = 0;
for (const file of files) {
  const text = fs.readFileSync(file,'utf8');
  const ids = [...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  if (new Set(ids).size !== ids.length) errors.push(`${file}: duplicate element IDs`);
  if (!text.includes('<html lang="ko"')) errors.push(`${file}: missing Korean language declaration`);
  if ((text.match(/<h1(?:\s[^>]*)?>/g)||[]).length !== 1) errors.push(`${file}: exactly one h1 is expected`);
  for (const [,value] of text.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    if (!value || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    linkCount++;
    const [relative,anchor] = value.split('#');
    const target = path.resolve(path.dirname(file),relative || path.basename(file));
    if (!target.startsWith(output+path.sep) && target!==output) errors.push(`${file}: link escapes output folder: ${value}`);
    if (!fs.existsSync(target)) { errors.push(`${file}: missing target: ${value}`); continue; }
    if (anchor && target.endsWith('.html')) {
      const content = target===file ? text : fs.readFileSync(target,'utf8');
      if (!content.includes(`id="${decodeURIComponent(anchor)}"`)) errors.push(`${file}: missing anchor: ${value}`);
    }
  }
}
const names = JSON.parse(fs.readFileSync(path.join(root,'data/categories.json'),'utf8')).map(c=>c.name);
const home = fs.readFileSync(path.join(output,'index.html'),'utf8');
for (const name of names) if (!home.includes(name)) errors.push(`Homepage is missing required category ${name}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`PASS: ${files.length} HTML pages; ${linkCount} local links and anchors; all 6 required categories; no duplicate IDs.`);
