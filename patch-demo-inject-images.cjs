// 把 style-images-injector.html.part 注入到 demo.html（幂等：先清旧的 STYLE IMAGES INJECT 块）
const fs = require('fs');
const path = require('path');
const DIR = 'd:/2workspace/codex/juejin3';

const demoPath = path.join(DIR, 'demo.html');
const partPath = path.join(DIR, 'style-images-injector.html.part');
let demo = fs.readFileSync(demoPath, 'utf8');
const part = fs.readFileSync(partPath, 'utf8');

const cleanupRe = /\r?\n<!-- STYLE IMAGES INJECT BEGIN -->[\s\S]*?<!-- STYLE IMAGES INJECT END -->\r?\n/;
demo = demo.replace(cleanupRe, '\n');

// 找 核心脚本注释 marker
let marker = null;
const lines = demo.split(/\r?\n/);
for (const l of lines) if (l.includes('<!--') && l.includes('核心脚本')) { marker = l; break; }
if (!marker) { console.error('marker not found'); process.exit(1); }

const block = '\n<!-- STYLE IMAGES INJECT BEGIN -->\n' + part.trimEnd() + '\n<!-- STYLE IMAGES INJECT END -->\n\n' + marker;
const before = demo;
demo = demo.replace(marker, block);
if (demo === before) { console.error('Replace no-op'); process.exit(2); }

fs.writeFileSync(demoPath, demo, 'utf8');
console.log('patched demo.html ->', Math.round(fs.statSync(demoPath).size/1024), 'KB');
