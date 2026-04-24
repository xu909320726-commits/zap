import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Icon from './Icon';

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
  'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
];

const getGradient = (title) => {
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return GRADIENT_COLORS[hash % GRADIENT_COLORS.length];
};

const getPlainText = (markdown) => {
  if (!markdown) return '';
  return markdown
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
};

const formatRelativeTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const NoteCard = React.memo(function NoteCard({ note, onOpen, onDelete, isNew, cardRef, onDeleteWithAnimation }) {
  const gradient = useMemo(() => getGradient(note.title || note.content || note.id || 'Note'), [note.title, note.content, note.id]);
  
  const randomSeed = useMemo(() => Math.random(), []);
  const cardHeight = useMemo(() => isNew ? null : 300 + Math.floor(randomSeed * 500), [isNew, randomSeed]);

  const [isHovered, setIsHovered] = React.useState(false);

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete();
  };

  return (
    <div 
      ref={cardRef}
      onClick={onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="note-card"
      style={{
        position: 'relative',
        width: '100%',
        ...(cardHeight && { minHeight: `${cardHeight}px` }),
        borderRadius: '20px',
        overflow: 'visible',
        background: gradient,
        boxShadow: isHovered ? '0 16px 48px rgba(0,0,0,0.25)' : '0 4px 16px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'width 0.3s ease, minHeight 0.3s ease, maxHeight 0.3s ease, transform 0.25s ease-out, box-shadow 0.25s ease-out',
      }}
    >
      <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {isNew ? (
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: 0,
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              opacity: 0.6,
              transition: 'opacity 0.3s ease',
              flexShrink: 0,
            }}
              className="new-note-icon"
            >
              <Icon name="plus" style={{ width: 32, height: 32, color: '#667eea' }} />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ 
              margin: 0, 
              fontSize: '16px', 
              fontWeight: '700', 
              color: '#fff',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              textShadow: '0 1px 3px rgba(0,0,0,0.2)',
              lineHeight: '1.4'
            }}>
              {note.title || '无标题'}
            </h3>
          </div>
        )}
      </div>
      
      {!isNew && (
        <button
          onClick={handleDeleteClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.1)';
            e.stopPropagation();
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          style={{
            position: 'absolute',
            right: '12px',
            bottom: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transform: 'scale(1)',
            transition: 'opacity 0.25s ease-out, transform 0.2s ease-out',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 100,
          }}
          title="删除笔记"
        >
          <Icon name="trash-2" style={{ width: 16, height: 16, color: '#ef4444' }} />
        </button>
      )}
    </div>
  );
});

export default function NotesList({ notes, onSelectNote, onDeleteNote, onNewNote, searchQuery, onSearchChange, onFadeOutStart, animationKey }) {
  const [viewMode, setViewMode] = useState('grid');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deletingCardId, setDeletingCardId] = useState(null);
  const [animatedCardIds, setAnimatedCardIds] = useState(new Set());
  const [columns, setColumns] = useState(4);
  const [viewModeAnimationKey, setViewModeAnimationKey] = useState(0);
  const cardRefs = useRef({});
  
  useEffect(() => {
    if (animationKey !== undefined) {
      setAnimatedCardIds(new Set());
    }
  }, [animationKey]);

  const filteredNotes = useMemo(() => {
    if (!searchQuery) return notes;
    const query = searchQuery.toLowerCase();
    return notes.filter(n => 
      n.title.toLowerCase().includes(query) || 
      getPlainText(n.content).toLowerCase().includes(query)
    );
  }, [notes, searchQuery]);

  useEffect(() => {
    const calculateColumns = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width < 640) setColumns(1);
      else if (width < 800) setColumns(2);
      else if (width < 1200) setColumns(3);
      else if (width < 1600) setColumns(4);
      else setColumns(5);
    };

    calculateColumns();
    window.addEventListener('resize', calculateColumns);
    return () => window.removeEventListener('resize', calculateColumns);
  }, []);

  const distributeToColumns = (items, numColumns) => {
    const cols = Array.from({ length: numColumns }, () => []);
    items.forEach((item, i) => {
      cols[i % numColumns].push(item);
    });
    return cols;
  };

  const columnData = useMemo(() => distributeToColumns(filteredNotes, columns), [filteredNotes, columns]);

  const handleDeleteWithAnimation = useCallback((noteId) => {
    setDeleteConfirm(noteId);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteConfirm) {
      setDeletingCardId(deleteConfirm);
      setTimeout(() => {
        onDeleteNote(deleteConfirm);
        setDeletingCardId(null);
        setDeleteConfirm(null);
      }, 400);
    }
  }, [deleteConfirm, onDeleteNote]);

  const getListItemStyle = () => ({
    padding: '16px',
    borderRadius: '12px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  return (
    <div className="notes-list-container" style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <div style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              opacity: 0.5,
              transition: 'opacity 0.2s'
            }}>
              <Icon name="search" style={{ width: 18, height: 18, color: 'var(--text-secondary)' }} />
            </div>
            <input
              type="text"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px 14px 48px',
                borderRadius: '14px',
                border: '2px solid transparent',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                transition: 'all 0.25s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--primary-color)';
                e.target.style.boxShadow = '0 2px 12px rgba(102, 126, 234, 0.15)';
                e.target.previousSibling.style.opacity = '1';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'transparent';
                e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                e.target.previousSibling.style.opacity = '0.5';
              }}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  opacity: 0.6,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
              >
                <Icon name="x" style={{ width: 12, height: 12, color: 'var(--text-secondary)' }} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '12px', background: 'var(--bg-tertiary)', transition: 'all 0.3s ease' }}>
            <button
              onClick={() => {
                setViewMode('grid');
                setViewModeAnimationKey(prev => prev + 1);
                setAnimatedCardIds(new Set());
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--primary-color)' : 'transparent',
                color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: viewMode === 'grid' ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: viewMode === 'grid' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              <Icon name="grid" />
            </button>
            <button
              onClick={() => {
                setViewMode('list');
                setViewModeAnimationKey(prev => prev + 1);
                setAnimatedCardIds(new Set());
              }}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'list' ? 'var(--primary-color)' : 'transparent',
                color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: viewMode === 'list' ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: viewMode === 'list' ? '0 2px 8px rgba(0,0,0,0.15)' : 'none'
              }}
            >
              <Icon name="list" />
            </button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative', background: 'transparent' }}>
        <div key={viewModeAnimationKey} style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', opacity: 1, transform: 'translateY(0)' }}>
          {viewMode === 'grid' ? (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', overflow: 'visible' }}>
              {columnData.map((col, colIndex) => (
                <div key={colIndex} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'visible', padding: '15px 5px 0 5px', transition: 'flex 0.3s ease' }}>
                  {colIndex === 0 && (
                    <div ref={el => cardRefs.current['__new__'] = el} style={{ marginBottom: '8px' }} className="note-card-wrapper">
                      <NoteCard
                        note={{ id: '__new__', title: '', content: '', updatedAt: new Date().toISOString() }}
                        onOpen={onNewNote}
                        onDelete={() => {}}
                        onDeleteWithAnimation={() => {}}
                        isNew={true}
                      />
                    </div>
                  )}
                  {col.map((note, noteIndex) => {
                    const globalIndex = colIndex * col.length + noteIndex;
                    const isDeleting = deletingCardId === note.id;
                    const hasAnimated = animatedCardIds.has(note.id);
                    const isNewCard = !hasAnimated && !isDeleting;
                    return (
                      <div 
                        key={note.id} 
                        ref={el => cardRefs.current[note.id] = el} 
                        style={{ 
                          overflow: 'visible', 
                          zIndex: 1, 
                          '--card-index': globalIndex
                        }} 
                        className={`note-card-wrapper${isDeleting ? ' note-card-delete' : ''}${isNewCard ? ' note-card-scroll-in' : ''}`} 
                        onAnimationEnd={() => setAnimatedCardIds(prev => new Set([...prev, note.id]))}
                      >
                        <NoteCard
                          note={note}
                          onOpen={() => !isDeleting && onSelectNote(note)}
                          onDelete={() => handleDeleteWithAnimation(note.id)}
                          onDeleteWithAnimation={handleDeleteWithAnimation}
                          isNew={false}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div>
              <div 
                onClick={onNewNote}
                style={getListItemStyle()}
                ref={el => cardRefs.current['__new__'] = el}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}>
                    <Icon name="plus" style={{ width: 22, height: 22, color: '#fff' }} />
                  </div>
                  <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500' }}>新建笔记</span>
                </div>
              </div>
              {filteredNotes.map((note, index) => {
                const isDeleting = deletingCardId === note.id;
                const hasAnimated = animatedCardIds.has(note.id);
                const isNewCard = !hasAnimated && !isDeleting;
                return (
                  <div 
                    key={note.id} 
                    ref={el => cardRefs.current[note.id] = el}
                    onClick={() => !isDeleting && onSelectNote(note)}
                    style={getListItemStyle()}
                    className={`note-card-wrapper${isDeleting ? ' note-card-delete' : ''}${isNewCard ? ' note-card-scroll-in' : ''}`}
                    onAnimationEnd={() => setAnimatedCardIds(prev => new Set([...prev, note.id]))}
                    onMouseEnter={(e) => {
                      if (!isDeleting) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ 
                        width: '44px', 
                        height: '44px', 
                        borderRadius: '12px',
                        background: getGradient(note.title || note.content || note.id),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon name="file-text" style={{ width: 20, height: 20, color: '#fff' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {note.title || '无标题'}
                        </h3>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '13px', 
                          color: 'var(--text-secondary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {getPlainText(note.content) || '空白笔记'}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {formatRelativeTime(note.updatedAt)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteWithAnimation(note.id); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'aliceblue',
                            padding: '4px',
                            opacity: 0.5,
                            transition: 'opacity 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                        >
                          <Icon name="trash-2" style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {deleteConfirm && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }} onClick={() => setDeleteConfirm(null)}>
            <div style={{
              background: 'var(--bg-primary)',
              padding: '24px',
              borderRadius: '16px',
              maxWidth: '320px',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-primary)' }}>确认删除</h3>
              <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>删除后笔记将进入回收站，是否继续？</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ff3b30',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
