const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

let mainWindow = null;
let localServer = null;
let localServerPort = 0;

// User-Agent chuẩn Chrome hiện đại để tránh bị Google OAuth chặn lỗi 'disallowed_useragent'
const CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_USER_AGENT;

// Đăng ký custom protocol mhentstudy:// cho Desktop để nhận đăng nhập từ Cổng Định Danh MHEnt ID
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('mhentstudy', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('mhentstudy');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4'
};

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((req, res) => {
      try {
        const parsedUrl = url.parse(req.url);
        let pathname = decodeURIComponent(parsedUrl.pathname);

        // Xử lý Auth Callback từ Trình duyệt (accounts.mhentuniverse.com)
        if (pathname === '/auth-callback') {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
          });
          res.end(JSON.stringify({ success: true, message: 'Đăng nhập MHEnt Study Desktop thành công!' }));

          const fullCallbackUrl = 'mhentstudy://auth' + (parsedUrl.search || '');
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.executeJavaScript(`
              if (typeof window.handleMHEntDeepLink === 'function') {
                window.handleMHEntDeepLink(${JSON.stringify(fullCallbackUrl)});
              } else {
                window.__pendingDeepLink = ${JSON.stringify(fullCallbackUrl)};
              }
            `).catch(console.warn);
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
          }
          return;
        }

        // Default root
        if (pathname === '/' || pathname === '') {
          pathname = '/index.html';
        }

        const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
        let filePath = path.join(__dirname, '..', safePath);

        // Handle directory index.html lookup (e.g. /ja/ -> /ja/index.html)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
          const indexSub = path.join(filePath, 'index.html');
          if (fs.existsSync(indexSub)) {
            filePath = indexSub;
          }
        }

        // If still does not exist, check fallback
        if (!fs.existsSync(filePath)) {
          // If accessing without .html extension (e.g. /lyrics -> /lyrics.html)
          const withHtml = filePath + '.html';
          if (fs.existsSync(withHtml)) {
            filePath = withHtml;
          } else {
            filePath = path.join(__dirname, '..', 'index.html');
          }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
          }
          res.writeHead(200, {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache'
          });
          res.end(data);
        });
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Server Error: ' + e.message);
      }
    });

    const PREFERRED_PORT = 14128;

    function tryListen(port, attemptsLeft = 10) {
      const onError = (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.warn(`[MHEnt. Study] Port ${port} is in use, attempting ${port + 1}...`);
          localServer.removeListener('error', onError);
          tryListen(port + 1, attemptsLeft - 1);
        } else {
          console.warn('[MHEnt. Study Local Server Error]:', err);
          reject(err);
        }
      };

      localServer.once('error', onError);

      localServer.listen(port, '127.0.0.1', () => {
        localServer.removeListener('error', onError);
        localServerPort = localServer.address().port;
        console.log(`[MHEnt. Study Local Server] Listening on http://localhost:${localServerPort}`);
        resolve(localServerPort);
      });
    }

    tryListen(PREFERRED_PORT);
  });
}

async function createWindow() {
  if (!localServerPort) {
    try {
      await startLocalServer();
    } catch (e) {
      console.warn('Failed to start local server, fallback to file:', e);
    }
  }

  const iconPath = path.join(__dirname, '..', 'assets', 'study-logo.png');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 480,
    minHeight: 640,
    backgroundColor: '#070b13',
    title: 'MHEnt. Study — Không Gian Học Ngoại Ngữ Đa Vũ Trụ',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:mhent_study', // Đảm bảo toàn bộ localStorage, IndexedDB, Firebase Auth được lưu vĩnh viễn trên máy
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // Cho phép tải audio, video và tài nguyên cross-origin
    }
  });

  // Xóa bỏ Referer & Origin đối với avatar Google CDN để tránh lỗi 403 Forbidden
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['*://*.googleusercontent.com/*', '*://lh3.googleusercontent.com/*'] },
    (details, callback) => {
      delete details.requestHeaders['Referer'];
      delete details.requestHeaders['Origin'];
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  // Xử lý OAuth popups (Firebase, Google Sign-In & Cổng MHEnt ID)
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    // Cho phép popup xác thực mở trực tiếp trong cửa sổ ứng dụng (kết nối window.opener)
    if (
      targetUrl.includes('firebaseapp.com') ||
      targetUrl.includes('accounts.google.com') ||
      targetUrl.includes('google.com') ||
      targetUrl.includes('apis.google.com') ||
      targetUrl.includes('accounts.mhentuniverse.com') ||
      targetUrl.startsWith('http://localhost') ||
      targetUrl.startsWith('http://127.0.0.1')
    ) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 650,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        }
      };
    }

    // Các liên kết ngoại bộ thông thường mở bằng trình duyệt mặc định hệ điều hành
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

  // Khi popup đăng nhập Google được tạo, gán User-Agent chuẩn để Google không chặn
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.setUserAgent(CHROME_USER_AGENT);
  });

  // Tải Web App qua 'localhost' (Domain được Firebase Auth whitelist mặc định)
  const startUrl = localServerPort
    ? `http://localhost:${localServerPort}/`
    : `file://${path.join(__dirname, '..', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() || false);
ipcMain.handle('desktop:open-external', (event, targetUrl) => {
  if (targetUrl) shell.openExternal(targetUrl);
});

// Đảm bảo chỉ chạy 1 phiên duy nhất (Single instance) và xử lý Deep Link
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();

      // Kiểm tra URL deep link trong commandLine khi gọi lại từ bên ngoài
      const deepLinkUrl = (commandLine || []).find(arg => typeof arg === 'string' && arg.startsWith('mhentstudy://'));
      if (deepLinkUrl && mainWindow.webContents) {
        mainWindow.webContents.executeJavaScript(`
          if (typeof window.handleMHEntDeepLink === 'function') {
            window.handleMHEntDeepLink(${JSON.stringify(deepLinkUrl)});
          } else {
            window.__pendingDeepLink = ${JSON.stringify(deepLinkUrl)};
          }
        `).catch(console.warn);
      }
    }
  });

  app.on('open-url', (event, rawUrl) => {
    event.preventDefault();
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.executeJavaScript(`
        if (typeof window.handleMHEntDeepLink === 'function') {
          window.handleMHEntDeepLink(${JSON.stringify(rawUrl)});
        } else {
          window.__pendingDeepLink = ${JSON.stringify(rawUrl)};
        }
      `).catch(console.warn);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (localServer) {
    try { localServer.close(); } catch (e) {}
    localServer = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
