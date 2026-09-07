/**
 * 托盘：显示/隐藏弹幕墙、立即刷新、登录/退出登录、开机自启、退出
 */
const { Tray, Menu, app, nativeImage } = require('electron');
const path = require('path');

function createTray(ctx) {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'build', 'icon.png'));
  const tray = new Tray(icon);
  tray.setToolTip('掘金弹幕 · 桌面版');

  const rebuild = () => {
    const auth = ctx.auth.status;
    const overlayVisible = ctx.overlay && !ctx.overlay.isDestroyed() && ctx.overlay.isVisible();
    const menu = Menu.buildFromTemplate([
      {
        label: overlayVisible ? '隐藏弹幕墙' : '显示弹幕墙',
        click: () => ctx.toggleOverlay(),
      },
      {
        label: '立即刷新消息',
        click: () => ctx.requestRefresh(),
      },
      { type: 'separator' },
      auth.loggedIn
        ? {
            label: `退出登录 @${(auth.user && auth.user.name) || ''}`,
            click: () => ctx.auth.logout(),
          }
        : {
            label: '登录掘金…',
            click: () => ctx.auth.openLoginWindow(),
          },
      {
        label: '开机自启',
        type: 'checkbox',
        checked: !!app.getLoginItemSettings().openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked });
          ctx.settings.set({ autostart: item.checked });
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          ctx.quitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  };

  tray.on('click', () => ctx.toggleOverlay());

  ctx.rebuildTray = rebuild;
  ctx.toggleOverlay = () => {
    if (!ctx.overlay || ctx.overlay.isDestroyed()) return;
    if (ctx.overlay.isVisible()) {
      ctx.overlay.hide();
      ctx.settings.set({ hidden: true });
    } else {
      // 面板关闭后引擎已销毁，重载重建；ready-to-show 是一次性监听，需重挂
      ctx.overlay.webContents.once('ready-to-show', () => {
        if (!ctx.overlay.isDestroyed()) ctx.overlay.showInactive();
      });
      ctx.overlay.webContents.reload();
      ctx.settings.set({ hidden: false });
    }
    rebuild();
  };
  ctx.requestRefresh = () => {
    if (ctx.overlay && !ctx.overlay.isDestroyed()) {
      ctx.overlay.webContents.send('juejin:refresh-requested');
    }
  };

  ctx.auth.on('changed', rebuild);
  rebuild();
  return tray;
}

module.exports = { createTray };
