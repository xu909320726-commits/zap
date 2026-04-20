const { app, BrowserWindow, globalShortcut, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  name: 'todo-data',
  defaults: {
    lists: [
      { id: 'inbox', name: '收集箱', icon: 'inbox', isDefault: true }
    ],
    tasks: [],
    settings: {
      theme: 'light'
    }
  }
});

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js')
    },
    frame: false,
    backgroundColor: '#f5f5f5',
    autoHideMenuBar: true
  });

  mainWindow.setMenuBarVisibility(false);

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'build', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized', false);
  });
}

function registerShortcuts() {
  globalShortcut.register('CommandOrControl+N', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut', 'add-task');
      mainWindow.show();
      mainWindow.focus();
    }
  });

  globalShortcut.register('CommandOrControl+D', () => {
    if (mainWindow) {
      mainWindow.webContents.send('shortcut', 'complete-task');
    }
  });
}

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('open-external', (event, url) => {
  if (url) {
    try {
      const parsed = new URL(url);
      if (['http:', 'https:'].includes(parsed.protocol)) {
        shell.openExternal(url);
      }
    } catch {}
  }
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

ipcMain.handle('store-get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('store-set', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('store-delete', (event, key) => {
  store.delete(key);
  return true;
});

ipcMain.handle('safe-storage-set', (event, key, value) => {
  try {
    if (safeStorage.isEncryptionAvailable()) {
      safeStorage.encryptString(value).then(encrypted => {
        store.set(key, encrypted);
      });
    } else {
      store.set(key, value);
    }
    return true;
  } catch (error) {
    return false;
  }
});

ipcMain.handle('safe-storage-get', (event, key) => {
  try {
    const value = store.get(key);
    if (safeStorage.isEncryptionAvailable() && value) {
      return safeStorage.decryptString(value);
    }
    return value;
  } catch (error) {
    return null;
  }
});

app.whenReady().then(() => {
  createWindow();
  registerShortcuts();
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
