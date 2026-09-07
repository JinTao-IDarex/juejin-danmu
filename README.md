# 掘金弹幕 · Juejin Danmu

> 在掘金（juejin.cn）页面上跑起来的「行走小人」弹幕墙 —— 透明背景角色沿页面底部走动，播报沸点、热榜、评论等消息，让刷帖像看直播一样热闹。

![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-4285F4)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-UserScript-00485B)
![Version](https://img.shields.io/badge/version-2.13.1-green)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

## ✨ 功能特性

- 🚶 **行走弹幕墙**：透明背景角色在页面底部来回走动，头顶气泡播报消息
- 📣 **实时播报**：接入掘金沸点、热榜、评论等消息源
- 🎭 **三套角色风格**，配置面板随时切换：
  - 🎪 **南风知意**（kaai）— 60 款人物
  - 🐺 **谎语之夜**（wolfkill）— 20 款狼人杀人物
  - 🩸 **兽杀奇谭**（beastkill）— 20 款兽人狼杀角色
- 💬 **气泡交互**：悬停查看作者 / 回复 / 点赞详情，点击跳转对应沸点
- 🎛️ **配置面板**：切换风格，调整角色数量、角色大小、深度层数等参数
- 🖥️ **本地演示**：打开 `demo.html` 即可在浏览器预览，无需安装

## 📦 两种安装形态

| 形态 | 入口 | 特点 |
| --- | --- | --- |
| 油猴脚本 | `juejin-message-wall-all-in-one.user.js` | 单文件即用，图片/动画帧内嵌 base64 |
| Chrome 扩展（MV3） | `chrome-extension/` | 资源拆分为独立文件，体积更小、加载更快 |

### 安装油猴脚本

1. 浏览器安装 [Tampermonkey](https://www.tampermonkey.net/) 扩展
2. 新建脚本，粘贴 `juejin-message-wall-all-in-one.user.js` 的全部内容并保存
3. 打开 [juejin.cn](https://juejin.cn)，页面底部即可看到走动的小人

### 安装 Chrome 扩展（开发者模式）

1. 打开 `chrome://extensions`，开启右上角「开发者模式」
2. 点击「加载已解压的扩展程序」，选择本仓库的 `chrome-extension/` 目录
3. 打开 [juejin.cn](https://juejin.cn) 即可生效；改动代码后点击扩展卡片上的刷新按钮重新加载

## 🔨 构建

```bash
node build-all-in-one.cjs
```

构建脚本会把三个源码模块（`character-renderer.js`、`message-wall-core.js`、`juejin-integration.js`）与 `assets/` 素材合并，**一次产出两种形态**：

1. 油猴脚本 `juejin-message-wall-all-in-one.user.js`（资源内嵌 base64）
2. Chrome 扩展 `chrome-extension/`（manifest、content.js、图标、`resources/` 资源文件，运行时经 `chrome.runtime.getURL` 加载）

仅依赖 Node.js 内置模块，无需安装第三方依赖，全平台可用。

## 📁 目录结构

```
.
├── character-renderer.js        # 角色绘制引擎（Canvas 2D，雪碧图切格 / 朝向 / 行走帧）
├── message-wall-core.js         # 消息墙核心逻辑（行走、气泡、调度）
├── juejin-integration.js        # 掘金页面集成（沸点/热榜/评论消息接入 + 配置面板）
├── build-all-in-one.cjs         # 构建脚本：合并源码 + 素材 → 油猴脚本 & Chrome 扩展
├── chrome-extension/            # Chrome MV3 扩展（构建产物，可直接加载）
├── juejin-message-wall-all-in-one.user.js  # 油猴脚本成品（构建产物）
├── demo.html                    # 本地演示页（相对路径加载源码与素材）
├── message-wall-config-redesign.html       # 配置面板设计原型
├── assets/                      # 构建与演示使用的素材
└── design/                      # 设计工作目录（气泡样式 / 配置面板 / Logo）
```

## 🎨 素材与设计

| 目录 | 内容 |
| --- | --- |
| `assets/my-characters/` | 三套风格的雪碧图源文件（南风知意 4×15、谎语之夜 2×10、兽杀奇谭 2×10） |
| `assets/styles/covers/` | 风格封面图（配置面板「角色风格」卡片预览） |
| `assets/pets/cyber-ronin/` | 赛博武士逐帧动画素材（WebP，预留；当前版本未接入角色池，不会出现在页面中） |
| `assets/icons/` | 项目图标源文件（构建时自动复制到扩展） |
| `design/bubble-style/` | 气泡样式设计画板（`message-wall-core.js` 中气泡视觉令牌的来源） |
| `design/config-panel/` | 配置面板设计画板 |
| `design/logo/` | Logo 设计规范与最终稿 |

## 📄 License

[Apache-2.0](LICENSE)
