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

// 主进程代发 HTTP 请求，绕过浏览器 CORS 限制
ipcMain.handle('http-request', async (event, options) => {
  const { url, method = 'GET', headers = {}, body = null, timeout = 30000 } = options || {};
  if (!url) {
    return { ok: false, error: 'URL 不能为空' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    return { ok: false, error: 'URL 格式无效' };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { ok: false, error: '仅支持 http/https 协议' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body || undefined,
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        data = await response.text();
      }
    } else {
      data = await response.text();
    }

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err.name === 'AbortError' ? `请求超时（${timeout}ms）` : (err.message || '网络请求失败'),
    };
  } finally {
    clearTimeout(timer);
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
