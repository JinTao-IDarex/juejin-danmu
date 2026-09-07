/**
 * 透明悬浮层窗口：
 * 无边框 + 全透明 + 置顶(screen-saver 级) + 跳过任务栏，覆盖主屏工作区。
 * 默认整层点击穿透（不挡任何操作），renderer 悬停到气泡/面板时经 IPC 切换为可点击。
 */
const { BrowserWindow, screen, shell } = require('electron');
const path = require('path');

function createOverlayWindow(settings) {
  const wa = screen.getPrimaryDisplay().workArea;
  const win = new BrowserWindow({
    x: wa.x,
    y: wa.y,
    width: wa.width,
    height: wa.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    thickFrame: false, // Windows 下透明窗口必须关掉，否则有系统边框残影
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    roundedCorners: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });

  // 气泡点击走 window.open → 一律改用系统浏览器打开
  win.webContents.setWindowOpenHandler(({ url: target }) => {
    if (/^https?:\/\//i.test(target)) shell.openExternal(target);
    return { action: 'deny' };
  });

  win.loadURL('jw://app/renderer/overlay.html');

  win.webContents.on('render-process-gone', () => {
    console.warn('[overlay] renderer gone, reloading...');
    if (!win.isDestroyed()) win.webContents.reload();
  });

  return new Promise((resolve) => {
    win.once('ready-to-show', () => {
      if (!settings.get('hidden')) win.showInactive();
      resolve(win);
    });
    // ready-to-show 可能因缓存瞬时报错，兜底 2s 后强制可显
    setTimeout(() => {
      if (!win.isDestroyed() && !win.isVisible() && !settings.get('hidden')) win.showInactive();
      resolve(win);
    }, 2000);
  });
}

module.exports = { createOverlayWindow };
