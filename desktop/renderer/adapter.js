/**
 * 桌面版启动适配层
 *
 * 完整复用浏览器版三个模块，只做三件事：
 * 1. 复用 JuejinMessageProvider，但把「抓取」替换为 IPC → 主进程代拉
 *    （绕开浏览器版的 juejin.cn hostname 门槛与 CORS 限制），
 *    消息池 / demo 兜底 / getMessageSync / ControlPanel 统计全部原生复用。
 * 2. 悬浮层点击穿透：默认整层穿透，mousemove 命中气泡或面板时经 IPC 切换可点击。
 * 3. 用持久化设置初始化引擎，并把面板改动回写到设置。
 */
(function () {
  'use strict';

  const D = window.danmuDesktop;
  if (!D) {
    console.error('[desktop] preload 桥缺失，无法启动');
    return;
  }

  const {
    MessageWallEngine,
  } = window.MessageWallCore;
  const { JuejinMessageProvider, ControlPanel, attachBubbleInteraction } = window.JuejinMessageWall;

  async function main() {
    const settings = await D.getSettings();

    // ============ Provider：复用 + 主进程代拉 ============
    const provider = new JuejinMessageProvider({ enableScheduledFetch: false });
    let scheduledTimer = null;

    function mergeIntoPool(items) {
      const arr = Array.isArray(items) ? items : [];
      const seen = new Set(provider.messagePool.map((m) => m.text));
      const unique = arr.filter((m) => m && m.text && !seen.has(m.text));
      const now = Date.now();
      unique.forEach((m) => { m.fetchedAt = now; });
      provider.messagePool.push(...unique);
      if (provider.messagePool.length > 500) {
        provider.messagePool = provider.messagePool.slice(-400);
      }
      return unique.length;
    }

    // 覆写抓取入口：浏览器版在此处受 juejin.cn 域名限制，桌面版交由主进程执行
    provider._runScheduledFetch = async function () {
      if (provider.fetching) return;
      provider.fetching = true;
      try {
        const res = await D.fetchNow('scheduled');
        if (res && Array.isArray(res.items)) {
          const added = mergeIntoPool(res.items);
          if (res.stats) Object.assign(provider._fetchStats, res.stats);
          console.log('[desktop] 抓取完成，新增', added, '条，池大小', provider.messagePool.length);
        }
      } catch (e) {
        console.warn('[desktop] 抓取失败:', e);
      } finally {
        provider.fetching = false;
      }
    };

    // getMessage() 池不足时的补池逻辑同样走主进程
    provider._ensurePoolFilled = async function () {
      if (provider.fetching) return;
      const now = Date.now();
      if (provider.messagePool.length > 5 && now - provider.lastFetchTime < provider.fetchCooldown) return;
      provider.fetching = true;
      try {
        const res = await D.fetchNow('ensure');
        if (res && Array.isArray(res.items)) mergeIntoPool(res.items);
        provider.lastFetchTime = now;
      } catch (_) {
      } finally {
        provider.fetching = false;
      }
    };

    // 定时轮询（与浏览器版节奏一致：首次延迟 10s）
    function startScheduledFetch() {
      const interval = Math.max(1, settings.fetchIntervalMin || 5) * 60 * 1000;
      setTimeout(() => {
        provider._runScheduledFetch();
        scheduledTimer = setInterval(() => provider._runScheduledFetch(), interval);
      }, 10_000);
    }

    // 托盘「立即刷新」
    D.onRefreshRequested(() => provider._runScheduledFetch());

    // ============ 引擎 ============
    const engine = new MessageWallEngine(document.body, {
      characterCount: settings.characterCount,
      characterScale: settings.characterScale,
      performanceMode: settings.performanceMode || 'auto',
      targetFPS: 30,
      defaultCharacterStyle: settings.defaultCharacterStyle,
      characterTypeRatio: { person: 1 },
      floorRatio: 1.04,
      zIndex: 99999,
      opacity: settings.opacity,
      messageInterval: settings.messageInterval,
      messageDuration: settings.messageDuration,
      showFloorLine: false,
      onMessageRequest: () => provider.getMessageSync(),
    });

    // 面板改动回写持久化（白名单字段，重启生效）
    const PERSIST_KEYS = [
      'characterCount', 'characterScale', 'defaultCharacterStyle',
      'messageInterval', 'messageDuration', 'opacity', 'performanceMode',
    ];
    const origUpdateConfig = engine.updateConfig.bind(engine);
    engine.updateConfig = function (patch) {
      origUpdateConfig(patch);
      const snapshot = {};
      PERSIST_KEYS.forEach((k) => { if (patch && k in patch) snapshot[k] = patch[k]; });
      if (Object.keys(snapshot).length) D.setSettings(snapshot);
    };
    const origApplyStyle = engine.applyCharacterStyle
      ? engine.applyCharacterStyle.bind(engine) : null;
    if (origApplyStyle) {
      engine.applyCharacterStyle = function (key) {
        const ok = origApplyStyle(key);
        if (ok !== false) D.setSettings({ defaultCharacterStyle: key });
        return ok;
      };
    }
    const origSetScale = engine.setCharacterScale
      ? engine.setCharacterScale.bind(engine) : null;
    if (origSetScale) {
      engine.setCharacterScale = function (scale) {
        origSetScale(scale);
        D.setSettings({ characterScale: scale });
      };
    }

    // ============ 悬浮层点击穿透 ============
    let clickable = false;
    function updateClickable(x, y) {
      let over = false;
      const el = document.elementFromPoint(x, y);
      if (el && el !== document.body) {
        // 控制面板 / 气泡 tooltip 等 DOM 元素
        over = true;
      } else {
        try { over = !!engine.hitTestBubble(x, y); } catch (_) {}
      }
      if (over !== clickable) {
        clickable = over;
        D.setClickable(over);
      }
    }
    window.addEventListener('mousemove', (e) => updateClickable(e.clientX, e.clientY));

    // ============ 启动 ============
    engine.start();

    if (typeof attachBubbleInteraction === 'function') {
      try { attachBubbleInteraction(engine); } catch (_) {}
    }

    const panel = new ControlPanel(engine, provider, { position: 'top-right' });

    startScheduledFetch();

    // 面板 ✕：隐藏窗口，进程驻托盘（托盘「显示」时由主进程 reload 重建）
    window.addEventListener('msgwall:destroy', () => {
      try { engine.destroy(); } catch (_) {}
      try { panel.destroy(); } catch (_) {}
      if (scheduledTimer) clearInterval(scheduledTimer);
      D.hideOverlay();
    });

    // ============ 欢迎 / 授权提示 ============
    try {
      const auth = await D.getAuth();
      if (auth && auth.loggedIn && auth.user) {
        engine.pushMessage(`掘金授权成功，欢迎回来 @${auth.user.name}！🐾`, {
          tagColor: '#1E80FF', source: '系统提示',
        }, 8000);
      } else {
        engine.pushMessage('掘金弹幕桌面版已启动！右下角托盘可登录掘金账号 🐾', {
          tagColor: '#1E80FF', source: '系统提示',
        }, 8000);
      }
      D.onAuthChanged((status) => {
        if (status && status.loggedIn && status.user) {
          engine.pushMessage(`你好 @${status.user.name}，掘金授权成功！🎉`, {
            tagColor: '#1E80FF', source: '授权',
          }, 8000);
        }
      });
    } catch (_) {}

    // 暴露调试对象（与 demo.html 一致）
    window.__MSG_WALL__ = { engine, provider, panel };
    console.log('%c🐾 掘金弹幕桌面版已启动！', 'color:#1E80FF;font-size:16px;font-weight:bold;');
  }

  main().catch((e) => {
    console.error('[desktop] 启动失败:', e);
  });
})();
