/**
 * 掘金弹幕 · 桌面版主进程入口
 */
const { app, ipcMain, shell } = require('electron');

// 必须在 app ready 前完成 jw:// 特权注册
const protocol = require('./protocol');
const settings = require('./settings');
const { JuejinAuth } = require('./auth');
const { JuejinFetcher } = require('./fetcher');
const { createOverlayWindow } = require('./overlay-window');
const { createTray } = require('./tray');

const ctx = {
  overlay: null,
  tray: null,
  auth: null,
  fetcher: null,
  settings,
  quitting: false,
  toggleOverlay: () => {},
  requestRefresh: () => {},
  rebuildTray: () => {},
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // 二次启动：唤起悬浮层
    if (ctx.overlay && !ctx.overlay.isDestroyed() && !ctx.overlay.isVisible()) ctx.toggleOverlay();
  });

  app.whenReady().then(async () => {
    protocol.register();

    ctx.auth = new JuejinAuth();
    ctx.auth.load();
    ctx.fetcher = new JuejinFetcher(ctx.auth, settings);

    // IPC 必须先于任何窗口注册：渲染层脚本在首帧前就会调用 settings:get
    wireIpc();

    ctx.overlay = await createOverlayWindow(settings);
    createTray(ctx);

    wireAuthEvents();

    // 首次运行自动弹出掘金授权窗口（可关闭跳过，跳过也能拉公开数据）
    if (!ctx.auth.status.loggedIn && !settings.get('loginPrompted')) {
      settings.set({ loginPrompted: true });
      ctx.auth.openLoginWindow();
    }

    console.log('[app] 掘金弹幕桌面版已启动');
  });

  app.on('window-all-closed', () => {
    // 常驻托盘，不随窗口关闭退出
  });

  app.on('before-quit', () => {
    ctx.quitting = true;
  });
}

function wireIpc() {
  ipcMain.handle('settings:get', () => settings.all());

  ipcMain.handle('settings:set', (_e, patch) => {
    const next = settings.set(patch);
    if (typeof patch.autostart === 'boolean') {
      app.setLoginItemSettings({ openAtLogin: !!patch.autostart });
    }
    return next;
  });

  ipcMain.handle('juejin:fetch-now', async (_e, reason) => {
    try {
      return await ctx.fetcher.fetchNow(reason || 'scheduled');
    } catch (e) {
      console.warn('[ipc] fetch-now failed:', e.message);
      return { items: [], stats: ctx.fetcher.stats, error: e.message };
    }
  });

  // renderer 悬停到气泡/面板 → 关闭穿透；离开 → 恢复穿透
  ipcMain.on('overlay:hover', (_e, clickable) => {
    if (!ctx.overlay || ctx.overlay.isDestroyed()) return;
    ctx.overlay.setIgnoreMouseEvents(!clickable, { forward: true });
  });

  ipcMain.handle('overlay:open-external', (_e, url) => {
    if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
    return false;
  });

  ipcMain.on('overlay:hide', () => {
    if (ctx.overlay && !ctx.overlay.isDestroyed()) ctx.overlay.hide();
    settings.set({ hidden: true });
    ctx.rebuildTray();
  });

  ipcMain.handle('auth:login', () => ctx.auth.openLoginWindow());
  ipcMain.handle('auth:logout', () => ctx.auth.logout());
  ipcMain.handle('auth:get-status', () => ctx.auth.status);

  ipcMain.on('app:quit', () => app.quit());
}

function wireAuthEvents() {
  ctx.auth.on('changed', (status) => {
    if (ctx.overlay && !ctx.overlay.isDestroyed()) {
      ctx.overlay.webContents.send('auth:changed', status);
    }
  });
  ctx.auth.on('login-finished', (ok) => {
    console.log(ok ? '[app] 掘金授权成功' : '[app] 登录窗被关闭，跳过授权');
  });
}
