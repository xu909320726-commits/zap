const LEAN_APP_ID = 'your-app-id';
const LEAN_APP_KEY = 'your-app-key';
const LEAN_DATA_KEY = 'zap-data';
const DB_KEY = 'todo-data-v2';

function getHeaders() {
  return {
    'X-Avoscloud-Application-Id': LEAN_APP_ID,
    'X-Avoscloud-Application-Key': LEAN_APP_KEY,
    'Content-Type': 'application/json'
  };
}

export function getLeanCloudConfig() {
  return {
    appId: localStorage.getItem('lean-app-id'),
    appKey: localStorage.getItem('lean-app-key')
  };
}

export function setLeanCloudConfig(appId, appKey) {
  localStorage.setItem('lean-app-id', appId);
  localStorage.setItem('lean-app-key', appKey);
}

export function hasLeanCloudToken() {
  return !!localStorage.getItem('lean-app-id') && !!localStorage.getItem('lean-app-key');
}

function getBaseUrl() {
  const appId = localStorage.getItem('lean-app-id');
  return `https://${appId}.leanapp.cn/api/storage/v1/classes`;
}

export async function uploadToLeanCloud() {
  const appId = localStorage.getItem('lean-app-id');
  const appKey = localStorage.getItem('lean-app-key');
  
  if (!appId || !appKey) {
    return { success: false, message: '请先配置 LeanCloud' };
  }

  try {
    const localData = localStorage.getItem(DB_KEY);
    if (!localData) {
      return { success: false, message: 'No data to backup' };
    }

    const url = `${getBaseUrl()}/${LEAN_DATA_KEY}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (response.ok) {
      const existing = await response.json();
      if (existing.objectId) {
        await fetch(`${url}/${existing.objectId}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            data: JSON.parse(localData),
            updatedAt: new Date().toISOString()
          })
        });
      } else {
        await fetch(url, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({
            data: JSON.parse(localData),
            updatedAt: new Date().toISOString()
          })
        });
      }
    } else if (response.status === 404) {
      await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          data: JSON.parse(localData),
          updatedAt: new Date().toISOString()
        })
      });
    }

    return { success: true, message: 'Upload success' };
  } catch (error) {
    console.error('LeanCloud upload error:', error);
    return { success: false, message: error.message };
  }
}

export async function restoreFromLeanCloud() {
  const appId = localStorage.getItem('lean-app-id');
  const appKey = localStorage.getItem('lean-app-key');
  
  if (!appId || !appKey) {
    return { success: false, message: '请先配置 LeanCloud' };
  }

  try {
    const url = `${getBaseUrl()}/${LEAN_DATA_KEY}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: getHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, message: 'No backup found' };
      }
      return { success: false, message: 'Fetch failed' };
    }

    const result = await response.json();
    
    if (result.results && result.results.length > 0) {
      return { success: true, data: result.results[0].data };
    } else if (result.data) {
      return { success: true, data: result.data };
    }

    return { success: false, message: 'No backup found' };
  } catch (error) {
    console.error('LeanCloud restore error:', error);
    return { success: false, message: error.message };
  }
}
