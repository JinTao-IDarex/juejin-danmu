// 生成 demo.html 的注入脚本：
//   - __JMW_STYLE_IMAGES__ ：9 张风格总览图 data URI
//   - __JMW_AVATAR_IMAGES__ ：15 张赛博朋克 person/cat/dog/rabbit 立绘
//   - patch-demo-inject-images.ps1 会把结果插入到 demo.html
const fs = require('fs');
const path = require('path');
const DIR = 'd:/2workspace/codex/juejin3';
const overviewList = [
  ['01-pixel-8bit.jpg',        'pixel'],
  ['02-cyberpunk-neon.jpg',    'cyberpunk'],
  ['03-hanfu-chinese.jpg',     'hanfu'],
  ['04-chibi-kawaii.jpg',      'chibi'],
  ['05-watercolor-soft.jpg',   'watercolor'],
  ['06-steampunk.jpg',         'steampunk'],
  ['08-streetwear-hiphop.jpg', 'streetwear'],
  ['09-90s-anime.jpg',         'anime90s'],
  ['10-pastel-macaron.jpg',    'pastel'],
];
const avatarList = [
  ['cyber-characters/p01_ronin.jpg',     'cb_p01_ronin'],
  ['cyber-characters/p02_hacker.jpg',    'cb_p02_hacker'],
  ['cyber-characters/p03_corpo.jpg',     'cb_p03_corpo'],
  ['cyber-characters/p04_android.jpg',   'cb_p04_android'],
  ['cyber-characters/p05_scavenger.jpg', 'cb_p05_scavenger'],
  ['cyber-characters/p06_netrunner.jpg', 'cb_p06_netrunner'],
  ['cyber-characters/p07_yakuza.jpg',    'cb_p07_yakuza'],
  ['cyber-characters/p08_mercenary.jpg', 'cb_p08_mercenary'],
  ['cyber-characters/p09_geisha.jpg',    'cb_p09_geisha'],
  ['cyber-characters/p10_mechanic.jpg',  'cb_p10_mechanic'],
  ['cyber-pets/pt01_cat.jpg',            'cb_pt01_cat'],
  ['cyber-pets/pt02_dog.jpg',            'cb_pt02_dog'],
  ['cyber-pets/pt03_rabbit.jpg',         'cb_pt03_rabbit'],
  ['cyber-pets/pt04_fox.jpg',            'cb_pt04_fox'],
  ['cyber-pets/pt05_hamster.jpg',        'cb_pt05_hamster'],
];
const b64 = p => 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');
const sq = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const lines = ['<script>',
  '  (function () {',
  '    var STYLE = {'];
for (const [f, k] of overviewList) {
  const p = path.join(DIR, 'styles', f);
  if (!fs.existsSync(p)) continue;
  lines.push('      ' + k + ': ' + sq(b64(p)) + ',');
}
lines.push('    };');
lines.push('    var AVT = {');
for (const [f, k] of avatarList) {
  const p = path.join(DIR, 'styles', f);
  if (!fs.existsSync(p)) continue;
  lines.push('      ' + k + ': ' + sq(b64(p)) + ',');
}
lines.push('    };');
lines.push('    if (typeof window !== "undefined") {');
lines.push('      window.__JMW_STYLE_IMAGES__ = STYLE;');
lines.push('      window.__JMW_AVATAR_IMAGES__ = AVT;');
lines.push('    }');
lines.push('  })();');
lines.push('</script>');
const out = lines.join('\n');
const outPath = path.join(DIR, 'style-images-injector.html.part');
fs.writeFileSync(outPath, out, 'utf8');
console.log('WROTE', outPath, '->', Math.round(out.length/1024), 'KB');
