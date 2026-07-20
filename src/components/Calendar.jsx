import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { formatDueDate } from '../utils/dateParser';
import Icon from './Icon';
import ExportModal from './ExportModal';
import FeishuImportModal from './FeishuImportModal';
import ExcelJS from 'exceljs';

const MAX_EXPORT_DAYS = 30;

// 星期标题
const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 视图类型
const VIEW_TYPES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
};

function Calendar({ onClose, highlightedTaskId, showToast, onTaskImported }) {
  const { tasks, updateTask, tags, deletedTasks, addTask } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showFeishuImport, setShowFeishuImport] = useState(false);
  const [slideDirection, setSlideDirection] = useState('none');
  const weekBodyRef = useRef(null);
  const weekScaleRef = useRef(null);
  const dayTimeScaleRef = useRef(null);
  const dayBodyRef = useRef(null);
  const dayGridRef = useRef(null);
  const monthGridRef = useRef(null);

  // 初始化 Lucide 图标
  useEffect(() => {
    if (window.lucide) {
      try {
        window.lucide.createIcons();
      } catch (e) {
        // Ignore icon initialization errors
      }
    }
  }, []);

  // 当高亮任务变化时，自动跳转到任务截止日期所在月份
  useEffect(() => {
    if (highlightedTaskId) {
      const task = tasks.find(t => t.id === highlightedTaskId);
      if (task && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        // 设置为任务截止日期的月份
        setCurrentDate(new Date(taskDate.getFullYear(), taskDate.getMonth(), 1));
      }
    }
  }, [highlightedTaskId, tasks]);

  // 周视图自动滚动到有任务的时间点
  useEffect(() => {
    if (viewType === VIEW_TYPES.WEEK && weekBodyRef.current && weekScaleRef.current) {
      // 延迟执行，确保 DOM 已渲染
      const timer = setTimeout(() => {
        const days = getWeekData();
        let minHour = 24;
        let maxHour = 0;
        let hasTask = false;
        
        // 找到本周最早和最晚的任务时间
        days.forEach(date => {
          const dayTasks = getTasksForDate(date);
          if (dayTasks.length > 0) {
            hasTask = true;
            dayTasks.forEach(task => {
              const startDate = new Date(task.dueDate);
              const endDate = task.endDate ? new Date(task.endDate) : null;
              
              // 只考虑当天开始的任务
              if (startDate.toDateString() === date.toDateString()) {
                const hour = startDate.getHours();
                if (hour < minHour) minHour = hour;
                if (hour > maxHour) maxHour = hour;
              }
              
              // 也考虑当天结束的任务
              if (endDate && endDate.toDateString() === date.toDateString()) {
                const endHour = endDate.getHours();
                if (endHour > maxHour) maxHour = endHour;
              }
            });
          }
        });
        
        // 如果有任务，平滑滚动到任务时间范围的中心（居中显示）
        if (hasTask && minHour < 24 && maxHour >= minHour) {
          const hourHeight = 60;
          const containerHeight = weekBodyRef.current.clientHeight || 600;
          const midHour = (minHour + maxHour) / 2;
          const targetScrollTop = Math.max(0, minHour * hourHeight - 5);
          
          // 平滑滚动函数
          const smoothScrollTo = (element, target, duration = 500) => {
            const start = element.scrollTop;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              
              // 使用 easeOutCubic 缓动函数
              const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
              const currentPosition = start + (target - start) * easeOutCubic(progress);
              
              element.scrollTop = currentPosition;
              
              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };
            
            requestAnimationFrame(animate);
          };
          
          // 执行平滑滚动
          smoothScrollTo(weekBodyRef.current, targetScrollTop, 600);
          if (weekScaleRef.current) {
            smoothScrollTo(weekScaleRef.current, targetScrollTop, 600);
          }
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [viewType, currentDate]);

  // 日视图自动滚动到有任务的时间点
  useEffect(() => {
    if (viewType === VIEW_TYPES.DAY && dayGridRef.current) {
      const timer = setTimeout(() => {
        const dayTasks = getTasksForDate(currentDate);
        
        if (dayTasks.length === 0) return;
        
        let minHour = 24;
        let maxHour = 0;
        
        dayTasks.forEach(task => {
          const startDate = new Date(task.dueDate);
          const endDate = task.endDate ? new Date(task.endDate) : null;
          
          if (startDate.toDateString() === currentDate.toDateString()) {
            const hour = startDate.getHours();
            if (hour < minHour) minHour = hour;
            if (hour > maxHour) maxHour = hour;
          }
          
          if (endDate && endDate.toDateString() === currentDate.toDateString()) {
            const hour = endDate.getHours();
            if (hour > maxHour) maxHour = hour;
          }
          
          if (startDate.toDateString() !== currentDate.toDateString() && 
              endDate && endDate.toDateString() === currentDate.toDateString()) {
            minHour = 9;
          }
          
          if (startDate.toDateString() !== currentDate.toDateString() && 
              endDate && endDate.toDateString() !== currentDate.toDateString()) {
            minHour = 9;
            maxHour = 18;
          }
        });
        
        if (minHour < 24 && maxHour >= minHour) {
          const hourHeight = 60;
          const containerHeight = dayGridRef.current.clientHeight || 600;
          const targetScrollTop = Math.max(0, minHour * hourHeight - 5);
          
          const smoothScrollTo = (element, target, duration = 600) => {
            const start = element.scrollTop;
            const startTime = performance.now();
            
            const animate = (currentTime) => {
              const elapsed = currentTime - startTime;
              const progress = Math.min(elapsed / duration, 1);
              const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
              const currentPosition = start + (target - start) * easeOutCubic(progress);
              element.scrollTop = currentPosition;
              if (progress < 1) {
                requestAnimationFrame(animate);
              }
            };
            
            requestAnimationFrame(animate);
          };
          
          smoothScrollTo(dayGridRef.current, targetScrollTop, 600);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [viewType, currentDate]);

  // 获取日历数据
  const getMonthData = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();
    
    const days = [];
    
    // 上月填充
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }
    
    // 当前月
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // 下月填充
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentDate]);

  const getWeekData = useCallback(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - daysFromMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  // 获取某天的任务
  const getTasksForDate = useCallback((date) => {
    const deletedTaskIds = new Set(deletedTasks.map(t => t.id));
    
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      if (deletedTaskIds.has(task.id)) return false;
      
      const taskStartDate = new Date(task.dueDate);
      const taskEndDate = task.endDate ? new Date(task.endDate) : null;
      
      // 设置时间为当天的开始和结束
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      
      // 如果有结束日期，检查日期是否在区间内
      if (taskEndDate) {
        return taskStartDate <= dateEnd && taskEndDate >= dateStart;
      }
      
      // 如果没有结束日期，只检查开始日期
      return taskStartDate.toDateString() === date.toDateString();
    });
  }, [tasks, deletedTasks]);

  // 计算任务在某一天应该显示的时间段
  const getTaskTimeDisplay = useCallback((task, date) => {
    const startDate = new Date(task.dueDate);
    const endDate = task.endDate ? new Date(task.endDate) : null;
    
    if (!endDate) {
      // 如果没有结束时间，只显示开始时间
      const hours = startDate.getHours().toString().padStart(2, '0');
      const minutes = startDate.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    const dateStr = date.toDateString();
    const startDateStr = startDate.toDateString();
    const endDateStr = endDate.toDateString();
    
    const padTime = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    
    // 如果是区间任务
    if (startDateStr !== endDateStr) {
      // 第一天：显示从开始时间到当天结束（或18:00）
      if (dateStr === startDateStr) {
        return `${padTime(startDate)}-18:00`;
      }
      // 最后一天：显示从当天开始（或9:00）到结束时间
      if (dateStr === endDateStr) {
        return `09:00-${padTime(endDate)}`;
      }
      // 中间的天：显示9:00-18:00
      return '9:00-18:00';
    }
    
    // 同一天
    return `${padTime(startDate)}-${padTime(endDate)}`;
  }, []);

  // 导航操作
  const navigatePrev = () => {
    if (slideDirection !== 'none') return;
    
    const newDate = new Date(currentDate);
    switch (viewType) {
      case VIEW_TYPES.MONTH:
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case VIEW_TYPES.WEEK:
        newDate.setDate(newDate.getDate() - 7);
        break;
      case VIEW_TYPES.DAY:
        newDate.setDate(newDate.getDate() - 1);
        break;
      default:
        break;
    }
    
    setSlideDirection('slide-right');
    setTimeout(() => {
      setCurrentDate(newDate);
      setTimeout(() => {
        setSlideDirection('none');
      }, 300);
    }, 20);
  };

  const navigateNext = () => {
    if (slideDirection !== 'none') return;
    
    const newDate = new Date(currentDate);
    switch (viewType) {
      case VIEW_TYPES.MONTH:
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case VIEW_TYPES.WEEK:
        newDate.setDate(newDate.getDate() + 7);
        break;
      case VIEW_TYPES.DAY:
        newDate.setDate(newDate.getDate() + 1);
        break;
      default:
        break;
    }
    
    setSlideDirection('slide-left');
    setTimeout(() => {
      setCurrentDate(newDate);
      setTimeout(() => {
        setSlideDirection('none');
      }, 300);
    }, 20);
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const smoothScrollTo = (element, targetScroll, duration, isHorizontal = false) => {
    if (!element) return;
    const property = isHorizontal ? 'scrollLeft' : 'scrollTop';
    const startScroll = element[property];
    const diff = targetScroll - startScroll;
    const startTime = performance.now();
    
    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutCubic(progress);
      element[property] = startScroll + diff * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };
    
    requestAnimationFrame(animateScroll);
  };

  const goToToday = () => {
    if (slideDirection !== 'none') return;

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    let direction = 'none';
    if (viewType === VIEW_TYPES.MONTH) {
      if (todayYear < currentYear || (todayYear === currentYear && todayMonth < currentMonth)) {
        direction = 'slide-right';
      } else if (todayYear > currentYear || (todayYear === currentYear && todayMonth > currentMonth)) {
        direction = 'slide-left';
      }
    } else {
      if (today < currentDate) {
        direction = 'slide-right';
      } else if (today > currentDate) {
        direction = 'slide-left';
      }
    }

    if (direction !== 'none') {
      setSlideDirection(direction);
      setTimeout(() => {
        setCurrentDate(today);
        setTimeout(() => {
          setSlideDirection('none');
        }, 300);
      }, 20);
    } else {
      setCurrentDate(today);
      setTimeout(() => {
        if (viewType === VIEW_TYPES.MONTH && monthGridRef.current) {
          const todayCell = monthGridRef.current.querySelector('.today');
          if (todayCell) {
            const containerHeight = monthGridRef.current.clientHeight;
            const cellTop = todayCell.offsetTop;
            const targetScrollTop = cellTop - containerHeight / 2 + todayCell.clientHeight / 2;
            smoothScrollTo(monthGridRef.current, Math.max(0, targetScrollTop), 600);
          }
        } else if (viewType === VIEW_TYPES.WEEK && weekBodyRef.current) {
          const days = getWeekData();
          const todayIndex = days.findIndex(d => d.toDateString() === today.toDateString());
          if (todayIndex !== -1) {
            const containerWidth = weekBodyRef.current.clientWidth;
            const cellWidth = containerWidth / 7;
            const targetScrollLeft = todayIndex * cellWidth - containerWidth / 2 + cellWidth / 2;
            smoothScrollTo(weekBodyRef.current, Math.max(0, targetScrollLeft), 600, true);
          }
        } else if (viewType === VIEW_TYPES.DAY && dayGridRef.current) {
          const hourHeight = 60;
          const currentHour = today.getHours();
          const targetScrollTop = currentHour * hourHeight - 60;
          smoothScrollTo(dayGridRef.current, Math.max(0, targetScrollTop), 600);
        }
      }, 50);
    }
  };

  const getTasksInDateRange = useCallback((startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      
      const taskStart = new Date(task.dueDate);
      const taskEnd = task.endDate ? new Date(task.endDate) : taskStart;
      
      // 检查任务时间范围是否与导出时间范围有重叠
      // 任务开始时间 <= 导出结束时间 且 任务结束时间 >= 导出开始时间
      return taskStart <= end && taskEnd >= start;
    });
  }, [tasks]);

  // 按日期分组任务并平均分配时间（9:00-18:00）
  // 支持跨天任务展开到每一天，并在同一天按任务名称去重
  // 根据日期自动判断任务完成状态：
  // - 单一日期任务：如果日期 < 今天，标记为已完成
  // - 时间段任务：如果结束日期 >= 今天，保持待办状态
  // 多次导入去重：检查已存在任务，按日期+任务名称维度去重
  const allocateTasksByDate = useCallback((feishuTasks, existingTasks = []) => {
    if (!Array.isArray(feishuTasks) || feishuTasks.length === 0) {
      return { allocatedTasks: [], duplicateCount: 0, duplicateDetails: [] };
    }

    const allocatedTasks = [];
    const workStartHour = 9;
    const workEndHour = 18;
    const workDurationHours = workEndHour - workStartHour;

    // 获取今天的日期（0点）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 构建已存在任务的去重键：日期 + 任务名称
    const existingTaskKeys = new Set();
    existingTasks.forEach(task => {
      if (!task.dueDate || !task.title) return;
      const dateKey = new Date(task.dueDate).toDateString();
      existingTaskKeys.add(`${dateKey}||${task.title}`);
    });

    // 统计重复任务
    const duplicateDetails = [];
    let duplicateCount = 0;

    // 按日期分组，展开跨天任务到每一天
    const groupedByDate = {};
    
    feishuTasks.forEach(task => {
      const startTsNum = task.startTs ? Number(task.startTs) : null;
      const endTsNum = task.endTs ? Number(task.endTs) : startTsNum;
      const startTs = startTsNum ? (startTsNum < 1e12 ? startTsNum * 1000 : startTsNum) : null;
      const endTs = endTsNum ? (endTsNum < 1e12 ? endTsNum * 1000 : endTsNum) : startTs;
      
      if (!startTs) return;
      
      const startDate = new Date(startTs);
      const endDate = endTs ? new Date(endTs) : startDate;
      
      // 设置为当天0点0分0秒0毫秒，用于日期比较
      let currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);
      
      const endDateMidnight = new Date(endDate);
      endDateMidnight.setHours(0, 0, 0, 0);
      
      // 遍历日期范围，包括开始和结束日期
      while (currentDate <= endDateMidnight) {
        const dateKey = currentDate.toDateString();
        
        // 检查是否与已存在任务重复（日期+任务名称）
        // 仅跳过当前这一天，跨天任务的其余日期仍需导入
        const duplicateKey = `${dateKey}||${task.name}`;
        if (existingTaskKeys.has(duplicateKey)) {
          if (!duplicateDetails.find(d => d.date === dateKey && d.name === task.name)) {
            duplicateDetails.push({ date: dateKey, name: task.name });
            duplicateCount++;
          }
          // 跳过当前这一天，跨天任务的其余日期继续处理
          currentDate.setDate(currentDate.getDate() + 1);
          continue;
        }
        
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = [];
        }
        groupedByDate[dateKey].push({
          ...task,
          originalEndDate: endDateMidnight,
        });
        
        // 增加一天
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    // 处理每组日期的任务：去重 + 时间分配
    Object.entries(groupedByDate).forEach(([dateKey, dateTasks]) => {
      // 按任务名称去重（同一天相同名称只保留一个，本次导入内部去重）
      const seen = new Set();
      const uniqueTasks = dateTasks.filter(task => {
        if (seen.has(task.name)) return false;
        seen.add(task.name);
        return true;
      });

      const taskCount = uniqueTasks.length;
      if (taskCount === 0) return;

      // 获取日期基准时间
      const baseDate = new Date(dateKey);
      baseDate.setHours(0, 0, 0, 0);

      // 计算每个任务的时间片
      const sliceDurationMinutes = (workDurationHours * 60) / taskCount;

      uniqueTasks.forEach((task, index) => {
        const startMinutes = workStartHour * 60 + index * sliceDurationMinutes;
        const endMinutes = startMinutes + sliceDurationMinutes;

        const startDate = new Date(baseDate.getTime() + startMinutes * 60 * 1000);
        const endDate = new Date(baseDate.getTime() + endMinutes * 60 * 1000);

        // 判断任务是否已完成：
        // - 单一日期任务（无结束日期或结束日期等于开始日期）：如果日期 < 今天，标记为已完成
        // - 时间段任务（有结束日期且结束日期 > 开始日期）：如果结束日期 < 今天，标记为已完成
        const startTsNum = task.startTs ? Number(task.startTs) : null;
        const endTsNum = task.endTs ? Number(task.endTs) : null;
        const hasEndDate = endTsNum && endTsNum !== startTsNum;
        const isCompleted = hasEndDate 
          ? (task.originalEndDate < today) 
          : (baseDate < today);

        allocatedTasks.push({
          ...task,
          allocatedStart: startDate.toISOString(),
          allocatedEnd: endDate.toISOString(),
          completed: isCompleted,
        });
      });
    });

    return { allocatedTasks, duplicateCount, duplicateDetails };
  }, []);

  const handleExport = async ({ startDate, endDate }) => {
    const tasksInRange = getTasksInDateRange(startDate, endDate);

    if (tasksInRange.length === 0) {
      showToast('所选时间段内没有任务', 'warning');
      return;
    }

    // 按任务标题去重（相同标题只保留第一条）
    const dedupedTasks = [];
    const seenTitles = new Set();
    let dedupedCount = 0;
    tasksInRange.forEach((task) => {
      const title = task.title || '';
      if (seenTitles.has(title)) {
        dedupedCount++;
        return;
      }
      seenTitles.add(title);
      dedupedTasks.push(task);
    });

    if (dedupedTasks.length === 0) {
      showToast('所选时间段内没有任务', 'warning');
      return;
    }

    // 格式化辅助函数
    const fmtDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };
    const fmtDateRange = (dueDate, endDate) => {
      if (!dueDate) return '';
      const due = new Date(dueDate);
      const dueStr = fmtDate(dueDate);
      if (!endDate) return dueStr;
      const end = new Date(endDate);
      if (due.toDateString() === end.toDateString()) {
        return dueStr;
      }
      return `${dueStr} ~ ${fmtDate(endDate)}`;
    };
    const fmtModifications = (modifications) => {
      return (modifications || []).map(m => {
        const date = new Date(m.modifiedAt);
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `[${dateStr}] ${m.reason || '(无原因)'} - ${m.changes || '(无变更)'}`;
      }).join('\n');
    };

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('任务导出');

    const keys = ['日期', '任务名称', '备注', '修改记录'];

    // 计算列宽
    const cols = keys.map((key) => {
      let maxLen = key.length;
      dedupedTasks.forEach((task) => {
        if (key === '日期') {
          const val = fmtDateRange(task.dueDate, task.endDate);
          maxLen = Math.max(maxLen, val.length);
        } else if (key === '任务名称') {
          maxLen = Math.max(maxLen, (task.title || '').length);
        } else if (key === '备注') {
          const lines = (task.note || '').split('\n');
          lines.forEach(line => {
            maxLen = Math.max(maxLen, line.length);
          });
        } else if (key === '修改记录') {
          const lines = fmtModifications(task.modifications).split('\n');
          lines.forEach(line => {
            maxLen = Math.max(maxLen, line.length);
          });
        }
      });
      return { width: Math.min(Math.max(maxLen + 2, 10), 60) };
    });

    // 写表头
    const headerRow = ws.addRow(keys);
    headerRow.font = { name: '等线', size: 10, bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    headerRow.height = 22;

    // 设置列宽
    keys.forEach((_, i) => {
      ws.getColumn(i + 1).width = cols[i].width;
    });

    // 写数据
    dedupedTasks.forEach((task) => {
      const row = ws.addRow([
        fmtDateRange(task.dueDate, task.endDate),
        task.title || '',
        task.note || '',
        fmtModifications(task.modifications) || '',
      ]);

      // 设置每一行的样式：字体 等线 10
      row.font = { name: '等线', size: 10 };
      row.alignment = { vertical: 'middle', wrapText: true };

      // 如果有链接，给任务名称单元格加超链接
      if (task.linkUrl) {
        const titleCell = row.getCell(2);
        titleCell.value = {
          text: task.title,
          hyperlink: task.linkUrl,
        };
        titleCell.font = { name: '等线', size: 10, color: { argb: 'FF0563C1' }, underline: true };
      }
    });

    const startFormatted = startDate.replace(/-/g, '');
    const endFormatted = endDate.replace(/-/g, '');
    const filename = `zap_tasks_${startFormatted}_${endFormatted}.xlsx`;

    // 在浏览器环境中使用 writeBuffer 创建下载
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    const dedupMsg = dedupedCount > 0 ? `（已按标题去重 ${dedupedCount} 条）` : '';
    showToast(`导出成功，共 ${dedupedTasks.length} 条任务${dedupMsg}`, 'success');
  };

  // 获取视图标题
  const getViewTitle = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const day = currentDate.getDate();
    
    switch (viewType) {
      case VIEW_TYPES.MONTH:
        return `${year}年${month + 1}月`;
      case VIEW_TYPES.WEEK:
        const weekStart = getWeekData()[0];
        const weekEnd = getWeekData()[6];
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${year}年${month + 1}月`;
        }
        return `${year}年${weekStart.getMonth() + 1}月`;
      case VIEW_TYPES.DAY:
        return `${year}年${month + 1}月${day}日 ${WEEK_DAYS[currentDate.getDay()]}`;
      default:
        return '';
    }
  };

  // 渲染月视图
  const renderMonthView = () => {
    const days = getMonthData();
    const today = new Date();
    
    // 获取高亮任务（如果有）
    const highlightedTask = highlightedTaskId ? tasks.find(t => t.id === highlightedTaskId) : null;
    
    return (
      <div className="calendar-month">
        <div className="calendar-week-header">
          {WEEK_DAYS.map((day, i) => (
            <div key={i} className="calendar-weekday">{day}</div>
          ))}
        </div>
        <div ref={monthGridRef} className="calendar-grid">
          {days.map((dayData, index) => {
            const dayTasks = getTasksForDate(dayData.date);
            const isToday = dayData.date.toDateString() === today.toDateString();
            
            // 检查是否需要高亮（日期匹配高亮任务的日期或在其日期区间内）
            const isHighlighted = highlightedTask && highlightedTask.dueDate && 
              (() => {
                const taskStart = new Date(highlightedTask.dueDate);
                const taskEnd = highlightedTask.endDate ? new Date(highlightedTask.endDate) : null;
                const dateStart = new Date(dayData.date);
                dateStart.setHours(0, 0, 0, 0);
                const dateEnd = new Date(dayData.date);
                dateEnd.setHours(23, 59, 59, 999);
                
                if (taskEnd) {
                  return taskStart <= dateEnd && taskEnd >= dateStart;
                }
                return taskStart.toDateString() === dayData.date.toDateString();
              })();
            
            return (
              <div
                key={index}
                className={`calendar-cell ${!dayData.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isHighlighted ? 'highlighted' : ''}`}
              >
                <div className="calendar-day-number">{dayData.date.getDate()}</div>
                <div className="calendar-tasks">
                  {dayTasks.slice(0, 3).map(task => {
                    // 获取任务的第一个标签颜色
                    const taskTag = task.tagIds && task.tagIds.length > 0
                      ? tags.find(t => t.id === task.tagIds[0])
                      : null;
                    const tagColor = taskTag ? taskTag.color : null;
                    const timeDisplay = getTaskTimeDisplay(task, dayData.date);
                    
                    return (
                      <div
                        key={task.id}
                        className={`calendar-task ${task.completed ? 'completed' : ''} ${task.id === highlightedTaskId ? 'highlighted' : ''}`}
                        style={tagColor && !task.completed ? {
                          backgroundColor: tagColor + '20',
                          color: tagColor,
                          borderLeftColor: tagColor
                        } : {}}
                      >
                        <Icon name="circle" size={10} />
                        <span className="task-time">{timeDisplay}</span>
                        {task.title}
                      </div>
                    );
                  })}
                  {dayTasks.length > 3 && (
                    <div className="calendar-task-more">+{dayTasks.length - 3} 更多</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染周视图
  const renderWeekView = () => {
    const days = getWeekData();
    const today = new Date();
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const hourHeight = 60;
    
    // 滚动同步处理
    const handleScaleScroll = (e) => {
      if (weekBodyRef.current) {
        weekBodyRef.current.scrollTop = e.target.scrollTop;
      }
    };
    
    const handleBodyScroll = (e) => {
      if (weekScaleRef.current) {
        weekScaleRef.current.scrollTop = e.target.scrollTop;
      }
    };
    
    return (
      <div className="calendar-week">
        <div className="calendar-week-header">
          <div className="calendar-week-time-header"></div>
          {days.map((date, i) => (
            <div 
              key={i} 
              className={`calendar-weekday ${date.toDateString() === today.toDateString() ? 'today' : ''}`}
            >
              <span className="weekday-name">{WEEK_DAYS[(i + 1) % 7]}</span>
              <span className="weekday-number">{date.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="calendar-week-body">
          <div 
            ref={weekScaleRef}
            className="calendar-week-scale"
            onScroll={handleScaleScroll}
          >
            {hours.map(hour => (
              <div 
                key={hour} 
                className="calendar-week-hour"
                style={{ height: hourHeight }}
              >
                <span className="calendar-week-hour-label">{hour.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          <div 
            ref={weekBodyRef}
            className="calendar-week-grid"
            onScroll={handleBodyScroll}
          >
            {days.map((date, i) => {
              const dayTasks = getTasksForDate(date);
              return (
                <div
                  key={i}
                  className="calendar-week-cell"
                  style={{ height: hours.length * hourHeight }}
                >
                  {dayTasks.map(task => {
                    const taskTag = task.tagIds && task.tagIds.length > 0
                      ? tags.find(t => t.id === task.tagIds[0])
                      : null;
                    const tagColor = taskTag ? taskTag.color : null;
                    const timeDisplay = getTaskTimeDisplay(task, date);
                    
                    // 计算任务的位置和高度
                    const startDate = new Date(task.dueDate);
                    const endDate = task.endDate ? new Date(task.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
                    let startHour = startDate.getHours();
                    let startMinute = startDate.getMinutes();
                    let endHour = endDate.getHours();
                    let endMinute = endDate.getMinutes();
                    let top = (startHour + startMinute / 60) * hourHeight;
                    
                    // 对于跨天任务，调整时间显示
                    const taskStartDateStr = startDate.toDateString();
                    const taskEndDateStr = endDate.toDateString();
                    const currentDateStr = date.toDateString();
                    
                    // 如果是跨天任务
                    if (taskStartDateStr !== taskEndDateStr) {
                      // 如果是开始日期，结束时间设为18:00
                      if (currentDateStr === taskStartDateStr) {
                        endHour = 18;
                        endMinute = 0;
                      }
                      // 如果是中间日期
                      else if (currentDateStr !== taskStartDateStr && currentDateStr !== taskEndDateStr) {
                        // 中间天：9:00-18:00
                        top = (9 * 60 / 60) * hourHeight; // 9:00开始
                        startHour = 9;
                        startMinute = 0;
                        endHour = 18;
                        endMinute = 0;
                      } else if (currentDateStr === taskEndDateStr) {
                        // 结束日期，开始时间设为9:00
                        top = (9 * 60 / 60) * hourHeight; // 9:00开始
                        startHour = 9;
                        startMinute = 0;
                      }
                    }
                    
                    const duration = (endHour + endMinute / 60) - (startHour + startMinute / 60);
                    const height = Math.max(duration * hourHeight, 24);
                    
                    return (
                      <div
                        key={task.id}
                        className={`calendar-week-task ${task.completed ? 'completed' : ''}`}
                        style={{ 
                          top: `${top}px`,
                          height: `${height}px`,
                          ...(tagColor && !task.completed ? {
                            backgroundColor: tagColor + '20',
                            color: tagColor,
                            borderLeftColor: tagColor
                          } : {})
                        }}
                      >
                        <Icon name="circle" size={10} />
                        <span className="task-time">{timeDisplay}</span>
                        {task.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = getTasksForDate(currentDate);
    const hourHeight = 60;
    
    // 滚动同步处理
    const handleScaleScroll = (e) => {
      if (dayBodyRef.current) {
        dayBodyRef.current.scrollTop = e.target.scrollTop;
      }
    };
    
    const handleBodyScroll = (e) => {
      if (dayTimeScaleRef.current) {
        dayTimeScaleRef.current.scrollTop = e.target.scrollTop;
      }
    };
    
    return (
      <div className="calendar-day">
        <div className="calendar-day-header">
          <span className="day-date">{currentDate.getDate()}</span>
          <span className="day-week">{WEEK_DAYS[currentDate.getDay()]}</span>
        </div>
        <div ref={dayGridRef} className="calendar-day-grid">
          <div className="calendar-day-hours">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="calendar-day-hour"
                style={{ height: hourHeight }}
              >
                <span className="calendar-day-hour-label">{hour.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          <div className="calendar-day-tasks">
            {dayTasks.map(task => {
              const startDate = new Date(task.dueDate);
              const endDate = task.endDate ? new Date(task.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
              let startHour = startDate.getHours();
              let startMinute = startDate.getMinutes();
              let endHour = endDate.getHours();
              let endMinute = endDate.getMinutes();
              let top = (startHour + startMinute / 60) * hourHeight;
              
              // 对于跨天任务，调整时间显示
              const taskStartDateStr = startDate.toDateString();
              const taskEndDateStr = endDate.toDateString();
              const currentDateStr = currentDate.toDateString();
              
              // 如果是跨天任务
              if (taskStartDateStr !== taskEndDateStr) {
                // 如果是开始日期，结束时间设为18:00
                if (currentDateStr === taskStartDateStr) {
                  endHour = 18;
                  endMinute = 0;
                }
                // 如果是中间日期
                else if (currentDateStr !== taskStartDateStr && currentDateStr !== taskEndDateStr) {
                  // 中间天：9:00-18:00
                  top = (9 * 60 / 60) * hourHeight;
                  startHour = 9;
                  startMinute = 0;
                  endHour = 18;
                  endMinute = 0;
                } else if (currentDateStr === taskEndDateStr) {
                  // 结束日期，开始时间设为9:00
                  top = (9 * 60 / 60) * hourHeight;
                  startHour = 9;
                  startMinute = 0;
                }
              }
              
              const startMinutes = startHour * 60 + startMinute;
              const endMinutes = endHour * 60 + endMinute;
              const taskTag = task.tagIds && task.tagIds.length > 0
                ? tags.find(t => t.id === task.tagIds[0])
                : null;
              const tagColor = taskTag ? taskTag.color : null;
              const timeDisplay = getTaskTimeDisplay(task, currentDate);
              
              return (
                <div
                  key={task.id}
                  className={`calendar-task time-block ${task.completed ? 'completed' : ''}`}
                  style={{
                    backgroundColor: tagColor && !task.completed ? tagColor + '20' : undefined,
                    color: tagColor && !task.completed ? tagColor : undefined,
                    borderLeftColor: tagColor && !task.completed ? tagColor : undefined,
                    top: `${top}px`,
                    height: `${Math.max(((endMinutes - startMinutes) / 60) * hourHeight, 20)}px`,
                    left: '0',
                    right: '0',
                    zIndex: 1
                  }}
                >
                  <Icon name="circle" size={10} />
                  <span className="task-time">{timeDisplay}</span>
                  <span className="task-title">{task.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 渲染当前视图
  const renderCurrentView = () => {
    switch (viewType) {
      case VIEW_TYPES.MONTH:
        return renderMonthView();
      case VIEW_TYPES.WEEK:
        return renderWeekView();
      case VIEW_TYPES.DAY:
        return renderDayView();
      default:
        return null;
    }
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="nav-btn" onClick={navigatePrev}>
            <Icon name="chevron-left" />
          </button>
          <button className="nav-btn today-btn" onClick={goToToday}>
            <Icon name="circle-dot" size={14} style={{ marginRight: 4 }} />
            今天
          </button>
          <button className="nav-btn" onClick={navigateNext}>
            <Icon name="chevron-right" />
          </button>
        </div>
        
        <div className="calendar-title">{getViewTitle()}</div>
        
        <div className="view-switcher">
          <button 
            className={`view-btn ${viewType === VIEW_TYPES.MONTH ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setViewType(VIEW_TYPES.MONTH);
            }}
          >
            <Icon name="calendar" size={14} />
            月
          </button>
          <button 
            className={`view-btn ${viewType === VIEW_TYPES.WEEK ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setViewType(VIEW_TYPES.WEEK);
            }}
          >
            <Icon name="calendar-days" size={14} />
            周
          </button>
          <button 
            className={`view-btn ${viewType === VIEW_TYPES.DAY ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setViewType(VIEW_TYPES.DAY);
            }}
          >
            <Icon name="calendar" size={14} />
            日
          </button>
        </div>

        <button
          className="export-btn"
          onClick={() => setShowExportModal(true)}
          title="导出任务"
        >
          <Icon name="download" size={14} />
          导出
        </button>

        <button
          className="export-btn feishu-import-btn"
          onClick={() => setShowFeishuImport(true)}
          title="导入飞书项目"
        >
          <Icon name="cloud-download" size={14} />
          导入飞书
        </button>
      </div>
      
      <div className="calendar-content">
        <div className={`calendar-slide ${slideDirection}`}>
          {renderCurrentView()}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onExport={handleExport}
        onCancel={() => setShowExportModal(false)}
      />

      <FeishuImportModal
        isOpen={showFeishuImport}
        onCancel={() => setShowFeishuImport(false)}
        onImport={async (task) => {
          try {
            // 批量导入模式：接收 { tasks, targetListId, mode: 'batch' }
            if (task.mode === 'batch' && Array.isArray(task.tasks)) {
              const { tasks: feishuTasks, targetListId } = task;
              
              // 按日期分组并平均分配时间（9:00-18:00），传入已存在任务去重
              const { allocatedTasks, duplicateCount, duplicateDetails } = allocateTasksByDate(feishuTasks, tasks);

              // 批量创建任务
              for (const t of allocatedTasks) {
                const noteLines = [
                  t.url ? `飞书链接：${t.url}` : null,
                  t.assignee ? `负责人：${t.assignee}` : null,
                  t.storyId ? `Story ID：${t.storyId}` : null,
                ].filter(Boolean).join('\n');

                const listId = targetListId || 'todo';

                await addTask(
                  t.name || '未命名任务',
                  listId,
                  t.allocatedStart,
                  t.allocatedEnd,
                  [],
                  t.url || null,
                  noteLines || null,
                  t.completed
                );
              }

              // 显示重复任务提示
              if (duplicateCount > 0) {
                const duplicateMsg = duplicateDetails.slice(0, 5).map(d => `${d.date}: ${d.name}`).join('\n');
                const moreMsg = duplicateDetails.length > 5 ? `\n...还有 ${duplicateDetails.length - 5} 条重复任务` : '';
                showToast(`检测到 ${duplicateCount} 条重复任务（已跳过）：\n${duplicateMsg}${moreMsg}`, 'warning');
              }

              // 通知 App 端：从数据库重新加载 tasks，保证待办视图立刻看到新任务
              if (onTaskImported) {
                await onTaskImported({ count: allocatedTasks.length });
              }

              return { acknowledged: true };
            }

            // 单任务导入模式（兼容旧回调）
            // task: { name, storyId, url, startTime, endTime, assignee, _targetListId, ... }
            // 转换时间戳为 ISO 字符串（addTask 内部已支持 Date/ISO）
            // 注意：飞书甘特图返回的 start/end 是秒级时间戳
            const startTs = task.startTs ? (task.startTs < 1e12 ? task.startTs * 1000 : task.startTs) : null;
            const endTs = task.endTs ? (task.endTs < 1e12 ? task.endTs * 1000 : task.endTs) : null;
            const startDate = startTs ? new Date(startTs).toISOString() : null;
            const endDate = endTs ? new Date(endTs).toISOString() : null;

            const noteLines = [
              task.url ? `飞书链接：${task.url}` : null,
              task.assignee ? `负责人：${task.assignee}` : null,
              task.storyId ? `Story ID：${task.storyId}` : null,
            ].filter(Boolean).join('\n');

            // 使用 Modal 中选择的目标列表（默认 'todo'）
            const listId = task._targetListId || 'todo';

            const taskParams = {
              title: task.name || '未命名任务',
              listId,
              dueDate: startDate,
              endDate,
              tagIds: [],
              linkUrl: task.url || null,
              note: noteLines || null,
            };

            // 仅调用本地 addTask：
            // Calendar 内部的 useStore() 维护独立的 tasks state，
            // 同时它自己写入数据库。App 的 useStore 是另一个实例，
            // 我们通过父组件 onTaskImported 让 App 重新从 DB 拉取最新 tasks。
            await addTask(
              taskParams.title,
              taskParams.listId,
              taskParams.dueDate,
              taskParams.endDate,
              taskParams.tagIds,
              taskParams.linkUrl,
              taskParams.note
            );
            // 通知 App 端：从数据库重新加载 tasks，保证待办视图立刻看到新任务
            if (onTaskImported) {
              await onTaskImported(taskParams);
            }
            return true;
          } catch (err) {
            console.error('导入飞书任务失败:', err);
            throw err;
          }
        }}
        showToast={showToast}
      />
    </div>
  );
}

export default Calendar;
