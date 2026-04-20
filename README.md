# Zap

闪电般快速的待办事项与笔记应用。

## 功能特性

### 任务管理
- 待办事项管理（添加、编辑、删除、完成任务）
- 多个清单分类（收集箱、待办、已完成、垃圾箱）
- 标签系统，支持自定义颜色
- 日历视图，按日期查看任务
- 全局搜索，快速定位任务
- 日期时间支持，可设置任务开始和结束时间
- 任务导出（支持 Excel 格式）
- 删除原因记录

### 笔记系统
- Markdown 笔记编辑器（轻量级自定义实现）
- 实时预览（Typora 风格）
- 工具栏快捷操作
  - 标题（H1/H2/H3）
  - 加粗、斜体、删除线
  - 引用、无序列表、有序列表
  - 行内代码、代码块
  - 链接、分割线
- 快捷键支持
  - `Ctrl+B`：加粗 / 取消加粗
  - `Ctrl+I`：斜体 / 取消斜体
- 瀑布流卡片布局 / 列表视图切换
- 笔记搜索

### 云同步
- GitHub Gist 云备份与恢复
- 自动同步与手动同步
- Token 安全存储（支持 Electron safeStorage 加密）

### 通用
- 主题切换（浅色/深色/跟随系统）
- 快捷键支持
  - `Ctrl+N`：快速添加任务
  - `Ctrl+D`：完成选中任务
  - `Ctrl+F`：全局搜索
- 无框窗口设计，自定义标题栏
- 流畅的动画与过渡效果

## 技术栈

- **前端**：React 18, react-scripts
- **桌面框架**：Electron 28
- **数据存储**：sql.js (SQLite in WASM), electron-store
- **Markdown**：react-markdown, remark-gfm
- **日期处理**：flatpickr
- **导出**：xlsx (SheetJS)
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
├── main.js                # Electron 主进程
├── preload.js             # 预加载脚本
├── public/                # 静态资源
├── src/
│   ├── App.jsx            # 应用主组件
│   ├── index.js           # 入口文件
│   ├── components/        # React 组件
│   │   ├── AddTaskCard.jsx      # 快速添加任务卡片
│   │   ├── Calendar.jsx         # 日历视图
│   │   ├── Dashboard.jsx        # 仪表盘
│   │   ├── DateTimePicker.jsx   # 日期时间选择器
│   │   ├── ExportModal.jsx      # 导出弹窗
│   │   ├── GlobalSearch.jsx     # 全局搜索
│   │   ├── Icon.jsx             # SVG 图标组件
│   │   ├── NoteEditor.jsx       # Markdown 笔记编辑器
│   │   ├── NotesList.jsx        # 笔记列表（瀑布流/列表视图）
│   │   ├── Sidebar.jsx          # 侧边栏导航
│   │   ├── TaskList.jsx         # 任务列表
│   │   ├── TaskModal.jsx        # 任务编辑弹窗
│   │   ├── TokenModal.jsx       # GitHub Token 设置
│   │   └── Toast.jsx            # 消息提示
│   ├── hooks/             # 自定义 Hooks
│   │   ├── useCloudBackup.js    # 云备份 Hook
│   │   ├── useCloudSync.js      # 云同步 Hook
│   │   ├── useShortcuts.js      # 快捷键 Hook
│   │   └── useStore.js          # 状态管理 Hook
│   ├── services/          # 服务层
│   │   ├── cloudBackup.js       # GitHub Gist 云备份服务
│   │   └── leanCloudBackup.js   # 轻量云备份服务
│   ├── database/          # 数据库
│   │   └── sqlite.js            # SQLite 数据库操作
│   ├── constants/         # 常量定义
│   ├── utils/             # 工具函数
│   │   ├── appHelpers.js        # 应用辅助函数
│   │   └── dateParser.js        # 日期解析
│   └── styles/            # 样式文件
│       └── index.css            # 全局样式
├── build/                 # React 生产构建
└── dist/                  # Electron 打包输出
```

## 许可证

MIT
