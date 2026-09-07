// build-all-in-one.cjs — Node 构建脚本
//   赛博武士 Ronin 透明动画帧 -> RONIN_ANIM_FRAMES
//   南风知意雪碧图 -> KAAI_SHEET_SRC
//   输出：
//     1. 油猴脚本（juejin-message-wall-all-in-one.user.js）— 图片/动画帧以内嵌 base64 打包
//     2. Chrome 扩展（chrome-extension/）— 图片/动画帧分离为 resources/ 独立文件，
//        content.js 仅写相对路径，运行时经 chrome.runtime.getURL + fetch→blob 加载
const fs = require('fs');
const path = require('path');

const DIR = process.env.JMW_DIR || 'd:/2workspace/codex/juejin3';
const VERSION = '2.13.1';
const OUT_NAME = 'juejin-message-wall-all-in-one.user.js';
const EXT_DIR = path.join(DIR, 'chrome-extension');
const RES_DIR = path.join(EXT_DIR, 'resources');

const toB64 = (p) => {
  const buf = fs.readFileSync(p);
  return 'data:image/jpeg;base64,' + buf.toString('base64');
};
const toWebpB64 = (p) => {
  const buf = fs.readFileSync(p);
  return 'data:image/webp;base64,' + buf.toString('base64');
};
const sq = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";

// 把源文件复制到 chrome-extension/resources/<relPath>，返回 JS 中写入的相对路径
const writeRes = (relPath, absSource) => {
  const dest = path.join(RES_DIR, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(absSource, dest);
  return 'resources/' + relPath;
};

// 1. 风格级总览图（当前无）
const overviewList = [
];
const styleData = {};      // key -> base64
const styleFileByKey = {}; // key -> { file, abs }
for (const [file, key] of overviewList) {
  const abs = path.join(DIR, 'styles', file);
  if (!fs.existsSync(abs)) { console.warn('missing', abs); continue; }
  styleData[key] = toB64(abs);
  styleFileByKey[key] = { file, abs };
  console.log('  overview', key.padEnd(11), '->', Math.round(styleData[key].length/1024), 'KB');
}

// 2e. 南风知意雪碧图（kaai 风格：只切前 4 行=60 款人物，跳过第 5 行动物；运行时按 4×15 切格预裁）
const KAAI_SHEET_PATH = path.join(DIR, 'my-characters', 'my-characters-01.png');
if (!fs.existsSync(KAAI_SHEET_PATH)) throw new Error('missing kaai sheet: ' + KAAI_SHEET_PATH);
// 2f. 谎语之夜雪碧图（wolfkill 风格：2×10=20 款狼人杀人物，跳过宠物行）
const WOLFKILL_SHEET_PATH = path.join(DIR, 'my-characters', 'wolf-kill-sheet.png');
if (!fs.existsSync(WOLFKILL_SHEET_PATH)) throw new Error('missing wolfkill sheet: ' + WOLFKILL_SHEET_PATH);
// 2g. 兽杀奇谭雪碧图（beastkill 风格：2×10=20 款兽人狼杀角色（橙色调），跳过宠物行；webp 体积友好）
const BEASTKILL_SHEET_PATH = path.join(DIR, 'my-characters', 'beast-kill-sheet-2.webp');
if (!fs.existsSync(BEASTKILL_SHEET_PATH)) throw new Error('missing beastkill sheet: ' + BEASTKILL_SHEET_PATH);
// 2h. 风格封面图（控制面板"角色风格"卡片预览；由各风格雪碧图裁角色合成，webp 每张 ~10KB）
const STYLE_COVER_FILES = {
  kaai: path.join(DIR, 'styles', 'covers', 'kaai.webp'),
  wolfkill: path.join(DIR, 'styles', 'covers', 'wolfkill.webp'),
  beastkill: path.join(DIR, 'styles', 'covers', 'beastkill.webp'),
};
for (const k of Object.keys(STYLE_COVER_FILES)) {
  if (!fs.existsSync(STYLE_COVER_FILES[k])) throw new Error('missing style cover: ' + STYLE_COVER_FILES[k]);
}

// 3. 读取源文件
const crSrc = fs.readFileSync(path.join(DIR, 'character-renderer.js'), 'utf8');
const mwc = fs.readFileSync(path.join(DIR, 'message-wall-core.js'),  'utf8');
const ji  = fs.readFileSync(path.join(DIR, 'juejin-integration.js'), 'utf8');

// 3d-1. 赛博武士 Ronin 透明动画帧（收集 + 落盘信息）
const RONIN_FRAMES_DIR = path.join(DIR, 'pets/cyber-ronin/frames-webp');
const roninAnimList = [
  ['idle',         'idle'],
  ['runningRight', 'running-right'],
  ['runningLeft',  'running-left'],
  ['jumping',      'jumping'],
  ['waving',       'waving'],
];
const roninAnimFrames = {}; // state -> [dataURI, ...]
const roninAnimFiles  = {}; // state -> [{ file, abs }, ...]
for (const [key, folder] of roninAnimList) {
  const dir = path.join(RONIN_FRAMES_DIR, folder);
  let files = [];
  if (fs.existsSync(dir)) {
    files = fs.readdirSync(dir)
      .filter(f => /\.(webp|png)$/i.test(f))
      .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  }
  if (!files.length) { console.warn('missing ronin frames dir', dir); continue; }
  roninAnimFiles[key] = files.map(f => ({ file: f, abs: path.join(dir, f) }));
  roninAnimFrames[key] = files.map(f => {
    const buf = fs.readFileSync(path.join(dir, f));
    const mime = /\.png$/i.test(f) ? 'png' : 'webp';
    return `data:image/${mime};base64,` + buf.toString('base64');
  });
  console.log('  ronin  ', key.padEnd(14), files.length + '帧 ->', Math.round(roninAnimFrames[key].join('').length / 1024), 'KB');
}

// 3a~3d 的代码块替换（mode: 'b64' 内嵌 base64 / 'paths' 扩展资源相对路径）
const styleKeys = ['kaai', 'wolfkill', 'beastkill'];
const allStyles = styleKeys;

function buildStyleBlock(mode) {
  let b = "  const STYLE_IMAGE_DATA = {\n";
  for (const k of styleKeys) {
    let v = styleData[k] || '';
    if (mode === 'paths' && v && styleFileByKey[k]) {
      const s = styleFileByKey[k];
      v = writeRes('styles/' + k + path.extname(s.file), s.abs);
    }
    b += `    ${k}: ${sq(v)},\n`;
  }
  b += "  };\n";
  return b;
}

const poolBlock = (() => {
  let b = "  const STYLE_AVATAR_POOL = {\n";
  for (const s of allStyles) {
    const pp = { person:[], cat:[], dog:[], rabbit:[] };
    b += `    ${s}:      { person: [${pp.person.map(sq).join(', ')}], cat: [${pp.cat.map(sq).join(', ')}], dog: [${pp.dog.map(sq).join(', ')}], rabbit: [${pp.rabbit.map(sq).join(', ')}] },\n`;
  }
  b += "  };\n";
  return b;
})();

// 风格封面图（b64 内嵌 base64 / paths 写 resources/covers/<key>.webp）
function buildStyleCoverBlock(mode) {
  let b = "  const STYLE_COVER_DATA = {\n";
  for (const k of styleKeys) {
    let v = '';
    const abs = STYLE_COVER_FILES[k];
    if (abs && fs.existsSync(abs)) {
      if (mode === 'paths') {
        v = writeRes('covers/' + k + '.webp', abs);
      } else {
        v = 'data:image/webp;base64,' + fs.readFileSync(abs).toString('base64');
      }
    }
    b += `    ${k}: ${sq(v)},\n`;
  }
  b += "  };\n";
  return b;
}

// 南风知意雪碧图（b64 内嵌 base64 / paths 写 resources/kaai/sheet.png）
function buildKaaiBlock(mode) {
  let v;
  if (mode === 'paths') {
    v = writeRes('kaai/sheet.png', KAAI_SHEET_PATH);
  } else {
    v = 'data:image/png;base64,' + fs.readFileSync(KAAI_SHEET_PATH).toString('base64');
  }
  return `  let KAAI_SHEET_SRC = ${sq(v)}; // 南风知意雪碧图（跳过动物行，4×15=60 造型）\n`;
}
// 谎语之夜雪碧图（wolfkill 风格，2×10=20 款狼人杀人物）
function buildWolfkillBlock(mode) {
  let v;
  if (mode === 'paths') {
    v = writeRes('wolfkill/sheet.png', WOLFKILL_SHEET_PATH);
  } else {
    v = 'data:image/png;base64,' + fs.readFileSync(WOLFKILL_SHEET_PATH).toString('base64');
  }
  return `  let WOLFKILL_SHEET_SRC = ${sq(v)}; // 谎语之夜雪碧图（跳过宠物行，2×10=20 造型）\n`;
}
// 兽杀奇谭雪碧图（beastkill 风格，2×10=20 款兽人狼杀角色，webp）
function buildBeastkillBlock(mode) {
  let v;
  if (mode === 'paths') {
    v = writeRes('beastkill/sheet.webp', BEASTKILL_SHEET_PATH);
  } else {
    v = 'data:image/webp;base64,' + fs.readFileSync(BEASTKILL_SHEET_PATH).toString('base64');
  }
  return `  let BEASTKILL_SHEET_SRC = ${sq(v)}; // 兽杀奇谭雪碧图（跳过宠物行，2×10=20 兽人造型）\n`;
}

function buildRoninBlock(mode) {
  let b = "  const RONIN_ANIM_FRAMES = {\n";
  for (const key of Object.keys(roninAnimFrames)) {
    const vals = roninAnimFrames[key].map((uri, i) => {
      if (mode === 'paths') {
        const f = (roninAnimFiles[key] || [])[i];
        return writeRes('ronin/' + key + '/' + f.file, f.abs);
      }
      return uri;
    });
    b += `    ${key}: [\n      ${vals.map(sq).join(',\n      ')},\n    ],\n`;
  }
  b += "  };\n";
  return b;
}

const re1 = /\r?\n  const STYLE_IMAGE_DATA = \{[\s\S]*?\n  \};\r?\n/;
const re2 = /\r?\n  const STYLE_AVATAR_POOL = \{[\s\S]*?\n  \};\r?\n/;
const re2c = /\r?\n  const STYLE_COVER_DATA = \{[\s\S]*?\n  \};\r?\n/;
const re8 = /\r?\n  let KAAI_SHEET_SRC = '';[^\r\n]*\r?\n/;
const re9 = /\r?\n  let WOLFKILL_SHEET_SRC = '';[^\r\n]*\r?\n/;
const re10 = /\r?\n  let BEASTKILL_SHEET_SRC = '';[^\r\n]*\r?\n/;
const re4 = /\r?\n  const RONIN_ANIM_FRAMES = \{[\s\S]*?\n  \};\r?\n/;

function buildCr(source, mode) {
  let s = source;
  if (!re1.test(s)) throw new Error('STYLE_IMAGE_DATA block not found');
  s = s.replace(re1, '\n' + buildStyleBlock(mode));
  if (!re2.test(s)) throw new Error('STYLE_AVATAR_POOL block not found');
  s = s.replace(re2, '\n' + poolBlock);
  if (!re2c.test(s)) throw new Error('STYLE_COVER_DATA block not found');
  s = s.replace(re2c, '\n' + buildStyleCoverBlock(mode));
  if (!re8.test(s)) throw new Error('KAAI_SHEET_SRC block not found');
  s = s.replace(re8, '\n' + buildKaaiBlock(mode));
  if (!re9.test(s)) throw new Error('WOLFKILL_SHEET_SRC block not found');
  s = s.replace(re9, '\n' + buildWolfkillBlock(mode));
  if (!re10.test(s)) throw new Error('BEASTKILL_SHEET_SRC block not found');
  s = s.replace(re10, '\n' + buildBeastkillBlock(mode));
  if (!re4.test(s)) throw new Error('RONIN_ANIM_FRAMES block not found');
  s = s.replace(re4, '\n' + buildRoninBlock(mode));
  return s;
}

// 4. 组装 userscript（内嵌 base64）
const crB64 = buildCr(crSrc, 'b64');
if (crB64.includes("let KAAI_SHEET_SRC = '';")) throw new Error('KAAI_SHEET_SRC replace FAILED');
if (crB64.includes("let WOLFKILL_SHEET_SRC = '';")) throw new Error('WOLFKILL_SHEET_SRC replace FAILED');
if (crB64.includes("let BEASTKILL_SHEET_SRC = '';")) throw new Error('BEASTKILL_SHEET_SRC replace FAILED');
if (/const STYLE_COVER_DATA = \{\r?\n    kaai: ''/.test(crB64)) throw new Error('STYLE_COVER_DATA replace FAILED');

const ICON_URI = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(DIR, 'juejin-danmu-icon.jpg')).toString('base64');

const header = `// ==UserScript==
// @name         掘金弹幕
// @namespace    http://tampermonkey.net/
// @version      ${VERSION}
// @description  透明背景角色行走弹幕墙；角色风格为 🎪南风知意 = 60 款 4×15 南风知意整身雪碧图（跳过动物行）。
// @author       You
// @icon         ${ICON_URI}
// @match        *://juejin.cn/*
// @match        *://*.juejin.cn/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable */
(function () {
  'use strict';
`;

const tail = `

  // 自动启动：在掘金页面挂载消息墙（默认南风知意：60 款人物，仅人物）
  if (window.CharacterRenderer && window.MessageWallCore && window.JuejinMessageWall) {
    try {
      const { MessageWallEngine } = window.MessageWallCore;
      const { JuejinMessageProvider, ControlPanel, attachBubbleInteraction } = window.JuejinMessageWall;
      const provider = new JuejinMessageProvider();
      const engine = new MessageWallEngine(document.body, {
        characterCount: 15,
        characterScale: 1.3,
        performanceMode: 'auto',
        targetFPS: 30,
        defaultCharacterStyle: 'kaai',
        characterTypeRatio: { person: 1 },
        floorRatio: 1.07,
        zIndex: 99999,
        opacity: 1,
        messageInterval: 1200,
        messageDuration: 7000,
        showFloorLine: false,
        onMessageRequest: () => provider.getMessageSync(),
      });
      engine.start();
      // 气泡悬停详情（作者/回复/点赞）+ 点击跳转沸点
      if (typeof attachBubbleInteraction === 'function') {
        try { attachBubbleInteraction(engine); } catch (_) {}
      }
      const panel = new ControlPanel(engine, provider, { position: 'top-right' });
      window.__JMW_MAIN__ = { engine, provider, panel };
      window.__MSG_WALL__ = window.__JMW_MAIN__;
      window.addEventListener('msgwall:destroy', () => {
        try { engine.destroy(); } catch (_) {}
        try { panel.destroy(); } catch (_) {}
      });
    } catch (err) {
      console.error('[掘金弹幕] 启动失败', err);
    }
  }
`;

const out = header
  + "\n// ===== FILE: character-renderer.js =====\n" + crB64
  + "\n// ===== FILE: message-wall-core.js =====\n" + mwc
  + "\n// ===== FILE: juejin-integration.js =====\n" + ji
  + "\n" + tail
  + "\n})();\n";

const outPath = path.join(DIR, OUT_NAME);
fs.writeFileSync(outPath, out, 'utf8');
const size = fs.statSync(outPath).size;
console.log('\nWROTE', outPath, '->', (size/1024/1024).toFixed(2), 'MB /', Math.round(size/1024), 'KB');

// ==================== 5. Chrome 扩展输出 ====================
fs.mkdirSync(EXT_DIR, { recursive: true });

// 5a. manifest.json（MV3，content script 走 ISOLATED world 以便 chrome.runtime.getURL 解析资源；
//     resources/ 声明为 web_accessible_resources 供页面/内容脚本加载）
const manifest = {
  manifest_version: 3,
  name: '掘金弹幕',
  version: VERSION,
  description: '在掘金页面显示透明背景的角色行走弹幕墙（南风知意：60 款人物，仅人物）。图片/动画帧分离为扩展资源文件，体积更小、加载更快。',
  icons: {
    '16': 'icons/icon16.png',
    '32': 'icons/icon32.png',
    '48': 'icons/icon48.png',
    '128': 'icons/icon128.png',
    '256': 'icons/icon256.png',
  },
  content_scripts: [
    {
      matches: ['*://juejin.cn/*', '*://*.juejin.cn/*'],
      js: ['content.js'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['resources/*'],
      matches: ['*://juejin.cn/*', '*://*.juejin.cn/*'],
    },
  ],
};
fs.writeFileSync(path.join(EXT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log('WROTE', path.join(EXT_DIR, 'manifest.json'));

// 5b. content.js（去掉油猴头，仅核心代码 + 自动启动；资源走 resources/ 相对路径）
const crExt = buildCr(crSrc, 'paths');
const extContent = crExt + "\n" + mwc + "\n" + ji + "\n" + tail;
const extPath = path.join(EXT_DIR, 'content.js');
fs.writeFileSync(extPath, extContent, 'utf8');
const extSize = fs.statSync(extPath).size;
console.log('WROTE', extPath, '->', (extSize/1024/1024).toFixed(2), 'MB /', Math.round(extSize/1024), 'KB');

// 5c. 统计资源体积
let resBytes = 0, resCount = 0;
const walk = (d) => {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else { resBytes += fs.statSync(p).size; resCount++; }
  });
};
if (fs.existsSync(RES_DIR)) walk(RES_DIR);
console.log('resources/:', resCount, 'files ->', (resBytes/1024/1024).toFixed(2), 'MB');
