const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  
  safeStorageSet: (key, value) => ipcRenderer.invoke('safe-storage-set', key, value),
  safeStorageGet: (key) => ipcRenderer.invoke('safe-storage-get', key),
  
  onShortcut: (callback) => {
    ipcRenderer.on('shortcut', (event, action) => callback(action));
  },
  
  removeShortcutListener: () => {
    ipcRenderer.removeAllListeners('shortcut');
  },

  closeApp: () => ipcRenderer.send('window-close'),
  minimizeApp: () => ipcRenderer.send('window-minimize'),
  maximizeApp: () => ipcRenderer.send('window-maximize'),
  
  onWindowMaximized: (callback) => {
    ipcRenderer.on('window-maximized', (event, isMaximized) => callback(isMaximized));
  },
  
  removeWindowMaximizedListener: () => {
    ipcRenderer.removeAllListeners('window-maximized');
  },

  getWindowMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  openExternal: (url) => {
    if (url) {
      ipcRenderer.send('open-external', url);
    }
  }
});
