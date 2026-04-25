import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { formatDueDate } from '../utils/dateParser';
import Icon from './Icon';
import ExportModal from './ExportModal';
import * as XLSX from 'xlsx';

const MAX_EXPORT_DAYS = 30;

// 星期标题
const WEEK_DAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

// 视图类型
const VIEW_TYPES = {
  MONTH: 'month',
  WEEK: 'week',
  DAY: 'day'
};

function Calendar({ onClose, highlightedTaskId, showToast }) {
  const { tasks, updateTask, tags, deletedTasks } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [showExportModal, setShowExportModal] = useState(false);
  const weekBodyRef = useRef(null);
  const weekScaleRef = useRef(null);
  const dayTimeScaleRef = useRef(null);
  const dayBodyRef = useRef(null);
  const dayGridRef = useRef(null);

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
          const targetScrollTop = Math.max(0, (midHour * hourHeight) - (containerHeight / 2) + (hourHeight / 2));
          
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
    setCurrentDate(newDate);
  };

  const navigateNext = () => {
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
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTasksInDateRange = useCallback((startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      return taskDate >= start && taskDate <= end;
    });
  }, [tasks]);

  const handleExport = async ({ startDate, endDate }) => {
    const tasksInRange = getTasksInDateRange(startDate, endDate);

    if (tasksInRange.length === 0) {
      showToast('所选时间段内没有任务', 'warning');
      return;
    }

    const data = tasksInRange.map(task => {
      const modifications = task.modifications || [];
      const modificationRecords = modifications.map(m => {
        const date = new Date(m.modifiedAt);
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        return `[${dateStr}] ${m.reason || '(无原因)'} - ${m.changes || '(无变更)'}`;
      }).join('\n');

      const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      };

      const formatDateRange = (dueDate, endDate) => {
        if (!dueDate) return '';
        const due = new Date(dueDate);
        const dueStr = formatDate(dueDate);
        if (!endDate) return dueStr;
        const end = new Date(endDate);
        if (due.toDateString() === end.toDateString()) {
          return dueStr;
        }
        return `${dueStr} ~ ${formatDate(endDate)}`;
      };

      const taskData = {
        '日期': formatDateRange(task.dueDate, task.endDate),
        '任务名称': task.title,
        '备注': task.note || '',
        '修改记录': modificationRecords || ''
      };
      if (task.linkUrl) {
        taskData['任务名称'] = { v: task.title, l: { Target: task.linkUrl } };
      }
      return taskData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '任务导出');

    const keys = ['日期', '任务名称', '备注', '修改记录'];
    const cols = keys.map((key, i) => {
      let maxLen = key.length;
      data.forEach(row => {
        const val = String(row[key]?.v || row[key] || '');
        const lines = val.split('\n');
        lines.forEach(line => {
          maxLen = Math.max(maxLen, line.length);
        });
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 80) };
    });
    ws['!cols'] = cols;

    const range = XLSX.utils.decode_range(ws['!ref']);
    const rows = [];
    for (let R = range.s.r; R <= range.e.r; R++) {
      rows.push({ hpt: 30 });
    }
    ws['!rows'] = rows;

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell) {
          cell.s = {
            alignment: {
              vertical: 'center',
              wrapText: true
            }
          };
        }
      }
    }

    const startFormatted = startDate.replace(/-/g, '');
    const endFormatted = endDate.replace(/-/g, '');
    const filename = `zap_tasks_${startFormatted}_${endFormatted}.xlsx`;

    XLSX.writeFile(wb, filename);

    showToast(`导出成功，共 ${tasksInRange.length} 条任务`, 'success');
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
        <div className="calendar-grid">
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
            onClick={() => setViewType(VIEW_TYPES.MONTH)}
          >
            <Icon name="calendar" size={14} />
            月
          </button>
          <button 
            className={`view-btn ${viewType === VIEW_TYPES.WEEK ? 'active' : ''}`}
            onClick={() => setViewType(VIEW_TYPES.WEEK)}
          >
            <Icon name="calendar-days" size={14} />
            周
          </button>
          <button 
            className={`view-btn ${viewType === VIEW_TYPES.DAY ? 'active' : ''}`}
            onClick={() => setViewType(VIEW_TYPES.DAY)}
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
      </div>
      
      <div className="calendar-content">
        {renderCurrentView()}
      </div>

      <ExportModal
        isOpen={showExportModal}
        onExport={handleExport}
        onCancel={() => setShowExportModal(false)}
      />
    </div>
  );
}

export default Calendar;
