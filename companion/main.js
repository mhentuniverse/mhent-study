const electron = require('electron');

// Tự động giải cứu nếu môi trường kích hoạt ELECTRON_RUN_AS_NODE=1 (Node Mode)
if (typeof electron === 'string') {
  const { spawn } = require('child_process');
  const cleanEnv = { ...process.env };
  delete cleanEnv.ELECTRON_RUN_AS_NODE;
  const child = spawn(electron, [__dirname], {
    env: cleanEnv,
    detached: true,
    stdio: 'ignore'
  });
  child.unref();
  process.exit(0);
}

const { app, BrowserWindow, ipcMain, Tray, Menu, shell, dialog, nativeImage } = electron;
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const DiscordRPCManager = require('./discord-manager');

let mainWindow = null;
let tray = null;
let localServer = null;
let localServerPort = 14128;
let wss = null;
let emptyClientsTimer = null;
let isQuitting = false;

const discordManager = new DiscordRPCManager({ clientId: '1570699759319126037' });

// Đường dẫn file lưu trữ profile MHEnt ID
const PROFILE_STORE_PATH = path.join(
  process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Preferences') : '/var/local'),
  'mhent-universe-profile.json'
);

function loadSavedProfile() {
  try {
    if (fs.existsSync(PROFILE_STORE_PATH)) {
      return JSON.parse(fs.readFileSync(PROFILE_STORE_PATH, 'utf8'));
    }
  } catch (e) {}
  return null;
}

function saveProfileData(profile) {
  try {
    fs.writeFileSync(PROFILE_STORE_PATH, JSON.stringify(profile, null, 2), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

// 1.5. Bộ Quét Phát Hiện Ứng Dụng Trong Hệ Thống (Auto App Scanner)
function scanInstalledApps() {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userProfile = process.env.USERPROFILE || '';
  const appData = process.env.APPDATA || '';

  const results = {
    study: {
      key: 'study',
      name: 'MHEnt. Study',
      installed: false,
      isWeb: true,
      path: null,
      webUrl: 'https://study.mhentuniverse.com',
      version: 'v2.1.2',
      statusText: 'Phiên Bản Web',
      buttonText: 'Mở Study (Bản Web)',
      buttonIcon: 'fa-globe'
    },
    horizon: {
      key: 'horizon',
      name: 'MHEnt. Horizon',
      installed: false,
      isWeb: false,
      path: null,
      webUrl: 'https://www.mhentuniverse.com',
      version: 'v1.0.0',
      statusText: 'Chưa Phát Hiện',
      buttonText: 'Tải Horizon Studio',
      buttonIcon: 'fa-download'
    },
    orbit: {
      key: 'orbit',
      name: 'AISA Orbit',
      installed: false,
      isWeb: false,
      path: null,
      webUrl: 'https://www.mhentuniverse.com',
      version: 'v1.0.0',
      statusText: 'Chưa Cài Đặt',
      buttonText: 'Tải AISA Orbit',
      buttonIcon: 'fa-download'
    }
  };

  // Quét MHEnt Study (Bản Desktop đã cài)
  const studyCandidates = [
    path.join(localAppData, 'Programs', 'mhent-study', 'MHEnt Study.exe'),
    path.join(localAppData, 'Programs', 'MHEnt Study', 'MHEnt Study.exe'),
    path.join(userProfile, 'Desktop', 'MHEnt Study.lnk'),
    path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'MHEnt Study.lnk')
  ];
  for (const p of studyCandidates) {
    if (p && fs.existsSync(p)) {
      results.study.installed = true;
      results.study.isWeb = false;
      results.study.path = p;
      results.study.statusText = 'Đã Cài Đặt (Desktop)';
      results.study.buttonText = 'Mở Study Desktop';
      results.study.buttonIcon = 'fa-play';
      break;
    }
  }

  // Quét MHEnt Horizon
  const horizonCandidates = [
    'D:\\mhent-aisa-horizon\\AISA Horizon.bat',
    'C:\\mhent-aisa-horizon\\AISA Horizon.bat',
    path.join(userProfile, 'Desktop', 'AISA Horizon.lnk'),
    path.join(localAppData, 'Programs', 'AISA Horizon', 'AISA Horizon.exe'),
    'D:\\mhent-horizon\\AISA Horizon.bat'
  ];
  for (const p of horizonCandidates) {
    if (p && fs.existsSync(p)) {
      results.horizon.installed = true;
      results.horizon.path = p;
      results.horizon.statusText = 'Sẵn Sàng (Studio)';
      results.horizon.buttonText = 'Mở Horizon Studio';
      results.horizon.buttonIcon = 'fa-wand-magic-sparkles';
      break;
    }
  }

  // Quét AISA Orbit
  const orbitCandidates = [
    path.join(localAppData, 'Programs', 'AISA Orbit', 'AISA Orbit.exe'),
    path.join(userProfile, 'Desktop', 'AISA Orbit.lnk'),
    path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'AISA Orbit.lnk'),
    'D:\\AISA Orbit\\AISA Orbit.exe',
    'C:\\Program Files\\AISA Orbit\\AISA Orbit.exe'
  ];
  for (const p of orbitCandidates) {
    if (p && fs.existsSync(p)) {
      results.orbit.installed = true;
      results.orbit.path = p;
      results.orbit.statusText = 'Đã Cài Đặt (v1.0.0)';
      results.orbit.buttonText = 'Mở AISA Orbit';
      results.orbit.buttonIcon = 'fa-rocket';
      break;
    }
  }

  return results;
}

// 1. Đảm bảo Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();

      const deepLink = (commandLine || []).find(arg => typeof arg === 'string' && arg.startsWith('mhentlink://'));
      if (deepLink) {
        mainWindow.webContents.send('link:deep-link-auth', deepLink);
      }
    }
  });

  // Đăng ký custom protocol mhentlink://
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('mhentlink', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('mhentlink');
  }

  // 2. Khởi động Cầu Nối HTTP & WebSocket Server (Cổng 14128)
  function startBridgeServer() {
    localServer = http.createServer((req, res) => {
      try {
        const parsedUrl = url.parse(req.url, true);
        const pathname = decodeURIComponent(parsedUrl.pathname);

        // Thiết lập CORS & Private Network Access (PNA)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Access-Control-Allow-Private-Network', 'true');

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        // Endpoint trạng thái Discord
        if (pathname === '/api/discord-status') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, ...discordManager.getStatus() }));
          return;
        }

        // Endpoint cập nhật Presence
        if (pathname === '/api/discord-rpc' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              if (data.action === 'setActivity') {
                discordManager.setActivity(data.activity);
              } else if (data.action === 'clearActivity') {
                discordManager.clearActivity();
              } else if (data.action === 'setClientId') {
                discordManager.setClientId(data.clientId);
              }
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ success: true, status: discordManager.getStatus() }));
              notifyRendererStatus();
            } catch (err) {
              res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        // Endpoint nhận Auth Callback từ Web (accounts.mhentuniverse.com)
        if (pathname === '/auth-callback') {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true, message: 'Đã nhận xác thực MHEnt ID!' }));
          if (parsedUrl.query && parsedUrl.query.profile) {
            try {
              const p = JSON.parse(decodeURIComponent(parsedUrl.query.profile));
              saveProfileData(p);
              notifyRendererStatus();
            } catch (e) {}
          }
          if (mainWindow) {
            if (!mainWindow.isVisible()) mainWindow.show();
            mainWindow.focus();
          }
          return;
        }

        // Default 404
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('MHEnt. Link Bridge Service');
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server Error: ' + e.message);
      }
    });

    localServer.listen(localServerPort, '127.0.0.1', () => {
      console.log(`[MHEnt. Link Bridge] Listening on http://127.0.0.1:${localServerPort}`);

      // WebSocket Server
      try {
        wss = new WebSocketServer({ server: localServer });
        wss.on('connection', (ws) => {
          if (emptyClientsTimer) {
            clearTimeout(emptyClientsTimer);
            emptyClientsTimer = null;
          }

          ws.send(JSON.stringify({ type: 'status', ...discordManager.getStatus() }));

          ws.on('message', (raw) => {
            try {
              const data = JSON.parse(raw);
              if (data.action === 'setActivity') {
                discordManager.setActivity(data.activity);
                ws.send(JSON.stringify({ type: 'ack', action: 'setActivity', success: true }));
              } else if (data.action === 'clearActivity') {
                discordManager.clearActivity();
                ws.send(JSON.stringify({ type: 'ack', action: 'clearActivity', success: true }));
              }
              notifyRendererStatus();
            } catch (err) {}
          });

          ws.on('close', () => {
            if (emptyClientsTimer) clearTimeout(emptyClientsTimer);
            emptyClientsTimer = setTimeout(() => {
              let activeCount = 0;
              wss.clients.forEach(c => { if (c.readyState === 1) activeCount++; });
              if (activeCount === 0) {
                console.log('[MHEnt. Link] Web clients closed, clearing presence...');
                discordManager.clearActivity();
                notifyRendererStatus();
              }
            }, 3000);
          });
        });
      } catch (e) {
        console.warn('[MHEnt. Link WS Error]:', e);
      }
    });
  }

  function notifyRendererStatus() {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('link:status-update', {
        serverPort: localServerPort,
        discord: discordManager.getStatus(),
        profile: loadSavedProfile(),
        apps: scanInstalledApps()
      });
    }
    updateTrayMenu();
  }

  // 3. Khởi tạo Khay Hệ Thống (System Tray)
  function createTray() {
    try {
      const trayPath = path.join(__dirname, 'assets', 'tray-icon.png');
      const icoPath = path.join(__dirname, 'assets', 'app-logo.ico');
      const pngPath = path.join(__dirname, 'assets', 'icon-logo.png');
      let icon = null;

      if (fs.existsSync(trayPath)) {
        icon = nativeImage.createFromPath(trayPath);
      } else if (fs.existsSync(icoPath)) {
        icon = nativeImage.createFromPath(icoPath);
      } else if (fs.existsSync(pngPath)) {
        icon = nativeImage.createFromPath(pngPath).resize({ width: 32, height: 32 });
      }

      if (icon) {
        tray = new Tray(icon);
        tray.setToolTip('MHEnt. Link — Nền Tảng Đồng Bộ Vũ Trụ');

        tray.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        });

        updateTrayMenu();
      }
    } catch (err) {
      console.warn('[Tray Error]:', err.message);
    }
  }

  function updateTrayMenu() {
    if (!tray) return;
    const status = discordManager.getStatus();
    const discordText = status.ready ? `Discord: ${status.user ? status.user.global_name || status.user.username : 'Đã kết nối'}` : 'Discord: Chờ kết nối...';
    const profile = loadSavedProfile();
    const profileText = profile ? `Tài khoản: ${profile.displayName || profile.email}` : 'Tài khoản: Chưa đăng nhập';

    const loginSettings = app.getLoginItemSettings();

    const contextMenu = Menu.buildFromTemplate([
      { label: 'MHEnt. Link — Hub Đồng Bộ', enabled: false },
      { type: 'separator' },
      { label: profileText, enabled: false },
      { label: discordText, enabled: false },
      { type: 'separator' },
      {
        label: 'Mở Giao Diện Dashboard',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Khởi động cùng Windows',
        type: 'checkbox',
        checked: loginSettings.openAtLogin,
        click: (item) => {
          app.setLoginItemSettings({ openAtLogin: item.checked, openAsHidden: true });
        }
      },
      {
        label: 'Xóa Presence trên Discord',
        click: () => {
          discordManager.clearActivity();
          notifyRendererStatus();
        }
      },
      { type: 'separator' },
      {
        label: 'Mở Đại Sảnh MHEnt Universe',
        click: () => shell.openExternal('https://www.mhentuniverse.com')
      },
      {
        label: 'Thoát Hoàn Toàn',
        click: () => {
          isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
  }

  // 4. Khởi tạo Cửa Sổ Chính (Dashboard Window)
  function createWindow() {
    const icoPath = path.join(__dirname, 'assets', 'app-logo.ico');
    const pngPath = path.join(__dirname, 'assets', 'icon-logo.png');
    const windowIcon = fs.existsSync(icoPath) ? icoPath : pngPath;

    mainWindow = new BrowserWindow({
      width: 1240,
      height: 800,
      minWidth: 980,
      minHeight: 620,
      backgroundColor: '#070b13',
      frame: false,
      titleBarStyle: 'hidden',
      icon: windowIcon,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    mainWindow.loadFile('index.html');

    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.setAlwaysOnTop(true);
      setTimeout(() => {
        if (mainWindow) mainWindow.setAlwaysOnTop(false);
      }, 500);
    });

    mainWindow.on('maximize', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('link:window-maximized-state', true);
      }
    });

    mainWindow.on('unmaximize', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('link:window-maximized-state', false);
      }
    });

    // Chặn tắt app khi bấm nút [X] -> Thay vào đó ẩn xuống khay hệ thống
    mainWindow.on('close', (event) => {
      if (!isQuitting) {
        event.preventDefault();
        mainWindow.hide();
      }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
      shell.openExternal(targetUrl);
      return { action: 'deny' };
    });

    // Hỗ trợ F12 mở DevTools để kiểm tra lỗi nếu cần
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }

  // 5. IPC Handlers cho Giao Diện Renderer
  ipcMain.handle('link:get-status', () => {
    return {
      serverPort: localServerPort,
      discord: discordManager.getStatus(),
      profile: loadSavedProfile(),
      loginSettings: app.getLoginItemSettings(),
      apps: scanInstalledApps()
    };
  });

  ipcMain.handle('link:scan-apps', () => {
    return scanInstalledApps();
  });

  ipcMain.handle('link:set-login-settings', (_event, settings) => {
    app.setLoginItemSettings({
      openAtLogin: Boolean(settings.openAtLogin),
      openAsHidden: true
    });
    updateTrayMenu();
    return app.getLoginItemSettings();
  });

  ipcMain.handle('link:clear-discord-activity', () => {
    discordManager.clearActivity();
    notifyRendererStatus();
    return true;
  });

  ipcMain.handle('link:logout-profile', () => {
    try {
      if (fs.existsSync(PROFILE_STORE_PATH)) {
        fs.unlinkSync(PROFILE_STORE_PATH);
      }
    } catch (e) {}
    notifyRendererStatus();
    return true;
  });

  ipcMain.handle('link:save-profile', (_event, profile) => {
    return saveProfileData(profile);
  });

  ipcMain.handle('link:get-profile', () => {
    return loadSavedProfile();
  });

  ipcMain.handle('link:open-external', (_event, targetUrl) => {
    return shell.openExternal(targetUrl);
  });

  ipcMain.on('link:minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.on('link:maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('link:is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.on('link:minimize-to-tray', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.on('link:close-window', () => {
    if (mainWindow) mainWindow.hide();
  });

  ipcMain.handle('link:launch-app', (_event, appKey) => {
    const apps = scanInstalledApps();
    const appInfo = apps[appKey];
    if (!appInfo) return { success: false, message: 'Ứng dụng không xác định' };

    if (appKey === 'study') {
      if (appInfo.installed && appInfo.path) {
        if (appInfo.path.endsWith('.lnk')) {
          shell.openPath(appInfo.path);
        } else {
          spawn(appInfo.path, [], { detached: true, stdio: 'ignore' }).unref();
        }
        return { success: true, message: 'Đang mở MHEnt. Study Desktop...' };
      }
      // Chưa cài app desktop -> Mở phiên bản Web trong trình duyệt
      shell.openExternal(appInfo.webUrl || 'https://study.mhentuniverse.com');
      return { success: true, message: 'Đang mở MHEnt. Study (Bản Web) trong trình duyệt...' };
    }

    if (appKey === 'horizon') {
      if (appInfo.installed && appInfo.path) {
        if (appInfo.path.endsWith('.bat')) {
          const dir = path.dirname(appInfo.path);
          spawn('cmd.exe', ['/c', appInfo.path], { cwd: dir, detached: true, stdio: 'ignore' }).unref();
        } else if (appInfo.path.endsWith('.lnk')) {
          shell.openPath(appInfo.path);
        } else {
          spawn(appInfo.path, [], { detached: true, stdio: 'ignore' }).unref();
        }
        return { success: true, message: 'Đang mở MHEnt. Horizon Studio...' };
      }
      shell.openExternal('https://www.mhentuniverse.com');
      return { success: true, message: 'Mở trang thông tin Horizon...' };
    }

    if (appKey === 'orbit') {
      if (appInfo.installed && appInfo.path) {
        if (appInfo.path.endsWith('.lnk')) {
          shell.openPath(appInfo.path);
        } else {
          spawn(appInfo.path, [], { detached: true, stdio: 'ignore' }).unref();
        }
        return { success: true, message: 'Đang khởi chạy AISA Orbit...' };
      }
      shell.openExternal('https://www.mhentuniverse.com');
      return { success: true, message: 'Mở trang thông tin AISA Orbit...' };
    }

    return { success: false, message: 'Ứng dụng không xác định' };
  });

  // 6. Khởi động ứng dụng
  app.whenReady().then(() => {
    createWindow();
    createTray();
    startBridgeServer();

    discordManager.on('ready', () => {
      if (!discordManager.currentActivity) {
        discordManager.clearActivity();
      }
      notifyRendererStatus();
    });
    discordManager.on('disconnected', () => notifyRendererStatus());
    try {
      discordManager.connect();
    } catch (e) {}
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });

  app.on('before-quit', () => {
    isQuitting = true;
    try { discordManager.destroy(); } catch (e) {}
    if (localServer) {
      try { localServer.close(); } catch (e) {}
    }
  });
}

