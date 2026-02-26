<p align="center">
  <h1 align="center">🚀 AG Autopilot</h1>
  <p align="center">
    <strong>Auto-accept all confirmation dialogs from Antigravity Agent — so you can stay in the flow.</strong>
  </p>
  <p align="center">
    <a href="https://github.com/xunzhimeng/anti_autopilot/stargazers"><img src="https://img.shields.io/github/stars/xunzhimeng/anti_autopilot?style=social" alt="GitHub Stars"></a>
    <a href="https://github.com/xunzhimeng/anti_autopilot/issues"><img src="https://img.shields.io/github/issues/xunzhimeng/anti_autopilot" alt="Issues"></a>
    <a href="https://github.com/xunzhimeng/anti_autopilot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/xunzhimeng/anti_autopilot" alt="License"></a>
    <a href="https://github.com/xunzhimeng/anti_autopilot/releases"><img src="https://img.shields.io/github/v/release/xunzhimeng/anti_autopilot" alt="Release"></a>
  </p>
  <p align="center">
    <a href="./README_CN.md">📖 中文文档</a>
  </p>
</p>

---

## ✨ Features

| Feature | Description |
|---------|------------|
| ⚡ **One-Click Auto Accept** | Automatically clicks `Run`, `Accept`, `Allow`, `Approve` buttons in Antigravity Agent dialogs |
| ⏸️ **Pause & Resume** | Temporarily disable auto-accept without uninstalling — takes effect instantly, no reload needed |
| 🎛️ **Sidebar Panel** | Dedicated Activity Bar panel with real-time status, install/uninstall controls |
| 🔄 **Smart Detection** | MutationObserver + polling ensures no dialog is missed |
| 🌐 **Bilingual UI** | Full Chinese & English interface, auto-detected from VS Code language setting |

## 🖥️ Screenshots

<!-- TODO: Add screenshots or GIF demo -->
<!-- ![AG Autopilot Panel](./assets/screenshot.png) -->

## 📦 Installation

### From VSIX (Recommended)

1. Download the latest `.vsix` from [Releases](https://github.com/xunzhimeng/anti_autopilot/releases)
2. In VS Code / Antigravity, press `Ctrl+Shift+P` → `Extensions: Install from VSIX...`
3. Select the downloaded `.vsix` file
4. Click the 🚀 icon in the Activity Bar to open the control panel
5. Click **Install Script** and reload the window

### From Source

```bash
git clone https://github.com/xunzhimeng/anti_autopilot.git
cd ag-autopilot
npm install
npm run compile
npm run package
```

Then install the generated `.vsix` file.

### Standalone Script (No Extension)

```bash
node install.js          # Install
node install.js remove   # Uninstall
```

## 🚀 Usage

1. Open the **AG Autopilot** panel from the Activity Bar (🚀 icon)
2. Click **Install Script** to inject the auto-accept script
3. Reload the window when prompted
4. The status indicator shows the current state:
   - 🟢 **Running** — auto-accepting dialogs
   - 🟡 **Paused** — temporarily disabled
   - 🔴 **Not Installed** — script not injected

### Commands

| Command | Description |
|---------|------------|
| `AG Autopilot: Install Auto-Accept Script` | Install/reinstall the script |
| `AG Autopilot: Uninstall Auto-Accept Script` | Remove the script and restore original files |
| `AG Autopilot: Pause/Resume Auto-Accept` | Toggle pause state |

## 🔥 Why AG Autopilot?

When working with AI coding agents like Antigravity, you're constantly interrupted by confirmation dialogs:

> "Do you want to run this command?" → **Run**  
> "Allow this action?" → **Accept**  

These interruptions break your focus and slow down your workflow. AG Autopilot eliminates them entirely, letting the AI agent work autonomously while you stay in the zone.

### Perfect For

- 🤖 **AI-Assisted Development** — Let your AI agent run uninterrupted
- ⚡ **Rapid Prototyping** — No more clicking through permission dialogs
- 🔄 **Automated Workflows** — Set it and forget it
- 🎯 **Deep Focus** — Stay in flow state without context switches

## 🏗️ How It Works

AG Autopilot injects a small JavaScript file into the Antigravity workbench HTML. The script:

1. Uses a `MutationObserver` to watch for new DOM elements
2. Identifies confirmation buttons by their text content
3. Automatically clicks accept-type buttons while filtering out reject/cancel buttons
4. Polls a state file to support instant pause/resume without reloading

The extension manages the injection lifecycle and provides a clean UI for control.

## 🤝 Contributing

Contributions are welcome! Feel free to:

- 🐛 [Report bugs](https://github.com/xunzhimeng/anti_autopilot/issues)
- 💡 [Request features](https://github.com/xunzhimeng/anti_autopilot/issues)
- 🔧 [Submit pull requests](https://github.com/xunzhimeng/anti_autopilot/pulls)

## 📈 Star History

<a href="https://star-history.com/#xunzhimeng/anti_autopilot&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=xunzhimeng/anti_autopilot&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=xunzhimeng/anti_autopilot&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=xunzhimeng/anti_autopilot&type=Date" />
 </picture>
</a>

## 📄 License

MIT © [xunzhimeng](https://github.com/xunzhimeng)
