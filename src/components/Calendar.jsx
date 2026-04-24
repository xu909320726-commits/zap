import React, { useState, useCallback, useEffect } from 'react';
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
  DAY: 'day',
  TIMELINE: 'timeline'
};

function Calendar({ onClose, highlightedTaskId, showToast }) {
  const { tasks, updateTask, tags } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState(VIEW_TYPES.MONTH);
  const [showExportModal, setShowExportModal] = useState(false);

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
    startOfWeek.setDate(startOfWeek.getDate() - day);
    
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
    return tasks.filter(task => {
      if (!task.dueDate) return false;
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
  }, [tasks]);

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
      case VIEW_TYPES.TIMELINE:
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
      case VIEW_TYPES.TIMELINE:
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
      case VIEW_TYPES.TIMELINE:
        return `${year}年${month + 1}月${day}日 时间线`;
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
    
    return (
      <div className="calendar-week">
        <div className="calendar-week-header">
          {days.map((date, i) => (
            <div 
              key={i} 
              className={`calendar-weekday ${date.toDateString() === today.toDateString() ? 'today' : ''}`}
            >
              <span className="weekday-name">{WEEK_DAYS[i]}</span>
              <span className="weekday-number">{date.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="calendar-week-grid">
          {days.map((date, i) => {
            const dayTasks = getTasksForDate(date);
            return (
              <div
                key={i}
                className="calendar-week-cell"
              >
                {dayTasks.map(task => {
                  const taskTag = task.tagIds && task.tagIds.length > 0
                    ? tags.find(t => t.id === task.tagIds[0])
                    : null;
                  const tagColor = taskTag ? taskTag.color : null;
                  const timeDisplay = getTaskTimeDisplay(task, date);
                  
                  return (
                    <div
                      key={task.id}
                      className={`calendar-task ${task.completed ? 'completed' : ''}`}
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
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染日视图
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = getTasksForDate(currentDate);
    
    return (
      <div className="calendar-day">
        <div className="calendar-day-header">
          <span className="day-date">{currentDate.getDate()}</span>
          <span className="day-week">{WEEK_DAYS[currentDate.getDay()]}</span>
        </div>
        <div className="calendar-day-grid">
          {(() => {
            // 将任务转换为分钟表示
            const taskTimes = dayTasks
              .filter(t => t.dueDate)
              .map(t => {
                const start = new Date(t.dueDate);
                const end = t.endDate ? new Date(t.endDate) : new Date(start.getTime() + 60 * 60 * 1000);
                return {
                  task: t,
                  startMinutes: start.getHours() * 60 + start.getMinutes(),
                  endMinutes: end.getHours() * 60 + end.getMinutes()
                };
              })
              .sort((a, b) => a.startMinutes - b.startMinutes);

            // 使用分层算法分配 track
            const tracks = []; // tracks[i] = 该 track 最后任务的结束时间
            
            taskTimes.forEach(item => {
              // 找到第一个不重叠的 track
              let assignedTrack = -1;
              for (let i = 0; i < tracks.length; i++) {
                if (tracks[i] <= item.startMinutes) {
                  assignedTrack = i;
                  break;
                }
              }
              
              if (assignedTrack === -1) {
                // 需要新开一个 track
                assignedTrack = tracks.length;
                tracks.push(item.endMinutes);
              } else {
                // 使用找到的 track
                tracks[assignedTrack] = item.endMinutes;
              }
              
              item.track = assignedTrack;
              item.maxTrack = tracks.length;
            });

            const maxTracks = tracks.length;
            const hourHeight = 60; // 每小时高度60px

            // 整体渲染所有任务块（不再按小时分割）
            const renderTaskBlocks = () => {
              return taskTimes.map(item => {
                const { task, startMinutes, endMinutes, track, maxTrack } = item;
                
                // 计算整体位置和大小
                const top = (startMinutes / 60) * hourHeight;
                
                // 对于跨天任务，计算调整后的结束时间
                let displayEndMinutes = endMinutes;
                let displayStartMinutes = startMinutes;
                let adjustedTop = top;
                
                if (task.endDate) {
                  const taskStart = new Date(task.dueDate);
                  const taskEnd = new Date(task.endDate);
                  const currentDateStr = currentDate.toDateString();
                  const startDateStr = taskStart.toDateString();
                  const endDateStr = taskEnd.toDateString();
                  
                  // 如果是跨天任务
                  if (startDateStr !== endDateStr) {
                    // 如果是开始日期，结束时间设为18:00
                    if (currentDateStr === startDateStr) {
                      displayEndMinutes = 18 * 60; // 18:00
                    }
                    // 如果是中间日期或结束日期
                    else if (currentDateStr !== startDateStr && currentDateStr !== endDateStr) {
                      // 中间天：9:00-18:00
                      adjustedTop = (9 * 60 / 60) * hourHeight; // 9:00开始
                      displayStartMinutes = 9 * 60; // 9:00
                      displayEndMinutes = 18 * 60; // 18:00
                    } else if (currentDateStr === endDateStr) {
                      // 结束日期，开始时间设为9:00
                      adjustedTop = (9 * 60 / 60) * hourHeight; // 9:00开始
                      displayStartMinutes = 9 * 60; // 9:00
                    }
                  }
                }
                
                const height = Math.max(((displayEndMinutes - displayStartMinutes) / 60) * hourHeight, 20);
                
                // 计算宽度和偏移
                const width = 100 / maxTrack;
                const left = track * width;
                
                const taskTag = task.tagIds && task.tagIds.length > 0
                  ? tags.find(t => t.id === task.tagIds[0])
                  : null;
                const tagColor = taskTag ? taskTag.color : null;
                
                // 获取该日期应该显示的时间段
                const timeDisplay = getTaskTimeDisplay(task, currentDate);
                
                return (
                  <div
                    key={task.id}
                    className={`calendar-task time-block ${task.completed ? 'completed' : ''}`}
                    style={{
                      backgroundColor: tagColor && !task.completed ? tagColor + '20' : undefined,
                      color: tagColor && !task.completed ? tagColor : undefined,
                      borderLeftColor: tagColor && !task.completed ? tagColor : undefined,
                      top: `${adjustedTop}px`,
                      height: `${height}px`,
                      left: `${left}%`,
                      width: `${width}%`,
                      zIndex: track + 1
                    }}
                  >
                    <Icon name="circle" size={10} />
                    <span className="task-time">{timeDisplay}</span>
                    <span className="task-title">{task.title}</span>
                  </div>
                );
              });
            };

            return (
              <>
                <div className="calendar-day-hours">
                  {hours.map(hour => (
                    <div key={hour} className="calendar-hour-cell">
                      <div className="hour-label">{hour.toString().padStart(2, '0')}:00</div>
                      <div className="hour-tasks" />
                    </div>
                  ))}
                </div>
                <div className="calendar-day-tasks" style={{ position: 'absolute', top: 0, left: '60px', right: 0, bottom: 0 }}>
                  {renderTaskBlocks()}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    );
  };

  // 渲染时间线视图
  const renderTimelineView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayTasks = getTasksForDate(currentDate);
    const timelineHeight = 60;
    
    return (
      <div className="calendar-timeline">
        <div className="timeline-header">
          <span className="timeline-date">
            {currentDate.getMonth() + 1}月{currentDate.getDate()}日
          </span>
          <span className="timeline-week">{WEEK_DAYS[currentDate.getDay()]}</span>
        </div>
        <div className="timeline-body" style={{ height: hours.length * timelineHeight }}>
          <div className="timeline-scale">
            {hours.map(hour => (
              <div 
                key={hour} 
                className="timeline-hour"
                style={{ height: timelineHeight }}
              >
                <span className="hour-marker">{hour.toString().padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          
          <div 
            className="timeline-now"
            style={{ 
              top: (new Date().getHours() + new Date().getMinutes() / 60) * timelineHeight 
            }}
          >
            <span className="now-dot">●</span>
            <span className="now-line"></span>
          </div>
          
          <div className="timeline-tasks">
            {dayTasks.filter(t => t.dueDate).map(task => {
              const startDate = new Date(task.dueDate);
              const endDate = task.endDate ? new Date(task.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
              let startHour = startDate.getHours();
              let startMinute = startDate.getMinutes();
              let endHour = endDate.getHours();
              let endMinute = endDate.getMinutes();
              let top = (startHour + startMinute / 60) * timelineHeight;
              
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
                  top = (9 * 60 / 60) * timelineHeight; // 9:00开始
                  startHour = 9;
                  startMinute = 0;
                  endHour = 18;
                  endMinute = 0;
                } else if (currentDateStr === taskEndDateStr) {
                  // 结束日期，开始时间设为9:00
                  top = (9 * 60 / 60) * timelineHeight; // 9:00开始
                  startHour = 9;
                  startMinute = 0;
                }
              }
              
              const duration = (endHour + endMinute / 60) - (startHour + startMinute / 60);
              const height = Math.max(duration * timelineHeight, 24);
              
              // 获取该日期应该显示的时间段
              const timeDisplay = getTaskTimeDisplay(task, currentDate);
              
              return (
                <div
                  key={task.id}
                  className={`timeline-task ${task.completed ? 'completed' : ''}`}
                  style={{ top, height }}
                >
                  <span className="task-time">
                    {timeDisplay}
                  </span>
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
      case VIEW_TYPES.TIMELINE:
        return renderTimelineView();
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
          <button 
            className={`view-btn ${viewType === VIEW_TYPES.TIMELINE ? 'active' : ''}`}
            onClick={() => setViewType(VIEW_TYPES.TIMELINE)}
          >
            <Icon name="gantt-chart" size={14} />
            时间线
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
