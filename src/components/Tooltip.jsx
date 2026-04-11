import React, { useState, useRef, useEffect } from 'react';

function Tooltip({ children, content, delay = 200 }) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <span
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}
    >
      {children}
      {isVisible && content && (
        <span ref={tooltipRef} className="custom-tooltip">
          <span className="tooltip-content">{content}</span>
          <span className="tooltip-arrow"></span>
        </span>
      )}
    </span>
  );
}

export default Tooltip;