const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('MHEntDesktop', {
  isDesktop: true,
  platform: process.platform,

  // Window Controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // External Browser
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url)
});
