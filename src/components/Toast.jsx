import React, { useEffect, useState, useRef } from 'react';
import Icon from './Icon';

function Toast({ message, type = 'success', isVisible, onClose, duration = 3000 }) {
  const [isShowing, setIsShowing] = useState(false);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isVisible && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      setIsShowing(true);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && startTimeRef.current && !timerRef.current) {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(duration - elapsed, 0);

      if (remaining > 0) {
        timerRef.current = setTimeout(() => {
          setIsShowing(false);
          setTimeout(() => onClose(), 300);
        }, remaining);
      } else {
        setIsShowing(false);
        setTimeout(() => onClose(), 300);
      }

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
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
