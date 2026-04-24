import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { marked } from 'marked';
import Icon from './Icon';

// 配置marked选项
marked.setOptions({
  breaks: true,
  gfm: true
});

export default function NoteEditorModal({ note, onSave, onClose, isNew }) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [renderedContent, setRenderedContent] = useState('');
  const [imageMap, setImageMap] = useState(new Map());
  const [displayContent, setDisplayContent] = useState(note?.content || '');
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [currentImage, setCurrentImage] = useState('');
  const editorRef = useRef(null);
  
  // 处理图片点击事件
  const handleImageClick = (imageSrc) => {
    setCurrentImage(imageSrc);
    setShowImageViewer(true);
  };

  useEffect(() => {
    const parseMarkdown = async () => {
      try {
        let processedContent = content || '';
        
        // 创建自定义渲染器，为图片添加点击事件
        const renderer = new marked.Renderer();
        renderer.image = function(href, title, text) {
          return `<img src="${href}" alt="${text}" title="${title || ''}" class="note-image" data-src="${href}" style="cursor: pointer; max-width: 100%; height: auto;" />`;
        };
        
        // 使用自定义渲染器
        const result = await marked.parse(processedContent, { renderer });
        setRenderedContent(result);
      } catch (e) {
        console.error('marked.parse error:', e);
        console.error('Error stack:', e.stack);
        setRenderedContent(content || '');
      }
    };
    parseMarkdown();
  }, [content]);
  
  // 添加事件监听器，处理图片点击
  useEffect(() => {
    const previewElement = document.querySelector('.editor-preview');
    if (previewElement) {
      const handleClick = (e) => {
        if (e.target.classList.contains('note-image')) {
          const imageSrc = e.target.dataset.src;
          handleImageClick(imageSrc);
        }
      };
      previewElement.addEventListener('click', handleClick);
      return () => previewElement.removeEventListener('click', handleClick);
    }
  }, [renderedContent]);

  useEffect(() => {
    console.log('renderedContent changed:', renderedContent);
  }, [renderedContent]);

  useEffect(() => {
    console.log('content changed:', content);
  }, [content]);

  const originalContent = note?.content || '';
  const originalTitle = note?.title || '';

  useEffect(() => {
    setTitle(note?.title || '');
    const noteContent = note?.content || '';
    
    // 初始化 imageMap，从内容中提取 base64 图片
    const newImageMap = new Map();
    let displayContent = noteContent;
    
    // 查找内容中的 base64 图片
    const base64Regex = /!\[图片\]\((data:image\/[^;]+;base64,[^)]+)\)/g;
    let match;
    let offset = 0;
    
    while ((match = base64Regex.exec(noteContent)) !== null) {
      const base64Image = match[1];
      const imageId = `image_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      newImageMap.set(imageId, base64Image);
      
      // 计算替换的位置和长度
      const start = match.index + offset;
      const length = match[0].length;
      const placeholder = `![图片](${imageId})`;
      
      // 替换内容
      displayContent = displayContent.substring(0, start) + placeholder + displayContent.substring(start + length);
      offset += placeholder.length - length;
    }
    
    setImageMap(newImageMap);
    setContent(noteContent);
    setDisplayContent(displayContent);
    setHasChanges(false);
  }, [note?.id]);

  const handleSave = useCallback(() => {
    onSave({ ...note, title, content });
    setHasChanges(false);
  }, [note, title, content, onSave]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      setIsClosing(true);
    }
  }, [hasChanges]);

  const handleContentChange = useCallback((e) => {
    const newValue = e.target.value;
    setDisplayContent(newValue);
    
    // 同步更新 content，处理图片占位符
    let updatedContent = newValue;
    imageMap.forEach((base64Image, imageId) => {
      const placeholder = `![图片](${imageId})`;
      const imageMarkdown = `![图片](${base64Image})`;
      updatedContent = updatedContent.split(placeholder).join(imageMarkdown);
    });
    setContent(updatedContent);
    
    const changed = title !== originalTitle || updatedContent !== originalContent;
    setHasChanges(changed);
  }, [title, originalTitle, originalContent, imageMap]);

  const handleTitleChange = useCallback((e) => {
    const newValue = e.target.value;
    setTitle(newValue);
    const changed = newValue !== originalTitle || content !== originalContent;
    setHasChanges(changed);
  }, [content, originalTitle, originalContent]);

  const handlePaste = useCallback((e) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          const imageId = `image_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const placeholder = `![图片](${imageId})`;
          const imageMarkdown = `![图片](${base64Image})`;
          
          // 更新 imageMap
          setImageMap(prev => new Map(prev).set(imageId, base64Image));
          
          // 更新 displayContent（显示占位符）
          setDisplayContent(prev => {
            return prev.substring(0, start) + placeholder + prev.substring(end);
          });
          
          // 更新 content（存储完整的 base64 图片）
          setContent(prev => {
            return prev.substring(0, start) + imageMarkdown + prev.substring(end);
          });
          
          setHasChanges(true);

          requestAnimationFrame(() => {
            textarea.focus();
            textarea.selectionStart = start + placeholder.length;
            textarea.selectionEnd = start + placeholder.length;
          });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  }, []);

  const insertMarkdown = useCallback((syntax) => {
    const textarea = editorRef.current;
    if (!textarea) {
      console.log('textarea is null');
      return;
    }

    textarea.focus();

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = displayContent.substring(start, end);

    console.log('insertMarkdown called:', syntax, 'start:', start, 'end:', end, 'selectedText:', selectedText);

    let before = '';
    let after = '';
    let newCursorStart = 0;
    let newCursorEnd = 0;

    const isMultiline = selectedText.includes('\n');

    const wrapSyntaxes = { bold: '**', italic: '*', strike: '~~', code: '`' };
    const wrapMarker = wrapSyntaxes[syntax];

    console.log('wrapMarker:', wrapMarker);

    if (wrapMarker) {
      if (selectedText.startsWith(wrapMarker) && selectedText.endsWith(wrapMarker) && selectedText.length >= wrapMarker.length * 2) {
        const unwrapped = selectedText.substring(wrapMarker.length, selectedText.length - wrapMarker.length);
        const newDisplayContent = displayContent.substring(0, start) + unwrapped + displayContent.substring(end);
        setDisplayContent(newDisplayContent);
        
        // 同步更新 content，处理图片占位符
        let updatedContent = newDisplayContent;
        imageMap.forEach((base64Image, imageId) => {
          const placeholder = `![图片](${imageId})`;
          const imageMarkdown = `![图片](${base64Image})`;
          updatedContent = updatedContent.split(placeholder).join(imageMarkdown);
        });
        setContent(updatedContent);
        
        setHasChanges(true);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.selectionStart = start;
          textarea.selectionEnd = start + unwrapped.length;
        });
        return;
      }

      const beforeText = displayContent.substring(0, start);
      const afterText = displayContent.substring(end);
      if (beforeText.endsWith(wrapMarker) && afterText.startsWith(wrapMarker)) {
        const innerStart = start - wrapMarker.length;
        const innerEnd = end + wrapMarker.length;
        const innerText = displayContent.substring(innerStart, innerEnd);
        const unwrapped = innerText.substring(wrapMarker.length, innerText.length - wrapMarker.length);
        const newDisplayContent = displayContent.substring(0, innerStart) + unwrapped + displayContent.substring(innerEnd);
        setDisplayContent(newDisplayContent);
        
        // 同步更新 content，处理图片占位符
        let updatedContent = newDisplayContent;
        imageMap.forEach((base64Image, imageId) => {
          const placeholder = `![图片](${imageId})`;
          const imageMarkdown = `![图片](${base64Image})`;
          updatedContent = updatedContent.split(placeholder).join(imageMarkdown);
        });
        setContent(updatedContent);
        
        setHasChanges(true);
        requestAnimationFrame(() => {
          textarea.focus();
          textarea.selectionStart = innerStart;
          textarea.selectionEnd = innerStart + unwrapped.length;
        });
        return;
      }

      before = wrapMarker;
      after = wrapMarker;
      
      const replacement = before + (selectedText || '') + after;
      const newDisplayContent = displayContent.substring(0, start) + replacement + displayContent.substring(end);
      setDisplayContent(newDisplayContent);
      
      // 同步更新 content，处理图片占位符
      let updatedContent = newDisplayContent;
      imageMap.forEach((base64Image, imageId) => {
        const placeholder = `![图片](${imageId})`;
        const imageMarkdown = `![图片](${base64Image})`;
        updatedContent = updatedContent.split(placeholder).join(imageMarkdown);
      });
      setContent(updatedContent);
      
      setHasChanges(true);

      requestAnimationFrame(() => {
        textarea.focus();
        if (selectedText) {
          textarea.selectionStart = start + before.length;
          textarea.selectionEnd = start + before.length + selectedText.length;
        } else {
          textarea.selectionStart = start + before.length;
          textarea.selectionEnd = start + before.length;
        }
      });
      return;
    } else if (isMultiline && (syntax === 'ul' || syntax === 'ol' || syntax === 'quote')) {
      const lines = selectedText.split('\n');
      let prefix = '';
      switch (syntax) {
        case 'ul': prefix = '* '; break;
        case 'ol': prefix = '1. '; break;
        case 'quote': prefix = '> '; break;
        default: break;
      }

      const processedLines = lines.map((line, index) => {
        if (line.trim() === '') return line;
        const linePrefix = syntax === 'ol' ? `${index + 1}. ` : prefix;
        if (line.startsWith(linePrefix)) return line.substring(linePrefix.length);
        return linePrefix + line;
      });

      const replacement = processedLines.join('\n');
      const newDisplayContent = displayContent.substring(0, start) + replacement + displayContent.substring(end);
      setDisplayContent(newDisplayContent);
      
      // 同步更新 content，处理图片占位符
      let updatedContent = newDisplayContent;
      imageMap.forEach((base64Image, imageId) => {
        const placeholder = `![图片](${imageId})`;
        const imageMarkdown = `![图片](${base64Image})`;
        updatedContent = updatedContent.split(placeholder).join(imageMarkdown);
      });
      setContent(updatedContent);
      
      setHasChanges(true);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = start;
        textarea.selectionEnd = start + replacement.length;
      });
      return;
    }

    switch (syntax) {
      case 'h1':
        before = '# ';
        after = '';
        break;
      case 'h2':
        before = '## ';
        after = '';
        break;
      case 'h3':
        before = '### ';
        after = '';
        break;
      case 'quote':
        before = '> ';
        after = '';
        break;
      case 'ul':
        before = '* ';
        after = '';
        break;
      case 'ol':
        before = '1. ';
        after = '';
        break;
      case 'link':
        before = '[';
        after = '](https://example.com)';
        break;
      case 'codeblock':
        before = '```\n';
        after = '\n```';
        break;
      case 'hr':
        before = '\n---\n';
        after = '';
        break;
      default:
        return;
    }

    const replacement = before + (selectedText || '') + after;
    const newDisplayContent = displayContent.substring(0, start) + replacement + displayContent.substring(end);
    setDisplayContent(newDisplayContent);
    
    // 同步更新 content，处理图片占位符
    let updatedContent = newDisplayContent;
    imageMap.forEach((base64Image, imageId) => {
      const placeholder = `![图片](${imageId})`;
      const imageMarkdown = `![图片](${base64Image})`;
      updatedContent = updatedContent.split(placeholder).join(imageMarkdown);
    });
    setContent(updatedContent);
    
    setHasChanges(true);

    requestAnimationFrame(() => {
      textarea.focus();
      if (selectedText) {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length + selectedText.length;
      } else {
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length;
      }
    });
  }, [displayContent, imageMap]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        handleClose();
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            insertMarkdown('bold');
            break;
          case 'i':
            e.preventDefault();
            insertMarkdown('italic');
            break;
          case 'k':
            e.preventDefault();
            insertMarkdown('link');
            break;
          case '1':
            e.preventDefault();
            insertMarkdown('h1');
            break;
          case '2':
            e.preventDefault();
            insertMarkdown('h2');
            break;
          case '3':
            e.preventDefault();
            insertMarkdown('h3');
            break;
          default:
            break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleClose, insertMarkdown]);

  return (
    <div className={`note-editor-overlay${isClosing ? ' closing' : ''}`} onAnimationEnd={() => { if (isClosing) onClose(); }}>
      <div className="note-editor-panel" onClick={e => e.stopPropagation()}>
        <header className="note-editor-header">
          <button className="note-editor-close" onClick={(e) => { e.stopPropagation(); handleClose(); }}>
            <Icon name="chevron-left" />
          </button>
          <div className="note-editor-title-wrap">
            <input
              type="text"
              className="note-editor-title"
              value={title}
              onChange={handleTitleChange}
              placeholder="无标题笔记"
            />
            <span className="note-editor-status">
              {hasChanges ? (
                <><span className="status-dot unsaved"></span>未保存</>
              ) : (
                <><span className="status-dot saved"></span>已保存</>
              )}
            </span>
          </div>
          <button className="note-editor-save-btn" onClick={handleSave} disabled={!hasChanges}>
            <Icon name="check" />
            保存
          </button>
        </header>

        <div className="note-editor-body">
          <div className="markdown-editor">
            <div className="editor-toolbar">
              <button title="标题 1 (Ctrl+1)" onClick={() => insertMarkdown('h1')}>
                <Icon name="type" />
                <span>H1</span>
              </button>
              <button title="标题 2 (Ctrl+2)" onClick={() => insertMarkdown('h2')}>
                <Icon name="type" />
                <span>H2</span>
              </button>
              <button title="标题 3 (Ctrl+3)" onClick={() => insertMarkdown('h3')}>
                <Icon name="type" />
                <span>H3</span>
              </button>
              <div className="toolbar-divider"></div>
              <button title="粗体 (Ctrl+B)" onClick={() => insertMarkdown('bold')}>
                <Icon name="bold" />
              </button>
              <button title="斜体 (Ctrl+I)" onClick={() => insertMarkdown('italic')}>
                <Icon name="italic" />
              </button>
              <button title="删除线" onClick={() => insertMarkdown('strike')}>
                <Icon name="strikethrough" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="引用" onClick={() => insertMarkdown('quote')}>
                <Icon name="quote" />
              </button>
              <button title="分割线" onClick={() => insertMarkdown('hr')}>
                <Icon name="minus" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="无序列表" onClick={() => insertMarkdown('ul')}>
                <Icon name="list" />
              </button>
              <button title="有序列表" onClick={() => insertMarkdown('ol')}>
                <Icon name="list-ordered" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="链接 (Ctrl+K)" onClick={() => insertMarkdown('link')}>
                <Icon name="link" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="行内代码" onClick={() => insertMarkdown('code')}>
                <Icon name="code" />
              </button>
              <button title="代码块" onClick={() => insertMarkdown('codeblock')}>
                <Icon name="code-2" />
              </button>
            </div>
            <div className="editor-container">
              <textarea
                ref={editorRef}
                className="editor-textarea"
                value={displayContent}
                onChange={handleContentChange}
                onPaste={handlePaste}
                spellCheck="false"
                placeholder="开始编写笔记..."
              />
              <div className="editor-preview" dangerouslySetInnerHTML={{ __html: renderedContent }} />
            </div>
          </div>
        </div>

        <footer className="note-editor-footer">
          <span className="note-editor-hint">
            <Icon name="keyboard" />
            Ctrl + S 保存 · Esc 关闭 · Ctrl + B 粗体 · Ctrl + I 斜体 · Ctrl + K 链接
          </span>
        </footer>

        {showConfirm && (
          <div className="note-confirm-mask" onClick={() => setShowConfirm(false)}>
            <div className="note-confirm-dialog" onClick={e => e.stopPropagation()}>
              <div className="note-confirm-icon">
                <Icon name="alert-circle" />
              </div>
              <h3>未保存的更改</h3>
              <p>确定要关闭吗？您的更改将丢失。</p>
              <div className="note-confirm-actions">
                <button className="note-btn note-btn-ghost" onClick={() => setShowConfirm(false)}>
                  取消
                </button>
                <button className="note-btn note-btn-danger" onClick={() => { setShowConfirm(false); setIsClosing(true); }}>
                  放弃
                </button>
                <button className="note-btn note-btn-primary" onClick={() => { handleSave(); setShowConfirm(false); setIsClosing(true); }}>
                  保存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 图片查看器 */}
      {showImageViewer && (
        <div className="image-viewer-overlay" onClick={() => setShowImageViewer(false)}>
          <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
            <button className="image-viewer-close" onClick={() => setShowImageViewer(false)}>
              <Icon name="x" />
            </button>
            <img src={currentImage} alt="预览图片" style={{ maxWidth: '90%', maxHeight: '90vh' }} />
          </div>
        </div>
      )}

      <style>{`
        .note-editor-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9996;
          padding: 24px;
          animation: overlayIn 0.2s ease;
        }

        .note-editor-overlay.closing {
          animation: overlayOut 0.3s ease forwards;
        }

        .note-editor-panel {
          width: 100%;
          max-width: 1100px;
          height: 90vh;
          background: var(--bg-primary);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-xl), 0 0 0 1px var(--border-light);
          animation: panelSlide 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .note-editor-overlay.closing .note-editor-panel {
          animation: panelSlideOut 0.3s ease forwards;
        }

        .note-editor-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
          background: var(--bg-secondary);
        }

        .note-editor-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .note-editor-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .note-editor-title-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }

        .note-editor-title {
          flex: 1;
          font-size: 18px;
          font-weight: 600;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text-primary);
          padding: 4px 0;
          min-width: 0;
        }

        .note-editor-title::placeholder {
          color: var(--text-muted);
        }

        .note-editor-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-muted);
          white-space: nowrap;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .status-dot.unsaved {
          background: var(--warning-color);
        }

        .status-dot.saved {
          background: var(--success-color);
        }

        .note-editor-save-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border: none;
          border-radius: var(--radius-md);
          background: var(--primary-color);
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .note-editor-save-btn:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }

        .note-editor-save-btn:disabled {
          background: var(--bg-tertiary);
          color: var(--text-muted);
          cursor: default;
        }

        .note-editor-body {
          flex: 1;
          overflow: hidden;
        }

        .note-editor-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding: 10px 20px;
          border-top: 1px solid var(--border-light);
          background: var(--bg-secondary);
        }

        .note-editor-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .note-confirm-mask {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          animation: fadeIn 0.15s ease;
        }

        .note-confirm-dialog {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: 28px;
          max-width: 340px;
          width: 90%;
          text-align: center;
          box-shadow: var(--shadow-lg);
          animation: dialogPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .note-confirm-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: white;
        }

        .note-confirm-dialog h3 {
          margin: 0 0 8px;
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .note-confirm-dialog p {
          margin: 0 0 24px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .note-confirm-actions {
          display: flex;
          gap: 8px;
        }

        .note-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .note-btn-ghost {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .note-btn-ghost:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .note-btn-danger {
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%);
          color: white;
        }

        .note-btn-danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.35);
        }

        .note-btn-primary {
          background: var(--primary-color);
          color: white;
        }

        .note-btn-primary:hover {
          background: var(--primary-hover);
          transform: translateY(-1px);
        }

        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes panelSlide {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes overlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes panelSlideOut {
          from { opacity: 1 transform: translateY(0) scale(1); }
          to { opacity: 0 transform: translateY(-30px) scale(0.95); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes dialogPop {
          from { opacity: 0 transform: scale(0.92); }
          to { opacity: 1 transform: scale(1); }
        }

        .markdown-editor {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .editor-toolbar button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 12px;
          border: 1px solid transparent;
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--text-secondary);
          font-size: 12px;
          cursor: pointer;
          transition: all var(--transition-normal);
          font-weight: 500;
        }

        .editor-toolbar button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
          border-color: var(--border-color);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .editor-toolbar button:hover svg {
          color: var(--primary-color);
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: var(--border-color);
          margin: 0 8px;
        }

        .editor-toolbar button span {
          font-size: 11px;
          font-weight: 600;
        }

        .editor-container {
          flex: 1;
          display: flex;
          overflow: hidden;
          border-top: 1px solid var(--border-color);
        }

        .editor-textarea {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
          outline: none;
          border: none;
          resize: none;
          font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace;
          font-size: 14px;
          line-height: 1.8;
          color: var(--text-primary);
          background: var(--bg-primary);
          border-right: 1px solid var(--border-color);
          tab-size: 2;
          transition: all var(--transition-normal);
        }

        .editor-textarea::placeholder {
          color: var(--text-muted);
          font-style: italic;
        }

        .editor-textarea:focus {
          background: var(--bg-primary);
          box-shadow: inset 0 0 0 2px var(--primary-lighter);
        }

        .editor-preview {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.8;
          color: var(--text-primary);
          background: var(--bg-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 28px 0 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--primary-color);
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview h2 {
          font-size: 24px;
          font-weight: 650;
          margin: 24px 0 12px;
          padding-left: 12px;
          border-left: 4px solid var(--primary-color);
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0 10px;
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview p {
          margin: 14px 0;
          line-height: 1.8;
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview ul,
        .editor-preview ol {
          padding-left: 24px;
          margin: 14px 0;
        }

        .editor-preview li {
          margin: 6px 0;
          line-height: 1.7;
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview li::marker {
          vertical-align: middle;
          color: var(--primary-color);
        }

        .editor-preview blockquote {
          border: none;
          border-left: 4px solid var(--primary-color);
          padding: 16px 20px;
          margin: 18px 0;
          background: var(--primary-lighter);
          border-radius: 0 var(--radius-md) var(--radius-md) 0;
          color: var(--text-secondary);
          font-style: normal;
          transition: all var(--transition-normal);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .editor-preview blockquote p {
          margin: 0;
        }

        .editor-preview pre {
          background: #1a1b26;
          padding: 20px 24px;
          border-radius: var(--radius-md);
          margin: 18px 0;
          overflow-x: auto;
          border: 1px solid rgba(255,255,255,0.08);
          transition: all var(--transition-normal);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .editor-preview pre code {
          background: transparent;
          padding: 0;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 13px;
          line-height: 1.6;
          color: #cdd6f4;
        }

        .editor-preview code {
          background: var(--bg-tertiary);
          padding: 3px 6px;
          border-radius: 4px;
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 12px;
          color: var(--primary-color);
          transition: all var(--transition-normal);
        }

        .editor-preview a {
          color: var(--primary-color);
          text-decoration: none;
          transition: all var(--transition-normal);
          position: relative;
        }

        .editor-preview a:hover {
          text-decoration: underline;
          color: var(--primary-hover);
        }

        .editor-preview a::after {
          content: '';
          position: absolute;
          width: 100%;
          height: 1px;
          bottom: -2px;
          left: 0;
          background-color: var(--primary-color);
          transform: scaleX(0);
          transform-origin: bottom right;
          transition: transform var(--transition-normal);
        }

        .editor-preview a:hover::after {
          transform: scaleX(1);
          transform-origin: bottom left;
        }

        .editor-preview hr {
          border: none;
          height: 1px;
          background: var(--border-color);
          margin: 28px 0;
          transition: all var(--transition-normal);
        }

        .editor-preview img {
          max-width: 100%;
          border-radius: var(--radius-md);
          transition: all var(--transition-normal);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        .editor-preview img:hover {
          transform: scale(1.02);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .editor-preview table {
          border-collapse: collapse;
          width: 100%;
          margin: 18px 0;
          transition: all var(--transition-normal);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .editor-preview th,
        .editor-preview td {
          border: 1px solid var(--border-color);
          padding: 12px 16px;
          text-align: left;
          transition: all var(--transition-normal);
        }

        .editor-preview th {
          background: var(--bg-secondary);
          font-weight: 600;
          color: var(--text-primary);
        }

        .editor-preview tr:hover {
          background: var(--bg-hover);
        }

        .editor-preview strong {
          font-weight: bold;
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview em {
          font-style: italic;
          color: var(--text-primary);
          transition: all var(--transition-normal);
        }

        .editor-preview del {
          text-decoration: line-through;
          color: var(--text-secondary);
          transition: all var(--transition-normal);
        }

        /* 图片查看器样式 */
        .image-viewer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: overlayIn 0.2s ease;
        }

        .image-viewer-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: 20px;
          box-shadow: var(--shadow-xl);
          border: 1px solid var(--border-color);
        }

        .image-viewer-close {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 10;
        }

        .image-viewer-close:hover {
          background: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
}