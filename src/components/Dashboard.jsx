import React, { useMemo } from 'react';
import Icon from './Icon';

function Dashboard({ tasks, onNavigate, onTaskClick }) {
  const now = new Date();
  
  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 6) return '夜深了';
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    if (hour < 22) return '晚上好';
    return '夜深了';
  };

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allTasks = tasks || [];
    const todoTasks = allTasks.filter(t => !t.completed);
    const doneTasks = allTasks.filter(t => t.completed);
    
    const todayTodoTasks = todoTasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    });

    const todayDoneTasks = doneTasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime();
    });

    const overdueTasks = todoTasks.filter(t => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() < today.getTime();
    });

    const totalTasks = allTasks.length;
    const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

    return {
      todo: todoTasks.length,
      done: doneTasks.length,
      todayTodo: todayTodoTasks.length,
      todayDone: todayDoneTasks.length,
      overdue: overdueTasks.length,
      total: totalTasks,
      completionRate
    };
  }, [tasks]);

  const recentTasks = useMemo(() => {
    if (!tasks) return [];
    return [...tasks]
      .filter(t => !t.completed)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [tasks]);

  const weekTrend = useMemo(() => {
    if (!tasks) return Array(7).fill({ day: '', count: 0, isFuture: true });
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayOfWeek = today.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);

    const result = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const count = tasks.filter(t => {
        if (!t.completed || !t.completedAt) return false;
        const completed = new Date(t.completedAt);
        return completed >= date && completed < nextDate;
      }).length;

      result.push({
        day: days[i],
        count,
        isToday: date.getTime() === today.getTime(),
        isFuture: date.getTime() > today.getTime()
      });
    }

    return result;
  }, [tasks]);

  const maxTrendCount = Math.max(...weekTrend.filter(d => !d.isFuture).map(d => d.count), 1);

  const formatDueDate = (dueDate) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) return '今天';
    if (dateOnly.getTime() === tomorrow.getTime()) return '明天';
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;
    const due = new Date(task.dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  };

  return (
    <div className="dashboard-v2">
      <div className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-greeting">{getGreeting()}</h1>
            <p className="hero-date">
              {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 · 
              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]}
            </p>
          </div>
          <div className="hero-progress">
            <div className="progress-ring">
              <svg viewBox="0 0 100 100">
                <circle className="progress-bg" cx="50" cy="50" r="45" />
                <circle 
                  className="progress-value" 
                  cx="50" cy="50" r="45" 
                  strokeDasharray={`${stats.completionRate * 2.83} 283`}
                />
              </svg>
              <div className="progress-text">
                <span className="progress-number">{stats.completionRate}</span>
                <span className="progress-unit">%</span>
              </div>
            </div>
            <span className="progress-label">完成率</span>
          </div>
        </div>
      </div>

      <div className="dashboard-body">
        <div className="stats-row">
          <div className="stat-mini-card" onClick={() => onNavigate('todo')}>
            <div className="stat-mini-icon" style={{ background: 'rgba(13, 124, 102, 0.1)', color: '#0D7C66' }}>
              <Icon name="circle" size={20} />
            </div>
            <div className="stat-mini-info">
              <span className="stat-mini-value">{stats.todo}</span>
              <span className="stat-mini-label">待办</span>
            </div>
          </div>
          
          <div className="stat-mini-card" onClick={() => onNavigate('done')}>
            <div className="stat-mini-icon" style={{ background: 'rgba(0, 200, 81, 0.1)', color: '#00C851' }}>
              <Icon name="check-circle" size={20} />
            </div>
            <div className="stat-mini-info">
              <span className="stat-mini-value">{stats.done}</span>
              <span className="stat-mini-label">已完成</span>
            </div>
          </div>
          
          <div className="stat-mini-card" onClick={() => onNavigate('calendar')}>
            <div className="stat-mini-icon" style={{ background: 'rgba(255, 215, 0, 0.1)', color: '#FFD700' }}>
              <Icon name="calendar" size={20} />
            </div>
            <div className="stat-mini-info">
              <span className="stat-mini-value">{stats.todayTodo}</span>
              <span className="stat-mini-label">今日待办</span>
            </div>
          </div>
          
          <div className={`stat-mini-card ${stats.overdue > 0 ? 'has-warning' : ''}`} onClick={() => onNavigate('todo')}>
            <div className="stat-mini-icon" style={{ background: stats.overdue > 0 ? 'rgba(255, 77, 77, 0.1)' : 'rgba(255, 77, 77, 0.05)', color: '#FF4D4D' }}>
              <Icon name="alert-triangle" size={20} />
            </div>
            <div className="stat-mini-info">
              <span className="stat-mini-value">{stats.overdue}</span>
              <span className="stat-mini-label">逾期</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card recent">
            <div className="card-header">
              <h3>
                <Icon name="clock" size={18} />
                最近待办
              </h3>
              <button className="card-link" onClick={() => onNavigate('todo')}>
                查看全部
                <Icon name="chevron-right" size={14} />
              </button>
            </div>
            <div className="card-body">
              {recentTasks.length === 0 ? (
                <div className="card-empty">
                  <Icon name="check-circle" size={32} />
                  <p>所有任务都已完成</p>
                </div>
              ) : (
                <div className="task-list-simple">
                  {recentTasks.map(task => (
                    <div
                      key={task.id}
                      className={`task-simple-item ${isOverdue(task) ? 'overdue' : ''}`}
                      onClick={() => onTaskClick(task)}
                    >
                      <div className="task-simple-check" />
                      <div className="task-simple-content">
                        <span className="task-simple-title">{task.title}</span>
                        {task.dueDate && (
                          <span className={`task-simple-date ${isOverdue(task) ? 'overdue' : ''}`}>
                            {formatDueDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                      {isOverdue(task) && <span className="overdue-tag">逾期</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card trend">
            <div className="card-header">
              <h3>
                <Icon name="trending-up" size={18} />
                本周完成
              </h3>
            </div>
            <div className="card-body">
              <div className="trend-chart">
                {weekTrend.map((day, index) => (
                  <div key={index} className="trend-item">
                    <div className="trend-bar-container">
                      <div 
                        className={`trend-bar ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`}
                        style={{ height: day.isFuture ? '4px' : `${Math.max((day.count / maxTrendCount) * 100, 8)}%` }}
                      />
                    </div>
                    <span className={`trend-label ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}`}>
                      {day.isToday ? '今' : day.day}
                    </span>
                  </div>
                ))}
              </div>
              <div className="trend-summary">
                <span>本周已完成 <strong>{weekTrend.filter(d => !d.isFuture).reduce((sum, d) => sum + d.count, 0)}</strong> 个任务</span>
              </div>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <button className="action-btn primary" onClick={() => onNavigate('todo')}>
            <Icon name="plus-circle" size={20} />
            <span>添加任务</span>
          </button>
          <button className="action-btn" onClick={() => onNavigate('calendar')}>
            <Icon name="calendar" size={20} />
            <span>日历视图</span>
          </button>
          <button className="action-btn" onClick={() => onNavigate('tags')}>
            <Icon name="tag" size={20} />
            <span>标签管理</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;