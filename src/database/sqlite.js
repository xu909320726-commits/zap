const DB_KEY = 'todo-data-v2';

const DEFAULT_DATA = {
  lists: [{ id: 'todo', name: '待办事项', icon: 'circle', isDefault: true, createdAt: new Date().toISOString() }],
  tasks: [],
  tags: []
};

async function getData() {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      return JSON.parse(data);
    }
    await saveData(DEFAULT_DATA);
    return DEFAULT_DATA;
  } catch {
    return DEFAULT_DATA;
  }
}

async function saveData(data) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
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

export async function dbQuery(sql, params = []) {
  return [];
}
