import React from 'react';
import Icon from './Icon';

function ConfirmModal({ isOpen, title, message, confirmText = '确定', cancelText = '取消', onConfirm, onCancel, danger = false }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-modal" onClick={e => e.stopPropagation()}>
        <div className="confirm-modal-header">
          <div className={`confirm-modal-icon ${danger ? 'danger' : ''}`}>
            <Icon name={danger ? 'alert-triangle' : 'help-circle'} size={24} />
          </div>
          <h3 className="confirm-modal-title">{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button 
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;