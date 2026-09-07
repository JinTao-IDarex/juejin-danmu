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
    kaai:      { person: [], cat: [], dog: [], rabbit: [] },
    wolfkill:      { person: [], cat: [], dog: [], rabbit: [] },
    beastkill:      { person: [], cat: [], dog: [], rabbit: [] },
  };
  const AVATAR_IMAGE_DATA = {}; // { <avatarKey>: dataURI }
  // 风格封面图（控制面板"角色风格"卡片预览用；key → dataURI/路径，构建脚本写入或 __JMW_STYLE_COVERS__ 注入）
  const STYLE_COVER_DATA = {
    kaai: 'resources/covers/kaai.webp',
    wolfkill: 'resources/covers/wolfkill.webp',
    beastkill: 'resources/covers/beastkill.webp',
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
    idle: [
      'resources/ronin/idle/00.webp',
      'resources/ronin/idle/01.webp',
      'resources/ronin/idle/02.webp',
      'resources/ronin/idle/03.webp',
      'resources/ronin/idle/04.webp',
      'resources/ronin/idle/05.webp',
    ],
    runningRight: [
      'resources/ronin/runningRight/00.webp',
      'resources/ronin/runningRight/01.webp',
      'resources/ronin/runningRight/02.webp',
      'resources/ronin/runningRight/03.webp',
      'resources/ronin/runningRight/04.webp',
      'resources/ronin/runningRight/05.webp',
      'resources/ronin/runningRight/06.webp',
      'resources/ronin/runningRight/07.webp',
    ],
    runningLeft: [
      'resources/ronin/runningLeft/00.webp',
      'resources/ronin/runningLeft/01.webp',
      'resources/ronin/runningLeft/02.webp',
      'resources/ronin/runningLeft/03.webp',
      'resources/ronin/runningLeft/04.webp',
      'resources/ronin/runningLeft/05.webp',
      'resources/ronin/runningLeft/06.webp',
      'resources/ronin/runningLeft/07.webp',
    ],
    jumping: [
      'resources/ronin/jumping/00.webp',
      'resources/ronin/jumping/01.webp',
      'resources/ronin/jumping/02.webp',
      'resources/ronin/jumping/03.webp',
      'resources/ronin/jumping/04.webp',
    ],
    waving: [
      'resources/ronin/waving/00.webp',
      'resources/ronin/waving/01.webp',
      'resources/ronin/waving/02.webp',
      'resources/ronin/waving/03.webp',
    ],
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
  let KAAI_SHEET_SRC = 'resources/kaai/sheet.png'; // 南风知意雪碧图（跳过动物行，4×15=60 造型）
  let WOLFKILL_SHEET_SRC = 'resources/wolfkill/sheet.png'; // 谎语之夜雪碧图（跳过宠物行，2×10=20 造型）
  let BEASTKILL_SHEET_SRC = 'resources/beastkill/sheet.webp'; // 兽杀奇谭雪碧图（跳过宠物行，2×10=20 兽人造型）
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

/**
 * 论坛消息墙核心引擎 - 【性能优化版】
 * 优化点：
 *  1. SpriteCache 离屏预渲染：角色(4帧 × 2方向)缓存到离屏Canvas，避免每帧重绘数百条Path
 *  2. 帧率节流：默认 30fps（约33ms/帧），并根据性能动态调整
 *  3. 气泡缓存：消息气泡第一次绘制后缓存，之后直接贴图
 *  4. 自适应降质：检测到卡顿后自动降低角色数/关闭阴影
 *  5. 减少 measureText 调用：文字换行尺寸一次计算后缓存
 */

(function (global) {
  'use strict';

  // 昵称牌显示开关（由 config.showNames 驱动；Character 绘制时读取）
  let SHOW_NAMES = true;
  // 气泡文字基础字号（px），由 config.bubbleFontSize 驱动；Character 绘制气泡时读取
  let BUBBLE_FONT_SIZE = 11;

  // ============ 全局性能配置 ============
  const PERF = {
    targetFPS: 30,              // 目标帧率（30fps 对动画足够观感）
    frameDt: 33.3,              // 实际帧间隔 ms（引擎每帧回写；弹幕按真实 dt 位移，帧率波动时速度恒定）
    frameBudget: 28,            // 每帧预算 ms（略小于 1000/30）
    enableSpriteCache: true,    // 启用角色离屏缓存（最大提升）
    enableBubbleCache: true,    // 启用气泡缓存
    autoDowngrade: true,        // 卡顿自动降质
    maxSpritesPerChar: 8,       // 4frame × 2direction
    spriteCacheLRUSize: 1200,   // 全局精灵缓存上限（10角色×8帧+余量）
    scaleQuantStep: 0.15,       // scale 离散化步长（减少缓存组合数）
  };

  // ============ 深度分层配置（可动态调整） ============
  let DEPTH_ROWS = 3;         // 深度行数（前排→后排），0=最前
  let DEPTH_SCALE_FRONT = 1.05; // 最前排缩放（相对于基础 scale）
  let DEPTH_SCALE_BACK = 0.95; // 最后排缩放
  let DEPTH_SPREAD = 0.08;     // 行间距占角色高度的比例（控制纵向铺开范围）

  // 把任意浮点 scale 量化到少数档位，避免 0.97/0.98 占两份缓存
  function _quantScale(s) {
    const step = PERF.scaleQuantStep;
    return Math.round(s / step) * step;
  }
  // 复用的离屏 measureText canvas（避免污染主 canvas 字体状态）
  let _measureCanvas = null;
  function _getMeasureCtx() {
    if (!_measureCanvas) {
      _measureCanvas = document.createElement('canvas');
      _measureCanvas.width = 16; _measureCanvas.height = 16;
    }
    return _measureCanvas.getContext('2d');
  }

  // ============ 辅助函数 ============
  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function quickHash(str) {
    // 快速字符串哈希，用于缓存键
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(36);
  }

  function wrapText(text, maxChars) {
    if (!text) return [''];
    const lines = [];
    let current = '', count = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const w = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(c) ? 2 : 1;
      if (c === '\n' || count + w > maxChars) {
        lines.push(current);
        current = c === '\n' ? '' : c;
        count = c === '\n' ? 0 : w;
      } else {
        current += c;
        count += w;
      }
    }
    if (current) lines.push(current);
    return lines.slice(0, 4);
  }

  // 宽度驱动的智能换行：按实际 measureText 宽度断行，
  // 在词边界（空格）处断开，避免把英文单词从中间切断；
  // 返回换行后各行，并保证每行实测宽度 ≤ maxW。
  function wrapByWidth(text, mctx, maxW) {
    if (!text) return [''];
    const chars = Array.from(text);
    const lines = [];
    let line = '';
    for (const ch of chars) {
      if (line && mctx.measureText(line + ch).width > maxW) {
        // 若本行中间有空格，尽量在最后一个空格处断（保留英文单词完整）
        const sp = line.lastIndexOf(' ');
        if (sp > 0 && mctx.measureText(line.slice(0, sp)).width <= maxW) {
          lines.push(line.slice(0, sp).replace(/\s+$/, ''));
          line = line.slice(sp + 1) + ch;
        } else {
          lines.push(line);
          line = ch;
        }
      } else {
        line += ch;
      }
    }
    if (line.replace(/\s+$/, '')) lines.push(line.replace(/\s+$/, ''));
    if (!lines.length) lines.push('');
    return lines.slice(0, 4);
  }

  // ==========================================================
  // 🚀 优化1：角色精灵离屏缓存
  // ==========================================================
  class SpriteCache {
    constructor(maxEntries = PERF.spriteCacheLRUSize) {
      this.map = new Map(); // key -> { canvas, w, h }
      this.max = maxEntries;
      this.hit = 0; this.miss = 0;
    }

    _buildKey(type, dir, frame, scale, options) {
      // scale 离散化，避免 0.97/0.98 占两份缓存
      const qs = _quantScale(scale).toFixed(2);
      let keys = '';
      if (options) {
        const flds = ['color','skinColor','hairColor','hairStyle','pantsColor',
          'accessory','eyeColor','striped','stripeColor','tailTipColor','earType',
          'bellyColor','snoutColor','tongue','eyeSpot','eyeSpotColor','collarColor',
          'pawColor', '__styleKey', '__avatarKey'];
        for (const k of flds) {
          if (k in options) keys += '|' + k + ':' + options[k];
        }
      }
      return `${type}|${dir}|${frame}|${qs}|${quickHash(keys)}`;
    }

    get(key) {
      const entry = this.map.get(key);
      if (!entry) { this.miss++; return null; }
      this.hit++;
      // Map 本身维护插入顺序：delete 再 set = 移到末尾（最年轻），O(1)
      this.map.delete(key);
      this.map.set(key, entry);
      return entry;
    }

    put(key, canvas, w, h) {
      if (this.map.has(key)) {
        this.map.delete(key); // 先踢旧位置，再塞到末尾
      } else if (this.map.size >= this.max) {
        // Map.keys().next() 取出最旧的 key（最早插入）
        const oldKey = this.map.keys().next().value;
        if (oldKey !== undefined) {
          const old = this.map.get(oldKey);
          if (old) {
            try { old.canvas.width = 1; old.canvas.height = 1; } catch (_) {}
          }
          this.map.delete(oldKey);
        }
      }
      this.map.set(key, { canvas, w, h });
    }

    // 清空缓存（DPR 变化或切换性能模式时调用）
    clear() {
      for (const [, entry] of this.map) {
        try { entry.canvas.width = 1; entry.canvas.height = 1; } catch (_) {}
      }
      this.map.clear();
      this.hit = 0; this.miss = 0;
    }

    // 绘制（或缓存后绘制）一个角色
    drawCharacter(targetCtx, drawX, drawY, type, dir, frame, scale, options) {
      const key = this._buildKey(type, dir, frame, scale, options);
      let entry = this.get(key);

      if (!entry) {
        const qscale = _quantScale(scale);
        // 矢量版 base size
        const sizeMap = { person: {w:40,h:90}, cat:{w:60,h:55}, dog:{w:70,h:62}, rabbit:{w:60,h:70} };
        let sz = sizeMap[type] || sizeMap.person;
        // 若当前角色有 avatar key 或 style image：给立绘尺寸的离屏画布（110高 + 2:3宽 + 边距，给阴影/白卡预留）
        const avatarKey = options && options.__avatarKey;
        const styleKey = options && options.__styleKey;
        let hasImage = false;
        if (avatarKey && typeof CharacterRenderer._getAvatarImageData === 'function'
          && !!CharacterRenderer._getAvatarImageData(avatarKey)) {
          hasImage = true;
        } else if (styleKey
          && typeof CharacterRenderer._getStyleImageData === 'function'
          && !!CharacterRenderer._getStyleImageData(styleKey)) {
          hasImage = true;
        }
        if (hasImage) {
          sz = { w: 110, h: 190 };
        }
        const W = Math.ceil(sz.w * qscale + 10);
        const H = Math.ceil(sz.h * qscale + 10);
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const octx = off.getContext('2d');
        // 注意：离屏绘制时用量化后的 scale 画，保证缓存的 sprite 实际尺寸和缓存键一致
        CharacterRenderer.drawCharacter(octx, 5, H - 5, type, dir, frame, qscale, options);
        entry = { canvas: off, w: W, h: H };
        this.put(key, off, W, H);
      }

      const targetY = drawY - entry.h + 5;
      targetCtx.drawImage(entry.canvas, Math.round(drawX - 5), Math.round(targetY));
    }

    stats() {
      return { size: this.map.size, hit: this.hit, miss: this.miss,
        hitRate: (this.hit + this.miss) ? (this.hit / (this.hit+this.miss) * 100).toFixed(1) + '%' : '0%' };
    }
  }

  // 全局单例
  let globalSpriteCache = new SpriteCache();

  // ==========================================================
  // 🚀 优化2：消息气泡缓存
  // ==========================================================
  class BubbleCache {
    constructor(max = 80) { this.map = new Map(); this.max = max; this.dpr = 1; }
    setDpr(d) {
      if (Math.abs(this.dpr - d) > 0.01) {
        this.clear();
        this.dpr = d;
      }
    }
    _key(msg, scale, variant) {
      const qs = _quantScale(scale).toFixed(2);
      // variant 区分「药丸条」与「对话气泡」两种外形，避免跨显示模式复用错误缓存
      return `${this.dpr.toFixed(2)}|${qs}|${variant || ''}|${msg.text}|${msg.meta ? (msg.meta.tagColor || '') + '|' + (msg.meta.source || '') : ''}`;
    }
    get(msg, scale, variant) { return this.map.get(this._key(msg, scale, variant)); }
    put(msg, scale, canvas, w, h, meta, variant) {
      const k = this._key(msg, scale, variant);
      if (this.map.has(k)) this.map.delete(k); // 移到末尾
      else if (this.map.size >= this.max) {
        const old = this.map.keys().next().value;
        const entry = this.map.get(old);
        if (entry) try { entry.canvas.width = 1; entry.canvas.height = 1; } catch (_) {}
        this.map.delete(old);
      }
      this.map.set(k, { canvas, w, h, ...meta });
    }
    clear() {
      for (const [, e] of this.map) {
        try { e.canvas.width = 1; e.canvas.height = 1; } catch (_) {}
      }
      this.map.clear();
    }
  }
  const globalBubbleCache = new BubbleCache(80);

  // ==========================================================
  // 角色实体类
  // ==========================================================
  class Character {
    constructor(config) {
      this.id = uid();
      this.type = config.type || 'person';
      this.x = config.x ?? 0;
      this.y = config.y ?? 0;
      this.width = 20; this.height = 80;
      this.direction = config.direction || (Math.random() < 0.5 ? 'left' : 'right');
      this.speed = config.speed ?? rand(0.4, 1.4);
      this.baseSpeed = this.speed;
      this.scale = config.scale ?? 1.0; // 基础缩放（统一基准，深度分层在此基础上调整）
      this._baseScale = this.scale; // 保存基础缩放，避免深度分层计算时累积漂移
      this.walkFrame = 0;
      this.walkTimer = 0;
      this.walkFrameSpeed = rand(4, 7);
      this.options = config.options || CharacterRenderer.generateRandomOptions(this.type);
      this.message = null;
      this.messageTimer = 0;
      this._cachedBubble = null;
      this.behaviorTimer = randInt(120, 500);
      this.state = 'walking';
      this.facingTarget = null;
      this.stopTimer = 0;
      this.username = config.username || null;
      // 深度分层：0=最前排（大、低），DEPTH_ROWS-1=最后排（小、高）
      this._depthRow = (config.depthRow != null) ? config.depthRow : Math.floor(Math.random() * DEPTH_ROWS);
      // 尺寸更新缓存
      const hm = { person: [20, 80], cat: [45, 45], dog: [52, 52], rabbit: [45, 55] };
      const sz = hm[this.type] || hm.person;
      this.width = sz[0] * this.scale;
      this.height = sz[1] * this.scale;
    }
    // 当前帧的可视化缩放（由深度行决定，前排大、后排小）
    get visualScale() {
      const r = Math.max(0, Math.min(DEPTH_ROWS - 1, this._depthRow | 0));
      const t = DEPTH_ROWS <= 1 ? 0 : r / (DEPTH_ROWS - 1);
      const base = this._baseScale != null ? this._baseScale : this.scale;
      return base * (DEPTH_SCALE_FRONT - t * (DEPTH_SCALE_FRONT - DEPTH_SCALE_BACK));
    }
    get visualWidth() {
      const base = this._baseScale != null ? this._baseScale : this.scale;
      return this.width * this.visualScale / Math.max(0.01, base);
    }
    get visualHeight() {
      const base = this._baseScale != null ? this._baseScale : this.scale;
      return this.height * this.visualScale / Math.max(0.01, base);
    }

    update(canvasW, canvasH, floorY, allChars, displayMode) {
      const street = displayMode === 'street';
      const danmaku = displayMode === 'danmaku';
      this._recycle = false;
      if (danmaku) {
        // 弹幕模式：恒速横穿（px/s × 真实帧间隔 dt），不随机行为、不走路动画
        this.state = 'walking';
        const dtSec = (PERF.frameDt || 1000 / (PERF.targetFPS || 30)) / 1000;
        const px = (this._danmakuPx || 120) * dtSec;
        this.x += (this.direction === 'right' ? 1 : -1) * px;
        if (this.x < -this.width - 60 || this.x > canvasW + 60) this._recycle = true;
        if (this.messageTimer > 0) {
          this.messageTimer--;
          if (this.messageTimer <= 0) { this.message = null; this._cachedBubble = null; }
        }
        return;
      }
      this.behaviorTimer--;
      if (!street) {
        if (this.behaviorTimer <= 0) {
          const r = Math.random();
          if (r < 0.12) {
            this.state = 'stopped';
            this.stopTimer = randInt(90, 200);
            if (allChars && allChars.length > 1) {
              const others = allChars.filter(c => c !== this && c.message);
              if (others.length) {
                const t = choice(others);
                this.facingTarget = t;
                this.direction = t.x < this.x ? 'left' : 'right';
              }
            }
          } else if (r < 0.22) {
            this.direction = this.direction === 'left' ? 'right' : 'left';
          } else if (r < 0.40) {
            this.speed = this.baseSpeed * rand(0.55, 1.5);
          }
          this.state = 'walking';
          this.behaviorTimer = randInt(200, 700);
        }

        if (this.state === 'stopped') {
          this.stopTimer--;
          if (this.stopTimer <= 0) { this.state = 'walking'; this.facingTarget = null; }
          if (this.facingTarget) this.direction = this.facingTarget.x < this.x ? 'left' : 'right';
        }
      }

      // 街景过路模式：一直朝一个方向走，不随机停顿/转向
      this.state = street ? 'walking' : this.state;

      if (this.state === 'walking') {
        const d = this.direction === 'right' ? this.speed : -this.speed;
        this.x += d;
        this.walkTimer++;
        if (this.walkTimer >= this.walkFrameSpeed / this.speed) {
          this.walkFrame = (this.walkFrame + 1) % 4;
          this.walkTimer = 0;
        }
      } else {
        this.walkTimer++;
        if (this.walkTimer > 20) { this.walkFrame = (this.walkFrame + 1) % 2; this.walkTimer = 0; }
      }

      const margin = this.width;
      if (street) {
        // 街景过路：走出屏幕后标记回收（由引擎重生为过路小人）
        if (this.x < -margin * 1.5 || this.x > canvasW + margin * 1.5 - this.width) {
          this._recycle = true;
        }
      } else if (this.x < -margin) { this.x = -margin; this.direction = 'right'; }
      else if (this.x > canvasW + margin - this.width) {
        this.x = canvasW + margin - this.width; this.direction = 'left';
      }

      this.y = floorY;
      // 深度分层：根据 _depthRow 计算实际站位 y
      // - 前排（_depthRow 小）：y 低（靠近 viewer），缩放大
      // - 后排（_depthRow 大）：y 高（远离 viewer），缩放小
      if (!this._danmaku) {
        const r = Math.max(0, Math.min(DEPTH_ROWS - 1, this._depthRow | 0));
        const t = DEPTH_ROWS <= 1 ? 0 : r / (DEPTH_ROWS - 1);
        const baseScale = this._baseScale != null ? this._baseScale : this.scale;
        const vScale = baseScale * (DEPTH_SCALE_FRONT - t * (DEPTH_SCALE_FRONT - DEPTH_SCALE_BACK));
        const approxH = Math.max(40, (this.height || 80) * vScale / Math.max(0.01, baseScale));
        this.y = floorY + t * approxH * DEPTH_SPREAD * DEPTH_ROWS;
      }

      if (this.messageTimer > 0) {
        this.messageTimer--;
        if (this.messageTimer <= 0) { this.message = null; this._cachedBubble = null; }
      }
    }

    setMessage(text, meta = {}, durationMs = 8000) {
      this.message = { text, meta };
      // 用真实帧间隔换算剩余帧数（弹幕 60fps / 其他 30fps 下持续时间都准确）
      this.messageTimer = Math.ceil(durationMs / (PERF.frameDt || 1000 / (PERF.targetFPS || 30)));
      this._cachedBubble = null; // 新消息，清空气泡缓存
      this._danmaku = this._isDanmaku === true; // 弹幕模式下气泡画成药丸条
    }

    draw(ctx) {
      // 弹幕载体：不画角色本体，只画药丸条
      if (this._danmaku) {
        if (this.message) this.drawDanmakuPill(ctx);
        return;
      }
      // 角色绘制：透明动画角色（赛博武士 Ronin）帧随时间变化，必须绕过 SpriteCache 直绘
      const isAnim = (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.isAnimatedAvatar)
        && CharacterRenderer.isAnimatedAvatar(this.options);
      if (isAnim) {
        const opts = Object.assign({}, this.options, { __moving: this.state === 'walking' });
        const size = CharacterRenderer.drawCharacter(
          ctx, this.x, this.y, this.type, this.direction,
          this.walkFrame, this.visualScale, opts
        );
        if (size) { this.width = size.width; this.height = size.height; }
      } else if (PERF.enableSpriteCache && globalSpriteCache) {
        // SpriteCache.drawCharacter 会把角色的底部 (y=脚位置) 画到 this.y
        globalSpriteCache.drawCharacter(ctx, this.x, this.y,
          this.type, this.direction, this.walkFrame, this.visualScale, this.options);
      } else {
        const size = CharacterRenderer.drawCharacter(
          ctx, this.x, this.y, this.type, this.direction,
          this.walkFrame, this.visualScale, this.options
        );
        this.width = size.width;
      }

      if (this.username && SHOW_NAMES) this.drawNameTag(ctx);
      if (this.message) {
        if (this._danmaku) this.drawDanmakuPill(ctx);
        else this.drawMessageBubble(ctx);
      }
    }

    /** 弹幕药丸条：白底圆角 + 分类色点 + 文本 + 来源小字，缓存于 BubbleCache */
    drawDanmakuPill(ctx) {
      const msg = this.message;
      const dpr = (typeof window !== 'undefined' && window.__jmw_activeDpr) || (window.devicePixelRatio || 1);
      globalBubbleCache.setDpr(dpr);
      let cached = globalBubbleCache.get(msg, 1, 'pill');
      if (!cached) {
        // 构建药丸离屏图
        const fontSize = 13;
        const fontStr = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        const smallFontStr = `11px "PingFang SC", sans-serif`;
        const mctx = _getMeasureCtx();
        mctx.font = fontStr;
        const text = msg.text || '';
        const tagColor = (msg.meta && msg.meta.tagColor) || '#1e80ff';
        const srcText = (msg.meta && msg.meta.source) ? ' ' + msg.meta.source : '';
        const textW = mctx.measureText(text).width;
        mctx.font = smallFontStr;
        const srcW = srcText ? mctx.measureText(srcText).width : 0;
        const dotW = 8, gap = 6;
        const W = Math.ceil(dotW + gap + textW + (srcW ? gap + srcW : 0) + 24);
        const H = 30;
        const off = document.createElement('canvas');
        off.width = W; off.height = H;
        const o = off.getContext('2d');
        // 药丸底
        o.beginPath();
        const rr = H / 2;
        o.moveTo(rr, 2);
        o.lineTo(W - rr, 2);
        o.arc(W - rr, rr, rr - 2, -Math.PI / 2, Math.PI / 2);
        o.lineTo(rr, H - 2);
        o.arc(rr, rr, rr - 2, Math.PI / 2, -Math.PI / 2);
        o.closePath();
        o.fillStyle = 'rgba(255,255,255,0.92)';
        o.shadowColor = 'rgba(0,0,0,0.12)';
        o.shadowBlur = 6;
        o.shadowOffsetY = 2;
        o.fill();
        o.shadowColor = 'transparent';
        o.strokeStyle = 'rgba(0,0,0,0.05)';
        o.lineWidth = 1;
        o.stroke();
        // 分类色点
        o.fillStyle = tagColor;
        o.beginPath();
        o.arc(16, H / 2, 3.5, 0, Math.PI * 2);
        o.fill();
        // 文本
        o.font = fontStr;
        o.fillStyle = '#1d2129';
        o.textBaseline = 'middle';
        o.fillText(text, 16 + gap, H / 2);
        // 来源小字
        if (srcText) {
          o.font = smallFontStr;
          o.fillStyle = '#86909c';
          o.fillText(srcText, 16 + gap + textW + 2, H / 2 + 1);
        }
        globalBubbleCache.put(msg, 1, off, W, H, {}, 'pill');
        cached = globalBubbleCache.get(msg, 1, 'pill');
      }
      if (!cached) return;
      const bx = this.x, by = this.y;
      ctx.save();
      ctx.globalAlpha = this.messageTimer < 20 ? clamp(this.messageTimer / 20, 0, 1) : 1;
      ctx.drawImage(cached.canvas, Math.round(bx), Math.round(by));
      ctx.restore();
      this._bubbleRect = { x: bx, y: by, w: cached.w, h: cached.h };
    }

    drawNameTag(ctx) {
      const name = this.username;
      if (!name) return;
      const scale = this.visualScale;
      // 缓存测量：名字 + scale 不变时不复算
      let nc = this._nameCache;
      if (!nc || nc.name !== name || Math.abs(nc.scale - scale) > 0.05) {
        const fontSize = Math.max(10, Math.floor(11 * scale));
        const fontStr = `bold ${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
        const mctx = _getMeasureCtx();
        mctx.font = fontStr;
        const nameWidth = mctx.measureText(name).width;
        nc = this._nameCache = {
          name, scale, fontSize, fontStr, nameWidth,
          padding: 4 * scale,
          w: nameWidth + 8 * scale,
          h: fontSize + 6,
          yOff: 22 * scale,
        };
      }
      const x = this.x + this.visualWidth / 2 - nc.w / 2;
      const y = this.y - this.visualHeight - nc.yOff;
      // 只在主 ctx 设置一次 font，避免反复切换
      ctx.save();
      ctx.font = nc.fontStr;
      ctx.fillStyle = 'rgba(30, 80, 162, 0.9)';
      ctx.fillRect(x, y, nc.w, nc.h);
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(name, x + nc.padding, y + nc.h / 2);
      ctx.restore();
    }

    drawMessageBubble(ctx) {
      const msg = this.message;
      const scale = this.visualScale;
      let cached = null;

      if (PERF.enableBubbleCache) {
        // 同步 DPR：优先用 engine 写入的 _activeDpr（性能模式会对 devicePixelRatio 夹紧）
        const dpr = (typeof window !== 'undefined' && window.__jmw_activeDpr) || (window.devicePixelRatio || 1);
        globalBubbleCache.setDpr(dpr);
        cached = globalBubbleCache.get(msg, scale, 'bubble');
        if (!cached) {
          const built = this._buildBubble(msg, scale);
          if (built) {
            globalBubbleCache.put(msg, scale, built.canvas, built.w, built.h, { offsetX: built.offsetX }, 'bubble');
            cached = globalBubbleCache.get(msg, scale, 'bubble');
          }
        }
      }

      let bx, by;
      if (cached) {
        bx = this.x + this.visualWidth / 2 - cached.w / 2 - (cached.offsetX || 0);
        by = this.y - this.visualHeight - cached.h - (this.username ? 28 * scale : 0) - 4 * scale;
        // ctx.canvas.width 是物理像素，逻辑宽度用 .clientWidth 或 _viewportW；这里做保守裁剪
        const maxX = (ctx.canvas && ctx.canvas.clientWidth ? ctx.canvas.clientWidth : (window.innerWidth || 1e5)) - cached.w - 4;
        bx = clamp(bx, 4, Math.max(4, maxX));
        const alpha = clamp(this.messageTimer / 15, 0, 1);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(cached.canvas, Math.round(bx), Math.round(by));
        ctx.restore();
        this._bubbleRect = { x: bx, y: by, w: cached.w, h: cached.h };
        return;
      }

      // Fallback: 直接画（无缓存）
      this._bubbleRect = this._drawBubbleDirect(ctx, msg, scale) || null;
    }

    // ---- TraeWork 气泡视觉令牌（与 bubble-style-redesign 设计板对齐）----
    static BUBBLE_TOKENS = {
      bg: '#FFFFFF',
      border: 'rgba(115, 115, 115, 0.18)',   // --border-neutral-l2
      text: '#171717',                        // --text-default
      textMeta: '#737373',                    // --text-tertiary
      brand: '#4B3FE3',                       // --bg-brand
      chipBg: '#E5EAFF',                      // --brand-100
      chipText: '#4B3FE3',                    // --text-brand
      shadow: 'rgba(23, 23, 23, 0.10)',       // 浮层软阴影
      heatHot: '#FF4D4F',                     // 「热」标记色
      heatNew: '#15A877',                     // 「新」标记色
      // 来源 tag 配色：按文案映射
      srcTag: {
        '沸点': { bg: '#FFEDEF', fg: '#F5483B' },
        '文章': { bg: '#EAF2FF', fg: '#1E80FF' },
        '评论': { bg: '#E5F8F0', fg: '#15A877' },
        '推荐': { bg: '#EAF2FF', fg: '#1E80FF' },
        '热榜': { bg: '#FFEDEF', fg: '#F5483B' },
        '通知': { bg: '#FFEDEF', fg: '#F5483B' },
        '弹幕': { bg: '#F0EBFF', fg: '#7B5CFF' },
        '示例': { bg: '#F0EBFF', fg: '#7B5CFF' },
      },
      srcTagDefault: { bg: '#F2F3F5', fg: '#4E5969' },
    };

    /** 画一个圆角 tag 并返回其宽度（用于 meta 行排版） */
    static drawSrcTag(c, x, y, label, font, fontSize, colors, scale) {
      const padX = 7 * scale, padY = 2 * scale;
      c.font = font;
      const tw = c.measureText(label).width;
      const th = fontSize + padY * 2;
      const w = tw + padX * 2;
      const r = th / 2;
      c.fillStyle = colors.bg;
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + th, r);
      c.arcTo(x + w, y + th, x, y + th, r);
      c.arcTo(x, y + th, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
      c.fill();
      c.fillStyle = colors.fg;
      c.textBaseline = 'middle';
      c.fillText(label, x + padX, y + th / 2 + 0.5);
      return w;
    }

    /** 取来源 tag 配色 */
    static srcTagColors(label) {
      const T = Character.BUBBLE_TOKENS;
      return T.srcTag[label] || T.srcTagDefault;
    }

    _buildBubble(msg, scale) {
      const text = msg.text || '';
      const T = Character.BUBBLE_TOKENS;
      const baseFont = BUBBLE_FONT_SIZE;
      const fontSize = Math.max(9, Math.floor(baseFont * scale));
      const fontStr = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const smallFontStr = `${Math.max(9, Math.floor(baseFont * 0.78 * scale))}px "PingFang SC", sans-serif`;

      const mctx = _getMeasureCtx();
      mctx.font = fontStr;
      const maxChars = 18;
      const maxContentW = mctx.measureText('字').width * maxChars;
      const lines = wrapByWidth(text, mctx, maxContentW);
      const lineWidths = lines.map(l => mctx.measureText(l).width);
      const maxW = Math.max(...lineWidths, 40);
      const lineH = fontSize * 1.35;
      const paddingX = 12 * scale;
      const paddingY = 10 * scale;
      const tailH = 8 * scale;

      // meta 行：热度/新鲜度标记 + 来源分类（沸点/文章/评论…）
      const rawTag = (msg.meta && msg.meta.rawTag) || 'comment';
      const srcText = (msg.meta && msg.meta.source) || '';
      // 「热」：榜单/高热类；「新」：入池 30s 内的新消息；其余无标记
      const heat = (rawTag === 'hot' || rawTag === 'notice') ? '热'
        : (msg.meta && msg.meta.fetchedAt && (Date.now() - msg.meta.fetchedAt) < 30000) ? '新' : '';
      const chipFontSize = Math.max(10, Math.floor(11 * scale));
      const chipFont = `500 ${chipFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      mctx.font = chipFont;
      const srcFontSize = Math.max(10, Math.floor(10.5 * scale));
      const srcFont = `500 ${srcFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const heatW = heat ? mctx.measureText(heat).width : 0;
      mctx.font = srcFont;
      const srcW = srcText ? mctx.measureText(srcText).width : 0;
      const metaGap = 6 * scale;
      const tagPadX = 7 * scale;
      const tagW = srcText ? srcW + tagPadX * 2 : 0;
      const metaRowW = (heat ? heatW : 0) + (heat && srcText ? metaGap : 0) + tagW;
      // meta 与正文同一行（首行）：正文首行向右让出 meta 宽度 + 间距
      const firstLineIndent = metaRowW > 0 ? metaRowW + metaGap : 0;
      const textAreaW = Math.max(maxW + firstLineIndent, metaRowW);
      // 行中心：正文与 meta 统一用 middle 基线画到同一 Y，不依赖量尺字体状态
      const lineCenterOffset = lineH / 2;

      const bubbleW = textAreaW + paddingX * 2;
      const bubbleH = lineH * lines.length + paddingY * 2 + tailH;

      const W = Math.ceil(bubbleW + 16);
      const H = Math.ceil(bubbleH + 16);
      const offsetX = 8;

      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const octx = off.getContext('2d');

      const bx = 8, by = 8, contentH = bubbleH - tailH;

      // ---- 标准圆角气泡 ----
      const r = 12 * scale;
      octx.save();
      octx.shadowColor = T.shadow;
      octx.shadowBlur = 10;
      octx.shadowOffsetY = 4;
      octx.fillStyle = T.bg;
      octx.beginPath();
      octx.moveTo(bx + r, by);
      octx.arcTo(bx + bubbleW, by, bx + bubbleW, by + contentH, r);
      octx.arcTo(bx + bubbleW, by + contentH, bx, by + contentH, r);
      octx.arcTo(bx, by + contentH, bx, by, r);
      octx.arcTo(bx, by, bx + bubbleW, by, r);
      octx.closePath();
      octx.fill();
      octx.restore();
      octx.strokeStyle = T.border;
      octx.lineWidth = 1;
      octx.stroke();
      // 尾巴（与气泡同底的旋转方块，带同款描边）
      const tipX = bubbleW / 2, tipHalf = 7 * scale;
      octx.save();
      octx.fillStyle = T.bg;
      octx.beginPath();
      octx.moveTo(bx + tipX - tipHalf, by + contentH - 1);
      octx.lineTo(bx + tipX, by + bubbleH);
      octx.lineTo(bx + tipX + tipHalf, by + contentH - 1);
      octx.closePath();
      octx.fill();
      octx.beginPath();
      octx.moveTo(bx + tipX - tipHalf, by + contentH - 1);
      octx.lineTo(bx + tipX, by + bubbleH);
      octx.lineTo(bx + tipX + tipHalf, by + contentH - 1);
      octx.strokeStyle = T.border;
      octx.stroke();
      octx.restore();

      // ---- meta（热/新 + 来源 tag）与正文同行，与第一行文字中心对齐 ----
      const textY = by + paddingY;
      const metaTextY = textY + lineCenterOffset;
      octx.textBaseline = 'middle';
      let metaX = bx + paddingX;
      if (heat) {
        octx.font = chipFont;
        octx.fillStyle = heat === '热' ? T.heatHot : T.heatNew;
        octx.fillText(heat, metaX, metaTextY);
        metaX += heatW + metaGap;
      }
      if (srcText) {
        const colors = Character.srcTagColors(srcText);
        const th = srcFontSize + 4 * scale;
        Character.drawSrcTag(octx, metaX, metaTextY - th / 2, srcText, srcFont, srcFontSize, colors, scale);
      }

      // ---- 正文（首行右缩进，与 meta 同行）----
      octx.font = fontStr;
      octx.fillStyle = T.text;
      octx.textBaseline = 'middle';
      lines.forEach((l, i) => {
        const indent = i === 0 ? firstLineIndent : 0;
        octx.fillText(l, bx + paddingX + indent, textY + lineCenterOffset + i * lineH);
      });

      return { canvas: off, w: W, h: H, offsetX };
    }

    _drawBubbleDirect(ctx, msg, scale) {
      const T = Character.BUBBLE_TOKENS;
      const baseFont = BUBBLE_FONT_SIZE;
      const fontSize = Math.max(9, Math.floor(baseFont * scale));
      const fontStr = `${fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const smallFontStr = `${Math.max(9, Math.floor(baseFont * 0.78 * scale))}px "PingFang SC", sans-serif`;
      const mctx = _getMeasureCtx();
      mctx.font = fontStr;
      const maxChars = 18;
      const maxContentW = mctx.measureText('字').width * maxChars;
      const lines = wrapByWidth(msg.text || '', mctx, maxContentW);
      const lineWidths = lines.map(l => mctx.measureText(l).width);
      const maxW = Math.max(...lineWidths, 40);
      const lineH = fontSize * 1.35;
      const paddingX = 12 * scale, paddingY = 10 * scale, tailH = 8 * scale;
      const rawTag = (msg.meta && msg.meta.rawTag) || 'comment';
      const srcText = (msg.meta && msg.meta.source) || '';
      const heat = (rawTag === 'hot' || rawTag === 'notice') ? '热'
        : (msg.meta && msg.meta.fetchedAt && (Date.now() - msg.meta.fetchedAt) < 30000) ? '新' : '';
      const chipFontSize = Math.max(10, Math.floor(11 * scale));
      const chipFont = `500 ${chipFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      const srcFontSize = Math.max(10, Math.floor(10.5 * scale));
      const srcFont = `500 ${srcFontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      mctx.font = chipFont;
      const heatW = heat ? mctx.measureText(heat).width : 0;
      mctx.font = srcFont;
      const srcW = srcText ? mctx.measureText(srcText).width : 0;
      const metaGap = 6 * scale;
      const tagPadX = 7 * scale;
      const tagW = srcText ? srcW + tagPadX * 2 : 0;
      const metaRowW = (heat ? heatW : 0) + (heat && srcText ? metaGap : 0) + tagW;
      const firstLineIndent = metaRowW > 0 ? metaRowW + metaGap : 0;
      const textAreaW = Math.max(maxW + firstLineIndent, metaRowW);
      const lineCenterOffset = lineH / 2;
      const bubbleW = textAreaW + paddingX * 2;
      const bubbleH = lineH * lines.length + paddingY * 2;
      let bx = this.x + this.width / 2 - bubbleW / 2;
      let by = this.y - this.height - bubbleH - tailH - (this.username ? 28 * scale : 0) - 4 * scale;
      const maxX = (ctx.canvas && ctx.canvas.clientWidth ? ctx.canvas.clientWidth : (window.innerWidth || 1e5)) - bubbleW - 4;
      bx = clamp(bx, 4, Math.max(4, maxX));
      const alpha = clamp(this.messageTimer / 15, 0, 1);

      ctx.save();
      ctx.globalAlpha = alpha;
      const r = 12 * scale;
      ctx.fillStyle = T.bg;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.arcTo(bx + bubbleW, by, bx + bubbleW, by + bubbleH, r);
      ctx.arcTo(bx + bubbleW, by + bubbleH, bx, by + bubbleH, r);
      ctx.arcTo(bx, by + bubbleH, bx, by, r);
      ctx.arcTo(bx, by, bx + bubbleW, by, r);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = T.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      const tipX = clamp(this.x + this.width / 2, bx + 14, bx + bubbleW - 14);
      const tipHalf = 7 * scale;
      ctx.fillStyle = T.bg;
      ctx.beginPath();
      ctx.moveTo(tipX - tipHalf, by + bubbleH - 1);
      ctx.lineTo(tipX, by + bubbleH + tailH);
      ctx.lineTo(tipX + tipHalf, by + bubbleH - 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = T.border;
      ctx.beginPath();
      ctx.moveTo(tipX - tipHalf, by + bubbleH - 1);
      ctx.lineTo(tipX, by + bubbleH + tailH);
      ctx.lineTo(tipX + tipHalf, by + bubbleH - 1);
      ctx.stroke();
      // meta 行：热/新 + 来源 tag（与第一行文字中心对齐）
      const textY = by + paddingY;
      const metaTextY = textY + lineCenterOffset;
      ctx.textBaseline = 'middle';
      let metaX = bx + paddingX;
      if (heat) {
        ctx.font = chipFont;
        ctx.fillStyle = heat === '热' ? T.heatHot : T.heatNew;
        ctx.fillText(heat, metaX, metaTextY);
        metaX += heatW + metaGap;
      }
      if (srcText) {
        const colors = Character.srcTagColors(srcText);
        const th = srcFontSize + 4 * scale;
        Character.drawSrcTag(ctx, metaX, metaTextY - th / 2, srcText, srcFont, srcFontSize, colors, scale);
      }
      // 正文（首行右缩进，与 meta 同行）
      ctx.font = fontStr;
      ctx.fillStyle = T.text;
      ctx.textBaseline = 'middle';
      lines.forEach((l, i) => {
        const indent = i === 0 ? firstLineIndent : 0;
        ctx.fillText(l, bx + paddingX + indent, textY + lineCenterOffset + i * lineH);
      });
      ctx.restore();
      return { x: bx, y: by, w: bubbleW, h: bubbleH + tailH };
    }
  }

  // ==========================================================
  // 🚀 优化3：主引擎（帧率节流 + 自适应降质）
  // ==========================================================
  class MessageWallEngine {
    constructor(container, config = {}) {
      this.container = container;
      this.config = Object.assign({
        characterCount: 15,
        characterTypes: ['person', 'cat', 'dog', 'rabbit'],
        characterTypeRatio: { person: 0.55, cat: 0.2, dog: 0.15, rabbit: 0.1 },
        characterScale: 1.3,
        floorRatio: 1.05,
        zIndex: 99999,
        opacity: 1,
        showNames: true,
        bubbleFontSize: 11,     // 气泡文字基础字号（px），实际显示再乘角色 scale
        messageInterval: 1500,
        messageDuration: 7500,
        onMessageRequest: null,
        displayMode: 'free',       // 'free'=自由漫步（原版） | 'street'=街景过路（走进走出不折返） | 'danmaku'=弹幕（横穿屏幕）
        danmakuSpeed: 60,          // 弹幕滚动速度（px/s，默认缓慢易读；各泳道有轻微差异防止重叠超车）
        showFloorLine: false,      // 街景模式下强制显示地面线
        performanceMode: 'auto',  // 'quality' | 'auto' | 'speed'
        targetFPS: 30,
        defaultCharacterStyle: null, // 传 'kaai' 可让启动时自动切到南风知意
        depthRows: 3,          // 深度层数（1=扁平一行，越大层次越丰富）
        depthScaleFront: 1.05,  // 最前排缩放倍数（基础 scale 的倍率，>1 放大，<1 缩小）
        depthScaleBack: 0.95,  // 最后排缩放倍数
        depthSpread: 0.08,     // 纵向铺开范围（占角色高度的比例，越大前后排越分散）
      }, config);
      SHOW_NAMES = this.config.showNames !== false;

      this.canvas = null; this.ctx = null;
      this.characters = [];
      this.floorY = 0;
      this.running = false;
      this.rafId = null;
      this.lastMessageTime = 0;
      this._lastFrameTs = 0;
      this._frameCount = 0;
      this._fps = 0;
      this._downgradeCount = 0;
      this._downgraded = false;
      this._startedTs = 0; // start() 时回写；用于降质判定的预热宽限

      // 构造期先应用默认风格（保证 initCharacter 时就按赛博朋克色板/头像池抽卡）
      if (this.config.defaultCharacterStyle
        && typeof CharacterRenderer !== 'undefined'
        && typeof CharacterRenderer.applyCharacterStyle === 'function') {
        try { CharacterRenderer.applyCharacterStyle(this.config.defaultCharacterStyle); } catch (_) {}
      }

      this._applyDepthConfig();

      this._initDOM();
      this._initCharacters();
      if (this.config.displayMode === 'danmaku') this._initDanmakuLanes();
      this._bindEvents();
      // 低优先级预加载当前风格下所有可能的形象 key（含 avatar pool 内每一张）
      if (typeof CharacterRenderer !== 'undefined' && typeof CharacterRenderer.preloadStyleSprites === 'function') {
        try {
          const active = (this.config.defaultCharacterStyle
            || ((CharacterRenderer.listCharacterStyles().find(s => s.active) || {}).key)) || 'kaai';
          CharacterRenderer.preloadStyleSprites(active);
        } catch (_) {}
      }
    }

    _initDOM() {
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = `
        position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;
        pointer-events: none; z-index: ${this.config.zIndex};
        opacity: ${this.config.opacity};
      `;
      this.canvas.id = 'msg-wall-canvas-' + uid();
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d', { alpha: true });
      this._resizeCanvas();
    }

    _resizeCanvas() {
      const prefDpr = window.devicePixelRatio || 1;
      let dpr = prefDpr;
      // 弹幕每帧只贴少量缓存图，绘制成本低：保持原生 DPR 渲染，文字最清晰（上限 2 防极端高分屏）
      if (this.config.displayMode === 'danmaku') dpr = Math.min(prefDpr, 2);
      else if (this.config.performanceMode === 'speed') dpr = Math.min(prefDpr, 1);
      else if (this.config.performanceMode === 'auto') dpr = Math.min(prefDpr, 1.5);
      dpr = Math.max(1, dpr);
      const prevDpr = this._activeDpr;
      this._activeDpr = dpr;
      const w = window.innerWidth, h = window.innerHeight;
      // 缓存逻辑视口尺寸，避免每帧从 DOM 读取触发回流
      this._viewportW = w;
      this._viewportH = h;
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      // 保存物理像素尺寸用于 clearRect
      this._physW = this.canvas.width;
      this._physH = this.canvas.height;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.floorY = h * this.config.floorRatio;
      // DPR 变了 => 清缓存，重新生成（原缓存 DPR 不一致会缩放模糊）
      if (prevDpr && prevDpr !== dpr) {
        if (globalSpriteCache) globalSpriteCache.clear();
        if (globalBubbleCache) globalBubbleCache.clear();
      }
      // 同步气泡缓存当前 DPR（性能模式下会夹紧，不等于 devicePixelRatio）
      if (globalBubbleCache) globalBubbleCache.setDpr(dpr);
      try { window.__jmw_activeDpr = dpr; } catch (_) {}
    }

    _bindEvents() {
      // resize 节流 200ms，防止拖拽窗口时每秒几十次重建 canvas
      this._resizeRaf = 0;
      this._onResize = () => {
        if (this._resizeRaf) return;
        this._resizeRaf = requestAnimationFrame(() => {
          this._resizeRaf = 0;
          this._resizeCanvas();
          const w = this._viewportW;
          this.characters.forEach(c => {
            if (c.x > w - c.width - 20) c.x = rand(20, w - 40);
          });
          this._dirtySort = true; // 位置变了，需要重排一次
        });
      };
      window.addEventListener('resize', this._onResize);
    }

    _pickCharacterType() {
      if (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.listCharacterStyles) {
        const act = CharacterRenderer.listCharacterStyles().find(s => s.active);
        if (act && act.key && this._isPersonOnlyStyle(act.key)) return 'person';
      }
      const ratio = this.config.characterTypeRatio;
      const total = Object.values(ratio).reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      for (const [t, v] of Object.entries(ratio)) {
        r -= v;
        if (r <= 0) return t;
      }
      return 'person';
    }

    _activeStyleKey() {
      if (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.listCharacterStyles) {
        return ((CharacterRenderer.listCharacterStyles().find(s => s.active) || {}).key) || 'kaai';
      }
      return 'kaai';
    }

    _isPersonOnlyStyle(styleKey) {
      if (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.poseSheetCfg) {
        const cfg = CharacterRenderer.poseSheetCfg(styleKey);
        if (cfg) return true;
      }
      return styleKey === 'kaai';
    }

    _buildCharacterOptions(type) {
      if (typeof CharacterRenderer === 'undefined' || !CharacterRenderer.generateRandomOptions) return null;
      const styleKey = this._activeStyleKey();
      const opts = CharacterRenderer.generateRandomOptions(type);
      if (opts) {
        opts.__styleKey = styleKey;
        if (typeof CharacterRenderer.pickAvatarForStyle === 'function') {
          const ak = CharacterRenderer.pickAvatarForStyle(styleKey, type);
          if (ak) opts.__avatarKey = ak;
        }
      }
      return opts;
    }

    /** 同步角色宽高（无立绘时用矢量基准尺寸） */
    _syncCharacterSize(c) {
      const hm = { person: [20, 80], cat: [45, 45], dog: [52, 52], rabbit: [45, 55] };
      const hasAvatar = !!(c.options && c.options.__avatarKey
        && typeof CharacterRenderer !== 'undefined'
        && typeof CharacterRenderer._getAvatarImageData === 'function'
        && CharacterRenderer._getAvatarImageData(c.options.__avatarKey));
      if (hasAvatar) {
        c.width = Math.round(111 * c.scale);
        c.height = Math.round(165 * c.scale);
      } else {
        const sz = hm[c.type] || hm.person;
        c.width = sz[0] * c.scale;
        c.height = sz[1] * c.scale;
      }
    }

    /** 街景过路：走出屏幕的角色换新形象，从屏幕另一侧重新走入 */
    _recycleStreetCharacter(c) {
      c.type = this._pickCharacterType();
      c.options = this._buildCharacterOptions(c.type);
      c.direction = Math.random() < 0.5 ? 'left' : 'right';
      const w = this._viewportW || window.innerWidth;
      c.x = c.direction === 'right'
        ? -c.width - rand(10, w * 0.35)
        : w + rand(10, w * 0.35);
      c.speed = rand(0.3, 1.2);
      c.baseSpeed = c.speed;
      c.state = 'walking';
      c.facingTarget = null;
      c.behaviorTimer = randInt(200, 700);
      c.message = null; c.messageTimer = 0; c._cachedBubble = null;
      c._nameCache = null;
      this._syncCharacterSize(c);
      c._recycle = false;
    }

    /** 弹幕泳道初始化：把角色变成横向泳道上的隐形载体（只负责移动与携带消息） */
    _initDanmakuLanes() {
      const w = this._viewportW || window.innerWidth;
      const h = this._viewportH || window.innerHeight;
      const laneCount = this.characters.length;
      const topPad = Math.round(h * 0.12);
      const usable = Math.max(80, h * 0.7 - topPad);
      this.characters.forEach((c, i) => {
        c._danmaku = true;
        c._isDanmaku = true;
        c.direction = 'left'; // 从右向左滚动（B 站弹幕方向）
        c.state = 'walking';
        c.walkFrame = 0;
        // 速度 = 基准速度(px/s)，各泳道 ±20% 差异防重叠超车；每帧位移在 update 时按真实帧间隔换算
        const jitter = rand(0.85, 1.15);
        c.speed = (this.config.danmakuSpeed || 60) * jitter;
        c._danmakuPx = c.speed;
        c.baseSpeed = c.speed;
        c.width = 10; c.height = 30;
        c.laneY = topPad + usable * (laneCount === 1 ? 0.5 : i / (laneCount - 1));
        c.x = rand(0, w);
        c.y = c.laneY;
        c.username = null;
        c.message = null; c.messageTimer = 0; c._cachedBubble = null;
      });
      this._dirtySort = true;
    }

    /** 弹幕：走出屏幕后回到右侧屏幕外待发（由消息分发决定何时再出现） */
    _respawnDanmaku(c) {
      const w = this._viewportW || window.innerWidth;
      // 右侧屏幕外一点点即可；不越过 w+60 回收阈值，避免反复重生
      c.x = w + rand(20, 60);
      c.message = null; c.messageTimer = 0; c._cachedBubble = null;
      c._bubbleRect = null;
      c._recycle = false;
    }

    _initCharacters() {
      const w = this._viewportW || window.innerWidth;
      const count = this.config.characterCount;
      this.characters = [];
      // 记录当前风格 key，写进 options.__styleKey 让 SpriteCache 与 drawImageCharacter 分支生效
      const styleKey = this._activeStyleKey();
      for (let i = 0; i < count; i++) {
        const type = this._pickCharacterType();
        const opts = this._buildCharacterOptions(type);
        const c = new Character({
          type,
          x: rand(0, w),
          speed: rand(0.3, 1.2),
          scale: this.config.characterScale || 1.0,
          direction: Math.random() < 0.5 ? 'left' : 'right',
          options: opts,
        });
        // 如果抽到了 avatar，同步 width/height 到「立绘」尺寸
        if (opts && opts.__avatarKey) {
          c.width = Math.round(111 * c.scale);
          c.height = Math.round(165 * c.scale);
        }
        this.characters.push(c);
      }
      this._dirtySort = true;
    }

    _tick() {
      if (!this.running) return;
      const nowMs = performance.now();
      // 弹幕模式按 60fps 原生刷新：水平匀速滚动在 30fps 节流下会有明显的 3:2 节拍抖动
      const isDanmakuMode = this.config.displayMode === 'danmaku';
      const effFps = isDanmakuMode ? 60 : (this.config.targetFPS || PERF.targetFPS || 30);
      const frameInterval = 1000 / effFps;
      // 帧率节流：不到间隔就跳过
      if (nowMs - this._lastFrameTs < frameInterval - 1) {
        this.rafId = requestAnimationFrame(() => this._tick());
        return;
      }
      // 真实帧间隔（弹幕按 dt 位移；钳制 1~100ms 防止后台切回后瞬移）
      const frameDt = clamp(nowMs - (this._lastFrameTs || (nowMs - frameInterval)), 1, 100);
      PERF.frameDt = frameDt;
      const frameStart = nowMs;
      this._frameCount++;
      if (nowMs - (this._lastFpsTs || 0) > 1000) {
        this._fps = Math.round(this._frameCount * 1000 / (nowMs - (this._lastFpsTs || nowMs)));
        this._frameCount = 0;
        this._lastFpsTs = nowMs;
        // 启动/切换风格后有 5s 预热宽限：素材并发解码造成的瞬时掉帧不触发降质
        if (PERF.autoDowngrade && this.config.performanceMode === 'auto'
          && nowMs - (this._startedTs || 0) > 5000) {
          if (this._fps < effFps * 0.6 && this.characters.length > 5) {
            this._downgradeCount++;
            if (this._downgradeCount >= 2 && !this._downgraded) {
              this._doAutoDowngrade();
            }
          } else {
            this._downgradeCount = Math.max(0, this._downgradeCount - 1);
          }
        }
      }
      this._lastFrameTs = nowMs;

      // 用缓存的视口+物理尺寸，不读 DOM 触发回流
      const w = this._viewportW || (this._viewportW = window.innerWidth);
      const h = this._viewportH || (this._viewportH = window.innerHeight);
      // 注意：setTransform 之后 ctx 坐标系是逻辑像素（1单位=1逻辑px）
      // 但 clearRect 走的是 CURRENT TRANSFORM 后的坐标系 —— 因此这里应该按逻辑像素清
      this.ctx.clearRect(0, 0, w, h);

      // 街景模式：地面线（小人踩线行走，参考霂明导航）
      if (this.config.displayMode === 'street' || this.config.showFloorLine) {
        const gctx = this.ctx;
        gctx.save();
        gctx.strokeStyle = 'rgba(128, 128, 128, 0.28)';
        gctx.lineWidth = 1;
        gctx.setLineDash([1, 6]);
        gctx.beginPath();
        gctx.moveTo(0, Math.round(this.floorY) + 0.5);
        gctx.lineTo(w, Math.round(this.floorY) + 0.5);
        gctx.stroke();
        gctx.restore();
      }

      // 更新（顺便判断是否需要重新排序）
      let needsSort = !!this._dirtySort;
      const isStreet = this.config.displayMode === 'street';
      const isDanmaku = this.config.displayMode === 'danmaku';
      for (let i = 0; i < this.characters.length; i++) {
        const c = this.characters[i];
        const prevY = c.y;
        const prevScale = c.scale;
        c.update(w, h, this.floorY, this.characters, this.config.displayMode);
        if (!needsSort && (c.y !== prevY || c.scale !== prevScale)) needsSort = true;
        // 街景过路：走出屏幕的角色换个新形象从另一侧重新入场
        if (isStreet && c._recycle) this._recycleStreetCharacter(c);
        // 弹幕：走出屏幕的弹幕条回到左侧重新排队
        if (isDanmaku && c._recycle) this._respawnDanmaku(c);
      }
      // 深度排序：按脚底 y 升序（后排先画、前排后画并挡住后排）
      if (needsSort) {
        this.characters.sort((a, b) => (a.y - b.y) || (a.scale - b.scale));
      }
      this._dirtySort = false;

      // 绘制（不遮挡：角色全身站立在地面线上，基准线以下保持透明、不绘制任何遮罩）
      this._bubbleRects = [];
      for (let i = 0; i < this.characters.length; i++) {
        const c = this.characters[i];
        c.draw(this.ctx);
        // 记录气泡命中矩形（供悬停详情/点击跳转）
        if (c.message && c._bubbleRect) {
          this._bubbleRects.push({ r: c._bubbleRect, c });
        }
      }

      // 分发消息
      if (nowMs - this.lastMessageTime > this.config.messageInterval) {
        this._dispatchMessage();
        this.lastMessageTime = nowMs;
      }

      this._lastDrawMs = performance.now() - frameStart;
      this.rafId = requestAnimationFrame(() => this._tick());
    }

    _doAutoDowngrade() {
      this._downgraded = true;
      // 角色减半
      const half = Math.max(4, Math.floor(this.characters.length / 2));
      this.characters.length = half;
      this.config.characterCount = half;
      if (this.config.displayMode === 'danmaku') {
        // 弹幕绘制成本极低（每帧只贴缓存的药丸图）：只减泳道数，
        // 不锁 24fps、不压 DPR —— 锁帧会加剧滚动抖动，压 DPR 会让文字发虚
        console.warn('[MessageWall] 弹幕模式检测到卡顿，自动降质：泳道减半（保持帧率与清晰度）');
        this._resizeCanvas();
        return;
      }
      console.warn('[MessageWall] 检测到卡顿，自动降质：角色减半 + 30fps锁帧 + 简化渲染');
      // 强制 speed 模式
      this.config.performanceMode = 'speed';
      this.config.targetFPS = 24;
      // 重设 DPR
      this._resizeCanvas();
    }

    _dispatchMessage() {
      if (typeof this.config.onMessageRequest !== 'function') return;
      let msg;
      try { msg = this.config.onMessageRequest(); } catch (e) { return; }
      if (!msg) return;
      let idle = this.characters.filter(c => !c.message);
      if (!idle.length) return;
      const w = window.innerWidth;
      let sel;
      if (this.config.displayMode === 'danmaku') {
        // 弹幕（从右向左）：只发给已入场（x < w）的泳道载体，且偏好屏幕右半侧（留足左移展示路程）
        const ready = idle.filter(c => c.x > w * 0.45 && c.x < w);
        if (!ready.length) return;
        sel = choice(ready);
      } else {
        const weights = idle.map(c => Math.max(1, w / 2 - Math.abs(c.x + c.width / 2 - w / 2)));
        let total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        sel = idle[0];
        for (let i = 0; i < idle.length; i++) {
          r -= weights[i];
          if (r <= 0) { sel = idle[i]; break; }
        }
      }
      sel.setMessage(msg.text, msg.meta || {}, this.config.messageDuration);
    }

    // 命中检测：判断 (x,y) 是否落在某个角色的消息气泡内，返回 { r, c }
    hitTestBubble(x, y) {
      if (!this._bubbleRects || !this._bubbleRects.length) return null;
      for (let i = this._bubbleRects.length - 1; i >= 0; i--) {
        const r = this._bubbleRects[i].r;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          return this._bubbleRects[i];
        }
      }
      return null;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this._startedTs = performance.now();
      this.lastMessageTime = performance.now() - this.config.messageInterval + 500;
      this._lastFrameTs = 0;
      this._tick();
    }

    stop() {
      this.running = false;
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    }

    destroy() {
      this.stop();
      window.removeEventListener('resize', this._onResize);
      if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
      this.canvas = null; this.ctx = null; this.characters = [];
    }

    updateConfig(newCfg) {
      Object.assign(this.config, newCfg);
      if (typeof newCfg.showNames === 'boolean') SHOW_NAMES = newCfg.showNames;
      if (this.canvas) {
        this.canvas.style.opacity = String(this.config.opacity);
        this.canvas.style.zIndex = String(this.config.zIndex);
      }
      if (typeof newCfg.characterCount === 'number') this._setCharacterCount(newCfg.characterCount);
      if (newCfg.displayMode) {
        // 切换显示方式：重新铺一遍角色（street 需要全场分布 + 过路方向；danmaku 需要泳道）
        this._initCharacters();
        if (newCfg.displayMode === 'danmaku') this._initDanmakuLanes();
        this._dirtySort = true;
        this._resizeCanvas(); // displayMode 决定 DPR 策略（弹幕保原生清晰度）
        this._startedTs = performance.now(); // 切换后素材重新预热，降质判定再宽限 5s
      }
      if (newCfg.performanceMode) this._resizeCanvas();
      if (newCfg.targetFPS) PERF.targetFPS = newCfg.targetFPS;
      // 气泡字号变化：同步到模块级变量并清空全局气泡缓存，下一帧用新字号重绘
      if (typeof newCfg.bubbleFontSize === 'number') {
        BUBBLE_FONT_SIZE = newCfg.bubbleFontSize;
        if (globalBubbleCache) globalBubbleCache.clear();
      }
      // 深度分层配置变化：重新分配每个角色的深度行（保证范围合法）
      if (typeof newCfg.depthRows === 'number'
        || typeof newCfg.depthScaleFront === 'number'
        || typeof newCfg.depthScaleBack === 'number'
        || typeof newCfg.depthSpread === 'number') {
        this._applyDepthConfig();
        this._reassignDepthRows();
        this._dirtySort = true;
      }
    }

    /** 把 config.depth* 同步到模块级变量（供 Character 类的 getter/setter 读取） */
    _applyDepthConfig() {
      const rows = Math.max(1, Math.min(10, Math.round(this.config.depthRows || 1)));
      const front = Math.max(0.5, Math.min(2, +this.config.depthScaleFront || 1));
      const back = Math.max(0.3, Math.min(1.5, +this.config.depthScaleBack || 0.8));
      const spread = Math.max(0, Math.min(1, +this.config.depthSpread || 0.2));
      DEPTH_ROWS = rows;
      DEPTH_SCALE_FRONT = front;
      DEPTH_SCALE_BACK = back;
      DEPTH_SPREAD = spread;
      this.config.depthRows = rows;
      this.config.depthScaleFront = front;
      this.config.depthScaleBack = back;
      this.config.depthSpread = spread;
    }

    /** 重新为每个角色分配深度行（层数变化时调用，避免角色都挤在同一行） */
    _reassignDepthRows() {
      const n = DEPTH_ROWS;
      if (n <= 1) {
        for (const c of this.characters) c._depthRow = 0;
        return;
      }
      // 轮流分配：保证每行尽量均匀
      for (let i = 0; i < this.characters.length; i++) {
        this.characters[i]._depthRow = i % n;
      }
    }

    _setCharacterCount(target) {
      const cur = this.characters.length;
      if (target === cur) return;
      if (target > cur) {
        const w = window.innerWidth;
        for (let i = cur; i < target; i++) {
          const type = this._pickCharacterType();
          const opts = this._buildCharacterOptions(type);
          const c = new Character({
            type, x: rand(0, w),
            speed: rand(0.3, 1.2),
            scale: this.config.characterScale || 1.0,
            options: opts,
          });
          // 抽到头像时同步立绘尺寸（与 _initCharacters 一致）
          if (opts && opts.__avatarKey) {
            c.width = Math.round(111 * c.scale);
            c.height = Math.round(165 * c.scale);
          }
          this.characters.push(c);
        }
        this._dirtySort = true; // 新角色按深度排序键插入前后排
      } else {
        this.characters.length = target;
      }
    }

    setTypeRatio(ratio) { this.config.characterTypeRatio = ratio; }

    /**
     * 动态调节人群地面线高度：pct = 距视口底部的高度百分比（-15~60），下一帧生效。
     * 负值 = 地面线移到视口底边以下，屏幕底边自然裁掉角色腿部（原站「人群从底边探头」效果，
     * 无需任何 clip，画布边界即裁切线）；-15 约为角色身高全部没入的极限，过深角色将不可见。
     */
    setGroundHeight(pct) {
      const v = Math.max(-15, Math.min(60, +pct || 0));
      this.config.floorRatio = 1 - v / 100;
      const h = this._viewportH || window.innerHeight;
      this.floorY = Math.round(h * this.config.floorRatio);
      this._dirtySort = true;
      return v;
    }

    /** 读取当前人群地面线高度（距视口底部的高度百分比） */
    getGroundHeight() {
      return Math.round((1 - this.config.floorRatio) * 100);
    }

    /** 全局角色大小：缩放现有角色并记住，为新增角色使用 */
    setCharacterScale(v) {
      v = Math.max(0.4, Math.min(2, +v || 1));
      this.config.characterScale = v;
      const baseSize = { person: [20, 80], cat: [45, 45], dog: [52, 52], rabbit: [45, 55] };
      for (const c of this.characters) {
        c.scale = v;
        if (c.options && c.options.__avatarKey) {
          const ronin = c.options.__avatarKey === 'cb_p01_ronin';
          c.width = Math.round((ronin ? 153 : 111) * v);
          c.height = Math.round(165 * v);
        } else {
          const sz = baseSize[c.type] || baseSize.person;
          c.width = sz[0] * v;
          c.height = sz[1] * v;
        }
        c._cachedBubble = null;
        c._nameCache = null;
      }
      if (typeof globalSpriteCache !== 'undefined' && globalSpriteCache) {
        try { globalSpriteCache.clear(); } catch (_) {}
      }
    }

    /**
     * 动态调整深度分层。参数可为完整对象或单个字段：
     * { rows, scaleFront, scaleBack, spread } → 对应设置；缺省字段保持不变
     */
    setDepthConfig(opts = {}) {
      const patch = {};
      if (typeof opts.rows === 'number') patch.depthRows = opts.rows;
      if (typeof opts.scaleFront === 'number') patch.depthScaleFront = opts.scaleFront;
      if (typeof opts.scaleBack === 'number') patch.depthScaleBack = opts.scaleBack;
      if (typeof opts.spread === 'number') patch.depthSpread = opts.spread;
      if (!Object.keys(patch).length) return;
      Object.assign(this.config, patch);
      this._applyDepthConfig();
      this._reassignDepthRows();
      this._dirtySort = true;
      for (const c of this.characters) { c._cachedBubble = null; c._nameCache = null; }
      if (typeof globalSpriteCache !== 'undefined' && globalSpriteCache) {
        try { globalSpriteCache.clear(); } catch (_) {}
      }
    }

    /** 列出当前可用的角色风格 */
    listCharacterStyles() {
      if (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.listCharacterStyles) {
        return CharacterRenderer.listCharacterStyles();
      }
      return [{ key: 'kaai', label: '🎪 南风知意', desc: '60 款 4×15 南风知意人物（跳过雪碧图动物行）', active: true }];
    }

    /** 应用角色风格：切换色板/配件权重 → 按物种从 avatar pool 抽新图 → 清精灵/气泡缓存 */
    applyCharacterStyle(key) {
      if (typeof CharacterRenderer === 'undefined' || !CharacterRenderer.applyCharacterStyle) return false;
      const ok = CharacterRenderer.applyCharacterStyle(key);
      if (!ok) return false;
      const styleKey = key;
      const hasPoolFn = (typeof CharacterRenderer.pickAvatarForStyle === 'function');
      // 后台立刻预加载「该风格下全部可能的立绘」（avatar pool + 默认图）
      if (typeof CharacterRenderer._listImageKeysForStyle === 'function'
        && typeof CharacterRenderer.loadStyleSprite === 'function') {
        try {
          const arr = CharacterRenderer._listImageKeysForStyle(styleKey);
          arr.forEach((k, i) => setTimeout(() => CharacterRenderer.loadStyleSprite(k, true), i * 40));
        } catch (_) {}
      } else if (typeof CharacterRenderer.loadStyleSprite === 'function') {
        try { CharacterRenderer.loadStyleSprite(styleKey, true); } catch (_) {}
      }
      const hasImageData = (typeof CharacterRenderer._getStyleImageData === 'function'
        && !!CharacterRenderer._getStyleImageData(styleKey));
      // 重建角色 options（保留位置/速度/类型/朝向等，只换外观 + avatar）
      for (const c of this.characters) {
        // pose-sheet 雪碧图风格：立绘池只有人物
        if (this._isPersonOnlyStyle(styleKey)) c.type = 'person';
        const keepKeys = ['type', 'x', 'y', 'speed', 'baseSpeed', 'scale', 'direction',
          'walkFrameSpeed', 'username'];
        const kept = {};
        keepKeys.forEach(k => { if (k in c) kept[k] = c[k]; });
        const opts = CharacterRenderer.generateRandomOptions(c.type);
        if (opts) {
          opts.__styleKey = styleKey;
          if (hasPoolFn) {
            const ak = CharacterRenderer.pickAvatarForStyle(styleKey, c.type);
            if (ak) opts.__avatarKey = ak;
          }
        }
        kept.options = opts;
        Object.assign(c, kept);
        c.message = null; c._cachedBubble = null; c.messageTimer = 0;
        // 同步 character.width/height
        try {
          const hm = { person: [20, 80], cat: [45, 45], dog: [52, 52], rabbit: [45, 55] };
          const sz = hm[c.type] || hm.person;
          const useAvatar = !!(opts && opts.__avatarKey);
          const useImg = useAvatar || hasImageData;
          if (useImg) {
            c.width = Math.round(111 * c.scale); // ≈ 110*0.67 2:3 宽
            c.height = Math.round(165 * c.scale);
          } else {
            c.width = sz[0] * c.scale;
            c.height = sz[1] * c.scale;
          }
        } catch (_) {}
      }
      // 清空缓存（旧缓存属于旧色板/旧图片）
      if (globalSpriteCache) globalSpriteCache.clear();
      if (globalBubbleCache) globalBubbleCache.clear();
      this._dirtySort = true;
      return true;
    }

    pushMessage(text, meta = {}, duration) {
      const idle = this.characters.filter(c => !c.message);
      if (!idle.length) return false;
      choice(idle).setMessage(text, meta, duration || this.config.messageDuration);
      return true;
    }

    getCharacters() { return this.characters; }
    getFPS() { return this._fps; }
    getSpriteStats() { return globalSpriteCache.stats(); }
  }

  // ============ 导出 ============
  const exports = {
    MessageWallEngine,
    Character,
    SpriteCache,
    PERF,
    _internal: { globalSpriteCache, globalBubbleCache },
    utils: { clamp, rand, randInt, choice, wrapText }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = exports;
  else global.MessageWallCore = exports;

})(typeof window !== 'undefined' ? window : this);

/**
 * 掘金消息提供者 & 控制面板
 * Juejin Message Provider + Control Panel
 *
 * 功能：
 * 1. 从掘金页面抓取消息（沸点/首页/文章评论/通知）
 * 2. 提供完整的控制面板 UI，用于调整：
 *    - 角色数量、类型比例
 *    - 消息源、消息间隔/时长
 *    - 透明度、开关
 *    - 快速切换模式
 */

(function (global) {
  'use strict';

  // ============ 分类标签配置 ============
  const CATEGORY_TAGS = {
    pin: { color: '#1E80FF', label: '沸点' },
    'pin-new': { color: '#1890FF', label: '沸点·最新' },
    'pin-hot': { color: '#F5222D', label: '沸点·最热' },
    hot: { color: '#FF4D4F', label: '热榜' },
    recommend: { color: '#52C41A', label: '推荐' },
    comment: { color: '#722ED1', label: '评论' },
    notice: { color: '#FA8C16', label: '通知' },
    article: { color: '#13C2C2', label: '文章' },
    'article-new': { color: '#13C2C2', label: '文章·最新' },
    'article-hot': { color: '#FF7A45', label: '文章·最热' },
    demo: { color: '#EB2F96', label: '示例' },
  };

  // ============ 掘金 API 端点配置 ============
  const JUEJIN_APIS = {
    // 沸点推荐（sort_type: 200=推荐, 300=最新）
    pinRecommend: 'https://api.juejin.cn/recommend_api/v1/short_msg/recommend',
    // 沸点最热
    pinHot: 'https://api.juejin.cn/recommend_api/v1/short_msg/hot',
    // 文章推荐/最新 feed（sort_type: 200=推荐, 300=最新）
    articleFeed: 'https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed',
    // 文章热榜
    articleHot: 'https://api.juejin.cn/rank_api/v1/scroll_article/list',
    // 评论列表（item_type: 2=文章, 4=沸点）
    commentList: 'https://api.juejin.cn/interact_api/v1/comment/list',
  };

  // ============ 掘金消息抓取器 ============
  class JuejinMessageProvider {
    constructor(options = {}) {
      this.options = Object.assign({
        sources: ['pin', 'article', 'comment'], // 可选来源
        minInterval: 800,
        enableScheduledFetch: true,  // 启用定时轮询
        fetchInterval: 5 * 60 * 1000, // 定时轮询间隔：5分钟
      }, options);
      this.messagePool = [];      // 消息缓存池
      this.lastFetchTime = 0;
      this.fetchCooldown = 30_000; // 30秒抓取一次新的
      this.fetching = false;
      this._demoMessages = this._buildDemoMessages();
      this._scheduledTimer = null;  // 定时轮询定时器
      this._fetchStats = {          // 抓取统计
        pinNew: 0, pinHot: 0,
        articleNew: 0, articleHot: 0,
        comment: 0,
        lastScheduledAt: 0,
      };
      // 启动定时轮询
      if (this.options.enableScheduledFetch) {
        this._startScheduledFetch();
      }
    }

    _buildDemoMessages() {
      // 当无法从页面抓取时使用的示例消息
      return [
        { text: '前端三巨头 React Vue Angular 你pick谁？', tag: 'hot', source: '热榜' },
        { text: 'TypeScript 5.x 有哪些新特性值得关注？', tag: 'article', source: '推荐' },
        { text: '新人报道，请问怎么才能赚更多积分呀', tag: 'pin', source: '沸点' },
        { text: '打卡！今天也要努力写代码 💪', tag: 'pin', source: '沸点' },
        { text: '分享一个 CSS 神操作：backdrop-filter 真的好用', tag: 'article', source: '推荐' },
        { text: '有没有人知道掘金等级怎么升级快一点？', tag: 'comment', source: '评论' },
        { text: 'AI 写代码是真的香，已经帮我省了半天时间', tag: 'pin', source: '沸点' },
        { text: '面试被问红黑树，我当场懵了…', tag: 'hot', source: '热榜' },
        { text: '今年前端找工作真的难吗？求分享面经', tag: 'hot', source: '热榜' },
        { text: '推荐一本好书《代码整洁之道》', tag: 'article', source: '推荐' },
        { text: '深夜emo，技术人到35岁该何去何从？', tag: 'pin', source: '沸点' },
        { text: '用 Rust 写了个 CLI 工具，速度提升10倍！', tag: 'article', source: '推荐' },
        { text: '今天这个bug调了我3小时，最后发现是少打了个s', tag: 'pin', source: '沸点' },
        { text: '大家周报都怎么写？感觉每次都在凑字数', tag: 'comment', source: '评论' },
        { text: '新人第一次写文章，求点赞支持一下～', tag: 'article', source: '推荐' },
        { text: '掘金这个消息墙也太可爱了吧！！', tag: 'pin', source: '沸点' },
        { text: '用 Canvas 写了一个粒子特效，大家觉得怎么样', tag: 'article', source: '推荐' },
        { text: '摸鱼时间到～来唠唠今天都干了啥', tag: 'pin', source: '沸点' },
        { text: '字节/阿里/腾讯 前端面试真题大汇总', tag: 'hot', source: '热榜' },
        { text: '请问微前端现在落地情况怎么样？值得学吗？', tag: 'comment', source: '评论' },
      ];
    }

    // 从掘金页面抓取内容
    async _fetchFromPage() {
      const isJuejin = location.hostname.includes('juejin.cn');
      if (!isJuejin) return [];

      const results = [];

      try {
        // 1. 沸点列表（pins）
        if (location.pathname.startsWith('/pins') || location.pathname === '/') {
          const pinItems = document.querySelectorAll('.pin-list .item, .pin-item, .content-box, article.pin');
          pinItems.forEach((el, i) => {
            if (i > 20) return;
            const textEl = el.querySelector('.content, .text, p, .pin-content');
            if (textEl && textEl.textContent.trim()) {
              // 尝试提取沸点链接和 ID
              let pinUrl = null;
              let pinId = null;
              const linkEl = el.querySelector('a[href*="/pin/"]');
              if (linkEl) {
                const href = linkEl.getAttribute('href') || '';
                pinUrl = href.startsWith('http') ? href : ('https://juejin.cn' + (href.startsWith('/') ? '' : '/') + href);
                const m = href.match(/\/pin\/([a-zA-Z0-9]+)/);
                if (m) pinId = m[1];
              }
              const authorEl = el.querySelector('.username, .user-name, .author-name, [class*="author"]');
              results.push({
                text: textEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 80),
                tag: 'pin',
                source: '沸点',
                username: authorEl ? authorEl.textContent.trim() : '',
                pinId: pinId,
                url: pinUrl,
              });
            }
          });
        }

        // 2. 文章列表 / 首页信息流
        const articleItems = document.querySelectorAll(
          '.entry-list .item, .article-item, .entry-item, .content-wrap, ul.entry-list > li, .article-list .item'
        );
        articleItems.forEach((el, i) => {
          if (i > 15) return;
          const titleEl = el.querySelector('.title, a.title, .article-title, h2, .content-title');
          if (titleEl && titleEl.textContent.trim()) {
            // 尝试提取文章链接
            let articleUrl = null;
            let articleId = null;
            const linkEl = el.querySelector('a[href*="/post/"], a[href*="/article/"]');
            if (linkEl) {
              const href = linkEl.getAttribute('href') || '';
              articleUrl = href.startsWith('http') ? href : ('https://juejin.cn' + (href.startsWith('/') ? '' : '/') + href);
              const m = href.match(/\/(?:post|article)\/([a-zA-Z0-9]+)/);
              if (m) articleId = m[1];
            }
            // 从当前页面 URL 中提取（如果在文章详情页）
            if (!articleId) {
              const pm = location.pathname.match(/\/(?:post|article)\/([a-zA-Z0-9]+)/);
              if (pm) articleId = pm[1];
            }
            const authorEl = el.querySelector('.username, .author-name, .user-name, [class*="author"]');
            results.push({
              text: titleEl.textContent.trim().slice(0, 60),
              tag: Math.random() < 0.3 ? 'hot' : 'recommend',
              source: Math.random() < 0.3 ? '热榜' : '推荐',
              username: authorEl ? authorEl.textContent.trim() : '',
              articleId: articleId,
              url: articleUrl,
            });
          }
        });

        // 3. 评论区
        const commentItems = document.querySelectorAll(
          '.comment-list .comment, .comment-item, .reply-item, div[class*="comment"]'
        );
        // 从当前页面 URL 提取文章 ID（评论通常在文章详情页）
        let curArticleId = null;
        const pm = location.pathname.match(/\/(?:post|article)\/([a-zA-Z0-9]+)/);
        if (pm) curArticleId = pm[1];
        commentItems.forEach((el, i) => {
          if (i > 10) return;
          const contentEl = el.querySelector('.comment-content, .content, p:not(:empty)');
          if (contentEl && contentEl.textContent.trim().length > 5) {
            const authorEl = el.querySelector('.username, .user-name, .author-name, [class*="author"]');
            results.push({
              text: contentEl.textContent.trim().replace(/\s+/g, ' ').slice(0, 60),
              tag: 'comment',
              source: '评论',
              username: authorEl ? authorEl.textContent.trim() : '',
              articleId: curArticleId,
            });
          }
        });

        // 4. 通知 / 消息中心（如果打开了）
        const notifItems = document.querySelectorAll('.notification-item, .msg-item, .message-item');
        notifItems.forEach((el, i) => {
          if (i > 8) return;
          const text = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60);
          if (text.length > 3) {
            results.push({ text, tag: 'notice', source: '通知' });
          }
        });
      } catch (e) {
        console.warn('[JuejinProvider] parse error:', e);
      }

      return results;
    }

    // ============ 定时轮询：每5分钟获取最新和最热的文章、沸点、回复
    _startScheduledFetch() {
      if (this._scheduledTimer) return;
      // 首次延迟 10 秒启动，避免与初始加载错开
      this._scheduledTimer = setTimeout(() => {
        this._runScheduledFetch();
        this._scheduledTimer = setInterval(() => {
          this._runScheduledFetch();
        }, this.options.fetchInterval);
      }, 10_000);
    }

    _stopScheduledFetch() {
      if (this._scheduledTimer) {
        clearInterval(this._scheduledTimer);
        clearTimeout(this._scheduledTimer);
        this._scheduledTimer = null;
      }
    }

    async _runScheduledFetch() {
      const isJuejin = typeof location !== 'undefined' && location.hostname && location.hostname.includes('juejin.cn');
      if (!isJuejin) return;
      if (this.fetching) return;

      this.fetching = true;
      const startTime = Date.now();
      try {
        console.log('[JuejinProvider] 定时抓取开始...');
        const results = await Promise.allSettled([
          this._fetchPinLatest(),
          this._fetchPinHot(),
          this._fetchArticleLatest(),
          this._fetchArticleHot(),
          this._fetchHotComments(),
        ]);
        const allMsgs = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && Array.isArray(r.value)) {
            allMsgs.push(...r.value);
          }
        });
        if (allMsgs.length > 0) {
          const seen = new Set(this.messagePool.map(m => m.text));
          const unique = allMsgs.filter(m => !seen.has(m.text));
          const now2 = Date.now();
          unique.forEach(m => { m.fetchedAt = now2; });
          this.messagePool.push(...unique);
          // 限制池大小上限，防止无限增长
          if (this.messagePool.length > 500) {
            this.messagePool = this.messagePool.slice(-400);
          }
          this._fetchStats.lastScheduledAt = now2;
          console.log('[JuejinProvider] 定时抓取完成，新增', unique.length, '条消息，池大小', this.messagePool.length);
        }
      } catch (e) {
        console.warn('[JuejinProvider] scheduled fetch failed:', e);
      } finally {
        this.fetching = false;
      }
    }

    // ============ 沸点：最新（sort_type=300）
    async _fetchPinLatest() {
      const results = [];
      try {
        const resp = await fetch(JUEJIN_APIS.pinRecommend, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cursor: '0', limit: 20, sort_type: 300 })
        });
        if (resp.ok) {
          const data = await resp.json();
          (data.data || []).forEach(item => {
            const info = item.msg_Info || {};
            const txt = item.msg_content
              || (info.content || item.content || '').replace(/<[^>]+>/g, '');
            if (txt && txt.trim()) {
              results.push({
                text: txt.replace(/\s+/g, ' ').trim().slice(0, 80),
                tag: 'pin-new',
                source: '沸点·最新',
                username: (item.author_user_info && item.author_user_info.user_name) || '',
                pinId: String(item.msg_id || info.msg_id || ''),
                replyCount: info.comment_count || 0,
                likeCount: info.digg_count || 0,
                url: item.msg_id ? `https://juejin.cn/pin/${item.msg_id}` : null,
              });
            }
          });
          this._fetchStats.pinNew = results.length;
        }
      } catch (e) { /* ignore */ }
      return results;
    }

    // ============ 沸点：最热
    async _fetchPinHot() {
      const results = [];
      try {
        const resp = await fetch(JUEJIN_APIS.pinHot, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cursor: '0', limit: 20, sort_type: 200 })
        });
        if (resp.ok) {
          const data = await resp.json();
          (data.data || []).forEach(item => {
            const info = item.msg_Info || {};
            const txt = item.msg_content
              || (info.content || item.content || '').replace(/<[^>]+>/g, '');
            if (txt && txt.trim()) {
              results.push({
                text: txt.replace(/\s+/g, ' ').trim().slice(0, 80),
                tag: 'pin-hot',
                source: '沸点·最热',
                username: (item.author_user_info && item.author_user_info.user_name) || '',
                pinId: String(item.msg_id || info.msg_id || ''),
                replyCount: info.comment_count || 0,
                likeCount: info.digg_count || 0,
                url: item.msg_id ? `https://juejin.cn/pin/${item.msg_id}` : null,
              });
            }
          });
          this._fetchStats.pinHot = results.length;
        }
      } catch (e) { /* ignore */ }
      return results;
    }

    // ============ 文章：最新
    async _fetchArticleLatest() {
      const results = [];
      try {
        const resp = await fetch(JUEJIN_APIS.articleFeed, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            cursor: '0',
            limit: 20,
            sort_type: 300, // 最新
            id_type: 2,
            client_type: 2608,
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          (data.data || []).forEach(item => {
            const info = item.article_info || {};
            const author = item.author_user_info || {};
            const title = info.title || '';
            if (title && title.trim()) {
              results.push({
                text: title.trim().slice(0, 80),
                tag: 'article-new',
                source: '文章·最新',
                username: author.user_name || '',
                articleId: String(info.article_id || item.articleId || ''),
                replyCount: info.comment_count || 0,
                likeCount: info.digg_count || 0,
                url: info.article_id ? `https://juejin.cn/post/${info.article_id}` : null,
              });
            }
          });
          this._fetchStats.articleNew = results.length;
        }
      } catch (e) { /* ignore */ }
      return results;
    }

    // ============ 文章：最热（热榜）
    async _fetchArticleHot() {
      const results = [];
      try {
        // 先用热榜 API 接口
        const resp = await fetch(JUEJIN_APIS.articleHot, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            cursor: '0',
            limit: 20,
            sort_type: 200,
          })
        });
        if (resp.ok) {
          const data = await resp.json();
          const list = data.data || [];
          list.forEach(item => {
            const info = item.article_info || item;
            const author = item.author_user_info || {};
            const title = info.title || '';
            if (title && title.trim()) {
              results.push({
                text: title.trim().slice(0, 80),
                tag: 'article-hot',
                source: '文章·最热',
                username: author.user_name || '',
                articleId: String(info.article_id || item.articleId || ''),
                replyCount: info.comment_count || 0,
                likeCount: info.digg_count || 0,
                url: info.article_id ? `https://juejin.cn/post/${info.article_id}` : null,
              });
            }
          });
          this._fetchStats.articleHot = results.length;
        }
      } catch (e) { /* ignore */ }
      return results;
    }

    // ============ 热门评论/回复：从热门沸点和热榜文章中提取
    async _fetchHotComments() {
      const results = [];
      try {
        // 先获取热门沸点列表（取前3条沸点的评论）
        const pinResp = await fetch(JUEJIN_APIS.pinHot, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cursor: '0', limit: 3, sort_type: 200 })
        });
        if (pinResp.ok) {
          const pinData = await pinResp.json();
          const pins = (pinData.data || []).slice(0, 3);
          for (const pin of pins) {
            const pinId = pin.msg_id || (pin.msg_Info && pin.msg_Info.msg_id);
            if (!pinId) continue;
            try {
              const cResp = await fetch(JUEJIN_APIS.commentList, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  item_type: 4, // 4 = 沸点
                  item_id: String(pinId),
                  cursor: '0',
                  limit: 5,
                  sort: 0, // 0=按热度排序
                })
              });
              if (cResp.ok) {
                const cData = await cResp.json();
                ((cData.data && cData.data.comments) || []).forEach(c => {
                  const content = c.comment_info && c.comment_info.content || '';
                  const clean = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                  if (clean && clean.length > 5) {
                    results.push({
                      text: clean.slice(0, 80),
                      tag: 'comment',
                      source: '评论',
                      username: (c.comment_user_info && c.comment_user_info.user_name) || '',
                      pinId: String(pinId),
                      replyCount: (c.comment_info && c.comment_info.reply_count) || 0,
                      likeCount: (c.comment_info && c.comment_info.digg_count) || 0,
                      url: `https://juejin.cn/pin/${pinId}`,
                    });
                  }
                });
              }
            } catch (_) { /* 单个沸点评论失败不影响整体 */ }
          }
        }
        this._fetchStats.comment = results.length;
      } catch (e) { /* ignore */ }
      return results;
    }

    // 尝试通过掘金API抓取（带cookies的fetch）— 兼容旧接口，调用所有API并合并
    async _fetchFromAPI() {
      const isJuejin = typeof location !== 'undefined' && location.hostname && location.hostname.includes('juejin.cn');
      if (!isJuejin) return [];

      const results = [];
      try {
        // 沸点推荐列表 API（公开）
        const resp = await fetch(JUEJIN_APIS.pinRecommend, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ cursor: '0', limit: 20, sort_type: 200 })
        });
        if (resp.ok) {
          const data = await resp.json();
          (data.data || []).forEach(item => {
            const info = item.msg_Info || {};
            const txt = item.msg_content
              || (info.content || item.content || '').replace(/<[^>]+>/g, '');
            if (txt && txt.trim()) {
              results.push({
                text: txt.replace(/\s+/g, ' ').trim().slice(0, 80),
                tag: 'pin',
                source: '沸点',
                username: (item.author_user_info && item.author_user_info.user_name) || '',
                pinId: String(item.msg_id || info.msg_id || ''),
                replyCount: info.comment_count || 0,
                likeCount: info.digg_count || 0,
                url: item.msg_id ? `https://juejin.cn/pin/${item.msg_id}` : null,
              });
            }
          });
        }
      } catch (e) {
        // API可能跨域或鉴权失败，忽略
      }
      return results;
    }

    async _ensurePoolFilled() {
      if (this.fetching) return;
      const now = Date.now();
      if (this.messagePool.length > 5 && now - this.lastFetchTime < this.fetchCooldown) return;

      this.fetching = true;
      try {
        const fromPage = await this._fetchFromPage();
        const fromAPI = await this._fetchFromAPI();
        const combined = [...fromPage, ...fromAPI];
        if (combined.length > 0) {
          // 去重
          const seen = new Set(this.messagePool.map(m => m.text));
          const unique = combined.filter(m => !seen.has(m.text));
          const now2 = Date.now();
          unique.forEach(m => { m.fetchedAt = now2; }); // 入池时间，供气泡「新」标记判定
          this.messagePool.push(...unique);
        }
        this.lastFetchTime = now;
      } catch (e) {
        console.warn('[JuejinProvider] fetch failed:', e);
      } finally {
        this.fetching = false;
      }
    }

    // 取一条消息
    async getMessage() {
      // 如果池中消息不够，后台异步补
      if (this.messagePool.length < 5) {
        this._ensurePoolFilled();
      }

      let raw;
      if (this.messagePool.length > 0) {
        const idx = Math.floor(Math.random() * this.messagePool.length);
        raw = this.messagePool.splice(idx, 1)[0];
      } else {
        // 回退到示例消息
        raw = this._demoMessages[Math.floor(Math.random() * this._demoMessages.length)];
      }

      const tagInfo = CATEGORY_TAGS[raw.tag] || CATEGORY_TAGS.pin;
      return {
        text: raw.text || '...',
        meta: {
          tagColor: tagInfo.color,
          source: raw.source || tagInfo.label,
          username: raw.username || null,
          rawTag: raw.tag,
          pinId: raw.pinId || null,
          articleId: raw.articleId || null,
          url: raw.url || null,
          replyCount: raw.replyCount || 0,
          likeCount: raw.likeCount || 0,
          fetchedAt: raw.fetchedAt || 0,
        }
      };
    }

    // 同步方式，配合 engine 的 onMessageRequest 使用
    getMessageSync() {
      let raw;
      if (this.messagePool.length > 0) {
        const idx = Math.floor(Math.random() * this.messagePool.length);
        raw = this.messagePool.splice(idx, 1)[0];
      } else {
        raw = this._demoMessages[Math.floor(Math.random() * this._demoMessages.length)];
      }
      const tagInfo = CATEGORY_TAGS[raw.tag] || CATEGORY_TAGS.pin;
      return {
        text: raw.text || '...',
        meta: {
          tagColor: tagInfo.color,
          source: raw.source || tagInfo.label,
          username: raw.username || null,
          rawTag: raw.tag,
          pinId: raw.pinId || null,
          articleId: raw.articleId || null,
          url: raw.url || null,
          replyCount: raw.replyCount || 0,
          likeCount: raw.likeCount || 0,
          fetchedAt: raw.fetchedAt || 0,
        }
      };
    }

    // 手动追加消息（可从外部喂入）
    pushBatch(msgs) {
      const arr = Array.isArray(msgs) ? msgs : [msgs];
      arr.forEach(m => {
        if (typeof m === 'string') {
          this.messagePool.push({ text: m, tag: 'pin', source: '自定义' });
        } else if (m && m.text) {
          this.messagePool.push(m);
        }
      });
    }
  }

  // ============ 控制面板 UI ============
  class ControlPanel {
    constructor(engine, provider, options = {}) {
      this.engine = engine;
      this.provider = provider;
      this.options = Object.assign({
        position: 'top-right', // top-left, top-right, bottom-left, bottom-right
        collapsed: false,
      }, options);
      this.el = null;
      this.collapsed = this.options.collapsed;
      this._build();
    }

    _build() {
      const posMap = {
        'top-right': { top: '16px', right: '16px', left: 'auto', bottom: 'auto' },
        'top-left': { top: '16px', left: '16px', right: 'auto', bottom: 'auto' },
        'bottom-right': { bottom: '16px', right: '16px', left: 'auto', top: 'auto' },
        'bottom-left': { bottom: '16px', left: '16px', right: 'auto', top: 'auto' },
      };
      const pos = posMap[this.options.position] || posMap['top-right'];

      this.el = document.createElement('div');
      this.el.id = 'msg-wall-panel';
      Object.assign(this.el.style, {
        position: 'fixed',
        zIndex: '100000',
        ...pos,
      });

      this._render();
      document.body.appendChild(this.el);
    }

    _render() {
      const cfg = this.engine.config;
      this.el.innerHTML = '';
      this._injectPanelStyles();

      // 暗黑模式状态
      if (this._darkMode) this.el.classList.add('mwp-dark');

      // ===== Header =====
      const header = document.createElement('div');
      header.className = 'mwp-header';
      const running = cfg.characterCount > 0;
      header.innerHTML = `
        <div class="mwp-title">
          <span class="mwp-title-icon">🐾</span>
          <span>消息墙</span>
          <span class="mwp-dot ${running ? '' : 'paused'}"></span>
        </div>
        <div class="mwp-header-btns">
          <button class="mwp-btn-run" title="${running ? '运行中，点击暂停' : '已暂停，点击运行'}">
            <span class="mwp-dot" style="width:8px;height:8px;animation:none"></span>
          </button>
          <button class="mwp-btn-theme" title="切换主题">${this._darkMode ? '☀️' : '🌙'}</button>
          <button class="mwp-btn-min" title="最小化">—</button>
          <button class="mwp-btn-close" title="关闭">✕</button>
        </div>
      `;
      this.el.appendChild(header);
      this._makeDraggable(header);

      // 运行/暂停按钮
      const runBtn = header.querySelector('.mwp-btn-run');
      const runDot = runBtn.querySelector('.mwp-dot');
      runDot.style.background = running ? 'var(--mwp-success)' : 'var(--mwp-warning)';
      runBtn.onclick = () => {
        const toRunning = this.engine.config.characterCount === 0;
        this.engine.updateConfig({ characterCount: toRunning ? 16 : 0 });
        this._render();
      };

      // 主题切换
      header.querySelector('.mwp-btn-theme').onclick = () => {
        this._darkMode = !this._darkMode;
        if (this._darkMode) this.el.classList.add('mwp-dark');
        else this.el.classList.remove('mwp-dark');
      };

      // 最小化
      header.querySelector('.mwp-btn-min').onclick = () => this.toggleCollapse();

      // 关闭
      header.querySelector('.mwp-btn-close').onclick = () => {
        if (confirm('确定关闭消息墙？可通过浏览器菜单或重新打开启用。')) {
          window.dispatchEvent(new CustomEvent('msgwall:destroy'));
        }
      };

      if (this.collapsed) return;

      // ===== 模式切换栏（角色 / 弹幕）=====
      const modeBar = document.createElement('div');
      modeBar.className = 'mwp-mode-bar';
      const curMode = cfg.displayMode === 'danmaku' ? 'danmaku' : 'char';
      modeBar.innerHTML = `
        <div class="mwp-mode-switch">
          <button class="mwp-mode-btn ${curMode === 'char' ? 'active' : ''}" data-mode="char">
            <span class="mwp-mode-icon">🦊</span>角色
          </button>
          <button class="mwp-mode-btn ${curMode === 'danmaku' ? 'active' : ''}" data-mode="danmaku">
            <span class="mwp-mode-icon">💬</span>弹幕
          </button>
        </div>
      `;
      this.el.appendChild(modeBar);
      modeBar.querySelectorAll('.mwp-mode-btn').forEach(btn => {
        btn.onclick = () => this._applyDisplayForm(btn.dataset.mode);
      });

      // ===== Tab 导航 =====
      this._tab = this._tab || 'avatar';
      const TABS = [
        { key: 'avatar', label: '形象' },
        { key: 'message', label: '消息' },
        { key: 'display', label: '通用' },
      ];
      const tabWrap = document.createElement('div');
      tabWrap.className = 'mwp-tabs';
      const tabBar = document.createElement('div');
      tabBar.className = 'mwp-tab-bar';
      TABS.forEach(t => {
        const b = document.createElement('button');
        b.textContent = t.label;
        b.className = 'mwp-tab' + (this._tab === t.key ? ' active' : '');
        b.onclick = () => { this._tab = t.key; this._render(); };
        tabBar.appendChild(b);
      });
      tabWrap.appendChild(tabBar);
      this.el.appendChild(tabWrap);

      // ===== 内容区 =====
      const body = document.createElement('div');
      body.className = 'mwp-body';
      this.el.appendChild(body);

      // 辅助函数：滑块行
      const sliderRow = (label, min, max, step, value, format, oninput) => {
        const item = document.createElement('div');
        item.className = 'mwp-param-item';
        item.innerHTML = `
          <div class="mwp-param-header">
            <span class="mwp-param-label">${label}</span>
            <span class="mwp-param-value">${format(value)}</span>
          </div>
          <div class="mwp-slider-wrap">
            <input type="range" min="${min}" max="${max}" step="${step}" value="${value}">
          </div>
        `;
        const input = item.querySelector('input');
        const valEl = item.querySelector('.mwp-param-value');
        input.addEventListener('input', () => {
          valEl.textContent = format(input.value);
          oninput(input.value);
        });
        return item;
      };

      // 辅助函数：开关行
      const switchRow = (label, on, onchange) => {
        const row = document.createElement('div');
        row.className = 'mwp-switch-row';
        row.innerHTML = `
          <span class="mwp-switch-label">${label}</span>
          <div class="mwp-switch ${on ? 'on' : ''}"></div>
        `;
        const sw = row.querySelector('.mwp-switch');
        sw.onclick = () => {
          sw.classList.toggle('on');
          onchange(sw.classList.contains('on'));
        };
        return row;
      };

      // 辅助函数：分区标题
      const sectionTitle = (text) => {
        const t = document.createElement('div');
        t.className = 'mwp-section-title';
        t.textContent = text;
        return t;
      };

      // ===== 形象 Tab =====
      if (this._tab === 'avatar') {
        // 角色风格
        const sec1 = document.createElement('div');
        sec1.className = 'mwp-section';
        sec1.appendChild(sectionTitle('角色风格'));
        const styleGrid = document.createElement('div');
        styleGrid.className = 'mwp-style-grid';
        const styles = (typeof this.engine.listCharacterStyles === 'function'
          ? this.engine.listCharacterStyles() : []).filter(s => s.key !== 'flat-vector');
        // 风格预览色板映射
        const stylePreviews = {
          'cyberpunk': 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #be185d 100%)',
          'ink-beast': 'linear-gradient(135deg, #171717 0%, #404040 50%, #737373 100%)',
          'pixel': 'linear-gradient(135deg, #86efac 0%, #22c55e 100%)',
          'wolfkill': 'linear-gradient(135deg, #1a0f1a 0%, #4a1f2a 50%, #d97706 100%)',
          'beastkill': 'linear-gradient(135deg, #1c1310 0%, #4a2410 50%, #e8853d 100%)',
        };
        styles.forEach(s => {
          const card = document.createElement('button');
          card.className = 'mwp-style-card' + (s.active ? ' active' : '');
          // 优先用风格封面图（各雪碧图裁角色合成），无封面时回退渐变色块
          const cover = (window.CharacterRenderer && typeof window.CharacterRenderer.getStyleCover === 'function')
            ? window.CharacterRenderer.getStyleCover(s.key) : '';
          const previewBg = stylePreviews[s.key] || 'linear-gradient(135deg, #e0e7ff, #a5b4fc)';
          const previewStyle = cover
            ? `background:#1f2430 url('${cover}') center bottom/cover no-repeat;`
            : `background:${previewBg}`;
          card.innerHTML = `
            <div class="mwp-style-preview" style="${previewStyle}"></div>
            <div class="mwp-style-name">${s.label}</div>
            <div class="mwp-style-check">✓</div>
          `;
          card.title = s.desc || s.label;
          card.onclick = () => {
            const ok = this.engine.applyCharacterStyle && this.engine.applyCharacterStyle(s.key);
            if (ok === false) return;
            this._render();
          };
          styleGrid.appendChild(card);
        });
        sec1.appendChild(styleGrid);
        body.appendChild(sec1);

        // 参数调节
        const sec2 = document.createElement('div');
        sec2.className = 'mwp-section';
        sec2.appendChild(sectionTitle('参数调节'));
        const paramList = document.createElement('div');
        paramList.className = 'mwp-param-list';
        paramList.appendChild(sliderRow('角色数量', 0, 50, 1, cfg.characterCount,
          v => v + ' 个',
          v => this.engine.updateConfig({ characterCount: parseInt(v) })));
        paramList.appendChild(sliderRow('角色大小', 60, 160, 5, Math.round((cfg.characterScale || 1) * 100),
          v => v + '%',
          v => this.engine.setCharacterScale(parseInt(v) / 100)));
        paramList.appendChild(sliderRow('深度层数', 1, 8, 1, cfg.depthRows || 4,
          v => v + ' 层',
          v => this.engine.setDepthConfig({ rows: parseInt(v) })));
        paramList.appendChild(sliderRow('地面高度', -15, 60, 1,
          (typeof this.engine.getGroundHeight === 'function') ? this.engine.getGroundHeight() : 7,
          v => v + '%',
          v => { if (this.engine.setGroundHeight) this.engine.setGroundHeight(parseInt(v)); }));
        sec2.appendChild(paramList);
        body.appendChild(sec2);

        // 深度分层更多参数
        const sec3 = document.createElement('div');
        sec3.className = 'mwp-section';
        sec3.appendChild(sectionTitle('深度分层'));
        const depthList = document.createElement('div');
        depthList.className = 'mwp-param-list';
        depthList.appendChild(sliderRow('前排大小', 80, 160, 5, Math.round((cfg.depthScaleFront || 1.1) * 100),
          v => v + '%',
          v => this.engine.setDepthConfig({ scaleFront: parseInt(v) / 100 })));
        depthList.appendChild(sliderRow('后排大小', 40, 100, 5, Math.round((cfg.depthScaleBack || 0.75) * 100),
          v => v + '%',
          v => this.engine.setDepthConfig({ scaleBack: parseInt(v) / 100 })));
        depthList.appendChild(sliderRow('纵向间距', 0, 60, 2, Math.round((cfg.depthSpread || 0.18) * 100),
          v => v + '%',
          v => this.engine.setDepthConfig({ spread: parseInt(v) / 100 })));
        sec3.appendChild(depthList);
        body.appendChild(sec3);
      }

      // ===== 消息 Tab =====
      if (this._tab === 'message') {
        const sec1 = document.createElement('div');
        sec1.className = 'mwp-section';
        sec1.appendChild(sectionTitle('消息节奏'));
        const paramList = document.createElement('div');
        paramList.className = 'mwp-param-list';
        paramList.appendChild(sliderRow('消息间隔', 200, 5000, 100, cfg.messageInterval,
          v => (v / 1000).toFixed(1) + 's',
          v => this.engine.updateConfig({ messageInterval: parseInt(v) })));
        paramList.appendChild(sliderRow('显示时长', 2000, 20000, 500, cfg.messageDuration,
          v => (v / 1000).toFixed(0) + 's',
          v => this.engine.updateConfig({ messageDuration: parseInt(v) })));
        sec1.appendChild(paramList);
        body.appendChild(sec1);

        // 消息源状态
        const secSrc = document.createElement('div');
        secSrc.className = 'mwp-section';
        secSrc.appendChild(sectionTitle('消息源状态'));
        const srcBox = document.createElement('div');
        srcBox.className = 'mwp-source-box';
        srcBox.id = 'mwp-source-status';
        const stats = this.provider._fetchStats || {};
        const poolSize = (this.provider.messagePool && this.provider.messagePool.length) || 0;
        const lastAt = stats.lastScheduledAt ? new Date(stats.lastScheduledAt).toLocaleTimeString() : '等待首次抓取...';
        srcBox.innerHTML = `
          <div class="mwp-source-row"><span class="mwp-src-label">消息池容量</span><span class="mwp-src-val">${poolSize} 条</span></div>
          <div class="mwp-source-row"><span class="mwp-src-label">上次定时抓取</span><span class="mwp-src-val">${lastAt}</span></div>
          <div class="mwp-source-row"><span class="mwp-src-label">沸点·最新</span><span class="mwp-src-val">${stats.pinNew || 0} 条</span></div>
          <div class="mwp-source-row"><span class="mwp-src-label">沸点·最热</span><span class="mwp-src-val">${stats.pinHot || 0} 条</span></div>
          <div class="mwp-source-row"><span class="mwp-src-label">文章·最新</span><span class="mwp-src-val">${stats.articleNew || 0} 条</span></div>
          <div class="mwp-source-row"><span class="mwp-src-label">文章·最热</span><span class="mwp-src-val">${stats.articleHot || 0} 条</span></div>
          <div class="mwp-source-row"><span class="mwp-src-label">热门评论</span><span class="mwp-src-val">${stats.comment || 0} 条</span></div>
        `;
        secSrc.appendChild(srcBox);
        body.appendChild(secSrc);

        // 立即刷新按钮（触发一次完整定时抓取）
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'mwp-primary-btn';
        refreshBtn.style.marginBottom = '10px';
        refreshBtn.innerHTML = '<span>🔄</span>立即获取最新/最热内容';
        refreshBtn.onclick = () => {
          refreshBtn.disabled = true;
          refreshBtn.style.opacity = '0.6';
          this.provider._runScheduledFetch().then(() => {
            this._render();
          });
        };
        body.appendChild(refreshBtn);

        // 立即插一条
        const manualBtn = document.createElement('button');
        manualBtn.className = 'mwp-primary-btn';
        manualBtn.innerHTML = '<span>✨</span>立即插一条消息';
        manualBtn.onclick = () => {
          this.provider.getMessage().then(msg => {
            if (msg) this.engine.pushMessage(msg.text, msg.meta);
          });
        };
        body.appendChild(manualBtn);

        // 启动状态定时器，每秒更新一次显示
        if (this._srcStatusTimer) clearInterval(this._srcStatusTimer);
        this._srcStatusTimer = setInterval(() => {
          const el = document.getElementById('mwp-source-status');
          if (!el) return;
          const s = this.provider._fetchStats || {};
          const ps = (this.provider.messagePool && this.provider.messagePool.length) || 0;
          const la = s.lastScheduledAt ? new Date(s.lastScheduledAt).toLocaleTimeString() : '等待首次抓取...';
          el.innerHTML = `
            <div class="mwp-source-row"><span class="mwp-src-label">消息池容量</span><span class="mwp-src-val">${ps} 条</span></div>
            <div class="mwp-source-row"><span class="mwp-src-label">上次定时抓取</span><span class="mwp-src-val">${la}</span></div>
            <div class="mwp-source-row"><span class="mwp-src-label">沸点·最新</span><span class="mwp-src-val">${s.pinNew || 0} 条</span></div>
            <div class="mwp-source-row"><span class="mwp-src-label">沸点·最热</span><span class="mwp-src-val">${s.pinHot || 0} 条</span></div>
            <div class="mwp-source-row"><span class="mwp-src-label">文章·最新</span><span class="mwp-src-val">${s.articleNew || 0} 条</span></div>
            <div class="mwp-source-row"><span class="mwp-src-label">文章·最热</span><span class="mwp-src-val">${s.articleHot || 0} 条</span></div>
            <div class="mwp-source-row"><span class="mwp-src-label">热门评论</span><span class="mwp-src-val">${s.comment || 0} 条</span></div>
          `;
        }, 1500);

        // 提示
        const tip = document.createElement('div');
        tip.className = 'mwp-tip';
        tip.innerHTML = '· 每 5 分钟自动获取最新和最热的文章、沸点、评论<br>· 角色会随机停下来，面向有消息的同伴"围观"<br>· 点击气泡可跳转至原文链接';
        body.appendChild(tip);
      }

      // ===== 通用 Tab =====
      if (this._tab === 'display') {
        // 弹幕速度（弹幕模式时显示）
        if (cfg.displayMode === 'danmaku') {
          const sec0 = document.createElement('div');
          sec0.className = 'mwp-section';
          sec0.appendChild(sectionTitle('弹幕设置'));
          const pl = document.createElement('div');
          pl.className = 'mwp-param-list';
          pl.appendChild(sliderRow('弹幕速度', 30, 400, 10, cfg.danmakuSpeed || 60,
            v => v + 'px/s',
            v => this.engine.updateConfig({ danmakuSpeed: parseInt(v) })));
          sec0.appendChild(pl);
          body.appendChild(sec0);
        }

        // 快捷模式
        const sec1 = document.createElement('div');
        sec1.className = 'mwp-section';
        sec1.appendChild(sectionTitle('快捷模式'));
        const modeGrid = document.createElement('div');
        modeGrid.className = 'mwp-btn-grid-3';
        const curCount = cfg.characterCount;
        const curRatio = cfg.characterTypeRatio || {};
        const isDanmaku = cfg.displayMode === 'danmaku';
        let activeMode = null;
        if (isDanmaku) activeMode = (curCount === 6) ? 'danmaku-few' : 'danmaku';
        else if (cfg.displayMode === 'street') activeMode = 'street';
        else if (curCount === 0) activeMode = 'invisible';
        else if (curCount === 45) activeMode = 'crowd';
        else if (curCount === 5) activeMode = 'quiet';
        else if (curCount === 20) activeMode = (curRatio.person ?? 0) >= 1 ? 'all-person' : 'pet-party';
        else if (curCount === 16) activeMode = 'balanced';
        const modes = [
          { key: 'danmaku', label: '💬 弹幕墙' },
          { key: 'danmaku-few', label: '💬 弹幕·稀疏' },
          { key: 'street', label: '🚶 街景过路' },
          { key: 'balanced', label: '🎯 平衡' },
          { key: 'all-person', label: '👥 全人' },
          { key: 'pet-party', label: '🐾 宠物派对' },
          { key: 'quiet', label: '🤫 稀疏' },
          { key: 'crowd', label: '👯 人山人海' },
          { key: 'invisible', label: '👻 隐藏' },
        ];
        modes.forEach(m => {
          const b = document.createElement('button');
          b.className = 'mwp-grid-btn' + (m.key === activeMode ? ' active' : '');
          b.textContent = m.label;
          b.onclick = () => this._applyMode(m.key);
          modeGrid.appendChild(b);
        });
        sec1.appendChild(modeGrid);
        body.appendChild(sec1);

        // 整体显示
        const sec2 = document.createElement('div');
        sec2.className = 'mwp-section';
        sec2.appendChild(sectionTitle('整体显示'));
        const pl = document.createElement('div');
        pl.className = 'mwp-param-list';
        pl.appendChild(sliderRow('不透明度', 20, 100, 5, Math.round(cfg.opacity * 100),
          v => v + '%',
          v => this.engine.updateConfig({ opacity: parseInt(v) / 100 })));
        pl.appendChild(sliderRow('气泡字号', 10, 20, 1, cfg.bubbleFontSize || 11,
          v => v + 'px',
          v => {
            this.engine.updateConfig({ bubbleFontSize: parseInt(v) });
            // 清空气泡缓存，让新字号立即生效
            if (typeof globalBubbleCache !== 'undefined' && globalBubbleCache) {
              try { globalBubbleCache.clear(); } catch (_) {}
            }
            this.engine.getCharacters().forEach(c => { c._cachedBubble = null; });
          }));
        sec2.appendChild(pl);
        sec2.appendChild(switchRow('显示昵称牌', cfg.showNames !== false,
          on => this.engine.updateConfig({ showNames: on })));
        sec2.appendChild(switchRow('🚶 街景过路', cfg.displayMode === 'street',
          on => {
            this.engine.updateConfig({
              displayMode: on ? 'street' : 'free',
              ...(on ? { characterTypeRatio: { person: 1 } } : {}),
            });
            if (on) this.engine.setTypeRatio({ person: 1 });
            this._render();
          }));
        body.appendChild(sec2);

        // 性能模式
        const sec3 = document.createElement('div');
        sec3.className = 'mwp-section';
        sec3.appendChild(sectionTitle('⚡ 性能模式'));
        const perfGrid = document.createElement('div');
        perfGrid.className = 'mwp-btn-grid-3';
        const perfModes = [
          { key: 'quality', label: '🎨 画质' },
          { key: 'auto', label: '⚖️ 自动' },
          { key: 'speed', label: '🚀 极速' },
        ];
        const curPerf = cfg.performanceMode || 'auto';
        perfModes.forEach(m => {
          const b = document.createElement('button');
          b.className = 'mwp-grid-btn' + (m.key === curPerf ? ' active' : '');
          b.textContent = m.label;
          b.onclick = () => {
            let fps = 30;
            if (m.key === 'quality') fps = 60;
            else if (m.key === 'speed') fps = 24;
            this.engine.updateConfig({ performanceMode: m.key, targetFPS: fps });
            this.engine._downgraded = false;
            this.engine._downgradeCount = 0;
            this._render();
          };
          perfGrid.appendChild(b);
        });
        sec3.appendChild(perfGrid);

        // FPS 实时状态
        const fpsLine = document.createElement('div');
        fpsLine.className = 'mwp-fps-line';
        const fpsSpan = document.createElement('span');
        fpsLine.appendChild(fpsSpan);
        sec3.appendChild(fpsLine);
        if (this._fpsTimer) clearInterval(this._fpsTimer);
        this._fpsTimer = setInterval(() => {
          try {
            const fps = typeof this.engine.getFPS === 'function' ? this.engine.getFPS() : null;
            const st = typeof this.engine.getSpriteStats === 'function' ? this.engine.getSpriteStats() : null;
            let txt = '';
            if (fps) txt += fps + ' fps';
            if (st && st.size) txt += (txt ? ' · 精灵缓存命中 ' + st.hitRate : '');
            if (this.engine._downgraded) txt += ' · 已自动降质';
            fpsSpan.textContent = txt;
            fpsSpan.style.color = this.engine._downgraded ? 'var(--mwp-error)' : 'var(--mwp-text-tertiary)';
          } catch (_) {}
        }, 1200);
        body.appendChild(sec3);
      }
    }

    _injectPanelStyles() {
      if (document.getElementById('mwp-style')) return;
      const st = document.createElement('style');
      st.id = 'mwp-style';
      // 新设计：TraeWork 风格紫色主题 + 暗黑模式 + 分段Tab + 卡片网格
      st.textContent = `
        /* ===== CSS 变量（亮色） ===== */
        #msg-wall-panel {
          --mwp-primary: #4b3fe3;
          --mwp-primary-hover: #6a6fff;
          --mwp-bg-base: #ffffff;
          --mwp-bg-secondary: #f5f5f5;
          --mwp-bg-tertiary: #e5e5e5;
          --mwp-text-default: #171717;
          --mwp-text-secondary: #404040;
          --mwp-text-tertiary: #737373;
          --mwp-border-l1: rgba(115, 115, 115, 0.12);
          --mwp-border-l2: rgba(115, 115, 115, 0.18);
          --mwp-success: #15a877;
          --mwp-warning: #e27900;
          --mwp-error: #e8463a;
          --mwp-radius-sm: 8px;
          --mwp-radius-md: 12px;
          --mwp-radius-pill: 999px;
          --mwp-shadow: 0 4px 16px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.8) inset;
          --mwp-card-shadow: 0 2px 8px rgba(0,0,0,0.06);
          --mwp-thumb-bg: #fff;
        }
        /* 暗黑模式 */
        #msg-wall-panel.mwp-dark {
          --mwp-primary: #6a6fff;
          --mwp-primary-hover: #8b8fff;
          --mwp-bg-base: #1a1a1f;
          --mwp-bg-secondary: #25252b;
          --mwp-bg-tertiary: #32323a;
          --mwp-text-default: #f5f5f5;
          --mwp-text-secondary: #a3a3a3;
          --mwp-text-tertiary: #737373;
          --mwp-border-l1: rgba(255,255,255,0.08);
          --mwp-border-l2: rgba(255,255,255,0.14);
          --mwp-success: #22c55e;
          --mwp-warning: #f59e0b;
          --mwp-error: #ef4444;
          --mwp-shadow: 0 4px 16px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset;
          --mwp-card-shadow: 0 2px 8px rgba(0,0,0,0.3);
          --mwp-thumb-bg: #1a1a1f;
        }
        /* 平滑过渡 */
        #msg-wall-panel, #msg-wall-panel * {
          transition: background-color 0.25s ease, color 0.25s ease,
            border-color 0.25s ease, box-shadow 0.25s ease;
        }
        /* ===== 面板容器 ===== */
        #msg-wall-panel {
          font-family: "SF Pro Text", "PingFang SC", -apple-system, BlinkMacSystemFont, "Microsoft YaHei", sans-serif;
          font-size: 12px;
          color: var(--mwp-text-default);
          background: var(--mwp-bg-base);
          border: 1px solid var(--mwp-border-l1);
          border-radius: 16px;
          box-shadow: var(--mwp-shadow);
          padding: 0;
          width: 340px;
          user-select: none;
          overflow: hidden;
        }
        /* ===== 头部 ===== */
        .mwp-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--mwp-border-l1);
          background: var(--mwp-bg-base);
          cursor: grab;
        }
        .mwp-header:active { cursor: grabbing; }
        .mwp-title { display: flex; align-items: center; gap: 10px; font-weight: 600; font-size: 14px; color: var(--mwp-text-default); }
        .mwp-title-icon {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #6a6fff 0%, #4b3fe3 100%);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          box-shadow: 0 2px 6px rgba(75,63,227,0.3);
        }
        .mwp-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--mwp-success);
          position: relative;
          display: inline-block;
        }
        .mwp-dot::after {
          content: ''; position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 14px; height: 14px; border-radius: 50%;
          background: rgba(21,168,119,0.25);
          animation: mwp-pulse 2s ease-in-out infinite;
        }
        .mwp-dot.paused { background: var(--mwp-warning); }
        .mwp-dot.paused::after { background: rgba(226,121,0,0.25); animation: none; }
        @keyframes mwp-pulse {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.3); }
        }
        .mwp-header-btns { display: flex; gap: 4px; align-items: center; }
        .mwp-header-btns button {
          all: unset; cursor: pointer; width: 24px; height: 24px;
          border-radius: 6px; color: var(--mwp-text-tertiary);
          font-size: 12px; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .mwp-header-btns button:hover {
          background: var(--mwp-bg-secondary);
          color: var(--mwp-text-default);
        }
        .mwp-header-btns .mwp-btn-close:hover {
          background: rgba(232,70,58,0.1);
          color: var(--mwp-error);
        }
        .mwp-header-btns .mwp-btn-run:hover {
          background: rgba(21,168,119,0.1);
        }
        /* ===== 模式切换 ===== */
        .mwp-mode-bar {
          padding: 12px 16px;
          border-bottom: 1px solid var(--mwp-border-l1);
        }
        .mwp-mode-switch {
          display: flex;
          background: var(--mwp-bg-secondary);
          border-radius: var(--mwp-radius-pill);
          padding: 3px;
          gap: 4px;
        }
        .mwp-mode-btn {
          all: unset; cursor: pointer;
          flex: 1; height: 28px;
          border-radius: var(--mwp-radius-pill);
          font-size: 12px; font-weight: 500;
          color: var(--mwp-text-tertiary);
          display: flex; align-items: center; justify-content: center;
          gap: 5px;
          transition: all 0.25s ease;
        }
        .mwp-mode-btn:hover { color: var(--mwp-text-secondary); }
        .mwp-mode-btn.active {
          background: var(--mwp-bg-base);
          color: var(--mwp-primary);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          font-weight: 600;
        }
        .mwp-mode-icon { font-size: 13px; line-height: 1; }
        /* ===== Tab 导航 ===== */
        .mwp-tabs {
          padding: 12px 16px;
          border-bottom: 1px solid var(--mwp-border-l1);
        }
        .mwp-tab-bar {
          display: flex;
          background: var(--mwp-bg-secondary);
          border-radius: var(--mwp-radius-pill);
          padding: 3px;
        }
        .mwp-tab {
          all: unset; cursor: pointer;
          flex: 1; height: 30px;
          border-radius: var(--mwp-radius-pill);
          font-size: 12px; font-weight: 500;
          color: var(--mwp-text-tertiary);
          text-align: center;
          transition: all 0.25s ease;
        }
        .mwp-tab:hover { color: var(--mwp-text-secondary); }
        .mwp-tab.active {
          color: var(--mwp-primary);
          background: var(--mwp-bg-base);
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          font-weight: 600;
        }
        /* ===== 内容区 ===== */
        .mwp-body {
          padding: 16px;
          max-height: 60vh;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: var(--mwp-border-l2) transparent;
        }
        .mwp-body::-webkit-scrollbar { width: 4px; }
        .mwp-body::-webkit-scrollbar-track { background: transparent; }
        .mwp-body::-webkit-scrollbar-thumb {
          background: var(--mwp-border-l2);
          border-radius: 2px;
        }
        .mwp-body::-webkit-scrollbar-thumb:hover { background: var(--mwp-text-tertiary); }
        /* ===== 分区 ===== */
        .mwp-section { margin-bottom: 20px; }
        .mwp-section:last-child { margin-bottom: 0; }
        .mwp-section-title {
          font-size: 12px; font-weight: 600;
          color: var(--mwp-text-secondary);
          margin-bottom: 10px;
          letter-spacing: 0.2px;
        }
        /* ===== 风格卡片网格 ===== */
        .mwp-style-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .mwp-style-card {
          all: unset; cursor: pointer;
          border-radius: var(--mwp-radius-sm);
          border: 1.5px solid var(--mwp-border-l1);
          overflow: hidden;
          transition: all 0.2s ease;
          background: var(--mwp-bg-base);
          position: relative;
          display: block;
        }
        .mwp-style-card:hover {
          border-color: var(--mwp-border-l2);
          transform: translateY(-1px);
          box-shadow: var(--mwp-card-shadow);
        }
        .mwp-style-card.active {
          border-color: var(--mwp-primary);
          box-shadow: 0 0 0 2px rgba(75,63,227,0.1);
        }
        .mwp-style-preview {
          height: 50px;
          position: relative;
        }
        .mwp-style-preview::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 16px;
          background: linear-gradient(to top, rgba(0,0,0,0.08), transparent);
        }
        .mwp-style-name {
          padding: 6px 8px;
          font-size: 11px; font-weight: 500;
          color: var(--mwp-text-secondary);
          text-align: center;
          background: var(--mwp-bg-base);
        }
        .mwp-style-card.active .mwp-style-name {
          color: var(--mwp-primary);
          font-weight: 600;
        }
        .mwp-style-check {
          position: absolute; top: 4px; right: 4px;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--mwp-primary); color: #fff;
          font-size: 10px;
          display: flex; align-items: center; justify-content: center;
          opacity: 0; transform: scale(0.8);
          transition: all 0.2s ease;
        }
        .mwp-style-card.active .mwp-style-check {
          opacity: 1; transform: scale(1);
        }
        /* ===== Chip 行 ===== */
        .mwp-chip-row {
          display: flex; gap: 6px; flex-wrap: wrap;
        }
        .mwp-chip {
          all: unset; cursor: pointer;
          flex: 1; min-width: 0;
          height: 32px; padding: 0 8px;
          border-radius: var(--mwp-radius-pill);
          border: 1px solid var(--mwp-border-l1);
          background: var(--mwp-bg-secondary);
          font-size: 11px; font-weight: 500;
          color: var(--mwp-text-secondary);
          display: flex; align-items: center; justify-content: center;
          gap: 4px;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .mwp-chip:hover {
          background: var(--mwp-bg-tertiary);
          border-color: var(--mwp-border-l2);
        }
        .mwp-chip.active {
          background: var(--mwp-primary);
          border-color: var(--mwp-primary);
          color: #fff;
        }
        .mwp-chip-emoji { font-size: 13px; }
        /* ===== 参数滑块 ===== */
        .mwp-param-list {
          display: flex; flex-direction: column; gap: 14px;
        }
        .mwp-param-item {
          display: flex; flex-direction: column; gap: 6px;
        }
        .mwp-param-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        .mwp-param-label {
          font-size: 12px; color: var(--mwp-text-secondary); font-weight: 500;
        }
        .mwp-param-value {
          font-size: 12px; color: var(--mwp-primary); font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .mwp-slider-wrap {
          position: relative; height: 20px;
          display: flex; align-items: center;
        }
        .mwp-slider-wrap input[type=range] {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px;
          border-radius: 2px;
          background: var(--mwp-bg-tertiary);
          outline: none; cursor: pointer;
        }
        .mwp-slider-wrap input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: var(--mwp-thumb-bg);
          border: 2px solid var(--mwp-primary);
          box-shadow: 0 1px 4px rgba(75,63,227,0.3);
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .mwp-slider-wrap input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 8px rgba(75,63,227,0.4);
        }
        .mwp-slider-wrap input[type=range]::-moz-range-thumb {
          width: 16px; height: 16px;
          border-radius: 50%;
          background: var(--mwp-thumb-bg);
          border: 2px solid var(--mwp-primary);
          box-shadow: 0 1px 4px rgba(75,63,227,0.3);
          cursor: pointer;
        }
        /* ===== 开关 ===== */
        .mwp-switch-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 4px 0;
        }
        .mwp-switch-label {
          font-size: 12px; color: var(--mwp-text-secondary);
        }
        .mwp-switch {
          width: 36px; height: 20px;
          border-radius: var(--mwp-radius-pill);
          background: var(--mwp-bg-tertiary);
          position: relative; cursor: pointer;
          transition: background 0.2s ease;
          flex-shrink: 0;
        }
        .mwp-switch::after {
          content: ''; position: absolute;
          top: 2px; left: 2px;
          width: 16px; height: 16px;
          border-radius: 50%;
          background: var(--mwp-thumb-bg);
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          transition: all 0.2s ease;
        }
        .mwp-switch.on { background: var(--mwp-primary); }
        .mwp-switch.on::after { left: 18px; }
        /* ===== 按钮网格 ===== */
        .mwp-btn-grid-3 {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .mwp-btn-grid-2 {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }
        .mwp-grid-btn {
          all: unset; cursor: pointer;
          height: 28px;
          border-radius: 6px;
          background: var(--mwp-bg-base);
          border: 1px solid var(--mwp-border-l1);
          font-size: 11px;
          color: var(--mwp-text-tertiary);
          display: flex; align-items: center; justify-content: center;
          gap: 4px;
          transition: all 0.2s ease;
          text-align: center;
          padding: 0 4px;
        }
        .mwp-grid-btn:hover {
          border-color: var(--mwp-primary);
          color: var(--mwp-primary);
        }
        .mwp-grid-btn.active {
          background: rgba(75,63,227,0.1);
          border-color: var(--mwp-primary);
          color: var(--mwp-primary);
          font-weight: 500;
        }
        /* ===== 主按钮 ===== */
        .mwp-primary-btn {
          all: unset; cursor: pointer;
          width: 100%; height: 36px;
          border-radius: var(--mwp-radius-sm);
          background: linear-gradient(135deg, var(--mwp-primary) 0%, var(--mwp-primary-hover) 100%);
          color: #fff;
          font-size: 12px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(75,63,227,0.25);
        }
        .mwp-primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(75,63,227,0.35);
        }
        .mwp-primary-btn:active { transform: translateY(0); }
        /* ===== 消息源状态 ===== */
        .mwp-source-box {
          background: var(--mwp-bg-secondary);
          border-radius: var(--mwp-radius-sm);
          padding: 8px 12px;
          font-size: 11px;
        }
        .mwp-source-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid var(--mwp-border-l1);
        }
        .mwp-source-row:last-child { border-bottom: none; }
        .mwp-src-label { color: var(--mwp-text-tertiary); }
        .mwp-src-val {
          color: var(--mwp-text-secondary);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        /* ===== 提示框 ===== */
        .mwp-tip {
          margin-top: 12px; padding: 10px 12px;
          background: var(--mwp-bg-secondary);
          border-radius: var(--mwp-radius-sm);
          color: var(--mwp-text-tertiary);
          font-size: 11px; line-height: 1.7;
          border: 1px dashed var(--mwp-border-l2);
        }
        .mwp-tip b { color: var(--mwp-text-secondary); }
        /* ===== FPS 行 ===== */
        .mwp-fps-line {
          text-align: center; font-size: 11px;
          color: var(--mwp-text-tertiary);
          margin-top: 8px; min-height: 14px;
          font-variant-numeric: tabular-nums;
        }
        /* ===== 预览虚线框（消息/通用预览） ===== */
        .mwp-preview-box {
          margin-top: 16px; padding: 12px;
          background: var(--mwp-bg-secondary);
          border-radius: var(--mwp-radius-sm);
          border: 1px dashed var(--mwp-border-l2);
        }
        .mwp-preview-title {
          font-size: 11px; font-weight: 600;
          color: var(--mwp-text-tertiary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .mwp-preview-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 4px 0;
        }
        .mwp-preview-label { font-size: 11px; color: var(--mwp-text-secondary); }
        .mwp-preview-value {
          font-size: 11px; color: var(--mwp-text-tertiary);
          font-variant-numeric: tabular-nums;
        }
      `;
      document.head.appendChild(st);
    }

    _applyTypeRatioFromButtons() {
      // 只统计类型比例按钮（person/cat/dog/rabbit），避免把风格按钮的 data-key 混进来
      const TYPE_KEYS = ['person', 'cat', 'dog', 'rabbit'];
      const btns = this.el.querySelectorAll('[data-key]');
      const keys = [];
      btns.forEach(b => {
        if (b.dataset.active === '1' && TYPE_KEYS.indexOf(b.dataset.key) !== -1) keys.push(b.dataset.key);
      });
      if (keys.length === 0) return; // 至少保留一个
      const ratio = {};
      keys.forEach(k => { ratio[k] = 1 / keys.length; });
      this.engine.setTypeRatio(ratio);
      // 重新生成现有角色的类型
      const styleKey = this._currentStyleKey();
      this.engine.getCharacters().forEach(c => {
        const r = Math.random();
        let acc = 0; let picked = keys[0];
        for (const k of keys) { acc += ratio[k]; if (r <= acc) { picked = k; break; } }
        c.type = picked;
        const opts = CharacterRenderer.generateRandomOptions(picked);
        if (opts) {
          opts.__styleKey = styleKey;
          const ak = CharacterRenderer.pickAvatarForStyle(styleKey, picked);
          if (ak) opts.__avatarKey = ak;
        }
        c.options = opts;
        if (opts && opts.__avatarKey) {
          c.width = Math.round(111 * c.scale); // 74 × 1.5
          c.height = Math.round(165 * c.scale); // 110 × 1.5
        }
      });
    }

    _currentStyleKey() {
      if (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.listCharacterStyles) {
        const active = CharacterRenderer.listCharacterStyles().find(s => s.active);
        if (active && active.key) return active.key;
      }
      return 'kaai';
    }

    _applyMode(modeKey) {
      switch (modeKey) {
        case 'danmaku':
          // 弹幕墙：泳道多、速度快
          this.engine.updateConfig({ displayMode: 'danmaku', characterCount: 10, opacity: 1 });
          break;
        case 'danmaku-few':
          // 弹幕·稀疏：少泳道、慢速
          this.engine.updateConfig({ displayMode: 'danmaku', characterCount: 5, opacity: 0.95 });
          break;
        case 'street':
          // 街景：走进走出不折返 + 地面线，只有人物
          this.engine.setTypeRatio({ person: 1 });
          this.engine.updateConfig({ displayMode: 'street', characterCount: 14, opacity: 1 });
          break;
        case 'balanced':
          this.engine.updateConfig({ characterCount: 16, opacity: 1, displayMode: 'free' });
          this.engine.setTypeRatio({ person: 0.6, cat: 0.15, dog: 0.15, rabbit: 0.1 });
          this._regenAllCharacters();
          break;
        case 'all-person':
          this.engine.updateConfig({ characterCount: 20, displayMode: 'free' });
          this.engine.setTypeRatio({ person: 1 });
          this._regenAllCharacters('person');
          break;
        case 'pet-party':
          this.engine.updateConfig({ characterCount: 20, displayMode: 'free' });
          this.engine.setTypeRatio({ cat: 0.4, dog: 0.4, rabbit: 0.2 });
          this._regenAllCharacters(null, ['cat', 'dog', 'rabbit']);
          break;
        case 'quiet':
          this.engine.updateConfig({ characterCount: 5, opacity: 0.85, displayMode: 'free' });
          break;
        case 'crowd':
          this.engine.updateConfig({ characterCount: 45, opacity: 1, displayMode: 'free' });
          break;
        case 'invisible':
          this.engine.updateConfig({ characterCount: 0 });
          break;
      }
      this._render();
    }

    /** 显示形式切换：角色（free/street 沿用当前风格）/ 弹幕（隐形载体 + 药丸条） */
    _applyDisplayForm(formKey) {
      if (formKey === 'danmaku') {
        this.engine.updateConfig({ displayMode: 'danmaku', characterCount: 10, opacity: 1 });
      } else {
        // 回到角色模式：恢复自由漫步 + 当前风格 + 常规数量
        this.engine.updateConfig({ displayMode: 'free', characterCount: 16, opacity: 1 });
      }
      this._render();
    }

    _regenAllCharacters(forceType = null, allowedTypes = null) {
      const w = window.innerWidth;
      const styleKey = (typeof CharacterRenderer !== 'undefined' && CharacterRenderer.listCharacterStyles)
        ? ((CharacterRenderer.listCharacterStyles().find(s => s.active) || {}).key || 'kaai')
        : 'kaai';
      const hasPoolFn = (typeof CharacterRenderer !== 'undefined' && typeof CharacterRenderer.pickAvatarForStyle === 'function');
      this.engine.getCharacters().forEach(c => {
        if (forceType) {
          c.type = forceType;
        } else if (allowedTypes) {
          c.type = allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        } else {
          // 按照比例选
        }
        const opts = CharacterRenderer.generateRandomOptions(c.type);
        if (opts) {
          opts.__styleKey = styleKey;
          if (hasPoolFn) {
            const ak = CharacterRenderer.pickAvatarForStyle(styleKey, c.type);
            if (ak) opts.__avatarKey = ak;
          }
        }
        c.options = opts;
        c.scale = (this.engine.config.characterScale || 1.0);
        c.x = Math.random() * w;
        // 若抽到 avatar，同步 size 到立绘比例
        if (opts && opts.__avatarKey) {
          c.width = Math.round(111 * c.scale); // 74 × 1.5
          c.height = Math.round(165 * c.scale); // 110 × 1.5
        }
        c.message = null; c._cachedBubble = null; c.messageTimer = 0;
      });
      if (typeof globalSpriteCache !== 'undefined' && globalSpriteCache) try { globalSpriteCache.clear(); } catch (_) {}
      if (typeof globalBubbleCache !== 'undefined' && globalBubbleCache) try { globalBubbleCache.clear(); } catch (_) {}
    }

    toggleCollapse() {
      this.collapsed = !this.collapsed;
      this._render();
      if (this.collapsed) {
        // 最小化后的悬浮 Dock：掘金白卡片胶囊（图标块 + 标题 + 状态点），贴屏幕右缘
        const running = this.engine.config.characterCount > 0;
        const mini = document.createElement('div');
        mini.id = 'mwp-mini-dock';
        mini.innerHTML = `
          <span class="mwp-mini-icon">🐾</span>
          <span class="mwp-mini-text">消息墙</span>
          <span class="mwp-mini-dot${running ? ' on' : ''}"></span>
        `;
        // 悬浮球基础样式（掘金白卡片 + 主色描边 hover）
        const dockEl = document.createElement('style');
        dockEl.id = 'mwp-mini-dock-style';
        dockEl.textContent = `
          #mwp-mini-dock { display:flex; align-items:center; gap:8px; padding:7px 12px 7px 8px;
            background:#fff; border:1px solid #e5e6eb; border-radius:999px;
            box-shadow:0 4px 12px rgba(29,33,41,0.10); cursor:pointer;
            font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
            transition:box-shadow .2s, border-color .2s, transform .2s; }
          #mwp-mini-dock:hover { border-color:#1e80ff; box-shadow:0 6px 16px rgba(30,128,255,0.18);
            transform:translateY(-1px); }
          #mwp-mini-dock .mwp-mini-icon { width:26px; height:26px; border-radius:50%;
            background:rgba(30,128,255,0.1); display:flex; align-items:center; justify-content:center;
            font-size:14px; }
          #mwp-mini-dock .mwp-mini-text { font-size:12px; font-weight:600; color:#1d2129; line-height:1; }
          #mwp-mini-dock .mwp-mini-dot { width:6px; height:6px; border-radius:50%; background:#c9cdd4; }
          #mwp-mini-dock .mwp-mini-dot.on { background:#00b42a; box-shadow:0 0 0 3px rgba(0,180,42,.15); }
        `;
        document.head.appendChild(dockEl);
        // 定位到面板原位置附近；越界时回退到屏幕右缘
        const rect = this.el.getBoundingClientRect();
        const vw = window.innerWidth, vh = window.innerHeight;
        const dockW = 118, dockH = 42;
        let left = rect.left;
        let top = rect.top;
        if (rect.width === 0 || left < 0 || top < 0 || left > vw - dockW || top > vh - dockH) {
          left = vw - dockW - 16;
          top = Math.min(Math.max(16, rect.top), vh - dockH - 16);
        }
        Object.assign(mini.style, {
          position: 'fixed', zIndex: '100000',
          left: Math.round(left) + 'px', top: Math.round(top) + 'px',
        });
        mini.title = '展开掘金弹幕（按住可拖动）';
        // 可拖动：按住拖拽改变位置；位移超过阈值视为拖拽，不触发展开
        let dragStarted = false, moved = false, sx = 0, sy = 0, sl = 0, st = 0;
        const onMove = (e) => {
          if (!dragStarted) return;
          const dx = e.clientX - sx, dy = e.clientY - sy;
          if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
          moved = true;
          const w = mini.offsetWidth, h = mini.offsetHeight;
          mini.style.left = clamp(sl + dx, 4, window.innerWidth - w - 4) + 'px';
          mini.style.top = clamp(st + dy, 4, window.innerHeight - h - 4) + 'px';
        };
        const onUp = () => {
          if (!dragStarted) return;
          dragStarted = false;
          mini.style.cursor = 'pointer';
        };
        mini.addEventListener('mousedown', (e) => {
          dragStarted = true; moved = false;
          sx = e.clientX; sy = e.clientY;
          const r = mini.getBoundingClientRect();
          sl = r.left; st = r.top;
          mini.style.cursor = 'grabbing';
          e.preventDefault();
        });
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        mini.addEventListener('click', () => {
          if (moved) { moved = false; return; } // 拖拽松手不当作点击
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          mini.remove(); dockEl.remove();
          this.toggleCollapse();
        });
        document.body.appendChild(mini);
        this.miniBtn = mini;
        this.miniDockStyle = dockEl;
        // 整个面板隐藏，只留悬浮 Dock
        this.el.style.display = 'none';
      } else if (this.miniBtn) {
        this.el.style.display = '';
        this.miniBtn.remove();
        this.miniBtn = null;
        if (this.miniDockStyle) { this.miniDockStyle.remove(); this.miniDockStyle = null; }
      }
    }

    _makeDraggable(header) {
      let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
      let moved = false;
      header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        dragging = true; moved = false;
        const rect = this.el.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startLeft = rect.left; startTop = rect.top;
        this.el.style.left = startLeft + 'px';
        this.el.style.top = startTop + 'px';
        this.el.style.right = 'auto';
        this.el.style.bottom = 'auto';
        e.preventDefault();
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        moved = true;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        this.el.style.left = clamp(startLeft + dx, 0, window.innerWidth - this.el.offsetWidth) + 'px';
        this.el.style.top = clamp(startTop + dy, 0, window.innerHeight - 40) + 'px';
      });
      window.addEventListener('mouseup', () => { dragging = false; });
    }

    destroy() {
      if (this._fpsTimer) clearInterval(this._fpsTimer);
      if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
      if (this.miniBtn && this.miniBtn.parentNode) this.miniBtn.parentNode.removeChild(this.miniBtn);
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ============ 气泡悬停详情 + 点击跳转 ============
  // 挂接在引擎上：鼠标移到角色气泡上时，用 HTML tooltip 显示
  // 完整消息内容 / 来源 / 作者 / 统计；点击 tooltip 打开对应页面（沸点/文章/评论等）。
  function attachBubbleInteraction(engine) {
    if (!engine || typeof engine.hitTestBubble !== 'function') return null;
    // 若已有旧实例先销毁，避免重复挂载
    if (window.__JMW_BUBBLE_TIP__ && window.__JMW_BUBBLE_TIP__.destroy) {
      try { window.__JMW_BUBBLE_TIP__.destroy(); } catch (_) {}
    }

    const tip = document.createElement('div');
    tip.id = 'jmw-bubble-tip';
    tip.style.cssText = `
      position: fixed; display: none; pointer-events: auto; cursor: pointer;
      z-index: 100000; padding: 10px 14px; border-radius: 12px;
      background: rgba(255,255,255,0.98); box-shadow: 0 6px 24px rgba(0,0,0,0.15);
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      font-size: 13px; color: #2C2C2C; line-height: 1.6; max-width: 320px;
      user-select: none; word-break: break-word;
      border: 1px solid rgba(0,0,0,0.06);
      transition: opacity 0.15s ease;
    `;

    // 标签（来源分类）
    const tagEl = document.createElement('span');
    tagEl.style.cssText = 'display: inline-block; padding: 1px 8px; border-radius: 10px; font-size: 11px; color: #fff; margin-right: 6px; vertical-align: middle;';

    // 作者行
    const header = document.createElement('div');
    header.style.cssText = 'margin-bottom: 6px; display: flex; align-items: center;';
    const author = document.createElement('span');
    author.style.cssText = 'font-weight: 600; color: #1E80FF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;';
    header.appendChild(tagEl);
    header.appendChild(author);

    // 正文内容
    const content = document.createElement('div');
    content.style.cssText = 'color: #333; margin-bottom: 6px; white-space: pre-wrap;';

    // 统计信息
    const stats = document.createElement('div');
    stats.style.cssText = 'color: #888; font-size: 12px;';

    // 点击提示
    const hint = document.createElement('div');
    hint.style.cssText = 'color: #999; font-size: 11px; margin-top: 4px; text-align: right;';

    tip.appendChild(header);
    tip.appendChild(content);
    tip.appendChild(stats);
    tip.appendChild(hint);
    document.body.appendChild(tip);

    let cur = null;                 // 当前命中的气泡 { r, c }
    let mouseX = -1, mouseY = -1;
    let rafId = 0;
    let running = true;

    const fmt = (n) => (n == null || isNaN(n)) ? 0 : n;

    // 获取跳转 URL
    function getJumpUrl(meta) {
      if (!meta) return null;
      if (meta.pinId) return 'https://juejin.cn/pin/' + meta.pinId;
      if (meta.articleId) return 'https://juejin.cn/post/' + meta.articleId;
      if (meta.url) return meta.url;
      // 评论没有独立页面，尝试跳转到文章详情
      if (meta.rawTag === 'comment' && meta.articleId) {
        return 'https://juejin.cn/post/' + meta.articleId + '#comment';
      }
      return null;
    }

    // 获取点击提示文字
    function getHintText(meta) {
      if (!meta) return '';
      if (meta.pinId) return '点击查看沸点 →';
      if (meta.articleId) return '点击查看文章 →';
      if (meta.url) return '点击查看详情 →';
      if (meta.rawTag === 'comment') return '评论内容';
      return '';
    }

    function update() {
      const hit = engine.hitTestBubble(mouseX, mouseY);
      // 没有命中：隐藏
      if (!hit || !hit.c || !hit.c.message) {
        if (cur) { tip.style.display = 'none'; cur = null; }
        return;
      }
      const msg = hit.c.message;
      const meta = msg.meta || {};

      // 如果命中的是同一个气泡，只更新位置即可
      const isSame = cur && cur.c === hit.c && cur.c.message === hit.c.message;
      if (!isSame) {
        cur = hit;

        // 标签颜色和文字
        tagEl.style.backgroundColor = meta.tagColor || '#999';
        tagEl.textContent = meta.source || '消息';

        // 作者
        author.textContent = meta.username || '匿名用户';

        // 完整内容（显示全文，不截断）
        content.textContent = msg.text || '';

        // 统计信息
        const statParts = [];
        if (meta.replyCount != null) statParts.push('回复 ' + fmt(meta.replyCount));
        if (meta.likeCount != null) statParts.push('点赞 ' + fmt(meta.likeCount));
        stats.textContent = statParts.join(' · ');

        // 点击提示
        const jumpUrl = getJumpUrl(meta);
        hint.textContent = getHintText(meta);
        tip.style.cursor = jumpUrl ? 'pointer' : 'default';
      }

      // 定位到鼠标右下方，越界则翻转到左/上方
      tip.style.display = 'block';
      let x = mouseX + 14, y = mouseY + 14;
      const tw = tip.offsetWidth || 240;
      const th = tip.offsetHeight || 80;
      if (x + tw > window.innerWidth - 8) x = mouseX - tw - 14;
      if (y + th > window.innerHeight - 8) y = mouseY - th - 14;
      tip.style.left = Math.max(4, x) + 'px';
      tip.style.top = Math.max(4, y) + 'px';
    }

    function loop() {
      if (!running) return;
      rafId = requestAnimationFrame(loop);
      if (!engine.running) { tip.style.display = 'none'; return; }
      update();
    }

    const onMove = (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      update();
    };

    // 鼠标移到 tooltip 上时不让 window 级 mousemove 更新（否则会因离开气泡而隐藏）
    tip.addEventListener('mousemove', (e) => e.stopPropagation());

    // 点击跳转
    tip.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!cur) return;
      const meta = cur.c && cur.c.message && cur.c.message.meta;
      const url = getJumpUrl(meta);
      if (url) {
        try { window.open(url, '_blank'); } catch (_) {}
      }
    });

    window.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(loop);

    const api = {
      destroy() {
        running = false;
        window.removeEventListener('mousemove', onMove);
        cancelAnimationFrame(rafId);
        if (tip.parentNode) tip.parentNode.removeChild(tip);
        if (window.__JMW_BUBBLE_TIP__ === api) window.__JMW_BUBBLE_TIP__ = null;
      },
    };
    window.__JMW_BUBBLE_TIP__ = api;
    return api;
  }

  // ============ 导出 ============
  const exp = {
    JuejinMessageProvider,
    ControlPanel,
    CATEGORY_TAGS,
    attachBubbleInteraction,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exp;
  } else {
    global.JuejinMessageWall = exp;
  }

})(typeof window !== 'undefined' ? window : this);



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
