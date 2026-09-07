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
