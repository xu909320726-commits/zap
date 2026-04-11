# Zap

闪电般快速的待办事项应用。

## 功能特性

- 待办事项管理（添加、编辑、删除、完成任务）
- 多个清单分类（收集箱、待办、已完成、垃圾箱）
- 标签系统，支持自定义颜色
- 日历视图，按日期查看任务
- 全局搜索，快速定位任务
- 主题切换（浅色/深色/跟随系统）
- 日期时间支持，可设置任务开始和结束时间
- 快捷键支持
  - `Ctrl+N`：快速添加任务
  - `Ctrl+D`：完成选中任务
  - `Ctrl+F`：全局搜索
- 无框窗口设计，自定义标题栏

## 技术栈

- **前端**：React 18, react-scripts
- **桌面框架**：Electron 28
- **数据存储**：sql.js (SQLite in WASM), electron-store
- **日期处理**：flatpickr
- **构建工具**：electron-builder

## 开发

```bash
# 安装依赖
npm install

# 开发模式（React 开发服务器 + Electron）
npm run dev

# 仅运行 React 开发服务器
npm run dev:react

# 构建生产版本
npm run build

# 打包 Electron 应用
npm run pack
```

## 项目结构

```
├── main.js          # Electron 主进程
├── preload.js       # 预加载脚本
├── public/          # 静态资源
├── src/
│   ├── components/  # React 组件
│   ├── hooks/       # 自定义 Hooks
│   ├── utils/       # 工具函数
│   ├── database/    # 数据库相关
│   └── styles/      # 样式文件
├── build/           # React 生产构建
└── dist/            # Electron 打包输出
```

## 许可证

MIT
