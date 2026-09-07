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
