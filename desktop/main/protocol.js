/**
 * jw:// 自定义协议
 *
 * 以 standard + secure 方式注册，让页面能像 https 一样同源加载脚本与图片：
 * - 不污染 Canvas（character-renderer.js 需 getImageData 切雪碧图，file:// 会直接失败）
 * - 相对路径 / fetch 均可用，替代 chrome.runtime.getURL 的角色
 */
const { protocol, net } = require('electron');
const path = require('path');
const url = require('url');

const ROOT = path.join(__dirname, '..'); // desktop/

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'jw',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function register() {
  protocol.handle('jw', (request) => {
    // jw://app/<相对路径> → desktop/<相对路径>
    const u = new URL(request.url);
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, '');
    const filePath = path.normalize(path.join(ROOT, rel));
    if (!filePath.startsWith(ROOT)) {
      return new Response('forbidden', { status: 403 });
    }
    return net.fetch(url.pathToFileURL(filePath).toString());
  });
}

module.exports = { register };
