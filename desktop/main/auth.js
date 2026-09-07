/**
 * 掘金授权：
 * - 内嵌登录窗加载 juejin.cn 登录页（独立 partition，Cookie 与主会话隔离）
 * - 轮询 partition Cookie，出现 sessionid(_ss) 后调 user/get 验证并取用户信息
 * - Cookie 串用 safeStorage(DPAPI) 加密后存 userData/auth.json，供主进程 fetcher 使用
 */
const { app, BrowserWindow, session, safeStorage } = require('electron');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

const PARTITION = 'persist:juejin';
const AUTH_FILE = () => path.join(app.getPath('userData'), 'auth.json');
const LOGIN_URL = 'https://juejin.cn/login';
const USER_API = 'https://api.juejin.cn/user_api/v1/user/get';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

class JuejinAuth extends EventEmitter {
  constructor() {
    super();
    this.cookieString = '';
    this.user = null;
    this._win = null;
    this._pollTimer = null;
  }

  get ses() {
    return session.fromPartition(PARTITION);
  }

  get status() {
    return { loggedIn: !!this.cookieString, user: this.user };
  }

  /** 启动时从磁盘恢复登录态 */
  load() {
    try {
      const raw = JSON.parse(fs.readFileSync(AUTH_FILE(), 'utf8'));
      if (!raw || !raw.enc) return;
      if (safeStorage.isEncryptionAvailable()) {
        this.cookieString = safeStorage.decryptString(Buffer.from(raw.enc, 'base64'));
      } else {
        this.cookieString = raw.plain || '';
        console.warn('[auth] safeStorage 不可用，回退明文存储');
      }
      this.user = raw.user || null;
    } catch (_) { /* 首次运行无文件 */ }
    if (this.cookieString) this.emit('changed', this.status);
  }

  async _save(cookieString, user) {
    const record = { user };
    if (safeStorage.isEncryptionAvailable()) {
      record.enc = safeStorage.encryptString(cookieString).toString('base64');
    } else {
      record.plain = cookieString;
    }
    fs.mkdirSync(path.dirname(AUTH_FILE()), { recursive: true });
    fs.writeFileSync(AUTH_FILE(), JSON.stringify(record, null, 2), 'utf8');
    this.cookieString = cookieString;
    this.user = user;
    this.emit('changed', this.status);
  }

  async logout() {
    this.cookieString = '';
    this.user = null;
    try { fs.rmSync(AUTH_FILE(), { force: true }); } catch (_) {}
    try {
      const cookies = await this.ses.cookies.get({ domain: 'juejin.cn' });
      await Promise.all(cookies.map((c) => this.ses.cookies.remove(
        `http${c.secure ? 's' : ''}://${c.domain.replace(/^\./, '')}${c.path}`, c.name
      )));
    } catch (_) {}
    this.emit('changed', this.status);
  }

  openLoginWindow() {
    if (this._win && !this._win.isDestroyed()) {
      this._win.show();
      this._win.focus();
      return;
    }
    this._win = new BrowserWindow({
      width: 460,
      height: 660,
      title: '登录掘金',
      autoHideMenuBar: true,
      backgroundColor: '#ffffff',
      webPreferences: {
        partition: PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    this._win.loadURL(LOGIN_URL);
    this._win.on('closed', () => {
      this._win = null;
      this._stopPoll();
      this.emit('login-window-closed');
    });
    this._startPoll();
  }

  _startPoll() {
    this._stopPoll();
    this._pollTimer = setInterval(() => this._check(), 2000);
    this._check();
  }

  _stopPoll() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  _finish(success) {
    this._stopPoll();
    if (this._win && !this._win.isDestroyed()) this._win.close();
    this._win = null;
    this.emit('login-finished', success);
  }

  async _check() {
    try {
      const cookies = await this.ses.cookies.get({ domain: 'juejin.cn' });
      const hasSession = cookies.some((c) => c.name === 'sessionid_ss' || c.name === 'sessionid');
      if (!hasSession) return;
      const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
      if (cookieString === this.cookieString && this.user) {
        this._finish(true);
        return;
      }
      const user = await this._fetchUser(cookieString);
      if (user) {
        await this._save(cookieString, user);
        this._finish(true);
      }
    } catch (e) {
      console.warn('[auth] check failed:', e.message);
    }
  }

  async _fetchUser(cookieString) {
    const resp = await fetch(USER_API, {
      headers: {
        cookie: cookieString,
        'user-agent': UA,
        referer: 'https://juejin.cn/',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (data && data.err_no === 0 && data.data && data.data.user_id) {
      return {
        uid: data.data.user_id,
        name: data.data.user_name,
        avatar: data.data.avatar_large || '',
      };
    }
    return null;
  }
}

module.exports = { JuejinAuth };
