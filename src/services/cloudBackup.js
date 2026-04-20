import { dbGetNotes, dbCreateNote, dbUpdateNote, dbDeleteNote } from '../database/sqlite';

const GIST_TOKEN_KEY = 'zap-gist-token';
const GIST_ID_KEY = 'zap-backup-gist-id';
const DB_KEY = 'todo-data-v2';
const LAST_BACKUP_KEY = 'last-backup-time';

// 导出所有笔记数据
export async function exportNotes() {
  try {
    const notes = await dbGetNotes();
    return notes;
  } catch (error) {
    console.error('导出笔记失败:', error);
    return [];
  }
}

// 导入笔记数据到数据库
export async function importNotes(notes) {
  if (!notes || !Array.isArray(notes)) {
    return { success: false, message: '无效的笔记数据' };
  }

  try {
    // 获取现有笔记
    const existingNotes = await dbGetNotes();
    const existingIds = new Set(existingNotes.map(n => n.id));

    // 导入每个笔记
    for (const note of notes) {
      if (existingIds.has(note.id)) {
        // 更新已存在的笔记
        await dbUpdateNote(note.id, {
          title: note.title,
          content: note.content,
          updatedAt: note.updatedAt
        });
      } else {
        // 创建新笔记
        await dbCreateNote({
          id: note.id,
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          isDeleted: note.isDeleted || false
        });
      }
    }

    return { success: true, message: `成功导入 ${notes.length} 条笔记` };
  } catch (error) {
    console.error('导入笔记失败:', error);
    return { success: false, message: `导入笔记失败: ${error.message}` };
  }
}

export function getGistToken() {
  // 优先从 localStorage 读取（同步）
  const localToken = localStorage.getItem(GIST_TOKEN_KEY);
  console.log('[getGistToken] 从 localStorage 读取:', localToken ? '有值' : '空值');
  
  if (window.electronAPI?.safeStorageGet) {
    const result = window.electronAPI.safeStorageGet(GIST_TOKEN_KEY);
    console.log('[getGistToken] safeStorageGet 返回:', result, typeof result);
    
    // 如果返回的是 Promise，等待它
    if (result && typeof result === 'object' && result.then) {
      console.log('[getGistToken] safeStorageGet 返回的是 Promise');
      // 返回一个包装的 Promise
      return result.then(token => {
        console.log('[getGistToken] Promise resolved:', token || '空值');
        // 如果 safeStorage 读取失败，返回 localStorage 中的值
        return token || localToken;
      });
    }
    
    // 如果 safeStorage 有值，返回它
    if (result) {
      console.log('[getGistToken] 从 safeStorage 获取:', result ? '有值' : '空值');
      return result;
    }
    
    // 如果 safeStorage 没有值但 localStorage 有，返回 localStorage 的值
    console.log('[getGistToken] safeStorage 为空，返回 localStorage 值');
    return localToken;
  }
  
  // 没有 safeStorage，直接使用 localStorage
  console.log('[getGistToken] 无 safeStorage，使用 localStorage');
  return localToken;
}

export function setGistToken(token) {
  console.log('[setGistToken] 保存 Token:', token ? '有值' : '空值');
  if (window.electronAPI?.safeStorageSet) {
    console.log('[setGistToken] 使用 safeStorageSet');
    window.electronAPI.safeStorageSet(GIST_TOKEN_KEY, token);
    // 同时保存一份到 localStorage 作为备份
    localStorage.setItem(GIST_TOKEN_KEY, token);
  } else {
    console.log('[setGistToken] 使用 localStorage');
    localStorage.setItem(GIST_TOKEN_KEY, token);
  }
}

export function hasGistToken() {
  return !!localStorage.getItem(GIST_TOKEN_KEY);
}

async function getGistId() {
  const id = localStorage.getItem(GIST_ID_KEY);
  return id;
}

async function setGistId(id) {
  localStorage.setItem(GIST_ID_KEY, id);
}

async function findGistByFilename(filename, token) {
  const response = await fetch('https://api.github.com/gists', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json'
    }
  });

  if (!response.ok) {
    return null;
  }

  const gists = await response.json();

  for (const gist of gists) {
    if (gist.files[filename]) {
      return gist.id;
    }
  }

  return null;
}

function addMetadata(data) {
  return {
    ...data,
    lastModified: new Date().toISOString()
  };
}

async function createGist(data, token) {
  const dataWithMeta = addMetadata(data);

  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    },
    body: JSON.stringify({
      description: 'Zap App Backup',
      public: false,
      files: {
        'zap-backup-latest.json': {
          content: JSON.stringify(dataWithMeta, null, 2)
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No response body');
    throw new Error(`Gist creation failed: ${response.status} - ${errorText}`);
  }

  const gist = await response.json();
  await setGistId(gist.id);
  return gist;
}

async function updateGist(gistId, data, token) {
  const dataWithMeta = addMetadata(data);

  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github+json'
    },
    body: JSON.stringify({
      files: {
        'zap-backup-latest.json': {
          content: JSON.stringify(dataWithMeta, null, 2)
        }
      }
    })
  });

  if (response.status === 404) {
    localStorage.removeItem(GIST_ID_KEY);
    return createGist(data, token);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No response body');
    console.error('[updateGist] 更新 Gist 失败:', response.status, response.statusText, errorText);
    throw new Error(`Gist update failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export async function uploadLatestBackup() {
  let token = getGistToken();
  console.log('[uploadLatestBackup] 获取到 Token:', token, typeof token);
  
  // 如果 token 是 Promise，等待它
  if (token && typeof token === 'object' && token.then) {
    console.log('[uploadLatestBackup] Token 是 Promise，等待 resolved...');
    token = await token;
    console.log('[uploadLatestBackup] Token resolved:', token ? '有值' : '空值');
  }
  
  if (!token) {
    return { success: false, message: '请先配置 GitHub Token' };
  }

  try {
    const localData = localStorage.getItem(DB_KEY);
    if (!localData) {
      return { success: false, message: 'No data to backup' };
    }

    // 获取笔记数据
    const notes = await exportNotes();
    console.log('[uploadLatestBackup] 获取笔记数量:', notes.length);

    // 将笔记数据添加到备份中
    const dataWithNotes = {
      ...JSON.parse(localData),
      notes: notes
    };

    let gistId = await getGistId();
    console.log('[uploadLatestBackup] 获取到 Gist ID:', gistId || '无');

    if (!gistId) {
      console.log('[uploadLatestBackup] 正在查找现有 Gist...');
      gistId = await findGistByFilename('zap-backup-latest.json', token);
      if (gistId) {
        console.log('[uploadLatestBackup] 找到现有 Gist:', gistId);
        await setGistId(gistId);
      }
    }

    if (gistId) {
      console.log('[uploadLatestBackup] 正在更新 Gist:', gistId);
      await updateGist(gistId, dataWithNotes, token);
    } else {
      console.log('[uploadLatestBackup] 正在创建新 Gist...');
      await createGist(dataWithNotes, token);
    }

    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
    console.log('[uploadLatestBackup] 上传成功');
    return { success: true, message: `Backup success (包含 ${notes.length} 条笔记)` };
  } catch (error) {
    console.error('[uploadLatestBackup] 上传失败:', error);
    return { success: false, message: error.message };
  }
}

export async function restoreFromGist(filename = 'zap-backup-latest.json') {
  let token = getGistToken();
  
  // 如果 token 是 Promise，等待它
  if (token && typeof token === 'object' && token.then) {
    console.log('[restoreFromGist] Token 是 Promise，等待 resolved...');
    token = await token;
    console.log('[restoreFromGist] Token resolved:', token ? '有值' : '空值');
  }
  
  if (!token) {
    return { success: false, message: '请先配置 GitHub Token' };
  }

  try {
    let gistId = await getGistId();

    if (!gistId) {
      gistId = await findGistByFilename(filename, token);
      if (gistId) {
        await setGistId(gistId);
      }
    }

    if (!gistId) {
      return { success: false, message: 'No backup found' };
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (response.status === 404) {
      localStorage.removeItem(GIST_ID_KEY);
      return { success: false, message: 'No backup found' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { success: false, message: `API错误: ${response.status} - ${errorData.message || 'Unknown error'}` };
    }

    const gist = await response.json();
    const file = gist.files[filename];

    if (!file) {
      return { success: false, message: 'Backup file not found' };
    }

    return { success: true, data: JSON.parse(file.content) };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function checkGistStatus() {
  let token = getGistToken();
  
  // 如果 token 是 Promise，等待它
  if (token && typeof token === 'object' && token.then) {
    console.log('[checkGistStatus] Token 是 Promise，等待 resolved...');
    token = await token;
    console.log('[checkGistStatus] Token resolved:', token ? '有值' : '空值');
  }
  
  if (!token) {
    return { hasBackup: false, hasToken: false };
  }

  try {
    const gistId = await getGistId();
    if (!gistId) {
      return { hasBackup: false, hasToken: true };
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    if (!response.ok) {
      return { hasBackup: false, hasToken: true };
    }

    const gist = await response.json();
    return {
      hasBackup: true,
      hasToken: true,
      gistId,
      updatedAt: gist.updated_at,
      files: Object.keys(gist.files)
    };
  } catch (error) {
    return { hasBackup: false, hasToken: true, error: error.message };
  }
}

export async function clearGistId() {
  localStorage.removeItem(GIST_ID_KEY);
}
