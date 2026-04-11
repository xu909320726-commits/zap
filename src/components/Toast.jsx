import React, { useEffect, useState } from 'react';
import Icon from './Icon';

function Toast({ message, type = 'success', isVisible, onClose, duration = 3000 }) {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      const timer = setTimeout(() => {
        setIsShowing(false);
        setTimeout(() => onClose(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isShowing) return null;

  const icons = {
    success: 'check-circle',
    error: 'alert-circle',
    warning: 'alert-triangle',
    info: 'info'
  };

  return (
    <div className={`toast toast-${type} ${isShowing ? 'toast-show' : 'toast-hide'}`}>
      <Icon name={icons[type] || 'check-circle'} size={18} />
      <span>{message}</span>
    </div>
  );
}

export function ToastContainer({ toasts, removeToast }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => removeToast(toast.id)}
          duration={toast.duration || 3000}
        />
      ))}
    </div>
  );
}

export default Toast;
