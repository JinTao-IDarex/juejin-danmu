# 掘金弹幕 · Juejin Danmu

> 在掘金（juejin.cn）页面上跑起来的「行走小人」弹幕墙 —— 透明背景角色沿页面底部走动，播报沸点、热榜、评论等消息，让刷帖像看直播一样热闹。

![Chrome Extension](https://img.shields.io/badge/Chrome-MV3-4285F4)
![Tampermonkey](https://img.shields.io/badge/Tampermonkey-UserScript-00485B)
![Version](https://img.shields.io/badge/version-2.13.1-green)
![License](https://img.shields.io/badge/license-Apache--2.0-blue)

## ✨ 功能特性

- 🚶 **行走弹幕墙**：透明背景角色在页面底部来回走动，头顶气泡播报消息
- 📣 **实时播报**：接入掘金沸点、热榜、评论等消息源
- 🎭 **多套角色风格**，随时切换：
  - 🎪 **南风知意**（kaai）— 60 款人物
  - 🐺 **谎语之夜**（wolfkill）— 20 款狼人杀人物
  - 🩸 **兽杀奇谭**（beastkill）— 20 款兽人狼杀角色
  - 🤖 **赛博武士**（ronin）— 独立帧动画（待机 / 奔跑 / 跳跃）
- 🎛️ **配置面板**：悬浮面板切换风格、调整参数（见 `message-wall-config-redesign.html` 设计稿）

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
3. 打开 [juejin.cn](https://juejin.cn) 即可生效

## 🔨 构建

```bash
node build-all-in-one.cjs
```

构建脚本会把三个源码模块（`character-renderer.js`、`message-wall-core.js`、`juejin-integration.js`）与素材资源合并，**一次产出两种形态**：

1. 油猴脚本 `juejin-message-wall-all-in-one.user.js`（资源内嵌 base64）
2. Chrome 扩展 `chrome-extension/`（资源拆分到 `chrome-extension/resources/`，运行时经 `chrome.runtime.getURL` 加载）

仅依赖 Node.js 内置模块，无需安装第三方依赖。Windows 下也可使用等价的 `build-all-in-one.ps1`。

## 📁 目录结构

```
.
├── character-renderer.js        # 角色绘制引擎（Canvas 2D，多形象/朝向/动画帧）
├── message-wall-core.js         # 消息墙核心逻辑（行走、气泡、调度）
├── juejin-integration.js        # 掘金页面集成（沸点/热榜/评论消息接入）
├── build-all-in-one.cjs / .ps1  # 构建脚本：合并源码 + 素材 → 油猴脚本 & Chrome 扩展
├── chrome-extension/            # Chrome MV3 扩展（manifest、content.js、图标、资源）
├── juejin-message-wall-all-in-one.user.js  # 油猴脚本成品（构建产物）
├── demo.html                    # 本地演示页（无需安装即可预览效果）
├── message-wall-config-redesign.html       # 配置面板原型
├── bubble-style-redesign.design/           # 气泡样式设计工作目录
├── message-wall-config-redesign.design/    # 配置面板设计工作目录
├── logo-redesign/               # Logo 重设计工作目录
└── 素材目录（见下）
```

## 🎨 素材目录

| 目录 | 内容 |
| --- | --- |
| `my-characters/` | 雪碧图源文件：南风知意、谎语之夜、兽杀奇谭 |
| `anime90s-characters/` | 90 年代动画风人物立绘（20 款） |
| `hanfu-characters/` | 汉服古风人物立绘（20 款） |
| `werewolf-characters/` | 狼人杀主题人物立绘 |
| `ship-blackgill-crew/` | 黑鳃号船员主题立绘 |
| `tarot-major-arcana/` | 塔罗大阿卡纳主题立绘 |
| `styles/` | 风格总览图与角色风格封面 |
| `pets/` | 宠物素材（bancho、赛博武士） |
| `icons/`、`juejin-danmu-icon*` | 项目图标与备选 Logo |
| `generated/` | 生成过程中的中间素材 |

## 🛠️ 辅助脚本

- `gen-style-image-snippet.cjs / .ps1` — 生成 `demo.html` 的风格图注入片段
- `patch-demo-inject-images.cjs / .ps1` — 将注入片段合并进 `demo.html`（幂等）
- `remove_white_bg.py` — 立绘白底转透明

## 📄 License

[Apache-2.0](LICENSE)
