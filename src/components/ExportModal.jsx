import React, { useState, useEffect } from 'react';
import Icon from './Icon';

function ExportModal({ isOpen, onExport, onCancel }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeQuickFilter, setActiveQuickFilter] = useState('');

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDateForInput(firstDayOfMonth));
      setEndDate(formatDateForInput(today));
      setError('');
      setIsExporting(false);
      setIsClosing(false);
      setActiveQuickFilter('本月');
    }
  }, [isOpen]);

  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const getTodayRange = () => {
    const today = new Date();
    return {
      start: formatDateForInput(today),
      end: formatDateForInput(today)
    };
  };

  const getWeekRange = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - dayOfWeek));
    return {
      start: formatDateForInput(startOfWeek),
      end: formatDateForInput(endOfWeek)
    };
  };

  const getMonthRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: formatDateForInput(startOfMonth),
      end: formatDateForInput(today)
    };
  };

  const handleQuickFilter = (filterType) => {
    let range;
    switch (filterType) {
      case '今日':
        range = getTodayRange();
        break;
      case '本周':
        range = getWeekRange();
        break;
      case '本月':
        range = getMonthRange();
        break;
      default:
        return;
    }
    setStartDate(range.start);
    setEndDate(range.end);
    setActiveQuickFilter(filterType);
    setError('');
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  const validateDates = () => {
    if (!startDate || !endDate) {
      setError('请选择开始日期和结束日期');
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      setError('开始日期不能晚于结束日期');
      return false;
    }

    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (diffDays > 30) {
      setError('导出区间不能超过30天，请缩小范围');
      return false;
    }

    setError('');
    return true;
  };

  const handleExport = async () => {
    if (!validateDates()) return;

    setIsExporting(true);
    try {
      await onExport({ startDate, endDate });
      handleClose();
    } catch (err) {
      setError('导出失败，请重试');
      setIsExporting(false);
    }
  };

  const handleDateChange = (type, value) => {
    if (type === 'start') {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
    setActiveQuickFilter('');
    setError('');
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`} onClick={handleClose}>
      <div className={`export-modal ${isClosing ? 'modal-content-closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="export-modal-header">
          <div className="export-modal-icon">
            <Icon name="download" size={24} />
          </div>
          <h3 className="export-modal-title">导出任务</h3>
          <button className="export-modal-close-btn" onClick={handleClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="export-modal-body">
          <div className="export-form-group">
            <label className="export-form-label">快捷筛选</label>
            <div className="export-quick-filters">
              <button
                className={`export-quick-btn ${activeQuickFilter === '今日' ? 'active' : ''}`}
                onClick={() => handleQuickFilter('今日')}
              >
                今日
              </button>
              <button
                className={`export-quick-btn ${activeQuickFilter === '本周' ? 'active' : ''}`}
                onClick={() => handleQuickFilter('本周')}
              >
                本周
              </button>
              <button
                className={`export-quick-btn ${activeQuickFilter === '本月' ? 'active' : ''}`}
                onClick={() => handleQuickFilter('本月')}
              >
                本月
              </button>
            </div>
          </div>

          <div className="export-form-group">
            <label className="export-form-label">开始日期</label>
            <input
              type="date"
              className="export-date-input"
              value={startDate}
              onChange={(e) => handleDateChange('start', e.target.value)}
            />
          </div>

          <div className="export-form-group">
            <label className="export-form-label">结束日期</label>
            <input
              type="date"
              className="export-date-input"
              value={endDate}
              onChange={(e) => handleDateChange('end', e.target.value)}
            />
          </div>

          <div className="export-hint">
            <Icon name="info" size={14} />
            <span>最大支持导出一个月（30天）的内容</span>
          </div>

          {error && (
            <div className="export-error">
              <Icon name="alert-circle" size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="export-modal-actions">
          <button className="btn btn-secondary" onClick={handleClose} disabled={isExporting}>
            取消
          </button>
          <button className="btn btn-primary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Icon name="loader" size={14} className="exporting-icon" />
                导出中...
              </>
            ) : (
              <>
                <Icon name="download" size={14} />
                确认导出
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExportModal;