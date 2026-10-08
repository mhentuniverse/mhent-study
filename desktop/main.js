const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const url = require('url');

let mainWindow = null;
let localServer = null;
let localServerPort = 0;

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

    localServer.listen(0, '127.0.0.1', () => {
      localServerPort = localServer.address().port;
      console.log(`[MHEnt Study Local Server] Listening on http://127.0.0.1:${localServerPort}`);
      resolve(localServerPort);
    });

    localServer.on('error', (err) => {
      console.warn('[MHEnt Study Local Server Error]:', err);
      reject(err);
    });
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
    title: 'MHEnt Study — Music & Language Sanctuary',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false // Enables loading embedded audio, video & cross-origin API assets
    }
  });

  const startUrl = localServerPort
    ? `http://127.0.0.1:${localServerPort}/index.html`
    : `file://${path.join(__dirname, '..', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Open external links in default OS browser
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (targetUrl.startsWith('http://127.0.0.1') || targetUrl.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(targetUrl);
    return { action: 'deny' };
  });

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (localServer) {
    localServer.close();
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
