import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// 备用方案：如果 3 秒后还没隐藏则强制隐藏
setTimeout(() => {
  if (window.hideLoading) {
    window.hideLoading();
  }
}, 3000);
