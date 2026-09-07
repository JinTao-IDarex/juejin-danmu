/**
 * 主进程掘金接口轮询
 *
 * 浏览器版依赖页面 Cookie + credentials:'include'，桌面版在主进程用 Node fetch
 * 直接带 Cookie 请求（无 CORS），抓取逻辑与 juejin-integration.js 保持一致，
 * 产出同一结构的消息对象，供渲染进程 DesktopProvider 合并进消息池。
 */
const { EventEmitter } = require('events');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const JUEJIN_APIS = {
  pinRecommend: 'https://api.juejin.cn/recommend_api/v1/short_msg/recommend',
  pinHot: 'https://api.juejin.cn/recommend_api/v1/short_msg/hot',
  articleFeed: 'https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed',
  articleHot: 'https://api.juejin.cn/rank_api/v1/scroll_article/list',
  commentList: 'https://api.juejin.cn/interact_api/v1/comment/list',
};

function clean(text) {
  return String(text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

class JuejinFetcher extends EventEmitter {
  /**
   * @param {import('./auth').JuejinAuth} auth
   * @param {typeof import('./settings')} settings
   */
  constructor(auth, settings) {
    super();
    this.auth = auth;
    this.settings = settings;
    this.fetching = false;
    this.lastFetchTime = 0;
    this.stats = {
      pinNew: 0, pinHot: 0,
      articleNew: 0, articleHot: 0,
      comment: 0,
      lastScheduledAt: 0,
    };
  }

  _headers() {
    const h = {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      Referer: 'https://juejin.cn/',
      Origin: 'https://juejin.cn',
    };
    const cookie = this.auth.cookieString;
    if (cookie) h.Cookie = cookie;
    return h;
  }

  async _post(url, body) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  }

  async fetchNow(reason = 'scheduled') {
    // manual 强制刷新，其余 30 秒冷却
    const now = Date.now();
    if (this.fetching) return { items: [], stats: this.stats, skipped: true };
    if (reason !== 'manual' && this.messagePoolGuarded(now)) {
      return { items: [], stats: this.stats, skipped: true };
    }
    this.fetching = true;
    try {
      const settled = await Promise.allSettled([
        this._fetchPinLatest(),
        this._fetchPinHot(),
        this._fetchArticleLatest(),
        this._fetchArticleHot(),
        this._fetchHotComments(),
      ]);
      const all = [];
      settled.forEach((r) => {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) all.push(...r.value);
      });
      this.stats.lastScheduledAt = Date.now();
      this.lastFetchTime = Date.now();
      this.emit('fetched', { count: all.length, reason });
      return { items: all, stats: Object.assign({}, this.stats), skipped: false };
    } finally {
      this.fetching = false;
    }
  }

  messagePoolGuarded(now) {
    return now - this.lastFetchTime < 30_000;
  }

  // ============ 沸点：最新（sort_type=300）============
  async _fetchPinLatest() {
    const results = [];
    try {
      const data = await this._post(JUEJIN_APIS.pinRecommend, { cursor: '0', limit: 20, sort_type: 300 });
      (data.data || []).forEach((item) => {
        const info = item.msg_Info || {};
        const txt = clean(item.msg_content || info.content || item.content);
        if (!txt) return;
        const msgId = String(item.msg_id || info.msg_id || '');
        results.push({
          text: txt.slice(0, 80),
          tag: 'pin-new',
          source: '沸点·最新',
          username: (item.author_user_info && item.author_user_info.user_name) || '',
          pinId: msgId,
          replyCount: info.comment_count || 0,
          likeCount: info.digg_count || 0,
          url: msgId ? `https://juejin.cn/pin/${msgId}` : null,
        });
      });
      this.stats.pinNew = results.length;
    } catch (_) { /* 单源失败不影响整体 */ }
    return results;
  }

  // ============ 沸点：最热 ============
  async _fetchPinHot() {
    const results = [];
    try {
      const data = await this._post(JUEJIN_APIS.pinHot, { cursor: '0', limit: 20, sort_type: 200 });
      (data.data || []).forEach((item) => {
        const info = item.msg_Info || {};
        const txt = clean(item.msg_content || info.content || item.content);
        if (!txt) return;
        const msgId = String(item.msg_id || info.msg_id || '');
        results.push({
          text: txt.slice(0, 80),
          tag: 'pin-hot',
          source: '沸点·最热',
          username: (item.author_user_info && item.author_user_info.user_name) || '',
          pinId: msgId,
          replyCount: info.comment_count || 0,
          likeCount: info.digg_count || 0,
          url: msgId ? `https://juejin.cn/pin/${msgId}` : null,
        });
      });
      this.stats.pinHot = results.length;
    } catch (_) {}
    return results;
  }

  // ============ 文章：最新 ============
  async _fetchArticleLatest() {
    const results = [];
    try {
      const data = await this._post(JUEJIN_APIS.articleFeed, {
        cursor: '0', limit: 20, sort_type: 300, id_type: 2, client_type: 2608,
      });
      (data.data || []).forEach((item) => {
        const info = item.article_info || {};
        const author = item.author_user_info || {};
        const title = (info.title || '').trim();
        if (!title) return;
        const articleId = String(info.article_id || item.articleId || '');
        results.push({
          text: title.slice(0, 80),
          tag: 'article-new',
          source: '文章·最新',
          username: author.user_name || '',
          articleId,
          replyCount: info.comment_count || 0,
          likeCount: info.digg_count || 0,
          url: articleId ? `https://juejin.cn/post/${articleId}` : null,
        });
      });
      this.stats.articleNew = results.length;
    } catch (_) {}
    return results;
  }

  // ============ 文章：热榜 ============
  async _fetchArticleHot() {
    const results = [];
    try {
      const data = await this._post(JUEJIN_APIS.articleHot, { cursor: '0', limit: 20, sort_type: 200 });
      (data.data || []).forEach((item) => {
        const info = item.article_info || item;
        const author = item.author_user_info || {};
        const title = (info.title || '').trim();
        if (!title) return;
        const articleId = String(info.article_id || item.articleId || '');
        results.push({
          text: title.slice(0, 80),
          tag: 'article-hot',
          source: '文章·最热',
          username: author.user_name || '',
          articleId,
          replyCount: info.comment_count || 0,
          likeCount: info.digg_count || 0,
          url: articleId ? `https://juejin.cn/post/${articleId}` : null,
        });
      });
      this.stats.articleHot = results.length;
    } catch (_) {}
    return results;
  }

  // ============ 热门评论：取前 3 条热门沸点的评论 ============
  async _fetchHotComments() {
    const results = [];
    try {
      const pinData = await this._post(JUEJIN_APIS.pinHot, { cursor: '0', limit: 3, sort_type: 200 });
      const pins = (pinData.data || []).slice(0, 3);
      for (const pin of pins) {
        const pinId = pin.msg_id || (pin.msg_Info && pin.msg_Info.msg_id);
        if (!pinId) continue;
        try {
          const cData = await this._post(JUEJIN_APIS.commentList, {
            item_type: 4,
            item_id: String(pinId),
            cursor: '0',
            limit: 5,
            sort: 0,
          });
          ((cData.data && cData.data.comments) || []).forEach((c) => {
            const txt = clean(c.comment_info && c.comment_info.content);
            if (!txt || txt.length <= 5) return;
            results.push({
              text: txt.slice(0, 80),
              tag: 'comment',
              source: '评论',
              username: (c.comment_user_info && c.comment_user_info.user_name) || '',
              pinId: String(pinId),
              replyCount: (c.comment_info && c.comment_info.reply_count) || 0,
              likeCount: (c.comment_info && c.comment_info.digg_count) || 0,
              url: `https://juejin.cn/pin/${pinId}`,
            });
          });
        } catch (_) { /* 单个沸点评论失败不影响整体 */ }
      }
      this.stats.comment = results.length;
    } catch (_) {}
    return results;
  }
}

module.exports = { JuejinFetcher };
