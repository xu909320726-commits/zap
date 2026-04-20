const DB_KEY = 'todo-data-v2';

const DEFAULT_DATA = {
  lists: [{ id: 'todo', name: '待办事项', icon: 'circle', isDefault: true, createdAt: new Date().toISOString() }],
  tasks: [],
  tags: [],
  notes: []
};

const dataCache = {
  data: null,
  listeners: new Set(),
  getData() {
    return this.data;
  },
  setData(newData) {
    this.data = newData;
    this.listeners.forEach(fn => fn(newData));
  },
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  invalidate() {
    this.data = null;
  }
};

let isInitialized = false;

async function getData() {
  if (dataCache.getData() !== null) {
    console.log('[getData] 从缓存返回数据, notes 数量:', (dataCache.getData().notes || []).length);
    return dataCache.getData();
  }
  try {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      dataCache.setData(parsed);
      console.log('[getData] 从 localStorage 读取数据, notes 数量:', (parsed.notes || []).length);
      return parsed;
    }
    await saveData(DEFAULT_DATA);
    dataCache.setData(DEFAULT_DATA);
    console.log('[getData] 使用默认数据, notes 数量:', (DEFAULT_DATA.notes || []).length);
    return DEFAULT_DATA;
  } catch {
    return DEFAULT_DATA;
  }
}

async function saveData(data) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    dataCache.setData(data);
    console.log('[saveData] 数据已保存到 localStorage, notes 数量:', (data.notes || []).length);
  } catch (e) {
    return { success: false, error: e };
  }
  return { success: true };
}

export async function initDatabase() {
  const data = await getData();
  return data;
}

export async function dbGetAll(table) {
  const data = await getData();
  return data[table] || [];
}

export async function dbGetById(table, id) {
  const data = await getData();
  const items = data[table] || [];
  return items.find(item => item.id === id) || null;
}

export async function dbInsert(table, item) {
  const data = await getData();
  if (!data[table]) data[table] = [];
  data[table].push(item);
  await saveData(data);
}

export async function dbUpdate(table, id, updates) {
  const data = await getData();
  if (data[table]) {
    const index = data[table].findIndex(item => item.id === id);
    if (index !== -1) {
      data[table][index] = { ...data[table][index], ...updates };
      await saveData(data);
    }
  }
}

export async function dbDelete(table, id) {
  const data = await getData();
  if (data[table]) {
    data[table] = data[table].filter(item => item.id !== id);
    await saveData(data);
  }
}

export async function dbGetNotes() {
  const data = await getData();
  const notes = (data.notes || []).filter(n => !n.deletedAt).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  console.log('[dbGetNotes] 从数据库加载笔记:', notes.length, '条');
  return notes;
}

export async function dbGetNoteById(id) {
  const data = await getData();
  const notes = data.notes || [];
  return notes.find(n => n.id === id) || null;
}

export async function dbCreateNote(note) {
  const data = await getData();
  if (!data.notes) data.notes = [];
  data.notes.push(note);
  await saveData(data);
  console.log('[dbCreateNote] 创建笔记:', note.id, note.title);
}

export async function dbUpdateNote(id, updates) {
  const data = await getData();
  if (!data.notes) data.notes = [];
  const index = data.notes.findIndex(n => n.id === id);
  if (index !== -1) {
    // 更新现有笔记
    data.notes[index] = { ...data.notes[index], ...updates, updatedAt: new Date().toISOString() };
  } else {
    // 如果笔记不存在，创建新笔记
    data.notes.push({
      id: id,
      ...updates,
      createdAt: updates.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  await saveData(data);
}

export async function dbSoftDeleteNote(id) {
  const data = await getData();
  if (!data.notes) data.notes = [];
  const index = data.notes.findIndex(n => n.id === id);
  if (index !== -1) {
    data.notes[index].deletedAt = new Date().toISOString();
    await saveData(data);
  }
}

export async function dbQuery(sql, params = []) {
  return [];
}
