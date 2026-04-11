import React, { useState, useRef, useEffect } from 'react';

/**
 * 自定义时间选择下拉组件
 */
function TimeSelect({ value, onChange, options, placeholder, onKeyDown }) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const listRef = useRef(null);

  const displayValue = value !== null && value !== undefined 
    ? value.toString().padStart(2, '0') 
    : placeholder || '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.time-option-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        const currentIndex = options.findIndex(opt => opt === value);
        setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const newIndex = prev <= 0 ? options.length - 1 : prev - 1;
          return newIndex;
        });
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => {
          const newIndex = prev >= options.length - 1 ? 0 : prev + 1;
          return newIndex;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
      default:
        break;
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const currentIndex = options.findIndex(opt => opt === value);

  return (
    <div className="time-select-custom" ref={wrapperRef}>
      <button
        type="button"
        className={`time-select-trigger ${isOpen ? 'open' : ''} ${value === null ? 'placeholder' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="time-select-value">{displayValue}</span>
        <span className="time-select-arrow">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      
      {isOpen && (
        <div className="time-select-dropdown" role="listbox">
          <div className="time-select-options" ref={listRef}>
            {options.map((option, index) => (
              <div
                key={option}
                className={`time-option-item ${option === value ? 'selected' : ''} ${index === highlightedIndex ? 'highlighted' : ''}`}
                role="option"
                aria-selected={option === value}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {option.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TimeSelect;