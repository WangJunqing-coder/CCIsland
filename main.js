const { app, BrowserWindow, screen, ipcMain, Notification } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let httpServer = null;
const PORT = 31126;

const STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  ERROR: 'error',
};

let currentStatus = STATUS.IDLE;
let statusMessage = '';
let prevStatus = STATUS.IDLE;
let completedTimer = null;

// ─── 创建灵动岛窗口 ───────────────────────────────────
function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 200,
    height: 56,
    x: Math.round((screenWidth - 200) / 2),
    y: 8,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setIgnoreMouseEvents(false);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── 状态推送 ─────────────────────────────────────────
function pushStatus(status, message = '') {
  if (status === currentStatus && message === statusMessage) return;

  prevStatus = currentStatus;
  currentStatus = status;
  statusMessage = message;

  // 清除已完成的自动重置定时器
  if (completedTimer) {
    clearTimeout(completedTimer);
    completedTimer = null;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('status-update', { status, message });
  }

  // 状态变化时发通知
  if (status === STATUS.WAITING && prevStatus !== STATUS.WAITING) {
    sendNotification('⚠️ Claude Code 需要确认', message || '有操作需要你的确认');
  }
  if (status === STATUS.COMPLETED && prevStatus !== STATUS.COMPLETED) {
    sendNotification('✅ Claude Code 任务完成', message || '任务已完成');
    // 8 秒后自动回到就绪
    completedTimer = setTimeout(() => {
      if (currentStatus === STATUS.COMPLETED) {
        pushStatus(STATUS.IDLE, '');
      }
    }, 8000);
  }
  if (status === STATUS.ERROR && prevStatus !== STATUS.ERROR) {
    sendNotification('❌ Claude Code 出现错误', message || '执行过程中出现错误');
  }
}

function sendNotification(title, body) {
  if (Notification.isSupported()) {
    const notification = new Notification({ title, body, silent: false });
    notification.show();
  }
}

// ─── 自动配置 Claude Code Hooks ───────────────────────
function getNotifyScriptPath() {
  // 打包后 hooks 在 resources/app/hooks/ 下
  // 开发模式在项目根目录 hooks/ 下
  const isPackaged = app.isPackaged;
  if (isPackaged) {
    return path.join(process.resourcesPath, 'app', 'hooks', 'notify.js');
  }
  return path.join(__dirname, 'hooks', 'notify.js');
}

function autoConfigHooks() {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const notifyScript = getNotifyScriptPath();

  // 确保 hooks 目录存在
  if (!fs.existsSync(path.join(os.homedir(), '.claude'))) {
    fs.mkdirSync(path.join(os.homedir(), '.claude'), { recursive: true });
  }

  let settings = {};
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch (e) {}

  if (!settings.hooks) settings.hooks = {};

  const hookCmd = `node "${notifyScript}"`;

  // 只配置确定性的状态 hook，Notification 太泛不配
  const hooksToSet = {
    PreToolUse: [{ matcher: '', hooks: [{ type: 'command', command: `${hookCmd} running "正在执行..."` }] }],
    PostToolUse: [{ matcher: '', hooks: [{ type: 'command', command: `${hookCmd} running "处理中..."` }] }],
    Stop: [{ matcher: '', hooks: [{ type: 'command', command: `${hookCmd} completed "任务完成"` }] }],
  };

  let changed = false;

  // 清理旧的 Notification hook（会误触发）
  if (settings.hooks.Notification) {
    delete settings.hooks.Notification;
    changed = true;
  }

  for (const [event, hookList] of Object.entries(hooksToSet)) {
    if (!settings.hooks[event]) {
      settings.hooks[event] = hookList;
      changed = true;
    } else {
      const hasHook = settings.hooks[event].some(h =>
        h.hooks && h.hooks.some(hh => hh.command && hh.command.includes('notify.js'))
      );
      if (!hasHook) {
        settings.hooks[event].push(...hookList);
        changed = true;
      }
    }
  }

  if (changed) {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
      console.log('[CCIsland] 已自动配置 Claude Code hooks');
    } catch (e) {
      console.error('[CCIsland] 配置 hooks 失败:', e.message);
    }
  }
}

// ─── HTTP 状态接收服务器 ───────────────────────────────
function startHttpServer() {
  httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: currentStatus, message: statusMessage }));
      return;
    }

    if (req.method === 'POST' && req.url === '/status') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          const { status, message } = data;
          if (Object.values(STATUS).includes(status)) {
            pushStatus(status, message || '');
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid status' }));
          }
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  });

  httpServer.listen(PORT, '127.0.0.1', () => {
    console.log(`[CCIsland] 状态服务已启动: http://127.0.0.1:${PORT}`);
  });
}

// ─── IPC 事件 ─────────────────────────────────────────
ipcMain.on('set-ignore-mouse', (event, ignore) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
  }
});

ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
    const x = Math.round((screenWidth - width) / 2);
    mainWindow.setBounds({ x, y: 8, width, height }, true);
  }
});

// ─── 应用生命周期 ─────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  startHttpServer();
  autoConfigHooks();
});

app.on('window-all-closed', () => {
  if (httpServer) httpServer.close();
  if (completedTimer) clearTimeout(completedTimer);
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
