// 拷贝浏览器版复用资源到 desktop/ 下（lib + assets + 图标），供 jw:// 协议与打包使用。
// 源文件带 mtime 比对，未变更时跳过，dev 启动不产生额外开销。
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..'); // 仓库根目录
const DEST = path.join(__dirname, '..');       // desktop/

const LIB_FILES = ['character-renderer.js', 'message-wall-core.js', 'juejin-integration.js'];
const ASSET_DIRS = [
  'assets/my-characters',
  'assets/styles/covers',
  'assets/pets/cyber-ronin/frames-webp',
];
const ICON_SRC = path.join(ROOT, 'assets', 'icons', 'icon256.png');
const ICON_DEST = path.join(DEST, 'build', 'icon.png');

function copyIfNewer(src, dest) {
  const s = fs.statSync(src);
  let d = null;
  try { d = fs.statSync(dest); } catch (_) {}
  if (d && d.size === s.size && d.mtimeMs >= s.mtimeMs) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

let copied = 0;

for (const name of LIB_FILES) {
  if (copyIfNewer(path.join(ROOT, name), path.join(DEST, 'lib', name))) copied++;
}

for (const dir of ASSET_DIRS) {
  const from = path.join(ROOT, dir);
  if (!fs.existsSync(from)) continue;
  const entries = fs.readdirSync(from, { recursive: true });
  for (const entry of entries) {
    const src = path.join(from, entry);
    if (!fs.statSync(src).isFile()) continue;
    const rel = path.relative(ROOT, src);
    if (copyIfNewer(src, path.join(DEST, rel))) copied++;
  }
}

fs.mkdirSync(path.dirname(ICON_DEST), { recursive: true });
if (copyIfNewer(ICON_SRC, ICON_DEST)) copied++;

console.log(`[copy-assets] 完成，更新 ${copied} 个文件`);
