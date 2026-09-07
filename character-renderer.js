/**
 * 角色绘制引擎 - Character Renderer Engine
 * 支持多种角色形象：人物(person)、猫(cat)、狗(dog)、兔子(rabbit)
 * 使用 Canvas 2D API 绘制像素风格/简笔画风格的角色
 *
 * 每个角色的基本属性：
 * - type: 'person' | 'cat' | 'dog' | 'rabbit'
 * - direction: 'left' | 'right'  朝向
 * - walkFrame: 0-3  行走动画帧
 * - scale: 缩放比例
 * - color: 主色调（衣服/毛发颜色）
 * - accessory: 装饰品（圣诞帽、光环等）
 */

(function (global) {
  'use strict';

  // ============ 工具函数 ============
  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // 预设颜色调色板（默认：default = 通用平衡色）
  const DEFAULT_PALETTE = {
    skin: ['#FFE0BD', '#F5D5C8', '#FFDAB9', '#F0C8A0', '#E8C4A0'],
    hair: ['#2C2C2C', '#3B2F2F', '#4A3728', '#8B4513', '#DAA520', '#B8860B', '#8B0000', '#1C1C1C', '#696969'],
    clothes: [
      '#E74C3C', '#3498DB', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C',
      '#E67E22', '#34495E', '#D35400', '#C0392B', '#27AE60', '#2980B9',
      '#8E44AD', '#16A085', '#F1C40F', '#7F8C8D', '#95A5A6', '#BDC3C7',
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
      '#FFFFFF', '#000000'
    ],
    catFur: ['#2C2C2C', '#FFA500', '#FFFFFF', '#808080', '#D2691E', '#F5DEB3', '#696969', '#FFD700'],
    dogFur: ['#8B4513', '#D2691E', '#F5DEB3', '#2C2C2C', '#FFFFFF', '#808080', '#CD853F', '#BC8F8F'],
    rabbitFur: ['#FFFFFF', '#E8E8E8', '#D3D3D3', '#F5F5DC', '#FFC0CB', '#DDA0DD'],
    eyes: ['#2C2C2C', '#654321', '#4169E1', '#228B22', '#FFD700', '#6B238E', '#C0392B', '#FF8C00'],
    collars: ['#E74C3C', '#3498DB', '#2ECC71', '#9B59B6', '#F39C12'],
    pants: ['#2C3E50', '#34495E', '#8B4513', '#2C2C2C', '#1A1A2E', '#4A4A4A'],
  };
  let COLOR_PALETTE = Object.assign({}, DEFAULT_PALETTE);

  // ==========================================================
  // 🎨 风格配置（雪碧图造型风格：personOnly = 立绘池仅人物）
  // ==========================================================
  const STYLE_PROFILES = {
    kaai: {
      key: 'kaai',
      label: '🎪 南风知意',
      desc: '60 款 4×15 南风知意人物（跳过雪碧图动物行）',
      personOnly: true,
      // 矢量兜底色板：仅在雪碧图未加载/未注入时生效
      palette: {
        skin: ['#FFFFFF'],
        hair: ['#1A1A1A', '#2C2C2C', '#3A3A3A'],
        clothes: ['#FFFFFF', '#FAFAF7', '#F4F2ED'],
        catFur:  ['#FFFFFF', '#F7F6F2'],
        dogFur:  ['#FFFFFF', '#F7F6F2'],
        rabbitFur: ['#FFFFFF', '#FAFAF7'],
        eyes:   ['#1A1A1A'],
        collars:['#1A1A1A'],
        pants:  ['#1A1A1A', '#2C2C2C', '#3A3A3A'],
      },
      hairStyles: { person: ['short', 'long', 'curly', 'bun', 'bald'] },
      accessories: {
        person: [null],
        cat:    [null],
        dog:    [null],
        rabbit: [null],
      },
      accessoryProb: { person: 0, cat: 0, dog: 0, rabbit: 0 },
    },
    wolfkill: {
      key: 'wolfkill',
      label: '🌙 谎语之夜',
      desc: '20 款 狼人杀角色（2×10 贴纸Q版雪碧图，跳过宠物行）',
      personOnly: true,
      // 矢量兜底色板：仅在雪碧图未加载/未注入时生效（暗夜+狼血橙）
      palette: {
        skin: ['#F5EFE6', '#FFE0BD'],
        hair: ['#1A1A1A', '#2C2C2C', '#3A3A3A', '#4A3728'],
        clothes: ['#23262E', '#2E323C', '#8C2F2F', '#C4622D', '#E8E3D8'],
        catFur:  ['#2C2C2C', '#E8E3D8'],
        dogFur:  ['#2C2C2C', '#C4622D'],
        rabbitFur: ['#E8E3D8', '#F5EFE6'],
        eyes:   ['#1A1A1A', '#8C2F2F'],
        collars:['#8C2F2F'],
        pants:  ['#23262E', '#2C2C2C', '#3A3A3A'],
      },
      hairStyles: { person: ['short', 'long', 'curly', 'bun', 'bald'] },
      accessories: {
        person: [null],
        cat:    [null],
        dog:    [null],
        rabbit: [null],
      },
      accessoryProb: { person: 0, cat: 0, dog: 0, rabbit: 0 },
    },
    beastkill: {
      key: 'beastkill',
      label: '🐾 兽杀奇谭',
      desc: '20 款 兽人狼杀角色（2×10 贴纸Q版雪碧图，跳过宠物行）',
      personOnly: true,
      // 矢量兜底色板：仅在雪碧图未加载/未注入时生效（暗夜+兽血橙）
      palette: {
        skin: ['#F5EFE6', '#FFE0BD'],
        hair: ['#1A1A1A', '#2C2C2C', '#4A3728', '#6B4423'],
        clothes: ['#23262E', '#2A2521', '#D96C2C', '#E8873C', '#F2EAD9'],
        catFur:  ['#2C2C2C', '#E8873C'],
        dogFur:  ['#6B4423', '#D96C2C'],
        rabbitFur: ['#F2EAD9', '#F5EFE6'],
        eyes:   ['#1A1A1A', '#D96C2C'],
        collars:['#D96C2C'],
        pants:  ['#23262E', '#2C2C2C', '#3A3A3A'],
      },
      hairStyles: { person: ['short', 'long', 'curly', 'bun', 'bald'] },
      accessories: {
        person: [null],
        cat:    [null],
        dog:    [null],
        rabbit: [null],
      },
      accessoryProb: { person: 0, cat: 0, dog: 0, rabbit: 0 },
    },
  };
  let CURRENT_STYLE_KEY = 'kaai';

  // ==========================================================
  // 🖼 风格图片注册表：
  //   - STYLE_IMAGE_DATA: "风格级默认形象图"（如原来的 9 张风格预览）；''=未嵌入
  //   - STYLE_AVATAR_POOL: "风格→物种→一组头像图 keys"，用于每个角色按物种随机抽不同立绘
  //   - AVATAR_IMAGE_DATA: "头像图 key → base64 data URI" 字典（构建脚本写入）
  // 若当前角色 options.__avatarKey 命中 AVATAR_IMAGE_DATA，则走 per-character 立绘分支；
  // 否则 fallback 到 STYLE_IMAGE_DATA 的风格单图。二者都缺时走矢量绘制。
  // ==========================================================
  const STYLE_IMAGE_DATA = {
    kaai: '',
    wolfkill: '',
    beastkill: '',
  };
  // { <styleKey>: { person:[avatarKey,...], cat:[...], dog:[...], rabbit:[...] } }
  const STYLE_AVATAR_POOL = {
    kaai:       { person: [], cat: [], dog: [], rabbit: [] },
    wolfkill:   { person: [], cat: [], dog: [], rabbit: [] },
    beastkill:  { person: [], cat: [], dog: [], rabbit: [] },
  };
  const AVATAR_IMAGE_DATA = {}; // { <avatarKey>: dataURI }
  // 风格封面图（控制面板"角色风格"卡片预览用；key → dataURI/路径，构建脚本写入或 __JMW_STYLE_COVERS__ 注入）
  const STYLE_COVER_DATA = {
    kaai: '',
    wolfkill: '',
    beastkill: '',
  };
  // ==========================================================
  // ⚠️ Runtime sync：把全局注入的 __JMW_STYLE_IMAGES__ / __JMW_AVATAR_IMAGES__
  //    （demo.html 注入块 / 运行时动态 register）合并到本地字典和 avatar pool。
  //    这样「构建脚本未执行/本地 demo 用 style-images-injector.html.part」两种场景都能生效。
  // ==========================================================
  (function _syncFromGlobalOnce() {
    // STYLE_IMAGE_DATA 回填（按 key 覆盖）
    try {
      const gs = global.__JMW_STYLE_IMAGES__ || {};
      Object.keys(gs).forEach(k => {
        if (Object.prototype.hasOwnProperty.call(STYLE_IMAGE_DATA, k) && gs[k] && !STYLE_IMAGE_DATA[k]) {
          STYLE_IMAGE_DATA[k] = gs[k];
        }
      });
    } catch (_) {}
    // 风格封面图回填
    try {
      const gc = global.__JMW_STYLE_COVERS__ || {};
      Object.keys(gc).forEach(k => {
        if (Object.prototype.hasOwnProperty.call(STYLE_COVER_DATA, k) && gc[k] && !STYLE_COVER_DATA[k]) {
          STYLE_COVER_DATA[k] = gc[k];
        }
      });
    } catch (_) {}
    // AVATAR 回填：只要 window 上 __JMW_AVATAR_IMAGES__ 有头像，就挂进 AVATAR_IMAGE_DATA。
    //   风格头像池以构建时写好的 STYLE_AVATAR_POOL 为准，或经 addStyleAvatarPool 运行时注册。
    try {
      const ga = global.__JMW_AVATAR_IMAGES__ || {};
      Object.keys(ga).forEach(k => {
        if (ga[k] && !AVATAR_IMAGE_DATA[k]) AVATAR_IMAGE_DATA[k] = ga[k];
      });
    } catch (_) {}
  })();
  // ==========================================================
  // 🧩 图片资源解析：
  //   - 油猴/演示场景：数据源是内嵌 base64 data URI（以 data:image/ 开头），原样使用。
  //   - Chrome 扩展场景：构建脚本把 STYLE_IMAGE_DATA / AVATAR_IMAGE_DATA / 动画帧
  //     写为 resources/ 下的相对路径，运行时经 chrome.runtime.getURL 解析为扩展 URL，
  //     并统一走 fetch → blob → objectURL，避免跨域 canvas 污染。
  // ==========================================================
  function resolveImageSrc(src) {
    if (typeof src === 'string' && src && !/^data:image\//i.test(src)) {
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          return chrome.runtime.getURL(src);
        }
      } catch (_) {}
    }
    return src;
  }
  function assignImgSrc(img, src) {
    if (!img) return;
    const resolved = resolveImageSrc(src);
    // 扩展资源：fetch → blob → objectURL（blob URL 绘制到 canvas 永不污染）
    if (/^(chrome-extension|moz-extension):\/\//i.test(resolved)) {
      try {
        fetch(resolved)
          .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
          .then(b => { try { img.src = URL.createObjectURL(b); } catch (_) {} })
          .catch(err => { try { img.onerror && img.onerror(err); } catch (_) {} });
        return;
      } catch (_) {}
    }
    img.src = resolved;
  }
  // ==========================================================
  // 🎬 赛博武士 Ronin 透明动画：
  //   - RONIN_ANIM_FRAMES: "状态 -> 帧列表（dataURI / URL）"（构建脚本写入 / 运行时注入）
  //   - 当角色 __avatarKey === 'cb_p01_ronin' 时，用透明动画替代静态立绘，
  //     行走播 running-*，停下播 idle，透明背景直绘（无白卡）。
  //   浏览器不会在 canvas 上自动播放离屏 WebP/GIF，因此改为手动按时间逐帧切换。
  //   未注入动画数据 / 尚未加载完成时自动回退到静态立绘。
  // ==========================================================
  const RONIN_ANIM_AVATAR_KEY = 'cb_p01_ronin'; // 命中该头像 key 即走透明动画
  const RONIN_ANIM_FRAME_DUR = { idle: 140, runningRight: 110, runningLeft: 110, jumping: 120, waving: 120 }; // 每帧毫秒
  const RONIN_ANIM_FRAMES = {
    idle: [],
    runningRight: [],
    runningLeft: [],
    jumping: [],
    waving: [],
  };
  try {
    const ga = global.__JMW_RONIN_ANIM_FRAMES__ || {};
    Object.keys(ga).forEach(k => {
      if (Array.isArray(ga[k]) && Object.prototype.hasOwnProperty.call(RONIN_ANIM_FRAMES, k)) {
        RONIN_ANIM_FRAMES[k] = ga[k].slice();
      }
    });
  } catch (_) {}
  /** 赛博武士动画帧存储：状态 -> 帧 Image[]（时间索引手动播放） */
  const RoninAnimStore = {
    imgs: {}, // state -> [{img, ready}, ...]
    _init() {
      Object.keys(RONIN_ANIM_FRAMES).forEach(st => {
        if (this.imgs[st]) return;
        const list = RONIN_ANIM_FRAMES[st] || [];
        if (!list.length) { this.imgs[st] = []; return; }
        this.imgs[st] = list.map(src => {
          const img = (typeof Image !== 'undefined') ? new Image() : null;
          if (!img) return null;
          const e = { img, ready: false };
          img.onload = () => { e.ready = true; };
          img.onerror = () => { e.failed = true; }; // 加载失败则回退静态立绘
          assignImgSrc(img, src);
          return e;
        });
      });
    },
    hasData() {
      return Object.keys(RONIN_ANIM_FRAMES).some(k => (RONIN_ANIM_FRAMES[k] || []).length);
    },
    pickState(direction, moving) {
      if (moving) return direction === 'left' ? 'runningLeft' : 'runningRight';
      return 'idle';
    },
    /** 按时间取当前帧 img；未就绪返回 null */
    currentFrame(state, now) {
      const frames = this.imgs[state];
      if (!frames || !frames.length) return null;
      const dur = RONIN_ANIM_FRAME_DUR[state] || 120;
      const idx = Math.floor(now / dur) % frames.length;
      const e = frames[idx];
      return (e && e.ready && e.img) ? e.img : null;
    },
  };
  /** 该角色的头像 key 是否走透明动画（赛博武士 Ronin），供引擎决定是否绕过 SpriteCache */
  function isAnimatedAvatar(options) {
    if (!options) return false;
    const ak = String(options.__avatarKey || '');
    if (ak === RONIN_ANIM_AVATAR_KEY && RoninAnimStore.hasData()) return true;
    // pose-sheet 雪碧图造型（kaai 南风知意 / wolfkill 谎语之夜 等）：切格就绪后绕过 SpriteCache 直绘
    const sk = String(options.__styleKey || '') || CURRENT_STYLE_KEY;
    const cfg = typeof poseSheetCfg === 'function' ? poseSheetCfg(sk) : null;
    if (cfg && options[cfg.poseOptKey] != null && cfg.store && cfg.store.isReady && cfg.store.isReady()) return true;
    return false;
  }
  /**
   * 绘制赛博武士 Ronin 透明动画（行走/待机）。无白卡、无裁切，直接 drawImage 当前帧。
   * 未就绪/未注入时返回 null，由 drawCharacter 回退到静态立绘或矢量。
   */
  function drawAnimatedRonin(ctx, x, y, type, direction, walkFrame, scale, options) {
    if (!RoninAnimStore.hasData()) return null;
    const moving = !!(options && options.__moving);
    const st = RoninAnimStore.pickState(direction, moving);
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const img = RoninAnimStore.currentFrame(st, now);
    if (!img) {
      if (RoninAnimStore.imgs && !RoninAnimStore.imgs[st]) RoninAnimStore._init();
      return null;
    }
    const srcW = 192, srcH = 208; // 图集单帧尺寸
    const baseH = 165; // 110 × 1.5
    const dstH = Math.max(40, Math.round(baseH * scale));
    const dstW = Math.max(20, Math.round(dstH * (srcW / srcH)));
    ctx.save();
    // 贴地阴影（脚的位置）
    const shadowY = y - 1;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + dstW / 2, shadowY, dstW * 0.34, Math.max(2, 3 * scale), 0, 0, Math.PI * 2);
    ctx.fill();
    // 透明动画直绘（保留透明背景，叠加在论坛内容之上）
    const drawY = y - dstH;
    ctx.drawImage(img, 0, 0, srcW, srcH, x, drawY, dstW, dstH);
    ctx.restore();
    return { width: dstW, height: dstH };
  }
  /** 动态注册 Ronin 动画帧（demo / 运行时注入） */
  function registerRoninAnimFrames(state, frameList) {
    if (!state || !Object.prototype.hasOwnProperty.call(RONIN_ANIM_FRAMES, state)) return false;
    if (!Array.isArray(frameList) || !frameList.length) return false;
    RONIN_ANIM_FRAMES[state] = frameList.slice();
    RoninAnimStore.imgs[state] = null;
    RoninAnimStore._init();
    return true;
  }
  // 启动预加载 Ronin 动画（后台低优先级）
  setTimeout(() => { try { RoninAnimStore._init(); } catch (_) {} }, 150);

  // ==========================================================
  // 🎪 雪碧图造型（pose-sheet 风格通用）：kaai 南风知意 / wolfkill 谎语之夜 / beastkill 兽杀奇谭
  //   - <STYLE>_SHEET_SRC: 透明雪碧图。构建脚本写入 dataURI（油猴）/ resources 相对路径（扩展）；
  //     demo 经 __JMW_<STYLE>_SHEET__ 回填（kaai: 1485×1059 15列×5行，跳过动物行；
  //     wolfkill: 1530×557 2×10=20 款狼人杀人物，跳过宠物行；
  //     beastkill: 1731×646 2×10=20 款兽人狼杀角色（橙色调），跳过宠物行）。
  //   - PoseSheetStore: 内容感知切格（按 alpha 像素分布检测每个角色的真实包围盒），
  //     自动跳过末尾矮条带（动物/名牌/宠物行），每格预裁 normal + 水平翻转两份离屏 canvas。
  //   - drawSheetPose: 静态造型 + walkFrame 小跳 + 贴地阴影；未就绪回退矢量简笔。
  // ==========================================================
  let KAAI_SHEET_SRC = '';
  let WOLFKILL_SHEET_SRC = '';
  let BEASTKILL_SHEET_SRC = '';
  // 注：已从"固定行列切格"改为"内容感知切格"，KAAI_SHEET_COLS/ROWS 仅作为上限参考
  const KAAI_SHEET_COLS_MAX = 20;
  const KAAI_SHEET_ROWS_MAX = 8;
  const KAAI_POSE_BASE_H = 150; // 造型显示基准高（px @ scale=1）
  const WOLFKILL_POSE_BASE_H = 150;
  const BEASTKILL_POSE_BASE_H = 150;
  try {
    if (typeof global.__JMW_KAAI_SHEET__ === 'string' && global.__JMW_KAAI_SHEET__) {
      KAAI_SHEET_SRC = global.__JMW_KAAI_SHEET__;
    }
    if (typeof global.__JMW_WOLFKILL_SHEET__ === 'string' && global.__JMW_WOLFKILL_SHEET__) {
      WOLFKILL_SHEET_SRC = global.__JMW_WOLFKILL_SHEET__;
    }
    if (typeof global.__JMW_BEASTKILL_SHEET__ === 'string' && global.__JMW_BEASTKILL_SHEET__) {
      BEASTKILL_SHEET_SRC = global.__JMW_BEASTKILL_SHEET__;
    }
  } catch (_) {}
  const KaaiStore = {
    poses: [], ready: false, tried: false,
    hasData() { return !!KAAI_SHEET_SRC; },
    isReady() { return this.ready && this.poses.length > 0; },
    _init() {
      if (this.tried || !this.hasData()) return;
      this.tried = true;
      const img = (typeof Image !== 'undefined') ? new Image() : null;
      if (!img) return;
      img.onload = () => {
        try {
          this._slice(img);
          this.ready = true;
        } catch (_) { this.ready = false; }
      };
      img.onerror = () => { this.tried = false; };
      assignImgSrc(img, KAAI_SHEET_SRC);
    },
    _slice(img) {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cv0 = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
      if (!cv0) throw new Error('no document');
      cv0.width = W; cv0.height = H;
      const g0 = cv0.getContext('2d');
      g0.drawImage(img, 0, 0);
      const imgData = g0.getImageData(0, 0, W, H);
      const data = imgData.data;
      const A = new Uint8Array(W * H);
      for (let i = 0, p = 3; i < W * H; i++, p += 4) A[i] = data[p];
      const rowThresh = Math.max(2, Math.round(W * 0.004));
      const rowAlpha = new Uint32Array(H);
      for (let y = 0; y < H; y++) {
        let s = 0;
        const b = y * W;
        for (let x = 0; x < W; x++) s += A[b + x];
        rowAlpha[y] = s;
      }
      const rowOcc = new Array(H);
      for (let y = 0; y < H; y++) rowOcc[y] = rowAlpha[y] > rowThresh * 255;
      const bands = [];
      const ROW_GAP = 6;
      let y = 0;
      while (y < H) {
        if (!rowOcc[y]) { y++; continue; }
        let end = y, gap = 0;
        for (let z = y; z < H; z++) {
          if (rowOcc[z]) { end = z; gap = 0; } else { gap++; if (gap > ROW_GAP) break; }
        }
        bands.push([y, end]);
        y = end + 1;
      }
      if (bands.length <= 1) { this.poses = []; return; }
      // 跳过最后一行（动物/宠物：高度明显小于前几行，且占位不一致）
      const lastBand = bands[bands.length - 1];
      const prevBand = bands[bands.length - 2];
      if ((lastBand[1] - lastBand[0] + 1) < (prevBand[1] - prevBand[0] + 1) * 0.85) {
        bands.pop();
      }
      const cells = [];
      const COL_GAP = 4;
      const colThreshAbs = 255 * 2;
      for (const [by0, by1] of bands) {
        const colAlpha = new Uint32Array(W);
        for (let yy = by0; yy <= by1; yy++) {
          const b = yy * W;
          for (let x = 0; x < W; x++) colAlpha[x] += A[b + x];
        }
        let x2 = 0;
        while (x2 < W) {
          if (colAlpha[x2] <= colThreshAbs) { x2++; continue; }
          let end = x2, gap = 0;
          for (let z = x2; z < W; z++) {
            if (colAlpha[z] > colThreshAbs) { end = z; gap = 0; } else { gap++; if (gap > COL_GAP) break; }
          }
          cells.push({ x0: x2, y0: by0, x1: end, y1: by1 });
          x2 = end + 1;
        }
      }
      const poses = cells.map(cell => {
        const sw = cell.x1 - cell.x0 + 1;
        const sh = cell.y1 - cell.y0 + 1;
        const mk = (flip) => {
          const cv = document.createElement('canvas');
          cv.width = sw; cv.height = sh;
          const g = cv.getContext('2d');
          if (flip) { g.translate(sw, 0); g.scale(-1, 1); }
          g.drawImage(cv0, cell.x0, cell.y0, sw, sh, 0, 0, sw, sh);
          return cv;
        };
        return { n: mk(false), f: mk(true), w: sw, h: sh };
      });
      this.poses = poses;
    },
  };
  setTimeout(() => { try { KaaiStore._init(); } catch (_) {} }, 100);
  // 🌙 谎语之夜（wolfkill 风格）雪碧图仓库：直接复用 KaaiStore 的内容感知切格算法（_slice 只依赖 this.poses）
  const WolfkillStore = {
    poses: [], ready: false, tried: false,
    hasData() { return !!WOLFKILL_SHEET_SRC; },
    isReady() { return this.ready && this.poses.length > 0; },
    _init() {
      if (this.tried || !this.hasData()) return;
      this.tried = true;
      const img = (typeof Image !== 'undefined') ? new Image() : null;
      if (!img) return;
      img.onload = () => {
        try {
          KaaiStore._slice.call(this, img);
          this.ready = true;
        } catch (_) { this.ready = false; }
      };
      img.onerror = () => { this.tried = false; };
      assignImgSrc(img, WOLFKILL_SHEET_SRC);
    },
  };
  setTimeout(() => { try { WolfkillStore._init(); } catch (_) {} }, 100);
  // 🐾 兽杀奇谭（beastkill 风格）雪碧图仓库：复用 KaaiStore 的内容感知切格算法
  const BeastkillStore = {
    poses: [], ready: false, tried: false,
    hasData() { return !!BEASTKILL_SHEET_SRC; },
    isReady() { return this.ready && this.poses.length > 0; },
    _init() {
      if (this.tried || !this.hasData()) return;
      this.tried = true;
      const img = (typeof Image !== 'undefined') ? new Image() : null;
      if (!img) return;
      img.onload = () => {
        try {
          KaaiStore._slice.call(this, img);
          this.ready = true;
        } catch (_) { this.ready = false; }
      };
      img.onerror = () => { this.tried = false; };
      assignImgSrc(img, BEASTKILL_SHEET_SRC);
    },
  };
  setTimeout(() => { try { BeastkillStore._init(); } catch (_) {} }, 100);

  /**
   * 绘制雪碧图造型（pose-sheet 风格 person）。整身造型随机抽取：
   * 1) 每个角色随机抽一张（pose 序号在 generateRandomOptions 预抽，持久不变）；
   * 2) 贴地阴影 + 走路 hop 小跳，朝向走水平镜像；
   * 3) 未就绪/无造型返回 null，由 drawCharacter 回退到矢量简笔。
   */
  function drawSheetPose(store, baseH, poseOptKey, ctx, x, y, direction, walkFrame, scale, options) {
    if (!store.isReady()) return null;
    const poses = store.poses;
    const pose = poses[Math.abs((options[poseOptKey] | 0)) % poses.length];
    if (!pose) return null;
    const dstH = Math.max(40, Math.round(baseH * scale));
    const dstW = Math.max(20, Math.round(dstH * (pose.w / pose.h)));
    const moving = !!(options && options.__moving);
    const hop = (moving && (walkFrame === 1 || walkFrame === 3)) ? Math.max(2, Math.round(5 * scale)) : 0;
    const src = (direction === 'right') ? pose.n : pose.f;
    // 贴地阴影（脚的位置，走路 hop 时影子留在原地）
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(x + dstW / 2, y - 1, dstW * 0.4, Math.max(2, 3 * scale), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 身体直绘（透明背景，保留 alpha）
    ctx.save();
    ctx.drawImage(src, 0, 0, pose.w, pose.h, x, y - dstH - hop, dstW, dstH);
    ctx.restore();
    return { width: dstW, height: dstH + hop };
  }
  function drawKaaiPose(ctx, x, y, direction, walkFrame, scale, options) {
    return drawSheetPose(KaaiStore, KAAI_POSE_BASE_H, '__kaaiPose', ctx, x, y, direction, walkFrame, scale, options);
  }
  function drawWolfkillPose(ctx, x, y, direction, walkFrame, scale, options) {
    return drawSheetPose(WolfkillStore, WOLFKILL_POSE_BASE_H, '__wolfkillPose', ctx, x, y, direction, walkFrame, scale, options);
  }
  function drawBeastkillPose(ctx, x, y, direction, walkFrame, scale, options) {
    return drawSheetPose(BeastkillStore, BEASTKILL_POSE_BASE_H, '__beastkillPose', ctx, x, y, direction, walkFrame, scale, options);
  }
  /** pose-sheet 风格注册表：styleKey → { store, poseOptKey, baseH, draw }；非雪碧图风格返回 null */
  function poseSheetCfg(styleKey) {
    switch (styleKey) {
      case 'kaai':     return { store: KaaiStore, poseOptKey: '__kaaiPose', baseH: KAAI_POSE_BASE_H, draw: drawKaaiPose };
      case 'wolfkill': return { store: WolfkillStore, poseOptKey: '__wolfkillPose', baseH: WOLFKILL_POSE_BASE_H, draw: drawWolfkillPose };
      case 'beastkill': return { store: BeastkillStore, poseOptKey: '__beastkillPose', baseH: BEASTKILL_POSE_BASE_H, draw: drawBeastkillPose };
      default: return null;
    }
  }

  /** 动态注册单张头像（用于 demo / 运行时） */
  function registerAvatarImage(avatarKey, dataUrl) {
    if (!avatarKey || !dataUrl) return false;
    AVATAR_IMAGE_DATA[avatarKey] = dataUrl;
    // 清缓存，保证下次重新裁切
    if (StyleImageStore && StyleImageStore.cache && StyleImageStore.cache.has(avatarKey)) {
      StyleImageStore.cache.delete(avatarKey);
    }
    return true;
  }
  /** 给某风格的物种头像池追加 */
  function addStyleAvatarPool(styleKey, type, avatarKeys) {
    if (!STYLE_AVATAR_POOL[styleKey]) STYLE_AVATAR_POOL[styleKey] = { person: [], cat: [], dog: [], rabbit: [] };
    if (!STYLE_AVATAR_POOL[styleKey][type]) STYLE_AVATAR_POOL[styleKey][type] = [];
    const arr = Array.isArray(avatarKeys) ? avatarKeys : [avatarKeys];
    arr.forEach(k => { if (k && STYLE_AVATAR_POOL[styleKey][type].indexOf(k) < 0) STYLE_AVATAR_POOL[styleKey][type].push(k); });
    return true;
  }
  /** 按物种从当前风格头像池随机抽一张 key；无则返回 '' */
  function pickAvatarForStyle(styleKey, type) {
    const sk = styleKey || CURRENT_STYLE_KEY || 'kaai';
    const pool = ((STYLE_AVATAR_POOL[sk] || {})[type]) || [];
    if (!pool.length) return '';
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function _getAvatarImageData(avatarKey) {
    if (!avatarKey) return '';
    if (AVATAR_IMAGE_DATA[avatarKey]) return AVATAR_IMAGE_DATA[avatarKey];
    try {
      const g = (global && global.__JMW_AVATAR_IMAGES__) ? global.__JMW_AVATAR_IMAGES__ : null;
      if (g && g[avatarKey]) return g[avatarKey];
    } catch (_) {}
    return '';
  }
  // 外部构建脚本会把 base64 塞进来；也允许运行时动态 register（demo/本地路径）
  function registerStyleImage(key, dataUrl) {
    if (!key || !dataUrl) return false;
    STYLE_IMAGE_DATA[key] = dataUrl;
    // 清掉 image cache，让下次重新解码
    if (StyleImageStore && StyleImageStore.cache) {
      const entry = StyleImageStore.cache.get(key);
      if (entry) {
        StyleImageStore.cache.delete(key);
        try { if (entry.canvas) { entry.canvas.width = 1; entry.canvas.height = 1; } } catch (_) {}
      }
    }
    return true;
  }
  const StyleImageStore = {
    cache: new Map(), // key(styleKey 或 avatarKey) -> { promise, image, canvas, rect, ready }
  };
  /** 取风格封面图（控制面板卡片预览用）；'' 代表无图（面板回退渐变色块） */
  function getStyleCover(styleKey) {
    const k = styleKey || CURRENT_STYLE_KEY;
    if (STYLE_COVER_DATA[k]) return resolveImageSrc(STYLE_COVER_DATA[k]);
    try {
      if (global.__JMW_STYLE_COVERS__ && global.__JMW_STYLE_COVERS__[k]) {
        return resolveImageSrc(global.__JMW_STYLE_COVERS__[k]);
      }
    } catch (_) {}
    return '';
  }
  /** 按风格或头像 key 取对应的 DataURI；'' 代表无图 */
  function _getStyleImageData(key) {
    const k = key || CURRENT_STYLE_KEY;
    // 优先查「单角色头像池」字典：如果 key 本身就是头像 key（构建脚本给的命名/玩家传的）
    if (AVATAR_IMAGE_DATA[k]) return AVATAR_IMAGE_DATA[k];
    try {
      if (global.__JMW_AVATAR_IMAGES__ && global.__JMW_AVATAR_IMAGES__[k]) return global.__JMW_AVATAR_IMAGES__[k];
    } catch (_) {}
    // 再退到「风格级默认形象图」
    if (STYLE_IMAGE_DATA[k]) return STYLE_IMAGE_DATA[k];
    try {
      if (global.__JMW_STYLE_IMAGES__ && global.__JMW_STYLE_IMAGES__[k]) return global.__JMW_STYLE_IMAGES__[k];
    } catch (_) {}
    return '';
  }
  /** 列出「当前风格下所有可能的形象 key」（用于预加载） */
  function _listImageKeysForStyle(styleKey) {
    const sk = styleKey || CURRENT_STYLE_KEY;
    const keys = [];
    if (_getStyleImageData(sk)) keys.push(sk);
    const pools = STYLE_AVATAR_POOL[sk] || {};
    Object.keys(pools).forEach(type => {
      (pools[type] || []).forEach(ak => { if (keys.indexOf(ak) < 0 && _getAvatarImageData(ak)) keys.push(ak); });
    });
    return keys;
  }
  /** 异步预加载 / 缓存某形象（styleKey 或 avatarKey 都可以）的裁切后卡贴离屏 canvas */
  function loadStyleSprite(key, force) {
    const k = key || CURRENT_STYLE_KEY;
    let entry = StyleImageStore.cache.get(k);
    if (entry && entry.ready && !force) return Promise.resolve(entry);
    if (entry && entry.promise && !force) return entry.promise;
    const dataUrl = _getStyleImageData(k);
    const p = new Promise((resolve, reject) => {
      if (!dataUrl) { resolve(null); return; }
      const img = (typeof Image !== 'undefined') ? new Image() : null;
      if (!img) { resolve(null); return; }
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const off = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
          if (!off) { resolve(null); return; }
          let rect;
          // 原生成图是 1920×1920 的全身概念图：把「中下部主体」裁切为 1 : 1.5 卡片
          const W = img.naturalWidth || 1920;
          const H = img.naturalHeight || 1920;
          const sx = Math.round(W * 0.20);
          const sw = Math.round(W * 0.60);
          const sy = Math.round(H * 0.06);
          const sh = Math.round(H * 0.90);
          // 目标宽高比约 2:3，显示为「竖版人物立绘」
          const targetW = 256;
          const targetH = Math.round(targetW * (sh / sw));
          off.width = targetW; off.height = targetH;
          const octx = off.getContext('2d');
          octx.imageSmoothingEnabled = true;
          octx.imageSmoothingQuality = 'high';
          octx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
          rect = { w: targetW, h: targetH, aspect: targetW / targetH };
          entry = { promise: p, image: img, canvas: off, rect, ready: true, key: k };
          StyleImageStore.cache.set(k, entry);
          resolve(entry);
        } catch (e) { reject(e); }
      };
      img.onerror = (e) => { reject(e || new Error('img.onerror:' + k)); };
      assignImgSrc(img, dataUrl);
    }).catch(err => {
      console.warn('[StyleImage] load failed:', k, err && err.message || err);
      // 失败也要落一个占位，避免反复加载
      const failEntry = { promise: p, image: null, canvas: null, rect: null, ready: false, key: k };
      StyleImageStore.cache.set(k, failEntry);
      return null;
    });
    if (!entry || force) {
      StyleImageStore.cache.set(k, { promise: p, image: null, canvas: null, rect: null, ready: false, key: k });
    }
    return p;
  }
  /** 启动时一次性预加载当前风格 + 其余队列（后台低优先级） */
  function preloadStyleSprites(activeKey) {
    const active = activeKey || CURRENT_STYLE_KEY;
    const activeKeys = _listImageKeysForStyle(active);
    if (activeKeys.length) {
      // 活动风格立刻预加载
      activeKeys.forEach((k, idx) => setTimeout(() => loadStyleSprite(k), idx * 60));
    }
    // 其他风格：延迟后逐个预加载
    const restStyles = Object.keys(STYLE_PROFILES).filter(s => s !== active);
    let i = 0;
    const tick = () => {
      if (i >= restStyles.length) return;
      const sk = restStyles[i++];
      const arr = _listImageKeysForStyle(sk);
      arr.forEach((k, idx) => setTimeout(() => loadStyleSprite(k), idx * 250));
      setTimeout(tick, 1400);
    };
    setTimeout(tick, 2000);
  }
  /**
   * 使用形象图绘制角色（立绘卡贴 + 阴影 + 走路小弹跳）。
   * 支持两个层级：options.__avatarKey（单角色立绘）> options.__styleKey（风格级立绘）。
   * 如果图片未就绪/未嵌入，返回 null 让调用者 fallback 到矢量。
   */
  function drawImageCharacter(ctx, x, y, type, direction, walkFrame, scale, options) {
    const styleKey = (options && options.__styleKey) || CURRENT_STYLE_KEY;
    const avatarKey = options && options.__avatarKey ? String(options.__avatarKey) : '';
    // 优先按单角色头像 key 取；没有再按风格默认图
    const key = (avatarKey && _getAvatarImageData(avatarKey)) ? avatarKey : styleKey;
    const entry = StyleImageStore.cache.get(key);
    if (!entry || !entry.ready || !entry.canvas || !entry.rect) {
      // 触发异步加载；本帧交给矢量 fallback
      loadStyleSprite(key);
      return null;
    }
    const { canvas: srcCanvas, rect } = entry;
    const srcW = rect.w, srcH = rect.h;
    // 1 logic unit = 1px. scale 约等于 0.95~1.5，乘以基高 110 得到最终角色高度
    const baseH = 165; // 110 × 1.5
    const dstH = Math.max(40, Math.round(baseH * scale));
    const dstW = Math.max(20, Math.round(dstH * (srcW / srcH)));
    // walk bounce：帧 0/2 踩下，1/3 抬起
    const bounce = ((walkFrame === 1 || walkFrame === 3) ? -Math.max(1, Math.round(2 * scale)) : 0);
    const flipX = (direction === 'left');
    // 底部阴影（贴地，脚的位置）
    ctx.save();
    const shadowY = y - 1;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(x + dstW / 2, shadowY, dstW * 0.34, Math.max(2, 3 * scale), 0, 0, Math.PI * 2);
    ctx.fill();
    // 画布翻转（实现左右朝向）
    if (flipX) {
      ctx.translate(x + dstW, 0);
      ctx.scale(-1, 1);
      ctx.translate(-x, 0);
    }
    // 立绘卡贴 + 白边 + 轻微阴影外发光
    const drawX = x;
    const drawY = y - dstH + bounce;
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = Math.max(2, 4 * scale);
    ctx.shadowOffsetY = Math.max(1, Math.round(2 * scale));
    // 白底圆角卡（很淡，确保透明背景下也看得见轮廓）
    const pad = Math.max(1, Math.round(2 * scale));
    roundRect(ctx, drawX - pad, drawY - pad, dstW + pad * 2, dstH + pad * 2, Math.max(3, Math.round(6 * scale)));
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fill();
    // 裁图本身用 clip 进圆角
    ctx.save();
    roundRect(ctx, drawX, drawY, dstW, dstH, Math.max(2, Math.round(5 * scale)));
    ctx.clip();
    ctx.drawImage(srcCanvas, 0, 0, srcW, srcH, drawX, drawY, dstW, dstH);
    ctx.restore();
    // 非常薄的描边
    ctx.lineWidth = Math.max(1, Math.round(1 * scale));
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    roundRect(ctx, drawX - pad, drawY - pad, dstW + pad * 2, dstH + pad * 2, Math.max(3, Math.round(6 * scale)));
    ctx.stroke();
    ctx.restore();
    return { width: dstW, height: dstH };
  }
  /** 兼容旧环境（旧版 Image 或 document 不可用）时的 helper */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /** 获取当前可用风格列表（按展示顺序，排除 flat-vector） */
  function listCharacterStyles() {
    const order = ['kaai', 'wolfkill', 'beastkill'];
    return order.filter(k => STYLE_PROFILES[k]).map(k => ({
      key: STYLE_PROFILES[k].key,
      label: STYLE_PROFILES[k].label,
      desc: STYLE_PROFILES[k].desc,
      active: k === CURRENT_STYLE_KEY,
    }));
  }

  /** 应用指定风格（色板 + 配件偏好），成功返回 true，失败返回 false */
  function applyCharacterStyle(key) {
    if (!key || !STYLE_PROFILES[key]) return false;
    const p = STYLE_PROFILES[key].palette;
    COLOR_PALETTE = Object.assign({
      skin: DEFAULT_PALETTE.skin, hair: DEFAULT_PALETTE.hair,
      clothes: DEFAULT_PALETTE.clothes, catFur: DEFAULT_PALETTE.catFur,
      dogFur: DEFAULT_PALETTE.dogFur, rabbitFur: DEFAULT_PALETTE.rabbitFur,
      eyes: DEFAULT_PALETTE.eyes, collars: DEFAULT_PALETTE.collars,
      pants: DEFAULT_PALETTE.pants,
    }, p || {});
    CURRENT_STYLE_KEY = key;
    return true;
  }

  function _styleProfile() {
    return STYLE_PROFILES[CURRENT_STYLE_KEY] || STYLE_PROFILES.kaai;
  }

  // ============ 装饰品绘制 ============
  function drawAccessory(ctx, accessory, x, y, scale, headW, headH) {
    const cx = x + headW / 2;
    const cy = y;

    switch (accessory) {
      case 'santa-hat':
        // 圣诞帽
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(cx - headW * 0.55, cy);
        ctx.lineTo(cx + headW * 0.1, cy - headH * 0.8);
        ctx.lineTo(cx + headW * 0.55, cy);
        ctx.closePath();
        ctx.fill();
        // 白色毛边
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(cx - headW * 0.6, cy - headH * 0.05, headW * 1.2, headH * 0.15);
        // 帽顶白球
        ctx.beginPath();
        ctx.arc(cx + headW * 0.1, cy - headH * 0.8, headH * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'halo':
        // 光环
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = Math.max(2, scale * 0.6);
        ctx.beginPath();
        ctx.ellipse(cx, cy - headH * 0.5, headW * 0.55, headH * 0.15, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 光晕
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = Math.max(4, scale * 1.2);
        ctx.beginPath();
        ctx.ellipse(cx, cy - headH * 0.5, headW * 0.6, headH * 0.18, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;

      case 'bow':
        // 蝴蝶结
        ctx.fillStyle = '#FF69B4';
        const bx = cx - headW * 0.3;
        const by = cy - headH * 0.15;
        // 左结
        ctx.beginPath();
        ctx.ellipse(bx - headW * 0.12, by, headW * 0.15, headH * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();
        // 右结
        ctx.beginPath();
        ctx.ellipse(bx + headW * 0.12, by, headW * 0.15, headH * 0.18, 0.3, 0, Math.PI * 2);
        ctx.fill();
        // 中心
        ctx.fillStyle = '#FF1493';
        ctx.beginPath();
        ctx.arc(bx, by, headH * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'bunny-ears':
        // 兔耳朵（线稿风：两只长耳）
        ctx.strokeStyle = '#1A1A1A';
        ctx.lineWidth = Math.max(1.2, scale * 0.5);
        ctx.lineCap = 'round';
        ctx.fillStyle = '#FFFFFF';
        [[-0.28, -0.18], [0.22, 0.15]].forEach(([dx, tilt]) => {
          ctx.beginPath();
          ctx.ellipse(cx + dx * headW, cy - headH * 0.62, headW * 0.14, headH * 0.5, tilt, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        // 内耳淡粉
        ctx.fillStyle = 'rgba(255,180,190,0.6)';
        ctx.beginPath();
        ctx.ellipse(cx - 0.28 * headW, cy - headH * 0.62, headW * 0.06, headH * 0.3, -0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 0.22 * headW, cy - headH * 0.62, headW * 0.06, headH * 0.3, 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'duck':
        // 头顶小黄鸭（线稿风）
        ctx.strokeStyle = '#1A1A1A';
        ctx.lineWidth = Math.max(1.2, scale * 0.5);
        ctx.fillStyle = '#FFD93B';
        // 鸭身
        ctx.beginPath();
        ctx.arc(cx + headW * 0.1, cy - headH * 0.42, headW * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 鸭头
        ctx.beginPath();
        ctx.arc(cx + headW * 0.28, cy - headH * 0.68, headW * 0.13, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // 鸭嘴
        ctx.fillStyle = '#F08C00';
        ctx.beginPath();
        ctx.moveTo(cx + headW * 0.38, cy - headH * 0.68);
        ctx.lineTo(cx + headW * 0.55, cy - headH * 0.62);
        ctx.lineTo(cx + headW * 0.38, cy - headH * 0.58);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 眼睛
        ctx.fillStyle = '#1A1A1A';
        ctx.beginPath();
        ctx.arc(cx + headW * 0.31, cy - headH * 0.72, Math.max(1, headW * 0.035), 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'antlers':
        // 鹿角
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = Math.max(2, scale * 0.5);
        ctx.lineCap = 'round';
        // 左鹿角
        ctx.beginPath();
        ctx.moveTo(cx - headW * 0.25, cy - headH * 0.05);
        ctx.lineTo(cx - headW * 0.35, cy - headH * 0.5);
        ctx.lineTo(cx - headW * 0.5, cy - headH * 0.6);
        ctx.moveTo(cx - headW * 0.35, cy - headH * 0.45);
        ctx.lineTo(cx - headW * 0.2, cy - headH * 0.7);
        ctx.stroke();
        // 右鹿角
        ctx.beginPath();
        ctx.moveTo(cx + headW * 0.25, cy - headH * 0.05);
        ctx.lineTo(cx + headW * 0.35, cy - headH * 0.5);
        ctx.lineTo(cx + headW * 0.5, cy - headH * 0.6);
        ctx.moveTo(cx + headW * 0.35, cy - headH * 0.45);
        ctx.lineTo(cx + headW * 0.2, cy - headH * 0.7);
        ctx.stroke();
        break;

      case 'flower':
        // 小花
        const fx = cx + headW * 0.2;
        const fy = cy - headH * 0.1;
        ctx.fillStyle = '#FF6B9D';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.ellipse(
            fx + Math.cos(angle) * headH * 0.1,
            fy + Math.sin(angle) * headH * 0.1,
            headH * 0.08, headH * 0.12,
            angle, 0, Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(fx, fy, headH * 0.07, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'glasses':
        // 眼镜
        ctx.strokeStyle = '#2C2C2C';
        ctx.lineWidth = Math.max(1.5, scale * 0.4);
        const eyeY = y + headH * 0.45;
        // 左镜片
        ctx.beginPath();
        ctx.arc(cx - headW * 0.22, eyeY, headW * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        // 右镜片
        ctx.beginPath();
        ctx.arc(cx + headW * 0.22, eyeY, headW * 0.18, 0, Math.PI * 2);
        ctx.stroke();
        // 鼻梁
        ctx.beginPath();
        ctx.moveTo(cx - headW * 0.04, eyeY);
        ctx.lineTo(cx + headW * 0.04, eyeY);
        ctx.stroke();
        break;

      case 'beard':
        // 胡子
        ctx.fillStyle = '#2C2C2C';
        ctx.beginPath();
        ctx.moveTo(cx - headW * 0.3, y + headH * 0.7);
        ctx.lineTo(cx, y + headH * 1.1);
        ctx.lineTo(cx + headW * 0.3, y + headH * 0.7);
        ctx.closePath();
        ctx.fill();
        break;

      case 'crown':
        // 皇冠
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(cx - headW * 0.4, cy - headH * 0.05);
        ctx.lineTo(cx - headW * 0.3, cy - headH * 0.45);
        ctx.lineTo(cx - headW * 0.15, cy - headH * 0.2);
        ctx.lineTo(cx, cy - headH * 0.55);
        ctx.lineTo(cx + headW * 0.15, cy - headH * 0.2);
        ctx.lineTo(cx + headW * 0.3, cy - headH * 0.45);
        ctx.lineTo(cx + headW * 0.4, cy - headH * 0.05);
        ctx.closePath();
        ctx.fill();
        // 宝石
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.arc(cx, cy - headH * 0.25, headH * 0.06, 0, Math.PI * 2);
        ctx.fill();
        break;

      default:
        break;
    }
  }

  // ============ 人物绘制 ============
  function drawPerson(ctx, x, y, direction, walkFrame, scale, options) {
    ctx.save();
    const s = scale;
    const dir = direction === 'right' ? 1 : -1;

    // 如果朝左，镜像翻转
    if (dir === -1) {
      ctx.translate(x + 20 * s, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    // 各部分尺寸
    const headW = 18 * s;
    const headH = 20 * s;
    const bodyW = 20 * s;
    const bodyH = 28 * s;
    const legW = 6 * s;
    const legH = 18 * s;
    const armW = 5 * s;
    const armH = 20 * s;

    // 走路动画偏移
    // walkFrame: 0=双脚落地, 1=左脚前, 2=过渡, 3=右脚前
    const walkPhase = (walkFrame % 4) / 4;
    const legSwing = Math.sin(walkPhase * Math.PI * 2) * 4 * s;
    const armSwing = Math.sin(walkPhase * Math.PI * 2 + Math.PI) * 3 * s;
    const bobOffset = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 1.5 * s; // 上下浮动

    const actualX = x;
    const actualY = y - bobOffset;

    // 腿
    ctx.fillStyle = options.pantsColor || '#2C3E50';
    // 左腿
    ctx.fillRect(
      actualX + bodyW * 0.25 - legW / 2,
      actualY + headH + bodyH,
      legW,
      legH + (walkFrame === 1 ? -legSwing : 0)
    );
    // 右腿
    ctx.fillRect(
      actualX + bodyW * 0.75 - legW / 2,
      actualY + headH + bodyH,
      legW,
      legH + (walkFrame === 3 ? legSwing : 0)
    );

    // 脚/鞋
    ctx.fillStyle = '#2C2C2C';
    const shoeH = 3 * s;
    const shoeW = 8 * s;
    ctx.fillRect(
      actualX + bodyW * 0.25 - shoeW / 2 + (walkFrame === 1 ? legSwing * 0.5 : 0),
      actualY + headH + bodyH + legH - shoeH * 0.5,
      shoeW, shoeH
    );
    ctx.fillRect(
      actualX + bodyW * 0.75 - shoeW / 2 + (walkFrame === 3 ? -legSwing * 0.5 : 0),
      actualY + headH + bodyH + legH - shoeH * 0.5,
      shoeW, shoeH
    );

    // 身体（衣服）
    ctx.fillStyle = options.color || '#3498DB';
    // 衣服主体
    const bodyX = actualX;
    const bodyY = actualY + headH;
    ctx.beginPath();
    ctx.moveTo(bodyX + 2 * s, bodyY);
    ctx.lineTo(bodyX + bodyW - 2 * s, bodyY);
    ctx.lineTo(bodyX + bodyW - 1 * s, bodyY + bodyH);
    ctx.lineTo(bodyX + 1 * s, bodyY + bodyH);
    ctx.closePath();
    ctx.fill();

    // 手臂
    ctx.fillStyle = options.color || '#3498DB';
    // 左臂
    ctx.fillRect(
      actualX - armW * 0.8,
      bodyY + 2 * s + armSwing,
      armW,
      armH
    );
    // 右臂
    ctx.fillRect(
      actualX + bodyW - armW * 0.2,
      bodyY + 2 * s - armSwing,
      armW,
      armH
    );

    // 手
    ctx.fillStyle = options.skinColor || '#FFE0BD';
    ctx.beginPath();
    ctx.arc(
      actualX - armW * 0.8 + armW / 2,
      bodyY + 2 * s + armSwing + armH,
      armW * 0.7, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      actualX + bodyW - armW * 0.2 + armW / 2,
      bodyY + 2 * s - armSwing + armH,
      armW * 0.7, 0, Math.PI * 2
    );
    ctx.fill();

    // 脖子
    ctx.fillStyle = options.skinColor || '#FFE0BD';
    ctx.fillRect(actualX + bodyW * 0.35, bodyY - 3 * s, bodyW * 0.3, 4 * s);

    // 头部
    const headX = actualX + (bodyW - headW) / 2;
    const headY = actualY;

    // 头发（后层）
    if (options.hairStyle === 'long') {
      ctx.fillStyle = options.hairColor || '#2C2C2C';
      ctx.fillRect(headX - 1 * s, headY + 2 * s, headW + 2 * s, headH * 0.9);
    } else if (options.hairStyle === 'bun') {
      ctx.fillStyle = options.hairColor || '#2C2C2C';
      // 发髻
      ctx.beginPath();
      ctx.arc(headX + headW * 0.5, headY - 2 * s, headW * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // 脸
    ctx.fillStyle = options.skinColor || '#FFE0BD';
    ctx.beginPath();
    ctx.ellipse(
      headX + headW / 2, headY + headH / 2 + 1 * s,
      headW / 2, headH / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 头发（前层/刘海）
    ctx.fillStyle = options.hairColor || '#2C2C2C';
    switch (options.hairStyle) {
      case 'short':
        ctx.beginPath();
        ctx.arc(headX + headW / 2, headY + headH * 0.25, headW * 0.55, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(headX - 1 * s, headY + headH * 0.1, 2 * s, headH * 0.3);
        ctx.fillRect(headX + headW - 1 * s, headY + headH * 0.1, 2 * s, headH * 0.3);
        break;
      case 'long':
        // 刘海
        ctx.beginPath();
        ctx.moveTo(headX - 1 * s, headY + headH * 0.4);
        ctx.quadraticCurveTo(headX + headW / 2, headY - 1 * s, headX + headW + 1 * s, headY + headH * 0.4);
        ctx.lineTo(headX + headW + 1 * s, headY + headH * 0.5);
        ctx.quadraticCurveTo(headX + headW / 2, headY + headH * 0.2, headX - 1 * s, headY + headH * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      case 'curly':
        for (let i = 0; i < 5; i++) {
          const cx = headX + headW * (0.15 + i * 0.18);
          ctx.beginPath();
          ctx.arc(cx, headY + headH * 0.2, headW * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillRect(headX - 1 * s, headY + headH * 0.1, headW + 2 * s, headH * 0.3);
        break;
      case 'bun':
        // 刘海
        ctx.beginPath();
        ctx.arc(headX + headW / 2, headY + headH * 0.3, headW * 0.5, Math.PI, 0);
        ctx.fill();
        break;
      case 'bald':
      default:
        // 光头或极短
        if (options.hairStyle === 'bald') break;
        ctx.beginPath();
        ctx.arc(headX + headW / 2, headY + headH * 0.28, headW * 0.52, Math.PI, 0);
        ctx.fill();
        break;
    }

    // 耳朵
    ctx.fillStyle = options.skinColor || '#FFE0BD';
    ctx.beginPath();
    ctx.arc(headX + 1 * s, headY + headH * 0.5, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW - 1 * s, headY + headH * 0.5, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    const eyeY = headY + headH * 0.48;
    const eyeSize = Math.max(1.2, 1.5 * s);
    ctx.fillStyle = '#2C2C2C';
    // 左眼
    ctx.beginPath();
    ctx.arc(headX + headW * 0.35, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();
    // 右眼
    ctx.beginPath();
    ctx.arc(headX + headW * 0.65, eyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.35 + 0.3 * s, eyeY - 0.3 * s, eyeSize * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW * 0.65 + 0.3 * s, eyeY - 0.3 * s, eyeSize * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // 眉毛
    ctx.strokeStyle = options.hairColor || '#2C2C2C';
    ctx.lineWidth = Math.max(1, s * 0.8);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.25, headY + headH * 0.38);
    ctx.lineTo(headX + headW * 0.45, headY + headH * 0.38);
    ctx.moveTo(headX + headW * 0.55, headY + headH * 0.38);
    ctx.lineTo(headX + headW * 0.75, headY + headH * 0.38);
    ctx.stroke();

    // 鼻子
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.arc(headX + headW / 2, headY + headH * 0.58, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = Math.max(1, s * 0.6);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(headX + headW / 2, headY + headH * 0.7, headW * 0.12, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    // 腮红
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.2, headY + headH * 0.65, headW * 0.08, headH * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.8, headY + headH * 0.65, headW * 0.08, headH * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    // 装饰品
    if (options.accessory) {
      drawAccessory(ctx, options.accessory, headX, headY, s, headW, headH);
    }

    ctx.restore();
  }

  // ============ 黑白线稿矢量兜底（kaai 雪碧图未加载时使用） ============
  // 契约与 drawPerson 一致：x=左边缘, y=头顶所在的盒子顶部，人物总高 80*s，宽 20*s，脚底落在 y+80*s
  function drawDoodlePerson(ctx, x, y, direction, walkFrame, scale, options) {
    const s = scale;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const ink = options.hairColor || '#1A1A1A';
    const lw = Math.max(1.2, 1.5 * s);

    // 朝左时镜像
    if (direction !== 'right') {
      ctx.translate(x + 20 * s, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    // 走路相位：0=双脚落地, 1=左脚前, 2=过渡, 3=右脚前
    const walkPhase = (walkFrame % 4) / 4;
    const legSwing = Math.sin(walkPhase * Math.PI * 2) * 3.6 * s;
    const armSwing = -legSwing * 0.7;
    const bob = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 1.2 * s;
    ctx.translate(0, -bob);

    const cx = x + 10 * s;          // 身体中轴
    const headW = 17 * s, headH = 17 * s;
    const headX = cx - headW / 2;
    const headY = y + 1.5 * s;
    const hcy = headY + headH / 2;  // 头心

    // 腿（先画，被衣摆压住上端）
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    const hipY = y + 42 * s;
    const footY = y + 77.5 * s;
    const lLegX = cx - 3.2 * s, rLegX = cx + 3.2 * s;
    ctx.beginPath();
    ctx.moveTo(lLegX, hipY);
    ctx.lineTo(lLegX + legSwing, footY);
    ctx.moveTo(rLegX, hipY);
    ctx.lineTo(rLegX - legSwing, footY);
    ctx.stroke();
    // 简笔鞋（朝向侧的小横线）
    ctx.beginPath();
    ctx.moveTo(lLegX + legSwing - 1.5 * s, footY + 1 * s);
    ctx.lineTo(lLegX + legSwing + 4 * s, footY + 1 * s);
    ctx.moveTo(rLegX - legSwing - 1.5 * s, footY + 1 * s);
    ctx.lineTo(rLegX - legSwing + 4 * s, footY + 1 * s);
    ctx.stroke();

    // 身体：白 T 恤描边
    roundRect(ctx, x + 1.5 * s, y + 19 * s, 17 * s, 24 * s, 5 * s);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    ctx.stroke();
    // 衣领小弧
    ctx.beginPath();
    ctx.arc(cx, y + 20 * s, 3 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // 手臂（白袖简化为两条摆动线）
    const shoulderY = y + 23 * s;
    const handY = y + 39 * s;
    ctx.beginPath();
    ctx.moveTo(x + 3 * s, shoulderY);
    ctx.lineTo(x + 3 * s + armSwing, handY);
    ctx.moveTo(x + 17 * s, shoulderY);
    ctx.lineTo(x + 17 * s - armSwing, handY);
    ctx.stroke();

    // 头：大白圆
    ctx.beginPath();
    ctx.arc(cx, hcy, headW / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();

    // 头发：实心黑块（短/长/卷/丸子/光头）
    ctx.fillStyle = ink;
    const capR = headW / 2 + 0.4 * s;
    switch (options.hairStyle) {
      case 'short':
        ctx.beginPath();
        ctx.arc(cx, hcy, capR, Math.PI * 1.05, -Math.PI * 0.08);
        ctx.closePath();
        ctx.fill();
        break;
      case 'long':
        ctx.beginPath();
        ctx.arc(cx, hcy, capR, Math.PI * 1.02, -Math.PI * 0.05);
        ctx.closePath();
        ctx.fill();
        // 两侧垂发
        ctx.fillRect(cx - headW / 2 - 0.6 * s, hcy, 3.2 * s, 12 * s);
        ctx.fillRect(cx + headW / 2 - 2.6 * s, hcy, 3.2 * s, 12 * s);
        break;
      case 'curly':
        [[-5.5, -3], [0, -6], [5.5, -3], [-3, -1], [3, -1]].forEach(([dx, dy]) => {
          ctx.beginPath();
          ctx.arc(cx + dx * s, hcy + dy * s, 3.4 * s, 0, Math.PI * 2);
          ctx.fill();
        });
        break;
      case 'bun':
        ctx.beginPath();
        ctx.arc(cx, hcy, capR, Math.PI * 1.05, -Math.PI * 0.08);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, headY - 1.5 * s, 3.2 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'bald':
      default:
        break;
    }

    // 点点眼（朝向侧）+ 简笔嘴
    const eyeY = hcy + 1.5 * s;
    ctx.beginPath();
    ctx.arc(cx - 2.2 * s, eyeY, 1.2 * s, 0, Math.PI * 2);
    ctx.arc(cx + 3.6 * s, eyeY, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, 1 * s);
    ctx.beginPath();
    ctx.arc(cx + 0.8 * s, eyeY + 2.6 * s, 2 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // 配件（复用现有装饰系统：光环/皇冠/小花/兔耳/鸭鸭/圣诞帽/蝴蝶结）
    if (options.accessory) {
      drawAccessory(ctx, options.accessory, headX, headY, s, headW, headH);
    }

    ctx.restore();
  }

  // 简笔小动物（猫/狗/兔共用线稿，耳朵/尾巴区分），盒子约 52*s 宽 × 55*s 高，脚底落在 y+h*s
  function drawDoodlePet(ctx, x, y, direction, walkFrame, scale, options, species) {
    const s = scale;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const ink = '#1A1A1A';
    const lw = Math.max(1.2, 1.5 * s);

    if (direction !== 'right') {
      ctx.translate(x + 52 * s, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    const boxW = species === 'dog' ? 52 : 45;
    const boxH = species === 'rabbit' ? 55 : species === 'dog' ? 52 : 45;
    const walkPhase = (walkFrame % 4) / 4;
    const legSwing = Math.sin(walkPhase * Math.PI * 2) * 2.6 * s;
    const bob = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 1 * s;
    ctx.translate(0, -bob);

    const footY = y + (boxH - 2) * s;
    const bodyCx = x + boxW * 0.42 * s;
    const bodyCy = y + boxH * 0.58 * s;
    const bodyRx = boxW * 0.26 * s;
    const bodyRy = boxH * 0.18 * s;
    const headR = boxW * 0.155 * s;
    const headCx = x + boxW * 0.76 * s;
    const headCy = y + boxH * 0.34 * s;

    // 四条腿
    ctx.strokeStyle = ink;
    ctx.lineWidth = lw;
    const legs = [
      [bodyCx - bodyRx * 0.55, legSwing],
      [bodyCx + bodyRx * 0.35, -legSwing],
      [bodyCx + bodyRx * 0.75, legSwing],
      [bodyCx - bodyRx * 0.05, -legSwing],
    ];
    legs.forEach(([lx, sw]) => {
      ctx.beginPath();
      ctx.moveTo(lx, bodyCy + bodyRy * 0.6);
      ctx.lineTo(lx + sw, footY);
      ctx.stroke();
    });

    // 尾巴
    ctx.beginPath();
    if (species === 'cat') {
      // 上翘长尾
      ctx.moveTo(bodyCx - bodyRx, bodyCy);
      ctx.quadraticCurveTo(bodyCx - bodyRx - 10 * s, bodyCy - 6 * s, bodyCx - bodyRx - 7 * s, bodyCy - 16 * s);
    } else if (species === 'dog') {
      ctx.moveTo(bodyCx - bodyRx, bodyCy - 2 * s);
      ctx.quadraticCurveTo(bodyCx - bodyRx - 7 * s, bodyCy - 8 * s, bodyCx - bodyRx - 4 * s, bodyCy - 13 * s);
    } else {
      // 兔：圆绒球
      ctx.arc(bodyCx - bodyRx - 2 * s, bodyCy - 2 * s, 3.2 * s, 0, Math.PI * 2);
    }
    ctx.stroke();

    // 身体 + 头（白底描边）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(bodyCx, bodyCy, bodyRx, bodyRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headCx, headCy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 耳朵
    if (species === 'cat') {
      ctx.beginPath();
      ctx.moveTo(headCx - headR * 0.75, headCy - headR * 0.55);
      ctx.lineTo(headCx - headR * 0.55, headCy - headR * 1.7);
      ctx.lineTo(headCx - headR * 0.05, headCy - headR * 0.9);
      ctx.moveTo(headCx + headR * 0.15, headCy - headR * 0.95);
      ctx.lineTo(headCx + headR * 0.55, headCy - headR * 1.75);
      ctx.lineTo(headCx + headR * 0.9, headCy - headR * 0.6);
      ctx.stroke();
    } else if (species === 'dog') {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.7, headCy - headR * 0.55, headR * 0.34, headR * 0.72, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headCx + headR * 0.55, headCy - headR * 0.6, headR * 0.34, headR * 0.72, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(headCx - headR * 0.4, headCy - headR * 1.55, headR * 0.26, headR * 1.15, -0.18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(headCx + headR * 0.3, headCy - headR * 1.6, headR * 0.26, headR * 1.15, 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 脸：点点眼 + 鼻/胡须
    ctx.fillStyle = ink;
    const eyeDx = headR * 0.42;
    ctx.beginPath();
    ctx.arc(headCx - eyeDx * 0.5, headCy - headR * 0.05, 1.1 * s, 0, Math.PI * 2);
    ctx.arc(headCx + eyeDx * 1.1, headCy - headR * 0.05, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    if (species === 'cat') {
      ctx.lineWidth = Math.max(1, 0.9 * s);
      ctx.beginPath();
      ctx.moveTo(headCx + headR * 0.55, headCy + headR * 0.35);
      ctx.lineTo(headCx + headR * 1.5, headCy + headR * 0.2);
      ctx.moveTo(headCx + headR * 0.55, headCy + headR * 0.65);
      ctx.lineTo(headCx + headR * 1.5, headCy + headR * 0.8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(headCx + headR * 0.75, headCy + headR * 0.45, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    if (options.accessory) {
      drawAccessory(ctx, options.accessory, headCx - headR, headCy - headR, s, headR * 2, headR * 2);
    }

    ctx.restore();
  }

  // ============ 猫绘制 ============
  function drawCat(ctx, x, y, direction, walkFrame, scale, options) {
    ctx.save();
    const s = scale;
    const dir = direction === 'right' ? 1 : -1;

    if (dir === -1) {
      ctx.translate(x + 28 * s, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    const walkPhase = (walkFrame % 4) / 4;
    const legSwing = Math.sin(walkPhase * Math.PI * 2) * 3 * s;
    const bobOffset = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 1 * s;

    const actualX = x;
    const actualY = y - bobOffset;

    const bodyW = 28 * s;
    const bodyH = 14 * s;
    const headW = 16 * s;
    const headH = 14 * s;
    const legH = 10 * s;
    const tailLen = 18 * s;
    const furColor = options.color || '#FFA500';

    // 尾巴
    ctx.strokeStyle = furColor;
    ctx.lineWidth = 4 * s;
    ctx.lineCap = 'round';
    const tailWave = Math.sin(walkPhase * Math.PI * 4) * 4 * s;
    ctx.beginPath();
    ctx.moveTo(actualX + bodyW, actualY + bodyH * 0.6);
    ctx.quadraticCurveTo(
      actualX + bodyW + tailLen * 0.6, actualY + bodyH * 0.3 + tailWave,
      actualX + bodyW + tailLen, actualY - 2 * s + tailWave
    );
    ctx.stroke();
    // 尾巴尖
    ctx.fillStyle = options.tailTipColor || '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      actualX + bodyW + tailLen, actualY - 2 * s + tailWave,
      2.5 * s, 0, Math.PI * 2
    );
    ctx.fill();

    // 后腿
    ctx.fillStyle = furColor;
    // 后左腿
    ctx.fillRect(
      actualX + bodyW * 0.15,
      actualY + bodyH,
      4 * s,
      legH + (walkFrame === 1 ? -legSwing : 0)
    );
    // 后右腿
    ctx.fillRect(
      actualX + bodyW * 0.35,
      actualY + bodyH,
      4 * s,
      legH + (walkFrame === 3 ? legSwing : 0)
    );

    // 身体
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      actualX + bodyW * 0.55, actualY + bodyH * 0.6,
      bodyW * 0.5, bodyH * 0.55,
      -0.05, 0, Math.PI * 2
    );
    ctx.fill();

    // 前腿
    ctx.fillStyle = furColor;
    // 前左腿
    ctx.fillRect(
      actualX + bodyW * 0.6,
      actualY + bodyH,
      4 * s,
      legH + (walkFrame === 3 ? -legSwing : 0)
    );
    // 前右腿
    ctx.fillRect(
      actualX + bodyW * 0.8,
      actualY + bodyH,
      4 * s,
      legH + (walkFrame === 1 ? legSwing : 0)
    );

    // 爪子
    ctx.fillStyle = '#F5DEB3';
    const pawW = 5 * s;
    const pawH = 2 * s;
    ctx.fillRect(actualX + bodyW * 0.15 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);
    ctx.fillRect(actualX + bodyW * 0.35 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);
    ctx.fillRect(actualX + bodyW * 0.6 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);
    ctx.fillRect(actualX + bodyW * 0.8 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);

    // 头部 (连接在身体左前)
    const headX = actualX + bodyW * 0.05;
    const headY = actualY - headH * 0.2;

    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      headX + headW / 2, headY + headH / 2,
      headW / 2, headH / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 耳朵
    ctx.fillStyle = furColor;
    // 左耳
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.2, headY + headH * 0.3);
    ctx.lineTo(headX - 1 * s, headY - 4 * s);
    ctx.lineTo(headX + headW * 0.4, headY + headH * 0.1);
    ctx.closePath();
    ctx.fill();
    // 右耳
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.8, headY + headH * 0.3);
    ctx.lineTo(headX + headW + 1 * s, headY - 4 * s);
    ctx.lineTo(headX + headW * 0.6, headY + headH * 0.1);
    ctx.closePath();
    ctx.fill();
    // 耳朵内部
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.22, headY + headH * 0.28);
    ctx.lineTo(headX + headW * 0.05, headY - 2 * s);
    ctx.lineTo(headX + headW * 0.35, headY + headH * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.78, headY + headH * 0.28);
    ctx.lineTo(headX + headW * 0.95, headY - 2 * s);
    ctx.lineTo(headX + headW * 0.65, headY + headH * 0.12);
    ctx.closePath();
    ctx.fill();

    // 条纹 (如果是虎斑猫)
    if (options.striped) {
      ctx.strokeStyle = options.stripeColor || 'rgba(0,0,0,0.2)';
      ctx.lineWidth = Math.max(1, 0.8 * s);
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(actualX + bodyW * (0.35 + i * 0.15), actualY + bodyH * 0.15);
        ctx.lineTo(actualX + bodyW * (0.3 + i * 0.15), actualY + bodyH * 0.45);
        ctx.stroke();
      }
      // 额头条纹
      ctx.beginPath();
      ctx.moveTo(headX + headW * 0.4, headY + headH * 0.05);
      ctx.lineTo(headX + headW * 0.35, headY + headH * 0.25);
      ctx.moveTo(headX + headW * 0.5, headY + headH * 0.02);
      ctx.lineTo(headX + headW * 0.5, headY + headH * 0.25);
      ctx.moveTo(headX + headW * 0.6, headY + headH * 0.05);
      ctx.lineTo(headX + headW * 0.65, headY + headH * 0.25);
      ctx.stroke();
    }

    // 眼睛
    const catEyeY = headY + headH * 0.48;
    ctx.fillStyle = options.eyeColor || '#228B22';
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.35, catEyeY, 2.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.65, catEyeY, 2.2 * s, 2.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.35, catEyeY, 0.8 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.65, catEyeY, 0.8 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.35 - 0.5 * s, catEyeY - 1 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW * 0.65 - 0.5 * s, catEyeY - 1 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();

    // 鼻子
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.moveTo(headX + headW / 2, headY + headH * 0.62);
    ctx.lineTo(headX + headW / 2 - 1.5 * s, headY + headH * 0.72);
    ctx.lineTo(headX + headW / 2 + 1.5 * s, headY + headH * 0.72);
    ctx.closePath();
    ctx.fill();

    // 嘴巴
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth = Math.max(1, 0.8 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX + headW / 2, headY + headH * 0.72);
    ctx.quadraticCurveTo(headX + headW * 0.4, headY + headH * 0.82, headX + headW * 0.35, headY + headH * 0.75);
    ctx.moveTo(headX + headW / 2, headY + headH * 0.72);
    ctx.quadraticCurveTo(headX + headW * 0.6, headY + headH * 0.82, headX + headW * 0.65, headY + headH * 0.75);
    ctx.stroke();

    // 胡须
    ctx.strokeStyle = 'rgba(44, 44, 44, 0.6)';
    ctx.lineWidth = Math.max(0.5, 0.6 * s);
    const whiskerY1 = headY + headH * 0.65;
    const whiskerY2 = headY + headH * 0.72;
    // 左胡须
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.1, whiskerY1); ctx.lineTo(headX - 5 * s, whiskerY1 - 2 * s);
    ctx.moveTo(headX + headW * 0.1, whiskerY2); ctx.lineTo(headX - 5 * s, whiskerY2 + 2 * s);
    // 右胡须
    ctx.moveTo(headX + headW * 0.9, whiskerY1); ctx.lineTo(headX + headW + 5 * s, whiskerY1 - 2 * s);
    ctx.moveTo(headX + headW * 0.9, whiskerY2); ctx.lineTo(headX + headW + 5 * s, whiskerY2 + 2 * s);
    ctx.stroke();

    // 装饰品
    if (options.accessory) {
      drawAccessory(ctx, options.accessory, headX, headY, s, headW, headH);
    }

    ctx.restore();
  }

  // ============ 狗绘制 ============
  function drawDog(ctx, x, y, direction, walkFrame, scale, options) {
    ctx.save();
    const s = scale;
    const dir = direction === 'right' ? 1 : -1;

    if (dir === -1) {
      ctx.translate(x + 32 * s, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    const walkPhase = (walkFrame % 4) / 4;
    const legSwing = Math.sin(walkPhase * Math.PI * 2) * 3.5 * s;
    const bobOffset = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 1.2 * s;
    const tailWag = Math.sin(walkPhase * Math.PI * 4) * 8 * s;

    const actualX = x;
    const actualY = y - bobOffset;

    const bodyW = 32 * s;
    const bodyH = 15 * s;
    const headW = 18 * s;
    const headH = 16 * s;
    const legH = 11 * s;
    const furColor = options.color || '#8B4513';
    const earType = options.earType || 'floppy'; // floppy | pointy

    // 尾巴
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      actualX + bodyW + tailWag * 0.3, actualY + bodyH * 0.2,
      4 * s, 9 * s,
      tailWag * 0.05 + 0.5, 0, Math.PI * 2
    );
    ctx.fill();
    // 尾尖
    ctx.fillStyle = options.tailTipColor || furColor;
    ctx.beginPath();
    ctx.arc(
      actualX + bodyW + tailWag * 0.3, actualY - bodyH * 0.3,
      3 * s, 0, Math.PI * 2
    );
    ctx.fill();

    // 后腿
    ctx.fillStyle = furColor;
    ctx.fillRect(actualX + bodyW * 0.12, actualY + bodyH, 5 * s, legH + (walkFrame === 1 ? -legSwing : 0));
    ctx.fillRect(actualX + bodyW * 0.32, actualY + bodyH, 5 * s, legH + (walkFrame === 3 ? legSwing : 0));

    // 身体
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      actualX + bodyW * 0.5, actualY + bodyH * 0.55,
      bodyW * 0.48, bodyH * 0.5,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 腹部浅色
    ctx.fillStyle = options.bellyColor || '#F5DEB3';
    ctx.beginPath();
    ctx.ellipse(
      actualX + bodyW * 0.5, actualY + bodyH * 0.75,
      bodyW * 0.3, bodyH * 0.25,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 前腿
    ctx.fillStyle = furColor;
    ctx.fillRect(actualX + bodyW * 0.62, actualY + bodyH, 5 * s, legH + (walkFrame === 3 ? -legSwing : 0));
    ctx.fillRect(actualX + bodyW * 0.82, actualY + bodyH, 5 * s, legH + (walkFrame === 1 ? legSwing : 0));

    // 爪子
    ctx.fillStyle = '#D2B48C';
    const pawW = 6 * s, pawH = 2.5 * s;
    ctx.fillRect(actualX + bodyW * 0.12 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);
    ctx.fillRect(actualX + bodyW * 0.32 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);
    ctx.fillRect(actualX + bodyW * 0.62 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);
    ctx.fillRect(actualX + bodyW * 0.82 - 0.5 * s, actualY + bodyH + legH - pawH, pawW, pawH);

    // 头部
    const headX = actualX - 4 * s;
    const headY = actualY - headH * 0.1;

    // 头型
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      headX + headW / 2, headY + headH / 2,
      headW / 2, headH / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 吻部
    const snoutColor = options.snoutColor || '#F5DEB3';
    ctx.fillStyle = snoutColor;
    ctx.beginPath();
    ctx.ellipse(
      headX + headW * 0.25, headY + headH * 0.65,
      headW * 0.28, headH * 0.22,
      -0.15, 0, Math.PI * 2
    );
    ctx.fill();

    // 耳朵
    if (earType === 'floppy') {
      // 下垂耳朵
      ctx.fillStyle = furColor;
      // 左耳
      ctx.save();
      ctx.translate(headX + headW * 0.75, headY + headH * 0.2);
      ctx.rotate(tailWag * 0.008);
      ctx.beginPath();
      ctx.ellipse(0, headH * 0.3, headW * 0.18, headH * 0.42, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 右耳
      ctx.save();
      ctx.translate(headX + headW * 0.3, headY + headH * 0.15);
      ctx.beginPath();
      ctx.ellipse(0, headH * 0.3, headW * 0.18, headH * 0.42, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // 耳朵内部
      ctx.fillStyle = '#D2B48C';
      ctx.save();
      ctx.translate(headX + headW * 0.3, headY + headH * 0.15);
      ctx.beginPath();
      ctx.ellipse(0, headH * 0.3, headW * 0.1, headH * 0.25, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // 立耳（如哈士奇）
      ctx.fillStyle = furColor;
      // 左耳
      ctx.beginPath();
      ctx.moveTo(headX + headW * 0.65, headY + headH * 0.3);
      ctx.lineTo(headX + headW * 0.55, headY - 5 * s);
      ctx.lineTo(headX + headW * 0.9, headY + headH * 0.1);
      ctx.closePath();
      ctx.fill();
      // 右耳
      ctx.beginPath();
      ctx.moveTo(headX + headW * 0.35, headY + headH * 0.3);
      ctx.lineTo(headX + headW * 0.45, headY - 5 * s);
      ctx.lineTo(headX + headW * 0.1, headY + headH * 0.1);
      ctx.closePath();
      ctx.fill();
      // 耳朵内部
      ctx.fillStyle = '#FFB6C1';
      ctx.beginPath();
      ctx.moveTo(headX + headW * 0.66, headY + headH * 0.25);
      ctx.lineTo(headX + headW * 0.58, headY - 3 * s);
      ctx.lineTo(headX + headW * 0.85, headY + headH * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(headX + headW * 0.34, headY + headH * 0.25);
      ctx.lineTo(headX + headW * 0.42, headY - 3 * s);
      ctx.lineTo(headX + headW * 0.15, headY + headH * 0.12);
      ctx.closePath();
      ctx.fill();
    }

    // 眼睛
    const dogEyeY = headY + headH * 0.42;
    ctx.fillStyle = options.eyeColor || '#654321';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.55, dogEyeY, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW * 0.78, dogEyeY, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.55 + 0.5 * s, dogEyeY - 0.5 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW * 0.78 + 0.5 * s, dogEyeY - 0.5 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();

    // 眉毛斑点（如果有）
    if (options.eyeSpot) {
      ctx.fillStyle = options.eyeSpotColor || '#DAA520';
      ctx.beginPath();
      ctx.ellipse(headX + headW * 0.55, dogEyeY - 3 * s, 2 * s, 1.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(headX + headW * 0.78, dogEyeY - 3 * s, 2 * s, 1.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 鼻子
    ctx.fillStyle = '#2C2C2C';
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.12, headY + headH * 0.55, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // 鼻子高光
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.1, headY + headH * 0.52, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();

    // 嘴巴
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth = Math.max(1, 0.8 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.15, headY + headH * 0.65);
    ctx.lineTo(headX + headW * 0.12, headY + headH * 0.75);
    ctx.lineTo(headX + headW * 0.22, headY + headH * 0.78);
    ctx.stroke();

    // 舌头（如果吐舌头）
    if (options.tongue) {
      ctx.fillStyle = '#FF6B8A';
      ctx.beginPath();
      ctx.ellipse(
        headX + headW * 0.18 + Math.sin(walkPhase * Math.PI * 2) * 0.5 * s,
        headY + headH * 0.82,
        2 * s, 3 * s,
        0, 0, Math.PI * 2
      );
      ctx.fill();
    }

    // 项圈
    ctx.fillStyle = options.collarColor || '#E74C3C';
    ctx.fillRect(
      headX + headW * 0.55, headY + headH * 0.9,
      headW * 0.4, 3 * s
    );
    // 铃铛
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.75, headY + headH * 0.95 + 2 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // 装饰品
    if (options.accessory) {
      drawAccessory(ctx, options.accessory, headX, headY, s, headW, headH);
    }

    ctx.restore();
  }

  // ============ 兔子绘制 ============
  function drawRabbit(ctx, x, y, direction, walkFrame, scale, options) {
    ctx.save();
    const s = scale;
    const dir = direction === 'right' ? 1 : -1;

    if (dir === -1) {
      ctx.translate(x + 28 * s, 0);
      ctx.scale(-1, 1);
      x = 0;
    }

    const walkPhase = (walkFrame % 4) / 4;
    const legSwing = Math.sin(walkPhase * Math.PI * 2) * 3 * s;
    const hopOffset = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 3 * s;
    const earWiggle = Math.sin(walkPhase * Math.PI * 2) * 3;

    const actualX = x;
    const actualY = y - hopOffset;

    const bodyW = 22 * s;
    const bodyH = 16 * s;
    const headW = 14 * s;
    const headH = 13 * s;
    const legH = 8 * s;
    const furColor = options.color || '#FFFFFF';

    // 后腿（长）
    ctx.fillStyle = furColor;
    ctx.fillRect(actualX + bodyW * 0.2, actualY + bodyH, 5 * s, legH + (walkFrame === 1 ? -legSwing : 0));
    // 大脚
    ctx.fillStyle = options.pawColor || '#FFE4E1';
    ctx.fillRect(actualX + bodyW * 0.15, actualY + bodyH + legH - 2 * s, 8 * s, 3 * s);
    // 前腿
    ctx.fillStyle = furColor;
    ctx.fillRect(actualX + bodyW * 0.6, actualY + bodyH, 4 * s, legH + (walkFrame === 3 ? -legSwing : 0));
    ctx.fillRect(actualX + bodyW * 0.78, actualY + bodyH, 4 * s, legH + (walkFrame === 1 ? legSwing : 0));

    // 身体
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      actualX + bodyW * 0.5, actualY + bodyH * 0.55,
      bodyW * 0.45, bodyH * 0.5,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 尾巴（棉花球）
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(actualX + bodyW + 1 * s, actualY + bodyH * 0.6, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // 腹部
    ctx.fillStyle = options.bellyColor || '#FFE4E1';
    ctx.beginPath();
    ctx.ellipse(
      actualX + bodyW * 0.5, actualY + bodyH * 0.7,
      bodyW * 0.28, bodyH * 0.22,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 头部
    const headX = actualX - 2 * s;
    const headY = actualY - headH * 0.3;

    // 长耳朵
    ctx.fillStyle = furColor;
    // 左耳
    ctx.save();
    ctx.translate(headX + headW * 0.35, headY);
    ctx.rotate(-0.05 + earWiggle * 0.008);
    ctx.beginPath();
    ctx.ellipse(0, -headH * 0.6, headW * 0.15, headH * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    // 耳朵内部粉色
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(0, -headH * 0.6, headW * 0.08, headH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // 右耳
    ctx.fillStyle = furColor;
    ctx.save();
    ctx.translate(headX + headW * 0.65, headY);
    ctx.rotate(0.05 - earWiggle * 0.008);
    ctx.beginPath();
    ctx.ellipse(0, -headH * 0.6, headW * 0.15, headH * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(0, -headH * 0.6, headW * 0.08, headH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 头型
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(
      headX + headW / 2, headY + headH / 2,
      headW / 2, headH / 2,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // 脸颊
    ctx.fillStyle = furColor;
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.2, headY + headH * 0.55, headW * 0.18, headH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(headX + headW * 0.8, headY + headH * 0.55, headW * 0.18, headH * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = options.eyeColor || '#C0392B';
    const rEyeY = headY + headH * 0.45;
    ctx.beginPath();
    ctx.arc(headX + headW * 0.35, rEyeY, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW * 0.65, rEyeY, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    // 高光
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(headX + headW * 0.35 - 0.5 * s, rEyeY - 0.5 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + headW * 0.65 - 0.5 * s, rEyeY - 0.5 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();

    // 鼻子（粉色小三角）
    ctx.fillStyle = '#FF69B4';
    ctx.beginPath();
    ctx.moveTo(headX + headW / 2, headY + headH * 0.58);
    ctx.lineTo(headX + headW / 2 - 1.2 * s, headY + headH * 0.66);
    ctx.lineTo(headX + headW / 2 + 1.2 * s, headY + headH * 0.66);
    ctx.closePath();
    ctx.fill();

    // 嘴巴（Y形）
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth = Math.max(0.8, 0.6 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(headX + headW / 2, headY + headH * 0.66);
    ctx.lineTo(headX + headW / 2, headY + headH * 0.74);
    ctx.moveTo(headX + headW / 2, headY + headH * 0.74);
    ctx.quadraticCurveTo(headX + headW * 0.42, headY + headH * 0.82, headX + headW * 0.38, headY + headH * 0.78);
    ctx.moveTo(headX + headW / 2, headY + headH * 0.74);
    ctx.quadraticCurveTo(headX + headW * 0.58, headY + headH * 0.82, headX + headW * 0.62, headY + headH * 0.78);
    ctx.stroke();

    // 门牙
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(headX + headW / 2 - 1.5 * s, headY + headH * 0.78, 1.2 * s, 2.5 * s);
    ctx.fillRect(headX + headW / 2 + 0.3 * s, headY + headH * 0.78, 1.2 * s, 2.5 * s);

    // 胡须
    ctx.strokeStyle = 'rgba(44, 44, 44, 0.5)';
    ctx.lineWidth = Math.max(0.5, 0.5 * s);
    const wY = headY + headH * 0.68;
    ctx.beginPath();
    ctx.moveTo(headX + headW * 0.15, wY); ctx.lineTo(headX - 4 * s, wY - 1 * s);
    ctx.moveTo(headX + headW * 0.15, wY + 2 * s); ctx.lineTo(headX - 4 * s, wY + 3 * s);
    ctx.moveTo(headX + headW * 0.85, wY); ctx.lineTo(headX + headW + 4 * s, wY - 1 * s);
    ctx.moveTo(headX + headW * 0.85, wY + 2 * s); ctx.lineTo(headX + headW + 4 * s, wY + 3 * s);
    ctx.stroke();

    // 装饰品
    if (options.accessory) {
      drawAccessory(ctx, options.accessory, headX, headY, s, headW, headH);
    }

    ctx.restore();
  }

  // ============ 主绘制函数 ============
  /**
   * 绘制角色
   * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
   * @param {number} x - 左下角 X 坐标
   * @param {number} y - 底部 Y 坐标（脚的位置）
   * @param {string} type - 角色类型: 'person' | 'cat' | 'dog' | 'rabbit'
   * @param {'left'|'right'} direction - 朝向
   * @param {number} walkFrame - 行走帧 (0-3)
   * @param {number} scale - 缩放比例
   * @param {object} options - 绘制选项
   * @returns {object} 角色的尺寸信息 { width, height }
   */
  function drawCharacter(ctx, x, y, type, direction, walkFrame, scale, options = {}) {
    // 0) 透明动画分支（赛博武士 Ronin）：头像 key 命中且动画数据可用
    const avatarKey0 = options && options.__avatarKey ? String(options.__avatarKey) : '';
    if (avatarKey0 === RONIN_ANIM_AVATAR_KEY && RoninAnimStore.hasData()) {
      const r = drawAnimatedRonin(ctx, x, y, type, direction, walkFrame, scale, options);
      if (r) return r;
    }
    // 0c) pose-sheet 雪碧图造型分支（kaai 南风知意 / wolfkill 谎语之夜 等，person 类型）：切格就绪即直绘，否则落到底部矢量简笔
    if (type === 'person' && options) {
      const sk1 = (options.__styleKey) || CURRENT_STYLE_KEY;
      const cfg1 = typeof poseSheetCfg === 'function' ? poseSheetCfg(sk1) : null;
      if (cfg1 && options[cfg1.poseOptKey] != null && cfg1.draw) {
        const r = cfg1.draw(ctx, x, y, direction, walkFrame, scale, options);
        if (r) return r;
      }
    }
    // 1) 照片立绘分支，命中条件满足任一即可：
    //    - 当前角色 options.__avatarKey 有可渲染头像（赛博朋克 15 张 per-character）
    //    - 或者当前风格有嵌入图（风格总览图）
    const avatarKey = options && options.__avatarKey ? String(options.__avatarKey) : '';
    const useAvatar = !!avatarKey && typeof _getAvatarImageData === 'function' && !!_getAvatarImageData(avatarKey);
    const styleKey = (options && options.__styleKey) || CURRENT_STYLE_KEY;
    const useStyle = !useAvatar && !!styleKey
      && typeof _getStyleImageData === 'function' && !!_getStyleImageData(styleKey);
    if ((useAvatar || useStyle) && typeof drawImageCharacter === 'function') {
      const ret = drawImageCharacter(ctx, x, y, type, direction, walkFrame, scale, options);
      if (ret) return ret;
    }
    // 2) 矢量 fallback（保持原版行为）
    const heightMap = {
      person: 80,
      cat: 45,
      dog: 52,
      rabbit: 55
    };
    const charHeight = (heightMap[type] || 80) * scale;
    const drawY = y - charHeight;

    // pose-sheet 风格（南风知意/谎语之夜等）：雪碧图未就绪时退到专用黑白线稿分支
    if (styleKey === 'kaai' || styleKey === 'wolfkill' || styleKey === 'beastkill') {
      switch (type) {
        case 'cat':
          drawDoodlePet(ctx, x, drawY, direction, walkFrame, scale, options, 'cat');
          return { width: 45 * scale, height: charHeight };
        case 'dog':
          drawDoodlePet(ctx, x, drawY, direction, walkFrame, scale, options, 'dog');
          return { width: 52 * scale, height: charHeight };
        case 'rabbit':
          drawDoodlePet(ctx, x, drawY, direction, walkFrame, scale, options, 'rabbit');
          return { width: 45 * scale, height: charHeight };
        case 'person':
        default:
          drawDoodlePerson(ctx, x, drawY, direction, walkFrame, scale, options);
          return { width: 20 * scale, height: charHeight };
      }
    }

    switch (type) {
      case 'cat':
        drawCat(ctx, x, drawY, direction, walkFrame, scale, options);
        return { width: 45 * scale, height: charHeight };
      case 'dog':
        drawDog(ctx, x, drawY, direction, walkFrame, scale, options);
        return { width: 52 * scale, height: charHeight };
      case 'rabbit':
        drawRabbit(ctx, x, drawY, direction, walkFrame, scale, options);
        return { width: 45 * scale, height: charHeight };
      case 'person':
      default:
        drawPerson(ctx, x, drawY, direction, walkFrame, scale, options);
        return { width: 20 * scale, height: charHeight };
    }
  }

  // ============ 生成随机角色配置 ============
  /**
   * 生成指定类型的随机角色配置
   * @param {string} type - 角色类型
   * @returns {object} 角色选项
   */
  function generateRandomOptions(type) {
    const opts = {};
    const sp = _styleProfile();
    const palette = COLOR_PALETTE;
    const accessoryChance = Math.random();
    const typeAccessories = (sp.accessories && sp.accessories[type]) || [];
    const typeProb = (sp.accessoryProb && typeof sp.accessoryProb[type] === 'number') ? sp.accessoryProb[type] : 0.3;
    const validAccessories = typeAccessories.filter(a => typeof a === 'string' && a.length > 0);

    switch (type) {
      case 'person':
        opts.skinColor = randomChoice(palette.skin);
        opts.hairColor = randomChoice(palette.hair);
        opts.color = randomChoice(palette.clothes);
        opts.pantsColor = randomChoice(palette.pants);
        opts.eyeColor = randomChoice(palette.eyes);
        {
          const hairPool = (sp.hairStyles && sp.hairStyles.person) ? sp.hairStyles.person : ['short', 'long', 'curly', 'bun', 'bald'];
          opts.hairStyle = randomChoice(hairPool);
        }
        // pose-sheet 雪碧图风格（kaai 南风知意 / wolfkill 谎语之夜 等）：预抽 pose 序号
        {
          const cfg = typeof poseSheetCfg === 'function' ? poseSheetCfg(CURRENT_STYLE_KEY) : null;
          if (cfg && cfg.poseOptKey && cfg.store) {
            const n = (cfg.store.poses && cfg.store.poses.length) || (KAAI_SHEET_COLS_MAX * KAAI_SHEET_ROWS_MAX);
            opts[cfg.poseOptKey] = Math.floor(Math.random() * n);
          }
        }
        if (accessoryChance < typeProb && validAccessories.length) {
          opts.accessory = randomChoice(validAccessories);
        }
        break;

      case 'cat':
        opts.color = randomChoice(palette.catFur);
        opts.eyeColor = randomChoice(palette.eyes);
        opts.striped = Math.random() < 0.5;
        opts.stripeColor = opts.striped ? (opts.color.toLowerCase() === '#ffffff' ? 'rgba(200, 150, 0, 0.3)' : 'rgba(0,0,0,0.2)') : null;
        opts.tailTipColor = Math.random() < 0.4 ? (palette.catFur[0] || opts.color) : opts.color;
        opts.collarColor = randomChoice(palette.collars);
        if (accessoryChance < typeProb && validAccessories.length) {
          opts.accessory = randomChoice(validAccessories);
        }
        break;

      case 'dog':
        opts.color = randomChoice(palette.dogFur);
        opts.eyeColor = randomChoice(palette.eyes);
        opts.earType = randomChoice(['floppy', 'floppy', 'pointy']);
        opts.bellyColor = opts.color.toLowerCase() === '#2c2c2c' ? '#696969' : '#F5DEB3';
        opts.snoutColor = opts.color.toLowerCase() === '#ffffff' ? '#F0E0D0' : '#F5DEB3';
        opts.tongue = Math.random() < 0.5;
        opts.tailTipColor = Math.random() < 0.3 ? (palette.dogFur[0] || opts.color) : opts.color;
        opts.eyeSpot = Math.random() < 0.35;
        opts.eyeSpotColor = randomChoice(['#DAA520', '#FFFFFF', '#FFF8DC']);
        opts.collarColor = randomChoice(palette.collars);
        if (accessoryChance < typeProb && validAccessories.length) {
          opts.accessory = randomChoice(validAccessories);
        }
        break;

      case 'rabbit':
        opts.color = randomChoice(palette.rabbitFur);
        opts.eyeColor = randomChoice(palette.eyes);
        opts.bellyColor = opts.color.toLowerCase() === '#ffffff' ? '#FFE4E1' : '#FFFFFF';
        opts.pawColor = '#FFB6C1';
        opts.collarColor = randomChoice(palette.collars);
        if (accessoryChance < typeProb && validAccessories.length) {
          opts.accessory = randomChoice(validAccessories);
        }
        break;
    }

    return opts;
  }

  // ============ 导出到全局 ============
  const CharacterRenderer = {
    drawCharacter,
    drawPerson,
    drawCat,
    drawDog,
    drawRabbit,
    drawAccessory,
    drawImageCharacter,
    drawAnimatedRonin,
    isAnimatedAvatar,
    registerRoninAnimFrames,
    RoninAnimStore,
    drawKaaiPose,
    KaaiStore,
    drawWolfkillPose,
    WolfkillStore,
    drawBeastkillPose,
    BeastkillStore,
    poseSheetCfg,
    generateRandomOptions,
    applyCharacterStyle,
    listCharacterStyles,
    registerStyleImage,
    getStyleCover,
    registerAvatarImage,
    addStyleAvatarPool,
    pickAvatarForStyle,
    loadStyleSprite,
    preloadStyleSprites,
    _getStyleImageData,
    _getAvatarImageData,
    COLOR_PALETTE,
    randomChoice,
    randomInRange,
    __STYLE_IMAGE_DATA__: STYLE_IMAGE_DATA,    // 打包脚本写值
    __STYLE_AVATAR_POOL__: STYLE_AVATAR_POOL,  // 打包脚本写值
    __AVATAR_IMAGE_DATA__: AVATAR_IMAGE_DATA,  // 打包脚本写值
    __RONIN_ANIM_FRAMES__: RONIN_ANIM_FRAMES, // 打包脚本写值
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = CharacterRenderer;
  } else {
    global.CharacterRenderer = CharacterRenderer;
  }

})(typeof window !== 'undefined' ? window : this);
