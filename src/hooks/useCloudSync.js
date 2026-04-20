import { useState, useEffect, useCallback } from 'react';
import { restoreFromGist, checkGistStatus, uploadLatestBackup, hasGistToken, importNotes } from '../services/cloudBackup';
import { initDatabase, dbGetAll } from '../database/sqlite';

const DB_KEY = 'todo-data-v2';
const LAST_SYNC_KEY = 'last-sync-time';

function isCloudContainsLocal(cloud, local) {
  const cloudLists = cloud.lists || [];
  const cloudTasks = cloud.tasks || [];
  const cloudTags = cloud.tags || [];
  const localLists = local.lists || [];
  const localTasks = local.tasks || [];
  const localTags = local.tags || [];

  const cloudHasList = (list) => cloudLists.some(c => c.id === list.id);
  const cloudHasTask = (task) => cloudTasks.some(c => c.id === task.id);
  const cloudHasTag = (tag) => cloudTags.some(c => c.id === tag.id);

  return localLists.every(cloudHasList) &&
         localTasks.every(cloudHasTask) &&
         localTags.every(cloudHasTag);
}

function isContentDifferent(cloud, local) {
  const cloudStr = JSON.stringify({ lists: cloud.lists, tasks: cloud.tasks, tags: cloud.tags });
  const localStr = JSON.stringify({ lists: local.lists, tasks: local.tasks, tags: local.tags });
  return cloudStr !== localStr;
}

export function useCloudSync() {
  const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, success, error
  const [cloudData, setCloudData] = useState(null);
  const [localData, setLocalData] = useState(null);

  const getLocalData = () => {
    return localStorage.getItem(DB_KEY);
  };

  const loadLocalData = useCallback(async () => {
    await initDatabase();
    const lists = await dbGetAll('lists');
    const tasks = await dbGetAll('tasks');
    const tags = await dbGetAll('tags');
    return { lists, tasks, tags };
  }, []);

  const performSync = useCallback(async () => {
    setSyncStatus('syncing');
    
    try {
      const localRaw = getLocalData();
      const localParsed = localRaw ? JSON.parse(localRaw) : null;
      setLocalData(localParsed);

      const cloudResult = await restoreFromGist();
      
      if (cloudResult.success && cloudResult.data) {
        setCloudData(cloudResult.data);
        
        if (!localParsed) {
          localStorage.setItem(DB_KEY, JSON.stringify(cloudResult.data));
          setSyncStatus('success');
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          return { action: 'restored', source: 'cloud' };
        }

        if (!isContentDifferent(cloudResult.data, localParsed)) {
          setSyncStatus('success');
          return { action: 'up_to_date', source: null };
        }

        if (isCloudContainsLocal(cloudResult.data, localParsed)) {
          localStorage.setItem(DB_KEY, JSON.stringify(cloudResult.data));
          setSyncStatus('success');
          localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
          return { action: 'restored', source: 'cloud' };
        }

        await uploadLatestBackup();
        setSyncStatus('success');
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        return { action: 'uploaded', source: 'local' };
      } else if (!cloudResult.success && cloudResult.message === 'No backup found') {
        await uploadLatestBackup();
        setSyncStatus('success');
        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
        return { action: 'created', source: 'local' };
      }
      
      setSyncStatus('error');
      return { action: 'error', message: cloudResult.message };
    } catch (error) {
      setSyncStatus('error');
      return { action: 'error', message: error.message };
    }
  }, []);

  const forceUpload = useCallback(async () => {
    setSyncStatus('syncing');
    const result = await uploadLatestBackup();
    if (result.success) {
      setSyncStatus('success');
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } else {
      setSyncStatus('error');
    }
    return result;
  }, []);

  const forceRestore = useCallback(async () => {
    setSyncStatus('syncing');
    const result = await restoreFromGist();
    if (result.success && result.data) {
      localStorage.setItem(DB_KEY, JSON.stringify(result.data));
      setSyncStatus('success');
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      window.location.reload();
    } else {
      setSyncStatus('error');
    }
    return result;
  }, []);

  return {
    syncStatus,
    cloudData,
    localData,
    performSync,
    forceUpload,
    forceRestore
  };
}

export async function forceUpload() {
  if (!hasGistToken()) {
    return { success: false, message: '请先配置 GitHub Token' };
  }
  const result = await uploadLatestBackup();
  if (result.success) {
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  }
  return result;
}

export async function forceRestore() {
  if (!hasGistToken()) {
    return { success: false, message: '请先配置 GitHub Token' };
  }
  const result = await restoreFromGist();
  if (result.success && result.data) {
    // 保存其他数据到 localStorage
    localStorage.setItem(DB_KEY, JSON.stringify(result.data));
    
    // 恢复笔记数据到 SQLite 数据库
    if (result.data.notes && result.data.notes.length > 0) {
      await initDatabase();
      await importNotes(result.data.notes);
    }
    
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    window.location.reload();
    return { ...result, action: 'restored' };
  }
  if (result.message === 'No backup found') {
    return { success: false, message: '云端暂无备份，请先上传数据' };
  }
  return result;
}

export async function manualSync() {
  if (!hasGistToken()) {
    return { success: false, message: '请先配置 GitHub Token' };
  }
  
  const { restoreFromGist, uploadLatestBackup } = await import('../services/cloudBackup');
  
  const localRaw = localStorage.getItem(DB_KEY);
  const localParsed = localRaw ? JSON.parse(localRaw) : null;
  
  const cloudResult = await restoreFromGist();
  
  if (cloudResult.success && cloudResult.data) {
    if (!localParsed) {
      localStorage.setItem(DB_KEY, JSON.stringify(cloudResult.data));
      return { action: 'restored', success: true };
    }

    if (!isContentDifferent(cloudResult.data, localParsed)) {
      return { action: 'up_to_date', success: true };
    }

    if (isCloudContainsLocal(cloudResult.data, localParsed)) {
      localStorage.setItem(DB_KEY, JSON.stringify(cloudResult.data));
      return { action: 'restored', success: true };
    }

    await uploadLatestBackup();
    return { action: 'uploaded', success: true };
  }
  
  if (localRaw) {
    const uploadResult = await uploadLatestBackup();
    if (uploadResult.success) {
      return { action: 'created', success: true };
    }
    return { action: 'error', success: false, message: uploadResult.message };
  }
  
  return { action: 'no_backup', success: false, message: '本地和云端都没有数据' };
}

export async function checkSyncStatus() {
  const lastSync = localStorage.getItem(LAST_SYNC_KEY);
  const gistStatus = await checkGistStatus();
  
  return {
    lastSyncTime: lastSync ? parseInt(lastSync) : null,
    lastSyncDate: lastSync ? new Date(parseInt(lastSync)).toLocaleString() : null,
    hasCloudBackup: gistStatus.hasBackup,
    cloudUpdatedAt: gistStatus.updatedAt
  };
}
