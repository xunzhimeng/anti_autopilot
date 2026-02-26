import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================
// AG Autopilot v0.2.0
// ============================================================

const STATE_FILENAME = 'auto-accept.state.json';

const JS_FILENAME = 'auto-accept.js';
const MARKER_START = '<!-- [AG-AUTOPILOT-START] -->';
const MARKER_END = '<!-- [AG-AUTOPILOT-END] -->';
const WORKBENCH_REL = path.join('out', 'vs', 'code', 'electron-browser', 'workbench');
const CHECKSUM_KEY = 'vs/code/electron-browser/workbench/workbench.html';

// === i18n ===
const isZh = vscode.env.language.startsWith('zh');

const i18n = {
    installSuccess: isZh ? '✅ 安装成功！需要重新加载窗口。' : '✅ Installed! Window reload required.',
    uninstallSuccess: isZh ? '✅ 已卸载！需要重新加载窗口。' : '✅ Uninstalled! Window reload required.',
    reload: isZh ? '重新加载' : 'Reload',
    installFail: (msg: string) => isZh ? `安装失败: ${msg}` : `Installation failed: ${msg}`,
    uninstallFail: (msg: string) => isZh ? `卸载失败: ${msg}` : `Uninstall failed: ${msg}`,
    htmlNotFound: (p: string) => isZh ? `未找到 workbench.html: ${p}` : `workbench.html not found: ${p}`,
    notInstalled: isZh ? 'AG Autopilot 尚未安装' : 'AG Autopilot is not installed',
    promptInstall: isZh ? 'AG Autopilot 尚未安装，是否现在安装？' : 'AG Autopilot is not installed. Install now?',
    install: isZh ? '安装' : 'Install',
    later: isZh ? '稍后' : 'Later',
    paused: isZh ? '⏸ 已暂停' : '⏸ Paused',
    resumed: isZh ? '▶ 已恢复' : '▶ Resumed',
    statusNotInstalled: isZh ? '未安装' : 'Not Installed',
    statusPaused: isZh ? '已安装 · 已暂停' : 'Installed · Paused',
    statusRunning: isZh ? '已安装 · 运行中' : 'Installed · Running',
    btnResume: isZh ? '▶ 恢复运行' : '▶ Resume',
    btnPause: isZh ? '⏸ 暂停' : '⏸ Pause',
    btnReinstall: isZh ? '🔄 重新安装' : '🔄 Reinstall',
    btnUninstall: isZh ? '🗑️ 卸载脚本' : '🗑️ Uninstall',
    btnInstall: isZh ? '🚀 安装脚本' : '🚀 Install Script',
    infoTip: isZh ? '💡 暂停/恢复无需重新加载窗口，实时生效' : '💡 Pause/Resume takes effect instantly — no reload needed',
};

// === Injected auto-click JS ===
function getAutoAcceptJS(): string {
    return `// AG Autopilot - Auto Accept Script v0.2.0
(function() {
    'use strict';
    var CONFIG = {
        enabled: true,
        acceptKeywords: ['Run', 'Accept', 'Allow', 'Approve'],
        rejectKeywords: ['Reject', 'Cancel', 'No', 'Close', 'Deny', 'Always run'],
        logPrefix: '[AG-Autopilot]',
        stateFile: './${STATE_FILENAME}'
    };
    var enabled = CONFIG.enabled;
    var paused = false;

    // Poll state file to check pause status
    function pollState() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', CONFIG.stateFile + '?t=' + Date.now(), false);
            xhr.send();
            if (xhr.status === 200) {
                var state = JSON.parse(xhr.responseText);
                if (typeof state.paused === 'boolean') {
                    if (paused !== state.paused) {
                        paused = state.paused;
                        console.log(CONFIG.logPrefix, paused ? '⏸ PAUSED' : '▶ RESUMED');
                    }
                }
            }
        } catch(e) { /* state file not found = not paused */ }
    }

    function isAcceptButton(el) {
        if (!el || el.disabled) return false;
        var tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (tag !== 'button' && tag !== 'a' && (!el.getAttribute || el.getAttribute('role') !== 'button')) return false;
        var text = (el.innerText || el.textContent || '').trim();
        if (!text) return false;
        for (var i = 0; i < CONFIG.rejectKeywords.length; i++) {
            if (text.indexOf(CONFIG.rejectKeywords[i]) >= 0) return false;
        }
        for (var j = 0; j < CONFIG.acceptKeywords.length; j++) {
            if (text.indexOf(CONFIG.acceptKeywords[j]) >= 0) return true;
        }
        return false;
    }

    function scanAndClick() {
        if (!enabled || paused) return;
        var buttons = document.querySelectorAll('button, a[role="button"], [role="button"], .monaco-button');
        for (var i = 0; i < buttons.length; i++) {
            if (isAcceptButton(buttons[i])) {
                var text = (buttons[i].innerText || '').trim();
                console.log(CONFIG.logPrefix, 'Clicked:', text);
                buttons[i].click();
                return;
            }
        }
    }

    // Auto-dismiss "installation appears corrupt" warning — multi-strategy coverage
    function dismissCorruptWarning() {
        // Strategy 1: Iterate all notification items (toast and list)
        var items = document.querySelectorAll(
            '.notification-list-item,' +
            '.notification-toast,' +
            '.notifications-toasts .monaco-list-row,' +
            '.notification-toast-container .notification-list-item'
        );
        for (var i = 0; i < items.length; i++) {
            var t = items[i].textContent || '';
            if (t.indexOf('损坏') >= 0 || t.indexOf('orrupt') >= 0) {
                var close = items[i].querySelector(
                    '.codicon-close,' +
                    '.codicon-notifications-clear,' +
                    'a.action-label[title*="Close"],' +
                    'a.action-label[title*="关闭"],' +
                    'a.action-label[title*="清除"],' +
                    '.clear-notification-action'
                );
                if (close) { close.click(); console.log(CONFIG.logPrefix, 'Dismissed corrupt warning (strategy 1a)'); return; }
                var actions = items[i].querySelectorAll('a.action-label, .action-item a');
                for (var j = 0; j < actions.length; j++) {
                    var cls = actions[j].className || '';
                    var title = actions[j].getAttribute('title') || '';
                    if (cls.indexOf('close') >= 0 || cls.indexOf('clear') >= 0 ||
                        title.indexOf('Close') >= 0 || title.indexOf('关闭') >= 0 || title.indexOf('清除') >= 0) {
                        actions[j].click();
                        console.log(CONFIG.logPrefix, 'Dismissed corrupt warning (strategy 1b)');
                        return;
                    }
                }
            }
        }

        // Strategy 2: Banner-style notifications near status bar (non-toast)
        var banners = document.querySelectorAll(
            '.notifications-center .notification-list-item,' +
            '.part.banner,' +
            '.notification-center-header'
        );
        for (var i = 0; i < banners.length; i++) {
            var t2 = banners[i].textContent || '';
            if (t2.indexOf('损坏') >= 0 || t2.indexOf('orrupt') >= 0) {
                var close2 = banners[i].querySelector('a.action-label, .codicon-close');
                if (close2) { close2.click(); console.log(CONFIG.logPrefix, 'Dismissed corrupt warning (strategy 2)'); return; }
            }
        }

        // Strategy 3: Brute-force global search
        var allSpans = document.querySelectorAll('span, p, div');
        for (var k = 0; k < allSpans.length; k++) {
            var node = allSpans[k];
            if (node.children && node.children.length > 3) continue;
            var nt = node.textContent || '';
            if ((nt.indexOf('损坏') >= 0 || nt.indexOf('orrupt') >= 0) && nt.indexOf('重新安装') >= 0) {
                var parent = node;
                for (var up = 0; up < 8 && parent; up++) {
                    parent = parent.parentElement;
                    if (!parent) break;
                    var closeBtn = parent.querySelector(
                        '.codicon-close, a.action-label[title*="Close"], a.action-label[title*="关闭"], a.action-label[title*="清除"]'
                    );
                    if (closeBtn) {
                        closeBtn.click();
                        console.log(CONFIG.logPrefix, 'Dismissed corrupt warning (strategy 3)');
                        return;
                    }
                }
                var hideTarget = node;
                for (var h = 0; h < 8 && hideTarget; h++) {
                    hideTarget = hideTarget.parentElement;
                    if (!hideTarget) break;
                    var cls3 = hideTarget.className || '';
                    if (cls3.indexOf('notification') >= 0 || cls3.indexOf('banner') >= 0) {
                        hideTarget.style.display = 'none';
                        console.log(CONFIG.logPrefix, 'Hidden corrupt warning element (strategy 3 hide)');
                        return;
                    }
                }
            }
        }
    }

    var debounceTimer = null;
    function startObserver() {
        var observer = new MutationObserver(function() {
            if (!enabled || paused) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(scanAndClick, 150);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.log(CONFIG.logPrefix, 'MutationObserver started');
    }

    setTimeout(function() {
        startObserver();
        // Poll state file every 2s
        setInterval(function() {
            pollState();
            scanAndClick();
        }, 2000);
        // Repeatedly try to dismiss corrupt warning within 60s after startup
        var dismissCount = 0;
        var dismissTimer = setInterval(function() {
            dismissCorruptWarning();
            dismissCount++;
            if (dismissCount >= 30) clearInterval(dismissTimer);
        }, 2000);
    }, 3000);

    window.toggleAutoAccept = function(forcePause) {
        if (typeof forcePause === 'boolean') {
            paused = forcePause;
        } else {
            paused = !paused;
        }
        console.log(CONFIG.logPrefix, paused ? '⏸ PAUSED' : '▶ RESUMED');
        return !paused;
    };

    console.log(CONFIG.logPrefix, 'Loaded v0.2.0, starting in 3s');
})();
`;
}

// === Paths ===
function getPaths() {
    const appRoot = vscode.env.appRoot;
    const workbenchDir = path.join(appRoot, WORKBENCH_REL);
    return {
        appRoot,
        workbenchDir,
        htmlPath: path.join(workbenchDir, 'workbench.html'),
        jsPath: path.join(workbenchDir, JS_FILENAME),
        statePath: path.join(workbenchDir, STATE_FILENAME),
        productPath: path.join(appRoot, 'product.json'),
        backupHtml: path.join(workbenchDir, 'workbench.html.ag-backup'),
        backupProduct: path.join(appRoot, 'product.json.ag-backup'),
    };
}

// === State file management ===
function readPauseState(): boolean {
    const { statePath } = getPaths();
    try {
        if (fs.existsSync(statePath)) {
            const data = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
            return !!data.paused;
        }
    } catch { }
    return false;
}

function writePauseState(paused: boolean): void {
    const { statePath } = getPaths();
    fs.writeFileSync(statePath, JSON.stringify({ paused }, null, 2), 'utf-8');
}

// === Checksum ===
function computeChecksum(filePath: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('base64').replace(/=+$/, '');
}

function updateProductChecksum(productPath: string, key: string, hash: string): boolean {
    const content = fs.readFileSync(productPath, 'utf-8');
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`("${escapedKey}"\\s*:\\s*)"([^"]*)"`, 'm');
    if (regex.test(content)) {
        const newContent = content.replace(regex, `$1"${hash}"`);
        fs.writeFileSync(productPath, newContent, 'utf-8');
        return true;
    }
    return false;
}

// === Install / Uninstall ===
function isInstalled(): boolean {
    const { htmlPath } = getPaths();
    return fs.existsSync(htmlPath) && fs.readFileSync(htmlPath, 'utf-8').includes(MARKER_START);
}

async function doInstall(): Promise<boolean> {
    const p = getPaths();
    if (!fs.existsSync(p.htmlPath)) {
        vscode.window.showErrorMessage(i18n.htmlNotFound(p.htmlPath));
        return false;
    }
    try {
        let content = fs.readFileSync(p.htmlPath, 'utf-8');
        if (content.includes(MARKER_START)) {
            content = content.substring(0, content.indexOf(MARKER_START)) +
                content.substring(content.indexOf(MARKER_END) + MARKER_END.length);
        }
        if (!fs.existsSync(p.backupHtml)) { fs.copyFileSync(p.htmlPath, p.backupHtml); }
        if (!fs.existsSync(p.backupProduct)) { fs.copyFileSync(p.productPath, p.backupProduct); }
        fs.writeFileSync(p.jsPath, getAutoAcceptJS(), 'utf-8');
        const tag = `\n${MARKER_START}\n<script src="./${JS_FILENAME}"></script>\n${MARKER_END}\n`;
        content = content.replace('</html>', tag + '</html>');
        fs.writeFileSync(p.htmlPath, content, 'utf-8');
        updateProductChecksum(p.productPath, CHECKSUM_KEY, computeChecksum(p.htmlPath));
        return true;
    } catch (err: any) {
        vscode.window.showErrorMessage(i18n.installFail(err.message));
        return false;
    }
}

async function doUninstall(): Promise<boolean> {
    const p = getPaths();
    try {
        if (fs.existsSync(p.backupHtml)) {
            fs.copyFileSync(p.backupHtml, p.htmlPath);
        } else {
            let content = fs.readFileSync(p.htmlPath, 'utf-8');
            if (content.includes(MARKER_START)) {
                content = content.substring(0, content.indexOf(MARKER_START)) +
                    content.substring(content.indexOf(MARKER_END) + MARKER_END.length);
                fs.writeFileSync(p.htmlPath, content, 'utf-8');
            }
        }
        if (fs.existsSync(p.jsPath)) { fs.unlinkSync(p.jsPath); }
        if (fs.existsSync(p.backupProduct)) {
            fs.copyFileSync(p.backupProduct, p.productPath);
        } else {
            updateProductChecksum(p.productPath, CHECKSUM_KEY, computeChecksum(p.htmlPath));
        }
        return true;
    } catch (err: any) {
        vscode.window.showErrorMessage(i18n.uninstallFail(err.message));
        return false;
    }
}

// === Webview Sidebar ===
class AutopilotViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'agAutopilot.panel';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        this._updateHtml();

        webviewView.webview.onDidReceiveMessage(async (msg) => {
            switch (msg.command) {
                case 'install': {
                    const ok = await doInstall();
                    if (ok) {
                        this._updateHtml();
                        const action = await vscode.window.showInformationMessage(
                            i18n.installSuccess, i18n.reload
                        );
                        if (action === i18n.reload) {
                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    }
                    break;
                }
                case 'uninstall': {
                    const ok = await doUninstall();
                    if (ok) {
                        this._updateHtml();
                        const action = await vscode.window.showInformationMessage(
                            i18n.uninstallSuccess, i18n.reload
                        );
                        if (action === i18n.reload) {
                            vscode.commands.executeCommand('workbench.action.reloadWindow');
                        }
                    }
                    break;
                }
                case 'toggle': {
                    const currentPaused = readPauseState();
                    writePauseState(!currentPaused);
                    this._updateHtml();
                    const newState = !currentPaused ? i18n.paused : i18n.resumed;
                    vscode.window.showInformationMessage(`AG Autopilot ${newState}`);
                    break;
                }
            }
        });
    }

    public refresh() { this._updateHtml(); }

    private _updateHtml() {
        if (!this._view) { return; }
        const installed = isInstalled();
        const paused = installed ? readPauseState() : false;
        const statusDot = !installed ? '🔴' : paused ? '🟡' : '🟢';
        const statusText = !installed ? i18n.statusNotInstalled : paused ? i18n.statusPaused : i18n.statusRunning;
        const lang = isZh ? 'zh-CN' : 'en';

        this._view.webview.html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: var(--vscode-font-family, 'Segoe UI', system-ui, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 12px;
}
.status-card {
    display: flex; align-items: center; gap: 8px; padding: 10px 12px;
    background: var(--vscode-editor-background); border-radius: 6px; margin-bottom: 12px;
}
.status-dot { font-size: 14px; }
.status-text { font-weight: 500; }
.btn {
    display: block; width: 100%; padding: 8px 12px; margin-bottom: 6px;
    border: none; border-radius: 4px; font-size: 13px; font-family: inherit;
    cursor: pointer; transition: opacity 0.15s;
}
.btn:hover { opacity: 0.85; }
.btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
.btn-danger { background: var(--vscode-errorForeground, #e74c3c); color: #fff; }
.btn-warning {
    background: #e67e22; color: #fff;
}
.btn-success {
    background: #27ae60; color: #fff;
}
.info {
    margin-top: 16px; padding: 10px; font-size: 12px; opacity: 0.6;
    background: var(--vscode-editor-background); border-radius: 6px; line-height: 1.5;
}
</style>
</head>
<body>
    <div class="status-card">
        <span class="status-dot">${statusDot}</span>
        <span class="status-text">${statusText}</span>
    </div>
    ${installed
                ? `${paused
                    ? `<button class="btn btn-success" onclick="send('toggle')">${i18n.btnResume}</button>`
                    : `<button class="btn btn-warning" onclick="send('toggle')">${i18n.btnPause}</button>`
                }
               <button class="btn btn-primary" onclick="send('install')">${i18n.btnReinstall}</button>
               <button class="btn btn-danger" onclick="send('uninstall')">${i18n.btnUninstall}</button>`
                : `<button class="btn btn-primary" onclick="send('install')">${i18n.btnInstall}</button>`
            }
    <div class="info">
        <b>AG Autopilot</b><br>
        ${i18n.infoTip}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function send(cmd) { vscode.postMessage({ command: cmd }); }
    </script>
</body>
</html>`;
    }
}

// === Extension Entry ===
export function activate(context: vscode.ExtensionContext) {
    console.log('[AG-Autopilot] Activated');

    const provider = new AutopilotViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AutopilotViewProvider.viewType, provider),
        vscode.commands.registerCommand('agAutopilot.install', async () => {
            const ok = await doInstall();
            if (ok) {
                provider.refresh();
                const action = await vscode.window.showInformationMessage(i18n.installSuccess, i18n.reload);
                if (action === i18n.reload) { vscode.commands.executeCommand('workbench.action.reloadWindow'); }
            }
        }),
        vscode.commands.registerCommand('agAutopilot.uninstall', async () => {
            const ok = await doUninstall();
            if (ok) {
                provider.refresh();
                const action = await vscode.window.showInformationMessage(i18n.uninstallSuccess, i18n.reload);
                if (action === i18n.reload) { vscode.commands.executeCommand('workbench.action.reloadWindow'); }
            }
        }),
        vscode.commands.registerCommand('agAutopilot.toggle', () => {
            if (!isInstalled()) {
                vscode.window.showWarningMessage(i18n.notInstalled);
                return;
            }
            const currentPaused = readPauseState();
            writePauseState(!currentPaused);
            provider.refresh();
            const newState = !currentPaused ? i18n.paused : i18n.resumed;
            vscode.window.showInformationMessage(`AG Autopilot ${newState}`);
        })
    );

    if (!isInstalled()) {
        vscode.window.showInformationMessage(i18n.promptInstall, i18n.install, i18n.later)
            .then(action => {
                if (action === i18n.install) {
                    doInstall().then(ok => {
                        if (ok) {
                            provider.refresh();
                            vscode.window.showInformationMessage(i18n.installSuccess, i18n.reload)
                                .then(a => { if (a === i18n.reload) { vscode.commands.executeCommand('workbench.action.reloadWindow'); } });
                        }
                    });
                }
            });
    }
}

export function deactivate() { }
