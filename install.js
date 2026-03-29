/**
 * Antigravity Auto-Accept Install Script v2.1
 * 
 * Fixed v1 CSP issue: writes script to standalone .js file, referenced via <script src>
 * 
 * Usage: node install.js          Install
 *        node install.js remove   Uninstall
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// === Auto-locate workbench directory ===
function findWorkbenchDir() {
    const home = os.homedir();
    const candidates = [
        path.join(home, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources', 'app', 'out', 'vs', 'code', 'electron-browser', 'workbench'),
        path.join(home, 'AppData', 'Local', 'Programs', 'Antigravity', 'resources', 'app', 'out', 'vs', 'code', 'electron-sandbox', 'workbench'),
        '/Applications/Antigravity.app/Contents/Resources/app/out/vs/code/electron-browser/workbench',
        '/usr/share/antigravity/resources/app/out/vs/code/electron-browser/workbench',
    ];

    for (const dir of candidates) {
        const htmlPath = path.join(dir, 'workbench.html');
        if (fs.existsSync(htmlPath)) {
            return dir;
        }
    }
    return null;
}

// === Auto-click script content (written to standalone .js file) ===
const AUTO_ACCEPT_JS = `// Antigravity Auto-Accept v2
// Auto-click Run/Accept buttons in Agent confirmation dialogs
(function() {
    'use strict';

    const CONFIG = {
        enabled: true,
        acceptKeywords: ['Run', 'Accept', 'Allow', 'Approve'],
        rejectKeywords: ['Reject', 'Cancel', 'No', 'Close', 'Deny', 'Always run'],
        logPrefix: '[AutoAccept]',
    };

    let enabled = CONFIG.enabled;

    function isAcceptButton(el) {
        if (!el || el.disabled) return false;
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (tag !== 'button' && tag !== 'a' && el.getAttribute && el.getAttribute('role') !== 'button') {
            return false;
        }
        const text = (el.innerText || el.textContent || '').trim();
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
        if (!enabled) return;
        var buttons = document.querySelectorAll(
            'button, a[role="button"], [role="button"], .monaco-button'
        );
        for (var i = 0; i < buttons.length; i++) {
            if (isAcceptButton(buttons[i])) {
                console.log(CONFIG.logPrefix, 'Clicked:', (buttons[i].innerText || '').trim());
                buttons[i].click();
                return;
            }
        }
    }

    // MutationObserver + timer dual insurance
    var debounceTimer = null;

    function startObserver() {
        var observer = new MutationObserver(function() {
            if (!enabled) return;
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(scanAndClick, 150);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        console.log(CONFIG.logPrefix, 'MutationObserver started');
    }

    // Wait for workbench to finish loading
    setTimeout(function() {
        startObserver();
        setInterval(scanAndClick, 2000);
    }, 5000);

    // Console toggle
    window.toggleAutoAccept = function() {
        enabled = !enabled;
        console.log(CONFIG.logPrefix, enabled ? 'ON' : 'OFF');
        return enabled;
    };

    console.log(CONFIG.logPrefix, 'Script loaded, will start in 5s');
})();
`;

const MARKER_START = '<!-- [AUTO-ACCEPT-V2-START] -->';
const MARKER_END = '<!-- [AUTO-ACCEPT-V2-END] -->';
const JS_FILENAME = 'auto-accept.js';
const AGENT_HTML_FILENAME = 'workbench-jetski-agent.html';

// === Install ===
function install(workbenchDir) {
    const htmlPath = path.join(workbenchDir, 'workbench.html');
    const agentHtmlPath = path.join(workbenchDir, AGENT_HTML_FILENAME);
    const jsPath = path.join(workbenchDir, JS_FILENAME);
    let content = fs.readFileSync(htmlPath, 'utf-8');

    // Remove old version
    if (content.includes(MARKER_START)) {
        const startIdx = content.indexOf(MARKER_START);
        const endIdx = content.indexOf(MARKER_END) + MARKER_END.length;
        content = content.substring(0, startIdx) + content.substring(endIdx);
    }

    // Backup
    const backupPath = htmlPath + '.backup';
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(htmlPath, backupPath);
        console.log('Backed up:', backupPath);
    }

    // 1. Write standalone JS file (same directory = self origin, CSP allowed)
    fs.writeFileSync(jsPath, AUTO_ACCEPT_JS, 'utf-8');
    console.log('Written:', jsPath);

    // 2. Insert <script src> reference before </html>
    const scriptTag = `\n${MARKER_START}\n<script src="./${JS_FILENAME}"></script>\n${MARKER_END}\n`;
    content = content.replace('</html>', scriptTag + '</html>');
    fs.writeFileSync(htmlPath, content, 'utf-8');

    // 3. Also inject into Agent Manager HTML
    if (fs.existsSync(agentHtmlPath)) {
        let agentContent = fs.readFileSync(agentHtmlPath, 'utf-8');
        if (agentContent.includes(MARKER_START)) {
            const startIdx = agentContent.indexOf(MARKER_START);
            const endIdx = agentContent.indexOf(MARKER_END) + MARKER_END.length;
            agentContent = agentContent.substring(0, startIdx) + agentContent.substring(endIdx);
        }
        const agentBackupPath = agentHtmlPath + '.backup';
        if (!fs.existsSync(agentBackupPath)) {
            fs.copyFileSync(agentHtmlPath, agentBackupPath);
            console.log('Backed up:', agentBackupPath);
        }
        agentContent = agentContent.replace('</html>', scriptTag + '</html>');
        fs.writeFileSync(agentHtmlPath, agentContent, 'utf-8');
        console.log('✅ Also injected into Agent Manager HTML');
    }

    console.log('');
    console.log('✅ Installed successfully!');
    console.log('');
    console.log('⚠️  Please close and reopen Antigravity completely');
    console.log('💡 All windows will take effect automatically');
    console.log('💡 Type toggleAutoAccept() in console to toggle on/off');
}

// === Uninstall ===
function uninstall(workbenchDir) {
    const htmlPath = path.join(workbenchDir, 'workbench.html');
    const agentHtmlPath = path.join(workbenchDir, AGENT_HTML_FILENAME);
    const jsPath = path.join(workbenchDir, JS_FILENAME);
    const backupPath = htmlPath + '.backup';
    const agentBackupPath = agentHtmlPath + '.backup';

    // --- Main workbench.html ---
    if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, htmlPath);
        console.log('✅ workbench.html restored');
    } else {
        let content = fs.readFileSync(htmlPath, 'utf-8');
        if (content.includes(MARKER_START)) {
            const startIdx = content.indexOf(MARKER_START);
            const endIdx = content.indexOf(MARKER_END) + MARKER_END.length;
            content = content.substring(0, startIdx) + content.substring(endIdx);
            fs.writeFileSync(htmlPath, content, 'utf-8');
            console.log('✅ Injected tags removed from workbench.html');
        }
    }

    // --- Agent Manager HTML ---
    if (fs.existsSync(agentBackupPath)) {
        fs.copyFileSync(agentBackupPath, agentHtmlPath);
        console.log('✅ Agent Manager HTML restored');
    } else if (fs.existsSync(agentHtmlPath)) {
        let agentContent = fs.readFileSync(agentHtmlPath, 'utf-8');
        if (agentContent.includes(MARKER_START)) {
            const startIdx = agentContent.indexOf(MARKER_START);
            const endIdx = agentContent.indexOf(MARKER_END) + MARKER_END.length;
            agentContent = agentContent.substring(0, startIdx) + agentContent.substring(endIdx);
            fs.writeFileSync(agentHtmlPath, agentContent, 'utf-8');
            console.log('✅ Injected tags removed from Agent Manager HTML');
        }
    }

    if (fs.existsSync(jsPath)) {
        fs.unlinkSync(jsPath);
        console.log('✅ auto-accept.js deleted');
    }

    console.log('⚠️  Please close and reopen Antigravity completely');
}

// === Main ===
function main() {
    const action = process.argv[2];
    const workbenchDir = findWorkbenchDir();

    if (!workbenchDir) {
        console.error('❌ Antigravity installation directory not found!');
        process.exit(1);
    }

    console.log('Directory:', workbenchDir);

    if (action === 'remove' || action === 'uninstall') {
        uninstall(workbenchDir);
    } else {
        install(workbenchDir);
    }
}

main();
