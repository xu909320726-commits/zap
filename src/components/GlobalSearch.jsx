import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Icon from './Icon';

/**
 * 全局搜索组件 - 分类显示搜索结果
 */
function GlobalSearch({ isOpen, onClose, tasks, lists, tags, deletedTasks = [], onSelectTask }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // 自动聚焦
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // 按分类分组搜索结果
  const groupedResults = useMemo(() => {
    if (!query.trim()) {
      return { todo: [], done: [], calendar: [], tags: [], trash: [] };
    }

    const searchQuery = query.toLowerCase().trim();
    
    // 搜索任务（区分待办和已办）
    const matchedTasks = tasks.map(task => {
      const titleMatch = task.title.toLowerCase().includes(searchQuery);
      const taskTags = (task.tagIds || []).map(tagId => tags.find(t => t.id === tagId)).filter(Boolean);
      const tagMatch = taskTags.some(tag => tag.name.toLowerCase().includes(searchQuery));
      const list = lists.find(l => l.id === task.listId);
      const listMatch = list && list.name.toLowerCase().includes(searchQuery);
      
      return {
        ...task,
        titleMatch,
        tagMatch,
        listMatch,
        listName: list?.name || '默认清单',
        taskTags
      };
    });

    // 按分类分组
    const todoTasks = matchedTasks
      .filter(t => !t.completed && (t.titleMatch || t.tagMatch || t.listMatch))
      .slice(0, 5)
      .map(t => ({ ...t, type: 'todo' }));

    const doneTasks = matchedTasks
      .filter(t => t.completed && (t.titleMatch || t.tagMatch || t.listMatch))
      .slice(0, 5)
      .map(t => ({ ...t, type: 'done' }));

    // 搜索日历（有截止日期的任务）
    const calendarTasks = matchedTasks
      .filter(t => t.dueDate && (t.titleMatch || t.tagMatch))
      .slice(0, 5)
      .map(t => ({ ...t, type: 'calendar' }));

    // 搜索标签
    const matchedTags = tags
      .filter(tag => tag.name.toLowerCase().includes(searchQuery))
      .slice(0, 5)
      .map(tag => ({ 
        ...tag, 
        type: 'tag',
        titleMatch: true,
        taskCount: tasks.filter(t => t.tagIds?.includes(tag.id)).length
      }));

    // 搜索垃圾箱
    const matchedDeletedTasks = deletedTasks
      .filter(task => task.title.toLowerCase().includes(searchQuery))
      .slice(0, 5)
      .map(t => ({ ...t, type: 'trash' }));

    return {
      todo: todoTasks,
      done: doneTasks,
      calendar: calendarTasks,
      tags: matchedTags,
      trash: matchedDeletedTasks
    };
  }, [query, tasks, lists, tags, deletedTasks]);

  // 扁平化所有结果用于键盘导航
  const flatResults = useMemo(() => {
    const { todo, done, calendar, tags, trash } = groupedResults;
    return [
      ...todo.map(item => ({ ...item, category: 'todo', categoryName: '待办事项' })),
      ...done.map(item => ({ ...item, category: 'done', categoryName: '已办事项' })),
      ...calendar.map(item => ({ ...item, category: 'calendar', categoryName: '日历' })),
      ...tags.map(item => ({ ...item, category: 'tags', categoryName: '标签' })),
      ...trash.map(item => ({ ...item, category: 'trash', categoryName: '垃圾箱' }))
    ];
  }, [groupedResults]);

  const hasResults = flatResults.length > 0;

  // 键盘导航
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, flatResults.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
      default:
        break;
    }
  }, [isOpen, flatResults, selectedIndex, onClose]);

  // 滚动到选中项
  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const selectedEl = resultsRef.current.querySelector('.search-result-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatResults]);

  // 全局键盘事件
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 选择结果
  const handleSelect = (item) => {
    if (item.type === 'tag') {
      // 标签类型 - 跳转到标签视图
      onSelectTask({ listId: 'tags', tagId: item.id, type: 'tag' });
    } else if (item.type === 'calendar') {
      // 日历类型 - 跳转到日历视图
      onSelectTask({ listId: 'calendar', task: item, type: 'calendar' });
    } else if (item.type === 'done') {
      // 已办类型 - 跳转到已办视图
      onSelectTask({ listId: 'done', task: item, type: 'done' });
    } else if (item.type === 'trash') {
      // 垃圾箱类型 - 跳转到垃圾箱视图
      onSelectTask({ listId: 'trash', task: item, type: 'trash' });
    } else {
      // 待办类型 - 跳转到待办视图（不管任务属于哪个清单）
      onSelectTask({ listId: 'todo', task: item, type: 'todo' });
    }
  };

  // 关键词高亮
  const highlightMatch = (text) => {
    if (!query.trim() || !text) return text || '';
    const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.trim().toLowerCase() 
        ? <mark key={i} style={{ background: '#fef3c7', color: '#92400e', borderRadius: '2px' }}>{part}</mark>
        : part
    );
  };

  // 获取分类图标
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'todo': return 'circle';
      case 'done': return 'check-circle';
      case 'calendar': return 'calendar';
      case 'tags': return 'tag';
      case 'trash': return 'trash-2';
      default: return 'circle';
    }
  };

  // 渲染单个分类的结果
  const renderCategory = (category, categoryName, items) => {
    if (items.length === 0) return null;
    
    return (
      <div className="search-category" key={category}>
        <div className="search-category-header">
          <Icon name={getCategoryIcon(category)} size={14} />
          <span>{categoryName}</span>
          <span className="category-count">({items.length})</span>
        </div>
        <div className="search-category-items">
          {items.map((item, idx) => {
            const globalIndex = flatResults.findIndex(r => r.id === item.id && r.type === item.type);
            const isSelected = globalIndex === selectedIndex;
            
            if (item.type === 'tag') {
              return (
                <div
                  key={item.id}
                  className={`search-result-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                >
                  <div className="result-main">
                    <Icon name="tag" size={16} className="result-icon" />
                    <div className="result-content">
                      <span className="result-title">{highlightMatch(item.name)}</span>
                      <div className="result-meta">
                        <span className="result-list">{item.taskCount} 个任务</span>
                      </div>
                    </div>
                  </div>
                  <Icon name="chevron-right" size={16} className="result-arrow" />
                </div>
              );
            }
            
            return (
              <div
                key={item.id}
                className={`search-result-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(globalIndex)}
              >
                <div className="result-main">
                  <Icon name={item.completed ? 'check-circle' : 'circle'} size={16} className="result-icon" />
                  <div className="result-content">
                    <span className="result-title">{highlightMatch(item.title)}</span>
                    <div className="result-meta">
                      <span className="result-list">{highlightMatch(item.listName)}</span>
                      {item.taskTags && item.taskTags.length > 0 && (
                        <div className="result-tags">
                          {item.taskTags.map(tag => (
                            <span
                              key={tag.id}
                              className="result-tag"
                              style={{ backgroundColor: tag.color + '20', color: tag.color }}
                            >
                              {highlightMatch(tag.name)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {item.completed && (
                    <Icon name="check-circle" size={16} className="result-completed" />
                  )}
                </div>
                <Icon name="chevron-right" size={16} className="result-arrow" />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="global-search-overlay" onClick={onClose}>
      <div className="global-search-modal" onClick={e => e.stopPropagation()}>
        <div className="global-search-header">
          <Icon name="search" size={20} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="global-search-input"
            placeholder="搜索任务、标签、垃圾箱..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="search-hint">ESC 关闭</span>
        </div>
        
        <div className="global-search-results" ref={resultsRef}>
          {query.trim() === '' ? (
            <div className="search-empty">
              <Icon name="search" size={48} className="empty-icon" />
              <p>输入关键词开始搜索</p>
              <p className="search-tips">支持搜索任务标题、标签、所属清单</p>
            </div>
          ) : !hasResults ? (
            <div className="search-empty">
              <Icon name="file-x" size={48} className="empty-icon" />
              <p>未找到相关内容</p>
              <p className="search-tips">尝试其他关键词</p>
            </div>
          ) : (
            <>
              {renderCategory('todo', '待办事项', groupedResults.todo)}
              {renderCategory('done', '已办事项', groupedResults.done)}
              {renderCategory('calendar', '日历', groupedResults.calendar)}
              {renderCategory('tags', '标签', groupedResults.tags)}
              {renderCategory('trash', '垃圾箱', groupedResults.trash)}
            </>
          )}
        </div>
        
        <div className="global-search-footer">
          <div className="footer-hint">
            <kbd>↑</kbd><kbd>↓</kbd> 导航
          </div>
          <div className="footer-hint">
            <kbd>Enter</kbd> 选中
          </div>
          <div className="footer-hint">
            <kbd>ESC</kbd> 关闭
          </div>
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;