"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__importDefault) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables from .env file
require('dotenv').config();
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const active_win_1 = __importDefault(require("active-win"));
const http_1 = __importDefault(require("http"));

// --- Global shortcut for DevTools ---
const { globalShortcut } = require('electron');
// --- Storage (SQLite with JSON fallback) ---
const userDataPath = electron_1.app.getPath('userData');
const dbPath = path_1.default.join(userDataPath, 'deskflow-data.db');
const jsonPath = path_1.default.join(userDataPath, 'deskflow-data.json');
const sleepStatePath = path_1.default.join(userDataPath, 'deskflow-sleep-state.json');
// --- Sleep tracking state (for morning prompt) ---
let lastCloseTime: number | null = null;
let lastCloseType: 'normal' | 'force' | null = null;

function loadSleepState() {
    try {
        if (fs_1.default.existsSync(sleepStatePath)) {
            const data = JSON.parse(fs_1.default.readFileSync(sleepStatePath, 'utf-8'));
            lastCloseTime = data.lastCloseTime || null;
            lastCloseType = data.lastCloseType || null;
        }
    } catch (err) { console.error('[DeskFlow] Failed to load sleep state:', err); }
}

function saveSleepState() {
    try {
        fs_1.default.writeFileSync(sleepStatePath, JSON.stringify({
            lastCloseTime: lastCloseTime,
            lastCloseType: lastCloseType
        }, null, 2));
    } catch (err) { console.error('[DeskFlow] Failed to save sleep state:', err); }
}

function checkMorningPrompt() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Morning window: 5:00 AM - 10:00 AM (300-600 minutes)
    const isMorning = currentMinutes >= 300 && currentMinutes <= 600;
    
    // If no close time recorded, skip
    if (!lastCloseTime) {
        console.log('[DeskFlow] No last close time, skipping morning prompt');
        return;
    }
    
    const timeSinceClose = now.getTime() - lastCloseTime;
    const hoursSinceClose = timeSinceClose / (1000 * 60 * 60);
    
    // Check conditions:
    // 1. App was closed for at least 4 hours
    // 2. Current time is in morning window (5am-10am)
    // 3. Last close was in sleep window (10pm-3am)
    const lastCloseHour = new Date(lastCloseTime).getHours();
    const wasSleepTime = lastCloseHour >= 22 || lastCloseHour <= 3;
    
    if (isMorning && hoursSinceClose >= 4 && wasSleepTime) {
        console.log('[DeskFlow] 🌤️ Morning prompt conditions met:', {
            hoursSinceClose: hoursSinceClose.toFixed(1),
            lastCloseHour,
            currentHour
        });
        // Set flag to show morning prompt - will be checked by renderer
        // Store in a file that the renderer can read
        try {
            fs_1.default.writeFileSync(
                path_1.default.join(userDataPath, 'show-morning-prompt.json'),
                JSON.stringify({ show: true, lastCloseTime, lastCloseType }, null, 2)
            );
        } catch (err) { console.error('[DeskFlow] Failed to write morning prompt flag:', err); }
    }
    
    // Reset close time after checking
    lastCloseTime = null;
    lastCloseType = null;
    saveSleepState();
}
// --- Category Configuration ---
const categoryConfigPath = path_1.default.join(userDataPath, 'deskflow-categories.json');
const DEFAULT_CATEGORIES = [
    'IDE', 'AI Tools', 'Browser', 'Entertainment', 'Communication',
    'Design', 'Productivity', 'Tools', 'Education', 'Developer Tools',
    'Search Engine', 'News', 'Shopping', 'Social Media', 'Uncategorized', 'Other'
];
const DEFAULT_TIER_ASSIGNMENTS = {
    productive: ['IDE', 'AI Tools', 'Developer Tools', 'Education', 'Productivity', 'Tools'],
    neutral: ['Communication', 'Design', 'Search Engine', 'News', 'Uncategorized', 'Other'],
    distracting: ['Entertainment', 'Social Media', 'Shopping']
};
const DEFAULT_APP_CATEGORIES = {
    // IDEs
    'code': 'IDE', 'pycharm': 'IDE', 'intellij': 'IDE', 'visual studio': 'IDE', 'obsidian': 'IDE',
    'vs code': 'IDE', 'vscode': 'IDE', 'webstorm': 'IDE', 'phpstorm': 'IDE', 'rubymine': 'IDE',
    'goland': 'IDE', 'clion': 'IDE', 'rider': 'IDE', 'datagrip': 'IDE', 'appcode': 'IDE',
    'sublime': 'IDE', 'atom': 'IDE', 'vim': 'IDE', 'neovim': 'IDE', 'emacs': 'IDE',
    'notepad++': 'IDE', 'textmate': 'IDE', 'bbedit': 'IDE', 'brackets': 'IDE',
    'android studio': 'IDE', 'xcode': 'IDE', 'flutter': 'IDE', 'dart': 'IDE',
    // Browsers
    'chrome': 'Browser', 'firefox': 'Browser', 'safari': 'Browser', 'edge': 'Browser',
    'brave': 'Browser', 'opera': 'Browser', 'vivaldi': 'Browser', 'arc': 'Browser',
    'comet': 'Browser', 'google chrome': 'Browser', 'microsoft edge': 'Browser',
    // AI Tools
    'claude': 'AI Tools', 'chatgpt': 'AI Tools', 'gpt': 'AI Tools', 'copilot': 'AI Tools',
    'perplexity': 'AI Tools', 'gemini': 'AI Tools', 'bard': 'AI Tools', 'mistral': 'AI Tools',
    'anthropic': 'AI Tools', 'openai': 'AI Tools', 'cursor': 'AI Tools',
    // Entertainment
    'youtube': 'Entertainment', 'netflix': 'Entertainment', 'spotify': 'Entertainment',
    'twitch': 'Entertainment', 'hulu': 'Entertainment', 'disney': 'Entertainment',
    'prime video': 'Entertainment', 'apple tv': 'Entertainment', 'hbo': 'Entertainment',
    'vimeo': 'Entertainment', 'soundcloud': 'Entertainment', 'vlc': 'Entertainment',
    // Communication
    'slack': 'Communication', 'discord': 'Communication', 'teams': 'Communication',
    'zoom': 'Communication', 'skype': 'Communication', 'telegram': 'Communication',
    'whatsapp': 'Communication', 'signal': 'Communication', 'messenger': 'Communication',
    'mail': 'Communication', 'outlook': 'Communication', 'thunderbird': 'Communication',
    // Design
    'figma': 'Design', 'photoshop': 'Design', 'illustrator': 'Design',
    'sketch': 'Design', 'adobe xd': 'Design', 'indesign': 'Design', 'affinity': 'Design',
    'canva': 'Design', 'dribbble': 'Design', 'behance': 'Design',
    'invision': 'Design', 'zeplin': 'Design', 'miro': 'Design',
    // Productivity
    'terminal': 'Productivity', 'powershell': 'Productivity', 'cmd': 'Productivity',
    'explorer': 'Productivity', 'file explorer': 'Productivity', 'finder': 'Productivity',
    'notion': 'Productivity', 'evernote': 'Productivity', 'bear': 'Productivity',
    'apple notes': 'Productivity', 'todoist': 'Productivity', 'asana': 'Productivity',
    'trello': 'Productivity', 'linear': 'Productivity',
    'logseq': 'Productivity', 'craft': 'Productivity',
    // Developer Tools
    'git': 'Developer Tools', 'github': 'Developer Tools', 'gitlab': 'Developer Tools',
    'bitbucket': 'Developer Tools', 'docker': 'Developer Tools', 'kubernetes': 'Developer Tools',
    'postman': 'Developer Tools', 'insomnia': 'Developer Tools', 'dbeaver': 'Developer Tools',
    'tableplus': 'Developer Tools', 'sequel pro': 'Developer Tools', 'mysql': 'Developer Tools',
    'mongodb': 'Developer Tools', 'redis': 'Developer Tools', 'nginx': 'Developer Tools',
    'apache': 'Developer Tools', 'xampp': 'Developer Tools', 'wamp': 'Developer Tools',
    // Tools
    'wispr': 'Tools', '1password': 'Tools', 'lastpass': 'Tools', 'bitwarden': 'Tools',
    'keepass': 'Tools', 'dropbox': 'Tools', 'google drive': 'Tools', 'onedrive': 'Tools',
    'icloud': 'Tools', 'box': 'Tools', 'syncthing': 'Tools',
    // Windows Apps
    'windows shell': 'Other', 'shell experience': 'Other', 
    'credential manager': 'Tools', 'cloudflare warp': 'Tools',
    'searchhost': 'Productivity', 'snipping': 'Productivity',
    'lenovo': 'Tools', 'vantage': 'Tools',
    'foxit': 'Productivity', 'pdf reader': 'Productivity',
    'terminal host': 'Productivity',
    'krsdk': 'Other',
    // System
    'windows': 'Other', 'macos': 'Other', 'linux': 'Other', 'ubuntu': 'Other',
    'system settings': 'Other', 'control panel': 'Other', 'task manager': 'Other',
    'activity monitor': 'Other', 'device manager': 'Other', 'disk utility': 'Other',
    // News & Reading
    'reddit': 'News', 'medium': 'News', 'substack': 'News', 'news': 'News',
    // Shopping
    'amazon': 'Shopping', 'ebay': 'Shopping', 'etsy': 'Shopping', 'shopify': 'Shopping',
    'walmart': 'Shopping', 'aliexpress': 'Shopping', 'target': 'Shopping',
    // Social Media
    'twitter': 'Social Media', 'x': 'Social Media', 'facebook': 'Social Media',
    'instagram': 'Social Media', 'linkedin': 'Social Media', 'tiktok': 'Social Media',
    'snapchat': 'Social Media', 'pinterest': 'Social Media', 'threads': 'Social Media',
    // Search
    'google': 'Search Engine', 'bing': 'Search Engine', 'duckduckgo': 'Search Engine',
    'yahoo': 'Search Engine', 'yandex': 'Search Engine', 'ecosia': 'Search Engine',
};
const DEFAULT_DOMAIN_CATEGORIES = {
    'youtube.com': 'Entertainment',
    'github.com': 'Developer Tools', 'gitlab.com': 'Developer Tools', 'stackoverflow.com': 'Developer Tools',
    'npmjs.com': 'Developer Tools', 'pypi.org': 'Developer Tools', 'dev.to': 'Developer Tools',
    'mdn.io': 'Developer Tools', 'w3schools.com': 'Developer Tools', 'codepen.io': 'Developer Tools',
    'chatgpt.com': 'AI Tools', 'claude.ai': 'AI Tools', 'bard.google.com': 'AI Tools',
    'perplexity.ai': 'AI Tools', 'copilot.microsoft.com': 'AI Tools', 'gemini.google.com': 'AI Tools',
    'twitter.com': 'Social Media', 'x.com': 'Social Media', 'facebook.com': 'Social Media',
    'instagram.com': 'Social Media', 'linkedin.com': 'Social Media', 'reddit.com': 'Social Media',
    'tiktok.com': 'Social Media', 'snapchat.com': 'Social Media',
    'netflix.com': 'Entertainment', 'twitch.tv': 'Entertainment', 'disney.com': 'Entertainment',
    'hulu.com': 'Entertainment', 'vimeo.com': 'Entertainment', 'soundcloud.com': 'Entertainment',
    'bbc.com': 'News', 'cnn.com': 'News', 'reuters.com': 'News', 'bloomberg.com': 'News',
    'medium.com': 'News', 'substack.com': 'News', 'theverge.com': 'News', 'arstechnica.com': 'News',
    'amazon.com': 'Shopping', 'ebay.com': 'Shopping', 'etsy.com': 'Shopping',
    'shopify.com': 'Shopping', 'walmart.com': 'Shopping', 'aliexpress.com': 'Shopping',
    'docs.google.com': 'Productivity', 'drive.google.com': 'Productivity', 'notion.so': 'Productivity',
    'trello.com': 'Productivity', 'asana.com': 'Productivity', 'calendar.google.com': 'Productivity',
    'figma.com': 'Design', 'canva.com': 'Design', 'dribbble.com': 'Design',
    'behance.net': 'Design', 'unsplash.com': 'Design',
    'google.com': 'Search Engine', 'bing.com': 'Search Engine', 'duckduckgo.com': 'Search Engine',
    'yahoo.com': 'Search Engine'
};

// ============================================
// AI AGENT PLUGIN SYSTEM
// Generalized tracking for AI coding assistants
// ============================================

interface ParsedSession {
    sessionId: string;
    timestamp: Date;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
    reasoningTokens?: number;
    model?: string;
    provider?: string;
    durationMs?: number;
    projectPath?: string;
    messageCount?: number;
}

interface AIAgentPlugin {
    id: string;
    name: string;
    color: string;
    detect(): Promise<boolean>;
    getStoragePaths(): string[];
    parse(filePath: string): Promise<ParsedSession[]>;
    parseDir(dirPath: string): Promise<ParsedSession[]>;
    extractTokensFromRow?: (row: any) => { inputTokens: number; outputTokens: number; cacheReadTokens?: number; cacheWriteTokens?: number };
    parseSQLite?: (dbPath: string) => Promise<ParsedSession[]>;
    parseJson?: (filePath: string) => Promise<ParsedSession[]>;
}

const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
    'claude-opus-4': { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
    'claude-sonnet-4-5': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    'claude-sonnet-4': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
    'claude-haiku-3-5': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
    'claude-haiku-3': { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },
    'gpt-5': { input: 5, output: 15, cacheRead: 0.125, cacheWrite: 0.55 },
    'gpt-4o': { input: 2.5, output: 10, cacheRead: 0.525, cacheWrite: 10.5 },
    'o3': { input: 10, output: 40, cacheRead: 0, cacheWrite: 0 },
    'gemini-2-5-pro': { input: 1.25, output: 5, cacheRead: 0.16, cacheWrite: 5 },
    'gemini-2-5-flash': { input: 0.075, output: 0.3, cacheRead: 0.01, cacheWrite: 0.15 },
    'default': { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2 },
};

function getModelPricing(model?: string): { input: number; output: number; cacheRead: number; cacheWrite: number } {
    if (!model) return MODEL_PRICING['default'];
    const key = Object.keys(MODEL_PRICING).find(k => model.toLowerCase().includes(k.toLowerCase()));
    return MODEL_PRICING[key || 'default'];
}

function calculateCost(session: ParsedSession): number {
    const pricing = getModelPricing(session.model);
    let cost = 0;
    cost += (session.inputTokens / 1_000_000) * pricing.input;
    cost += (session.outputTokens / 1_000_000) * pricing.output;
    if (session.cacheReadTokens) cost += (session.cacheReadTokens / 1_000_000) * pricing.cacheRead;
    if (session.cacheWriteTokens) cost += (session.cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
    return Math.round(cost * 10000) / 10000;
}

// Claude Code Plugin
const ClaudeCodePlugin: AIAgentPlugin = {
    id: 'claude-code',
    name: 'Claude Code',
    color: '#f97316',

    async detect(): Promise<boolean> {
        const homedir = require('os').homedir();
        const projectsPath = path_1.default.join(homedir, '.claude', 'projects');
        return fs_1.default.existsSync(projectsPath);
    },

    getStoragePaths(): string[] {
        const homedir = require('os').homedir();
        return [path_1.default.join(homedir, '.claude', 'projects')];
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(Boolean);

            let totalInput = 0;
            let totalOutput = 0;
            let totalCacheRead = 0;
            let totalCacheWrite = 0;
            let lastModel = '';
            let sessionId = '';
            let timestamp: Date | null = null;
            let messageCount = 0;
            let projectPath: string | undefined;

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);

                    if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
                    if (!timestamp && entry.timestamp) timestamp = new Date(entry.timestamp);
                    if (!timestamp && entry.uuid) timestamp = new Date();
                    if (!projectPath && entry.cwd) projectPath = entry.cwd;

                    const entryType = entry.type;
                    // Count actual message exchanges
                    if (entryType === 'user' || entryType === 'assistant') {
                        messageCount++;
                    }

                    let inputTokens = 0;
                    let outputTokens = 0;
                    let cacheRead = 0;
                    let cacheWrite = 0;
                    let model = '';

                    if (entryType === 'assistant') {
                        const message = entry.message || entry;
                        const usage = message?.usage || message?.tokenUsage;
                        if (usage) {
                            inputTokens = usage.input_tokens || usage.inputTokens || 0;
                            outputTokens = usage.output_tokens || usage.outputTokens || 0;
                            cacheRead = usage.cache_read_input_tokens || usage.cacheReadTokens || 0;
                            cacheWrite = usage.cache_creation_input_tokens || usage.cacheWriteTokens || 0;
                        }
                        if (message?.model) model = message.model;
                    } else {
                        const usage = entry.usage || entry.tokenUsage || entry.tokens;
                        inputTokens = usage?.input_tokens || usage?.input || entry.input_tokens || entry.prompt_tokens || 0;
                        outputTokens = usage?.output_tokens || usage?.output || entry.output_tokens || entry.completion_tokens || 0;
                        cacheRead = usage?.cache_read_input_tokens || entry.cache_read_input_tokens || 0;
                        cacheWrite = usage?.cache_creation_input_tokens || entry.cache_creation_input_tokens || 0;
                        model = entry.model || entry.model_version || '';
                    }

                    if (inputTokens > 0 || outputTokens > 0) {
                        totalInput += inputTokens;
                        totalOutput += outputTokens;
                        totalCacheRead += cacheRead;
                        totalCacheWrite += cacheWrite;
                        if (model && !lastModel) lastModel = model;
                    }
                } catch {}
            }

            if (totalInput > 0 || totalOutput > 0 || messageCount > 0) {
                // If no cwd found in entries, derive from file path
                if (!projectPath) {
                    const homedir = require('os').homedir();
                    const projectsPrefix = path_1.default.join(homedir, '.claude', 'projects') + path_1.default.sep;
                    if (filePath.startsWith(projectsPrefix)) {
                        const relativePath = filePath.substring(projectsPrefix.length);
                        const projectDir = relativePath.split(path_1.default.sep)[0];
                        projectPath = projectDir;
                    }
                }

                sessions.push({
                    sessionId: sessionId || path_1.default.basename(filePath, '.jsonl'),
                    timestamp: timestamp || new Date(),
                    inputTokens: totalInput,
                    outputTokens: totalOutput,
                    cacheReadTokens: totalCacheRead || undefined,
                    cacheWriteTokens: totalCacheWrite || undefined,
                    model: lastModel || undefined,
                    provider: 'anthropic',
                    projectPath,
                    messageCount: messageCount > 0 ? Math.floor(messageCount / 2) : undefined, // user+assistant pairs
                });
            }
        } catch {}
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        const collectJsonlFiles = (currentDir: string): string[] => {
            const files: string[] = [];
            try {
                const entries = fs_1.default.readdirSync(currentDir);
                for (const entry of entries) {
                    const fullPath = path_1.default.join(currentDir, entry);
                    const stat = fs_1.default.statSync(fullPath);
                    if (stat.isDirectory()) {
                        files.push(...collectJsonlFiles(fullPath));
                    } else if (entry.endsWith('.jsonl')) {
                        files.push(fullPath);
                    }
                }
            } catch {}
            return files;
        };
        try {
            const allFiles = collectJsonlFiles(dirPath);
            for (let i = 0; i < allFiles.length; i++) {
                const sessionsFromFile = await this.parse(allFiles[i]);
                sessions.push(...sessionsFromFile);
                // Yield every 10 files to prevent UI freeze
                if (i % 10 === 0) {
                    await new Promise<void>(resolve => setImmediate(resolve));
                }
            }
        } catch {}
        return sessions;
    }
};

// OpenCode Plugin
const OpenCodePlugin: AIAgentPlugin = {
    id: 'opencode',
    name: 'OpenCode',
    color: '#3b82f6',

    async detect(): Promise<boolean> {
        const homedir = require('os').homedir();
        const dbPath = path_1.default.join(homedir, '.local', 'share', 'opencode', 'opencode.db');
        return fs_1.default.existsSync(dbPath);
    },

    getStoragePaths(): string[] {
        const homedir = require('os').homedir();
        return [
            path_1.default.join(homedir, '.local', 'share', 'opencode'),
            path_1.default.join(homedir, '.local', 'share', 'opencode', 'storage', 'session_diff'),
        ];
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        if (filePath.endsWith('.db')) {
            return this.parseSQLite ? this.parseSQLite(filePath) : Promise.resolve([]);
        }
        return Promise.resolve([]);
    },

    async parseSQLite(dbPath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            const Database = require('better-sqlite3');
            const db = new Database(dbPath, { readonly: true });

            const sessionRows = db.prepare("SELECT id, directory, title, time_created, time_updated FROM session").all() as any[];
            const messageRows = db.prepare("SELECT session_id, data FROM message").all() as any[];

            const sessionMap = new Map<string, { directory?: string; title?: string; time_created?: number }>();
            for (const s of sessionRows) {
                sessionMap.set(s.id, { directory: s.directory, title: s.title, time_created: s.time_created });
            }

            const grouped = new Map<string, { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; reasoningTokens: number; model?: string; provider?: string; cost: number; count: number }>();

            for (const msg of messageRows) {
                try {
                    const data = typeof msg.data === 'string' ? JSON.parse(msg.data) : msg.data;
                    if (!data || !data.tokens) continue;

                    const tokens = data.tokens;
                    if (!tokens.input && !tokens.output) continue;

                    const sid = msg.session_id;
                    if (!grouped.has(sid)) {
                        grouped.set(sid, { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, reasoningTokens: 0, model: data.modelID, provider: data.providerID, cost: 0, count: 0 });
                    }
                    const g = grouped.get(sid)!;
                    g.inputTokens += tokens.input || 0;
                    g.outputTokens += tokens.output || 0;
                    g.cacheReadTokens += tokens.cache?.read || 0;
                    g.cacheWriteTokens += tokens.cache?.write || 0;
                    g.reasoningTokens += tokens.reasoning || 0;
                    if (!g.model && data.modelID) g.model = data.modelID;
                    if (!g.provider && data.providerID) g.provider = data.providerID;
                    g.cost += data.cost || 0;
                    g.count++;
                } catch {}
            }

            for (const [sid, g] of grouped) {
                if (g.inputTokens === 0 && g.outputTokens === 0) continue;
                const sessionInfo = sessionMap.get(sid);
                sessions.push({
                    sessionId: sid,
                    timestamp: sessionInfo?.time_created ? new Date(sessionInfo.time_created) : new Date(),
                    inputTokens: g.inputTokens,
                    outputTokens: g.outputTokens,
                    cacheReadTokens: g.cacheReadTokens || undefined,
                    cacheWriteTokens: g.cacheWriteTokens || undefined,
                    reasoningTokens: g.reasoningTokens || undefined,
                    model: g.model,
                    provider: g.provider,
                    durationMs: undefined,
                    projectPath: sessionInfo?.directory,
                    messageCount: g.count > 0 ? g.count : undefined,
                });
            }

            db.close();
        } catch {}
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            const dbPath = path_1.default.join(dirPath, 'opencode.db');
            if (fs_1.default.existsSync(dbPath)) {
                const fromDb = await this.parse(dbPath);
                sessions.push(...fromDb);
            }
        } catch {}
        return sessions;
    }
};

// Gemini CLI Plugin
const GeminiPlugin: AIAgentPlugin = {
    id: 'gemini',
    name: 'Gemini CLI',
    color: '#22c55e',

    async detect(): Promise<boolean> {
        const homedir = require('os').homedir();
        // Check both possible locations: tmp/ and history/
        const tmpPath = path_1.default.join(homedir, '.gemini', 'tmp');
        const historyPath = path_1.default.join(homedir, '.gemini', 'history');
        return fs_1.default.existsSync(tmpPath) || fs_1.default.existsSync(historyPath);
    },

    getStoragePaths(): string[] {
        const homedir = require('os').homedir();
        return [
            path_1.default.join(homedir, '.gemini', 'tmp'),
            path_1.default.join(homedir, '.gemini', 'history'),
        ];
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            const content = fs_1.default.readFileSync(filePath, 'utf8');

            if (filePath.endsWith('.jsonl')) {
                const lines = content.split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        const usage = entry.usage || entry.tokens || entry.tokenUsage;
                        if (usage || entry.inputTokens || entry.outputTokens) {
                            sessions.push({
                                sessionId: entry.id || entry.sessionId || String(Date.now()),
                                timestamp: new Date(entry.createdAt || entry.timestamp || Date.now()),
                                inputTokens: entry.inputTokens || entry.input_token_count || usage?.inputTokens || usage?.input_tokens || 0,
                                outputTokens: entry.outputTokens || entry.output_token_count || usage?.outputTokens || usage?.output_tokens || 0,
                                model: entry.model || entry.modelName || 'gemini',
                                provider: 'google',
                            });
                        }
                    } catch {}
                }
            } else if (filePath.endsWith('.json')) {
                // Handle JSON files (session files)
                try {
                    const data = JSON.parse(content);
                    if (data.messages && Array.isArray(data.messages)) {
                        for (const msg of data.messages) {
                            const usage = msg.usage || msg.tokens;
                            if (usage && (usage.inputTokens || usage.outputTokens)) {
                                sessions.push({
                                    sessionId: data.id || String(Date.now()),
                                    timestamp: new Date(data.createdAt || Date.now()),
                                    inputTokens: usage.inputTokens || 0,
                                    outputTokens: usage.outputTokens || 0,
                                    model: data.model || 'gemini',
                                    provider: 'google',
                                });
                            }
                        }
                    }
                } catch {}
            }
        } catch {}
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!fs_1.default.existsSync(dirPath)) return sessions;
            
            // For .gemini/tmp/<project_hash>/chats/ structure
            const subdirs = fs_1.default.readdirSync(dirPath);
            for (const subdir of subdirs) {
                const subdirPath = path_1.default.join(dirPath, subdir);
                if (!fs_1.default.statSync(subdirPath).isDirectory()) continue;
                
                // Check for chats subdirectory
                const chatsPath = path_1.default.join(subdirPath, 'chats');
                if (fs_1.default.existsSync(chatsPath)) {
                    const files = fs_1.default.readdirSync(chatsPath);
                    for (const file of files) {
                        if (file.endsWith('.json') || file.endsWith('.jsonl')) {
                            const fromFile = await this.parse(path_1.default.join(chatsPath, file));
                            sessions.push(...fromFile);
                        }
                    }
                }
            }
        } catch {}
        return sessions;
    }
};

// Codex CLI Plugin
const CodexPlugin: AIAgentPlugin = {
    id: 'codex',
    name: 'Codex CLI',
    color: '#10b981',

    async detect(): Promise<boolean> {
        const homedir = require('os').homedir();
        // Check multiple possible locations
        const paths = [
            path_1.default.join(homedir, '.codex'),
            path_1.default.join(homedir, '.codex', 'sessions'),
            path_1.default.join(homedir, '.codex', 'storage'),
        ];
        return paths.some(p => fs_1.default.existsSync(p));
    },

    getStoragePaths(): string[] {
        const homedir = require('os').homedir();
        return [
            path_1.default.join(homedir, '.codex'),
            path_1.default.join(homedir, '.codex', 'sessions'),
            path_1.default.join(homedir, '.codex', 'storage'),
        ];
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!filePath.endsWith('.jsonl') && !filePath.endsWith('.json')) return sessions;

            const content = fs_1.default.readFileSync(filePath, 'utf8');

            if (filePath.endsWith('.jsonl')) {
                const lines = content.split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        const usage = entry.usage || entry.tokens || entry.tokenUsage;
                        if (usage || entry.inputTokens || entry.outputTokens) {
                            sessions.push({
                                sessionId: entry.id || entry.session_id || String(Date.now()),
                                timestamp: new Date(entry.timestamp || entry.created_at || Date.now()),
                                inputTokens: entry.input_tokens || entry.inputTokens || usage?.input || 0,
                                outputTokens: entry.output_tokens || entry.outputTokens || usage?.output || 0,
                                cacheReadTokens: entry.cached_tokens || entry.cache_read_tokens,
                                model: entry.model || entry.model_name || 'codex',
                                provider: 'openai',
                            });
                        }
                    } catch {}
                }
            } else {
                // Handle JSON session files
                try {
                    const data = JSON.parse(content);
                    const usage = data.usage || data.tokens;
                    if (usage && (usage.input || usage.output || data.input_tokens || data.output_tokens)) {
                        sessions.push({
                            sessionId: data.id || String(Date.now()),
                            timestamp: new Date(data.timestamp || data.created_at || Date.now()),
                            inputTokens: data.input_tokens || usage?.input || 0,
                            outputTokens: data.output_tokens || usage?.output || 0,
                            model: data.model || 'codex',
                            provider: 'openai',
                        });
                    }
                } catch {}
            }
        } catch {}
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!fs_1.default.existsSync(dirPath)) return sessions;
            
            const walkDir = async (dir: string) => {
                const items = fs_1.default.readdirSync(dir);
                for (const item of items) {
                    const fullPath = path_1.default.join(dir, item);
                    try {
                        const stat = fs_1.default.statSync(fullPath);
                        if (stat.isDirectory()) {
                            await walkDir(fullPath);
                        } else if (item.endsWith('.jsonl') || item.endsWith('.json')) {
                            const parsed = await this.parse(fullPath);
                            sessions.push(...parsed);
                        }
                    } catch {}
                }
            };

            await walkDir(dirPath);
        } catch {}
        return sessions;
    }
};

// Qwen CLI Plugin
const QwenPlugin: AIAgentPlugin = {
    id: 'qwen',
    name: 'Qwen CLI',
    color: '#f59e0b',

    async detect(): Promise<boolean> {
        const homedir = require('os').homedir();
        const projectsPath = path_1.default.join(homedir, '.qwen', 'projects');
        return fs_1.default.existsSync(projectsPath);
    },

    getStoragePaths(): string[] {
        const homedir = require('os').homedir();
        return [path_1.default.join(homedir, '.qwen', 'projects')];
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!filePath.endsWith('.jsonl')) return sessions;
            const content = fs_1.default.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(Boolean);
            let sessionId = '';
            let sessionTimestamp: Date | null = null;
            let totalInputTokens = 0;
            let totalOutputTokens = 0;
            let totalCachedTokens = 0;
            let totalThoughtsTokens = 0;
            let model: string | undefined;
            let projectPath: string | undefined;
            let messageCount = 0;

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
                    if (!sessionTimestamp && entry.timestamp) sessionTimestamp = new Date(entry.timestamp);
                    if (!projectPath && entry.cwd) projectPath = entry.cwd;
                    if (!model && entry.model) model = entry.model;

                    // Count actual messages (user + assistant exchanges)
                    if (entry.type === 'user' || entry.type === 'assistant') {
                        messageCount++;
                    }

                    if (entry.type === 'system' && entry.subtype === 'ui_telemetry') {
                        const uiEvent = entry.systemPayload?.uiEvent;
                        if (uiEvent) {
                            totalInputTokens += uiEvent.input_token_count || 0;
                            totalOutputTokens += uiEvent.output_token_count || 0;
                            totalCachedTokens += uiEvent.cached_content_token_count || 0;
                            totalThoughtsTokens += uiEvent.thoughts_token_count || 0;
                            if (!model && uiEvent.model) model = uiEvent.model;
                        }
                    } else if (entry.type === 'assistant' && entry.usageMetadata) {
                        const usage = entry.usageMetadata;
                        totalInputTokens += usage.promptTokenCount || 0;
                        totalOutputTokens += usage.candidatesTokenCount || 0;
                        totalCachedTokens += usage.cachedContentTokenCount || 0;
                        totalThoughtsTokens += usage.thoughtsTokenCount || 0;
                    }
                } catch {}
            }

            if (totalInputTokens > 0 || totalOutputTokens > 0 || messageCount > 0) {
                sessions.push({
                    sessionId: sessionId || String(Date.now()),
                    timestamp: sessionTimestamp || new Date(),
                    inputTokens: totalInputTokens,
                    outputTokens: totalOutputTokens,
                    cacheReadTokens: totalCachedTokens || undefined,
                    reasoningTokens: totalThoughtsTokens || undefined,
                    model,
                    provider: 'alibaba',
                    projectPath,
                    messageCount: messageCount > 0 ? Math.floor(messageCount / 2) : undefined,
                });
            }
        } catch {}
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!fs_1.default.existsSync(dirPath)) return sessions;
            const projectDirs = fs_1.default.readdirSync(dirPath);
            let fileCount = 0;
            for (const projectDir of projectDirs) {
                const projectPath = path_1.default.join(dirPath, projectDir);
                if (!fs_1.default.statSync(projectPath).isDirectory()) continue;
                const chatsPath = path_1.default.join(projectPath, 'chats');
                if (!fs_1.default.existsSync(chatsPath)) continue;
                const files = fs_1.default.readdirSync(chatsPath);
                for (const file of files) {
                    if (file.endsWith('.jsonl')) {
                        const fromFile = await this.parse(path_1.default.join(chatsPath, file));
                        sessions.push(...fromFile);
                        fileCount++;
                        // Yield every 10 files to prevent UI freeze
                        if (fileCount % 10 === 0) {
                            await new Promise<void>(resolve => setImmediate(resolve));
                        }
                    }
                }
            }
        } catch {}
        return sessions;
    }
};

// Aider Plugin
const AiderPlugin: AIAgentPlugin = {
    id: 'aider',
    name: 'Aider',
    color: '#ec4899',

    async detect(): Promise<boolean> {
        const homedir = require('os').homedir();
        const analyticsPath = path_1.default.join(homedir, '.oobo', 'aider-analytics.jsonl');
        return fs_1.default.existsSync(analyticsPath);
    },

    getStoragePaths(): string[] {
        const homedir = require('os').homedir();
        return [
            path_1.default.join(homedir, '.oobo', 'aider-analytics.jsonl'),
        ];
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!fs_1.default.existsSync(filePath)) return sessions;

            const content = fs_1.default.readFileSync(filePath, 'utf8');
            const lines = content.split('\n').filter(Boolean);

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    if (entry.event === 'message_send' || entry.event === 'api_call') {
                        sessions.push({
                            sessionId: entry.session_id || String(Date.now()),
                            timestamp: new Date(entry.timestamp || Date.now()),
                            inputTokens: entry.prompt_tokens || entry.input_tokens || 0,
                            outputTokens: entry.completion_tokens || entry.output_tokens || 0,
                            model: entry.model,
                            provider: entry.provider || 'openai',
                        });
                    }
                } catch {}
            }
        } catch {}
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        return this.parse(dirPath);
    }
};

// Cursor AI Plugin (VS Code extension-based)
const CursorPlugin: AIAgentPlugin = {
    id: 'cursor',
    name: 'Cursor AI',
    color: '#a855f7',

    async detect(): Promise<boolean> {
        let cursorStatePath: string;

        if (process.platform === 'win32') {
            cursorStatePath = path_1.default.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
        } else {
            const homedir = require('os').homedir();
            cursorStatePath = path_1.default.join(homedir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
        }

        return fs_1.default.existsSync(cursorStatePath);
    },

    getStoragePaths(): string[] {
        if (process.platform === 'win32') {
            return [path_1.default.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'state.vscdb')];
        } else {
            const homedir = require('os').homedir();
            return [path_1.default.join(homedir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb')];
        }
    },

    async parse(filePath: string): Promise<ParsedSession[]> {
        const sessions: ParsedSession[] = [];
        try {
            if (!filePath.endsWith('.vscdb')) return sessions;

            const Database = require('better-sqlite3');
            const cursorDb = new Database(filePath, { readonly: true });

            // Check if cursorDiskKV table exists (newer format)
            const tableCheck = cursorDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cursorDiskKV'").all();
            
            if (tableCheck.length > 0) {
                // New format: cursorDiskKV table
                // Keys like: 'bubbleId:xxx', 'composerData:xxx', 'agentKv:xxx'
                const bubbleData = cursorDb.prepare("SELECT key, value FROM cursorDiskKV WHERE key LIKE 'bubbleId:%'").all() as any[];
                console.log(`[Cursor] Found ${bubbleData.length} bubble entries`);

                for (const row of bubbleData) {
                    try {
                        const data = JSON.parse(row.value);
                        // Token count is in data.tokenCount
                        const tokenCount = data.tokenCount || data.usage;
                        if (tokenCount) {
                            const inputTokens = tokenCount.inputTokens || tokenCount.input_tokens || 0;
                            const outputTokens = tokenCount.outputTokens || tokenCount.output_tokens || 0;

                            if (inputTokens > 0 || outputTokens > 0) {
                                sessions.push({
                                    sessionId: row.key,
                                    timestamp: new Date(data.createdAt || Date.now()),
                                    inputTokens,
                                    outputTokens,
                                    model: data.modelInfo?.modelName || data.model || 'claude-sonnet',
                                    provider: 'anthropic',
                                });
                                console.log(`[Cursor] Found session: ${inputTokens} in / ${outputTokens} out`);
                            }
                        }
                    } catch {}
                }
            } else {
                // Fallback: Check ItemTable (older format)
                const aiData = cursorDb.prepare("SELECT key, value FROM ItemTable WHERE key LIKE 'aiService.%'").all() as any[];

                for (const row of aiData) {
                    try {
                        const value = JSON.parse(row.value);
                        if (value && typeof value === 'object') {
                            const inputTokens = value.inputTokens || value.input_tokens || value.promptTokens || 0;
                            const outputTokens = value.outputTokens || value.output_tokens || value.completionTokens || 0;

                            if (inputTokens > 0 || outputTokens > 0) {
                                sessions.push({
                                    sessionId: row.key || String(Date.now()),
                                    timestamp: new Date(),
                                    inputTokens,
                                    outputTokens,
                                    model: value.model || 'cursor',
                                    provider: 'cursor',
                                });
                            }
                        }
                    } catch {}
                }
            }

            cursorDb.close();
            console.log(`[Cursor] Total sessions found: ${sessions.length}`);
        } catch (e) {
            console.error(`[Cursor] Parse error: ${e.message}`);
        }
        return sessions;
    },

    async parseDir(dirPath: string): Promise<ParsedSession[]> {
        return this.parse(dirPath);
    }
};

// Register all plugins
const AI_AGENT_PLUGINS: AIAgentPlugin[] = [
    ClaudeCodePlugin,
    CursorPlugin,
    OpenCodePlugin,
    GeminiPlugin,
    CodexPlugin,
    QwenPlugin,
    AiderPlugin,
];

// Yield control back to the event loop to prevent UI freezing
const yieldToEventLoop = () => new Promise<void>(resolve => setImmediate(resolve));

// Unified sync function using plugins
async function syncAllAIAgents(db: any): Promise<Record<string, number>> {
    const results: Record<string, number> = {};

    for (const plugin of AI_AGENT_PLUGINS) {
        try {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai-sync-progress', { agent: plugin.id, name: plugin.name, status: 'detecting' });
            }

            // Yield between plugins so UI stays responsive
            await yieldToEventLoop();

            const isDetected = await plugin.detect();
            console.log(`[DeskFlow] ${plugin.name} detected: ${isDetected}`);

            if (!isDetected) continue;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('ai-sync-progress', { agent: plugin.id, name: plugin.name, status: 'parsing' });
            }

            const paths = plugin.getStoragePaths();
            console.log(`[DeskFlow] ${plugin.name} paths:`, paths);

            for (const pluginPath of paths) {
                if (!fs_1.default.existsSync(pluginPath)) {
                    console.log(`[DeskFlow] ${plugin.name} path not found: ${pluginPath}`);
                    continue;
                }

                const stat = fs_1.default.statSync(pluginPath);
                console.log(`[DeskFlow] ${plugin.name} path exists: ${pluginPath}, isDir: ${stat.isDirectory()}`);

                let sessions: ParsedSession[] = [];

                if (stat.isDirectory()) {
                    sessions = await plugin.parseDir(pluginPath);
                } else {
                    sessions = await plugin.parse(pluginPath);
                }

                console.log(`[DeskFlow] ${plugin.name} parsed ${sessions.length} sessions`);

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('ai-sync-progress', { agent: plugin.id, name: plugin.name, status: 'saving', count: sessions.length });
                }

                if (sessions.length === 0) continue;

                // Batch inserts in a transaction for massive speedup
                const insertBatch = db!.prepare(`
                    INSERT OR IGNORE INTO ai_usage (id, tool, date, input_tokens, output_tokens, cache_write_tokens, cache_read_tokens, cost_usd, model, message_count, project_path)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `);

                const batchSize = 100;
                for (let i = 0; i < sessions.length; i += batchSize) {
                    const batch = sessions.slice(i, i + batchSize);

                    try {
                        db!.transaction(() => {
                            for (const session of batch) {
                                const id = `${plugin.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                const date = session.timestamp.toISOString().split('T')[0];
                                const cost = calculateCost(session);

                                insertBatch.run(
                                    id,
                                    plugin.id,
                                    date,
                                    session.inputTokens,
                                    session.outputTokens,
                                    session.cacheWriteTokens || 0,
                                    session.cacheReadTokens || 0,
                                    cost,
                                    session.model || null,
                                    session.messageCount || 0,
                                    session.projectPath || null
                                );
                                results[plugin.id] = (results[plugin.id] || 0) + 1;
                            }
                        })();
                    } catch (dbErr: any) {
                        if (!dbErr.message.includes('UNIQUE constraint')) {
                            console.error(`[DeskFlow] ${plugin.name} DB insert error:`, dbErr.message);
                        }
                    }

                    // Yield every batch so the UI doesn't freeze
                    await yieldToEventLoop();
                }
            }

            console.log(`[DeskFlow] ${plugin.name}: synced ${results[plugin.id] || 0} usage records`);
        } catch (err: any) {
            console.error(`[DeskFlow] ${plugin.name} sync error:`, err.message);
        }
    }

    return results;
}
let categoryConfig = {
    version: 2,
    appCategoryMap: {},
    domainCategoryMap: {},
    appTierMap: {},
    domainTierMap: {},
    tierAssignments: { ...DEFAULT_TIER_ASSIGNMENTS },
    detectedDomains: {},
    detectedApps: {},
    // Keyword-based productivity rules per domain
    domainKeywordRules: {},
    // Per-domain default categories (when keywords don't match)
    domainDefaultCategories: {}
};

// Default keyword rules for YouTube - NEW structure: array of { category, keywords }
const DEFAULT_KEYWORD_RULES: Record<string, { category: string; keywords: string[] }[]> = {
    'youtube.com': [
        { 
            category: 'Education', 
            keywords: ['tutorial', 'course', 'lecture', 'learn', 'class', 'university',
            'physics', 'mathematics', 'chemistry', 'biology', 'science',
            'programming', 'coding', 'javascript', 'python', 'typescript', 'react',
            'algorithm', 'data structure', 'web development',
            'crash course', 'lesson', 'study', 'exam', 'revision',
            'masterclass', 'workshop', 'training', 'how to build', 'from scratch']
        },
        { 
            category: 'Entertainment', 
            keywords: ['gaming', 'game', 'stream', 'minecraft', 'fortnite', 'valheim',
            'call of duty', 'dota', 'league', 'esports', 'walkthrough', 'playthrough',
            'funny', 'compilation', 'montage', 'music video']
        },
        { 
            category: 'News', 
            keywords: ['news', 'breaking', 'cnn', 'bbc', ' msn', 'fox', 'politics',
            'election', 'trump', 'biden', 'war', 'climate']
        }
    ]
};

// Default category when keywords don't match (per domain) - now falls back to Category Overrides
function loadCategoryConfig() {
    try {
        if (fs_1.default.existsSync(categoryConfigPath)) {
            const data = fs_1.default.readFileSync(categoryConfigPath, 'utf-8');
            const loaded = JSON.parse(data);
            categoryConfig = {
                ...{
                    version: 2,
                    appCategoryMap: {},
                    domainCategoryMap: {},
                    appTierMap: {},
                    domainTierMap: {},
                    tierAssignments: { ...DEFAULT_TIER_ASSIGNMENTS },
                    detectedDomains: {},
                    detectedApps: {},
                    domainKeywordRules: {},
                    domainDefaultCategories: {}
                },
                ...loaded,
                // Ensure new fields exist even in old configs
                domainKeywordRules: loaded?.domainKeywordRules || {},
                domainDefaultCategories: loaded?.domainDefaultCategories || {}
            };
            console.log('[DeskFlow] ✅ Loaded category config');
        }
        else {
            // Initialize with defaults on first run
            categoryConfig.domainKeywordRules = { ...DEFAULT_KEYWORD_RULES };
            categoryConfig.domainDefaultCategories = {};
            saveCategoryConfig();
            console.log('[DeskFlow] ✅ Created default category config');
        }
    }
    catch (err) {
        console.warn('[DeskFlow] Failed to load category config:', err);
        categoryConfig = {
            version: 2,
            appCategoryMap: {},
            domainCategoryMap: {},
            appTierMap: {},
            domainTierMap: {},
            tierAssignments: { ...DEFAULT_TIER_ASSIGNMENTS },
            detectedDomains: {},
            detectedApps: {},
            domainKeywordRules: { ...DEFAULT_KEYWORD_RULES },
            domainDefaultCategories: {}
        };
    }
}
function saveCategoryConfig() {
    try {
        fs_1.default.writeFileSync(categoryConfigPath, JSON.stringify(categoryConfig, null, 2));
    }
    catch (err) {
        console.error('[DeskFlow] Failed to save category config:', err);
    }
}
function getTierForCategory(category) {
    const { tierAssignments } = categoryConfig;
    if (tierAssignments.productive.includes(category))
        return 'productive';
    if (tierAssignments.distracting.includes(category))
        return 'distracting';
    return 'neutral';
}
let db = null;
let useJson = false;
let storageError = null;
let jsonLogs = [];
// Initialize storage with robust fallback
function initializeStorage() {
    // Ensure userData directory exists
    try {
        if (!fs_1.default.existsSync(userDataPath)) {
            fs_1.default.mkdirSync(userDataPath, { recursive: true });
        }
    }
    catch (err) {
        console.error('[DeskFlow] Failed to create userData directory:', err.message);
        storageError = `Cannot create data directory: ${err.message}`;
        useJson = true;
        jsonLogs = [];
        return;
    }
    // Try SQLite first
    try {
        const Database = require('better-sqlite3');
        db = new Database(dbPath);
        db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        app TEXT NOT NULL,
        category TEXT NOT NULL,
        duration_ms INTEGER NOT NULL,
        title TEXT,
        project TEXT,
        keystrokes INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        window_switches INTEGER DEFAULT 0,
        url TEXT,
        domain TEXT,
        tab_id INTEGER,
        is_browser_tracking INTEGER DEFAULT 0
      )
    `);
        // Add columns if they don't exist (migration for existing databases)
        try {
            db.exec('ALTER TABLE logs ADD COLUMN url TEXT');
        }
        catch { /* column exists */ }
        try {
            db.exec('ALTER TABLE logs ADD COLUMN domain TEXT');
        }
        catch { /* column exists */ }
        try {
            db.exec('ALTER TABLE logs ADD COLUMN tab_id INTEGER');
        }
        catch { /* column exists */ }
        try {
            db.exec('ALTER TABLE logs ADD COLUMN is_browser_tracking INTEGER DEFAULT 0');
        }
        catch { /* column exists */ }
        // Add productivity columns to daily_stats if they don't exist
        try {
            db.exec('ALTER TABLE daily_stats ADD COLUMN productivity_type TEXT DEFAULT \'unknown\'');
        }
        catch { /* column exists */ }
        try {
            db.exec('ALTER TABLE daily_stats ADD COLUMN total_time_sec INTEGER DEFAULT 0');
        }
        catch { /* column exists */ }
        try {
            db.exec('ALTER TABLE daily_stats ADD COLUMN focus_time_sec INTEGER DEFAULT 0');
        }
        catch { /* column exists */ }
        // Daily stats aggregation table with productivity tracking
        db.exec(`
      CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        app TEXT NOT NULL,
        category TEXT NOT NULL,
        total_sec INTEGER NOT NULL DEFAULT 0,
        sessions INTEGER NOT NULL DEFAULT 0,
        avg_session_sec REAL NOT NULL DEFAULT 0,
        keystrokes INTEGER DEFAULT 0,
        clicks INTEGER DEFAULT 0,
        focus_score REAL DEFAULT 0,
        productivity_type TEXT DEFAULT 'unknown',
        total_time_sec INTEGER DEFAULT 0,
        focus_time_sec INTEGER DEFAULT 0,
        UNIQUE(date, app)
      )
    `);
        // New sessions table - tracks active sessions with UPDATE instead of INSERT
        db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app TEXT NOT NULL,
        category TEXT,
        start_time TEXT,
        end_time TEXT,
        duration_sec INTEGER DEFAULT 0,
        domain TEXT,
        url TEXT,
        title TEXT,
        is_active INTEGER DEFAULT 1
      )
    `);
        // New daily_aggregates table - pre-computed for heatmap/planets
        db.exec(`
      CREATE TABLE IF NOT EXISTS daily_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        app TEXT NOT NULL,
        category TEXT,
        total_sec INTEGER DEFAULT 0,
        session_count INTEGER DEFAULT 0,
        UNIQUE(date, app)
      )
    `);
        // New browser_sessions table - aggregated browser data
        db.exec(`
      CREATE TABLE IF NOT EXISTS browser_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        domain TEXT NOT NULL,
        category TEXT,
        total_sec INTEGER DEFAULT 0,
        session_count INTEGER DEFAULT 0,
        UNIQUE(date, domain)
      )
    `);

        // ========== IDE Projects Tables ==========
        // IDE installations
        db.exec(`
      CREATE TABLE IF NOT EXISTS ides (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        version TEXT,
        install_path TEXT,
        last_opened DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Extensions for each IDE
        db.exec(`
      CREATE TABLE IF NOT EXISTS extensions (
        id TEXT PRIMARY KEY,
        ide_id TEXT REFERENCES ides(id),
        publisher TEXT,
        name TEXT NOT NULL,
        version TEXT,
        enabled INTEGER DEFAULT 1,
        install_date DATETIME
      )
    `);

        // Detected development tools
        db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        version TEXT,
        install_path TEXT,
        detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        detection_method TEXT
      )
    `);

        // Tracked projects
        db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        repository_url TEXT,
        vcs_type TEXT,
        primary_language TEXT,
        default_ide TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_activity_at DATETIME,
        deleted_at DATETIME
      )
    `);

        // Project-Tool relationship
        db.exec(`
      CREATE TABLE IF NOT EXISTS project_tools (
        project_id TEXT REFERENCES projects(id),
        tool_id TEXT REFERENCES tools(id),
        PRIMARY KEY (project_id, tool_id)
      )
    `);

        // AI Usage tracking
        db.exec(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        tool TEXT NOT NULL,
        date DATE NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cache_write_tokens INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        model TEXT,
        message_count INTEGER DEFAULT 0,
        project_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Safe migration for existing databases
        try { db.exec('ALTER TABLE ai_usage ADD COLUMN message_count INTEGER DEFAULT 0'); } catch {}
        try { db.exec('ALTER TABLE ai_usage ADD COLUMN project_path TEXT'); } catch {}
        db.exec('CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(date)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_ai_usage_tool ON ai_usage(tool)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_ai_usage_project_path ON ai_usage(project_path)');

        // Commit metrics
        db.exec(`
      CREATE TABLE IF NOT EXISTS commits (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        sha TEXT NOT NULL,
        author TEXT,
        author_email TEXT,
        date DATETIME NOT NULL,
        message TEXT,
        additions INTEGER DEFAULT 0,
        deletions INTEGER DEFAULT 0,
        files_changed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_commits_project ON commits(project_id)');
        db.exec('CREATE INDEX IF NOT EXISTS idx_commits_date ON commits(date)');

        // AI attribution for commits
        db.exec(`
      CREATE TABLE IF NOT EXISTS ai_attribution (
        commit_id TEXT PRIMARY KEY REFERENCES commits(id),
        tool TEXT,
        lines_ai_added INTEGER DEFAULT 0,
        lines_ai_deleted INTEGER DEFAULT 0,
        lines_human_added INTEGER DEFAULT 0
      )
    `);

        // DORA metrics
        db.exec(`
      CREATE TABLE IF NOT EXISTS dora_metrics (
        id TEXT PRIMARY KEY,
        project_id TEXT REFERENCES projects(id),
        period TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        deployment_frequency REAL,
        lead_time_hours REAL,
        change_failure_rate REAL,
        mean_time_to_recovery_hours REAL,
        level TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_dora_project ON dora_metrics(project_id)');

        // Terminal layouts
        db.exec(`
            CREATE TABLE IF NOT EXISTS terminal_layouts (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              project_id TEXT,
              layout_data TEXT,
              is_active INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Terminal presets
        db.exec(`
            CREATE TABLE IF NOT EXISTS terminal_presets (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              command TEXT NOT NULL,
              project_id TEXT,
              working_directory TEXT,
              category TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Terminal sessions
        db.exec(`
            CREATE TABLE IF NOT EXISTS terminal_sessions (
              id TEXT PRIMARY KEY,
              preset_id TEXT,
              project_id TEXT,
              agent TEXT,
              resume_id TEXT,
              topic TEXT,
              working_directory TEXT,
              total_tokens INTEGER DEFAULT 0,
              total_cost REAL DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Safe migrations for existing databases
        try { db.exec('ALTER TABLE terminal_presets ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
        try { db.exec('ALTER TABLE terminal_sessions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'); } catch {}
        try { db.exec('ALTER TABLE terminal_sessions ADD COLUMN total_tokens INTEGER DEFAULT 0'); } catch {}
        try { db.exec('ALTER TABLE terminal_sessions ADD COLUMN total_cost REAL DEFAULT 0'); } catch {}

        // ========== External Activities Tables ==========
        // External activities definition table
        db.exec(`
          CREATE TABLE IF NOT EXISTS external_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('stopwatch', 'sleep', 'checkin')),
            color TEXT DEFAULT '#6366f1',
            icon TEXT DEFAULT 'Clock',
            default_duration INTEGER DEFAULT 30,
            is_default INTEGER DEFAULT 0,
            is_visible INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // External sessions tracking table
        db.exec(`
          CREATE TABLE IF NOT EXISTS external_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            activity_id INTEGER NOT NULL,
            started_at TEXT NOT NULL,
            ended_at TEXT,
            duration_seconds INTEGER DEFAULT 0,
            notes TEXT,
            device_off_to_sleep_seconds INTEGER DEFAULT 0,
            wake_up_to_app_seconds INTEGER DEFAULT 0,
            FOREIGN KEY (activity_id) REFERENCES external_activities(id)
          )
        `);
        
        // Add extra columns to existing tables if they don't exist
        try { db.exec('ALTER TABLE external_sessions ADD COLUMN device_off_to_sleep_seconds INTEGER DEFAULT 0'); } catch {}
        try { db.exec('ALTER TABLE external_sessions ADD COLUMN wake_up_to_app_seconds INTEGER DEFAULT 0'); } catch {}

        // External tracker settings
        db.exec(`
          CREATE TABLE IF NOT EXISTS external_settings (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);

        // Seed default external activities if table is empty
        const activityCount = db.prepare('SELECT COUNT(*) as count FROM external_activities').get();
        if (activityCount.count === 0) {
          const defaultActivities = [
            { name: 'Studying (Paper)', type: 'stopwatch', color: '#8b5cf6', icon: 'BookOpen', sort_order: 1 },
            { name: 'Exercise', type: 'stopwatch', color: '#10b981', icon: 'Dumbbell', sort_order: 2 },
            { name: 'Gym', type: 'stopwatch', color: '#f59e0b', icon: 'Activity', sort_order: 3 },
            { name: 'Commute', type: 'stopwatch', color: '#6366f1', icon: 'Bus', sort_order: 4 },
            { name: 'Reading', type: 'stopwatch', color: '#ec4899', icon: 'Book', sort_order: 5 },
            { name: 'Sleep', type: 'sleep', color: '#3b82f6', icon: 'Moon', sort_order: 6 },
            { name: 'Eating', type: 'stopwatch', color: '#ef4444', icon: 'Utensils', default_duration: 30, sort_order: 7 },
            { name: 'Short Break', type: 'stopwatch', color: '#14b8a6', icon: 'Coffee', default_duration: 15, sort_order: 8 },
          ];
          const insertStmt = db.prepare(`
            INSERT INTO external_activities (name, type, color, icon, default_duration, is_default, sort_order)
            VALUES (?, ?, ?, ?, ?, 1, ?)
          `);
          for (const act of defaultActivities) {
            insertStmt.run(act.name, act.type, act.color, act.icon, act.default_duration || 30, act.sort_order);
          }
          console.log('[DeskFlow] ✅ Seeded', defaultActivities.length, 'default external activities');
        }

        console.log('[DeskFlow] ✅ SQLite database initialized at', dbPath);
        storageError = null;
    }
    catch (err) {
        console.warn('[DeskFlow] ⚠️ SQLite failed, falling back to JSON:', err.message);
        storageError = `SQLite error: ${err.message}. Using JSON fallback.`;
        useJson = true;
        // Initialize JSON storage
        try {
            if (fs_1.default.existsSync(jsonPath)) {
                const data = fs_1.default.readFileSync(jsonPath, 'utf-8');
                jsonLogs = JSON.parse(data);
                console.log('[DeskFlow] 📄 Loaded', jsonLogs.length, 'logs from JSON');
            }
            else {
                // Create fresh JSON file
                jsonLogs = [];
                fs_1.default.writeFileSync(jsonPath, JSON.stringify([], null, 2));
                console.log('[DeskFlow] 📄 Created new JSON storage file');
            }
        }
        catch (e) {
            console.error('[DeskFlow] ❌ Failed to initialize JSON storage:', e.message);
            storageError = `JSON storage error: ${e.message}. Data will NOT persist!`;
            jsonLogs = [];
        }
    }
}
function saveJsonLogs() {
    if (useJson) {
        try {
            fs_1.default.writeFileSync(jsonPath, JSON.stringify(jsonLogs, null, 2));
        }
        catch (err) {
            console.error('[DeskFlow] Failed to save JSON logs:', err);
        }
    }
}
// --- Helper functions ---
function addLog(timestamp, app, category, duration_ms, title, project, url?, domain?, tab_id?, is_browser_tracking?) {
    // Cap duration at 1 hour max to prevent heatmap inflation
    const safeDuration = Math.min(duration_ms, MAX_LOGGED_SESSION_MS);
    if (useJson) {
        const newLog = {
            id: Date.now(),
            timestamp,
            app,
            category,
            duration_ms: safeDuration,
            title,
            project,
            url,
            domain,
            tab_id,
            is_browser_tracking
        };
        jsonLogs.unshift(newLog);
        if (jsonLogs.length > 50000)
            jsonLogs = jsonLogs.slice(0, 50000); // Increased from 1000 to 50000
        saveJsonLogs();
        console.log(`[DeskFlow] ✅ Logged: ${app} → ${Math.floor(safeDuration / 1000)}s`);
    }
    else {
        try {
            const stmt = db.prepare(`
        INSERT INTO logs (timestamp, app, category, duration_ms, title, project, url, domain, tab_id, is_browser_tracking)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(timestamp, app, category, safeDuration, title, project, url || null, domain || null, tab_id || null, is_browser_tracking ? 1 : 0);
            console.log(`[DeskFlow] ✅ Logged: ${app} → ${Math.floor(safeDuration / 1000)}s`);
        }
        catch (err) {
            console.error('[DeskFlow] SQLite insert failed:', err);
        }
    }
    // Update aggregated tables after inserting a log
    updateAggregates(timestamp, app, category, safeDuration, domain, is_browser_tracking);
}
function updateAggregates(timestamp, app, category, duration_ms, domain, is_browser_tracking) {
    if (useJson)
        return; // Skip for JSON storage
    const date = timestamp.split('T')[0];
    const duration_sec = Math.floor(duration_ms / 1000);
    try {
        // Update daily_stats
        const existingDaily = db.prepare(`SELECT id, total_sec, sessions FROM daily_stats WHERE date = ? AND app = ?`).get(date, app);
        if (existingDaily) {
            db.prepare(`UPDATE daily_stats SET total_sec = total_sec + ?, sessions = sessions + 1 WHERE date = ? AND app = ?`)
                .run(duration_sec, date, app);
        }
        else {
            db.prepare(`INSERT INTO daily_stats (date, app, category, total_sec, sessions) VALUES (?, ?, ?, ?, 1)`)
                .run(date, app, category, duration_sec);
        }
        // Update sessions table (active sessions tracking)
        const existingSession = db.prepare(`SELECT id, duration_sec FROM sessions WHERE app = ? AND is_active = 1 ORDER BY start_time DESC LIMIT 1`).get(app);
        if (existingSession) {
            db.prepare(`UPDATE sessions SET duration_sec = duration_sec + ? WHERE id = ?`).run(duration_sec, existingSession.id);
        }
        else {
            db.prepare(`INSERT INTO sessions (app, category, start_time, end_time, duration_sec, is_active) VALUES (?, ?, ?, ?, ?, 1)`)
                .run(app, category, timestamp, timestamp, duration_sec);
        }
        // Update daily_aggregates
        const existingAgg = db.prepare(`SELECT id, total_sec, session_count FROM daily_aggregates WHERE date = ? AND app = ?`).get(date, app);
        if (existingAgg) {
            db.prepare(`UPDATE daily_aggregates SET total_sec = total_sec + ?, session_count = session_count + 1 WHERE date = ? AND app = ?`)
                .run(duration_sec, date, app);
        }
        else {
            db.prepare(`INSERT INTO daily_aggregates (date, app, category, total_sec, session_count) VALUES (?, ?, ?, ?, 1)`)
                .run(date, app, category, duration_sec);
        }
        // Update browser_sessions if browser tracking
        if (is_browser_tracking && domain) {
            const existingBrowser = db.prepare(`SELECT id, total_sec, session_count FROM browser_sessions WHERE date = ? AND domain = ?`).get(date, domain);
            if (existingBrowser) {
                db.prepare(`UPDATE browser_sessions SET total_sec = total_sec + ?, session_count = session_count + 1 WHERE date = ? AND domain = ?`)
                    .run(duration_sec, date, domain);
            }
            else {
                db.prepare(`INSERT INTO browser_sessions (date, domain, category, total_sec, session_count) VALUES (?, ?, ?, ?, 1)`)
                    .run(date, domain, category, duration_sec);
            }
        }
        console.log('[DeskFlow] ✅ Aggregates updated for', app);
    }
    catch (err) {
        console.error('[DeskFlow] Aggregate update failed:', err);
    }
}
function getLogs(limit?: number): any[] {
    console.log('[DeskFlow getLogs] Called with limit:', limit);
    if (useJson) {
        console.log('[DeskFlow getLogs] Returning jsonLogs:', jsonLogs.length);
        return limit ? jsonLogs.slice(0, limit) : jsonLogs;
    }
    try {
        if (limit) {
            const stmt = db.prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT ${limit}`);
            const results = stmt.all();
            console.log('[DeskFlow getLogs] SQLite with limit:', results.length);
            return results;
        }
        const stmt = db.prepare('SELECT * FROM logs ORDER BY id DESC');
        const results = stmt.all();
        console.log('[DeskFlow getLogs] SQLite all logs:', results.length);
        return results;
    }
    catch (err) {
        console.error('[DeskFlow] SQLite select failed:', err);
        return [];
    }
}
function getStats() {
    // FIX 3: For browser-tracked entries, use domain as the "app" name
    // Also exclude generic browser app entries (e.g. "Chrome", "Firefox") to prevent
    // double-counting when browser extension tracks individual domains
    const BROWSER_APPS = [
        'chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi', 'arc',
        'google chrome', 'microsoft edge', 'comet', 'browser', 'yandex', 'duckduckgo'
    ];
    if (useJson) {
        const stats = new Map();
        jsonLogs.forEach((log) => {
            // Skip generic browser entries (individual domains are tracked separately)
            const appLower = log.app.toLowerCase();
            if (BROWSER_APPS.some(browser => appLower.includes(browser)))
                return;
            const appName = log.is_browser_tracking && log.domain ? log.domain : log.app;
            const existing = stats.get(appName) || { total_ms: 0, sessions: 0 };
            existing.total_ms += log.duration_ms;
            existing.sessions += 1;
            stats.set(appName, existing);
        });
        return Array.from(stats.entries()).map(([app, data]) => ({
            app,
            total_ms: data.total_ms,
            sessions: data.sessions
        })).sort((a, b) => b.total_ms - a.total_ms);
    }
    try {
        const stmt = db.prepare(`
      SELECT
        CASE
          WHEN is_browser_tracking = 1 AND domain IS NOT NULL AND domain != '' THEN domain
          ELSE app
        END as app,
        SUM(duration_ms) as total_ms,
        COUNT(*) as sessions
      FROM logs
      WHERE LOWER(app) NOT IN ('chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge', 'comet', 'browser', 'vivaldi', 'arc')
      AND LOWER(app) NOT LIKE '%chrome%'
      AND LOWER(app) NOT LIKE '%firefox%'
      AND LOWER(app) NOT LIKE '%browser%'
      AND LOWER(app) NOT LIKE '%edge%'
      AND LOWER(app) NOT LIKE '%comet%'
      GROUP BY
        CASE
          WHEN is_browser_tracking = 1 AND domain IS NOT NULL AND domain != '' THEN domain
          ELSE app
        END
      ORDER BY total_ms DESC
    `);
        return stmt.all();
    }
    catch (err) {
        console.error('[DeskFlow] SQLite stats failed:', err);
        return [];
    }
}
// --- Tracking state ---
let currentApp = null;
let sessionStart = Date.now();
let trackingInterval = null;
let isTracking = true;
let lastPollTime = Date.now();
let consecutiveNullPolls = 0;
const MAX_SESSION_MS = 5 * 60 * 1000; // 5 minutes — cap session to prevent sleep-time inflation
const MAX_LOGGED_SESSION_MS = 3600000; // 1 hour - cap logged sessions to prevent heatmap inflation
const SLEEP_GAP_MS = 10000; // 10 seconds — gap threshold to detect system sleep
// --- Browser tracking state ---
let browserServer = null;
let browserServerPort = 54321;
let isBrowserTrackingEnabled = true;
// FIX 1: Use a Map keyed by domain to track all active browser sessions (not just one)
let activeBrowserSessions = new Map();
let browserExcludedDomains = [];
// Track only the MOST RECENTLY active browser domain (only one active at a time)
let lastActiveBrowserDomain = null;
let lastActiveBrowserTimestamp = 0;
function categorizeApp(appName) {
    const lower = appName.toLowerCase();
    if (categoryConfig.appCategoryMap[appName]) {
        return categoryConfig.appCategoryMap[appName];
    }
    if (categoryConfig.detectedApps[lower]) {
        return categoryConfig.detectedApps[lower];
    }
    for (const [keyword, category] of Object.entries(DEFAULT_APP_CATEGORIES)) {
        if (lower.includes(keyword)) {
            categoryConfig.detectedApps[lower] = category;
            saveCategoryConfig();
            return category;
        }
    }
    return 'Uncategorized';
}
// Calculate productivity score based on daily activity
// Returns: { score: 0-100, productive_sec: number, neutral_sec: number, distracting_sec: number, total_sec: number }
function calculateProductivityScore(dayLogs) {
    const { tierAssignments } = categoryConfig;
    let productiveSec = 0;
    let neutralSec = 0;
    let distractingSec = 0;
    const breakdown = {};
    for (const log of dayLogs) {
        const durationSec = Math.floor((log.duration_ms || 0) / 1000);
        const category = log.category || 'Uncategorized';
        const tier = getTierForCategory(category);
        // Track breakdown (floor to remove decimals)
        breakdown[category] = (breakdown[category] || 0) + durationSec;
        // Classify time based on tier
        if (tier === 'productive') {
            productiveSec += durationSec;
        }
        else if (tier === 'distracting') {
            distractingSec += durationSec;
        }
        else {
            neutralSec += durationSec;
        }
    }
    const totalSec = productiveSec + neutralSec + distractingSec;
    // Calculate score (0-100)
    // Productive time = 100%, Neutral = 50%, Distracting = 0%
    let score = 0;
    if (totalSec > 0) {
        score = ((productiveSec + (neutralSec * 0.5)) / totalSec) * 100;
    }
    return {
        score: Math.floor(Math.min(100, Math.max(0, score))),
        productive_sec: Math.floor(productiveSec),
        neutral_sec: Math.floor(neutralSec),
        distracting_sec: Math.floor(distractingSec),
        total_sec: Math.floor(totalSec),
        breakdown
    };
}
// Domain categorization for browser tracking (conservative smart detection)
function categorizeDomain(domain, title, url) {
    const lower = domain.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const urlLower = (url || '').toLowerCase();
    const combinedContext = `${titleLower} ${urlLower}`;
    
    console.log('[DeskFlow] categorizeDomain called:', { domain: lower, title: title?.substring(0, 50), url: url?.substring(0, 50) });
    console.log('[DeskFlow] domainKeywordRules:', JSON.stringify(Object.keys(categoryConfig.domainKeywordRules || {})));
    console.log('[DeskFlow] domainDefaultCategories:', JSON.stringify(categoryConfig.domainDefaultCategories));
    console.log('[DeskFlow] detectedDomains:', JSON.stringify(categoryConfig.detectedDomains));
    
    // Check excluded domains first
    if (browserExcludedDomains.some(excluded => lower.includes(excluded))) {
        console.log('[DeskFlow] categorizeDomain result: Excluded');
        return 'Excluded';
    }
    
    // 1. Check user override (manual category assignment)
    if (categoryConfig.domainCategoryMap[lower]) {
        console.log('[DeskFlow] categorizeDomain result (override):', categoryConfig.domainCategoryMap[lower]);
        return categoryConfig.domainCategoryMap[lower];
    }
    
    // 2. Check detected domains cache
    if (categoryConfig.detectedDomains[lower]) {
        console.log('[DeskFlow] categorizeDomain result (detected):', categoryConfig.detectedDomains[lower]);
        return categoryConfig.detectedDomains[lower];
    }
    
    // 3. Use keyword-based categorization rules (configurable per domain)
    // New structure: { category: string; keywords: string[] }[]
    for (const [domainPattern, keywordSets] of Object.entries(categoryConfig.domainKeywordRules || {})) {
        if (lower.includes(domainPattern)) {
            console.log('[DeskFlow] Found keyword rule for:', domainPattern, 'keywordSets:', JSON.stringify(keywordSets));
            const sets = keywordSets as { category: string; keywords: string[] }[];
            for (const set of sets) {
                const keywordsArray = set.keywords || [];
                const matched = keywordsArray.some(keyword => 
                    combinedContext.includes(keyword.toLowerCase())
                );
                if (matched) {
                    console.log('[DeskFlow] categorizeDomain result (keyword match):', set.category);
                    return set.category;
                }
            }
            // No keywords matched - fall back to Category Overrides (domainCategoryMap)
            // This will be checked at step 1 on next call since domainCategoryMap is checked first
            const fallbackFromOverrides = categoryConfig.domainCategoryMap?.[domainPattern];
            if (fallbackFromOverrides) {
                console.log('[DeskFlow] categorizeDomain result (fallback to overrides):', fallbackFromOverrides);
                return fallbackFromOverrides;
            }
            // No keywords matched - also check DEFAULT_DOMAIN_CATEGORIES
            if (DEFAULT_DOMAIN_CATEGORIES[domainPattern]) {
                console.log('[DeskFlow] categorizeDomain result (default categories):', DEFAULT_DOMAIN_CATEGORIES[domainPattern]);
                return DEFAULT_DOMAIN_CATEGORIES[domainPattern];
            }
            console.log('[DeskFlow] categorizeDomain result (no match):', 'Entertainment');
            return 'Entertainment';
        }
    }
    
    // 4. Final fallback: check DEFAULT_DOMAIN_CATEGORIES for any domain
    for (const [defaultDomain, defaultCategory] of Object.entries(DEFAULT_DOMAIN_CATEGORIES)) {
        if (lower.includes(defaultDomain) || defaultDomain.includes(lower)) {
            console.log('[DeskFlow] categorizeDomain result (final fallback):', defaultCategory);
            return defaultCategory;
        }
    }
    
    // 5. Last resort
    console.log('[DeskFlow] categorizeDomain result (truly uncategorized):', 'Uncategorized');
    return 'Uncategorized';
}

// Real window polling using active-win
async function pollForeground() {
    if (!isTracking)
        return;
    const now = Date.now();
    try {
        const result = await (0, active_win_1.default)();
        // Track poll time for gap detection
        const timeSinceLastPoll = now - lastPollTime;
        lastPollTime = now;
        // --- Sleep / gap detection ---
        // If active-win returned null and this has happened 3+ consecutive times,
        // the system was likely asleep or locked. Reset silently.
        if (!result) {
            consecutiveNullPolls++;
            if (consecutiveNullPolls >= 3) {
                // System is unresponsive — reset session without logging
                if (currentApp) {
                    console.log(`[DeskFlow] 💤 System appears asleep, resetting session for: ${currentApp}`);
                    currentApp = null;
                    sessionStart = now;
                }
            }
            return;
        }
        // If we get a result after a gap, check if the gap was large enough to indicate sleep
        if (timeSinceLastPoll > SLEEP_GAP_MS) {
            console.log(`[DeskFlow] 💤 Sleep gap detected (${Math.round(timeSinceLastPoll / 1000)}s). Resetting session.`);
            currentApp = null;
            sessionStart = now;
            consecutiveNullPolls = 0;
            return;
        }
         // Successful poll — reset counter
         consecutiveNullPolls = 0;
         const appName = result.owner?.name || 'Unknown';
         const windowTitle = result.title || '';
         // Only log if app changed
         if (appName !== currentApp) {
             const rawDuration = now - sessionStart;
             // Log previous session if it was > 5 seconds AND within reasonable bounds
             // BUT: Filter out Electron/DeskFlow app (don't track the app itself)
             if (currentApp && rawDuration > 5000 && currentApp !== 'DeskFlow' && currentApp !== 'Electron') {
                 // Cap duration to prevent sleep-time inflation from creating bogus multi-hour sessions
                 const duration = Math.min(rawDuration, MAX_SESSION_MS);
                 // If the raw duration was much larger than the cap, the system was likely asleep
                 // Only log up to the cap and warn
                 if (rawDuration > MAX_SESSION_MS) {
                     console.log(`[DeskFlow] ⚠️ Session capped: ${currentApp} had ${Math.round(rawDuration / 1000)}s, capped to ${Math.round(duration / 1000)}s (likely sleep artifact)`);
                 }
                 const category = categorizeApp(currentApp);
                 addLog(new Date(sessionStart).toISOString(), currentApp, category, duration, `${currentApp} Window`, null);
             }
             // Start new session
             currentApp = appName;
             sessionStart = now;
            // Send to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('foreground-changed', {
                    app: appName,
                    title: windowTitle,
                    category: categorizeApp(appName),
                    timestamp: new Date().toISOString(),
                    isReal: true
                });
            }
        }
    }
    catch (err) {
        console.error('[DeskFlow] active-win error:', err.message);
        consecutiveNullPolls++;
    }
}
// --- Window ---
let mainWindow = null;
let tray = null;
let startMinimized = false;
function createTray() {
    // Use the custom icon for the tray
    const iconPath = path_1.default.join(__dirname, '../public/deskflow-icon.png');
    let trayIcon;
    
    try {
        trayIcon = electron_1.nativeImage.createFromPath(iconPath);
        // Resize for tray (16x16)
        if (!trayIcon.isEmpty()) {
            trayIcon = trayIcon.resize({ width: 16, height: 16 });
        }
    } catch (e) {
        console.warn('[DeskFlow] Failed to load tray icon, using fallback');
        // Fallback: create a simple icon programmatically
        const size = 16;
        const canvas = Buffer.alloc(size * size * 4);
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const idx = (y * size + x) * 4;
                const cx = x - size / 2 + 0.5;
                const cy = y - size / 2 + 0.5;
                const dist = Math.sqrt(cx * cx + cy * cy);
                if (dist < 6) {
                    canvas[idx] = 0x3b;
                    canvas[idx + 1] = 0x82;
                    canvas[idx + 2] = 0xf6;
                    canvas[idx + 3] = 255;
                } else {
                    canvas[idx] = 0;
                    canvas[idx + 1] = 0;
                    canvas[idx + 2] = 0;
                    canvas[idx + 3] = 0;
                }
            }
        }
        trayIcon = electron_1.nativeImage.createFromBuffer(canvas, { width: size, height: size });
    }
    
    tray = new electron_1.Tray(trayIcon);
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show DeskFlow',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        },
        {
            label: 'Toggle Tracking',
            click: () => {
                isTracking = !isTracking;
                console.log('[DeskFlow] Tracking:', isTracking ? 'ON' : 'OFF');
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('tracking-heartbeat', { isTracking, currentApp, uptime: Date.now() });
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                electron_1.app.quit();
            }
        }
    ]);
    tray.setToolTip('DeskFlow - Time Tracker');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
        // Always show and focus the window when tray is clicked
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
    console.log('[DeskFlow] ✅ System tray created');
}
function createWindow() {
    electron_1.Menu.setApplicationMenu(null);
    const preloadPath = path_1.default.join(__dirname, 'preload.cjs');
    console.log('[DeskFlow] Preload path:', preloadPath);
    console.log('[DeskFlow] __dirname:', __dirname);
    
    mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: 'DeskFlow',
        icon: path_1.default.join(__dirname, '../public/deskflow-icon.png'),
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false, // Allow loading local files
        },
        titleBarStyle: 'default',
        backgroundColor: '#0a0a0a',
    });
    const indexPath = path_1.default.join(__dirname, '../dist/index.html');
    console.log('[DeskFlow] Loading index.html from:', indexPath);
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadFile(indexPath);
    }
    // Log loading errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('[DeskFlow] Failed to load:', errorCode, errorDescription);
    });
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('[DeskFlow] Page loaded successfully');
    });
    
    // CRITICAL: Call pollForeground ONCE immediately on startup to detect current app
    // This fixes the issue where tracking doesn't start until app CHANGE is detected
    pollForeground();
    
    // Start polling (every 2 seconds — like active-win spec)
    trackingInterval = setInterval(pollForeground, 2000);
    // Send tracking heartbeat to renderer every 5 seconds
    const heartbeatInterval = setInterval(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('tracking-heartbeat', {
                isTracking,
                currentApp,
                uptime: Date.now()
            });
        }
    }, 5000);
    mainWindow.on('closed', () => {
        if (trackingInterval)
            clearInterval(trackingInterval);
        if (heartbeatInterval)
            clearInterval(heartbeatInterval);
        mainWindow = null;
    });
    mainWindow.on('close', (event) => {
        if (!electron_1.app.isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });

    // Toggle DevTools with Ctrl+Shift+I - only when app window is focused
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()) {
            if (input.key === 'I' && input.control && input.shift) {
                event.preventDefault();
                if (mainWindow.webContents.isDevToolsOpened()) {
                    mainWindow.webContents.closeDevTools();
                } else {
                    mainWindow.webContents.openDevTools();
                }
            }
        }
    });
}
// --- IPC handlers ---
electron_1.ipcMain.handle('get-logs', () => {
    try {
        return getLogs();
    }
    catch (err) {
        console.error('[DeskFlow] get-logs error:', err);
        return [];
    }
});
// App control IPC handlers
electron_1.ipcMain.handle('quit-app', () => {
    electron_1.app.isQuitting = true;
    electron_1.app.quit();
});
electron_1.ipcMain.handle('show-window', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});
electron_1.ipcMain.handle('get-auto-start-status', () => {
    return electron_1.app.getLoginItemSettings().openAtLogin;
});
electron_1.ipcMain.handle('set-auto-start', (_event, enabled) => {
    const exePath = electron_1.app.isPackaged 
        ? process.execPath 
        : electron_1.app.getPath('exe');
    
    electron_1.app.setLoginItemSettings({
        openAtLogin: enabled,
        openAsHidden: true,
        path: exePath,
        args: enabled ? ['--minimized'] : []
    });
    return enabled;
});
// Migrate old logs to new schema (daily_aggregates)
electron_1.ipcMain.handle('migrate-to-aggregates', () => {
    if (useJson) {
        return { success: false, message: 'JSON mode - migration not needed' };
    }
    try {
        // Aggregate logs into daily_aggregates
        const result = db.prepare(`
      INSERT INTO daily_aggregates (date, app, category, total_sec, session_count)
      SELECT 
        date(timestamp) as date,
        app,
        category,
        SUM(duration_ms / 1000) as total_sec,
        COUNT(*) as session_count
      FROM logs
      WHERE timestamp IS NOT NULL
      GROUP BY date(timestamp), app, category
      ON CONFLICT(date, app) DO UPDATE SET
        total_sec = excluded.total_sec,
        session_count = excluded.session_count
    `).run();
        // Also aggregate browser sessions
        const browserResult = db.prepare(`
      INSERT INTO browser_sessions (date, domain, category, total_sec, session_count)
      SELECT 
        date(timestamp) as date,
        domain,
        category,
        SUM(duration_ms / 1000) as total_sec,
        COUNT(*) as session_count
      FROM logs
      WHERE is_browser_tracking = 1 AND domain IS NOT NULL
      GROUP BY date(timestamp), domain
      ON CONFLICT(date, domain) DO UPDATE SET
        total_sec = excluded.total_sec,
        session_count = excluded.session_count
    `).run();
        console.log('[DeskFlow] ✅ Migration complete:', result.changes, 'aggregates updated');
        return {
            success: true,
            aggregatesUpdated: result.changes,
            browserAggregatesUpdated: browserResult.changes
        };
    }
    catch (err) {
        console.error('[DeskFlow] Migration error:', err);
        return { success: false, message: err.message };
    }
});
// Get data from new tables
electron_1.ipcMain.handle('get-daily-aggregates', () => {
    if (useJson)
        return [];
    try {
        return db.prepare('SELECT * FROM daily_aggregates ORDER BY date DESC, total_sec DESC').all();
    }
    catch (err) {
        console.error('[DeskFlow] get-daily-aggregates error:', err);
        return [];
    }
});
electron_1.ipcMain.handle('get-browser-sessions', () => {
    if (useJson)
        return [];
    try {
        return db.prepare('SELECT * FROM browser_sessions ORDER BY date DESC, total_sec DESC').all();
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-sessions error:', err);
        return [];
    }
});
electron_1.ipcMain.handle('get-sessions', () => {
    if (useJson)
        return [];
    try {
        return db.prepare('SELECT * FROM sessions WHERE is_active = 1 ORDER BY start_time DESC').all();
    }
    catch (err) {
        console.error('[DeskFlow] get-sessions error:', err);
        return [];
    }
});
electron_1.ipcMain.handle('get-table-schema', (event, tableName) => {
    if (useJson)
        return { error: 'JSON mode' };
    try {
        const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
        return stmt.all();
    }
    catch (err) {
        console.error('[DeskFlow] get-table-schema error:', err);
        return { error: err.message };
    }
});
electron_1.ipcMain.handle('get-database-tables', () => {
    if (useJson)
        return { tables: [], type: 'json' };
    try {
        const stmt = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        return { tables: stmt.all().map((t) => t.name), type: 'sqlite' };
    }
    catch (err) {
        console.error('[DeskFlow] get-database-tables error:', err);
        return { tables: [], error: err.message };
    }
});
electron_1.ipcMain.handle('get-table-data', (event, tableName, limit = 50) => {
    if (useJson)
        return { error: 'JSON mode' };
    try {
        const stmt = db.prepare(`SELECT * FROM ${tableName} ORDER BY ROWID DESC LIMIT ?`);
        return stmt.all(limit);
    }
    catch (err) {
        console.error('[DeskFlow] get-table-data error:', err);
        return { error: err.message };
    }
});

electron_1.ipcMain.handle('update-categories-from-overrides', (event, appOverrides, domainOverrides) => {
    if (useJson) {
        try {
            let updatedCount = 0;
            jsonLogs = jsonLogs.map(log => {
                // Check app overrides
                const appKey = log.app?.toLowerCase();
                if (appKey && appOverrides[appKey]) {
                    log.category = appOverrides[appKey];
                    updatedCount++;
                }
                // Check domain overrides for browser-tracked logs
                else if (log.is_browser_tracking && log.domain) {
                    const domainKey = log.domain.toLowerCase();
                    if (domainOverrides[domainKey]) {
                        log.category = domainOverrides[domainKey];
                        updatedCount++;
                    }
                }
                return log;
            });
            saveJsonLogs();
            console.log('[DeskFlow] Updated categories for', updatedCount, 'logs');
            return { success: true, updatedCount };
        }
        catch (err) {
            console.error('[DeskFlow] update-categories-from-overrides error:', err);
            return { success: false, updatedCount: 0, error: err.message };
        }
    }
    try {
        let updatedCount = 0;
        // Update app categories
        for (const [appName, category] of Object.entries(appOverrides)) {
            const stmt = db.prepare('UPDATE logs SET category = ? WHERE LOWER(app) = ?');
            const result = stmt.run(category, appName.toLowerCase());
            updatedCount += result.changes;
        }
        // Update domain categories for browser-tracked logs
        for (const [domain, category] of Object.entries(domainOverrides)) {
            const stmt = db.prepare('UPDATE logs SET category = ? WHERE LOWER(domain) = ? AND is_browser_tracking = 1');
            const result = stmt.run(category, domain.toLowerCase());
            updatedCount += result.changes;
        }
        console.log('[DeskFlow] Updated categories for', updatedCount, 'logs');
        return { success: true, updatedCount };
    }
    catch (err) {
        console.error('[DeskFlow] update-categories-from-overrides error:', err);
        return { success: false, updatedCount: 0, error: err.message };
    }
});

electron_1.ipcMain.handle('get-stats', () => {
    try {
        return getStats();
    }
    catch (err) {
        console.error('[DeskFlow] get-stats error:', err);
        return [];
    }
});
electron_1.ipcMain.handle('toggle-tracking', () => {
    isTracking = !isTracking;
    console.log('[DeskFlow] Tracking:', isTracking ? 'ON' : 'OFF');
    return isTracking;
});
electron_1.ipcMain.handle('clear-data', () => {
    try {
        if (useJson) {
            jsonLogs = [];
            saveJsonLogs();
        }
        else {
            db.exec('DELETE FROM logs');
        }
        console.log('[DeskFlow] Data cleared');
        return true;
    }
    catch (err) {
        console.error('[DeskFlow] clear-data error:', err);
        return false;
    }
});
// Clear only today's logs (preserve historical data)
electron_1.ipcMain.handle('clear-today', () => {
    try {
        const todayStr = new Date().toISOString().split('T')[0];
        if (useJson) {
            jsonLogs = jsonLogs.filter(l => !l.timestamp.startsWith(todayStr));
            saveJsonLogs();
        }
        else {
            db.prepare(`DELETE FROM logs WHERE timestamp >= ?`).run(`${todayStr}T00:00:00`);
        }
        console.log('[DeskFlow] Today\'s data cleared');
        return true;
    }
    catch (err) {
        console.error('[DeskFlow] clear-today error:', err);
        return false;
    }
});
electron_1.ipcMain.handle('get-db-path', () => dbPath);
// Storage health check
electron_1.ipcMain.handle('get-storage-status', () => {
    return {
        type: useJson ? 'json' : 'sqlite',
        working: db !== null || useJson,
        path: useJson ? jsonPath : dbPath,
        error: storageError,
        logCount: useJson ? jsonLogs.length : (db ? db.prepare('SELECT COUNT(*) as count FROM logs').get().count : 0)
    };
});
// Get/set user preferences (category overrides, custom colors)
interface UserPreferences {
    browserTrackingPort?: number;
    browserTrackingEnabled?: boolean;
    browserExcludedDomains?: string[];
    browserWithExtension?: string;
    mainBrowser?: string;
    [key: string]: any;
}
let userPreferences: UserPreferences = {};
const prefsPath = path_1.default.join(userDataPath, 'deskflow-prefs.json');
function loadPreferences() {
    try {
        if (fs_1.default.existsSync(prefsPath)) {
            const data = fs_1.default.readFileSync(prefsPath, 'utf-8');
            userPreferences = JSON.parse(data);
            console.log('[DeskFlow] 📄 Loaded preferences');
        }
    }
    catch (err) {
        console.warn('[DeskFlow] Failed to load preferences:', err);
        userPreferences = {};
    }
}
function savePreferences() {
    try {
        fs_1.default.writeFileSync(prefsPath, JSON.stringify(userPreferences, null, 2));
    }
    catch (err) {
        console.error('[DeskFlow] Failed to save preferences:', err);
    }
}
// Load preferences on startup
loadPreferences();
electron_1.ipcMain.handle('get-preferences', () => {
    return userPreferences;
});
electron_1.ipcMain.handle('set-preference', (event, key, value) => {
    userPreferences[key] = value;
    savePreferences();
    return true;
});
// Category Configuration IPC Handlers
electron_1.ipcMain.handle('get-category-config', () => {
    return categoryConfig;
});
electron_1.ipcMain.handle('set-app-category', (event, appName, category) => {
    categoryConfig.appCategoryMap[appName] = category;
    saveCategoryConfig();
    return true;
});
electron_1.ipcMain.handle('set-domain-category', (event, domain, category) => {
    categoryConfig.domainCategoryMap[domain.toLowerCase()] = category;
    saveCategoryConfig();
    return true;
});
electron_1.ipcMain.handle('set-app-tier', (event, appName, tier) => {
    categoryConfig.appTierMap[appName] = tier;
    saveCategoryConfig();
    return true;
});
electron_1.ipcMain.handle('set-domain-tier', (event, domain, tier) => {
    categoryConfig.domainTierMap[domain.toLowerCase()] = tier;
    saveCategoryConfig();
    return true;
});

// NEW: Set keyword rules for a domain (for keyword-based productivity categorization)
// Now takes array of { category: string; keywords: string[] }
electron_1.ipcMain.handle('set-domain-keyword-rules', (event, domain, keywordSets) => {
    categoryConfig.domainKeywordRules = categoryConfig.domainKeywordRules || {};
    categoryConfig.domainKeywordRules[domain.toLowerCase()] = keywordSets;
    saveCategoryConfig();
    console.log(`[DeskFlow] Updated keyword rules for ${domain}:`, JSON.stringify(keywordSets));
    return true;
});

// NEW: Get keyword rules for a domain
electron_1.ipcMain.handle('get-domain-keyword-rules', (event, domain) => {
    return categoryConfig.domainKeywordRules?.[domain.toLowerCase()] || 
           DEFAULT_KEYWORD_RULES[domain.toLowerCase()] || [];
});

// NEW: Set default category for a domain (when keywords don't match)
electron_1.ipcMain.handle('set-domain-default-category', (event, domain, category) => {
    categoryConfig.domainDefaultCategories = categoryConfig.domainDefaultCategories || {};
    categoryConfig.domainDefaultCategories[domain.toLowerCase()] = category;
    saveCategoryConfig();
    console.log(`[DeskFlow] Updated default category for ${domain}: ${category}`);
    return true;
});

// NEW: Get default category for a domain (legacy - now falls back to Category Overrides)
electron_1.ipcMain.handle('get-domain-default-category', (event, domain) => {
    return categoryConfig.domainDefaultCategories?.[domain.toLowerCase()] || 'Entertainment';
});

// NEW: Get all domains with keyword rules enabled
electron_1.ipcMain.handle('get-keyword-enabled-domains', () => {
    return Object.keys(categoryConfig.domainKeywordRules || {});
});

// NEW: Add a new domain with keyword sets (array of { category, keywords })
// This replaces the old add-keyword-domain that took keywords + defaultCategory
electron_1.ipcMain.handle('add-keyword-domain', (event, domain, keywordSets) => {
    categoryConfig.domainKeywordRules = categoryConfig.domainKeywordRules || {};
    categoryConfig.domainKeywordRules[domain.toLowerCase()] = keywordSets;
    saveCategoryConfig();
    console.log(`[DeskFlow] Added keyword domain: ${domain} with`, JSON.stringify(keywordSets));
    return true;
});

// NEW: Remove keyword rules for a domain (revert to default categorization)
electron_1.ipcMain.handle('remove-keyword-domain', (event, domain) => {
    if (categoryConfig.domainKeywordRules) {
        delete categoryConfig.domainKeywordRules[domain.toLowerCase()];
    }
    if (categoryConfig.domainDefaultCategories) {
        delete categoryConfig.domainDefaultCategories[domain.toLowerCase()];
    }
    saveCategoryConfig();
    console.log(`[DeskFlow] Removed keyword domain: ${domain}`);
    return true;
});

electron_1.ipcMain.handle('set-tier-assignments', (event, assignments) => {
    categoryConfig.tierAssignments = assignments;
    saveCategoryConfig();
    return true;
});

// Apply category changes to historical data
electron_1.ipcMain.handle('apply-category-to-historical', async (event, tierAssignments) => {
    if (useJson) {
        return { success: false, message: 'Not available in JSON mode' };
    }
    try {
        console.log('[DeskFlow] Applying category changes to historical data...');
        
        // For each category, find all logs that match and update their category
        // This is done by recalculating categories based on app/domain names
        let updatedCount = 0;
        
        // Get all logs
        const allLogs = db.prepare('SELECT * FROM logs').all();
        
        for (const log of allLogs) {
            const appName = log.app;
            const domain = log.domain;
            
            // Determine new category based on app/domain name
            let newCategory = categorizeApp(appName);
            
            // If browser tracking, check domain
            if (log.is_browser_tracking && domain) {
                newCategory = categorizeDomain(domain, log.title, log.url);
            }
            
            // Update if different
            if (log.category !== newCategory) {
                db.prepare('UPDATE logs SET category = ? WHERE id = ?').run(newCategory, log.id);
                updatedCount++;
            }
        }
        
        // Update aggregated tables
        updateAllAggregates();
        
        console.log(`[DeskFlow] Updated ${updatedCount} historical log categories`);
        return { success: true, updatedCount };
    } catch (err: any) {
        console.error('[DeskFlow] Error applying to historical:', err);
        return { success: false, message: err.message };
    }
});

// Helper function to update all aggregate tables
function updateAllAggregates() {
    try {
        // Clear and rebuild daily_stats
        db.exec('DELETE FROM daily_stats');
        
        const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp').all();
        for (const log of logs) {
            const date = log.timestamp.split('T')[0];
            const duration_sec = Math.floor(log.duration_ms / 1000);
            const app = log.app;
            const category = log.category;
            
            const existing = db.prepare('SELECT id FROM daily_stats WHERE date = ? AND app = ?').get(date, app);
            if (existing) {
                db.prepare('UPDATE daily_stats SET total_sec = total_sec + ?, sessions = sessions + 1 WHERE date = ? AND app = ?')
                    .run(duration_sec, date, app);
            } else {
                db.prepare('INSERT INTO daily_stats (date, app, category, total_sec, sessions) VALUES (?, ?, ?, ?, 1)')
                    .run(date, app, category, duration_sec);
            }
        }
        
        // Clear and rebuild daily_aggregates
        db.exec('DELETE FROM daily_aggregates');
        
        for (const log of logs) {
            const date = log.timestamp.split('T')[0];
            const duration_sec = Math.floor(log.duration_ms / 1000);
            const app = log.app;
            const category = log.category;
            
            const existing = db.prepare('SELECT id FROM daily_aggregates WHERE date = ? AND app = ?').get(date, app);
            if (existing) {
                db.prepare('UPDATE daily_aggregates SET total_sec = total_sec + ?, session_count = session_count + 1 WHERE date = ? AND app = ?')
                    .run(duration_sec, date, app);
            } else {
                db.prepare('INSERT INTO daily_aggregates (date, app, category, total_sec, session_count) VALUES (?, ?, ?, ?, 1)')
                    .run(date, app, category, duration_sec);
            }
        }
        
        // Clear and rebuild browser_sessions
        db.exec('DELETE FROM browser_sessions');
        
        const browserLogs = logs.filter(l => l.is_browser_tracking && l.domain);
        for (const log of browserLogs) {
            const date = log.timestamp.split('T')[0];
            const duration_sec = Math.floor(log.duration_ms / 1000);
            const domain = log.domain;
            const category = log.category;
            
            const existing = db.prepare('SELECT id FROM browser_sessions WHERE date = ? AND domain = ?').get(date, domain);
            if (existing) {
                db.prepare('UPDATE browser_sessions SET total_sec = total_sec + ?, session_count = session_count + 1 WHERE date = ? AND domain = ?')
                    .run(duration_sec, date, domain);
            } else {
                db.prepare('INSERT INTO browser_sessions (date, domain, category, total_sec, session_count) VALUES (?, ?, ?, ?, 1)')
                    .run(date, domain, category, duration_sec);
            }
        }
        
        console.log('[DeskFlow] ✅ All aggregate tables rebuilt');
    } catch (err) {
        console.error('[DeskFlow] Error rebuilding aggregates:', err);
    }
}
electron_1.ipcMain.handle('get-default-categories', () => {
    return DEFAULT_CATEGORIES;
});
electron_1.ipcMain.handle('get-tier-assignments', () => {
    return categoryConfig.tierAssignments;
});
// Get logs filtered by period
electron_1.ipcMain.handle('get-logs-by-period', (event, period) => {
    try {
        if (useJson) {
            const now = new Date();
            let filtered = jsonLogs;
            if (period === 'today') {
                const todayStr = now.toISOString().split('T')[0];
                filtered = jsonLogs.filter(l => l.timestamp.startsWith(todayStr));
            }
            else if (period === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = jsonLogs.filter(l => new Date(l.timestamp) >= weekAgo);
            }
            else if (period === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filtered = jsonLogs.filter(l => new Date(l.timestamp) >= monthAgo);
            }
            return filtered;
        }
        const now = new Date();
        if (period === 'today') {
            const todayStr = now.toISOString().split('T')[0];
            const stmt = db.prepare(`SELECT * FROM logs WHERE timestamp >= ? ORDER BY id DESC`);
            return stmt.all(`${todayStr}T00:00:00`);
        }
        else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const stmt = db.prepare(`SELECT * FROM logs WHERE timestamp >= ? ORDER BY id DESC`);
            return stmt.all(weekAgo);
        }
        else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const stmt = db.prepare(`SELECT * FROM logs WHERE timestamp >= ? ORDER BY id DESC`);
            return stmt.all(monthAgo);
        }
        return getLogs();
    }
    catch (err) {
        console.error('[DeskFlow] get-logs-by-period error:', err);
        return [];
    }
});
// Get daily stats for a period
electron_1.ipcMain.handle('get-daily-stats', (event, period) => {
    try {
        const BROWSER_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge'];
        if (useJson) {
            // Compute from JSON logs
            const now = new Date();
            let filtered = jsonLogs.filter(l => !BROWSER_APPS.includes(l.app.toLowerCase())); // Exclude generic browser apps
            if (period === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(l => new Date(l.timestamp) >= weekAgo);
            }
            else if (period === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(l => new Date(l.timestamp) >= monthAgo);
            }
            // FIX 3: Group by date + app (use domain for browser entries)
            const grouped = {};
            for (const log of filtered) {
                const date = log.timestamp.split('T')[0];
                const appName = log.is_browser_tracking && log.domain ? log.domain : log.app;
                if (!grouped[date])
                    grouped[date] = {};
                if (!grouped[date][appName])
                    grouped[date][appName] = { total_sec: 0, sessions: 0, app: appName, category: log.category };
                grouped[date][appName].total_sec += Math.floor(log.duration_ms / 1000);
                grouped[date][appName].sessions += 1;
            }
            return grouped;
        }
        const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        // FIX 3: Use domain as app name for browser entries, exclude generic browser apps
        const stmt = db.prepare(`
      SELECT
        date(timestamp) as day,
        CASE
          WHEN is_browser_tracking = 1 AND domain IS NOT NULL AND domain != '' THEN domain
          ELSE app
        END as app,
        category,
        SUM(duration_ms) / 1000 as total_sec,
        COUNT(*) as sessions,
        AVG(duration_ms) / 1000 as avg_session_sec
      FROM logs
      WHERE date(timestamp) >= ?
        AND LOWER(app) NOT IN ('chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge')
      GROUP BY day,
        CASE
          WHEN is_browser_tracking = 1 AND domain IS NOT NULL AND domain != '' THEN domain
          ELSE app
        END
      ORDER BY day DESC, total_sec DESC
    `);
        return stmt.all(cutoff);
    }
    catch (err) {
        console.error('[DeskFlow] get-daily-stats error:', err);
        return [];
    }
});
// Get per-app detailed stats - with optional period filtering
electron_1.ipcMain.handle('get-app-stats', (event, period?: 'today' | 'week' | 'month' | 'all') => {
    try {
        const BROWSER_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge'];
        
        // Calculate date range based on period
        let startDate: string | null = null;
        const now = new Date();
        
        if (period === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            startDate = weekAgo.toISOString();
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            startDate = monthAgo.toISOString();
        }
        console.log('[DeskFlow] get-app-stats called with period:', period, 'startDate:', startDate);
        // 'all' or undefined = no filter
        
        if (useJson) {
            let filteredLogs = jsonLogs;
            if (startDate) {
                filteredLogs = jsonLogs.filter(l => l.timestamp >= startDate);
            }
            const stats = new Map();
            filteredLogs.forEach((log) => {
                // Skip generic browser entries (individual domains tracked separately)
                if (BROWSER_APPS.includes(log.app.toLowerCase()))
                    return;
                // Skip browser-tracked entries (websites) - only show desktop apps
                if (log.is_browser_tracking)
                    return;
                // Use actual app name (not domain)
                const appName = log.app;
                const existing = stats.get(appName) || { total_ms: 0, sessions: 0, first_seen: log.timestamp, last_seen: log.timestamp, category: log.category || 'Other' };
                existing.total_ms += log.duration_ms;
                existing.sessions += 1;
                if (log.timestamp < existing.first_seen)
                    existing.first_seen = log.timestamp;
                if (log.timestamp > existing.last_seen)
                    existing.last_seen = log.timestamp;
                stats.set(appName, existing);
            });
            return Array.from(stats.entries()).map(([app, data]) => ({
                app,
                ...data,
                avg_session_ms: data.sessions > 0 ? data.total_ms / data.sessions : 0
            })).sort((a, b) => b.total_ms - a.total_ms);
        }
        // SQLite query with optional date filtering
        let query = `
      SELECT
        app,
        category,
        SUM(duration_ms) as total_ms,
        COUNT(*) as sessions,
        AVG(duration_ms) as avg_session_ms,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen
      FROM logs
      WHERE LOWER(app) NOT IN ('chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge')
        AND (is_browser_tracking IS NULL OR is_browser_tracking = 0)
    `;
        const params: string[] = [];
        if (startDate) {
            query += ` AND timestamp >= ?`;
            params.push(startDate);
        }
        query += ` GROUP BY app ORDER BY total_ms DESC`;
        
        const stmt = db.prepare(query);
        const result = stmt.all(...params);
        console.log('[DeskFlow] get-app-stats returning', result.length, 'apps, total ms:', result.reduce((sum, r) => sum + (r.total_ms || 0), 0));
        return result;
    }
    catch (err) {
        console.error('[DeskFlow] get-app-stats error:', err);
        return [];
    }
});
// Get daily productivity data
electron_1.ipcMain.handle('get-daily-productivity', (event, date) => {
    try {
        const BROWSER_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge'];
        const dayStart = `${date}T00:00:00`;
        const dayEnd = `${date}T23:59:59`;
        let dayLogs;
        if (useJson) {
            dayLogs = jsonLogs.filter(l => l.timestamp >= dayStart &&
                l.timestamp <= dayEnd &&
                !BROWSER_APPS.includes(l.app.toLowerCase()));
        }
        else {
            const stmt = db.prepare(`
        SELECT * FROM logs
        WHERE timestamp >= ? AND timestamp <= ?
          AND LOWER(app) NOT IN ('chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge')
        ORDER BY timestamp
      `);
            dayLogs = stmt.all(dayStart, dayEnd);
        }
        const productivity = calculateProductivityScore(dayLogs);
        // Calculate wall-clock time (first log to last log)
        let wallClockSec = 0;
        if (dayLogs.length > 0) {
            const timestamps = dayLogs.map(l => new Date(l.timestamp).getTime());
            const first = Math.min(...timestamps);
            const last = Math.max(...timestamps);
            wallClockSec = Math.floor(Math.max(0, (last - first) / 1000));
        }
        return {
            date,
            ...productivity,
            wall_clock_sec: wallClockSec,
            total_sessions: dayLogs.length,
            first_activity: dayLogs.length > 0 ? dayLogs[0].timestamp : null,
            last_activity: dayLogs.length > 0 ? dayLogs[dayLogs.length - 1].timestamp : null
        };
    }
    catch (err) {
        console.error('[DeskFlow] get-daily-productivity error:', err);
        return null;
    }
});
// Get productivity data for a date range
electron_1.ipcMain.handle('get-productivity-range', (event, startDate, endDate) => {
    try {
        const BROWSER_APPS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge'];
        let allLogs;
        if (useJson) {
            allLogs = jsonLogs.filter(l => l.timestamp >= `${startDate}T00:00:00` &&
                l.timestamp <= `${endDate}T23:59:59` &&
                !BROWSER_APPS.includes(l.app.toLowerCase()));
        }
        else {
            const stmt = db.prepare(`
        SELECT * FROM logs
        WHERE timestamp >= ? AND timestamp <= ?
          AND LOWER(app) NOT IN ('chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'google chrome', 'microsoft edge')
        ORDER BY timestamp
      `);
            allLogs = stmt.all(`${startDate}T00:00:00`, `${endDate}T23:59:59`);
        }
        // Group by date
        const groupedByDate: Record<string, any[]> = {};
        for (const log of allLogs) {
            const date = log.timestamp.split('T')[0];
            if (!groupedByDate[date])
                groupedByDate[date] = [];
            groupedByDate[date].push(log);
        }
        // Calculate productivity for each date
        const results = Object.entries(groupedByDate).map(([date, logs]: [string, any[]]) => {
            const productivity = calculateProductivityScore(logs);
            let wallClockSec = 0;
            if (logs.length > 0) {
                const timestamps = logs.map(l => new Date(l.timestamp).getTime());
                const first = Math.min(...timestamps);
                const last = Math.max(...timestamps);
                wallClockSec = Math.floor(Math.max(0, (last - first) / 1000));
            }
            return {
                date,
                ...productivity,
                wall_clock_sec: wallClockSec,
                total_sessions: logs.length
            };
        });
        return results.sort((a, b) => a.date.localeCompare(b.date));
    }
    catch (err) {
        console.error('[DeskFlow] get-productivity-range error:', err);
        return [];
    }
});
// --- Browser Tracking IPC Handlers ---
// Get browser logs - with optional period filtering
electron_1.ipcMain.handle('get-browser-logs', (event, period?: 'today' | 'week' | 'month' | 'all') => {
    try {
        return getBrowserLogs(period);
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-logs error:', err);
        return [];
    }
});
// Get browser stats grouped by domain - with optional period filtering
electron_1.ipcMain.handle('get-browser-domain-stats', (event, period?: 'today' | 'week' | 'month' | 'all') => {
    try {
        return getBrowserDomainStats(period);
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-domain-stats error:', err);
        return [];
    }
});
electron_1.ipcMain.handle('get-browser-category-stats', (event, period?: 'today' | 'week' | 'month' | 'all') => {
    try {
        return getBrowserCategoryStats(period);
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-category-stats error:', err);
        return [];
    }
});
electron_1.ipcMain.handle('get-available-browsers', async () => {
    const browsers: string[] = [];
    const platform = process.platform;
    
    try {
        if (platform === 'win32') {
            const browserPaths: Record<string, string> = {
                'chrome': path_1.default.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
                'firefox': path_1.default.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Mozilla Firefox', 'firefox.exe'),
                'edge': path_1.default.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
                'brave': path_1.default.join(process.env.LOCALAPPDATA || '', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
                'opera': path_1.default.join(process.env.APPDATA || '', 'Opera Software', 'Opera Stable', 'opera.exe'),
                'vivaldi': path_1.default.join(process.env.LOCALAPPDATA || '', 'Vivaldi', 'Application', 'vivaldi.exe'),
            };
            
            for (const [browser, browserPath] of Object.entries(browserPaths)) {
                try {
                    await fs_1.default.promises.access(browserPath);
                    browsers.push(browser);
                } catch {
                    // Browser not found at that path
                }
            }
        } else if (platform === 'darwin') {
            const macBrowserPaths: Record<string, string> = {
                'chrome': '/Applications/Google Chrome.app',
                'firefox': '/Applications/Firefox.app',
                'safari': '/Applications/Safari.app',
                'brave': '/Applications/Brave Browser.app',
                'arc': '/Applications/Arc.app',
                'edge': '/Applications/Microsoft Edge.app',
                'opera': '/Applications/Opera.app',
                'vivaldi': '/Applications/Vivaldi.app',
            };
            
            for (const [browser, browserPath] of Object.entries(macBrowserPaths)) {
                try {
                    await fs_1.default.promises.access(browserPath);
                    browsers.push(browser);
                } catch {
                    // Browser not found
                }
            }
        } else {
            // Linux
            browsers.push('chrome', 'firefox', 'brave', 'edge', 'chromium');
        }
    } catch (err) {
        console.error('[DeskFlow] Error detecting browsers:', err);
    }
    
    // Always include Chrome as fallback if none found
    if (browsers.length === 0) {
        browsers.push('chrome', 'firefox', 'edge');
    }
    
    console.log('[DeskFlow] Detected browsers:', browsers);
    return browsers;
});

const KNOWN_BROWSERS = ['chrome', 'firefox', 'safari', 'edge', 'brave', 'opera', 'vivaldi', 'arc'];

electron_1.ipcMain.handle('get-tracked-browsers', async () => {
    const browsers: string[] = [];
    try {
        // Get ALL apps categorized as "Browser" from the database
        if (db) {
            const rows = db.prepare(`
                SELECT DISTINCT app FROM logs 
                WHERE LOWER(category) = 'browser'
            `).all() as { app: string }[];
            rows.forEach(row => {
                if (row.app && !browsers.includes(row.app)) {
                    browsers.push(row.app);
                }
            });
        } else if (useJson && jsonLogs.length > 0) {
            const seen = new Set<string>();
            jsonLogs.forEach(log => {
                const cat = (log.category || '').toLowerCase();
                if (cat === 'browser' && !seen.has(log.app)) {
                    seen.add(log.app);
                    browsers.push(log.app);
                }
            });
        }
        // Also check category config for apps mapped to "Browser" category
        if (categoryConfig?.appCategoryMap) {
            for (const [app, cat] of Object.entries(categoryConfig.appCategoryMap)) {
                if (cat === 'Browser' && !browsers.includes(app)) {
                    browsers.push(app);
                }
            }
        }
    } catch (err) {
        console.error('[DeskFlow] Error getting tracked browsers:', err);
    }
    // The browser with the extension should appear first in the list
    const extensionBrowser = userPreferences.browserWithExtension;
    if (extensionBrowser) {
        const idx = browsers.findIndex(b => b.toLowerCase() === extensionBrowser.toLowerCase());
        if (idx > 0) {
            browsers.splice(idx, 1);
            browsers.unshift(extensionBrowser);
        } else if (idx === -1) {
            // Add the extension browser even if not in DB yet
            browsers.unshift(extensionBrowser);
        }
    }
    console.log('[DeskFlow] Tracked browser apps:', browsers);
    return browsers;
});

electron_1.ipcMain.handle('get-browser-tracking', () => {
    return isBrowserTrackingEnabled;
});
electron_1.ipcMain.handle('set-browser-tracking', (event, enabled) => {
    isBrowserTrackingEnabled = enabled;
    userPreferences.browserTrackingEnabled = enabled;
    savePreferences();
    console.log(`[DeskFlow] Browser tracking: ${enabled ? 'ON' : 'OFF'}`);
    // Restart server if needed
    if (enabled && !browserServer) {
        startBrowserTrackingServer();
    }
    else if (!enabled && browserServer) {
        browserServer.close();
        browserServer = null;
        stopBrowserSessionFlushTimer(); // FIX 2: Stop the flush timer too
        console.log('[DeskFlow] 🚫 Browser tracking server stopped');
    }
    return enabled;
});
electron_1.ipcMain.handle('get-browser-tracking-status', () => {
    return {
        enabled: isBrowserTrackingEnabled,
        serverRunning: browserServer !== null,
        port: browserServerPort,
        excludedDomains: browserExcludedDomains
    };
});
electron_1.ipcMain.handle('set-browser-excluded-domains', (event, domains) => {
    browserExcludedDomains = domains;
    userPreferences.browserExcludedDomains = domains;
    savePreferences();
    return true;
});
electron_1.ipcMain.handle('set-browser-with-extension', (event, browser: string) => {
    userPreferences.browserWithExtension = browser;
    savePreferences();
    console.log(`[DeskFlow] Browser with extension set to: ${browser}`);
    return true;
});
// Clean corrupted data - improved detection for multiple error types
electron_1.ipcMain.handle('clean-corrupted-data', () => {
    try {
        let deletedCount = 0;
        const cutoffDuration = MAX_LOGGED_SESSION_MS; // 1 hour (3600000ms)
        const now = new Date().toISOString();
        if (useJson) {
            // For JSON: filter out corrupted entries with multiple criteria
            const beforeCount = jsonLogs.length;
            jsonLogs = jsonLogs.filter(log => {
                const durationSec = (log.duration_ms || 0) / 1000;
                const logTime = new Date(log.timestamp);
                const nowDate = new Date();
                // 1. Duration > 1 hour (corrupted)
                if (log.duration_ms > cutoffDuration)
                    return false;
                // 2. Impossible timestamps (start > end would mean negative duration, checked above)
                // 3. Future dates
                if (logTime > nowDate)
                    return false;
                // 4. Zero or negative duration
                if (durationSec <= 0)
                    return false;
                return true;
            });
            deletedCount = beforeCount - jsonLogs.length;
            saveJsonLogs();
            console.log(`[DeskFlow] 🧹 Cleaned ${deletedCount} corrupted entries from JSON`);
        }
        else {
            // For SQLite: delete entries with multiple criteria
            // 1. Duration > 1 hour
            const result1 = db.prepare(`DELETE FROM logs WHERE duration_ms > ?`).run(cutoffDuration);
            // 2. Future timestamps
            const result2 = db.prepare(`DELETE FROM logs WHERE timestamp > ?`).run(now);
            // 3. Zero or negative duration
            const result3 = db.prepare(`DELETE FROM logs WHERE duration_ms <= 0`).run();
            // 4. Null timestamps
            const result4 = db.prepare(`DELETE FROM logs WHERE timestamp IS NULL OR timestamp = ''`).run();
            deletedCount = result1.changes + result2.changes + result3.changes + result4.changes;
            // Also clean the new aggregate tables
            const aggResult = db.prepare(`DELETE FROM daily_aggregates WHERE total_sec > 86400`).run(); // > 24 hours
            const browserResult = db.prepare(`DELETE FROM browser_sessions WHERE total_sec > 86400`).run();
            console.log(`[DeskFlow] 🧹 Cleaned ${deletedCount} corrupted entries from SQLite`);
        }
        return { success: true, deletedCount };
    }
    catch (err) {
        console.error('[DeskFlow] clean-corrupted-data error:', err);
        return { success: false, deletedCount: 0, error: err.message };
    }
});
// Deep cleanup - removes all raw logs and rebuilds aggregates from scratch
electron_1.ipcMain.handle('deep-clean-and-rebuild', () => {
    try {
        if (useJson) {
            return { success: false, message: 'JSON mode - use clear-data instead' };
        }

        // Clear all raw logs
        const logsCleared = db.prepare(`DELETE FROM logs`).run();
        // Clear aggregate tables
        const aggCleared = db.prepare(`DELETE FROM daily_aggregates`).run();
        const browserCleared = db.prepare(`DELETE FROM browser_sessions`).run();
        const sessionsCleared = db.prepare(`DELETE FROM sessions`).run();
        // Reset auto-increment counters
        db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('logs', 'daily_aggregates', 'browser_sessions', 'sessions')`);
        console.log(`[DeskFlow] 🔥 Deep clean complete: ${logsCleared.changes} logs, ${aggCleared.changes} aggregates cleared`);
        return {
            success: true,
            logsCleared: logsCleared.changes,
            aggregatesCleared: aggCleared.changes
        };
    }
    catch (err) {
        console.error('[DeskFlow] deep-clean error:', err);
        return { success: false, message: err.message };
    }
});

// ========== IDE Projects IPC Handlers ==========

// Async exec with timeout helper
function execAsync(cmd: string, timeout = 5000): Promise<{ stdout: string; stderr: string } | null> {
    return new Promise((resolve) => {
        const { exec } = require('child_process');
        const child = exec(cmd, { timeout }, (err: any, stdout: string, stderr: string) => {
            if (err) resolve(null);
            else resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        });
        setTimeout(() => {
            child.kill();
            resolve(null);
        }, timeout);
    });
}

// Expand environment variables in path
function expandPath(p: string): string {
    if (process.platform !== 'win32') return p;
    const { execSync } = require('child_process');
    try {
        return execSync(`echo ${p}`, { encoding: 'utf8' }).trim();
    } catch {
        return p;
    }
}

// Check if path exists (handles expanded env vars)
function pathExists(p: string): boolean {
    try {
        return fs_1.default.existsSync(p);
    } catch {
        return false;
    }
}

// Detect installed IDEs
electron_1.ipcMain.handle('detect-ides', async () => {
    const { execSync } = require('child_process');
    const ides = [];
    const idSet = new Set<string>();

    // Helper to add IDE (avoid duplicates)
    const addIde = (ide: { id: string; name: string; version: string; installPath: string }) => {
        if (!idSet.has(ide.id)) {
            idSet.add(ide.id);
            ides.push(ide);
        }
    };

    // Detect VS Code
    try {
        const vscodePath = process.platform === 'win32'
            ? execSync('where code 2>nul', { encoding: 'utf8' }).trim().split('\n')[0]
            : execSync('which code', { encoding: 'utf8' }).trim();

        let version = '';
        try {
            version = execSync('code --version 2>/dev/null', { encoding: 'utf8' }).trim().split('\n')[0];
        } catch {}

        addIde({
            id: 'vscode',
            name: 'VS Code',
            version,
            installPath: vscodePath
        });

        // Get VS Code extensions (async, don't block)
        setTimeout(() => {
            try {
                const extOutput = execSync('code --list-extensions 2>/dev/null', { encoding: 'utf8', timeout: 10000 });
                const extensions = extOutput.trim().split('\n').filter(Boolean).map(ext => {
                    const [publisher, ...nameParts] = ext.split('.');
                    return {
                        id: ext,
                        ideId: 'vscode',
                        publisher,
                        name: nameParts.join('.'),
                        enabled: true
                    };
                });

                if (!useJson && db) {
                    for (const ext of extensions) {
                        try {
                            db.prepare(`
                                INSERT OR REPLACE INTO extensions (id, ide_id, publisher, name, enabled)
                                VALUES (?, ?, ?, ?, ?)
                            `).run(ext.id, ext.ideId, ext.publisher, ext.name, ext.enabled ? 1 : 0);
                        } catch {}
                    }
                }
            } catch {}
        }, 0);
    } catch {}

    // Detect Cursor IDE
    const cursorPaths = process.platform === 'win32'
        ? [path_1.default.join(process.env.LOCALAPPDATA || '', 'Programs', 'cursor', 'Cursor.exe'),
           path_1.default.join(process.env.APPDATA || '', 'Cursor')]
        : ['/Applications/Cursor.app', path_1.default.join(require('os').homedir(), 'Library/Application Support/Cursor')];

    for (const cursorPath of cursorPaths) {
        if (pathExists(cursorPath)) {
            let version = '';
            try {
                version = execSync('cursor --version 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim();
            } catch {}
            addIde({
                id: 'cursor',
                name: 'Cursor',
                version,
                installPath: cursorPath
            });
            break;
        }
    }

    // Detect JetBrains IDEs using 'where' command (like VS Code)
    const jetbrainsCommands = [
        { cmd: 'idea', name: 'IntelliJ IDEA', id: 'intellij' },
        { cmd: 'idea64', name: 'IntelliJ IDEA', id: 'intellij' },
        { cmd: 'pycharm', name: 'PyCharm', id: 'pycharm' },
        { cmd: 'pycharm64', name: 'PyCharm', id: 'pycharm' },
        { cmd: 'webstorm', name: 'WebStorm', id: 'webstorm' },
        { cmd: 'webstorm64', name: 'WebStorm', id: 'webstorm' },
        { cmd: 'goland', name: 'GoLand', id: 'goland' },
        { cmd: 'goland64', name: 'GoLand', id: 'goland' },
        { cmd: 'rider', name: 'Rider', id: 'rider' },
        { cmd: 'rider64', name: 'Rider', id: 'rider' },
    ];

    for (const { cmd, name, id } of jetbrainsCommands) {
        try {
            const jetbrainsPath = process.platform === 'win32'
                ? execSync(`where ${cmd} 2>nul`, { encoding: 'utf8' }).trim().split('\n')[0]
                : execSync(`which ${cmd} 2>/dev/null`, { encoding: 'utf8' }).trim();
            if (jetbrainsPath) {
                let version = '';
                try {
                    version = execSync(`${cmd} --version 2>/dev/null`, { encoding: 'utf8', timeout: 3000 }).trim().split('\n')[0];
                } catch {}
                addIde({
                    id,
                    name,
                    version,
                    installPath: jetbrainsPath
                });
            }
        } catch {}
    }

    // Detect JetBrains IDEs via Toolbox (multiple formats supported)
    const toolboxBase = path_1.default.join(process.env.APPDATA || '', 'JetBrains', 'Toolbox', 'apps');
    if (pathExists(toolboxBase)) {
        try {
            const appDirs = fs_1.default.readdirSync(toolboxBase);
            const jetbrainsMap: Record<string, { name: string; id: string; exe: string }> = {
                'IDEA-U': { name: 'IntelliJ IDEA', id: 'intellij', exe: 'idea64.exe' },
                'IDEA-CE': { name: 'IntelliJ IDEA Community', id: 'intellij-ce', exe: 'idea64.exe' },
                'PyCharm-P': { name: 'PyCharm Professional', id: 'pycharm', exe: 'pycharm64.exe' },
                'PyCharm-C': { name: 'PyCharm Community', id: 'pycharm-ce', exe: 'pycharm64.exe' },
                'GoLand': { name: 'GoLand', id: 'goland', exe: 'goland64.exe' },
                'WebStorm': { name: 'WebStorm', id: 'webstorm', exe: 'webstorm64.exe' },
                'Rider': { name: 'Rider', id: 'rider', exe: 'rider64.exe' },
                'AndroidStudio': { name: 'Android Studio', id: 'android-studio', exe: 'studio64.exe' },
            };

            for (const appDir of appDirs) {
                const appPath = path_1.default.join(toolboxBase, appDir);
                if (!fs_1.default.statSync(appPath).isDirectory()) continue;

                const ideInfo = jetbrainsMap[appDir];
                if (!ideInfo) continue;

                let installPath = '';

                // Try to find install location from various sources
                try {
                    const channels = fs_1.default.readdirSync(appPath);
                    for (const channel of channels) {
                        const channelPath = path_1.default.join(appPath, channel);
                        if (!fs_1.default.statSync(channelPath).isDirectory()) continue;

                        // Try .env.project (old format)
                        const envProjectPath = path_1.default.join(channelPath, '.env.project');
                        if (pathExists(envProjectPath)) {
                            try {
                                const envContent = fs_1.default.readFileSync(envProjectPath, 'utf8');
                                const match = envContent.match(/IDE_INSTALL_LOCATION=(.+)/);
                                if (match && match[1]) {
                                    installPath = match[1].trim();
                                    break;
                                }
                            } catch {}
                        }

                        // Try .env.vars (newer format)
                        const envVarsPath = path_1.default.join(channelPath, '.env.vars');
                        if (pathExists(envVarsPath)) {
                            try {
                                const envContent = fs_1.default.readFileSync(envVarsPath, 'utf8');
                                const match = envContent.match(/IDE_INSTALL_LOCATION=(.+)/);
                                if (match && match[1]) {
                                    installPath = match[1].trim();
                                    break;
                                }
                            } catch {}
                        }

                        // Try to find the IDE executable directly in subdirectories
                        const findExe = (dir: string, depth = 0): string | null => {
                            if (depth > 3) return null;
                            try {
                                const items = fs_1.default.readdirSync(dir);
                                for (const item of items) {
                                    const itemPath = path_1.default.join(dir, item);
                                    const stat = fs_1.default.statSync(itemPath);
                                    if (stat.isDirectory()) {
                                        if (item.endsWith('.exe') || item === 'bin') {
                                            const found = findExe(itemPath, depth + 1);
                                            if (found) return found;
                                        }
                                    } else if (item === ideInfo.exe && itemPath.includes('bin')) {
                                        return path_1.default.dirname(itemPath);
                                    }
                                }
                            } catch {}
                            return null;
                        };

                        const foundPath = findExe(channelPath);
                        if (foundPath) {
                            installPath = foundPath;
                            break;
                        }
                    }
                } catch {}

                if (installPath && pathExists(installPath)) {
                    let version = '';
                    try {
                        const productInfoPath = path_1.default.join(installPath, 'product-info.json');
                        if (pathExists(productInfoPath)) {
                            const productInfo = JSON.parse(fs_1.default.readFileSync(productInfoPath, 'utf8'));
                            version = productInfo.version || '';
                        }
                    } catch {}
                    addIde({
                        id: ideInfo.id,
                        name: ideInfo.name,
                        version,
                        installPath
                    });
                }
            }
        } catch {}
    }

    // Also detect JetBrains IDEs installed directly (not via Toolbox)
    const directJetbrainsPaths = [
        { base: path_1.default.join(process.env.LOCALAPPDATA || '', 'JetBrains'), exe: 'idea64.exe', name: 'IntelliJ IDEA', id: 'intellij' },
        { base: path_1.default.join(process.env.LOCALAPPDATA || '', 'JetBrains'), exe: 'pycharm64.exe', name: 'PyCharm', id: 'pycharm' },
        { base: path_1.default.join(process.env.LOCALAPPDATA || '', 'JetBrains'), exe: 'webstorm64.exe', name: 'WebStorm', id: 'webstorm' },
        { base: path_1.default.join(process.env.LOCALAPPDATA || '', 'JetBrains'), exe: 'goland64.exe', name: 'GoLand', id: 'goland' },
        { base: path_1.default.join(process.env.LOCALAPPDATA || '', 'JetBrains'), exe: 'rider64.exe', name: 'Rider', id: 'rider' },
    ];

    for (const { base, exe, name, id } of directJetbrainsPaths) {
        try {
            // Search in subdirectories of the base path
            const searchDirs = fs_1.default.existsSync(base) ? fs_1.default.readdirSync(base) : [];
            for (const dir of searchDirs) {
                const candidatePath = path_1.default.join(base, dir, 'bin', exe);
                if (pathExists(candidatePath)) {
                    let version = '';
                    try {
                        version = execSync(`${path_1.default.join(base, dir, 'bin', exe.split('.')[0] + '.sh')} --version 2>/dev/null`, { encoding: 'utf8', timeout: 3000 }).trim().split('\n')[0];
                    } catch {}
                    addIde({
                        id,
                        name,
                        version,
                        installPath: path_1.default.dirname(candidatePath)
                    });
                    break;
                }
            }
        } catch {}
    }

    // Detect Android Studio (standalone installation)
    const androidPaths = process.platform === 'win32' ? [
        path_1.default.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk'),
        path_1.default.join(process.env.PROGRAMFILES || '', 'Android', 'Android Studio'),
        path_1.default.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio'),
    ] : ['/Applications/Android Studio.app'];

    for (const androidPath of androidPaths) {
        if (pathExists(androidPath)) {
            // Verify it's actually Android Studio by checking for studio.exe or similar
            const studioPath = process.platform === 'win32'
                ? path_1.default.join(androidPath, 'bin', 'studio64.exe')
                : path_1.default.join(androidPath, 'Contents', 'MacOS', 'studio');
            if (pathExists(studioPath) || pathExists(androidPath)) {
                addIde({
                    id: 'android-studio',
                    name: 'Android Studio',
                    version: '',
                    installPath: androidPath
                });
                break;
            }
        }
    }

    // Detect Google Antigravity IDE
    const antigravityPaths = process.platform === 'win32' ? [
        path_1.default.join(process.env.LOCALAPPDATA || '', 'Programs', 'Antigravity', 'Antigravity.exe'),
        path_1.default.join(process.env.PROGRAMFILES || '', 'Google', 'Antigravity', 'Antigravity.exe'),
        path_1.default.join(process.env.APPDATA || '', 'Antigravity'),
    ] : ['/Applications/Antigravity.app', path_1.default.join(require('os').homedir(), '.antigravity')];

    for (const agPath of antigravityPaths) {
        if (pathExists(agPath)) {
            let version = '';
            try {
                version = execSync('agy --version 2>/dev/null', { encoding: 'utf8', timeout: 3000 }).trim();
            } catch {}
            addIde({
                id: 'antigravity',
                name: 'Google Antigravity',
                version,
                installPath: agPath
            });
            break;
        }
    }

    // Try to detect agy CLI directly
    try {
        const agyPath = process.platform === 'win32'
            ? execSync('where agy 2>nul', { encoding: 'utf8' }).trim().split('\n')[0]
            : execSync('which agy', { encoding: 'utf8' }).trim();
        if (agyPath && !idSet.has('antigravity')) {
            addIde({
                id: 'antigravity',
                name: 'Google Antigravity',
                version: '',
                installPath: agyPath
            });
        }
    } catch {}

    // Store IDEs in DB
    if (!useJson && db) {
        for (const ide of ides) {
            try {
                db.prepare(`
                    INSERT OR REPLACE INTO ides (id, name, version, install_path, last_opened)
                    VALUES (?, ?, ?, ?, ?)
                `).run(ide.id, ide.name, ide.version || null, ide.installPath || null, new Date().toISOString());
            } catch {}
        }
    }

    console.log('[DeskFlow] IDEs detected:', ides.map(i => i.name).join(', '));
    return ides;
});

// Get stored IDEs
electron_1.ipcMain.handle('get-ides', () => {
    if (useJson) return [];
    try {
        return db.prepare('SELECT * FROM ides ORDER BY name').all();
    } catch {
        return [];
    }
});

// Get extensions for an IDE
electron_1.ipcMain.handle('get-extensions', (event, ideId) => {
    if (useJson) return [];
    try {
        if (ideId) {
            return db.prepare('SELECT * FROM extensions WHERE ide_id = ? ORDER BY name').all(ideId);
        }
        return db.prepare('SELECT * FROM extensions ORDER BY ide_id, name').all();
    } catch {
        return [];
    }
});

// Scan for development tools (async with progress)
electron_1.ipcMain.handle('scan-tools', async () => {
    const { exec } = require('child_process');
    const tools: any[] = [];

    const execPromise = (cmd: string, timeout = 3000): Promise<{ stdout: string } | null> => {
        return new Promise((resolve) => {
            const child = exec(cmd, { timeout }, (err: any, stdout: string) => {
                resolve(err ? null : { stdout: stdout.trim() });
            });
            setTimeout(() => {
                child.kill();
                resolve(null);
            }, timeout);
        });
    };

    const execSyncSafe = (cmd: string, fallback: string = ''): string => {
        try {
            const { execSync } = require('child_process');
            return execSync(cmd, { encoding: 'utf8', timeout: 3000 }).trim();
        } catch {
            return fallback;
        }
    };

    // Common development tools to detect
    const TOOL_CATEGORIES: Record<string, string[]> = {
        versionControl: ['git', 'hg', 'svn'],
        runtimes: ['node', 'python', 'python3', 'ruby', 'go', 'java', 'rustc'],
        packageManagers: ['npm', 'yarn', 'pnpm', 'pip', 'pip3', 'cargo', 'brew', 'bundle'],
        containers: ['docker', 'podman', 'kubectl', 'helm'],
        buildTools: ['make', 'cmake', 'maven', 'gradle', 'webpack', 'vite'],
        databases: ['psql', 'mysql', 'mongosh', 'redis-cli'],
        cloud: ['aws', 'gcloud', 'az', 'terraform', 'ansible']
    };

    const detectCommand = process.platform === 'win32' ? 'where' : 'which';
    const allCmds = Object.entries(TOOL_CATEGORIES).flatMap(([cat, cmds]) => cmds.map(cmd => ({ cmd, category: cat })));

    // Run detection in batches to avoid overwhelming the system
    const BATCH_SIZE = 5;
    for (let i = 0; i < allCmds.length; i += BATCH_SIZE) {
        const batch = allCmds.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
            batch.map(({ cmd, category }) => execPromise(`${detectCommand} ${cmd} 2>nul`))
        );

        for (let j = 0; j < batch.length; j++) {
            const { cmd, category } = batch[j];
            const result = results[j];
            if (result && result.stdout) {
                const version = execSyncSafe(`${cmd} --version 2>nul`).split('\n')[0] || '';
                tools.push({
                    id: `${cmd}-${Date.now()}`,
                    name: cmd,
                    category,
                    version,
                    installPath: result.stdout.split('\n')[0],
                    detectedAt: new Date().toISOString(),
                    detectionMethod: 'path'
                });
            }
        }
    }

    // Detect npm global packages (run in background, don't block)
    setTimeout(() => {
        try {
            const { execSync } = require('child_process');
            const npmOutput = execSync('npm list -g --depth=0 --json 2>nul', { encoding: 'utf8', timeout: 10000 });
            const npmData = JSON.parse(npmOutput);
            const globalDeps = npmData.dependencies || {};
            for (const [name, info] of Object.entries(globalDeps)) {
                const toolInfo = info as any;
                tools.push({
                    id: `npm-${name}-${Date.now()}`,
                    name,
                    category: 'npm-package',
                    version: toolInfo.version || '',
                    installPath: toolInfo.path || '',
                    detectedAt: new Date().toISOString(),
                    detectionMethod: 'package-manager'
                });
            }

            // Store additional tools in DB
            if (!useJson && db) {
                for (const tool of tools) {
                    if (tool.category === 'npm-package') {
                        try {
                            db.prepare(`
                                INSERT OR REPLACE INTO tools (id, name, category, version, install_path, detected_at, detection_method)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `).run(tool.id, tool.name, tool.category, tool.version, tool.installPath, tool.detectedAt, tool.detectionMethod);
                        } catch {}
                    }
                }
            }
        } catch {}
    }, 100);

    // Store tools in DB
    if (!useJson && db) {
        for (const tool of tools) {
            try {
                db.prepare(`
                    INSERT OR REPLACE INTO tools (id, name, category, version, install_path, detected_at, detection_method)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(tool.id, tool.name, tool.category, tool.version, tool.installPath, tool.detectedAt, tool.detectionMethod);
            } catch {}
        }
    }

    console.log('[DeskFlow] Tools scanned:', tools.length, 'detected');
    return {
        tools,
        message: `Found ${tools.length} tools`
    };
});

// Get stored tools
electron_1.ipcMain.handle('get-tools', (event, category) => {
    if (useJson) return [];
    try {
        if (category) {
            return db.prepare('SELECT * FROM tools WHERE category = ? ORDER BY name').all(category);
        }
        return db.prepare('SELECT * FROM tools ORDER BY category, name').all();
    } catch {
        return [];
    }
});

// Get tool categories
electron_1.ipcMain.handle('get-tool-categories', () => {
    if (useJson) return [];
    try {
        return db.prepare('SELECT DISTINCT category FROM tools ORDER BY category').all();
    } catch {
        return [];
    }
});

// Add a project to track
electron_1.ipcMain.handle('add-project', (event, projectData) => {
    if (useJson) return { success: false, message: 'Projects require SQLite' };

    const { name, path, repositoryUrl, vcsType, primaryLanguage, defaultIde } = projectData;
    const id = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
        db.prepare(`
            INSERT INTO projects (id, name, path, repository_url, vcs_type, primary_language, default_ide, last_activity_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, name, path, repositoryUrl || null, vcsType || null, primaryLanguage || null, defaultIde || null, new Date().toISOString());

        // Scan for project-specific tools
        scanProjectTools(id, path);

        console.log('[DeskFlow] Project added:', name, 'with IDE:', defaultIde);
        return { success: true, id, name };
    } catch (err: any) {
        console.error('[DeskFlow] Failed to add project:', err);
        return { success: false, message: err.message };
    }
});

// Update project details
electron_1.ipcMain.handle('update-project', (event, projectId: string, updates: {
    name?: string;
    path?: string;
    repositoryUrl?: string;
    vcsType?: string;
    primaryLanguage?: string;
    defaultIde?: string;
}) => {
    if (useJson) return { success: false, message: 'Projects require SQLite' };

    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
        if (!project) {
            return { success: false, message: 'Project not found' };
        }

        const fields: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.path !== undefined) { fields.push('path = ?'); values.push(updates.path); }
        if (updates.repositoryUrl !== undefined) { fields.push('repository_url = ?'); values.push(updates.repositoryUrl || null); }
        if (updates.vcsType !== undefined) { fields.push('vcs_type = ?'); values.push(updates.vcsType || null); }
        if (updates.primaryLanguage !== undefined) { fields.push('primary_language = ?'); values.push(updates.primaryLanguage || null); }
        if (updates.defaultIde !== undefined) { fields.push('default_ide = ?'); values.push(updates.defaultIde || null); }

        if (fields.length === 0) {
            return { success: false, message: 'No fields to update' };
        }

        values.push(projectId);
        db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...values);

        console.log('[DeskFlow] Project updated:', projectId, updates);
        return { success: true };
    } catch (err: any) {
        console.error('[DeskFlow] Failed to update project:', err);
        return { success: false, message: err.message };
    }
});

// Soft delete project (mark as deleted, can be restored)
electron_1.ipcMain.handle('delete-project', (event, projectId: string) => {
    if (useJson) return { success: false, message: 'Projects require SQLite' };

    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
        if (!project) {
            return { success: false, message: 'Project not found' };
        }

        db.prepare('UPDATE projects SET deleted_at = ? WHERE id = ?').run(new Date().toISOString(), projectId);

        console.log('[DeskFlow] Project soft-deleted:', projectId);
        return { success: true };
    } catch (err: any) {
        console.error('[DeskFlow] Failed to delete project:', err);
        return { success: false, message: err.message };
    }
});

// Restore soft-deleted project
electron_1.ipcMain.handle('restore-project', (event, projectId: string) => {
    if (useJson) return { success: false, message: 'Projects require SQLite' };

    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
        if (!project) {
            return { success: false, message: 'Project not found' };
        }

        db.prepare('UPDATE projects SET deleted_at = NULL WHERE id = ?').run(projectId);

        console.log('[DeskFlow] Project restored:', projectId);
        return { success: true };
    } catch (err: any) {
        console.error('[DeskFlow] Failed to restore project:', err);
        return { success: false, message: err.message };
    }
});

// Open project in specified IDE
electron_1.ipcMain.handle('open-project', async (event, projectId: string, ideId?: string) => {
    if (useJson) return { success: false, message: 'Projects require SQLite' };

    try {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId) as any;
        if (!project) {
            return { success: false, message: 'Project not found' };
        }

        console.log('[DeskFlow] open-project: projectId=', projectId, 'ideId=', ideId, 'project.default_ide=', project.default_ide);

        // If no IDE specified, use project's default IDE
        const targetIde = ideId || project.default_ide;
        console.log('[DeskFlow] open-project: targetIde=', targetIde);

        if (!targetIde) {
            return { success: false, message: 'No IDE specified for this project. Please set a default IDE in project settings.' };
        }

        // Get IDE info
        const ide = db.prepare('SELECT * FROM ides WHERE id = ?').get(targetIde) as any;
        console.log('[DeskFlow] open-project: ide=', ide);
        if (!ide) {
            return { success: false, message: `IDE '${targetIde}' not found in database` };
        }

        // Build open command based on IDE
        const { exec } = require('child_process');
        let command = '';

        switch (ideId || project.default_ide) {
            case 'vscode':
                command = `code "${project.path}"`;
                break;
            case 'cursor':
                command = `cursor "${project.path}"`;
                break;
            case 'intellij':
            case 'intellij-ce':
            case 'pycharm':
            case 'pycharm-ce':
            case 'goland':
            case 'webstorm':
            case 'rider':
                // JetBrains IDEs use a generic launcher or the .exe path
                if (ide.install_path && ide.install_path.includes('.exe')) {
                    command = `"${ide.install_path}" "${project.path}"`;
                } else {
                    // Try using the JetBrains toolbox launcher
                    command = `"${ide.install_path}" "${project.path}"`;
                }
                break;
            case 'android-studio':
                command = `"${ide.install_path}\\bin\\studio64.exe" "${project.path}"`;
                break;
            case 'antigravity':
                command = `"${ide.install_path}" "${project.path}"`;
                break;
            default:
                // Try using the IDE's install path directly
                if (ide.install_path) {
                    command = `"${ide.install_path}" "${project.path}"`;
                } else {
                    return { success: false, message: `No path configured for ${ide.name}` };
                }
        }

        // Execute the open command
        const { execSync } = require('child_process');
        try {
            execSync(command, { stdio: 'ignore', windowsHide: true });
            console.log('[DeskFlow] Opening project:', project.name, 'in', ide.name);
            return { success: true, ide: ide.name };
        } catch (err: any) {
            console.error('[DeskFlow] Failed to open project:', err.message);
            return { success: false, message: err.message };
        }
    } catch (err: any) {
        console.error('[DeskFlow] Open project error:', err);
        return { success: false, message: err.message };
    }
});

// Scan for tools in a project
function scanProjectTools(projectId: string, projectPath: string) {
    if (useJson || !db) return;
    const { execSync } = require('child_process');
    const pathModule = require('path');

    const projectTools: string[] = [];

    // Detect by package.json
    const pkgPath = pathModule.join(projectPath, 'package.json');
    if (fs_1.default.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs_1.default.readFileSync(pkgPath, 'utf8'));
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

            const toolMap: Record<string, string> = {
                'eslint': 'linter',
                'prettier': 'formatter',
                'typescript': 'type-checker',
                'jest': 'test-runner',
                'vitest': 'test-runner',
                'webpack': 'bundler',
                'vite': 'bundler',
                'rollup': 'bundler',
                'esbuild': 'bundler'
            };

            for (const [dep, category] of Object.entries(toolMap)) {
                if (allDeps[dep]) {
                    projectTools.push(dep);
                    const toolId = `proj-${dep}-${Date.now()}`;
                    try {
                        db!.prepare(`
                            INSERT OR IGNORE INTO tools (id, name, category, version, detected_at, detection_method)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `).run(toolId, dep, category, allDeps[dep], new Date().toISOString(), 'project');

                        db!.prepare(`
                            INSERT OR IGNORE INTO project_tools (project_id, tool_id)
                            VALUES (?, ?)
                        `).run(projectId, toolId);
                    } catch {}
                }
            }
        } catch {}
    }

    // Detect by pyproject.toml
    const pyprojectPath = pathModule.join(projectPath, 'pyproject.toml');
    if (fs_1.default.existsSync(pyprojectPath)) {
        try {
            const content = fs_1.default.readFileSync(pyprojectPath, 'utf8');
            const pythonTools: Record<string, string> = {
                'ruff': 'linter',
                'black': 'formatter',
                'pytest': 'test-runner',
                'mypy': 'type-checker'
            };

            for (const [tool, category] of Object.entries(pythonTools)) {
                if (content.includes(tool)) {
                    projectTools.push(tool);
                    const toolId = `proj-${tool}-${Date.now()}`;
                    try {
                        db!.prepare(`
                            INSERT OR IGNORE INTO tools (id, name, category, detected_at, detection_method)
                            VALUES (?, ?, ?, ?, ?)
                        `).run(toolId, tool, category, new Date().toISOString(), 'project');

                        db!.prepare(`
                            INSERT OR IGNORE INTO project_tools (project_id, tool_id)
                            VALUES (?, ?)
                        `).run(projectId, toolId);
                    } catch {}
                }
            }
        } catch {}
    }

    console.log('[DeskFlow] Project tools detected:', projectTools.join(', '));
}

// Get all projects (excluding soft-deleted)
electron_1.ipcMain.handle('get-projects', () => {
    if (useJson) return [];
    try {
        return db.prepare('SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY last_activity_at DESC').all();
    } catch {
        return [];
    }
});

// Get all projects including soft-deleted (for restore)
electron_1.ipcMain.handle('get-all-projects', () => {
    if (useJson) return [];
    try {
        return db.prepare('SELECT * FROM projects ORDER BY last_activity_at DESC').all();
    } catch {
        return [];
    }
});

// Get tools for a specific project
electron_1.ipcMain.handle('get-project-tools', (event, projectId) => {
    if (useJson) return [];
    try {
        return db.prepare(`
            SELECT t.* FROM tools t
            JOIN project_tools pt ON t.id = pt.tool_id
            WHERE pt.project_id = ?
            ORDER BY t.category, t.name
        `).all(projectId);
    } catch {
        return [];
    }
});

// Calculate project health
electron_1.ipcMain.handle('calculate-project-health', (event, projectId) => {
    if (useJson) return { healthScore: 0, activityLevel: 'inactive', aiSessions: 0, commits: 0 };
    try {
        // Get recent activity
        const recentSessions = db.prepare(`
            SELECT COUNT(*) as count FROM terminal_sessions 
            WHERE project_id = ? AND created_at >= datetime('now', '-7 days')
        `).get(projectId);
        
        const recentCommits = db.prepare(`
            SELECT COUNT(*) as count FROM commits 
            WHERE project_id = ? AND committed_at >= datetime('now', '-7 days')
        `).get(projectId);
        
        const aiUsage = db.prepare(`
            SELECT COUNT(*) as count FROM ai_usage 
            WHERE project_id = ? AND date >= date('now', '-7 days')
        `).get(projectId);
        
        // Calculate health score (0-100)
        let healthScore = 0;
        healthScore += Math.min(30, (recentSessions.count || 0) * 10); // Max 30 for sessions
        healthScore += Math.min(40, (recentCommits.count || 0) * 5); // Max 40 for commits  
        healthScore += Math.min(30, (aiUsage.count || 0) * 3); // Max 30 for AI usage
        
        // Determine activity level
        let activityLevel = 'inactive';
        if (healthScore >= 70) activityLevel = 'active';
        else if (healthScore >= 30) activityLevel = 'moderate';
        else if (healthScore > 0) activityLevel = 'light';
        
        return {
            healthScore,
            activityLevel,
            aiSessions: aiUsage.count || 0,
            commits: recentCommits.count || 0
        };
    } catch (err) {
        console.error('Failed to calculate project health:', err);
        return { healthScore: 0, activityLevel: 'inactive', aiSessions: 0, commits: 0 };
    }
});

// Remove a project
electron_1.ipcMain.handle('remove-project', (event, projectId) => {
    if (useJson) return { success: false };

    try {
        db.prepare('DELETE FROM project_tools WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM commits WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM ai_usage WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM dora_metrics WHERE project_id = ?').run(projectId);
        db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);

        console.log('[DeskFlow] Project removed:', projectId);
        return { success: true };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
});

// Get AI usage summary
electron_1.ipcMain.handle('get-ai-usage-summary', (event, period = 'week') => {
    if (useJson) return { totalTokens: 0, totalCost: 0, byTool: {} };

    try {
        let dateFilter = '';
        const now = new Date();

        if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = `WHERE date >= '${weekAgo.toISOString().split('T')[0]}'`;
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = `WHERE date >= '${monthAgo.toISOString().split('T')[0]}'`;
        }

        const summary = db.prepare(`
            SELECT
                tool,
                SUM(input_tokens + output_tokens) as total_tokens,
                SUM(cost_usd) as total_cost,
                COUNT(*) as session_count
            FROM ai_usage
            ${dateFilter}
            GROUP BY tool
        `).all();

        const byTool: Record<string, any> = {};
        let totalTokens = 0;
        let totalCost = 0;

        for (const row of summary) {
            byTool[row.tool] = {
                tokens: row.total_tokens,
                cost: row.total_cost,
                sessions: row.session_count
            };
            totalTokens += row.total_tokens;
            totalCost += row.total_cost;
        }

        return { totalTokens, totalCost, byTool, period };
    } catch {
        return { totalTokens: 0, totalCost: 0, byTool: {} };
    }
});

// Get commit statistics
electron_1.ipcMain.handle('get-commit-stats', (event, projectId, period = 'week') => {
    if (useJson) return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 };

    try {
        let dateFilter = '';
        let projectFilter = '';

        if (projectId) {
            projectFilter = `project_id = '${projectId}'`;
        }

        const now = new Date();
        if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = `date >= '${weekAgo.toISOString()}'`;
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            dateFilter = `date >= '${monthAgo.toISOString()}'`;
        }

        const whereClause = [projectFilter, dateFilter].filter(Boolean).join(' AND ');

        const stats = db.prepare(`
            SELECT
                COUNT(*) as total_commits,
                COALESCE(SUM(additions), 0) as total_additions,
                COALESCE(SUM(deletions), 0) as total_deletions,
                COALESCE(SUM(files_changed), 0) as total_files
            FROM commits
            ${whereClause ? 'WHERE ' + whereClause : ''}
        `).get();

        return stats;
    } catch {
        return { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 };
    }
});

// Open folder picker dialog
electron_1.ipcMain.handle('pick-folder', async () => {
    return new Promise((resolve) => {
        const dialog = require('@electron/dialog');
        dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Project Folder'
        }).then((result: any) => {
            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                resolve({ success: false, path: null });
            } else {
                resolve({ success: true, path: result.filePaths[0] });
            }
        }).catch((err: any) => {
            console.error('[DeskFlow] Folder picker error:', err);
            resolve({ success: false, path: null });
        });
    });
});

// Get IDE Projects overview for dashboard
electron_1.ipcMain.handle('get-ide-projects-overview', () => {
    if (useJson) {
        return {
            ides: [],
            tools: [],
            projects: [],
            aiUsage: { totalTokens: 0, totalCost: 0, totalMessages: 0, byTool: {} },
            commits: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 }
        };
    }

    try {
        const ides = db.prepare('SELECT * FROM ides ORDER BY name').all();
        const tools = db.prepare('SELECT * FROM tools ORDER BY category, name').all();
        const projects = db.prepare('SELECT * FROM projects ORDER BY last_activity_at DESC LIMIT 10').all();
        const aiUsage = db.prepare(`
            SELECT tool,
                   SUM(input_tokens + output_tokens) as tokens,
                   SUM(cost_usd) as cost,
                   COUNT(*) as session_count,
                   SUM(message_count) as messageCount,
                   MAX(date) as lastUsed,
                   GROUP_CONCAT(DISTINCT model) as models
            FROM ai_usage
            GROUP BY tool
        `).all();
        const commits = db.prepare(`
            SELECT COUNT(*) as count, SUM(additions) as additions, SUM(deletions) as deletions
            FROM commits
            WHERE date >= datetime('now', '-30 days')
        `).get();

        // Daily breakdown per tool for charts (real message_count)
        const aiUsageDaily = db.prepare(`
            SELECT tool, date,
                   SUM(input_tokens + output_tokens) as tokens,
                   SUM(cost_usd) as cost,
                   COUNT(*) as session_count,
                   SUM(message_count) as messageCount
            FROM ai_usage
            GROUP BY tool, date
            ORDER BY date DESC
        `).all();

        // Project breakdown per tool
        const aiUsageProjects = db.prepare(`
            SELECT tool, project_path,
                   SUM(input_tokens + output_tokens) as tokens,
                   SUM(message_count) as messageCount,
                   COUNT(*) as session_count
            FROM ai_usage
            WHERE project_path IS NOT NULL AND project_path != ''
            GROUP BY tool, project_path
            ORDER BY tokens DESC
        `).all();

        // Model breakdown per tool
        const aiUsageModels = db.prepare(`
            SELECT tool, model,
                   SUM(input_tokens + output_tokens) as tokens,
                   SUM(message_count) as messageCount,
                   COUNT(*) as session_count
            FROM ai_usage
            WHERE model IS NOT NULL AND model != ''
            GROUP BY tool, model
            ORDER BY tokens DESC
        `).all();

        const byTool: Record<string, any> = {};
        let totalTokens = 0;
        let totalCost = 0;
        let totalMessages = 0;

        for (const row of aiUsage) {
            const models = row.models ? row.models.split(',').filter((m: string) => m) : [];
            byTool[row.tool] = {
                tokens: row.tokens || 0,
                cost: row.cost || 0,
                sessions: row.session_count || 0,
                messageCount: row.messageCount || 0,
                lastUsed: row.lastUsed || null,
                models,
                daily: {},
                projects: [],
                modelBreakdown: []
            };
            totalTokens += (row.tokens || 0);
            totalCost += (row.cost || 0);
            totalMessages += (row.messageCount || 0);
        }

        // Populate daily breakdown
        for (const row of aiUsageDaily) {
            if (byTool[row.tool]) {
                byTool[row.tool].daily[row.date] = {
                    tokens: row.tokens || 0,
                    cost: row.cost || 0,
                    sessions: row.session_count || 0,
                    messageCount: row.messageCount || 0
                };
            }
        }

        // Populate project breakdown
        for (const row of aiUsageProjects) {
            if (byTool[row.tool]) {
                byTool[row.tool].projects.push({
                    path: row.project_path,
                    tokens: row.tokens || 0,
                    messageCount: row.messageCount || 0,
                    sessions: row.session_count || 0
                });
            }
        }

        // Populate model breakdown
        for (const row of aiUsageModels) {
            if (byTool[row.tool]) {
                byTool[row.tool].modelBreakdown.push({
                    model: row.model,
                    tokens: row.tokens || 0,
                    messageCount: row.messageCount || 0,
                    sessions: row.session_count || 0
                });
            }
        }

        return {
            ides,
            tools,
            projects,
            aiUsage: { totalTokens, totalCost, totalMessages, byTool },
            commits: {
                totalCommits: commits?.count || 0,
                totalAdditions: commits?.additions || 0,
                totalDeletions: commits?.deletions || 0
            }
        };
    } catch (err) {
        console.error('[DeskFlow] IDE Projects overview error:', err);
        return {
            ides: [],
            tools: [],
            projects: [],
            aiUsage: { totalTokens: 0, totalCost: 0, totalMessages: 0, byTool: {} },
            commits: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 }
        };
    }
});

// Sync AI usage using the plugin system
electron_1.ipcMain.handle('sync-ai-usage', async () => {
    if (useJson) return { success: false, message: 'AI sync requires SQLite' };

    const results = await syncAllAIAgents(db);

    return { success: true, ...results };
});

// Terminal layout stubs (prevents console spam until full terminal feature is implemented)
electron_1.ipcMain.handle('get-terminal-layouts', async (_event, projectId?: string) => {
    if (!db) return [];
    try {
        const stmt = db.prepare('SELECT * FROM terminal_layouts WHERE project_id = ? OR project_id IS NULL ORDER BY updated_at DESC');
        return stmt.all(projectId || null);
    } catch {
        return [];
    }
});

electron_1.ipcMain.handle('save-terminal-layout', async (_event, data: any) => {
    if (!db) return { success: false };
    try {
        const id = data.id || `layout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const exists = db.prepare('SELECT 1 FROM terminal_layouts WHERE id = ?').get(id);
        if (exists) {
            db.prepare(`
                UPDATE terminal_layouts SET name = ?, layout_data = ?, project_id = ?, is_active = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(data.name, data.layoutData, data.projectId || null, data.isActive ? 1 : 0, id);
        } else {
            db.prepare(`
                INSERT INTO terminal_layouts (id, name, layout_data, project_id, is_active, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(id, data.name, data.layoutData, data.projectId || null, data.isActive ? 1 : 0);
        }
        return { success: true, id };
    } catch (err: any) {
        console.error('[DeskFlow] save-terminal-layout error:', err.message);
        return { success: false };
    }
});

// Terminal preset handlers
electron_1.ipcMain.handle('get-terminal-presets', async (_event, projectId?: string) => {
    if (!db) return [];
    try {
        const stmt = db.prepare('SELECT * FROM terminal_presets WHERE project_id = ? OR project_id IS NULL ORDER BY updated_at DESC');
        return stmt.all(projectId || null);
    } catch {
        return [];
    }
});

electron_1.ipcMain.handle('add-terminal-preset', async (_event, preset: any) => {
    if (!db) return { success: false };
    try {
        const id = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
            INSERT INTO terminal_presets (id, name, command, project_id, working_directory, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(id, preset.name, preset.command, preset.projectId || null, preset.workingDirectory || null, preset.category || null);
        return { success: true, id };
    } catch (err: any) {
        console.error('[DeskFlow] add-terminal-preset error:', err.message);
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('remove-terminal-preset', async (_event, presetId: string) => {
    if (!db) return { success: false };
    try {
        db.prepare('DELETE FROM terminal_presets WHERE id = ?').run(presetId);
        return { success: true };
    } catch (err: any) {
        console.error('[DeskFlow] remove-terminal-preset error:', err.message);
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('execute-terminal-preset', async (_event, presetId: string, terminalId?: string) => {
    if (!db) return { success: false };
    try {
        const preset = db.prepare('SELECT * FROM terminal_presets WHERE id = ?').get(presetId) as any;
        if (!preset) return { success: false, error: 'Preset not found' };
        
        // Save as a session for tracking
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
            INSERT INTO terminal_sessions (id, preset_id, project_id, agent, topic, working_directory, created_at)
            VALUES (?, ?, ?, 'preset', ?, ?, datetime('now'))
        `).run(sessionId, presetId, preset.project_id, preset.name, preset.working_directory);
        
        return { success: true, sessionId, command: preset.command };
    } catch (err: any) {
        console.error('[DeskFlow] execute-terminal-preset error:', err.message);
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('save-terminal-preset', async (_event, data: any) => {
    if (!db) return { success: false };
    try {
        const id = data.id || `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const exists = db.prepare('SELECT 1 FROM terminal_presets WHERE id = ?').get(id);
        if (exists) {
            db.prepare(`
                UPDATE terminal_presets SET name = ?, command = ?, project_id = ?, updated_at = datetime('now')
                WHERE id = ?
            `).run(data.name, data.command, data.projectId || null, id);
        } else {
            db.prepare(`
                INSERT INTO terminal_presets (id, name, command, project_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `).run(id, data.name, data.command, data.projectId || null);
        }
        return { success: true, id };
    } catch (err: any) {
        console.error('[DeskFlow] save-terminal-preset error:', err.message);
        return { success: false };
    }
});

// Terminal session stubs (PTY not implemented yet — returns empty data)
// Inline node-pty based TerminalManager
const terminalManager = {
  terminals: new Map(),
  spawn(id: string, cwd: string, cols: number = 80, rows: number = 24) {
    try {
      console.log('[TerminalManager] spawn called:', id, cwd, cols, rows);
      if (this.terminals.has(id)) {
        this.kill(id);
      }
      const os = require('os');
      const pty = require('node-pty');
      const shell = process.platform === 'win32' ? (process.env.COMSPEC || 'powershell.exe') : (process.env.SHELL || '/bin/bash');
      const workingDir = cwd && cwd.length > 0 ? cwd : os.homedir();
      console.log('[TerminalManager] spawning shell:', shell, 'in', workingDir);
      const proc = pty.spawn(shell, [], { name: 'xterm-256color', cols, rows, cwd: workingDir, env: process.env });
      console.log('[TerminalManager] PTY spawned, pid:', proc.pid);
      const ip: any = {
        write: (data: string) => proc.write(data),
        resize: (c: number, r: number) => proc.resize(c, r),
        kill: () => proc.kill(),
        onData: (cb: (d: string) => void) => proc.onData(cb),
        onExit: (cb: (code: number, sig: string) => void) => proc.onExit(cb),
      };
      this.terminals.set(id, { id, pty: ip, cwd });
      console.log('[TerminalManager] terminal stored:', id, 'total terminals:', this.terminals.size);
      return { success: true };
    } catch (err: any) {
      console.error('[TerminalManager] Spawn error:', err.message);
      return { success: false, error: err.message };
    }
  },
  write(id: string, data: string) {
    const t = this.terminals.get(id);
    if (t) { t.pty.write(data); return true; }
    return false;
  },
  resize(id: string, cols: number, rows: number) {
    const t = this.terminals.get(id);
    if (t) { t.pty.resize(cols, rows); return true; }
    return false;
  },
  kill(id: string) {
    const t = this.terminals.get(id);
    if (t) { try { t.pty.kill(); } catch {} this.terminals.delete(id); return true; }
    return false;
  },
  getDataHandler(id: string, cb: (d: string) => void) {
    const t = this.terminals.get(id);
    if (t) t.pty.onData(cb);
  },
  getExitHandler(id: string, cb: (code: number, sig: string) => void) {
    const t = this.terminals.get(id);
    if (t) t.pty.onExit(cb);
  }
};

electron_1.ipcMain.handle('terminal:create', async (_event, id: string, cwd: string, cols: number, rows: number) => {
    try {
        const { BrowserWindow } = require('electron');
        const result = terminalManager.spawn(id, cwd, cols, rows);
        if (result.success) {
            // Set up data forwarding to the renderer
            terminalManager.getDataHandler(id, (data: string) => {
                const windows = BrowserWindow.getAllWindows();
                for (const win of windows) {
                    if (!win.isDestroyed()) {
                        win.webContents.send('terminal:data', id, data);
                    }
                }
            });
            terminalManager.getExitHandler(id, () => {
                const windows = BrowserWindow.getAllWindows();
                for (const win of windows) {
                    if (!win.isDestroyed()) {
                        win.webContents.send('terminal:exit', id);
                    }
                }
            });
        }
        return result;
    } catch (err: any) {
        console.error('[DeskFlow] terminal:create error:', err.message);
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('terminal:write', async (_event, id: string, data: string) => {
    const success = terminalManager.write(id, data);
    return { success };
});

electron_1.ipcMain.handle('terminal:resize', async (_event, id: string, cols: number, rows: number) => {
    const success = terminalManager.resize(id, cols, rows);
    return { success };
});

electron_1.ipcMain.handle('terminal:destroy', async (_event, id: string) => {
    const success = terminalManager.kill(id);
    return { success };
});

// Legacy handlers - use terminal:data channel to match preload.ts onTerminalData
electron_1.ipcMain.handle('spawn-terminal', async (_event, terminalId: string, cwd?: string) => {
    const { BrowserWindow } = require('electron');
    console.log('[DeskFlow] spawn-terminal called:', terminalId, cwd);
    const result = terminalManager.spawn(terminalId, cwd || '', 80, 24);
    console.log('[DeskFlow] spawn-terminal result:', result);
    if (result.success) {
        terminalManager.getDataHandler(terminalId, (data: string) => {
            console.log('[DeskFlow] Terminal data received:', terminalId, 'length:', data.length, 'data preview:', data.substring(0, 50));
            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
                if (!win.isDestroyed()) {
                    win.webContents.send('terminal:data', terminalId, data);
                    console.log('[DeskFlow] Sent terminal:data to window');
                }
            }
        });
        terminalManager.getExitHandler(terminalId, (exitCode: number, signal: string) => {
            const windows = BrowserWindow.getAllWindows();
            for (const win of windows) {
                if (!win.isDestroyed()) {
                    win.webContents.send('terminal:exit', terminalId, exitCode, signal);
                }
            }
        });
    }
    return result;
});

electron_1.ipcMain.handle('write-terminal', async (_event, terminalId: string, data: string) => {
    const success = terminalManager.write(terminalId, data);
    return { success };
});

electron_1.ipcMain.handle('resize-terminal', async (_event, terminalId: string, cols: number, rows: number) => {
    const success = terminalManager.resize(terminalId, cols, rows);
    return { success };
});

electron_1.ipcMain.handle('kill-terminal', async (_event, terminalId: string) => {
    const success = terminalManager.kill(terminalId);
    return { success };
});

electron_1.ipcMain.handle('get-terminal-sessions', async (_event, projectId?: string, limit?: number) => {
    if (!db) return [];
    try {
        const stmt = db.prepare('SELECT * FROM terminal_sessions WHERE project_id = ? OR project_id IS NULL ORDER BY created_at DESC LIMIT ?');
        return stmt.all(projectId || null, limit || 50);
    } catch {
        return [];
    }
});

electron_1.ipcMain.handle('save-terminal-session', async (_event, session: any) => {
    if (!db) return { success: false };
    try {
        const id = session.id || `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
            INSERT OR REPLACE INTO terminal_sessions (id, project_id, agent, resume_id, topic, working_directory, total_tokens, total_cost, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(id, session.projectId || null, session.agent, session.resumeId || null, session.topic || null, session.workingDirectory || null, session.totalTokens || 0, session.totalCost || 0);
        return { success: true, id };
    } catch (err: any) {
        console.error('[DeskFlow] save-terminal-session error:', err.message);
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('get-terminal-session-resume-id', async (_event, sessionId: string) => {
    if (!db) return null;
    try {
        const session = db.prepare('SELECT resume_id FROM terminal_sessions WHERE id = ?').get(sessionId) as any;
        return session?.resume_id || null;
    } catch {
        return null;
    }
});

electron_1.ipcMain.handle('delete-terminal-layout', async (_event, layoutId: string) => {
    if (!db) return { success: false };
    try {
        db.prepare('DELETE FROM terminal_layouts WHERE id = ?').run(layoutId);
        return { success: true };
    } catch (err: any) {
        console.error('[DeskFlow] delete-terminal-layout error:', err.message);
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('set-active-terminal-layout', async (_event, layoutId: string) => {
    if (!db) return { success: false };
    try {
        db.prepare("UPDATE terminal_layouts SET is_active = 0 WHERE is_active = 1").run();
        db.prepare('UPDATE terminal_layouts SET is_active = 1 WHERE id = ?').run(layoutId);
        return { success: true };
    } catch (err: any) {
        console.error('[DeskFlow] set-active-terminal-layout error:', err.message);
        return { success: false, error: err.message };
    }
});

// Terminal window management - opens terminal in a new BrowserWindow
const terminalWindows = new Map<string, any>();

electron_1.ipcMain.handle('create-terminal-window', async (_event, options?: { terminalId?: string; cwd?: string }) => {
    const { BrowserWindow } = require('electron');
    const terminalId = options?.terminalId || `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if window already exists
    if (terminalWindows.has(terminalId)) {
        const existing = terminalWindows.get(terminalId);
        existing.focus();
        return { success: true, terminalId, windowId: existing.id };
    }
    
    const terminalWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: 'DeskFlow Terminal',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, 'preload.cjs'),
        },
    });
    
    // Load terminal HTML (create a simple terminal viewer page)
    const terminalHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DeskFlow Terminal</title>
    <style>
        body { margin: 0; padding: 10px; background: #1a1a1a; color: #fff; font-family: monospace; }
        #output { white-space: pre-wrap; }
        #input { width: 100%; background: #2a2a2a; border: none; color: #fff; padding: 5px; font-family: monospace; }
    </style>
</head>
<body>
    <div id="output"></div>
    <input id="input" type="text" placeholder="Enter command..." autofocus />
    <script>
        const { ipcRenderer } = require('electron');
        const output = document.getElementById('output');
        const input = document.getElementById('input');
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value;
                if (cmd) {
                    output.textContent += '> ' + cmd + '\\n';
                    ipcRenderer.send('terminal-command', cmd);
                    input.value = '';
                }
            }
        });
        
        ipcRenderer.on('terminal-output', (_event, data) => {
            output.textContent += data + '\\n';
        });
    </script>
</body>
</html>
    `;
    
    terminalWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(terminalHtml));
    terminalWindows.set(terminalId, terminalWindow);
    
    terminalWindow.on('closed', () => {
        terminalWindows.delete(terminalId);
    });
    
    return { success: true, terminalId, windowId: terminalWindow.id };
});

// Debug: Check which AI agents are detected
electron_1.ipcMain.handle('debug-ai-agents', async () => {
    const agentStatus: Record<string, { detected: boolean; paths: string[]; sampleFiles?: string[]; totalFiles?: number }> = {};

    for (const plugin of AI_AGENT_PLUGINS) {
        try {
            const isDetected = await plugin.detect();
            const paths = plugin.getStoragePaths();
            const sampleFiles: string[] = [];
            let totalFiles = 0;

            for (const p of paths) {
                if (!fs_1.default.existsSync(p)) continue;
                const stat = fs_1.default.statSync(p);
                if (stat.isFile()) {
                    sampleFiles.push(path_1.default.basename(p));
                    totalFiles++;
                    continue;
                }
                if (!stat.isDirectory()) continue;

                // For project-based agents (Qwen: projects/*/chats/, Gemini: tmp/*/chats/)
                // Check for a nested chats structure
                const hasChatsSubdir = (dir: string): boolean => {
                    try {
                        const items = fs_1.default.readdirSync(dir);
                        for (const item of items) {
                            const itemPath = path_1.default.join(dir, item);
                            try {
                                if (fs_1.default.statSync(itemPath).isDirectory()) {
                                    const chatsPath = path_1.default.join(itemPath, 'chats');
                                    if (fs_1.default.existsSync(chatsPath) && fs_1.default.statSync(chatsPath).isDirectory()) {
                                        return true;
                                    }
                                }
                            } catch {}
                        }
                    } catch {}
                    return false;
                };

                if (hasChatsSubdir(p)) {
                    // Nested structure: project dirs → chats → files
                    const projectDirs = fs_1.default.readdirSync(p);
                    let displayCount = 0;
                    for (const projectDir of projectDirs) {
                        const projectPath = path_1.default.join(p, projectDir);
                        try {
                            if (!fs_1.default.statSync(projectPath).isDirectory()) continue;
                            const chatsPath = path_1.default.join(projectPath, 'chats');
                            if (!fs_1.default.existsSync(chatsPath)) continue;
                            const chatFiles = fs_1.default.readdirSync(chatsPath).filter(f => f.endsWith('.jsonl') || f.endsWith('.json'));
                            totalFiles += chatFiles.length;
                            if (displayCount < 3 && chatFiles.length > 0) {
                                sampleFiles.push(`${projectDir}/chats/ (${chatFiles.length} sessions)`);
                                displayCount++;
                            }
                        } catch {}
                    }
                    if (projectDirs.length > 3) {
                        sampleFiles.push(`...and ${projectDirs.length - 3} more projects`);
                    }
                } else {
                    // Flat structure or database file
                    try {
                        const allFiles = fs_1.default.readdirSync(p);
                        const dataFiles = allFiles.filter(f => f.endsWith('.jsonl') || f.endsWith('.json') || f.endsWith('.db'));
                        totalFiles += dataFiles.length;

                        // Show up to 5 sample files
                        const shown = allFiles.slice(0, 5);
                        for (const f of shown) {
                            const fullPath = path_1.default.join(p, f);
                            try {
                                const fStat = fs_1.default.statSync(fullPath);
                                if (fStat.isFile()) {
                                    if (f.endsWith('.db')) {
                                        sampleFiles.push(`${f} (${(fStat.size / 1024).toFixed(1)} KB)`);
                                    } else {
                                        sampleFiles.push(f);
                                    }
                                } else if (fStat.isDirectory()) {
                                    const subFiles = fs_1.default.readdirSync(fullPath);
                                    sampleFiles.push(`${f}/ (dir, ${subFiles.length} items)`);
                                }
                            } catch {}
                        }
                        if (allFiles.length > 5) {
                            sampleFiles.push(`...and ${allFiles.length - 5} more`);
                        }
                    } catch {}
                }
            }

            agentStatus[plugin.id] = { detected: isDetected, paths, sampleFiles, totalFiles };
        } catch (err: any) {
            agentStatus[plugin.id] = { detected: false, paths: [err.message], sampleFiles: [], totalFiles: 0 };
        }
    }

    let dbState = null;
    if (!useJson && db) {
        try {
            const count = db.prepare('SELECT COUNT(*) as count FROM ai_usage').get() as { count: number };
            const totalTokens = db.prepare('SELECT SUM(input_tokens + output_tokens) as total FROM ai_usage').get() as { total: number };
            const byTool = db.prepare('SELECT tool, COUNT(*) as count FROM ai_usage GROUP BY tool').all() as { tool: string; count: number }[];
            dbState = { totalRecords: count.count, totalTokens: totalTokens.total || 0, byTool };
        } catch (err: any) {
            dbState = { error: err.message };
        }
    }

    return { agents: agentStatus, database: dbState };
});

// Sync commits from a local Git repository
electron_1.ipcMain.handle('sync-commits', async (event, projectId: string, repoPath: string) => {
    if (useJson) return { success: false, message: 'Commit sync requires SQLite' };

    const results = { commits: 0, errors: [] as string[] };

    try {
        const { execSync } = require('child_process');

        // Get commit log from git
        let gitOutput: string;
        try {
            gitOutput = execSync(`git log --format="%H|%an|%ae|%ai|%s" -n 500`, {
                cwd: repoPath,
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024
            });
        } catch (gitErr: any) {
            return { success: false, message: `Not a git repository or no commits: ${gitErr.message}` };
        }

        const lines = gitOutput.trim().split('\n').filter(Boolean);

        for (const line of lines) {
            const [sha, author, authorEmail, date, message] = line.split('|');

            // Get diff stats for this commit
            let additions = 0;
            let deletions = 0;
            let filesChanged = 0;

            try {
                const statsOutput = execSync(`git show --stat --format="" ${sha}`, {
                    cwd: repoPath,
                    encoding: 'utf8'
                });

                const statLines = statsOutput.trim().split('\n');
                filesChanged = statLines.length;

                for (const statLine of statLines) {
                    const match = statLine.match(/\+\s*(\d+)/);
                    if (match) additions += parseInt(match[1], 10);
                    const delMatch = statLine.match(/-\s*(\d+)/);
                    if (delMatch) deletions += parseInt(delMatch[1], 10);
                }
            } catch {}

            const id = `commit-${sha}`;
            const commitDate = new Date(date).toISOString();

            try {
                db!.prepare(`
                    INSERT OR REPLACE INTO commits (id, project_id, sha, author, author_email, date, message, additions, deletions, files_changed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, projectId, sha, author, authorEmail, commitDate, message, additions, deletions, filesChanged);

                results.commits++;
            } catch (dbErr: any) {
                if (!dbErr.message.includes('UNIQUE constraint')) {
                    console.error('[DeskFlow] Commit DB error:', dbErr.message);
                }
            }
        }

        // Update project's last_activity_at
        db!.prepare(`UPDATE projects SET last_activity_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), projectId);

        console.log(`[DeskFlow] Synced ${results.commits} commits from ${repoPath}`);
        return { success: true, ...results };

    } catch (err: any) {
        console.error('[DeskFlow] Commit sync error:', err);
        return { success: false, message: err.message };
    }
});

// Sync commits from GitHub API
electron_1.ipcMain.handle('sync-github-commits', async (event, projectId: string, owner: string, repo: string, token?: string) => {
    if (useJson) return { success: false, message: 'GitHub sync requires SQLite' };

    const results = { commits: 0, errors: [] as string[] };

    try {
        const headers: Record<string, string> = {
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Fetch recent commits
        const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
            { headers }
        );

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, message: `GitHub API error: ${response.status} - ${errorText}` };
        }

        const commits = await response.json() as any[];

        for (const commit of commits) {
            const sha = commit.sha;
            const author = commit.commit?.author?.name || 'Unknown';
            const authorEmail = commit.commit?.author?.email || '';
            const date = commit.commit?.author?.date || new Date().toISOString();
            const message = commit.commit?.message?.split('\n')[0] || '';
            const additions = commit.stats?.additions || 0;
            const deletions = commit.stats?.deletions || 0;
            const filesChanged = commit.files?.length || 0;

            const id = `github-${sha}`;
            const commitDate = new Date(date).toISOString();

            try {
                db!.prepare(`
                    INSERT OR REPLACE INTO commits (id, project_id, sha, author, author_email, date, message, additions, deletions, files_changed)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `).run(id, projectId, sha, author, authorEmail, commitDate, message, additions, deletions, filesChanged);

                results.commits++;
            } catch (dbErr: any) {
                if (!dbErr.message.includes('UNIQUE constraint')) {
                    console.error('[DeskFlow] GitHub commit DB error:', dbErr.message);
                }
            }
        }

        console.log(`[DeskFlow] Synced ${results.commits} commits from GitHub ${owner}/${repo}`);
        return { success: true, ...results };

    } catch (err: any) {
        console.error('[DeskFlow] GitHub commit sync error:', err);
        return { success: false, message: err.message };
    }
});

// Get DORA metrics for a project
electron_1.ipcMain.handle('get-dora-metrics', (event, projectId: string, period: 'week' | 'month' = 'month') => {
    if (useJson) return null;

    try {
        const days = period === 'week' ? 7 : 30;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Get commits in period
        const commitStats = db!.prepare(`
            SELECT
                COUNT(*) as total_commits,
                SUM(additions) as total_additions,
                SUM(deletions) as total_deletions,
                COUNT(DISTINCT DATE(date)) as active_days,
                MIN(date) as first_commit,
                MAX(date) as last_commit
            FROM commits
            WHERE project_id = ? AND date >= ?
        `).get(projectId, cutoffDate) as any;

        if (!commitStats || commitStats.total_commits === 0) {
            return {
                projectId,
                period,
                deploymentFrequency: 0,
                leadTimeHours: 0,
                changeFailureRate: 0,
                meanTimeToRecoveryHours: 0,
                level: 'low' as const,
                commitCount: 0,
                totalLines: 0,
                activeDays: 0,
                message: 'No commits found in this period'
            };
        }

        // Estimate deployment frequency (commits that look like deploys)
        // For now, count commits to main/master as "deployments"
        const deployments = db!.prepare(`
            SELECT COUNT(*) as count FROM commits
            WHERE project_id = ? AND date >= ?
            AND (message LIKE '%deploy%' OR message LIKE '%release%' OR message LIKE '%publish%')
        `).get(projectId, cutoffDate) as any;

        const deploymentFrequency = (deployments?.count || 0) / days;

        // Calculate lines of code changed
        const totalLines = (commitStats.total_additions || 0) + (commitStats.total_deletions || 0);

        // Determine DORA level based on deployment frequency
        let level: 'elite' | 'high' | 'medium' | 'low';
        if (deploymentFrequency >= 1) {
            level = 'elite'; // Multiple deploys per day
        } else if (deploymentFrequency >= 0.1) {
            level = 'high'; // Weekly to daily
        } else if (deploymentFrequency >= 0.03) {
            level = 'medium'; // Monthly
        } else {
            level = 'low'; // Less than monthly
        }

        // Calculate lead time (simplified: average time between commits)
        let leadTimeHours = 0;
        if (commitStats.active_days > 1) {
            leadTimeHours = (days * 24) / commitStats.active_days;
        }

        // Change failure rate (placeholder - would need incident data)
        const changeFailureRate = 0; // Would need integration with incident tracking

        // MTTR (placeholder)
        const meanTimeToRecoveryHours = 0; // Would need integration with incident tracking

        return {
            projectId,
            period,
            deploymentFrequency: Math.round(deploymentFrequency * 100) / 100,
            leadTimeHours: Math.round(leadTimeHours * 10) / 10,
            changeFailureRate,
            meanTimeToRecoveryHours,
            level,
            commitCount: commitStats.total_commits,
            totalLines,
            activeDays: commitStats.active_days
        };

    } catch (err) {
        console.error('[DeskFlow] DORA metrics error:', err);
        return null;
    }
});

// Get commit history for a project
electron_1.ipcMain.handle('get-commit-history', (event, projectId: string, limit: number = 50) => {
    if (useJson) return [];

    try {
        return db!.prepare(`
            SELECT * FROM commits
            WHERE project_id = ?
            ORDER BY date DESC
            LIMIT ?
        `).all(projectId, limit);
    } catch {
        return [];
    }
});

// Get contributor stats for a project
electron_1.ipcMain.handle('get-contributor-stats', (event, projectId: string) => {
    if (useJson) return [];

    try {
        return db!.prepare(`
            SELECT
                author,
                author_email,
                COUNT(*) as commit_count,
                SUM(additions) as total_additions,
                SUM(deletions) as total_deletions,
                MIN(date) as first_commit,
                MAX(date) as last_commit
            FROM commits
            WHERE project_id = ?
            GROUP BY author_email
            ORDER BY commit_count DESC
        `).all(projectId);
    } catch {
        return [];
    }
});
// Save file handler for exports - opens file dialog to let user choose location
electron_1.ipcMain.handle('save-file', async (event, options) => {
    try {
        const { content, filename, fileType } = options;
        const downloadsPath = electron_1.app.getPath('downloads');
        
        // Show save dialog to let user choose where to save
        const result = await electron_1.dialog.showSaveDialog({
            title: 'Save Export File',
            defaultPath: path_1.default.join(downloadsPath, filename),
            filters: [
                { name: fileType === 'application/json' ? 'JSON' : 'CSV', extensions: [fileType === 'application/json' ? 'json' : 'csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
        
        if (result.canceled || !result.filePath) {
            return { success: false, message: 'Save cancelled' };
        }
        
        fs_1.default.writeFileSync(result.filePath, content);
        console.log(`[DeskFlow] File saved: ${result.filePath}`);
        return { success: true, path: result.filePath };
    }
    catch (err) {
        console.error('[DeskFlow] Save file error:', err);
        return { success: false, message: err.message };
    }
});

// ========== AI Features ==========
// Helper to get OpenRouter API key (preferences > env var)
function getOpenRouterApiKey(): string {
    // Check user preferences first (set via Settings UI)
    let prefsKey = userPreferences?.openrouterApiKey || '';
    prefsKey = prefsKey.trim().replace(/^["']|["']$/g, ''); // Strip quotes and whitespace
    if (prefsKey) {
        console.log('[DeskFlow] Using OpenRouter API key from preferences');
        return prefsKey;
    }
    // Fallback to environment variable (from .env file or OS env)
    let envKey = process.env.OPENROUTER_API_KEY || '';
    envKey = envKey.trim().replace(/^["']|["']$/g, ''); // Strip quotes and whitespace
    if (envKey) {
        console.log('[DeskFlow] Using OpenRouter API key from environment');
        return envKey;
    }
    console.warn('[DeskFlow] OpenRouter API key not found in preferences or environment');
    return '';
}

// Helper to extract JSON from AI response (handles markdown code blocks)
function extractJsonFromResponse(content: string): any {
    // Try to find JSON in markdown code blocks
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
        content = codeBlockMatch[1].trim();
    }
    // Remove any leading/trailing whitespace and newlines
    content = content.trim();
    // If it starts with { or [, try to parse it
    if (content.startsWith('{') || content.startsWith('[')) {
        try {
            return JSON.parse(content);
        } catch (e) {
            console.error('[DeskFlow] Failed to parse extracted JSON:', e);
        }
    }
    throw new Error('No valid JSON found in response');
}

// OpenRouter API base configuration
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODELS = [
    'liquid/lfm-2.5-1.2b-instruct:free',
    'anthropic/claude-3.5-sonnet',
    'anthropic/claude-3-sonnet',
    'openai/gpt-4o-mini',
    'google/gemini-flash-1.5'
];

// System prompt for color generation
const COLOR_SYSTEM_PROMPT = `You are a color palette expert. Your task is to generate brand-appropriate hex color codes for apps and websites.
Rules:
- Return ONLY valid JSON, no markdown, no explanations
- Use vibrant but professional colors
- Consider the app's purpose and brand identity
- Always return 6-digit hex codes with # prefix`;

// System prompt for categorization
const CATEGORY_SYSTEM_PROMPT = `You are a productivity app categorization expert. Your task is to categorize apps and websites into predefined categories.
Rules:
- Return ONLY valid JSON, no markdown, no explanations
- Use exactly these categories: IDE, AI Tools, Browser, Entertainment, Communication, Design, Productivity, Tools, Education, Developer Tools, Search Engine, News, Shopping, Social Media, Uncategorized, Other
- Be accurate and consistent`;

// Generate AI colors for apps/websites using OpenRouter API
electron_1.ipcMain.handle('generate-ai-colors', async (event, apps: string[]) => {
    try {
        const OPENROUTER_API_KEY = getOpenRouterApiKey();
        if (!OPENROUTER_API_KEY) {
            console.warn('[DeskFlow] OpenRouter API key not set');
            return {};
        }

        console.log(`[DeskFlow] Generating colors for ${apps.length} apps...`);

        const userPrompt = `Generate brand-appropriate hex colors for these apps/websites. Return ONLY a JSON object with app names as keys and hex colors as values.

Apps: ${apps.join(', ')}

Example format: {"app1": "#FF5733", "app2": "#33FF57"}`;

        const response = await fetch(OPENROUTER_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://deskflow.app',
                'X-Title': 'DeskFlow',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODELS[0],
                messages: [
                    { role: 'system', content: COLOR_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 1000,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DeskFlow] OpenRouter API error (${response.status}):`, errorText);
            return {};
        }

        const data = await response.json();
        console.log('[DeskFlow] OpenRouter response:', JSON.stringify(data, null, 2));

        if (data.error) {
            console.error('[DeskFlow] OpenRouter returned error:', data.error);
            return {};
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            console.error('[DeskFlow] No content in OpenRouter response');
            return {};
        }

        console.log('[DeskFlow] Raw AI response:', content);

        const colors = extractJsonFromResponse(content);
        console.log('[DeskFlow] Parsed colors:', colors);
        return colors;
    } catch (err: any) {
        console.error('[DeskFlow] AI color generation error:', err.message);
        return {};
    }
});

// Validate OpenRouter API key using their auth endpoint
electron_1.ipcMain.handle('test-openrouter-key', async () => {
    try {
        const OPENROUTER_API_KEY = getOpenRouterApiKey();
        if (!OPENROUTER_API_KEY) {
            return { success: false, error: 'API key not set' };
        }

        console.log('[DeskFlow] Testing API key (first 20 chars):', OPENROUTER_API_KEY.substring(0, 20) + '...');
        console.log('[DeskFlow] Key length:', OPENROUTER_API_KEY.length);
        console.log('[DeskFlow] Key starts with "sk-or-v1-":', OPENROUTER_API_KEY.startsWith('sk-or-v1-'));

        // First validate the key using OpenRouter's auth endpoint
        const authResponse = await fetch('https://openrouter.ai/api/v1/auth/key', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            },
        });

        console.log('[DeskFlow] Auth check status:', authResponse.status);
        
        if (!authResponse.ok) {
            const authError = await authResponse.text();
            console.error('[DeskFlow] Auth check failed:', authError);
            return { 
                success: false, 
                error: `Invalid API key. Please check your key at https://openrouter.ai/keys`,
                details: authError
            };
        }

        const authData = await authResponse.json();
        console.log('[DeskFlow] Auth data:', authData);

        // Now test with a simple completion
        const response = await fetch(OPENROUTER_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://deskflow.app',
                'X-Title': 'DeskFlow',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODELS[0], // Use first model for testing
                messages: [
                    { role: 'user', content: 'Say OK' }
                ],
                max_tokens: 10,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DeskFlow] API test failed (${response.status}):`, errorText);
            return { success: false, error: `HTTP ${response.status}: ${errorText}` };
        }

        const data = await response.json();
        if (data.error) {
            return { success: false, error: data.error.message || 'Unknown API error' };
        }

        return { success: true, model: data.model || 'openai/gpt-3.5-turbo' };
    } catch (err: any) {
        console.error('[DeskFlow] API test error:', err.message);
        return { success: false, error: err.message };
    }
});

// Generate AI categorization for apps/websites using OpenRouter API
electron_1.ipcMain.handle('generate-ai-categorization', async (event, items: Array<{name: string, category: string}>) => {
    try {
        const OPENROUTER_API_KEY = getOpenRouterApiKey();
        if (!OPENROUTER_API_KEY) {
            console.warn('[DeskFlow] OpenRouter API key not set');
            return [];
        }

        console.log(`[DeskFlow] Generating categories for ${items.length} items...`);

        const itemsList = items.map(i => `${i.name} (current: ${i.category})`).join(', ');
        
        const userPrompt = `Categorize these apps/websites into appropriate categories. Use these categories: IDE, AI Tools, Browser, Entertainment, Communication, Design, Productivity, Tools, Education, Developer Tools, Search Engine, News, Shopping, Social Media, Uncategorized, Other.

Items: ${itemsList}

Return ONLY a JSON array of objects with "name" and "category" keys.

Example format: [{"name": "app1", "category": "Productivity"}, {"name": "app2", "category": "Entertainment"}]`;

        const response = await fetch(OPENROUTER_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://deskflow.app',
                'X-Title': 'DeskFlow',
            },
            body: JSON.stringify({
                model: OPENROUTER_MODELS[0],
                messages: [
                    { role: 'system', content: CATEGORY_SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 2000,
                temperature: 0.3,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[DeskFlow] OpenRouter API error (${response.status}):`, errorText);
            return [];
        }

        const data = await response.json();
        console.log('[DeskFlow] OpenRouter response:', JSON.stringify(data, null, 2));

        if (data.error) {
            console.error('[DeskFlow] OpenRouter returned error:', data.error);
            return [];
        }

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            console.error('[DeskFlow] No content in OpenRouter response');
            return [];
        }

        console.log('[DeskFlow] Raw AI response:', content);

        const result = extractJsonFromResponse(content);
        console.log('[DeskFlow] Parsed categories:', result);
        return result;
    } catch (err: any) {
        console.error('[DeskFlow] AI categorization error:', err.message);
        return [];
    }
});

// --- Browser Tracking HTTP Server ---
function startBrowserTrackingServer() {
    if (!isBrowserTrackingEnabled) {
        console.log('[DeskFlow] 🚫 Browser tracking disabled, server not started');
        return;
    }
    const server = http_1.default.createServer((req, res) => {
        // Only accept POST /browser-data
        if (req.method === 'POST' && req.url === '/browser-data') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    console.log('[DeskFlow] Browser data received:', data.domain, 'is_browser_focused:', data.is_browser_focused);
                    
                    // FIX: Only process if browser is focused
                    if (data.is_browser_focused === false) {
                        console.log('[DeskFlow] ⏸️ Browser event skipped - browser not focused');
                    } else {
                        handleBrowserData(data);
                        // Always stream to renderer - let renderer filter
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            const category = categorizeDomain(data.domain, data.title, data.url);
                            console.log('[DeskFlow] Sending browser event:', data.domain);
                            mainWindow.webContents.send('browser-tracking-event', {
                                type: 'browser-data',
                                domain: data.domain,
                                url: data.url,
                                title: data.title,
                                category: category,
                                duration: data.active_duration_ms,
                                is_browser_focused: data.is_browser_focused,
                                timestamp: Date.now()
                            });
                        }
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                }
                catch (err) {
                    console.error('[DeskFlow] Invalid browser data:', err);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
                }
            });
        }
        else if (req.method === 'GET' && req.url === '/health') {
            // Health check endpoint
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', tracking: isBrowserTrackingEnabled }));
        }
        else if (req.method === 'GET' && req.url === '/foreground-app') {
            // Return the current foreground app name so browser extension can check if browser is focused
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                app: currentApp,
                isTracking: isBrowserTrackingEnabled
            }));
        }
        else if (req.method === 'POST' && req.url === '/browser-identify') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.browser) {
                        userPreferences.browserWithExtension = data.browser;
                        savePreferences();
                        console.log(`[DeskFlow] 🏷️ Browser extension identified as: ${data.browser}`);
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', browser: data.browser }));
                }
                catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
                }
            });
        }
        else if (req.method === 'POST' && req.url === '/browser-log') {
            // Live log streaming endpoint from extension
            let logBody = '';
            req.on('data', chunk => { logBody += chunk.toString(); });
            req.on('end', () => {
                try {
                    const log = JSON.parse(logBody);
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        const category = categorizeDomain(log.domain, log.title, log.url);
                        console.log('[DeskFlow] Sending live-log with category:', category);
                        mainWindow.webContents.send('browser-tracking-event', {
                            type: 'live-log',
                            message: log.message,
                            level: log.level,
                            domain: log.domain,
                            url: log.url,
                            title: log.title,
                            category: category,
                            timestamp: log.timestamp || Date.now()
                        });
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok' }));
                }
                catch (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', message: 'Invalid JSON' }));
                }
            });
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'not found' }));
        }
    });
    server.listen(browserServerPort, () => {
        console.log(`[DeskFlow] 🌐 Browser tracking server started on port ${browserServerPort}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[DeskFlow] ⚠️ Port ${browserServerPort} already in use, browser tracking unavailable`);
        }
        else {
            console.error('[DeskFlow] Browser server error:', err.message);
        }
    });
    browserServer = server;
    // FIX 2: Start the stale session flush timer
    startBrowserSessionFlushTimer();
}
// Handle incoming browser tracking data from extension
// FIX 1 + FIX 4: Use Map<string, LogEntry> keyed by domain, track time deltas properly
// FIX: Only track the MOST RECENTLY active tab, not all tabs
function handleBrowserData(data) {
    if (!isBrowserTrackingEnabled)
        return;
    if (!data.domain || !data.url)
        return;
    // Check if browser is actually focused - don't track if user is on another app
    if (data.is_browser_focused === false) {
        console.log('[DeskFlow] ⏸️ Browser not focused, skipping tracking for:', data.domain);
        return;
    }
    // Check if domain is excluded
    if (categorizeDomain(data.domain, data.title, data.url) === 'Excluded') {
        console.log('[DeskFlow] 🚫 Excluded domain skipped:', data.domain);
        return;
    }
    const sessionDuration = data.active_duration_ms || 0;
    const dataTimestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
    // Only log if session is meaningful (> 2 seconds)
    if (sessionDuration < 2000)
        return;
    // STRICT MODE: Only track the MOST RECENTLY active tab
    // If this domain is NOT the most recent one, skip it
    if (lastActiveBrowserDomain && lastActiveBrowserDomain !== data.domain) {
        const timeSinceLastActive = dataTimestamp - lastActiveBrowserTimestamp;
        // If the last active was within last 30 seconds and this is a different domain, skip
        if (timeSinceLastActive < 30000) {
            console.log(`[DeskFlow] ⏭️ Skipped non-active browser tab: ${data.domain} (active: ${lastActiveBrowserDomain})`);
            return;
        }
    }
    // Update last active domain
    lastActiveBrowserDomain = data.domain;
    lastActiveBrowserTimestamp = dataTimestamp;
    const existingSession = activeBrowserSessions.get(data.domain);
    if (existingSession) {
        // FIX: Use explicit delta from extension if available (new behavior)
        // Otherwise calculate delta from last recorded duration (legacy behavior)
        let safeDelta;
        if (data.is_periodic && data.delta_ms) {
            // New behavior: extension sends explicit delta (time since last sync)
            safeDelta = Math.min(data.delta_ms, MAX_SESSION_MS);
            console.log(`[DeskFlow] 🔄 Periodic update for ${data.domain}: +${Math.floor(safeDelta / 1000)}s (delta)`);
        }
        else {
            // Legacy behavior: calculate delta from total duration
            const lastDuration = existingSession.duration_ms;
            const delta = sessionDuration - lastDuration;
            safeDelta = Math.min(Math.max(0, delta), MAX_SESSION_MS);
        }
        // Only update if there's actual new time (delta > 0 and reasonable)
        if (safeDelta > 1000) { // At least 1 second of new activity
            existingSession.duration_ms = existingSession.duration_ms + safeDelta;
            existingSession.title = data.title || existingSession.title;
            existingSession.timestamp = data.timestamp || new Date().toISOString();
            // Update in SQLite with the accumulated total
            if (!useJson) {
                try {
                    const updateStmt = db.prepare(`UPDATE logs SET duration_ms = ?, title = ?, url = ?, timestamp = ? WHERE id = ?`);
                    updateStmt.run(existingSession.duration_ms, data.title || existingSession.title, data.sanitized_url || data.url, existingSession.timestamp, existingSession.id);
                }
                catch (err) {
                    console.error('[DeskFlow] Browser session update failed:', err);
                }
            }
            else {
                // For JSON fallback: find and update the entry in jsonLogs
                const idx = jsonLogs.findIndex((l) => l.id === existingSession.id);
                if (idx !== -1) {
                    jsonLogs[idx].duration_ms = existingSession.duration_ms;
                    jsonLogs[idx].title = data.title || jsonLogs[idx].title;
                    jsonLogs[idx].url = data.sanitized_url || data.url;
                    jsonLogs[idx].timestamp = existingSession.timestamp;
                    saveJsonLogs();
                }
            }
            console.log(`[DeskFlow] 🔄 Updated browser session: ${data.domain} → ${Math.floor(existingSession.duration_ms / 1000)}s (+${Math.floor(safeDelta / 1000)}s)`);
            // Update browser_sessions aggregate table with the delta
            if (!useJson && safeDelta > 0) {
                updateAggregates(existingSession.timestamp, existingSession.app, existingSession.category, safeDelta, data.domain, true);
            }
        }
    }
    else {
        // No active session for this domain — create new one
        // FIX: Allow first periodic sync to create a new session
        let newSessionDuration;
        if (data.is_periodic) {
            // First periodic sync for this domain - use the delta as session duration
            newSessionDuration = Math.min(data.delta_ms || data.active_duration_ms, MAX_LOGGED_SESSION_MS);
            console.log(`[DeskFlow] 📝 First sync for ${data.domain}: creating new session with ${Math.floor((newSessionDuration || 0) / 1000)}s`);
        }
        // Tab switch - duration is total time on previous tab, use it
        newSessionDuration = Math.min(sessionDuration, MAX_LOGGED_SESSION_MS);
        // Sanity check: if duration > 1 hour, it's likely corrupted
        if (sessionDuration > MAX_LOGGED_SESSION_MS) {
            console.warn(`[DeskFlow] ⚠️ Suspicious duration ${Math.floor(sessionDuration / 1000)}s for new session ${data.domain}, capping to 1 hour`);
        }
        const entry = {
            id: Date.now(),
            timestamp: data.timestamp || new Date().toISOString(),
            app: data.app || 'Browser',
            category: categorizeDomain(data.domain, data.title, data.url),
            duration_ms: newSessionDuration,
            title: data.title || data.domain,
            project: undefined,
            url: data.sanitized_url || data.url,
            domain: data.domain,
            tab_id: data.tab_id,
            is_browser_tracking: true
        };
        // Store in SQLite or JSON
        if (useJson) {
            jsonLogs.unshift(entry);
            if (jsonLogs.length > 50000)
                jsonLogs = jsonLogs.slice(0, 50000);
            saveJsonLogs();
        }
        else {
            try {
                const stmt = db.prepare(`
          INSERT INTO logs (timestamp, app, category, duration_ms, title, project, url, domain, tab_id, is_browser_tracking)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
                stmt.run(entry.timestamp, entry.app, entry.category, entry.duration_ms, entry.title, entry.project, entry.url, entry.domain, entry.tab_id, 1);
            }
            catch (err) {
                console.error('[DeskFlow] Browser data insert failed:', err);
            }
        }
        // Update browser_sessions aggregate table
        updateAggregates(entry.timestamp, entry.app, entry.category, entry.duration_ms, entry.domain, true);
        // FIX 1: Track this domain in the Map
        activeBrowserSessions.set(data.domain, entry);
        console.log(`[DeskFlow] ✅ Browser logged: ${data.domain} → ${Math.floor(sessionDuration / 1000)}s`);
    }
}
// FIX 2: Periodic flush of stale browser sessions (handles MV3 onSuspend unreliability)
// Called every 30 seconds to flush sessions that haven't been updated in 60+ seconds
let browserSessionFlushInterval = null;
function startBrowserSessionFlushTimer() {
    if (browserSessionFlushInterval)
        clearInterval(browserSessionFlushInterval);
    browserSessionFlushInterval = setInterval(() => {
        const now = Date.now();
        const STALE_THRESHOLD_MS = 60000; // 60 seconds
        for (const [domain, session] of activeBrowserSessions.entries()) {
            // Check if this session is stale by comparing its timestamp
            const sessionAge = now - new Date(session.timestamp).getTime();
            if (sessionAge > STALE_THRESHOLD_MS) {
                // Session is stale — remove from active map (it's already persisted in SQLite)
                activeBrowserSessions.delete(domain);
                console.log(`[DeskFlow] 🧹 Flushed stale browser session: ${domain} (${Math.floor(session.duration_ms / 1000)}s)`);
            }
        }
    }, 30000); // Check every 30 seconds
}
function stopBrowserSessionFlushTimer() {
    if (browserSessionFlushInterval) {
        clearInterval(browserSessionFlushInterval);
        browserSessionFlushInterval = null;
    }
}
// Get browser activity logs
function getBrowserLogs(period?: 'today' | 'week' | 'month' | 'all') {
    let startDate: string | null = null;
    const now = new Date();
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString();
    } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString();
    }

    if (useJson) {
        let logs = jsonLogs.filter((log) => log.is_browser_tracking);
        if (startDate) {
            logs = logs.filter(l => l.timestamp >= startDate);
        }
        return logs.slice(0, 200);
    }
    try {
        let query = `SELECT * FROM logs WHERE is_browser_tracking = 1`;
        const params: string[] = [];
        if (startDate) {
            query += ` AND timestamp >= ?`;
            params.push(startDate);
        }
        query += ` ORDER BY id DESC LIMIT 200`;
        const stmt = db.prepare(query);
        return stmt.all(...params);
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-logs error:', err);
        return [];
    }
}
// Get browser stats grouped by domain
function getBrowserDomainStats(period?: 'today' | 'week' | 'month' | 'all') {
    let startDate: string | null = null;
    const now = new Date();
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString();
    } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString();
    }

    if (useJson) {
        let logs = jsonLogs.filter((log) => log.is_browser_tracking);
        if (startDate) {
            logs = logs.filter(l => l.timestamp >= startDate);
        }
        const stats = new Map();
        logs.forEach((log) => {
            const key = log.domain || 'unknown';
            const existing = stats.get(key) || { total_ms: 0, sessions: 0, domain: key, category: log.category || 'Other', title: log.title || key };
            existing.total_ms += log.duration_ms;
            existing.sessions += 1;
            stats.set(key, existing);
        });
        return Array.from(stats.values()).sort((a, b) => b.total_ms - a.total_ms);
    }
    try {
        let query = `
      SELECT domain, category, SUM(duration_ms) as total_ms, COUNT(*) as sessions, MAX(title) as title
      FROM logs 
      WHERE is_browser_tracking = 1 AND domain IS NOT NULL
    `;
        const params: string[] = [];
        if (startDate) {
            query += ` AND timestamp >= ?`;
            params.push(startDate);
        }
        query += ` GROUP BY domain ORDER BY total_ms DESC`;
        const stmt = db.prepare(query);
        return stmt.all(...params);
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-domain-stats error:', err);
        return [];
    }
}
// Get browser stats grouped by category
function getBrowserCategoryStats(period?: 'today' | 'week' | 'month' | 'all') {
    let startDate: string | null = null;
    const now = new Date();
    
    if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        startDate = weekAgo.toISOString();
    } else if (period === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        startDate = monthAgo.toISOString();
    }

    if (useJson) {
        let logs = jsonLogs.filter((log) => log.is_browser_tracking);
        if (startDate) {
            logs = logs.filter(l => l.timestamp >= startDate);
        }
        const stats = new Map();
        logs.forEach((log) => {
            const key = log.category || 'Other';
            const existing = stats.get(key) || { total_ms: 0, sessions: 0, category: key };
            existing.total_ms += log.duration_ms;
            existing.sessions += 1;
            stats.set(key, existing);
        });
        return Array.from(stats.values()).sort((a, b) => b.total_ms - a.total_ms);
    }
    try {
        let query = `
      SELECT category, SUM(duration_ms) as total_ms, COUNT(*) as sessions
      FROM logs 
      WHERE is_browser_tracking = 1 AND category IS NOT NULL
    `;
        const params: string[] = [];
        if (startDate) {
            query += ` AND timestamp >= ?`;
            params.push(startDate);
        }
        query += ` GROUP BY category ORDER BY total_ms DESC`;
        const stmt = db.prepare(query);
        return stmt.all(...params);
    }
    catch (err) {
        console.error('[DeskFlow] get-browser-category-stats error:', err);
        return [];
    }
}
electron_1.app.whenReady().then(() => {
    initializeStorage();
    loadCategoryConfig();
    loadSleepState(); // Load sleep tracking state
    
    // Check if we should show morning prompt
    checkMorningPrompt();
    
    // Check if started with --minimized flag (background mode)
    startMinimized = process.argv.includes('--minimized') || process.argv.includes('-m');
    
    // Always create tray first (works in background)
    createTray();
    
    // Only create window if NOT starting minimized (background mode)
    if (!startMinimized) {
        createWindow();
    } else {
        // In background mode, just start tracking - no window needed yet
        console.log('[DeskFlow] 🔄 Running in background (minimized)');
    }
    
    startBrowserTrackingServer();
    
    // Set auto-start only once (not every run) - but only if explicitly enabled by user
    // Removed: electron_1.app.setLoginItemSettings auto-set on every run
    
    // Load browser tracking preferences
    if (userPreferences.browserTrackingPort) {
        browserServerPort = userPreferences.browserTrackingPort;
    }
    if (userPreferences.browserTrackingEnabled !== undefined) {
        isBrowserTrackingEnabled = userPreferences.browserTrackingEnabled;
    }
    if (userPreferences.browserExcludedDomains) {
        browserExcludedDomains = userPreferences.browserExcludedDomains;
    }
    console.log('[DeskFlow] ✅ Real window tracking started with active-win');
    console.log(`[DeskFlow] ✅ Browser tracking: ${isBrowserTrackingEnabled ? 'ON' : 'OFF'}`);
    console.log(`[DeskFlow] ✅ Auto-start: ${electron_1.app.getLoginItemSettings().openAtLogin ? 'enabled' : 'disabled'}`);
});

// ========== External Activities IPC Handlers ==========

electron_1.ipcMain.handle('get-external-activities', () => {
    if (useJson) return [];
    try {
        return db.prepare('SELECT * FROM external_activities WHERE is_visible = 1 ORDER BY sort_order').all();
    } catch (err) {
        console.error('[DeskFlow] Failed to get external activities:', err);
        return [];
    }
});

electron_1.ipcMain.handle('add-external-activity', (event, activity) => {
    if (useJson) return { success: false };
    try {
        const result = db.prepare(`
            INSERT INTO external_activities (name, type, color, icon, default_duration, is_default, sort_order)
            VALUES (?, ?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM external_activities))
        `).run(activity.name, activity.type, activity.color || '#6366f1', activity.icon || 'Clock', activity.default_duration || 30);
        return { success: true, id: result.lastInsertRowid.toString() };
    } catch (err) {
        console.error('[DeskFlow] Failed to add external activity:', err);
        return { success: false };
    }
});

electron_1.ipcMain.handle('update-external-activity', (event, id, updates) => {
    if (useJson) return false;
    try {
        const fields = [];
        const values = [];
        if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
        if (updates.color) { fields.push('color = ?'); values.push(updates.color); }
        if (updates.icon) { fields.push('icon = ?'); values.push(updates.icon); }
        if (updates.default_duration) { fields.push('default_duration = ?'); values.push(updates.default_duration); }
        if (updates.is_visible !== undefined) { fields.push('is_visible = ?'); values.push(updates.is_visible ? 1 : 0); }
        if (fields.length === 0) return true;
        values.push(id);
        db.prepare(`UPDATE external_activities SET ${fields.join(', ')} WHERE id = ?`).run(...values);
        return true;
    } catch (err) {
        console.error('[DeskFlow] Failed to update external activity:', err);
        return false;
    }
});

electron_1.ipcMain.handle('delete-external-activity', (event, id) => {
    if (useJson) return false;
    try {
        db.prepare('DELETE FROM external_sessions WHERE activity_id = ?').run(id);
        db.prepare('DELETE FROM external_activities WHERE id = ? AND is_default = 0').run(id);
        return true;
    } catch (err) {
        console.error('[DeskFlow] Failed to delete external activity:', err);
        return false;
    }
});

// ========== External Sessions IPC Handlers ==========

electron_1.ipcMain.handle('start-external-session', (event, activityId) => {
    if (useJson) return { success: false };
    try {
        const result = db.prepare(`
            INSERT INTO external_sessions (activity_id, started_at)
            VALUES (?, ?)
        `).run(activityId, new Date().toISOString());
        return { success: true, sessionId: result.lastInsertRowid.toString() };
    } catch (err) {
        console.error('[DeskFlow] Failed to start external session:', err);
        return { success: false };
    }
});

electron_1.ipcMain.handle('stop-external-session', (event, sessionId, endTime) => {
    if (useJson) return { success: false, duration: 0 };
    try {
        const now = endTime ? new Date(endTime) : new Date();
        const session = db.prepare('SELECT * FROM external_sessions WHERE id = ?').get(sessionId);
        if (!session) return { success: false, duration: 0 };
        
        const startedAt = new Date(session.started_at);
        const durationSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        
        db.prepare(`
            UPDATE external_sessions 
            SET ended_at = ?, duration_seconds = ?
            WHERE id = ?
        `).run(now.toISOString(), durationSeconds, sessionId);
        
        return { success: true, duration: durationSeconds };
    } catch (err) {
        console.error('[DeskFlow] Failed to stop external session:', err);
        return { success: false, duration: 0 };
    }
});

electron_1.ipcMain.handle('add-manual-sleep', (event, sleepData: { started_at: string; ended_at: string; device_off_to_sleep_seconds?: number; wake_up_to_app_seconds?: number }) => {
    if (useJson) return { success: false };
    try {
        const startTime = new Date(sleepData.started_at);
        const endTime = new Date(sleepData.ended_at);
        const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        if (durationSeconds <= 0) {
            return { success: false, error: 'End time must be after start time' };
        }
        
        const sleepActivity = db.prepare(`
            SELECT id FROM external_activities WHERE type = 'sleep' LIMIT 1
        `).get() as any;
        
        if (!sleepActivity) {
            return { success: false, error: 'No sleep activity found' };
        }
        
        const result = db.prepare(`
            INSERT INTO external_sessions (activity_id, started_at, ended_at, duration_seconds, device_off_to_sleep_seconds, wake_up_to_app_seconds)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            sleepActivity.id, 
            startTime.toISOString(), 
            endTime.toISOString(), 
            durationSeconds,
            sleepData.device_off_to_sleep_seconds || 0,
            sleepData.wake_up_to_app_seconds || 0
        );
        
        return { success: true, sessionId: result.lastInsertRowid.toString() };
    } catch (err) {
        console.error('[DeskFlow] Failed to add manual sleep:', err);
        return { success: false };
    }
});

electron_1.ipcMain.handle('get-active-external-session', (event) => {
    if (useJson) return null;
    try {
        const session = db.prepare(`
            SELECT es.*, ea.name, ea.type, ea.color, ea.icon
            FROM external_sessions es
            JOIN external_activities ea ON es.activity_id = ea.id
            WHERE es.ended_at IS NULL
            ORDER BY es.started_at DESC
            LIMIT 1
        `).get();
        return session || null;
    } catch (err) {
        console.error('[DeskFlow] Failed to get active external session:', err);
        return null;
    }
});

electron_1.ipcMain.handle('get-morning-prompt', (event) => {
    try {
        const promptPath = path_1.default.join(userDataPath, 'show-morning-prompt.json');
        if (fs_1.default.existsSync(promptPath)) {
            const data = JSON.parse(fs_1.default.readFileSync(promptPath, 'utf-8'));
            return data;
        }
        return null;
    } catch (err) {
        console.error('[DeskFlow] Failed to get morning prompt:', err);
        return null;
    }
});

electron_1.ipcMain.handle('dismiss-morning-prompt', (event) => {
    try {
        const promptPath = path_1.default.join(userDataPath, 'show-morning-prompt.json');
        if (fs_1.default.existsSync(promptPath)) {
            fs_1.default.unlinkSync(promptPath);
        }
        return true;
    } catch (err) {
        console.error('[DeskFlow] Failed to dismiss morning prompt:', err);
        return false;
    }
});

electron_1.ipcMain.handle('get-external-sessions', (event, period = 'all') => {
    if (useJson) return [];
    try {
        let dateFilter = '';
        const now = new Date();
        
        if (period === 'today') {
            const today = now.toISOString().split('T')[0];
            dateFilter = `AND date(es.started_at) = '${today}'`;
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateFilter = `AND date(es.started_at) >= '${weekAgo}'`;
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateFilter = `AND date(es.started_at) >= '${monthAgo}'`;
        }
        
        return db.prepare(`
            SELECT es.*, ea.name as activity_name, ea.type, ea.color, ea.icon
            FROM external_sessions es
            JOIN external_activities ea ON es.activity_id = ea.id
            WHERE es.ended_at IS NOT NULL ${dateFilter}
            ORDER BY es.started_at DESC
        `).all();
    } catch (err) {
        console.error('[DeskFlow] Failed to get external sessions:', err);
        return [];
    }
});

// ========== External Statistics IPC Handlers ==========

electron_1.ipcMain.handle('get-external-stats', (event, period = 'all') => {
    if (useJson) return { byActivity: {}, total_seconds: 0, sleep_deficit_seconds: 0, average_sleep_hours: 0 };
    try {
        let dateFilter = '';
        const now = new Date();
        
        if (period === 'today') {
            const today = now.toISOString().split('T')[0];
            dateFilter = `AND date(es.started_at) = '${today}'`;
        } else if (period === 'week') {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateFilter = `AND date(es.started_at) >= '${weekAgo}'`;
        } else if (period === 'month') {
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            dateFilter = `AND date(es.started_at) >= '${monthAgo}'`;
        }
        
        const sessions = db.prepare(`
            SELECT es.*, ea.name, ea.type
            FROM external_sessions es
            JOIN external_activities ea ON es.activity_id = ea.id
            WHERE es.ended_at IS NOT NULL ${dateFilter}
        `).all();
        
        const byActivity: Record<string, { total_seconds: number; session_count: number }> = {};
        let totalSeconds = 0;
        
        for (const s of sessions) {
            if (!byActivity[s.name]) {
                byActivity[s.name] = { total_seconds: 0, session_count: 0 };
            }
            byActivity[s.name].total_seconds += s.duration_seconds || 0;
            byActivity[s.name].session_count += 1;
            totalSeconds += s.duration_seconds || 0;
        }
        
        // Calculate sleep deficit
        const sleepSessions = sessions.filter((s: any) => s.type === 'sleep');
        const targetSleepSeconds = 8 * 3600; // 8 hours
        const totalSleepSeconds = sleepSessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
        const sleepDeficitSeconds = (targetSleepSeconds * sleepSessions.length) - totalSleepSeconds;
        const averageSleepHours = sleepSessions.length > 0 ? (totalSleepSeconds / sleepSessions.length / 3600) : 0;
        
        return {
            byActivity,
            total_seconds: totalSeconds,
            sleep_deficit_seconds: sleepDeficitSeconds,
            average_sleep_hours: averageSleepHours
        };
    } catch (err) {
        console.error('[DeskFlow] Failed to get external stats:', err);
        return { byActivity: {}, total_seconds: 0, sleep_deficit_seconds: 0, average_sleep_hours: 0 };
    }
});

electron_1.ipcMain.handle('get-activity-stats', (event, activityId: string) => {
    if (useJson) return { today_seconds: 0, week_seconds: 0, month_seconds: 0, session_count: 0 };
    try {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const todayStats = db.prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) as total, COUNT(*) as count
            FROM external_sessions
            WHERE activity_id = ? AND ended_at IS NOT NULL AND date(started_at) = ?
        `).get(activityId, today) as any;
        
        const weekStats = db.prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) as total, COUNT(*) as count
            FROM external_sessions
            WHERE activity_id = ? AND ended_at IS NOT NULL AND date(started_at) >= ?
        `).get(activityId, weekAgo) as any;
        
        const monthStats = db.prepare(`
            SELECT COALESCE(SUM(duration_seconds), 0) as total, COUNT(*) as count
            FROM external_sessions
            WHERE activity_id = ? AND ended_at IS NOT NULL AND date(started_at) >= ?
        `).get(activityId, monthAgo) as any;
        
        return {
            today_seconds: todayStats?.total || 0,
            week_seconds: weekStats?.total || 0,
            month_seconds: monthStats?.total || 0,
            session_count: todayStats?.count || 0
        };
    } catch (err) {
        console.error('[DeskFlow] Failed to get activity stats:', err);
        return { today_seconds: 0, week_seconds: 0, month_seconds: 0, session_count: 0 };
    }
});

electron_1.ipcMain.handle('get-typical-day', (event, days = 30) => {
    if (useJson) return [];
    try {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const sessions = db.prepare(`
            SELECT es.started_at, es.duration_seconds, ea.name
            FROM external_sessions es
            JOIN external_activities ea ON es.activity_id = ea.id
            WHERE es.ended_at IS NOT NULL AND date(es.started_at) >= ?
        `).all(startDate) as any[];
        const hourlyMap: Record<number, Record<string, number>> = {};
        for (let h = 0; h < 24; h++) hourlyMap[h] = {};
        for (const s of sessions) {
            const hour = new Date(s.started_at).getHours();
            if (!hourlyMap[hour][s.name]) hourlyMap[hour][s.name] = 0;
            hourlyMap[hour][s.name] += s.duration_seconds || 0;
        }
        const result = [];
        for (let h = 0; h < 24; h++) {
            const sorted = Object.entries(hourlyMap[h]).sort((a, b) => b[1] - a[1]);
            result.push({ hour: h, primaryActivity: sorted[0]?.[0] || 'none', totalSeconds: sorted[0]?.[1] || 0 });
        }
        return result;
    } catch (err) {
        console.error('[DeskFlow] Failed to get typical day:', err);
        return [];
    }
});

electron_1.ipcMain.handle('get-hourly-heatmap', (event, days = 7) => {
    if (useJson) return [[0]];
    try {
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const sessions = db.prepare(`
            SELECT es.started_at, es.duration_seconds
            FROM external_sessions es
            WHERE es.ended_at IS NOT NULL AND date(es.started_at) >= ?
        `).all(startDate) as any[];
        const grid: number[][] = [];
        for (let d = 0; d < 7; d++) { grid[d] = []; for (let h = 0; h < 24; h++) grid[d][h] = 0; }
        for (const s of sessions) {
            const date = new Date(s.started_at);
            grid[date.getDay()][date.getHours()] += (s.duration_seconds || 0) / 3600;
        }
        return grid;
    } catch (err) { return [[0]]; }
});

electron_1.ipcMain.handle('get-best-days', () => {
    if (useJson) return { bestDay: 'Mon', worstDay: 'Sun', averages: {} };
    try {
        const sessions = db.prepare(`SELECT started_at, duration_seconds FROM external_sessions WHERE ended_at IS NOT NULL`).all() as any[];
        const dayTotals: Record<number, { total: number; count: number }> = {};
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        for (let d = 0; d < 7; d++) dayTotals[d] = { total: 0, count: 0 };
        for (const s of sessions) {
            const day = new Date(s.started_at).getDay();
            dayTotals[day].total += s.duration_seconds || 0;
            dayTotals[day].count += 1;
        }
        const averages: Record<string, number> = {};
        let bestDay = 'Mon', worstDay = 'Sun', bestAvg = 0, worstAvg = Infinity;
        for (let d = 0; d < 7; d++) {
            const name = dayNames[d];
            const avg = dayTotals[d].count > 0 ? dayTotals[d].total / dayTotals[d].count : 0;
            averages[name] = Math.round(avg / 3600 * 10) / 10;
            if (avg > bestAvg) { bestAvg = avg; bestDay = name; }
            if (avg < worstAvg && dayTotals[d].count > 0) { worstAvg = avg; worstDay = name; }
        }
        return { bestDay, worstDay, averages };
    } catch (err) { return { bestDay: 'Mon', worstDay: 'Sun', averages: {} }; }
});

electron_1.ipcMain.handle('get-sleep-trends', (event, period = 'week') => {
    if (useJson) return { daily: [], average_bedtime: '', average_wake_time: '', average_sleep_duration: 0, average_latency: 0, average_wake_latency: 0 };
    try {
        const days = period === 'week' ? 7 : 30;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const sessions = db.prepare(`
            SELECT es.*, ea.name, ea.type
            FROM external_sessions es
            JOIN external_activities ea ON es.activity_id = ea.id
            WHERE ea.type = 'sleep' AND es.ended_at IS NOT NULL AND date(es.started_at) >= ?
            ORDER BY es.started_at ASC
        `).all(startDate);
        
        const daily: Array<{ date: string; sleep_seconds: number; deficit_seconds: number }> = [];
        const targetSleep = 8 * 3600;
        
        // Group by date
        const byDate: Record<string, { sleep_seconds: number; bedtime_count: number; bedtime_sum: number; waketime_sum: number }> = {};
        for (const s of sessions) {
            const date = s.started_at.split('T')[0];
            if (!byDate[date]) {
                byDate[date] = { sleep_seconds: 0, bedtime_count: 0, bedtime_sum: 0, waketime_sum: 0 };
            }
            byDate[date].sleep_seconds += s.duration_seconds || 0;
            byDate[date].bedtime_count += 1;
            const bedtime = new Date(s.started_at);
            const waketime = new Date(s.ended_at);
            
            byDate[date].bedtime_sum += bedtime.getHours() * 60 + bedtime.getMinutes();
            byDate[date].waketime_sum += waketime.getHours() * 60 + waketime.getMinutes();
        }
        
        for (const [date, data] of Object.entries(byDate)) {
            const avgBedtimeMinutes = data.bedtime_count > 0 ? Math.round(data.bedtime_sum / data.bedtime_count) : 0;
            let avgWaketimeMinutes = data.bedtime_count > 0 ? Math.round(data.waketime_sum / data.bedtime_count) : 0;
            
            // Adjust for midnight crossing
            if (avgWaketimeMinutes < 720 && avgBedtimeMinutes > 720) {
                // Went to bed at night, woke up next morning - that's fine
            } else if (avgWaketimeMinutes < avgBedtimeMinutes) {
                avgWaketimeMinutes += 24 * 60; // Add 24 hours
            }
            
            daily.push({
                date,
                sleep_seconds: data.sleep_seconds,
                deficit_seconds: targetSleep - data.sleep_seconds
            });
        }
        
        // Calculate average bedtime
        const allBedtimes = sessions.map((s: any) => {
            const d = new Date(s.started_at);
            return d.getHours() * 60 + d.getMinutes();
        });
        const avgBedtimeMinutes = allBedtimes.length > 0 ? Math.round(allBedtimes.reduce((a: number, b: number) => a + b, 0) / allBedtimes.length) : 0;
        const avgBedtime = `${Math.floor(avgBedtimeMinutes / 60).toString().padStart(2, '0')}:${(avgBedtimeMinutes % 60).toString().padStart(2, '0')}`;
        
        // Calculate average wake time
        const allWaketimes = sessions.map((s: any) => {
            const d = new Date(s.ended_at);
            return d.getHours() * 60 + d.getMinutes();
        });
        let avgWaketimeMinutes = allWaketimes.length > 0 ? Math.round(allWaketimes.reduce((a: number, b: number) => a + b, 0) / allWaketimes.length) : 0;
        const avgWaketime = `${Math.floor(avgWaketimeMinutes / 60).toString().padStart(2, '0')}:${(avgWaketimeMinutes % 60).toString().padStart(2, '0')}`;
        
        // Calculate average sleep duration
        const totalSleepSeconds = sessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
        const avgSleepDuration = sessions.length > 0 ? Math.round(totalSleepSeconds / sessions.length) : 0;
        
        // Calculate average latencies
        const avgLatency = sessions.length > 0 
            ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.device_off_to_sleep_seconds || 0), 0) / sessions.length)
            : 0;
        
        const avgWakeLatency = sessions.length > 0 
            ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.wake_up_to_app_seconds || 0), 0) / sessions.length)
            : 0;
        
        return { 
            daily, 
            average_bedtime: avgBedtime, 
            average_wake_time: avgWaketime,
            average_sleep_duration: avgSleepDuration,
            average_latency: avgLatency,
            average_wake_latency: avgWakeLatency
        };
    } catch (err) {
        console.error('[DeskFlow] Failed to get sleep trends:', err);
        return { daily: [], average_bedtime: '', average_wake_time: '', average_sleep_duration: 0, average_latency: 0, average_wake_latency: 0 };
    }
});

electron_1.ipcMain.handle('get-consistency-score', (event, period = 'week') => {
    if (useJson) return { score: 0, weekly_comparison: [], this_week: 0, last_week: 0, trend: 'stable', streak: 0 };
    try {
        const weeks = 4;
        const weeklyTotals: Array<{ week: string; total_seconds: number }> = [];
        const now = new Date();
        
        for (let i = weeks - 1; i >= 0; i--) {
            const daysAgo = (i + 1) * 7;
            const weekStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            weekStart.setHours(0, 0, 0, 0);
            
            const daysAgoEnd = i * 7;
            const weekEnd = new Date(now.getTime() - daysAgoEnd * 24 * 60 * 60 * 1000);
            weekEnd.setHours(0, 0, 0, 0);
            
            const weekLabel = `${weekStart.toISOString().split('T')[0]}`;
            
            const sessions = db.prepare(`
                SELECT COALESCE(SUM(duration_seconds), 0) as total
                FROM external_sessions
                WHERE ended_at IS NOT NULL 
                AND date(started_at) >= date(?) AND date(started_at) < date(?, '+1 day')
            `).get(weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]) as any;
            
            weeklyTotals.push({
                week: weekLabel,
                total_seconds: sessions?.total || 0
            });
        }
        
        const currentWeek = weeklyTotals[weeklyTotals.length - 1];
        const lastWeek = weeklyTotals.length > 1 ? weeklyTotals[weeklyTotals.length - 2] : { week: '', total_seconds: 0 };
        const targetSeconds = 30 * 3600;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (currentWeek.total_seconds > lastWeek.total_seconds * 1.1) trend = 'up';
        else if (currentWeek.total_seconds < lastWeek.total_seconds * 0.9) trend = 'down';
        
        const variance = Math.abs((currentWeek?.total_seconds || 0) - targetSeconds) / targetSeconds;
        const score = Math.max(0, Math.round((1 - variance) * 100));
        
        let streak = 0;
        for (const w of [...weeklyTotals].reverse()) {
            if (w.total_seconds >= targetSeconds * 0.8) streak++;
            else break;
        }
        
        return { 
            score, 
            weekly_comparison: weeklyTotals, 
            this_week: currentWeek.total_seconds,
            last_week: lastWeek.total_seconds,
            trend,
            streak
        };
    } catch (err) {
        console.error('[DeskFlow] Failed to get consistency score:', err);
        return { score: 0, weekly_comparison: [], this_week: 0, last_week: 0, trend: 'stable', streak: 0 };
    }
});

electron_1.app.on('window-all-closed', () => {
    // Keep app running in background (tray mode)
});
electron_1.app.on('before-quit', () => {
    electron_1.app.isQuitting = true;
    if (trackingInterval)
        clearInterval(trackingInterval);
    
    // Save close time for sleep tracking
    lastCloseTime = Date.now();
    lastCloseType = 'normal';
    saveSleepState();
    
    // Log current session before quit
     // Filter out Electron/DeskFlow app (don't track the app itself)
     if (currentApp && Date.now() - sessionStart > 5000 && currentApp !== 'DeskFlow' && currentApp !== 'Electron') {
         const duration = Date.now() - sessionStart;
         const category = categorizeApp(currentApp);
         addLog(new Date(sessionStart).toISOString(), currentApp, category, duration, `${currentApp} Window`, null);
         console.log('[DeskFlow] ✅ Logged final session before quit:', currentApp);
     }
    // Auto-stop active external sessions before quit
    try {
        const activeSession = db.prepare(`
            SELECT es.*, ea.type
            FROM external_sessions es
            JOIN external_activities ea ON es.activity_id = ea.id
            WHERE es.ended_at IS NULL
        `).get();
        if (activeSession) {
            const now = new Date();
            const startedAt = new Date(activeSession.started_at);
            let durationMs = now.getTime() - startedAt.getTime();
            // Handle midnight crossing for sleep
            if (durationMs < 0) {
                durationMs += 24 * 60 * 60 * 1000;
            }
            const durationSeconds = Math.floor(durationMs / 1000);
            db.prepare(`
                UPDATE external_sessions 
                SET ended_at = ?, duration_seconds = ?
                WHERE id = ?
            `).run(now.toISOString(), durationSeconds, activeSession.id);
            console.log('[DeskFlow] ✅ Auto-stopped external session:', activeSession.id, 'Duration:', durationSeconds, 's');
        }
    } catch (err) {
        console.error('[DeskFlow] Failed to auto-stop external session:', err);
    }
    // Ensure JSON data is flushed
    if (useJson) {
        saveJsonLogs();
        console.log('[DeskFlow] ✅ JSON data flushed to disk');
    }
    // Close browser tracking server
    if (browserServer) {
        browserServer.close();
        console.log('[DeskFlow] ✅ Browser tracking server closed');
    }
    // Unregister global shortcuts
    globalShortcut.unregisterAll();
    console.log('[DeskFlow] ✅ Global shortcuts unregistered');
    // Close SQLite connection
    if (db) {
        db.close();
        console.log('[DeskFlow] ✅ SQLite database closed');
    }
    console.log('[DeskFlow] 👋 App quit gracefully');
});
