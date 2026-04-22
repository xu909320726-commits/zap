import React, { useState, useCallback } from 'react';
import Icon from './Icon';
import Tooltip from './Tooltip';
import { formatDueDate } from '../utils/dateParser';
import { isOverdue, isToday, formatDueDateWithRange } from '../utils/appHelpers';
import { TAG_COLORS } from '../constants';

function TaskList({
  tasks,
  tags,
  activeListId,
  copyingTaskId,
  onToggleComplete,
  onDelete,
  onUpdate,
  onHighlight,
  onEdit,
  onCopy,
  onOpenNote,
  onOpenHistory,
  onSetNoteModal,
  onSetModificationHistoryModal
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const handleEditStart = useCallback((task) => {
    setEditingId(task.id);
    setEditingTitle(task.title);
  }, []);

  const handleEditSave = useCallback((taskId) => {
    if (editingTitle.trim()) {
      onUpdate(taskId, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingTitle, onUpdate]);

  const handleEditCancel = useCallback(() => {
    setEditingId(null);
    setEditingTitle('');
  }, []);

  const handleKeyDown = useCallback((e, taskId) => {
    if (e.key === 'Enter') {
      handleEditSave(taskId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  }, [handleEditSave, handleEditCancel]);

  const getTagById = useCallback((tagId) => {
    return tags.find(t => t.id === tagId);
  }, [tags]);

  return (
    <div className={`tasks-container ${activeListId === 'done' ? 'with-margin-top' : ''}`}>
      {tasks.map(task => (
        <div
          key={task.id}
          onMouseEnter={() => onHighlight?.(task.id, null)}
          onMouseLeave={() => onHighlight?.(null, null)}
          className={`task-item ${task.completed ? 'completed' : ''} ${isOverdue(task) ? 'overdue' : ''} ${isToday(task) ? 'today' : ''}`}
        >
          <div 
            className={`task-checkbox ${task.completed ? 'checked' : ''}`}
            onClick={() => onToggleComplete(task.id)}
          />

          <div className="task-content">
            {editingId === task.id ? (
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => handleEditSave(task.id)}
                onKeyDown={(e) => handleKeyDown(e, task.id)}
                autoFocus
                className="task-edit-input"
              />
            ) : (
              <>
                <div 
                  className="task-title"
                  onDoubleClick={() => handleEditStart(task)}
                  onClick={() => {
                    if (task.linkUrl) {
                      navigator.clipboard.writeText(task.linkUrl).then(() => {
                        // 显示toast提示
                        if (window.showToast) {
                          window.showToast('链接已复制', 'success');
                        }
                      }).catch(err => {
                        console.error('复制链接失败:', err);
                      });
                    }
                  }}
                >
                  {task.title}
                </div>

                {(task.dueDate || (task.tagIds && task.tagIds.length > 0) || task.linkUrl || task.note) && (
                  <div className="task-meta">
                    {task.dueDate && (
                      <span className={`task-due-date ${isOverdue(task) ? 'overdue' : ''} ${isToday(task) ? 'today' : ''} ${!isOverdue(task) && !isToday(task) ? 'future' : ''}`}>
                        <Icon name="calendar" size={12} />
                        {formatDueDateWithRange(new Date(task.dueDate), task.endDate ? new Date(task.endDate) : null)}
                      </span>
                    )}
                    {task.linkUrl && (
                      <button 
                        className="task-link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.electronAPI && window.electronAPI.openExternal) {
                            window.electronAPI.openExternal(task.linkUrl);
                          } else {
                            window.open(task.linkUrl, '_blank');
                          }
                        }}
                        title={task.linkUrl}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        链接
                      </button>
                    )}
                    {task.tagIds && task.tagIds.length > 0 && (
                      <>
                        {tags.filter(t => task.tagIds.includes(t.id)).map(tag => (
                          <span key={tag.id} className="task-tag" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                      </>
                    )}
                    {task.note && (
                      <Tooltip content={task.note}>
                        <span className="task-note-indicator">
                          <Icon name="file-text" size={12} />
                          备注
                        </span>
                      </Tooltip>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="task-actions">
            <button 
              className={`task-action-btn copy ${copyingTaskId === task.id ? 'loading' : ''}`}
              onClick={async (e) => {
                e.stopPropagation();
                if (copyingTaskId) return;
                await onCopy(task.id);
              }}
              title="复制任务"
              disabled={copyingTaskId === task.id}
            >
              {copyingTaskId === task.id ? <Icon name="loader" /> : <Icon name="copy" />}
            </button>
            {!task.completed && activeListId === 'todo' && (
              <button 
                className="task-action-btn edit"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task.id);
                }}
                title="编辑"
              >
                <Icon name="pencil" />
              </button>
            )}
            <button 
              className="task-action-btn note"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNote(task.id, task.note || '');
              }}
              title="备注"
            >
              <Icon name="file-text" />
            </button>
            <button 
              className="task-action-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id, task.title);
              }}
              title="删除"
            >
              <Icon name="trash-2" />
            </button>
            {task.modifications && task.modifications.length > 0 && (
              <button 
                className="task-action-btn history"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenHistory(task.id, task.title, task.modifications);
                }}
                title="修改记录"
              >
                <Icon name="history" />
              </button>
            )}
          </div>
        </div>
      ))}

      {tasks.length === 0 && (
        <div className="empty-state">
          <Icon name="check-circle" size={48} />
          <p>暂无任务</p>
          <p className="empty-state-hint">点击上方添加新任务</p>
        </div>
      )}
    </div>
  );
}

export default TaskList;