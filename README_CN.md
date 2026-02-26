<p align="center">
  <h1 align="center">🚀 AG Autopilot</h1>
  <p align="center">
    <strong>自动接受 Antigravity Agent 的所有确认弹窗 —— 让你保持心流状态。</strong>
  </p>
  <p align="center">
    <a href="https://github.com/xunzhimeng/anti_autopilot/stargazers"><img src="https://img.shields.io/github/stars/xunzhimeng/anti_autopilot?style=social" alt="GitHub Stars"></a>
    <a href="https://github.com/xunzhimeng/anti_autopilot/issues"><img src="https://img.shields.io/github/issues/xunzhimeng/anti_autopilot" alt="Issues"></a>
    <a href="https://github.com/xunzhimeng/anti_autopilot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/xunzhimeng/anti_autopilot" alt="License"></a>
    <a href="https://github.com/xunzhimeng/anti_autopilot/releases"><img src="https://img.shields.io/github/v/release/xunzhimeng/anti_autopilot" alt="Release"></a>
  </p>
  <p align="center">
    <a href="./README.md">📖 English Documentation</a>
  </p>
</p>

---

## ✨ 功能特性

| 功能 | 说明 |
|------|------|
| ⚡ **一键自动接受** | 自动点击 Antigravity Agent 弹窗中的 `Run`、`Accept`、`Allow`、`Approve` 按钮 |
| ⏸️ **暂停与恢复** | 无需卸载即可临时禁用自动接受，实时生效，无需重新加载窗口 |
| 🎛️ **侧边栏面板** | 专属 Activity Bar 面板，实时状态显示、安装/卸载控制 |
| 🔄 **智能检测** | MutationObserver + 轮询双保险，确保不遗漏任何弹窗 |
| 🌐 **中英双语界面** | 完整的中英文界面，根据 VS Code 语言设置自动切换 |

## 🖥️ 截图

<!-- TODO: 添加截图或 GIF 演示 -->
<!-- ![AG Autopilot 面板](./assets/screenshot.png) -->

## 📦 安装方式

### 从 VSIX 安装（推荐）

1. 从 [Releases](https://github.com/xunzhimeng/anti_autopilot/releases) 下载最新 `.vsix` 文件
2. 在 VS Code / Antigravity 中按 `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. 选择下载的 `.vsix` 文件
4. 点击 Activity Bar 中的 🚀 图标打开控制面板
5. 点击 **安装脚本** 并重新加载窗口

### 从源码构建

```bash
git clone https://github.com/xunzhimeng/anti_autopilot.git
cd ag-autopilot
npm install
npm run compile
npm run package
```

然后安装生成的 `.vsix` 文件。

### 独立脚本（无需扩展）

```bash
node install.js          # 安装
node install.js remove   # 卸载
```

## 🚀 使用方法

1. 从 Activity Bar（🚀 图标）打开 **AG Autopilot** 面板
2. 点击 **安装脚本** 注入自动接受脚本
3. 按提示重新加载窗口
4. 状态指示器显示当前状态：
   - 🟢 **运行中** — 正在自动接受弹窗
   - 🟡 **已暂停** — 临时禁用
   - 🔴 **未安装** — 脚本未注入

### 命令列表

| 命令 | 说明 |
|------|------|
| `AG Autopilot: 安装自动确认脚本` | 安装/重新安装脚本 |
| `AG Autopilot: 卸载自动确认脚本` | 移除脚本并恢复原始文件 |
| `AG Autopilot: 暂停/恢复自动确认` | 切换暂停状态 |

## 🔥 为什么需要 AG Autopilot？

使用 Antigravity 等 AI 编码助手时，你会被大量确认弹窗不断打断：

> "是否运行此命令？" → **运行**  
> "是否允许此操作？" → **接受**  

这些中断会打破你的专注力、拖慢工作效率。AG Autopilot 彻底消除这些干扰，让 AI 助手自主工作，你只需保持在心流状态中。

### 适用场景

- 🤖 **AI 辅助开发** — 让 AI 助手不间断运行
- ⚡ **快速原型开发** — 不再手动点击权限弹窗
- 🔄 **自动化工作流** — 设置后即可忘记
- 🎯 **深度专注** — 保持心流，避免上下文切换

## 🏗️ 工作原理

AG Autopilot 将一个小型 JavaScript 文件注入到 Antigravity workbench HTML 中。该脚本：

1. 使用 `MutationObserver` 监听新增 DOM 元素
2. 通过按钮文本内容识别确认按钮
3. 自动点击接受类按钮，同时过滤拒绝/取消按钮
4. 轮询状态文件以支持即时暂停/恢复（无需重新加载）

扩展负责管理注入生命周期，并提供简洁的 UI 控制界面。

## 🤝 参与贡献

欢迎贡献！你可以：

- 🐛 [报告 Bug](https://github.com/xunzhimeng/anti_autopilot/issues)
- 💡 [功能建议](https://github.com/xunzhimeng/anti_autopilot/issues)
- 🔧 [提交 Pull Request](https://github.com/xunzhimeng/anti_autopilot/pulls)

## 📈 Star 趋势

<a href="https://star-history.com/#xunzhimeng/anti_autopilot&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=xunzhimeng/anti_autopilot&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=xunzhimeng/anti_autopilot&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=xunzhimeng/anti_autopilot&type=Date" />
 </picture>
</a>

## 📄 开源许可

MIT © [xunzhimeng](https://github.com/xunzhimeng)
