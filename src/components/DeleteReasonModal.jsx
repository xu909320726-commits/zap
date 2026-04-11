import React, { useState, useEffect } from 'react';
import Icon from './Icon';

function DeleteReasonModal({ isOpen, taskTitle, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen && !isClosing) return null;

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError('请填写删除理由');
      return;
    }
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onConfirm(reason.trim());
      setReason('');
      setError('');
    }, 200);
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`} onClick={handleClose}>
      <div className={`delete-reason-modal ${isClosing ? 'modal-content-closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="delete-reason-modal-header">
          <div className="delete-reason-icon">
            <Icon name="trash-2" size={20} />
          </div>
          <h3>删除任务</h3>
          <button className="delete-reason-modal-close-btn" onClick={handleClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="delete-reason-modal-body">
          <p className="delete-reason-task-title">任务：{taskTitle}</p>
          <div className="delete-reason-form-group">
            <label>删除理由 <span className="required">*</span></label>
            <textarea
              className={`delete-reason-input ${error ? 'error' : ''}`}
              placeholder="请输入删除理由"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
            {error && <span className="delete-reason-error">{error}</span>}
          </div>
        </div>
        <div className="delete-reason-modal-actions">
          <button className="btn btn-secondary" onClick={handleClose}>
            取消
          </button>
          <button className="btn btn-danger" onClick={handleSubmit}>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteReasonModal;
