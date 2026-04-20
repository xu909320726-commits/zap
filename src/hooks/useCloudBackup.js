import { useEffect, useRef, useCallback } from 'react';
import { uploadLatestBackup, hasGistToken } from '../services/cloudBackup';

const DB_KEY = 'todo-data-v2';
const BACKUP_DEBOUNCE_MS = 5000;
const LAST_BACKUP_KEY = 'last-backup-time';

export function useCloudBackup() {
  const backupTimeoutRef = useRef(null);
  const lastDataRef = useRef(null);

  const getCurrentData = () => {
    return localStorage.getItem(DB_KEY);
  };

  const shouldBackup = useCallback(() => {
    if (!hasGistToken()) {
      return false;
    }
    const currentData = getCurrentData();
    if (currentData !== lastDataRef.current) {
      lastDataRef.current = currentData;
      return true;
    }
    return false;
  }, []);

  const performBackup = useCallback(async () => {
    if (!shouldBackup()) {
      return { success: true, message: 'No changes or no token, skipping backup' };
    }

    const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
    const now = Date.now();
    
    if (lastBackup && now - parseInt(lastBackup) < BACKUP_DEBOUNCE_MS) {
      return { success: true, message: 'Too soon, skipping backup' };
    }

    const result = await uploadLatestBackup();
    
    if (result.success) {
      localStorage.setItem(LAST_BACKUP_KEY, now.toString());
    }
    
    return result;
  }, [shouldBackup]);

  const scheduleBackup = useCallback(() => {
    if (!hasGistToken()) {
      return;
    }
    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }
    
    backupTimeoutRef.current = setTimeout(async () => {
      await performBackup();
    }, BACKUP_DEBOUNCE_MS);
  }, [performBackup]);

  const immediateBackup = useCallback(async () => {
    if (backupTimeoutRef.current) {
      clearTimeout(backupTimeoutRef.current);
    }
    return await performBackup();
  }, [performBackup]);

  useEffect(() => {
    lastDataRef.current = getCurrentData();

    if (!hasGistToken()) {
      return;
    }

    const handleStorageChange = (e) => {
      if (e.key === DB_KEY) {
        scheduleBackup();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (backupTimeoutRef.current) {
        clearTimeout(backupTimeoutRef.current);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [scheduleBackup]);

  return {
    performBackup,
    immediateBackup,
    scheduleBackup
  };
}

export async function manualBackup() {
  return await uploadLatestBackup();
}

export async function checkBackupStatus() {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY);
  if (lastBackup) {
    return {
      lastBackupTime: parseInt(lastBackup),
      lastBackupDate: new Date(parseInt(lastBackup)).toLocaleString()
    };
  }
  return { lastBackupTime: null, lastBackupDate: null };
}
