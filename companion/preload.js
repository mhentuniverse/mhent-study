const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('MHEntLink', {
  getStatus: () => ipcRenderer.invoke('link:get-status'),
  scanApps: () => ipcRenderer.invoke('link:scan-apps'),
  setLoginSettings: (settings) => ipcRenderer.invoke('link:set-login-settings', settings),
  launchApp: (appKey) => ipcRenderer.invoke('link:launch-app', appKey),
  checkUpdates: () => ipcRenderer.invoke('link:check-updates'),
  openExternal: (url) => ipcRenderer.invoke('link:open-external', url),
  minimizeWindow: () => ipcRenderer.send('link:minimize-window'),
  maximizeWindow: () => ipcRenderer.send('link:maximize-window'),
  closeWindow: () => ipcRenderer.send('link:close-window'),
  minimizeToTray: () => ipcRenderer.send('link:minimize-to-tray'),
  isMaximized: () => ipcRenderer.invoke('link:is-maximized'),
  clearDiscordActivity: () => ipcRenderer.invoke('link:clear-discord-activity'),
  saveProfile: (profile) => ipcRenderer.invoke('link:save-profile', profile),
  getProfile: () => ipcRenderer.invoke('link:get-profile'),
  logoutProfile: () => ipcRenderer.invoke('link:logout-profile'),
  onStatusChange: (callback) => {
    ipcRenderer.on('link:status-update', (_event, data) => callback(data));
  },
  onDeepLinkAuth: (callback) => {
    ipcRenderer.on('link:deep-link-auth', (_event, url) => callback(url));
  },
  onMaximizedChange: (callback) => {
    ipcRenderer.on('link:window-maximized-state', (_event, isMax) => callback(isMax));
  }
});
