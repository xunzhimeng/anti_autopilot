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
const AGENT_HTML_FILENAME = 'workbench-jetski-agent.html';

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
    infoTip: isZh 
        ? '💡 <b>工作模式指南</b><br><br>🤖 <b>Auto Accept (自动点击)</b><br>实时生效，自动点击各种弹窗中的 Run/Allow 按钮。免去繁杂点击。<br><br>⏰ <b>定时预热 (Scheduled Warmup)</b><br>在设定的时间自动建立新会话并唤醒 Agent。需保持 IDE 开启。' 
        : '💡 <b>Operation Guide</b><br><br>🤖 <b>Auto Accept</b><br>Instantly clicks Run/Allow in prompts. No reload required.<br><br>⏰ <b>Warmup</b><br>Auto-starts a dialogue at scheduled times. Keep IDE open.',
};

// === Injected auto-click JS ===
function getAutoAcceptJS(): string {
    return `// AG Autopilot - Auto Accept Script v0.2.0
(function() {
    'use strict';
    var CONFIG = {
        enabled: true,
        acceptKeywords: ['Run', 'Allow'],
        rejectKeywords: ['Reject', 'Cancel', 'No', 'Close', 'Deny', 'Always run'],
        logPrefix: '[AG-Autopilot]',
        stateFile: './${STATE_FILENAME}'
    };
    var enabled = CONFIG.enabled;
    var paused = false;
    function pollState() {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', CONFIG.stateFile + '?t=' + Date.now(), false);
            xhr.send();
            if (xhr.status === 200) {
                var state = JSON.parse(xhr.responseText);
                if (typeof state.paused === 'boolean') {
                    if (paused !== state.paused) {
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
                simulateMonacoClick(buttons[i]);
                return;
            }
        }
    }



    function dismissCorruptWarning() {
        var items = document.querySelectorAll(
            '.notification-list-item, .notification-toast, .notifications-toasts .monaco-list-row, .notification-toast-container .notification-list-item'
        );
        for (var i = 0; i < items.length; i++) {
            var t = items[i].textContent || '';
            if (t.indexOf('损坏') >= 0 || t.indexOf('orrupt') >= 0) {
                var close = items[i].querySelector('.codicon-close, .codicon-notifications-clear, a.action-label[title*="Close"], a.action-label[title*="关闭"], a.action-label[title*="清除"], .clear-notification-action');
                if (close) { close.click(); console.log(CONFIG.logPrefix, 'Dismissed corrupt warning (target cache)'); return; }
                
                var parent = items[i];
                for (var up = 0; up < 5 && parent; up++) {
                    parent = parent.parentElement;
                    if (!parent) break;
                    var closeBtn = parent.querySelector('.codicon-close, a.action-label[title*="关闭"]');
                    if (closeBtn) { closeBtn.click(); return; }
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
        
        // Poll state file frequently
        setInterval(function() {
            pollState();
        }, 2000);

        // Click auto-accept infrequently (every 2000ms)
        setInterval(function() {
            scanAndClick();
        }, 2000);
        
        // Auto-dismiss the corrupted warning explicitly via JS to free up layout slots
        var dismissCount = 0;
        var dismissTimer = setInterval(function() {
            dismissCorruptWarning();
            dismissCount++;
            if (dismissCount >= 40) clearInterval(dismissTimer);
        }, 1500);

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
    
    // Dynamic path detection to handle both electron-sandbox (modern) and electron-browser (legacy)
    let relPath = path.join('out', 'vs', 'code', 'electron-sandbox', 'workbench');
    if (!fs.existsSync(path.join(appRoot, relPath))) {
        relPath = path.join('out', 'vs', 'code', 'electron-browser', 'workbench');
    }
    
    const workbenchDir = path.join(appRoot, relPath);
    return {
        appRoot,
        workbenchDir,
        htmlPath: path.join(workbenchDir, 'workbench.html'),
        agentHtmlPath: path.join(workbenchDir, AGENT_HTML_FILENAME),
        jsPath: path.join(workbenchDir, JS_FILENAME),
        statePath: path.join(workbenchDir, STATE_FILENAME),
        productPath: path.join(appRoot, 'product.json'),
        backupHtml: path.join(workbenchDir, 'workbench.html.ag-backup'),
        backupAgentHtml: path.join(workbenchDir, AGENT_HTML_FILENAME + '.ag-backup'),
        backupProduct: path.join(appRoot, 'product.json.ag-backup'),
    };
}

// === State file management ===
export interface AGState {
    paused: boolean;
    warmupEnabled?: boolean;
    warmupTimes?: string[]; // 支持多个时间配置，最多3个
    lastWarmupDates?: { [timeStr: string]: string }; // 按时间记录最新触发日期
    // legacy
    warmupTime?: string;
    lastWarmupDate?: string;
}

function readState(): AGState {
    const { statePath } = getPaths();
    try {
        if (fs.existsSync(statePath)) {
            return JSON.parse(fs.readFileSync(statePath, 'utf-8'));
        }
    } catch { }
    return { paused: false };
}

function writeState(state: AGState): void {
    const { statePath } = getPaths();
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function readPauseState(): boolean {
    return !!readState().paused;
}

function writePauseState(paused: boolean): void {
    const state = readState();
    state.paused = paused;
    writeState(state);
}

// === Checksum ===
function computeChecksum(filePath: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('base64').replace(/=+$/, '');
}

function updateProductChecksum(productPath: string, filenameToMatch: string, hash: string): boolean {
    if (!fs.existsSync(productPath)) {
        console.log(`[AG-Autopilot] ${productPath} not found`);
        return false;
    }
    try {
        const content = fs.readFileSync(productPath, 'utf-8');
        const product = JSON.parse(content);
        if (!product.checksums) {
            console.log('[AG-Autopilot] No checksums object in product.json');
            return false;
        }

        let updated = false;
        for (const key of Object.keys(product.checksums)) {
            // Match any key that ends with the filename (e.g. ".../workbench.html")
            if (key === filenameToMatch || key.endsWith('/' + filenameToMatch) || key.endsWith('\\' + filenameToMatch)) {
                if (product.checksums[key] !== hash) {
                    product.checksums[key] = hash;
                    updated = true;
                    console.log(`[AG-Autopilot] Updated hash for ${key}`);
                }
            }
        }

        if (updated) {
            // Try to detect the indentation (usually 2 spaces or tabs in VS Code)
            const match = content.match(/^[\r\n]+(\s+)/m);
            const indent = match ? match[1] : 2;
            fs.writeFileSync(productPath, JSON.stringify(product, null, indent), 'utf-8');
        }
        return updated;
    } catch (err: any) {
        console.error(`[AG-Autopilot] Error updating product.json: ${err.message}`);
        return false;
    }
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
        // --- Main workbench.html ---
        let content = fs.readFileSync(p.htmlPath, 'utf-8');
        if (content.includes(MARKER_START)) {
            content = content.substring(0, content.indexOf(MARKER_START)) +
                content.substring(content.indexOf(MARKER_END) + MARKER_END.length);
        }
        if (!fs.existsSync(p.backupHtml)) { fs.copyFileSync(p.htmlPath, p.backupHtml); }
        if (!fs.existsSync(p.backupProduct)) { fs.copyFileSync(p.productPath, p.backupProduct); }
        fs.writeFileSync(p.jsPath, getAutoAcceptJS(), 'utf-8');
        const cssPayload = `
<style id="ag-autopilot-css">
.notifications-toasts .monaco-list-row:has(.notification-list-item-message),
.notification-toast-container:has(.notification-list-item-message) {
    /* Base rule allowing normal toasts, but dynamically overridden later if matched */
}
/* Aggressive hiding for the specific error */
.monaco-workbench .notifications-toasts .monaco-list-row:has([aria-label*="损坏"]),
.monaco-workbench .notifications-toasts .monaco-list-row:has([title*="损坏"]),
.monaco-workbench .notifications-toasts .monaco-list-row:has([aria-label*="corrupt"]),
.monaco-workbench .notifications-toasts .notification-toast-container:has([aria-label*="损坏"]) {
    display: none !important; 
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
}
</style>`;
        const tag = `\n${MARKER_START}\n<script src="./${JS_FILENAME}"></script>\n${cssPayload}\n${MARKER_END}\n`;
        content = content.replace('</html>', tag + '</html>');
        fs.writeFileSync(p.htmlPath, content, 'utf-8');
        const okHtml = updateProductChecksum(p.productPath, 'workbench.html', computeChecksum(p.htmlPath));

        // --- Agent Manager workbench-jetski-agent.html ---
        let okAgent = true;
        if (fs.existsSync(p.agentHtmlPath)) {
            let agentContent = fs.readFileSync(p.agentHtmlPath, 'utf-8');
            if (agentContent.includes(MARKER_START)) {
                agentContent = agentContent.substring(0, agentContent.indexOf(MARKER_START)) +
                    agentContent.substring(agentContent.indexOf(MARKER_END) + MARKER_END.length);
            }
            if (!fs.existsSync(p.backupAgentHtml)) { fs.copyFileSync(p.agentHtmlPath, p.backupAgentHtml); }
            agentContent = agentContent.replace('</html>', tag + '</html>');
            fs.writeFileSync(p.agentHtmlPath, agentContent, 'utf-8');
            okAgent = updateProductChecksum(p.productPath, AGENT_HTML_FILENAME, computeChecksum(p.agentHtmlPath));
            console.log('[AG-Autopilot] Also injected into Agent Manager HTML and updated its checksum');
        }

        // Try to update js checksum if it exists in product.json (jetski uses it)
        const okJS = updateProductChecksum(p.productPath, JS_FILENAME, computeChecksum(p.jsPath));

        if (!okHtml || !okAgent) {
            console.warn('[AG-Autopilot] Some checksums failed to update, warning might persist.');
        }

        return true;
    } catch (err: any) {
        vscode.window.showErrorMessage(i18n.installFail(err.message));
        return false;
    }
}

async function doUninstall(): Promise<boolean> {
    const p = getPaths();
    try {
        // --- Main workbench.html ---
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
            updateProductChecksum(p.productPath, 'workbench.html', computeChecksum(p.htmlPath));
            if (fs.existsSync(p.agentHtmlPath)) {
                updateProductChecksum(p.productPath, AGENT_HTML_FILENAME, computeChecksum(p.agentHtmlPath));
            }
        }

        // --- Agent Manager workbench-jetski-agent.html ---
        if (fs.existsSync(p.backupAgentHtml)) {
            fs.copyFileSync(p.backupAgentHtml, p.agentHtmlPath);
        } else if (fs.existsSync(p.agentHtmlPath)) {
            let agentContent = fs.readFileSync(p.agentHtmlPath, 'utf-8');
            if (agentContent.includes(MARKER_START)) {
                agentContent = agentContent.substring(0, agentContent.indexOf(MARKER_START)) +
                    agentContent.substring(agentContent.indexOf(MARKER_END) + MARKER_END.length);
                fs.writeFileSync(p.agentHtmlPath, agentContent, 'utf-8');
            }
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
                case 'toggleAutoAccept': {
                    const state = readState();
                    state.paused = !msg.enabled;
                    writeState(state);
                    this._updateHtml();
                    const statusMsg = state.paused ? i18n.paused : i18n.resumed;
                    vscode.window.showInformationMessage(`🤖 自动 Accept 功能 ${statusMsg}`);
                    break;
                }
                case 'testNativeWarmup': {
                    await doWarmupAction();
                    break;
                }
                case 'saveWarmup': {
                    const state = readState();
                    state.warmupEnabled = !!msg.enabled;
                    state.warmupTimes = msg.times || [];
                    if (!state.lastWarmupDates) state.lastWarmupDates = {};
                    writeState(state);
                    // 不再调用 this._updateHtml()，避免失焦
                    const timesStr = (state.warmupTimes || []).join(', ') || '(未设置时间)';
                    const statusMsg = state.warmupEnabled
                        ? (isZh ? `⏰ 定时预热已启用，触发时间: ${timesStr}` : `⏰ Warmup enabled: ${timesStr}`)
                        : (isZh ? '⏰ 定时预热已关闭' : '⏰ Warmup disabled');
                    vscode.window.showInformationMessage(statusMsg);
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
        const state = readState();
        const warmupEnabled = !!state.warmupEnabled;
        const warmupTimes = state.warmupTimes || (state.warmupTime ? [state.warmupTime] : ['08:00', '', '']);
        // padding array to length 3
        while (warmupTimes.length < 3) warmupTimes.push('');
        
        let lastWarmupStr = isZh ? '从未' : 'Never';
        if (state.lastWarmupDates && Object.keys(state.lastWarmupDates).length > 0) {
            lastWarmupStr = Object.entries(state.lastWarmupDates)
                .map(([t, d]) => `${t}(${d.substring(5)})`)
                .join(', ');
        } else if (state.lastWarmupDate) {
            lastWarmupStr = state.lastWarmupDate;
        }

        const autoRunSection = `
    <div class="warmup-card" style="margin-bottom: 16px;">
        <!-- Status inline header -->
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid var(--vscode-widget-border, #444); padding-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-size:14px; margin-top:-1px;">${statusDot}</span>
                <span>${statusText}</span>
            </div>
        </div>
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; color: var(--vscode-foreground);">
            🤖 ${isZh ? '自动 Run (Auto Accept)' : 'Auto Accept'}
        </div>
        <div class="warmup-row" style="background: var(--vscode-editorActionList-background, rgba(0,0,0,0.1)); padding: 10px; border-radius: 6px; margin-bottom: 14px;">
            <label class="switch">
                <input type="checkbox" id="autoAcceptToggle" ${!paused ? 'checked' : ''} onchange="toggleAutoAccept()">
                <span class="slider"></span>
            </label>
            <span style="font-weight: 500; font-size: 13px;">${isZh ? '启用自动 Accept (Auto-Run)' : 'Enable Auto-Accept'}</span>
        </div>
        <div style="display:flex; gap:8px;">
        ${installed
            ? `<button class="btn btn-primary" style="flex:1;margin:0;padding:8px 0;font-size:12px;font-weight:600;" onclick="send('install')">🔄 ${isZh ? '重新安装' : 'Reinstall'}</button>
               <button class="btn btn-danger" style="flex:1;margin:0;padding:8px 0;font-size:12px;font-weight:600;" onclick="send('uninstall')">🗑️ ${isZh ? '卸载' : 'Uninstall'}</button>`
            : `<button class="btn btn-primary" style="flex:1;margin:0;padding:8px 0;font-size:12px;font-weight:600;" onclick="send('install')">🚀 ${isZh ? '安装脚本' : 'Install'}</button>`
        }
        </div>
    </div>`;

        const warmupSection = `
    <div class="warmup-card">
        <div style="font-weight: 600; font-size: 13px; margin-bottom: 12px; border-bottom: 1px solid var(--vscode-widget-border, #444); padding-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            ⏰ ${isZh ? '定时预热 (Scheduled Warmup)' : 'Scheduled Warmup'}
        </div>
        <div class="warmup-row" style="background: var(--vscode-editorActionList-background, rgba(0,0,0,0.1)); padding: 10px; border-radius: 6px; margin-bottom: 14px;">
            <label class="switch">
                <input type="checkbox" id="warmupToggle" ${warmupEnabled ? 'checked' : ''} onchange="saveWarmup()">
                <span class="slider"></span>
            </label>
            <span style="font-weight: 500; font-size: 13px;">${isZh ? '启用定时预热' : 'Enable Warmup'}</span>
        </div>
        <label style="font-size:12px;opacity:0.8;margin-bottom:8px;display:block;font-weight:500;">${isZh ? '触发时间 (最多3个)' : 'Trigger Times (Max 3)'}:</label>
        
        <div class="time-list">
            <div class="time-item">
                <span class="time-num">1</span>
                <div class="time-input-container">
                    <input type="time" class="wt-input time-native" data-idx="0" value="${warmupTimes[0]}" onchange="saveWarmup()">
                </div>
                <button class="clear-btn" onclick="clearTime(0)" title="${isZh ? '清除' : 'Clear'}">清除</button>
            </div>
            <div class="time-item">
                <span class="time-num">2</span>
                <div class="time-input-container">
                    <input type="time" class="wt-input time-native" data-idx="1" value="${warmupTimes[1]}" onchange="saveWarmup()">
                </div>
                <button class="clear-btn" onclick="clearTime(1)" title="${isZh ? '清除' : 'Clear'}">清除</button>
            </div>
            <div class="time-item">
                <span class="time-num">3</span>
                <div class="time-input-container">
                    <input type="time" class="wt-input time-native" data-idx="2" value="${warmupTimes[2]}" onchange="saveWarmup()">
                </div>
                <button class="clear-btn" onclick="clearTime(2)" title="${isZh ? '清除' : 'Clear'}">清除</button>
            </div>
        </div>

        <button class="btn btn-warning" onclick="send('testNativeWarmup')" style="margin-top:14px; font-weight:600; padding:8px 0;">🧪 ${isZh ? '立即触发原生预热' : 'Trigger Warmup Now'}</button>
        <div class="warmup-info">
            <span style="opacity:0.7"><b>${isZh ? '执行记录' : 'Logs'}:</b></span> ${lastWarmupStr}
        </div>
    </div>`;

        this._view.webview.html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
    font-family: var(--vscode-font-family, 'Segoe UI', system-ui, -apple-system, sans-serif);
    font-size: var(--vscode-font-size, 13px);
    color: var(--vscode-foreground);
    background: var(--vscode-sideBar-background);
    padding: 16px 12px;
}
.btn {
    display: block; width: 100%; padding: 8px 12px; margin-bottom: 6px;
    border: none; border-radius: 4px; font-size: 13px; font-family: inherit;
    cursor: pointer; transition: opacity 0.15s, background-color 0.15s;
}
.btn:active { transform: scale(0.98); }
.btn:hover { opacity: 0.9; }
.btn-primary { background: var(--vscode-button-background, #007acc); color: var(--vscode-button-foreground, #fff); }
.btn-danger { background: var(--vscode-errorForeground, #e74c3c); color: var(--vscode-button-foreground, #fff); }
.btn-warning { background: var(--vscode-charts-orange, #e67e22); color: var(--vscode-button-foreground, #fff); }
.btn-success { background: var(--vscode-charts-green, #27ae60); color: var(--vscode-button-foreground, #fff); }

/* Refined Cards */
.warmup-card {
    background: var(--vscode-editor-background); 
    border-radius: 8px; 
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15); 
    border: 1px solid var(--vscode-widget-border, transparent);
}
.warmup-row {
    display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
}
.warmup-info {
    font-size: 11px; margin-top: 12px; text-align: center;
    background: var(--vscode-editorActionList-background, rgba(0,0,0,0.1));
    padding: 6px; border-radius: 4px;
}

/* Time Input styling */
.time-list {
    display: flex; flex-direction: column; gap: 8px;
}
.time-item {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    background: var(--vscode-input-background, transparent);
    border: 1px solid var(--vscode-input-border, #555);
    border-radius: 4px;
    padding: 4px 8px;
    transition: border-color 0.2s;
}
.time-item:focus-within {
    border-color: var(--vscode-focusBorder, #007acc);
}
.time-num {
    font-size: 12px; opacity: 0.5; font-weight: bold; width: 14px; text-align: center;
}
.time-input-container {
    flex: 1; display: flex;
}
.time-native {
    background: transparent; color: var(--vscode-input-foreground);
    border: none; outline: none; font-size: 14px; font-family: monospace;
    width: 100%; cursor: pointer; text-align: center;
}
/* Style the webkit time picker icon depending on the theme */
.time-native::-webkit-calendar-picker-indicator {
    filter: invert(var(--vscode-editor-background) === #ffffff ? 0 : 1);
    opacity: 0.6; cursor: pointer;
}
.time-native::-webkit-calendar-picker-indicator:hover {
    opacity: 1;
}
.clear-btn {
    background: none; border: none; cursor: pointer; font-size: 12px; 
    padding: 2px 6px; opacity: 0.5; color: var(--vscode-foreground);
    border-radius: 3px;
}
.clear-btn:hover {
    opacity: 1; background: var(--vscode-toolbar-hoverBackground, rgba(255,255,255,0.1));
}

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: var(--vscode-input-border, #555); transition: .3s; border-radius: 20px;
}
.slider:before {
    position: absolute; content: ""; height: 12px; width: 12px; left: 3px; bottom: 3px;
    background-color: white; transition: .3s; border-radius: 50%;
}
input:checked + .slider { background-color: var(--vscode-successForeground, #27ae60); }
input:checked + .slider:before { transform: translateX(16px); }

/* Info block */
.info {
    margin-top: 20px; padding: 12px 14px; font-size: 12px; color: var(--vscode-descriptionForeground, #ccc);
    background: var(--vscode-textBlockQuote-background, rgba(0,0,0,0.05)); 
    border-left: 4px solid var(--vscode-textBlockQuote-border, #007acc);
    border-radius: 0 6px 6px 0; line-height: 1.6;
}
</style>
</head>
<body>
    ${autoRunSection}
    ${warmupSection}
    <div class="info">
        ${i18n.infoTip}
    </div>
    <script>
        const vscode = acquireVsCodeApi();
        function send(cmd) { vscode.postMessage({ command: cmd }); }
        
        function toggleAutoAccept() {
            var enabled = document.getElementById('autoAcceptToggle').checked;
            vscode.postMessage({ command: 'toggleAutoAccept', enabled: enabled });
        }

        function saveWarmup() {
            var enabled = document.getElementById('warmupToggle').checked;
            var inputs = document.querySelectorAll('.wt-input');
            var times = [];
            for(var i=0; i<inputs.length; i++) {
                if(inputs[i].value) times.push(inputs[i].value);
            }
            vscode.postMessage({ command: 'saveWarmup', enabled: enabled, times: times });
        }
        function clearTime(idx) {
            var inputs = document.querySelectorAll('.wt-input');
            if(inputs[idx]) { inputs[idx].value = ''; saveWarmup(); }
        }
    </script>
</body>
</html>`;
    }
}

// === Warmup Action (using native workbench commands) ===
async function doWarmupAction(): Promise<void> {
    const prefix = '[AG-Autopilot Warmup]';
    console.log(prefix, 'Starting warmup action...');

    try {
        // Step 1: 新建聊天会话
        console.log(prefix, 'Step 1: antigravity.startNewConversation');
        await vscode.commands.executeCommand('antigravity.startNewConversation');
        
        // Step 2: 等待面板加载，聚焦
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log(prefix, 'Step 2: antigravity.toggleChatFocus');
        await vscode.commands.executeCommand('antigravity.toggleChatFocus');

        // Step 3: 尝试直接用 sendPromptToAgentPanel
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log(prefix, 'Step 3: antigravity.sendPromptToAgentPanel');
        try {
            await vscode.commands.executeCommand('antigravity.sendPromptToAgentPanel', '你好');
            console.log(prefix, 'sendPromptToAgentPanel succeeded!');
            vscode.window.showInformationMessage(
                isZh ? '🔥 预热完成！已发送"你好"。' : '🔥 Warmup done!'
            );
            return;
        } catch (e) {
            console.log(prefix, 'sendPromptToAgentPanel failed, falling back to clipboard...', e);
        }
        
        // Step 4 (fallback): 剪贴板粘贴方式
        const oldClipboard = await vscode.env.clipboard.readText();
        await vscode.env.clipboard.writeText('你好');
        console.log(prefix, 'Step 4 (fallback): clipboard paste');
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        
        await new Promise(resolve => setTimeout(resolve, 300));
        // 恢复剪贴板
        await vscode.env.clipboard.writeText(oldClipboard);
        
        console.log(prefix, 'Warmup action completed!');
        vscode.window.showInformationMessage(
            isZh ? '🔥 预热完成！已新建会话并粘贴"你好"（请手动点发送确认）' : '🔥 Warmup done! Pasted "你好" (please submit manually).'
        );
    } catch (err: any) {
        console.error(prefix, 'Error:', err);
        vscode.window.showErrorMessage(
            isZh ? `❌ 预热操作失败: ${err.message}` : `❌ Warmup failed: ${err.message}`
        );
    }
}

// === DOM Warmup Tester ===
async function doModelWarmupAction(modelName?: string): Promise<void> {
    const prefix = '[AG-Autopilot Model Warmup]';
    console.log(prefix, 'Simulating standard DOM fallback warmup testing...');
    if (modelName) {
        const state = readState();
        // No model changes saved here anymore
        writeState(state);
    }
    // 直接复用主流程进行测试
    await doWarmupAction();
}

// === Warmup Scheduler ===
function startWarmupScheduler(context: vscode.ExtensionContext) {
    const CHECK_INTERVAL_MS = 30_000; // check every 30 seconds
    
    // 增加随机初始延迟，错开多个窗口的定时器执行时间，避免并发冲突
    const windowOffset = Math.floor(Math.random() * 10000); 

    setTimeout(() => {
        setInterval(() => {
            try {
                const state = readState();
                if (!state.warmupEnabled) { return; }
                
                // 兼容旧版或无设置的情况
                const times = state.warmupTimes || (state.warmupTime ? [state.warmupTime] : []);
                if (times.length === 0) return;

                const now = new Date();
                const nowHHMM = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                const todayStr = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');

                let triggered = false;
                for (const t of times) {
                    if (!t) continue;
                    
                    if (nowHHMM === t) {
                        // 使用 VS Code globalState 防止多窗口重复触发
                        const syncKey = `ag_warmup_lock_${todayStr}_${t}`;
                        const alreadyTriggered = context.globalState.get(syncKey);
                        
                        // 结合文件状态双重保险
                        const fileAlreadyTriggered = state.lastWarmupDates && state.lastWarmupDates[t] === todayStr;

                        if (!alreadyTriggered && !fileAlreadyTriggered) {
                            // 抢占锁（记录到 globalState）
                            context.globalState.update(syncKey, true);
                            
                            if (!state.lastWarmupDates) state.lastWarmupDates = {};
                            state.lastWarmupDates[t] = todayStr;
                            triggered = true;
                            
                            console.log(`[AG-Autopilot] Warmup triggered at ${nowHHMM} in this window.`);
                            
                            // 正式自动执行预热逻辑
                            doWarmupAction();
                            break; // 同一分钟只触发一次有效的预热
                        }
                    }
                }
                
                if (triggered) {
                    writeState(state);
                }
            } catch (err) {
                console.error('[AG-Autopilot] Warmup scheduler error:', err);
            }
        }, CHECK_INTERVAL_MS);
    }, windowOffset);
    console.log('[AG-Autopilot] Warmup scheduler started with offset:', windowOffset, 'ms');
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

    // Start warmup scheduler
    startWarmupScheduler(context);

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
