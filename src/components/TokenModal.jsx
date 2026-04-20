import React, { useEffect } from 'react';
import { setGistToken, getGistToken } from '../services/cloudBackup';
import Icon from './Icon';

function TokenModal({ isOpen, onClose, onSave, tokenInput, setTokenInput, showToast }) {
  useEffect(() => {
    if (isOpen) {
      // 从 localStorage 读取已保存的 token
      const savedToken = getGistToken();
      console.log('[TokenModal] 获取到的 savedToken:', savedToken, typeof savedToken);
      if (savedToken && typeof savedToken === 'string') {
        setTokenInput(savedToken);
      } else if (savedToken && typeof savedToken === 'object' && savedToken.then) {
        // 如果是 Promise，等待它resolved
        savedToken.then(token => {
          console.log('[TokenModal] Token 从 Promise 中获取:', token);
          if (token) setTokenInput(token);
        });
      }
    }
  }, [isOpen, setTokenInput]);

  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">GitHub Token 设置</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          请输入你的 GitHub Personal Access Token，用于数据备份到 Gist
        </p>
        <input
            type="password"
            className="modal-input"
            placeholder="ghp_xxxxxxxxxxxx"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            autoFocus
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Token 需要勾选 gist 权限，在 GitHub Settings → Developer settings → Personal access tokens 生成
        </p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (tokenInput.trim()) {
                setGistToken(tokenInput.trim());
                onSave();
                showToast('Token 配置成功', 'success');
              }
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

export default TokenModal;