import React, { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { parseNaturalLanguage } from '../utils/dateParser';
import { formatDateTimeLocal, formatTimeForInput } from '../utils/appHelpers';
import { TAG_COLORS } from '../constants';

function TaskModal({
  isOpen,
  task,
  tags,
  onClose,
  onSave
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [tagIds, setTagIds] = useState([]);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setDueDate(task.dueDate ? formatDateTimeLocal(new Date(task.dueDate)) : '');
      setDueTime(task.dueDate ? formatTimeForInput(new Date(task.dueDate)) : '');
      setTagIds(task.tagIds || []);
      setIsPinned(task.isPinned || false);
    } else if (isOpen) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');
      setTagIds([]);
      setIsPinned(false);
    }
  }, [isOpen, task]);

  const handleTitleChange = useCallback((e) => {
    const value = e.target.value;
    setTitle(value);
    
    const parsed = parseNaturalLanguage(value);
    if (parsed.dueDate) {
      setDueDate(formatDateTimeLocal(parsed.dueDate));
      setDueTime(formatTimeForInput(parsed.dueDate));
    }
  }, []);

  const handleTagToggle = useCallback((tagId) => {
    setTagIds(prev => {
      if (prev.includes(tagId)) {
        return prev.filter(id => id !== tagId);
      } else {
        return [...prev, tagId];
      }
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      dueDate: dueDate ? new Date(`${dueDate}T${dueTime || '00:00'}`).toISOString() : null,
      tagIds,
      isPinned
    };

    onSave(taskData);
    onClose();
  }, [title, description, dueDate, dueTime, tagIds, isPinned, onSave, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="modal-content task-modal">
        <div className="modal-header">
          <h2>{task ? '编辑任务' : '新建任务'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="任务标题..."
              className="task-title-input"
              autoFocus
            />
          </div>

          <div className="form-group">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="任务描述..."
              className="task-description-input"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>截止日期</label>
            <div className="date-time-inputs">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="date-input"
              />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="time-input"
              />
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="form-group">
              <label>标签</label>
              <div className="tags-selector">
                {tags.map(tag => (
                  <div
                    key={tag.id}
                    className={`tag-option ${tagIds.includes(tag.id) ? 'selected' : ''}`}
                    onClick={() => handleTagToggle(tag.id)}
                    style={{ borderColor: tag.color || TAG_COLORS[0] }}
                  >
                    <div 
                      className="tag-color"
                      style={{ backgroundColor: tag.color || TAG_COLORS[0] }}
                    />
                    <span>{tag.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group checkbox-group">
            <input
              type="checkbox"
              id="pin-task"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
            />
            <label htmlFor="pin-task">固定到顶部</label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            取消
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={!title.trim()}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;