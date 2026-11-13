const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('MHEntDesktop', {
  isDesktop: true,
  platform: process.platform,

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onWindowState: (callback) => ipcRenderer.on('desktop:window-state', (_event, isMax) => callback(isMax)),

  // External Browser
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),

  // Discord Rich Presence (RPC)
  discord: {
    setActivity: (activity) => ipcRenderer.invoke('discord:set-activity', activity),
    clearActivity: () => ipcRenderer.invoke('discord:clear-activity'),
    getStatus: () => ipcRenderer.invoke('discord:get-status'),
    setClientId: (clientId) => ipcRenderer.invoke('discord:set-client-id', clientId)
  }
});
