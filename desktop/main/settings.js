/**
 * 应用设置：userData/settings.json 持久化
 * 面板调整的引擎参数在 renderer 侧通过 IPC 回写，重启后生效。
 */
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  fetchIntervalMin: 5,       // 主进程轮询掘金接口间隔（分钟）
  hidden: false,             // 悬浮层是否被用户关闭（面板 ✕）
  autostart: false,          // 开机自启
  loginPrompted: false,      // 是否已弹过首次登录窗
  // —— 引擎参数（与 message-wall-core.js 的默认值保持一致）——
  characterCount: 15,
  characterScale: 1.3,
  defaultCharacterStyle: 'kaai',
  messageInterval: 1200,
  messageDuration: 7000,
  opacity: 1,
  performanceMode: 'auto',
};

const FILE = () => path.join(app.getPath('userData'), 'settings.json');

let cache = null;

function load() {
  if (cache) return cache;
  cache = Object.assign({}, DEFAULTS);
  try {
    const raw = JSON.parse(fs.readFileSync(FILE(), 'utf8'));
    if (raw && typeof raw === 'object') Object.assign(cache, raw);
  } catch (_) { /* 首次运行无文件 */ }
  return cache;
}

function all() {
  return Object.assign({}, load());
}

function get(key) {
  return load()[key];
}

function set(patch) {
  const data = load();
  Object.keys(patch || {}).forEach((k) => {
    if (k in DEFAULTS) data[k] = patch[k];
  });
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[settings] 写入失败:', e.message);
  }
  return all();
}

module.exports = { all, get, set };
