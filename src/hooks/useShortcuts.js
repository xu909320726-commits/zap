import { useEffect, useCallback } from 'react';

/**
 * 快捷键 Hook
 * 监听 Electron 主进程发送的快捷键事件
 */
export function useShortcuts({ onAddTask, onCompleteTask, onFocusSearch }) {
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleShortcut = (action) => {
      switch (action) {
        case 'add-task':
          onAddTask?.();
          break;
        case 'complete-task':
          onCompleteTask?.();
          break;
        case 'focus-search':
          onFocusSearch?.();
          break;
        default:
          break;
      }
    };

    window.electronAPI.onShortcut(handleShortcut);

    return () => {
      window.electronAPI.removeShortcutListener();
    };
  }, [onAddTask, onCompleteTask, onFocusSearch]);
}

export default useShortcuts;
