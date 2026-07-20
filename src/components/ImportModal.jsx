import React, { useState, useEffect } from 'react';
import Icon from './Icon';

function ImportModal({ isOpen, onImport, onCancel }) {
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    console.log('[ImportModal] isOpen:', isOpen);
    if (isOpen) {
      setError('');
      setIsImporting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    onCancel();
  };

  const handleFileImport = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('请选择 JSON 文件');
      return;
    }

    setIsImporting(true);
    setError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.lists || !data.tasks || !data.tags) {
        throw new Error('无效的备份文件格式');
      }

      if (data.notes && Array.isArray(data.notes)) {
        data.notes = data.notes.map(note => ({
          ...note,
          content: note.content ? note.content.replace(/!\[([^\]]*)\]\(data:image\/[^;]+;base64,[^)]+\)/g, '![$1][图片已移除]') : note.content
        }));
      }

      await onImport(data);
      handleClose();
    } catch (err) {
      if (err.message === '无效的备份文件格式') {
        setError('无效的备份文件格式，请选择正确的 zap-backup 文件');
      } else {
        setError('文件解析失败: ' + err.message);
      }
      setIsImporting(false);
    }
  };

  const handleChooseFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => handleFileImport(e);
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">导入本地备份</h3>
        
        <div style={{ padding: '16px 0' }}>
          <div className="export-hint" style={{ marginBottom: '16px' }}>
            <Icon name="info" size={14} />
            <span>选择之前导出的 zap-backup-latest.json 文件进行导入</span>
          </div>

          <button
            className="btn btn-primary"
            onClick={handleChooseFile}
            disabled={isImporting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isImporting ? (
              <>
                <Icon name="loader" size={14} className="exporting-icon" />
                导入中...
              </>
            ) : (
              <>
                <Icon name="folder" size={14} />
                选择 JSON 文件
              </>
            )}
          </button>

          <div className="export-hint" style={{ marginTop: '16px', color: '#F59E0B' }}>
            <Icon name="alert-triangle" size={14} />
            <span>注意：导入会覆盖本地现有数据</span>
          </div>

          {error && (
            <div className="export-error" style={{ marginTop: '12px' }}>
              <Icon name="alert-circle" size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={handleClose} disabled={isImporting}>
            取消
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportModal;
