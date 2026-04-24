import React, { useEffect, useRef } from 'react';

/**
 * Flatpickr 日期选择器组件
 * 使用极简配置，支持 altInput 显示友好格式
 */
function DateTimePicker({ value, onChange, placeholder, showTime = false }) {
  const inputRef = useRef(null);
  const flatpickrRef = useRef(null);

  useEffect(() => {
    if (window.Flatpickr && inputRef.current && !flatpickrRef.current) {
      const altFormat = showTime ? 'F j, Y H:i' : 'F j, Y';
      
      const config = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: altFormat,
        disableMobile: true,
        allowInput: true,
        enableTime: showTime,
        time_24hr: true,
        defaultDate: value || null,
        locale: 'zh',
        inline: false,
        onChange: (selectedDates, dateStr) => {
          if (onChange && selectedDates.length > 0) {
            onChange(selectedDates[0], dateStr);
          }
        }
      };

      flatpickrRef.current = new window.Flatpickr(inputRef.current, config);

      return () => {
        if (flatpickrRef.current) {
          flatpickrRef.current.destroy();
          flatpickrRef.current = null;
        }
      };
    }
  }, [showTime]);

  // 更新值
  useEffect(() => {
    if (flatpickrRef.current) {
      if (value) {
        const newDate = value instanceof Date ? value : new Date(value);
        const currentDate = flatpickrRef.current.selectedDates[0];
        
        if (!currentDate || currentDate.getTime() !== newDate.getTime()) {
          flatpickrRef.current.setDate(value);
        }
      } else {
        flatpickrRef.current.clear();
      }
    }
  }, [value]);

  return (
    <input
      ref={inputRef}
      type="text"
      id={placeholder === '选择日期' ? 'due-date' : undefined}
      className="flatpickr-input"
      placeholder={placeholder}
    />
  );
}

export default DateTimePicker;
