import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, dbGetAll, dbInsert, dbUpdate, dbDelete } from '../database/sqlite';

/**
 * 数据存储 Hook
 * 使用 SQLite (sql.js) 进行持久化
 */
export function useStore() {
  const [lists, setLists] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tags, setTags] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const parseTasks = useCallback((rows) => {
    return rows.map(row => ({
      ...row,
      completed: row.completed === 1,
      isDefault: row.isDefault === 1,
      tagIds: row.tagIds ? JSON.parse(row.tagIds) : [],
      linkUrl: row.linkUrl || null,
      modifications: row.modifications ? JSON.parse(row.modifications) : []
    }));
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        await initDatabase();
        
        const listsData = await dbGetAll('lists');
        const tasksData = await dbGetAll('tasks');
        const tagsData = await dbGetAll('tags');
        
        setLists(listsData.length > 0 ? parseTasks(listsData) : [
          { id: 'todo', name: '待办事项', icon: 'circle', isDefault: true, createdAt: new Date().toISOString() }
        ]);
        setTasks(parseTasks(tasksData.filter(t => !t.deletedAt)));
        setTags(parseTasks(tagsData));
        setDeletedTasks(parseTasks(tasksData.filter(t => t.deletedAt)));
      } catch (error) {
        console.error('加载数据失败:', error);
      }
      setIsLoaded(true);
    };
    loadData();
  }, [parseTasks]);

  const addList = useCallback(async (name, icon = 'list') => {
    const newList = {
      id: uuidv4(),
      name,
      icon,
      isDefault: 0,
      createdAt: new Date().toISOString()
    };
    await dbInsert('lists', newList);
    const newLists = [...lists, { ...newList, isDefault: false }];
    setLists(newLists);
    return { ...newList, isDefault: false };
  }, [lists]);

  const deleteList = useCallback(async (listId) => {
    const listToDelete = lists.find(l => l.id === listId);
    if (listToDelete?.isDefault) {
      return false;
    }
    
    await dbDelete('lists', listId);
    tasks.filter(t => t.listId === listId).forEach(t => dbDelete('tasks', t.id));
    
    const newLists = lists.filter(l => l.id !== listId);
    const newTasks = tasks.filter(t => t.listId !== listId);
    setLists(newLists);
    setTasks(newTasks);
    return true;
  }, [lists, tasks]);

  const updateList = useCallback(async (listId, updates) => {
    await dbUpdate('lists', listId, updates);
    const newLists = lists.map(l => l.id === listId ? { ...l, ...updates } : l);
    setLists(newLists);
  }, [lists]);

  const addTask = useCallback(async (title, listId = 'todo', dueDate = null, endDate = null, tagIds = [], linkUrl = null, note = null) => {
    const newTask = {
      id: uuidv4(),
      title,
      listId,
      completed: 0,
      dueDate: dueDate ? (dueDate instanceof Date ? dueDate.toISOString() : dueDate) : null,
      endDate: endDate ? (endDate instanceof Date ? endDate.toISOString() : endDate) : null,
      tagIds: JSON.stringify(tagIds),
      linkUrl: linkUrl || null,
      note: note || null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      deletedAt: null
    };
    await dbInsert('tasks', newTask);
    const taskWithParsed = {
      ...newTask,
      completed: false,
      isDefault: false,
      tagIds,
      linkUrl
    };
    const newTasks = [...tasks, taskWithParsed];
    setTasks(newTasks);
    return taskWithParsed;
  }, [tasks]);

  const deleteTask = useCallback(async (taskId, deleteReason = null) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;
    
    await dbUpdate('tasks', taskId, { 
      deletedAt: new Date().toISOString(),
      deleteReason: deleteReason
    });
    
    const deletedTaskWithMeta = { 
      ...taskToDelete, 
      deletedAt: new Date().toISOString(),
      deleteReason: deleteReason
    };
    const newTasks = tasks.filter(t => t.id !== taskId);
    const newDeletedTasks = [...deletedTasks, deletedTaskWithMeta];
    
    setTasks(newTasks);
    setDeletedTasks(newDeletedTasks);
  }, [tasks, deletedTasks]);

  const restoreTask = useCallback(async (taskId) => {
    const taskToRestore = deletedTasks.find(t => t.id === taskId);
    if (!taskToRestore) return;
    
    await dbUpdate('tasks', taskId, { deletedAt: null });
    
    const { deletedAt, ...restoredTask } = taskToRestore;
    const newDeletedTasks = deletedTasks.filter(t => t.id !== taskId);
    const newTasks = [...tasks, restoredTask];
    
    setDeletedTasks(newDeletedTasks);
    setTasks(newTasks);
  }, [tasks, deletedTasks]);

  const permanentDeleteTask = useCallback(async (taskId) => {
    await dbDelete('tasks', taskId);
    const newDeletedTasks = deletedTasks.filter(t => t.id !== taskId);
    setDeletedTasks(newDeletedTasks);
  }, [deletedTasks]);

  const emptyTrash = useCallback(async () => {
    for (const t of deletedTasks) {
      await dbDelete('tasks', t.id);
    }
    setDeletedTasks([]);
  }, [deletedTasks]);

  const updateTask = useCallback(async (taskId, updates, modificationReason = null) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const serialized = { ...updates };
    if (updates.tagIds !== undefined) {
      serialized.tagIds = JSON.stringify(updates.tagIds);
    }
    if (updates.completed !== undefined) {
      serialized.completed = updates.completed ? 1 : 0;
    }

    const changedFields = [];
    const fieldLabels = {
      title: '任务名称',
      dueDate: '开始时间',
      endDate: '结束时间',
      tagIds: '标签',
      linkUrl: '链接',
      note: '备注'
    };

    const formatDateTime = (dateStr) => {
      if (!dateStr || dateStr === '(空)') return dateStr;
      const date = new Date(dateStr);
      const pad = (n) => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    };

    const isDateField = (key) => key === 'dueDate' || key === 'endDate';

    for (const [key, label] of Object.entries(fieldLabels)) {
      if (updates[key] !== undefined && updates[key] !== task[key]) {
        let oldValue = task[key] ?? '(空)';
        let newValue = updates[key] === '' || updates[key] === null ? '(空)' : updates[key];
        if (isDateField(key)) {
          oldValue = formatDateTime(oldValue);
          newValue = formatDateTime(newValue);
        }
        changedFields.push(`${label}: ${oldValue} → ${newValue}`);
      }
    }

    if (changedFields.length > 0) {
      const modification = {
        id: uuidv4(),
        reason: modificationReason || '更新任务',
        changes: changedFields.join('; '),
        modifiedAt: new Date().toISOString()
      };

      const existingModifications = task.modifications || [];
      serialized.modifications = JSON.stringify([...existingModifications, modification]);
    }

    await dbUpdate('tasks', taskId, serialized);
    const newTasks = tasks.map(t => {
      if (t.id !== taskId) return t;
      const updated = { ...t, ...updates };
      if (serialized.modifications) {
        updated.modifications = JSON.parse(serialized.modifications);
      }
      return updated;
    });
    setTasks(newTasks);
  }, [tasks]);

  const toggleTaskComplete = useCallback(async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newCompleted = !task.completed;
    const updates = {
      completed: newCompleted,
      completedAt: newCompleted ? new Date().toISOString() : null
    };
    await updateTask(taskId, updates);
  }, [tasks, updateTask]);

  const getTasksByList = useCallback((listId) => {
    return tasks.filter(t => t.listId === listId);
  }, [tasks]);

  const searchTasks = useCallback((keyword) => {
    if (!keyword.trim()) return [];
    const lowerKeyword = keyword.toLowerCase();
    return tasks.filter(t => t.title.toLowerCase().includes(lowerKeyword));
  }, [tasks]);

  const addTag = useCallback(async (name, color = '#0D7C66') => {
    const newTag = {
      id: uuidv4(),
      name,
      color,
      createdAt: new Date().toISOString()
    };
    await dbInsert('tags', newTag);
    const newTags = [...tags, newTag];
    setTags(newTags);
    return newTag;
  }, [tags]);

  const deleteTag = useCallback(async (tagId) => {
    await dbDelete('tags', tagId);
    const newTags = tags.filter(t => t.id !== tagId);
    const newTasks = tasks.map(task => ({
      ...task,
      tagIds: task.tagIds?.filter(id => id !== tagId) || []
    }));
    
    for (const task of newTasks) {
      if (task.tagIds.length !== tasks.find(t => t.id === task.id)?.tagIds?.length) {
        await dbUpdate('tasks', task.id, { tagIds: JSON.stringify(task.tagIds) });
      }
    }
    
    setTags(newTags);
    setTasks(newTasks);
  }, [tags, tasks]);

  const updateTag = useCallback(async (tagId, updates) => {
    await dbUpdate('tags', tagId, updates);
    const newTags = tags.map(t => t.id === tagId ? { ...t, ...updates } : t);
    setTags(newTags);
  }, [tags]);

  return {
    lists,
    tasks,
    tags,
    deletedTasks,
    isLoaded,
    addList,
    deleteList,
    updateList,
    addTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyTrash,
    updateTask,
    toggleTaskComplete,
    getTasksByList,
    searchTasks,
    addTag,
    deleteTag,
    updateTag
  };
}

export default useStore;
