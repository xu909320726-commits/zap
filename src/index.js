import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// 抑制 ResizeObserver 循环完成警告（这个警告不影响功能）
const originalError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('ResizeObserver loop')) {
    return;
  }
  originalError.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

// 备用方案：如果 3 秒后还没隐藏则强制隐藏
setTimeout(() => {
  if (window.hideLoading) {
    window.hideLoading();
  }
}, 3000);
