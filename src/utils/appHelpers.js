export const formatTimeForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

export const formatDateForInput = (date) => {
  if (!date) {
    const today = new Date();
    return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
  }
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

export const formatDateTimeLocal = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const isOverdue = (task) => {
  if (!task.dueDate || task.completed) return false;
  return new Date(task.dueDate) < new Date();
};

export const isToday = (task) => {
  if (!task.dueDate || task.completed) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  return due.toDateString() === now.toDateString();
};

export const formatDeletedDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const formatDueDateWithRange = (startDate, endDate, formatDueDate) => {
  if (!startDate) return '';
  const formatFn = formatDueDate || ((d) => {
    const now = new Date();
    const target = new Date(d);
    const isSameDay = (d1, d2) => 
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (isSameDay(target, now)) return '今天';
    if (isSameDay(target, tomorrow)) return '明天';
    return `${target.getMonth() + 1}月${target.getDate()}日`;
  });
  const start = formatFn(startDate);
  if (!endDate) return start;
  const startTime = formatTimeForInput(startDate);
  const endTime = formatTimeForInput(endDate);
  if (startTime === endTime) return `${start} ${startTime}`;
  return `${start} ${startTime} - ${endTime}`;
};