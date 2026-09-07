/**
 * 预加载桥：以最小 API 面暴露主进程能力给 renderer（contextIsolation 安全）
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('danmuDesktop', {
  // 设置
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.invoke('settings:set', patch),

  // 掘金数据（主进程代拉，规避 CORS 与 hostname 限制）
  fetchNow: (reason) => ipcRenderer.invoke('juejin:fetch-now', reason),

  // 悬浮层
  setClickable: (clickable) => ipcRenderer.send('overlay:hover', !!clickable),
  hideOverlay: () => ipcRenderer.send('overlay:hide'),
  openExternal: (url) => ipcRenderer.invoke('overlay:open-external', url),

  // 授权
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAuth: () => ipcRenderer.invoke('auth:get-status'),

  // 主进程 → renderer 事件
  onAuthChanged: (cb) => ipcRenderer.on('auth:changed', (_e, status) => cb(status)),
  onRefreshRequested: (cb) => ipcRenderer.on('juejin:refresh-requested', () => cb()),
});
