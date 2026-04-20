import React, { useRef, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { TIMING } from '../constants';

function Sidebar({
  lists,
  tags,
  activeListId,
  expandedMenus,
  onToggleMenu,
  onSetActiveList,
  onAddList,
  onDeleteList,
  isDarkTheme,
  isPulling,
  isPushing,
  onPull,
  onPush,
  onShowTokenModal,
  onToggleTheme,
  theme,
  getTaskCount,
  MENU_CONFIG
}) {
  const menuSectionRef = useRef(null);
  const activeItemRef = useRef('todo');
  const [indicatorStyle, setIndicatorStyle] = React.useState({ transform: 'translateX(-100%) translateY(0)', width: '0px', height: '0px', opacity: 0 });
  const menuItemRefs = useRef({});

  const updateSliderIndicator = useCallback((itemId) => {
    const element = menuItemRefs.current[itemId];
    if (!element || !menuSectionRef.current) return;

    const menuRect = menuSectionRef.current.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();

    setIndicatorStyle({
      transform: `translateX(${itemRect.left - menuRect.left}px) translateY(${itemRect.top - menuRect.top}px)`,
      width: `${itemRect.width}px`,
      height: `${itemRect.height}px`,
      opacity: 1
    });
  }, []);

  useEffect(() => {
    activeItemRef.current = activeListId;
    setTimeout(() => {
      updateSliderIndicator(activeListId);
    }, TIMING.SLIDER_ANIMATION_DELAY);
  }, [activeListId, updateSliderIndicator]);

  useEffect(() => {
    if (lists.length > 0) {
      setTimeout(() => updateSliderIndicator(activeItemRef.current), TIMING.SLIDER_ANIMATION_DELAY);
    }
  }, [lists, updateSliderIndicator]);

  useEffect(() => {
    const checkActiveItemVisibility = () => {
      for (const [menuKey, menu] of Object.entries(MENU_CONFIG)) {
        if (menu.children && menu.children.length > 0) {
          const isMenuExpanded = expandedMenus.includes(menuKey);
          const isChildActive = menu.children.some(child => child.id === activeListId);
          
          if (isChildActive && !isMenuExpanded) {
            setIndicatorStyle(prev => ({
              ...prev,
              opacity: 0,
              height: '0px'
            }));
            return;
          }
        }
      }
      
      const isListActive = lists.some(list => list.id === activeListId && !list.isDefault);
      
      if (isListActive && !expandedMenus.includes('task')) {
        const taskChildren = MENU_CONFIG.task?.children || [];
        const isChildOfTask = taskChildren.some(child => child.id === activeListId);
        if (isChildOfTask) {
          setIndicatorStyle(prev => ({
            ...prev,
            opacity: 0,
            height: '0px'
          }));
          return;
        }
      }
      
      if (activeListId && menuItemRefs.current[activeListId]) {
        setIndicatorStyle(prev => ({
          ...prev,
          opacity: 1
        }));
      }
    };
    
    checkActiveItemVisibility();
  }, [expandedMenus, activeListId, lists]);

  const handleListClick = useCallback((listId) => {
    activeItemRef.current = listId;
    onSetActiveList(listId);
  }, [onSetActiveList]);

  const toggleMenu = useCallback((menuKey) => {
    onToggleMenu(menuKey);
  }, [onToggleMenu]);

  return (
    <div className="sidebar" style={{ backgroundColor: isDarkTheme ? '#1e1e1e' : '#f5f5f5' }}>
      <div className="sidebar-header" onClick={() => handleListClick('home')}>
        <h1 className="sidebar-title">
          <Icon name="zap" className="sidebar-title-icon" />
          Zap
        </h1>
      </div>
      
      <button className="quick-add-btn" onClick={() => {
        handleListClick('todo');
      }}>
        <Icon name="plus" className="quick-add-btn-icon" />
        <span>添加任务</span>
      </button>
      
      <div className="menu-section" ref={menuSectionRef} style={{ position: 'relative' }}>
        <div className="menu-slider-indicator" style={indicatorStyle} />
        
        {Object.entries(MENU_CONFIG).map(([menuKey, menu]) => (
          <div key={menuKey} className="menu-group">
            <div 
              ref={el => menuItemRefs.current[menuKey] = el}
              className={`menu-item ${menu.children.length > 0 ? 'has-children' : ''} ${menu.children.length > 0 ? (expandedMenus.includes(menuKey) ? 'active' : '') : (activeListId === menuKey ? 'active' : '')}`}
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
                
                {menuKey === 'task' && lists.filter(l => !l.isDefault && l.id !== 'todo').map(list => (
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

      <div className="sidebar-actions">
        <button 
          className={`sidebar-action-btn ${isPulling ? 'syncing' : ''}`}
          onClick={onPull}
          title="从云端拉取"
          disabled={isPulling || isPushing}
        >
          <Icon name="cloud-download" />
        </button>
        <button 
          className={`sidebar-action-btn ${isPushing ? 'syncing' : ''}`}
          onClick={onPush}
          title="上传到云端"
          disabled={isPulling || isPushing}
        >
          <Icon name="cloud-upload" />
        </button>
        <button 
          className="sidebar-action-btn"
          onClick={onShowTokenModal}
          title="设置"
        >
          <Icon name="settings" />
        </button>
        <button 
          className="sidebar-action-btn"
          onClick={onToggleTheme}
          title={theme === 'light' ? '暗色模式' : (theme === 'dark' ? '浅色模式' : '跟随系统')}
        >
          <Icon name={theme === 'light' ? 'moon' : (theme === 'dark' ? 'sun' : 'monitor')} />
        </button>
      </div>
    </div>
  );
}

export default Sidebar;