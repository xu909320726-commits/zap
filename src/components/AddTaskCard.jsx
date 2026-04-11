import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { parseNaturalLanguage, formatDueDate } from '../utils/dateParser';
import TimeSelect from './TimeSelect';

/**
 * 添加任务卡片组件
 * 单一卡片设计，渐进式展开
 * 日期和时间合并选择
 */
const AddTaskCard = forwardRef(({ onSubmit, lists = [], tags = [] }, ref) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [dueDate, setDueDate] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const inputRef = useRef(null);
  const cardRef = useRef(null);
  const pickerRef = useRef(null);
  const linkInputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      inputRef.current?.focus();
    }
  }));

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.focusInput = () => {
        inputRef.current?.focus();
      };
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowDateTimePicker(false);
        setShowTagPicker(false);
      }
    };

    if (showDateTimePicker || showTagPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateTimePicker, showTagPicker]);

  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus();
    }
  }, [showLinkInput]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setText(value);

    if (value.trim()) {
      const result = parseNaturalLanguage(value);
      if (result.parsed && result.dueDate) {
        setDueDate(result.dueDate);
        if (result.endDate) {
          setEndTime(result.endDate);
        }
      }
    }
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleSubmitTask = () => {
    if (!text.trim()) return;

    const result = parseNaturalLanguage(text);
    const title = result.title || text.trim();
    const finalEndDate = result.endDate || endTime;

    if (onSubmit) {
      onSubmit({
        title,
        dueDate,
        endDate: finalEndDate,
        tagIds: selectedTags,
        linkUrl: linkUrl || null
      });
    }

    setText('');
    setDueDate(null);
    setEndTime(null);
    setIsExpanded(false);
    setShowDateTimePicker(false);
    setShowTagPicker(false);
    setShowLinkInput(false);
    setSelectedTags([]);
    setLinkUrl('');
    inputRef.current?.blur();
  };

  const handleLinkKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmitTask();
    }
    if (e.key === 'Escape') {
      setShowLinkInput(false);
      setLinkUrl('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitTask();
    }
    if (e.key === 'Escape') {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  const formatDisplay = () => {
    if (!dueDate) return '';
    const dateStr = formatDueDate(dueDate);
    const hours = dueDate.getHours().toString().padStart(2, '0');
    const minutes = dueDate.getMinutes().toString().padStart(2, '0');
    if (endTime) {
      const endHours = endTime.getHours().toString().padStart(2, '0');
      const endMinutes = endTime.getMinutes().toString().padStart(2, '0');
      return `${dateStr} ${hours}:${minutes} - ${endHours}:${endMinutes}`;
    }
    return `${dateStr} ${hours}:${minutes}`;
  };

  return (
    <div ref={cardRef} className={`add-task-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="add-task-input-row">
        <input
          ref={inputRef}
          type="text"
          className="add-task-input"
          placeholder="添加任务...（支持自然语言，如：明天下午3点到4点开会）"
          value={text}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
        />
        {isExpanded && (
          <button className="add-task-submit-btn" onClick={handleSubmitTask}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            添加
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="add-task-options">
          <div className="add-task-option-bar">
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className={`option-btn ${dueDate ? 'active' : ''}`}
                onClick={() => {
                  setShowDateTimePicker(!showDateTimePicker);
                  setShowTagPicker(false);
                  setShowLinkInput(false);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{dueDate ? formatDisplay() : '日期和时间'}</span>
              </button>
            </div>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className={`option-btn ${selectedTags.length > 0 ? 'active' : ''}`}
                onClick={() => {
                  setShowTagPicker(!showTagPicker);
                  setShowDateTimePicker(false);
                  setShowLinkInput(false);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                  <line x1="7" y1="7" x2="7.01" y2="7"></line>
                </svg>
                <span>
                  {selectedTags.length > 0 
                    ? `${selectedTags.length}个标签` 
                    : '标签'}
                </span>
              </button>
              {showTagPicker && (
                <div className="tag-picker-container" ref={pickerRef}>
                  {tags.length === 0 ? (
                    <div className="tag-picker-empty">暂无标签，请先在侧边栏创建标签</div>
                  ) : (
                    tags.map(tag => (
                      <button
                        key={tag.id}
                        className={`picker-item tag-picker-item ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag.id) 
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                      >
                        <span className="tag-color-dot" style={{ backgroundColor: tag.color }}></span>
                        <span>{tag.name}</span>
                        {selectedTags.includes(tag.id) && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="tag-check-icon">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className={`option-btn ${linkUrl ? 'active' : ''}`}
                onClick={() => {
                  setShowLinkInput(!showLinkInput);
                  setShowDateTimePicker(false);
                  setShowTagPicker(false);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>
                <span>{linkUrl ? '已添加链接' : '链接'}</span>
              </button>
              {showLinkInput && (
                <div className="link-input-popup" ref={pickerRef}>
                  <div className="link-input-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                  </div>
                  <div className="link-input-title">添加链接</div>
                  <input
                    ref={linkInputRef}
                    type="url"
                    className="link-input"
                    placeholder="https://example.com"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onKeyDown={handleLinkKeyDown}
                  />
                  <div className="link-input-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowLinkInput(false);
                        setLinkUrl('');
                      }}
                    >
                      取消
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setShowLinkInput(false);
                      }}
                    >
                      确定
                    </button>
                  </div>
                </div>
              )}
            </div>
            </div>

          {showDateTimePicker && (
            <div className="datetime-picker-container" ref={pickerRef}>
              <DateTimePicker
                value={dueDate}
                endValue={endTime}
                onChange={(date, end) => {
                  setDueDate(date);
                  setEndTime(end);
                }}
                onClose={() => setShowDateTimePicker(false)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * 日期时间选择器
 */
function DateTimePicker({ value, endValue, onChange, onClose }) {
  const [currentDate, setCurrentDate] = useState(value || new Date());
  const [viewMode, setViewMode] = useState('days');
  const [hours, setHours] = useState(value ? value.getHours() : null);
  const [minutes, setMinutes] = useState(value ? value.getMinutes() : null);
  const [endHours, setEndHours] = useState(endValue ? endValue.getHours() : (value ? value.getHours() + 1 : null));
  const [endMinutes, setEndMinutes] = useState(endValue ? endValue.getMinutes() : (value ? value.getMinutes() : null));

  // 当开始时间变化时，自动调整结束时间（保持+1小时）
  useEffect(() => {
    if (hours !== null && minutes !== null) {
      const newEndHours = hours + 1;
      if (newEndHours !== endHours) {
        setEndHours(newEndHours > 23 ? 0 : newEndHours);
      }
    }
  }, [hours, minutes]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startPadding = firstDay.getDay();

    const days = [];

    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i),
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  };

  const today = new Date();
  const days = getDaysInMonth(currentDate);
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleSelectDate = (date) => {
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    
    // 始终创建结束时间
    const newEndTime = new Date(date);
    newEndTime.setHours(endHours, endMinutes, 0, 0);
    
    onChange(newDate, newEndTime);
  };

  const handleMonthSelect = (monthIndex) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(monthIndex);
    setCurrentDate(newDate);
    setViewMode('days');
  };

  const handleYearSelect = (year) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
    setViewMode('months');
  };

  const handleTimeConfirm = () => {
    const newDate = new Date(value || new Date());
    newDate.setHours(hours, minutes, 0, 0);
    
    // 始终创建结束时间
    const newEndTime = new Date(value || new Date());
    newEndTime.setHours(endHours, endMinutes, 0, 0);
    
    onChange(newDate, newEndTime);
    onClose();
  };

  const getYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 3; i <= currentYear + 5; i++) {
      years.push(i);
    }
    return years;
  };

  const isToday = (date) => date.toDateString() === today.toDateString();
  const isSelected = (date) => value && date.toDateString() === value.toDateString();

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="datetime-picker">
      {/* 日期选择区域 */}
      <div className="datetime-date-section">
        <div className="datetime-header">
          <button className="datetime-nav-btn" onClick={handlePrevMonth}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div className="datetime-title">
            {viewMode === 'days' && (
              <span onClick={() => setViewMode('months')}>
                {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
              </span>
            )}
            {viewMode === 'months' && (
              <span onClick={() => setViewMode('years')}>
                {currentDate.getFullYear()}
              </span>
            )}
            {viewMode === 'years' && '选择年份'}
          </div>
          
          <button className="datetime-nav-btn" onClick={handleNextMonth}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>

        {viewMode === 'days' && (
          <>
            <div className="datetime-weekdays">
              {weekDays.map((day, i) => (
                <div key={i} className={`datetime-weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}>
                  {day}
                </div>
              ))}
            </div>
            <div className="datetime-days">
              {days.map((dayData, index) => (
                <button
                  key={index}
                  className={`datetime-day ${!dayData.isCurrentMonth ? 'other-month' : ''} ${isToday(dayData.date) ? 'today' : ''} ${isSelected(dayData.date) ? 'selected' : ''}`}
                  onClick={() => handleSelectDate(dayData.date)}
                >
                  {dayData.date.getDate()}
                </button>
              ))}
            </div>
          </>
        )}

        {viewMode === 'months' && (
          <div className="datetime-months">
            {monthNames.map((month, index) => (
              <button
                key={index}
                className={`datetime-month ${index === currentDate.getMonth() ? 'selected' : ''}`}
                onClick={() => handleMonthSelect(index)}
              >
                {month}
              </button>
            ))}
          </div>
        )}

        {viewMode === 'years' && (
          <div className="datetime-years">
            {getYears().map((year) => (
              <button
                key={year}
                className={`datetime-year ${year === currentDate.getFullYear() ? 'selected' : ''}`}
                onClick={() => handleYearSelect(year)}
              >
                {year}
              </button>
            ))}
          </div>
        )}

        <div className="datetime-shortcuts">
          <button className="datetime-shortcut" onClick={() => {
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            const e = new Date();
            e.setHours(endHours, endMinutes, 0, 0);
            onChange(d, e);
          }}>今天</button>
          <button className="datetime-shortcut" onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            d.setHours(hours, minutes, 0, 0);
            const e = new Date();
            e.setDate(e.getDate() + 1);
            e.setHours(endHours, endMinutes, 0, 0);
            onChange(d, e);
          }}>明天</button>
          <button className="datetime-shortcut" onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 7);
            d.setHours(hours, minutes, 0, 0);
            const e = new Date();
            e.setDate(e.getDate() + 7);
            e.setHours(endHours, endMinutes, 0, 0);
            onChange(d, e);
          }}>一周后</button>
        </div>
      </div>

      {/* 时间选择区域 */}
      <div className="datetime-time-section">
        <div className="time-section-title">时间</div>
        
        <div className="time-input-row">
          <div className="time-input-group">
            <label>开始</label>
            <div className="time-inputs-custom">
              <TimeSelect
                value={hours}
                onChange={(val) => setHours(val)}
                options={hourOptions}
                placeholder="时"
              />
              <TimeSelect
                value={minutes}
                onChange={(val) => setMinutes(val)}
                options={minuteOptions}
                placeholder="分"
              />
            </div>
          </div>
        </div>

        <div className="time-input-row">
          <div className="time-input-group">
            <label>结束</label>
            <div className="time-inputs-custom">
              <TimeSelect
                value={endHours}
                onChange={(val) => setEndHours(val)}
                options={hourOptions}
                placeholder="时"
              />
              <TimeSelect
                value={endMinutes}
                onChange={(val) => setEndMinutes(val)}
                options={minuteOptions}
                placeholder="分"
              />
            </div>
          </div>
        </div>

        <div className="time-actions">
          <button className="time-cancel-btn" onClick={onClose}>取消</button>
          <button className="time-confirm-btn" onClick={handleTimeConfirm}>确定</button>
        </div>
      </div>
    </div>
  );
}

// 导出日期时间选择器组件供其他地方使用
export { DateTimePicker };

export default AddTaskCard;
