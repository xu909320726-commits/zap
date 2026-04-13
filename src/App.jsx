import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from './hooks/useStore';
import { useShortcuts } from './hooks/useShortcuts';
import { parseNaturalLanguage, formatDueDate } from './utils/dateParser';
import Calendar from './components/Calendar';
import AddTaskCard from './components/AddTaskCard';
import Icon from './components/Icon';
import GlobalSearch from './components/GlobalSearch';
import ConfirmModal from './components/ConfirmModal';
import DeleteReasonModal from './components/DeleteReasonModal';
import { ToastContainer } from './components/Toast';
import Dashboard from './components/Dashboard';
import Tooltip from './components/Tooltip';

// 菜单配置
const MENU_CONFIG = {
  home: {
    name: '首页',
    icon: 'home',
    children: []
  },
  task: {
    name: '任务',
    icon: 'clipboard-list',
    children: [
      { id: 'todo', name: '待办事项', icon: 'circle' },
      { id: 'done', name: '已办事项', icon: 'check-circle' },
      { id: 'trash', name: '垃圾箱', icon: 'wastebasket' }
    ]
  },
  calendar: {
    name: '日历',
    icon: 'calendar',
    children: []
  },
  tags: {
    name: '标签',
    icon: 'tag',
    children: []
  }
};

function App() {
  const {
    lists,
    tasks,
    tags,
    deletedTasks,
    isLoaded,
    addList,
    addTask,
    deleteTask,
    restoreTask,
    permanentDeleteTask,
    emptyTrash,
    toggleTaskComplete,
    updateTask,
    getTasksByList,
    searchTasks,
    addTag,
    updateTag,
    deleteTag
  } = useStore();

  // 数据加载完成后隐藏 loading
  useEffect(() => {
    if (isLoaded && window.hideLoading) {
      window.hideLoading();
    }
  }, [isLoaded]);

  const [activeListId, setActiveListId] = useState('home');
  const [quickAddText, setQuickAddText] = useState('');
  
  // 滑动指示器相关
  const menuSectionRef = useRef(null);
  const activeItemRef = useRef('todo');
  const [indicatorStyle, setIndicatorStyle] = useState({ transform: 'translateX(-100%)', width: '0px', height: '0px', opacity: 0 });
  const menuItemRefs = useRef({});
  const [menuSelectedItems, setMenuSelectedItems] = useState({
    task: 'todo',
    calendar: 'calendar',
    tags: 'tags'
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [highlightedTagId, setHighlightedTagId] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState(['task']);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('zap-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState('#0D7C66');
  const [editingTask, setEditingTask] = useState(null);
  const [animatingTaskId, setAnimatingTaskId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, danger: false });
  const [noteModal, setNoteModal] = useState({ isOpen: false, taskId: null, note: '' });
  const [noteModalClosing, setNoteModalClosing] = useState(false);
  const [editingTaskClosing, setEditingTaskClosing] = useState(false);
  const [editingTaskReason, setEditingTaskReason] = useState('');
  const [copyingTaskId, setCopyingTaskId] = useState(null);
  const [deleteReasonModal, setDeleteReasonModal] = useState({ isOpen: false, taskId: null, taskTitle: '' });
  const [modificationHistoryModal, setModificationHistoryModal] = useState({ isOpen: false, taskId: null, taskTitle: '', modifications: [] });
  const [toasts, setToasts] = useState([]);
  const [completedFilterDate, setCompletedFilterDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [completedFilterMode, setCompletedFilterMode] = useState('day'); // 'day' or 'week'

  const searchInputRef = useRef(null);
  const addTaskCardRef = useRef(null);

  // Toast 提示函数
  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, isVisible: true, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 重置关闭动画状态
  useEffect(() => {
    if (!noteModal.isOpen && noteModalClosing) {
      setNoteModalClosing(false);
    }
  }, [noteModal.isOpen, noteModalClosing]);

  useEffect(() => {
    if (!editingTask && editingTaskClosing) {
      setEditingTaskClosing(false);
    }
  }, [editingTask, editingTaskClosing]);

  // 初始化滑动指示器
  useEffect(() => {
    if (isLoaded) {
      activeItemRef.current = activeListId;
      setTimeout(() => {
        updateSliderIndicator(activeListId);
      }, 150);
    }
  }, [isLoaded, activeListId]);

  // 监听 lists 变化，确保自定义列表的指示器正确
  useEffect(() => {
    if (isLoaded && lists.length > 0) {
      setTimeout(() => updateSliderIndicator(activeItemRef.current), 150);
    }
  }, [isLoaded, lists]);

  // 监听展开菜单变化，收起时隐藏指示器
  useEffect(() => {
    // 检查当前激活项是否在已收起的菜单中
    const checkActiveItemVisibility = () => {
      for (const [menuKey, menu] of Object.entries(MENU_CONFIG)) {
        if (menu.children && menu.children.length > 0) {
          const isMenuExpanded = expandedMenus.includes(menuKey);
          const isChildActive = menu.children.some(child => child.id === activeListId);
          
          if (isChildActive && !isMenuExpanded) {
            // 激活项在已收起的菜单中，缩小并隐藏指示器
            setIndicatorStyle(prev => ({
              ...prev,
              opacity: 0,
              transform: prev.transform,
              height: '0px'
            }));
            return;
          }
        }
      }
      
      // 检查用户自定义列表
      const isListActive = lists.some(list => list.id === activeListId && !list.isDefault);
      
      if (isListActive && !expandedMenus.includes('task')) {
        // 用户自定义列表被激活但"任务"菜单已收起
        const taskChildren = MENU_CONFIG.task?.children || [];
        const isChildOfTask = taskChildren.some(child => child.id === activeListId);
        if (isChildOfTask) {
          setIndicatorStyle(prev => ({
            ...prev,
            opacity: 0,
            transform: prev.transform,
            height: '0px'
          }));
          return;
        }
      }
      
      // 如果当前有激活项且其菜单是展开的，确保指示器显示
      if (activeListId && menuItemRefs.current[activeListId]) {
        setIndicatorStyle(prev => ({
          ...prev,
          opacity: 1
        }));
      }
    };
    
    checkActiveItemVisibility();
  }, [expandedMenus]);

  // 自动清除高亮状态（3秒后）
  useEffect(() => {
    if (highlightedTaskId || highlightedTagId) {
      const timer = setTimeout(() => {
        setHighlightedTaskId(null);
        setHighlightedTagId(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId, highlightedTagId]);

  // 主题切换
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : (theme === 'dark' ? 'system' : 'light');
    setTheme(newTheme);
    localStorage.setItem('zap-theme', newTheme);
    applyTheme(newTheme);
  };

  // 应用主题到文档
  const applyTheme = (themeName) => {
    if (themeName === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
    }
  };

  // 监听系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // 初始化主题
  useEffect(() => {
    applyTheme(theme);
  }, []);

  // 聚焦快速添加输入框
  const focusQuickAdd = useCallback(() => {
    addTaskCardRef.current?.focusInput?.();
  }, []);

  // 全局搜索 - 打开搜索框并聚焦
  const openGlobalSearch = useCallback(() => {
    setIsSearchOpen(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // 关闭搜索
  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchKeyword('');
    setIsSearchMode(false);
  }, []);

  // 完成选中任务
  const completeSelectedTask = useCallback(() => {
    if (selectedTaskId) {
      toggleTaskComplete(selectedTaskId);
    }
  }, [selectedTaskId, toggleTaskComplete]);

  // 切换到待办视图并聚焦添加任务输入框
  const switchToTodoAndFocus = useCallback(() => {
    handleListClick('todo');
    setTimeout(() => focusQuickAdd(), 100);
  }, []);

  // 注册快捷键
  useShortcuts({
    onAddTask: switchToTodoAndFocus,
    onCompleteTask: completeSelectedTask,
    onFocusSearch: openGlobalSearch
  });

  // 本地 Ctrl+F 和 Ctrl+N 快捷键（只在窗口有焦点时生效）
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!document.hasFocus()) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        openGlobalSearch();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        switchToTodoAndFocus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openGlobalSearch, switchToTodoAndFocus]);

  // 切换菜单展开/收起
  const toggleMenu = (menuKey) => {
    const menu = MENU_CONFIG[menuKey];
    const isExpanding = !expandedMenus.includes(menuKey);
    
    // 如果是展开且有子菜单，设置默认选中项
    if (isExpanding && menu?.children?.length > 0) {
      const defaultItem = menuSelectedItems[menuKey] || menu.children[0].id;
      setMenuSelectedItems(prev => ({
        ...prev,
        [menuKey]: defaultItem
      }));
      // 如果当前选中的不是这个菜单的子菜单，则切换
      if (!menu.children.some(c => c.id === activeListId)) {
        setActiveListId(defaultItem);
        activeItemRef.current = defaultItem;
        // 展开时让指示器跟随子菜单
        requestAnimationFrame(() => {
          updateSliderIndicator(defaultItem);
        });
      }
    } else if (!isExpanding && menu?.children?.length > 0) {
      // 收起菜单时，将指示器移到父菜单项
      setActiveListId(menuKey);
      activeItemRef.current = menuKey;
      requestAnimationFrame(() => {
        updateSliderIndicator(menuKey);
      });
    }
    
    setExpandedMenus(prev => 
      prev.includes(menuKey) 
        ? prev.filter(k => k !== menuKey)
        : [...prev, menuKey]
    );
  };

  // 切换清单/视图
  const handleListClick = (listId) => {
    activeItemRef.current = listId;
    setActiveListId(listId);
    setIsSearchMode(false);
    setSearchKeyword('');
    setIsSearchOpen(false);
    
    // 记住当前菜单的选中项
    for (const [menuKey, menu] of Object.entries(MENU_CONFIG)) {
      if (menu.children?.some(c => c.id === listId)) {
        setMenuSelectedItems(prev => ({
          ...prev,
          [menuKey]: listId
        }));
        break;
      }
    }
    
    // 立即更新滑动指示器（针对第一级菜单）
    const menuConfig = MENU_CONFIG[listId];
    const isFirstLevelMenu = menuConfig && menuConfig.children && menuConfig.children.length === 0;
    if (isFirstLevelMenu) {
      requestAnimationFrame(() => {
        updateSliderIndicator(listId);
      });
    }
  };

  // 滑动指示器位置更新函数
  const updateSliderIndicator = useCallback((listId) => {
    if (!listId) return;
    
    const menuSection = menuSectionRef.current;
    if (!menuSection) return;
    
    // 找到对应的父级菜单项
    let targetMenuKey = listId;
    let isChildOfMenu = false;
    
    for (const [menuKey, menu] of Object.entries(MENU_CONFIG)) {
      if (menu.children?.some(c => c.id === listId)) {
        targetMenuKey = menuKey;
        isChildOfMenu = true;
        break;
      }
    }
    
    // 如果是子菜单，检查父级菜单是否已展开
    if (isChildOfMenu) {
      // 如果是子菜单被选中，不给一级菜单显示背景
      setIndicatorStyle(prev => ({
        ...prev,
        opacity: 0,
        height: '0px'
      }));
      return;
    }
    
    // 如果是第一级菜单（没有子菜单的菜单），直接使用自己
    const menuConfig = MENU_CONFIG[targetMenuKey];
    const isFirstLevelMenu = menuConfig && menuConfig.children && menuConfig.children.length === 0;
    
    if (isFirstLevelMenu) {
      targetMenuKey = listId;
    }
    
    const targetItem = menuItemRefs.current[targetMenuKey];
    
    if (!targetItem) {
      // 尝试使用 requestAnimationFrame 重试
      requestAnimationFrame(() => {
        const retryItem = menuItemRefs.current[targetMenuKey];
        if (retryItem && menuSectionRef.current) {
          positionIndicator(retryItem);
        }
      });
      return;
    }
    
    positionIndicator(targetItem);
    
    function positionIndicator(targetEl) {
      const menuSectionRect = menuSection.getBoundingClientRect();
      const itemRect = targetEl.getBoundingClientRect();
      
      const menuStyle = window.getComputedStyle(menuSection);
      const menuPaddingTop = parseInt(menuStyle.paddingTop) || 0;
      
      const left = itemRect.left - menuSectionRect.left;
      const top = itemRect.top - menuSectionRect.top - menuPaddingTop;
      
      setIndicatorStyle({
        transform: `translate(${left}px, ${top}px)`,
        width: `${itemRect.width}px`,
        height: `${itemRect.height}px`,
        opacity: 1
      });
    }
  }, [expandedMenus]);

  // 监听展开菜单变化，重新计算指示器位置
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updateSliderIndicator(activeListId);
      });
    });
    return () => cancelAnimationFrame(timer);
  }, [expandedMenus, activeListId, updateSliderIndicator]);

  // 搜索任务
  const handleSearch = (e) => {
    const keyword = e.target.value;
    setSearchKeyword(keyword);
    setIsSearchMode(keyword.trim().length > 0);
  };

  // 获取当前显示的任务
  const getDisplayTasks = () => {
    if (isSearchMode) {
      return searchTasks(searchKeyword);
    }
    if (activeListId === 'todo') {
      return tasks.filter(t => !t.completed);
    }
    if (activeListId === 'done') {
      const filterDate = new Date(completedFilterDate);
      if (completedFilterMode === 'week') {
        const weekStart = new Date(filterDate);
        weekStart.setDate(filterDate.getDate() - filterDate.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return tasks.filter(t => {
          if (!t.completed) return false;
          if (!t.completedAt) return false;
          const completedDate = new Date(t.completedAt);
          return completedDate >= weekStart && completedDate <= weekEnd;
        });
      } else {
        filterDate.setHours(23, 59, 59, 999);
        return tasks.filter(t => {
          if (!t.completed) return false;
          if (!t.completedAt) return false;
          const completedDate = new Date(t.completedAt);
          return completedDate.toDateString() === filterDate.toDateString();
        });
      }
    }
    return getTasksByList(activeListId);
  };

  const displayTasks = getDisplayTasks();
  const sortedTasks = [...displayTasks].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  // 获取任务数量
  const getTaskCount = (listId) => {
    if (listId === 'todo') {
      return tasks.filter(t => !t.completed).length;
    }
    if (listId === 'done') {
      return tasks.filter(t => t.completed).length;
    }
    if (listId === 'trash') {
      return deletedTasks.length;
    }
    return tasks.filter(t => t.listId === listId && !t.completed).length;
  };

  // 打开标签管理模态框
  const openTagModal = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color);
    } else {
      setEditingTag(null);
      setTagName('');
      setTagColor('#0D7C66');
    }
    setShowTagModal(true);
  };

  // 保存标签（新增或编辑）
  const handleSaveTag = async () => {
    if (tagName.trim()) {
      if (editingTag) {
        await updateTag(editingTag.id, { name: tagName.trim(), color: tagColor });
      } else {
        await addTag(tagName.trim(), tagColor);
      }
      setShowTagModal(false);
      setTagName('');
      setEditingTag(null);
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId) => {
    setConfirmModal({
      isOpen: true,
      title: '删除标签',
      message: '确定要删除这个标签吗？',
      danger: true,
      onConfirm: async () => {
        await deleteTag(tagId);
        setConfirmModal({ isOpen: false });
      }
    });
  };

  // 检查任务是否过期
  const isOverdue = (task) => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  // 检查任务是否今天到期
  const isToday = (task) => {
    if (!task.dueDate || task.completed) return false;
    const due = new Date(task.dueDate);
    const now = new Date();
    return due.toDateString() === now.toDateString();
  };

  // 格式化时间为输入框用 (HH:mm)
  const formatTimeForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // 格式化日期为输入框用 (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) {
      const today = new Date();
      return `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    }
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  // 格式化日期时间为 datetime-local 输入框用 (YYYY-MM-DDTHH:mm) - 本地时间
  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // 格式化日期时间范围
  const formatDueDateWithRange = (startDate, endDate) => {
    if (!startDate) return '';
    const start = formatDueDate(startDate);
    if (!endDate) return start;
    const startTime = formatTimeForInput(startDate);
    const endTime = formatTimeForInput(endDate);
    if (startTime === endTime) return `${start} ${startTime}`;
    return `${start} ${startTime} - ${endTime}`;
  };


  // 获取当前视图名称
  const getCurrentViewName = () => {
    if (isSearchMode) return '搜索结果';
    if (isHomeView) return '仪表盘';
    for (const [menuKey, menu] of Object.entries(MENU_CONFIG)) {
      if (menu.children) {
        const child = menu.children.find(c => c.id === activeListId);
        if (child) return child.name;
      }
    }
    const list = lists.find(l => l.id === activeListId);
    return list?.name || '待办事项';
  };

  // 判断是否显示日历视图
  const isCalendarView = activeListId === 'calendar';
  const isTagsView = activeListId === 'tags';
  const isTrashView = activeListId === 'trash';
  const isHomeView = activeListId === 'home';

  if (!isLoaded) {
    return (
      <div className="app" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <span>加载中...</span>
      </div>
    );
  }

  // 渲染侧边栏
  const renderSidebar = () => (
    <div className="sidebar">
      <div className="sidebar-header" onClick={() => handleListClick('home')}>
        <h1 className="sidebar-title">
          <Icon name="zap" className="sidebar-title-icon" />
          Zap
        </h1>
      </div>
      
      <button className="quick-add-btn" onClick={() => {
        handleListClick('todo');
        setTimeout(() => focusQuickAdd(), 100);
      }}>
        <Icon name="plus" className="quick-add-btn-icon" />
        <span>添加任务</span>
      </button>
      
      <div className="menu-section" ref={menuSectionRef} style={{ position: 'relative' }}>
        {/* 滑动指示器 */}
        <div className="menu-slider-indicator" style={indicatorStyle} />
        
        {Object.entries(MENU_CONFIG).map(([menuKey, menu]) => (
          <div key={menuKey} className="menu-group">
            <div 
              ref={el => menuItemRefs.current[menuKey] = el}
              className={`menu-item ${menu.children.length > 0 ? 'has-children' : ''} ${
                menu.children.length > 0 
                  ? (expandedMenus.includes(menuKey) ? 'active' : '')
                  : (activeListId === menuKey ? 'active' : '')
              }`}
              onClick={() => {
                if (menu.children.length > 0) {
                  toggleMenu(menuKey);
                } else {
                  handleListClick(menuKey);
                }
              }}
            >
              <Icon name={menu.icon} className="menu-icon" />
              <span className="menu-name">{menu.name}</span>
              {menu.children.length > 0 && (
                <span className={`menu-arrow ${expandedMenus.includes(menuKey) ? 'expanded' : ''}`}>
                  ›
                </span>
              )}
            </div>
            
              {menu.children.length > 0 && (
              <div 
                className={`submenu ${expandedMenus.includes(menuKey) ? 'open' : ''}`}
                ref={el => {
                  if (el) {
                    el.addEventListener('transitionend', () => {
                      if (!expandedMenus.includes(menuKey)) {
                        el.style.overflow = 'hidden';
                      } else {
                        el.style.overflow = '';
                      }
                    });
                  }
                }}
              >
                {menu.children.map(child => (
                  <div
                    key={child.id}
                    ref={el => menuItemRefs.current[child.id] = el}
                    className={`list-item ${activeListId === child.id ? 'active' : ''}`}
                    onClick={() => handleListClick(child.id)}
                  >
                    <Icon name={child.icon} className="list-icon" />
                    <span className="list-name">{child.name}</span>
                    {getTaskCount(child.id) > 0 && (
                      <span className="list-count">{getTaskCount(child.id)}</span>
                    )}
                  </div>
                ))}
                
                {lists.filter(l => !l.isDefault && l.id !== 'todo').map(list => (
                  <div
                    key={list.id}
                    ref={el => menuItemRefs.current[list.id] = el}
                    className={`list-item ${activeListId === list.id ? 'active' : ''}`}
                    onClick={() => handleListClick(list.id)}
                  >
                    <Icon name="folder" className="list-icon" />
                    <span className="list-name">{list.name}</span>
                    {getTaskCount(list.id) > 0 && (
                      <span className="list-count">{getTaskCount(list.id)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="theme-toggle">
        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
        >
          <Icon name={theme === 'light' ? 'moon' : (theme === 'dark' ? 'sun' : 'monitor')} />
          <span>{theme === 'light' ? '暗色模式' : (theme === 'dark' ? '浅色模式' : '跟随系统')}</span>
        </button>
      </div>
    </div>
  );

  // 渲染任务列表
  const renderTaskList = () => (
    <div className="task-list">
      {activeListId === 'done' && (
        <div className="task-list-header">
          <div className="completed-filter">
            <div className="completed-filter-quick">
              <button
                className={`completed-filter-quick-btn ${(() => {
                  if (completedFilterMode === 'week') return '';
                  const today = new Date();
                  const filterDate = new Date(completedFilterDate);
                  return today.toDateString() === filterDate.toDateString() ? 'active' : '';
                })()}`}
                onClick={() => {
                  const today = new Date();
                  setCompletedFilterDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
                  setCompletedFilterMode('day');
                }}
              >
                今天
              </button>
              <button
                className={`completed-filter-quick-btn ${(() => {
                  if (completedFilterMode === 'week') return '';
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const filterDate = new Date(completedFilterDate);
                  return yesterday.toDateString() === filterDate.toDateString() ? 'active' : '';
                })()}`}
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setCompletedFilterDate(`${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`);
                  setCompletedFilterMode('day');
                }}
              >
                昨天
              </button>
              <button
                className={`completed-filter-quick-btn ${completedFilterMode === 'week' ? 'active' : ''}`}
                onClick={() => {
                  const today = new Date();
                  const weekStart = new Date(today);
                  weekStart.setDate(today.getDate() - today.getDay() + 1);
                  setCompletedFilterDate(`${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`);
                  setCompletedFilterMode('week');
                }}
              >
                本周
              </button>
            </div>
            <input
              type="date"
              className="completed-filter-input"
              value={completedFilterDate}
              onChange={(e) => {
                setCompletedFilterDate(e.target.value);
                setCompletedFilterMode('day');
              }}
            />
          </div>
        </div>
      )}
      {sortedTasks.length === 0 ? (
        <div className="task-empty">
          <div className="task-empty-icon-wrapper">
            <Icon name={isSearchMode ? 'search' : (activeListId === 'done' ? 'check-circle' : 'clipboard-list')} />
          </div>
          <div className="task-empty-text">
            {isSearchMode ? '没有找到匹配的任务' : activeListId === 'done' ? '该日期暂无已完成任务' : '暂无任务'}
          </div>
          <div className="task-empty-hint">
            {isSearchMode ? '尝试其他关键词' : (
              activeListId === 'done' ? '尝试选择其他日期' : (
              <>
                按 <span className="shortcut">Ctrl</span> + <span className="shortcut">N</span> 快速添加任务
              </>
            ))}
          </div>
        </div>
      ) : (
        <>
          {activeListId !== 'done' && (
            <div className="task-list-header">
              <span className="task-count">
                {sortedTasks.filter(t => !t.completed).length} 个待办，{sortedTasks.filter(t => t.completed).length} 个已完成
              </span>
            </div>
          )}
          {sortedTasks.map(task => (
            <div
              key={task.id}
              className={`task-item ${task.completed ? 'completed' : ''} ${selectedTaskId === task.id ? 'selected' : ''} ${highlightedTaskId === task.id ? 'highlighted' : ''} ${animatingTaskId === task.id ? 'animating-out' : ''}`}
              onClick={() => {
                setSelectedTaskId(task.id);
                setHighlightedTaskId(null);
              }}
            >
              <div 
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!animatingTaskId) {
                    setAnimatingTaskId(task.id);
                    setTimeout(() => {
                      toggleTaskComplete(task.id);
                      setAnimatingTaskId(null);
                    }, 300);
                  }
                }}
              />
              
              <div className="task-content">
                <div className="task-title">{task.title}</div>
                {(task.dueDate || (task.tagIds && task.tagIds.length > 0) || task.linkUrl || task.note) && (
                  <div className="task-meta">
                    {task.dueDate && (
                      <span className={`task-due-date ${isOverdue(task) ? 'overdue' : ''} ${isToday(task) ? 'today' : ''} ${!isOverdue(task) && !isToday(task) ? 'future' : ''}`}>
                        <Icon name="calendar" size={12} />
                        {formatDueDateWithRange(new Date(task.dueDate), task.endDate ? new Date(task.endDate) : null)}
                      </span>
                    )}
                    {task.linkUrl && (
                      <button 
                        className="task-link-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.electronAPI && window.electronAPI.openExternal) {
                            window.electronAPI.openExternal(task.linkUrl);
                          } else {
                            window.open(task.linkUrl, '_blank');
                          }
                        }}
                        title={task.linkUrl}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        链接
                      </button>
                    )}
                    {task.tagIds && task.tagIds.length > 0 && (
                      <>
                        {tags.filter(t => task.tagIds.includes(t.id)).map(tag => (
                          <span key={tag.id} className="task-tag" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                      </>
                    )}
                    {task.note && (
                      <Tooltip content={task.note}>
                        <span className="task-note-indicator">
                          <Icon name="file-text" size={12} />
                          备注
                        </span>
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>

              <div className="task-actions">
                <button 
                  className={`task-action-btn copy ${copyingTaskId === task.id ? 'loading' : ''}`}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (copyingTaskId) return;
                    setCopyingTaskId(task.id);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await addTask(
                      task.title,
                      task.listId,
                      task.dueDate,
                      task.endDate,
                      task.tagIds || [],
                      task.linkUrl,
                      task.note
                    );
                    setCopyingTaskId(null);
                  }}
                  title="复制任务"
                  disabled={copyingTaskId === task.id}
                >
                  {copyingTaskId === task.id ? <Icon name="loader" /> : <Icon name="copy" />}
                </button>
                {!task.completed && (
                  <button 
                    className="task-action-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTask(task);
                    }}
                  >
                    <Icon name="pencil" />
                  </button>
                )}
                <button 
                  className="task-action-btn note"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNoteModal({ isOpen: true, taskId: task.id, note: task.note || '' });
                  }}
                  title="备注"
                >
                  <Icon name="file-text" />
                </button>
                <button 
                  className="task-action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteReasonModal({ isOpen: true, taskId: task.id, taskTitle: task.title });
                  }}
                >
                  <Icon name="trash-2" />
                </button>
                {task.modifications && task.modifications.length > 0 && (
                  <button 
                    className="task-action-btn history"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModificationHistoryModal({ 
                        isOpen: true, 
                        taskId: task.id, 
                        taskTitle: task.title, 
                        modifications: task.modifications 
                      });
                    }}
                    title="修改记录"
                  >
                    <Icon name="history" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  // 渲染主内容区
  const renderMainContent = () => (
    <>
      <div className="content-header">
        <div className="header-top">
          <h2 className="content-title">{getCurrentViewName()}</h2>
          <button 
            className="global-search-btn"
            onClick={openGlobalSearch}
            title="搜索 (Ctrl+F)"
          >
            <Icon name="search" />
          </button>
        </div>
      </div>

      {activeListId === 'todo' && !isSearchMode && (
        <AddTaskCard
          ref={addTaskCardRef}
          lists={lists}
          tags={tags}
          onSubmit={async ({ title, dueDate, endDate, listId, tagIds, linkUrl }) => {
            await addTask(title, listId || 'todo', dueDate, endDate, tagIds, linkUrl);
          }}
        />
      )}

      {renderTaskList()}

      {/* 编辑任务弹窗 */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => { setEditingTaskClosing(true); setTimeout(() => { setEditingTask(null); setEditingTaskReason(''); }, 200); }}>
          <div className={`modal-content task-edit-modal ${editingTaskClosing ? 'modal-content-closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑任务</h3>
              <button className="modal-close-btn" onClick={() => { setEditingTaskClosing(true); setTimeout(() => { setEditingTask(null); setEditingTaskReason(''); }, 200); }}>
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>任务标题</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>开始日期和时间</label>
                <div className="datetime-input-wrapper">
                  <input
                    type="datetime-local"
                    className="datetime-input"
                    value={formatDateTimeLocal(editingTask.dueDate)}
                    onChange={(e) => setEditingTask({ 
                      ...editingTask, 
                      dueDate: e.target.value ? new Date(e.target.value).toISOString() : null
                    })}
                  />
                  <span className="datetime-icon">
                    <Icon name="calendar" size={18} />
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>结束日期和时间</label>
                <div className="datetime-input-wrapper">
                  <input
                    type="datetime-local"
                    className="datetime-input"
                    value={formatDateTimeLocal(editingTask.endDate)}
                    onChange={(e) => setEditingTask({ 
                      ...editingTask, 
                      endDate: e.target.value ? new Date(e.target.value).toISOString() : null
                    })}
                  />
                  <span className="datetime-icon">
                    <Icon name="calendar" size={18} />
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label>标签</label>
                <div className="tag-selector">
                  {tags.map(tag => (
                    <button
                      key={tag.id}
                      className={`tag-chip ${editingTask.tagIds && editingTask.tagIds.includes(tag.id) ? 'selected' : ''}`}
                      style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                      onClick={() => {
                        const newTagIds = editingTask.tagIds || [];
                        if (newTagIds.includes(tag.id)) {
                          setEditingTask({ ...editingTask, tagIds: newTagIds.filter(id => id !== tag.id) });
                        } else {
                          setEditingTask({ ...editingTask, tagIds: [...newTagIds, tag.id] });
                        }
                      }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>链接</label>
                <div className="link-edit-wrapper">
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://example.com"
                    value={editingTask.linkUrl || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, linkUrl: e.target.value })}
                  />
                  {editingTask.linkUrl && (
                    <button 
                      className="link-clear-btn"
                      onClick={() => setEditingTask({ ...editingTask, linkUrl: '' })}
                      title="清除链接"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="添加备注信息..."
                  value={editingTask.note || ''}
                  onChange={(e) => setEditingTask({ ...editingTask, note: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>修改原因</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="请填写修改原因（选填）..."
                  value={editingTaskReason}
                  onChange={(e) => setEditingTaskReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => { setEditingTaskClosing(true); setTimeout(() => { setEditingTask(null); setEditingTaskReason(''); }, 200); }}>
                取消
              </button>
              <button className="btn btn-primary" onClick={async () => {
                setEditingTaskClosing(true);
                await updateTask(editingTask.id, {
                  title: editingTask.title,
                  dueDate: editingTask.dueDate,
                  endDate: editingTask.endDate,
                  tagIds: editingTask.tagIds || [],
                  linkUrl: editingTask.linkUrl || null,
                  note: editingTask.note || null
                }, editingTaskReason || null);
                setTimeout(() => {
                  setEditingTaskClosing(false);
                  setEditingTask(null);
                  setEditingTaskReason('');
                  showToast('任务已更新');
                }, 200);
              }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除任务弹窗 */}
      <DeleteReasonModal
        isOpen={deleteReasonModal.isOpen}
        taskTitle={deleteReasonModal.taskTitle}
        onConfirm={async (reason) => {
          await deleteTask(deleteReasonModal.taskId, reason);
          setDeleteReasonModal({ isOpen: false, taskId: null, taskTitle: '' });
          showToast('任务已删除');
        }}
        onCancel={() => setDeleteReasonModal({ isOpen: false, taskId: null, taskTitle: '' })}
      />

      {/* 修改记录弹窗 */}
      {modificationHistoryModal.isOpen && (
        <div className="modal-overlay" onClick={() => setModificationHistoryModal({ isOpen: false, taskId: null, taskTitle: '', modifications: [] })}>
          <div className="modification-history-modal" onClick={e => e.stopPropagation()}>
            <div className="modification-history-header">
              <div className="modification-history-icon">
                <Icon name="history" size={24} />
              </div>
              <div className="modification-history-title-section">
                <h3 className="modification-history-title">修改记录</h3>
                <p className="modification-history-task-title">{modificationHistoryModal.taskTitle}</p>
              </div>
              <button 
                className="modification-history-close-btn"
                onClick={() => setModificationHistoryModal({ isOpen: false, taskId: null, taskTitle: '', modifications: [] })}
              >
                <Icon name="x" size={18} />
              </button>
            </div>
            <div className="modification-history-body">
              {modificationHistoryModal.modifications.length === 0 ? (
                <div className="modification-history-empty">
                  <Icon name="clipboard-list" size={48} />
                  <p>暂无修改记录</p>
                </div>
              ) : (
                <div className="modification-timeline">
                  {[...modificationHistoryModal.modifications].reverse().map((mod, index) => (
                    <div key={mod.id || index} className="modification-item">
                      <div className="modification-timeline-marker">
                        <div className="modification-timeline-dot"></div>
                        {index < modificationHistoryModal.modifications.length - 1 && <div className="modification-timeline-line"></div>}
                      </div>
                      <div className="modification-card">
                        <div className="modification-card-header">
                          <span className="modification-reason">{mod.reason || '更新任务'}</span>
                          <span className="modification-time">
                            <Icon name="clock" size={12} />
                            {new Date(mod.modifiedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {mod.changes && (
                          <div className="modification-changes">
                            {mod.changes.split('; ').map((change, i) => (
                              <div key={i} className="modification-change-item">
                                <Icon name="arrow-right" size={12} />
                                <span>{change}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modification-history-footer">
              <button className="btn btn-primary" onClick={() => setModificationHistoryModal({ isOpen: false, taskId: null, taskTitle: '', modifications: [] })}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );

  // 标签视图 - 管理所有标签
  if (isTagsView) {
    return (
      <div className="app">
        {renderSidebar()}
        <div className="main-content tags-view">
          <div className="tags-header">
            <h2 className="tags-title">标签管理</h2>
            <button className="btn btn-primary" onClick={() => openTagModal()}>
              <Icon name="plus" className="btn-icon" />
              添加标签
            </button>
          </div>
          
          {tags.length === 0 ? (
            <div className="task-empty">
              <div className="task-empty-icon-wrapper">
                <Icon name="tag" />
              </div>
              <div className="task-empty-text">暂无标签</div>
              <div className="task-empty-hint">点击上方「添加标签」开始创建</div>
            </div>
          ) : (
            <div className="task-grid">
              {tags.map(tag => (
                <div 
                  key={tag.id} 
                  className={`task-card ${highlightedTagId === tag.id ? 'highlighted' : ''}`}
                  onClick={() => {
                    if (highlightedTagId === tag.id) {
                      setHighlightedTagId(null);
                    }
                  }}
                >
                  <div className="task-card-header">
                    <span className="tag-color-dot" style={{ backgroundColor: tag.color }}></span>
                    <span className="task-card-title">{tag.name}</span>
                    <div className="task-card-actions">
                      <button 
                        className="icon-btn"
                        onClick={() => openTagModal(tag)}
                        title="编辑"
                      >
                        <Icon name="pencil" />
                      </button>
                      <button 
                        className="icon-btn danger"
                        onClick={() => handleDeleteTag(tag.id)}
                        title="删除"
                      >
                        <Icon name="trash-2" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showTagModal && (
          <div className="modal-overlay" onClick={() => setShowTagModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">{editingTag ? '编辑标签' : '添加新标签'}</h3>
              <input
                type="text"
                className="modal-input"
                placeholder="标签名称"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTag()}
                autoFocus
              />
              <div className="tag-color-picker">
                <label className="tag-color-label">选择颜色</label>
                <div className="tag-color-options">
                  {['#0D7C66', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#6366F1'].map(color => (
                    <button
                      key={color}
                      className={`tag-color-option ${tagColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setTagColor(color)}
                    />
                  ))}
                  <label className="tag-color-option tag-color-custom" title="自定义颜色">
                    <input
                      type="color"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="tag-color-input"
                    />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="16"></line>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                  </label>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowTagModal(false)}
                >
                  取消
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleSaveTag}
                >
                  {editingTag ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        )}
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={closeSearch}
          tasks={tasks}
          lists={lists}
          tags={tags}
          deletedTasks={deletedTasks}
          onSelectTask={({ task, listId, type, tagId }) => {
            if (type === 'tag') {
              setActiveListId('tags');
              setHighlightedTagId(tagId);
              setTimeout(() => updateSliderIndicator('tags'), 0);
            } else if (type === 'trash') {
              setActiveListId('trash');
              setTimeout(() => updateSliderIndicator('trash'), 0);
            } else {
              setActiveListId(listId);
              if (task) {
                setSelectedTaskId(task.id);
                if ((type === 'calendar' || type === 'done' || type === 'todo') && task.dueDate) {
                  setHighlightedTaskId(task.id);
                } else if (type === 'todo') {
                  setHighlightedTaskId(task.id);
                }
              }
              setTimeout(() => updateSliderIndicator(listId), 0);
            }
            setEditingTask(null);
            closeSearch();
          }}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // 垃圾箱视图
  if (isTrashView) {
    const formatDeletedDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    return (
      <div className="app">
        {renderSidebar()}
        <div className="main-content trash-view">
          <div className="content-header">
            <div className="header-top">
              <h2 className="content-title">垃圾箱</h2>
              {deletedTasks.length > 0 && (
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: '清空垃圾箱',
                      message: '确定要清空垃圾箱吗？此操作不可恢复。',
                      danger: true,
                      onConfirm: () => {
                        emptyTrash();
                        setConfirmModal({ isOpen: false });
                      }
                    });
                  }}
                >
                  <Icon name="trash-2" className="btn-icon" />
                  清空垃圾箱
                </button>
              )}
            </div>
          </div>

          <div className="task-list">
            {deletedTasks.length === 0 ? (
              <div className="task-empty">
                <div className="task-empty-icon-wrapper">
                  <Icon name="trash-2" />
                </div>
                <div className="task-empty-text">垃圾箱是空的</div>
                <div className="task-empty-hint">删除的任务会出现在这里</div>
              </div>
            ) : (
              <>
                <div className="task-list-header">
                  <span className="task-count">
                    {deletedTasks.length} 个已删除任务
                  </span>
                </div>
                {[...deletedTasks].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt)).map(task => (
                  <div
                    key={task.id}
                    className="task-item"
                  >
                    <div className="task-checkbox" style={{ backgroundColor: 'var(--bg-tertiary)', cursor: 'default' }}>
                      <Icon name="trash-2" size={12} />
                    </div>
                    
                    <div className="task-content">
                      <div className="task-title">{task.title}</div>
                      <div className="task-meta">
                        <span className="task-due-date">
                          <Icon name="calendar" size={12} />
                          {task.dueDate ? formatDueDate(new Date(task.dueDate)) : '无截止日期'}
                        </span>
                        <span className="task-deleted-date">
                          <Icon name="clock" size={12} />
                          删除于 {formatDeletedDate(task.deletedAt)}
                        </span>
                        {task.deleteReason && (
                          <span className="task-delete-reason">
                            <Icon name="trash-2" size={12} />
                            {task.deleteReason}
                          </span>
                        )}
                        {task.linkUrl && (
                          <button
                            className="task-link-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.electronAPI && window.electronAPI.openExternal) {
                                window.electronAPI.openExternal(task.linkUrl);
                              } else {
                                window.open(task.linkUrl, '_blank');
                              }
                            }}
                            title={task.linkUrl}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            链接
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="task-actions">
                      <button 
                        className="task-action-btn restore"
                        onClick={(e) => {
                          e.stopPropagation();
                          restoreTask(task.id);
                        }}
                        title="恢复"
                      >
                        <Icon name="rotate-ccw" />
                      </button>
                      <button 
                        className="task-action-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            title: '永久删除任务',
                            message: '确定要永久删除这个任务吗？此操作不可恢复。',
                            danger: true,
                            onConfirm: () => {
                              permanentDeleteTask(task.id);
                              setConfirmModal({ isOpen: false });
                            }
                          });
                        }}
                        title="永久删除"
                      >
                        <Icon name="x" />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={closeSearch}
          tasks={tasks}
          lists={lists}
          tags={tags}
          deletedTasks={deletedTasks}
          onSelectTask={({ task, listId, type, tagId }) => {
            if (type === 'tag') {
              setActiveListId('tags');
              setHighlightedTagId(tagId);
              setTimeout(() => updateSliderIndicator('tags'), 0);
            } else if (type === 'trash') {
              setActiveListId('trash');
              setTimeout(() => updateSliderIndicator('trash'), 0);
            } else {
              setActiveListId(listId);
              if (task) {
                setSelectedTaskId(task.id);
                if ((type === 'calendar' || type === 'done' || type === 'todo') && task.dueDate) {
                  setHighlightedTaskId(task.id);
                } else if (type === 'todo') {
                  setHighlightedTaskId(task.id);
                }
              }
              setTimeout(() => updateSliderIndicator(listId), 0);
            }
            setEditingTask(null);
            closeSearch();
          }}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // 仪表盘视图
  if (isHomeView) {
    const handleDashboardNavigate = (view) => {
      setActiveListId(view);
      setTimeout(() => updateSliderIndicator(view), 0);
    };

    const handleDashboardTaskClick = (task) => {
      setSelectedTaskId(task.id);
      if (task.listId === 'todo' || task.listId === 'done') {
        setActiveListId(task.listId);
        setHighlightedTaskId(task.id);
        setTimeout(() => updateSliderIndicator(task.listId), 0);
      }
    };

    return (
      <div className="app">
        {renderSidebar()}
        <div className="main-content dashboard-view">
          <Dashboard
            tasks={tasks}
            onNavigate={handleDashboardNavigate}
            onTaskClick={handleDashboardTaskClick}
          />
        </div>
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={closeSearch}
          tasks={tasks}
          lists={lists}
          tags={tags}
          deletedTasks={deletedTasks}
          onSelectTask={({ task, listId, type, tagId }) => {
            if (type === 'tag') {
              setActiveListId('tags');
              setHighlightedTagId(tagId);
              setTimeout(() => updateSliderIndicator('tags'), 0);
            } else if (type === 'trash') {
              setActiveListId('trash');
              setTimeout(() => updateSliderIndicator('trash'), 0);
            } else {
              setActiveListId(listId);
              if (task) {
                setSelectedTaskId(task.id);
                if ((type === 'calendar' || type === 'done' || type === 'todo') && task.dueDate) {
                  setHighlightedTaskId(task.id);
                } else if (type === 'todo') {
                  setHighlightedTaskId(task.id);
                }
              }
              setTimeout(() => updateSliderIndicator(listId), 0);
            }
            setEditingTask(null);
            closeSearch();
          }}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // 日历视图
  if (isCalendarView) {
    return (
      <div className="app">
        {renderSidebar()}
        <div className="main-content calendar-view">
          <Calendar highlightedTaskId={highlightedTaskId} showToast={showToast} />
        </div>
        <GlobalSearch
          isOpen={isSearchOpen}
          onClose={closeSearch}
          tasks={tasks}
          lists={lists}
          tags={tags}
          deletedTasks={deletedTasks}
          onSelectTask={({ task, listId, type, tagId }) => {
            if (type === 'tag') {
              setActiveListId('tags');
              setHighlightedTagId(tagId);
              setTimeout(() => updateSliderIndicator('tags'), 0);
            } else if (type === 'trash') {
              setActiveListId('trash');
              setTimeout(() => updateSliderIndicator('trash'), 0);
            } else {
              setActiveListId(listId);
              if (task) {
                setSelectedTaskId(task.id);
                if ((type === 'calendar' || type === 'done' || type === 'todo') && task.dueDate) {
                  setHighlightedTaskId(task.id);
                } else if (type === 'todo') {
                  setHighlightedTaskId(task.id);
                }
              }
              setTimeout(() => updateSliderIndicator(listId), 0);
            }
            setEditingTask(null);
            closeSearch();
          }}
        />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    );
  }

  // 任务列表视图
  return (
    <div className="app">
      {renderSidebar()}
      <div className="main-content">
        {renderMainContent()}
      </div>

      <div className="shortcut-hint">
        <div className="shortcut-title">快捷键</div>
        <div className="shortcut-item">
          <span>快速添加</span>
          <span className="shortcut-key">Ctrl+N</span>
        </div>
        <div className="shortcut-item">
          <span>完成任务</span>
          <span className="shortcut-key">Ctrl+D</span>
        </div>
        <div className="shortcut-item">
          <span>全局搜索</span>
          <span className="shortcut-key">Ctrl+F</span>
        </div>
      </div>
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={closeSearch}
        tasks={tasks}
        lists={lists}
        tags={tags}
        onSelectTask={({ task, listId, type, tagId }) => {
          // 切换到对应的视图
          if (type === 'tag') {
            // 标签类型 - 跳转到标签视图
            setActiveListId('tags');
            setHighlightedTagId(tagId);
            setTimeout(() => updateSliderIndicator('tags'), 0);
          } else {
            // 任务类型 - 跳转到对应列表
            setActiveListId(listId);
            if (task) {
              setSelectedTaskId(task.id);
              // 所有任务类型都设置高亮（用于日历视图和任务列表高亮）
              if ((type === 'calendar' || type === 'done' || type === 'todo') && task.dueDate) {
                setHighlightedTaskId(task.id);
              } else if (type === 'todo') {
                // 待办任务也设置高亮用于任务列表显示
                setHighlightedTaskId(task.id);
              }
            }
            setTimeout(() => updateSliderIndicator(listId), 0);
          }
          setEditingTask(null);
          closeSearch();
        }}
      />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        danger={confirmModal.danger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
      {(noteModal.isOpen || noteModalClosing) && (
        <div className={`modal-overlay ${noteModalClosing ? 'modal-closing' : ''}`} onClick={() => setNoteModalClosing(true) || setTimeout(() => setNoteModal({ isOpen: false, taskId: null, note: '' }), 200)}>
          <div className={`modal-content note-modal ${noteModalClosing ? 'modal-content-closing' : ''}`} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>添加备注</h3>
              <button className="modal-close-btn" onClick={() => setNoteModalClosing(true) || setTimeout(() => setNoteModal({ isOpen: false, taskId: null, note: '' }), 200)}>
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>备注内容</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={noteModal.note}
                  onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
                  placeholder="输入备注信息..."
                  autoFocus
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setNoteModalClosing(true) || setTimeout(() => setNoteModal({ isOpen: false, taskId: null, note: '' }), 200)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={async () => {
                setNoteModalClosing(true);
                await updateTask(noteModal.taskId, { note: noteModal.note });
                setTimeout(() => {
                  setNoteModalClosing(false);
                  setNoteModal({ isOpen: false, taskId: null, note: '' });
                  showToast('备注已保存');
                }, 200);
              }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

export default App;
