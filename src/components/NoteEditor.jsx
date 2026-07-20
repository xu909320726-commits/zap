import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import typescript from 'highlight.js/lib/languages/typescript';
import 'highlight.js/styles/atom-one-dark.css';

// 注册语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('html', html);
hljs.registerLanguage('css', css);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('typescript', typescript);

export default function NoteEditorModal({ note, onSave, onClose, isNew }) {
  const [title, setTitle] = useState(note?.title || '');
  const [hasChanges, setHasChanges] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptConfig, setPromptConfig] = useState({ title: '', placeholder: '', defaultValue: '', type: '' });
  const [promptValue, setPromptValue] = useState('');
  const [savedSelection, setSavedSelection] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerConfig, setColorPickerConfig] = useState({ type: 'foreColor', color: '#000000' });
  const [previewImage, setPreviewImage] = useState(null);
  const editorRef = useRef(null);
  const previewImageRef = useRef(null);

  const originalContent = note?.content || '';
  const originalTitle = note?.title || '';

  useEffect(() => {
    previewImageRef.current = previewImage;
  }, [previewImage]);

  // 高亮所有代码块
  const highlightAllCodeBlocks = useCallback(() => {
    if (!editorRef.current) return;
    
    const codeBlocks = editorRef.current.querySelectorAll('.code-block-wrapper pre code');
    codeBlocks.forEach((codeBlock) => {
      // 获取语言类名
      const wrapper = codeBlock.closest('.code-block-wrapper');
      const langElement = wrapper?.querySelector('.code-lang');
      const lang = langElement?.textContent?.toLowerCase() || '';
      
      // 获取代码内容
      const codeText = codeBlock.textContent;
      
      // 移除旧的高亮类名和语言类名
      codeBlock.classList.remove('hljs');
      codeBlock.classList.remove(...Array.from(codeBlock.classList).filter(cls => cls.startsWith('language-')));
      
      // 添加语言类名
      if (lang && hljs.getLanguage(lang)) {
        codeBlock.classList.add(`language-${lang}`);
      }
      
      // 使用 highlight.js 进行语法高亮
      try {
        const result = hljs.highlight(codeText, { 
          language: lang && hljs.getLanguage(lang) ? lang : 'plaintext' 
        });
        codeBlock.innerHTML = result.value;
        codeBlock.classList.add('hljs');
      } catch (err) {
        console.error('Highlight error:', err);
      }
    });
  }, []);

  useEffect(() => {
    setTitle(note?.title || '');
    if (editorRef.current) {
      editorRef.current.innerHTML = note?.content || '';
      // 加载内容后高亮代码块
      setTimeout(highlightAllCodeBlocks, 0);
    }
    setHasChanges(false);
  }, [note?.id, highlightAllCodeBlocks]);

  const getContent = useCallback(() => {
    return editorRef.current?.innerHTML || '';
  }, []);

  const handleSave = useCallback(() => {
    onSave({ ...note, title, content: getContent() });
    setHasChanges(false);
  }, [note, title, onSave, getContent]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      setShowConfirm(true);
    } else {
      setIsClosing(true);
    }
  }, [hasChanges]);

  const checkChanges = useCallback(() => {
    const currentContent = getContent();
    const changed = title !== originalTitle || currentContent !== originalContent;
    setHasChanges(changed);
  }, [title, originalTitle, originalContent, getContent]);

  const handleContentChange = useCallback(() => {
    checkChanges();
  }, [checkChanges]);

  const handleTitleChange = useCallback((e) => {
    const newValue = e.target.value;
    setTitle(newValue);
    checkChanges();
  }, [checkChanges]);

  const execCommand = useCallback((command, value = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
    checkChanges();
  }, [checkChanges]);

  const handlePromptConfirm = useCallback(() => {
    if (!promptValue.trim()) {
      setShowPrompt(false);
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
    }

    if (promptConfig.type === 'codeblock') {
      const languages = ['javascript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'bash', 'sql', 'go', 'rust', 'typescript'];
      const lang = languages.includes(promptValue.toLowerCase()) ? promptValue.toLowerCase() : 'code';
      
      // 创建代码块 HTML - code 直接在 pre 下，符合 highlight.js 预期
      const codeBlockHTML = `
        <div class="code-block-wrapper">
          <div class="code-header">
            <span class="code-lang">${lang}</span>
            <button class="copy-btn" data-action="copy-code">
              <span style="font-size:12px">复制</span>
            </button>
          </div>
          <pre><code class="language-${lang}">// ${lang} code\n\n</code></pre>
        </div>
      `;
      
      // 如果有保存的选区，恢复选区位置
      if (savedSelection) {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(savedSelection);
        setSavedSelection(null);
      }
      
      execCommand('insertHTML', codeBlockHTML);
      
      // 插入后高亮代码块
      setTimeout(() => {
        highlightAllCodeBlocks();
      }, 0);
    } else if (promptConfig.type === 'link') {
      execCommand('createLink', promptValue.trim());
    }

    setShowPrompt(false);
    setPromptValue('');
  }, [promptValue, promptConfig.type, execCommand, highlightAllCodeBlocks, savedSelection]);

  const handleColorConfirm = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    execCommand(colorPickerConfig.type, colorPickerConfig.color);
    setShowColorPicker(false);
  }, [colorPickerConfig, execCommand]);

  const handleToolbarClick = useCallback((action) => {
    switch (action) {
      case 'bold':
        execCommand('bold');
        break;
      case 'italic':
        execCommand('italic');
        break;
      case 'underline':
        execCommand('underline');
        break;
      case 'strike':
        execCommand('strikeThrough');
        break;
      case 'h1':
        execCommand('formatBlock', 'h1');
        break;
      case 'h2':
        execCommand('formatBlock', 'h2');
        break;
      case 'h3':
        execCommand('formatBlock', 'h3');
        break;
      case 'p':
        execCommand('formatBlock', 'p');
        break;
      case 'ul':
        execCommand('insertUnorderedList');
        break;
      case 'ol':
        execCommand('insertOrderedList');
        break;
      case 'quote':
        execCommand('formatBlock', 'blockquote');
        break;
      case 'code':
        // 使用 insertHTML 方式插入行内代码
        const selectedText = window.getSelection().toString();
        if (selectedText) {
          // 如果已有选中文本，用 code 标签包裹
          execCommand('insertHTML', `<code>${selectedText}</code>`);
        } else {
          // 没有选中文本，插入空的 code 标签并聚焦
          execCommand('insertHTML', '<code>代码</code>');
        }
        break;
      case 'codeblock':
        // 保存当前选区位置
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          setSavedSelection(selection.getRangeAt(0).cloneRange());
        }
        setPromptConfig({
          title: '选择代码语言',
          placeholder: '输入代码语言',
          defaultValue: 'javascript',
          type: 'codeblock'
        });
        setPromptValue('javascript');
        setShowPrompt(true);
        break;
      case 'foreColor':
        setColorPickerConfig({ type: 'foreColor', color: '#000000' });
        setShowColorPicker(true);
        break;
      case 'hiliteColor':
        setColorPickerConfig({ type: 'hiliteColor', color: '#ffff00' });
        setShowColorPicker(true);
        break;
      case 'hr':
        execCommand('insertHorizontalRule');
        break;
      case 'link':
        setPromptConfig({
          title: '插入链接',
          placeholder: '输入链接地址',
          defaultValue: 'https://',
          type: 'link'
        });
        setPromptValue('https://');
        setShowPrompt(true);
        break;
      case 'undo':
        execCommand('undo');
        break;
      case 'redo':
        execCommand('redo');
        break;
      case 'clear':
        execCommand('removeFormat');
        break;
      default:
        break;
    }
  }, [execCommand]);

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    const clipboardData = e.clipboardData;
    if (!items || !clipboardData) return;

    // 检查是否有图片
    let hasImage = false;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        hasImage = true;
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Image = event.target.result;
          
          // 检查是否在列表中，如果是，在当前列表项后插入图片（与li同级，在ol内部）
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.commonAncestorContainer;
            const listItem = container.nodeType === Node.TEXT_NODE 
                ? container.parentElement.closest('li') 
                : container.closest('li');
            
            if (listItem) {
              const list = listItem.parentElement; // ol 或 ul
              
              // 创建图片容器，与li同级（在ol内部）
              const imageContainer = document.createElement('div');
              imageContainer.style.margin = '8px 0';
              
              // 在当前列表项后插入图片容器（在ol内部，与li同级）
              list.insertBefore(imageContainer, listItem.nextElementSibling);
              
              // 将光标移动到图片容器
              range.selectNodeContents(imageContainer);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
          
          execCommand('insertImage', base64Image);
          checkChanges();
        };
        reader.readAsDataURL(file);
        break;
      }
    }

    // 如果不是图片，处理文本粘贴
    if (!hasImage) {
      const text = clipboardData.getData('text/plain');
      const html = clipboardData.getData('text/html');
      
      // 检查是否在代码块内
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer;
        const codeBlockWrapper = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement?.closest('.code-block-wrapper')
          : container.closest?.('.code-block-wrapper');
        
        if (codeBlockWrapper) {
          // 在代码块内粘贴，只插入纯文本
          e.preventDefault();
          const codeElement = codeBlockWrapper.querySelector('pre code');
          if (codeElement) {
            document.execCommand('insertText', false, text);
            checkChanges();
            
            // 粘贴后重新高亮代码
            setTimeout(() => {
              if (codeElement) {
                const langElement = codeBlockWrapper.querySelector('.code-lang');
                const lang = langElement?.textContent?.toLowerCase() || '';
                const codeText = codeElement.textContent;
                
                // 移除旧的高亮类名
                codeElement.classList.remove('hljs');
                codeElement.classList.remove(...Array.from(codeElement.classList).filter(cls => cls.startsWith('language-')));
                
                // 设置语言类名
                if (lang && hljs.getLanguage(lang)) {
                  codeElement.classList.add(`language-${lang}`);
                }
                
                // 重新应用高亮
                try {
                  const result = hljs.highlight(codeText, { 
                    language: lang && hljs.getLanguage(lang) ? lang : 'plaintext' 
                  });
                  codeElement.innerHTML = result.value;
                  codeElement.classList.add('hljs');
                } catch (err) {
                  console.error('Highlight error:', err);
                }
              }
            }, 50);
          }
        }
      }
    }
  }, [execCommand, checkChanges, highlightAllCodeBlocks]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          execCommand('redo');
        } else {
          execCommand('undo');
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        execCommand('bold');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        execCommand('italic');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleClose, execCommand]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleInput = () => handleContentChange();
    editor.addEventListener('input', handleInput);
    
    const handleCopyClick = (e) => {
      const copyBtn = e.target.closest('[data-action="copy-code"]');
      if (copyBtn) {
        e.preventDefault();
        e.stopPropagation();
        
        const codeBlockWrapper = copyBtn.closest('.code-block-wrapper');
        const preElement = codeBlockWrapper?.querySelector('pre');
        
        if (preElement) {
          // 使用 innerText 确保获取完整的代码内容（包括所有子元素的文本）
          const codeText = preElement.innerText || preElement.textContent;
          
          navigator.clipboard.writeText(codeText).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '<span style="font-size:12px">已复制</span>';
            copyBtn.classList.add('copied');
            
            setTimeout(() => {
              copyBtn.innerHTML = originalText;
              copyBtn.classList.remove('copied');
            }, 2000);
          }).catch(err => {
            console.error('复制失败:', err);
          });
        }
      }
    };
    editor.addEventListener('click', handleCopyClick);
    
    const handleImageClick = (e) => {
      const target = e.target;
      if (target.tagName === 'IMG' && !previewImageRef.current) {
        e.preventDefault();
        e.stopPropagation();
        setPreviewImage(target.src);
      }
    };
    editor.addEventListener('mousedown', handleImageClick);
    
    const handleKeyDown = (e) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      
      // 处理代码块
      const preElement = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement.closest('pre') 
          : container.closest('pre');
      
      if (preElement) {
        const codeBlockWrapper = preElement.closest('.code-block-wrapper');
        
        if (e.key === 'Enter') {
          if (e.altKey) {
            // Alt + Enter: 跳出代码块
            e.preventDefault();
            
            const codeElement = preElement.querySelector('code');
            if (!codeElement) return;
            
            // Alt + Enter: 总是从末尾跳出代码块
            const referenceElement = codeBlockWrapper || preElement;
            const newParagraph = document.createElement('p');
            newParagraph.innerHTML = '<br>';
            referenceElement.parentElement.insertBefore(newParagraph, referenceElement.nextSibling);
            
            range.selectNodeContents(newParagraph);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            
            handleContentChange();
          }
          // Enter 键（没有 Alt）：只换行，不跳出代码块
          // 不需要阻止默认行为，让浏览器默认处理换行
        } else if (e.key === 'ArrowDown') {
          const codeElement = preElement.querySelector('code');
          if (!codeElement) return;
          
          const textContent = codeElement.textContent;
          const isAtEnd = range.startOffset >= textContent.length && 
                         range.endOffset >= textContent.length;
          
          if (isAtEnd) {
            e.preventDefault();
            
            const referenceElement = codeBlockWrapper || preElement;
            const nextElement = referenceElement.nextElementSibling;
            if (nextElement) {
              range.selectNodeContents(nextElement);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        } else if (e.key === 'ArrowUp') {
          const codeElement = preElement.querySelector('code');
          if (!codeElement) return;
          
          const isAtStart = range.startOffset === 0 && range.endOffset === 0;
          
          if (isAtStart) {
            e.preventDefault();
            
            const referenceElement = codeBlockWrapper || preElement;
            const prevElement = referenceElement.previousElementSibling;
            if (prevElement) {
              range.selectNodeContents(prevElement);
              range.collapse(false);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }
      }
      
      // 处理引用块
      const blockquoteElement = container.nodeType === Node.TEXT_NODE 
          ? container.parentElement.closest('blockquote') 
          : container.closest('blockquote');
      
      if (blockquoteElement) {
        if (e.key === 'Enter' && e.altKey) {
          e.preventDefault();
          
          // Alt + Enter: 总是从末尾跳出引用块
          const newParagraph = document.createElement('p');
          newParagraph.innerHTML = '<br>';
          blockquoteElement.parentElement.insertBefore(newParagraph, blockquoteElement.nextSibling);
          
          range.selectNodeContents(newParagraph);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          
          handleContentChange();
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
          // 当引用块为空时，按删除键删除整个引用块
          const textContent = blockquoteElement.textContent.trim();
          const isEmpty = !textContent || textContent === '';
          
          if (isEmpty) {
            e.preventDefault();
            blockquoteElement.remove();
            handleContentChange();
          }
        }
      }
    };
    editor.addEventListener('keydown', handleKeyDown);
    
    return () => {
      editor.removeEventListener('input', handleInput);
      editor.removeEventListener('click', handleCopyClick);
      editor.removeEventListener('keydown', handleKeyDown);
      editor.removeEventListener('mousedown', handleImageClick);
    };
  }, [handleContentChange]);

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
          <div className="rich-text-editor">
            <div className="editor-toolbar">
              <button title="撤销 (Ctrl+Z)" onClick={() => handleToolbarClick('undo')}>
                <Icon name="rotate-cw" />
              </button>
              <button title="重做 (Ctrl+Shift+Z)" onClick={() => handleToolbarClick('redo')}>
                <Icon name="rotate-ccw" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="标题 1" onClick={() => handleToolbarClick('h1')}>
                <Icon name="type" />
                <span>H1</span>
              </button>
              <button title="标题 2" onClick={() => handleToolbarClick('h2')}>
                <Icon name="type" />
                <span>H2</span>
              </button>
              <button title="标题 3" onClick={() => handleToolbarClick('h3')}>
                <Icon name="type" />
                <span>H3</span>
              </button>
              <button title="正文" onClick={() => handleToolbarClick('p')}>
                <Icon name="align-left" />
                <span>正文</span>
              </button>
              <div className="toolbar-divider"></div>
              <button title="粗体 (Ctrl+B)" onClick={() => handleToolbarClick('bold')}>
                <Icon name="bold" />
              </button>
              <button title="斜体 (Ctrl+I)" onClick={() => handleToolbarClick('italic')}>
                <Icon name="italic" />
              </button>
              <button title="下划线" onClick={() => handleToolbarClick('underline')}>
                <Icon name="underline" />
              </button>
              <button title="删除线" onClick={() => handleToolbarClick('strike')}>
                <Icon name="strikethrough" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="字体颜色" onClick={() => handleToolbarClick('foreColor')} className="color-btn">
                <Icon name="palette" />
              </button>
              <button title="背景颜色" onClick={() => handleToolbarClick('hiliteColor')} className="color-btn">
                <Icon name="highlighter" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="无序列表" onClick={() => handleToolbarClick('ul')}>
                <Icon name="list" />
              </button>
              <button title="有序列表" onClick={() => handleToolbarClick('ol')}>
                <Icon name="list-ordered" />
              </button>
              <button title="引用" onClick={() => handleToolbarClick('quote')}>
                <Icon name="quote" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="行内代码" onClick={() => handleToolbarClick('code')}>
                <Icon name="code" />
              </button>
              <button title="代码块" onClick={() => handleToolbarClick('codeblock')}>
                <Icon name="code-2" />
              </button>
              <button title="分割线" onClick={() => handleToolbarClick('hr')}>
                <Icon name="minus" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="链接" onClick={() => handleToolbarClick('link')}>
                <Icon name="link" />
              </button>
              <div className="toolbar-divider"></div>
              <button title="清除格式" onClick={() => handleToolbarClick('clear')}>
                <Icon name="eraser" />
              </button>
            </div>
            <div
              ref={editorRef}
              className="editor-content"
              contentEditable
              onPaste={handlePaste}
              placeholder="开始编写笔记..."
              suppressContentEditableWarning
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autocapitalize="off"
            />
          </div>
        </div>

        <footer className="note-editor-footer">
          <span className="note-editor-hint">
            <Icon name="keyboard" />
            Ctrl + S 保存 · Esc 关闭 · Ctrl + B 粗体 · Ctrl + I 斜体 · Ctrl + Z 撤销
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

        {showColorPicker && (
          <div className="note-confirm-mask" onClick={() => setShowColorPicker(false)}>
            <div className="note-prompt-dialog" onClick={e => e.stopPropagation()}>
              <div className="note-prompt-icon">
                {colorPickerConfig.type === 'foreColor' ? <Icon name="palette" /> : <Icon name="highlighter" />}
              </div>
              <h3>{colorPickerConfig.type === 'foreColor' ? '选择字体颜色' : '选择背景颜色'}</h3>
              <div className="note-color-picker">
                <input
                  type="color"
                  className="note-color-input"
                  value={colorPickerConfig.color}
                  onChange={(e) => setColorPickerConfig({ ...colorPickerConfig, color: e.target.value })}
                  autoFocus
                />
                <div className="note-color-presets">
                  {['#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#a855f7', '#ec4899', '#f43f5e'].map((color) => (
                    <button
                      key={color}
                      className="note-color-preset"
                      style={{ backgroundColor: color }}
                      onClick={() => setColorPickerConfig({ ...colorPickerConfig, color })}
                    />
                  ))}
                </div>
              </div>
              <div className="note-prompt-actions">
                <button className="note-btn note-btn-ghost" onClick={() => setShowColorPicker(false)}>
                  取消
                </button>
                <button className="note-btn note-btn-primary" onClick={handleColorConfirm}>
                  确定
                </button>
              </div>
            </div>
          </div>
        )}

        {showPrompt && (
          <div className="note-confirm-mask" onClick={() => setShowPrompt(false)}>
            <div className="note-prompt-dialog" onClick={e => e.stopPropagation()}>
              <div className="note-prompt-icon">
                {promptConfig.type === 'codeblock' ? <Icon name="code" /> : <Icon name="link" />}
              </div>
              <h3>{promptConfig.title}</h3>
              <div className="note-prompt-input-wrap">
                <input
                  type="text"
                  className="note-prompt-input"
                  value={promptValue}
                  onChange={(e) => setPromptValue(e.target.value)}
                  placeholder={promptConfig.placeholder}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handlePromptConfirm();
                    } else if (e.key === 'Escape') {
                      setShowPrompt(false);
                    }
                  }}
                />
                {promptConfig.type === 'codeblock' && (
                  <div className="note-prompt-suggestions">
                    <span className="suggestions-label">常用语言:</span>
                    {['javascript', 'python', 'java', 'cpp', 'html', 'css', 'json', 'bash', 'sql', 'go', 'rust', 'typescript'].map((lang) => (
                      <button
                        key={lang}
                        className="suggestion-tag"
                        onClick={() => setPromptValue(lang)}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="note-prompt-actions">
                <button className="note-btn note-btn-ghost" onClick={() => setShowPrompt(false)}>
                  取消
                </button>
                <button className="note-btn note-btn-primary" onClick={handlePromptConfirm}>
                  确认
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 图片预览模态框 */}
        {previewImage && (
          <div className="image-preview-modal" onClick={() => setPreviewImage(null)}>
            <img src={previewImage} alt="预览" />
            <div className="preview-close-hint">点击任意位置关闭预览</div>
          </div>
        )}
      </div>

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
          display: flex;
          flex-direction: column;
        }

        .rich-text-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .editor-toolbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-light);
          flex-wrap: wrap;
        }

        .editor-toolbar button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 10px;
          border: none;
          border-radius: var(--radius-sm);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .editor-toolbar button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .editor-toolbar button:active {
          transform: scale(0.96);
        }

        .toolbar-divider {
          width: 1px;
          height: 24px;
          background: var(--border-light);
          margin: 0 4px;
        }

        .editor-toolbar .color-btn {
          position: relative;
        }

        .editor-toolbar .color-btn:after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 3px;
          border-radius: 2px;
          background: linear-gradient(90deg, #ef4444, #3b82f6, #10b981);
        }

        .note-color-picker {
          padding: 16px;
        }

        .note-color-input {
          width: 100%;
          height: 50px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          margin-bottom: 16px;
        }

        .note-color-presets {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 8px;
        }

        .note-color-preset {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          border: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .note-color-preset:hover {
          transform: scale(1.1);
          border-color: var(--primary-color);
        }

        .note-prompt-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 20px;
        }

        .editor-content {
          flex: 1;
          padding: 24px 28px;
          overflow-y: auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 15px;
          line-height: 1.8;
          color: var(--text-primary);
          background: var(--bg-primary);
          outline: none;
          min-height: 200px;
        }

        .editor-content:empty:before {
          content: attr(placeholder);
          color: var(--text-muted);
          pointer-events: none;
          font-style: italic;
        }

        .editor-content h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 28px 0 18px;
          padding-bottom: 12px;
          border-bottom: 2px solid var(--primary-color);
          color: var(--text-primary);
        }

        .editor-content h2 {
          font-size: 24px;
          font-weight: 650;
          margin: 24px 0 12px;
          padding-left: 12px;
          border-left: 4px solid var(--primary-color);
          color: var(--text-primary);
        }

        .editor-content h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0 10px;
          color: var(--text-primary);
        }

        .editor-content p {
          margin: 14px 0;
          line-height: 1.8;
        }

        .editor-content ul,
        .editor-content ol {
          margin: 14px 0;
          padding-left: 28px;
        }

        .editor-content li {
          margin: 8px 0;
          line-height: 1.8;
        }

        .editor-content blockquote {
          margin: 16px 0;
          padding: 12px 20px;
          border-left: 4px solid var(--primary-color);
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-style: italic;
        }

        .editor-content .code-block-wrapper {
          margin: 20px 0;
          padding: 0;
          background: linear-gradient(135deg, #1e1e2e 0%, #252538 100%);
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-light);
        }

        .editor-content .code-block-wrapper .code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid var(--border-light);
        }

        .editor-content .code-block-wrapper .code-lang {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .editor-content .code-block-wrapper .copy-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        .editor-content .code-block-wrapper .copy-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .editor-content .code-block-wrapper .copy-btn.copied {
          color: var(--success-color);
        }

        .editor-content .code-block-wrapper pre {
          margin: 0;
          padding: 16px;
          overflow-x: auto;
          background: transparent;
          border: none;
        }

        .editor-content .code-block-wrapper pre code {
          background: transparent !important;
          padding: 0;
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
          font-size: 13px;
          line-height: 1.7;
          white-space: pre-wrap;
          word-break: break-all;
          color: #e4e4e7 !important;
        }

        /* 确保 highlight.js 样式在代码块内生效 */
        .editor-content .code-block-wrapper pre code.hljs {
          background: transparent !important;
          padding: 0;
          color: #e4e4e7 !important;
        }

        /* 行内代码样式 - 只对不在 pre 内的 code 生效 */
        .editor-content :not(pre) > code {
          background: rgba(139, 92, 246, 0.15);
          padding: 3px 7px;
          border-radius: 5px;
          font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
          font-size: 13px;
          color: #c084fc;
          font-weight: 500;
        }

        /* highlight.js 高亮样式覆盖 */
        .editor-content pre code.hljs {
          background: transparent !important;
          color: #e4e4e7 !important;
          padding: 0;
        }
        
        .editor-content pre code.hljs .hljs-keyword { color: #c084fc !important; }
        .editor-content pre code.hljs .hljs-string { color: #a78bfa !important; }
        .editor-content pre code.hljs .hljs-number { color: #f472b6 !important; }
        .editor-content pre code.hljs .hljs-function { color: #60a5fa !important; }
        .editor-content pre code.hljs .hljs-comment { color: #71717a !important; font-style: italic; }
        .editor-content pre code.hljs .hljs-title { color: #fbbf24 !important; }
        .editor-content pre code.hljs .hljs-operator { color: #f87171 !important; }
        .editor-content pre code.hljs .hljs-built_in { color: #fb923c !important; }
        .editor-content pre code.hljs .hljs-variable { color: #fca5a5 !important; }
        .editor-content pre code.hljs .hljs-params { color: #a78bfa !important; }
        .editor-content pre code.hljs .hljs-property { color: #60a5fa !important; }
        .editor-content pre code.hljs .hljs-meta { color: #c084fc !important; }
        .editor-content pre code.hljs .hljs-attr { color: #a78bfa !important; }
        .editor-content pre code.hljs .hljs-selector-tag { color: #c084fc !important; }
        .editor-content pre code.hljs .hljs-selector-class { color: #fbbf24 !important; }
        .editor-content pre code.hljs .hljs-selector-id { color: #60a5fa !important; }
        .editor-content pre code.hljs .hljs-punctuation { color: #9ca3af !important; }
        .editor-content pre code.hljs .hljs-tag { color: #c084fc !important; }
        .editor-content pre code.hljs .hljs-name { color: #60a5fa !important; }
        .editor-content pre code.hljs .hljs-type { color: #fbbf24 !important; }
        .editor-content pre code.hljs .hljs-literal { color: #f472b6 !important; }
        .editor-content pre code.hljs .hljs-symbol { color: #f472b6 !important; }
        .editor-content pre code.hljs .hljs-bullet { color: #f472b6 !important; }
        .editor-content code .variable { color: #a5b4fc; }

        .editor-content a {
          color: var(--primary-color);
          text-decoration: none;
        }

        .editor-content a:hover {
          text-decoration: underline;
        }

        .editor-content img {
          max-width: 80%;
          max-height: 400px;
          width: auto;
          height: auto;
          border-radius: var(--radius-md);
          margin: 8px 0;
          cursor: pointer;
          transition: all var(--transition-fast);
          object-fit: contain;
          display: block;
          margin-left: 0;
          margin-right: auto;
        }

        .editor-content img:hover {
          opacity: 0.9;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* 列表内的图片容器样式 */
        .editor-content ol > div,
        .editor-content ul > div {
          margin: 8px 0;
          padding: 0;
          display: block;
        }
        
        /* 列表内的图片样式 */
        .editor-content ol > div img,
        .editor-content ul > div img {
          max-width: 100%;
          max-height: 400px;
          display: block;
          margin: 0;
          padding: 0;
        }

        /* 图片预览模态框 */
        .image-preview-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          cursor: pointer;
          animation: fadeIn 0.2s ease;
        }

        .image-preview-modal img {
          max-width: 90vw;
          max-height: 90vh;
          object-fit: contain;
          border-radius: var(--radius-md);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .image-preview-modal .preview-close-hint {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255, 255, 255, 0.7);
          font-size: 13px;
          background: rgba(0, 0, 0, 0.5);
          padding: 8px 16px;
          border-radius: var(--radius-md);
        }

        .editor-content hr {
          border: none;
          border-top: 1px solid var(--border-light);
          margin: 24px 0;
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

        .note-prompt-dialog {
          background: var(--bg-primary);
          border-radius: var(--radius-lg);
          padding: 28px;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: var(--shadow-lg);
          animation: dialogPop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .note-prompt-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          color: white;
        }

        .note-prompt-dialog h3 {
          margin: 0 0 16px;
          font-size: 17px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .note-prompt-input-wrap {
          margin-bottom: 20px;
        }

        .note-prompt-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          font-size: 14px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
          transition: all var(--transition-fast);
          box-sizing: border-box;
        }

        .note-prompt-input:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .note-prompt-suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
          justify-content: center;
        }

        .suggestions-label {
          font-size: 12px;
          color: var(--text-muted);
          margin-right: 4px;
        }

        .suggestion-tag {
          padding: 4px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          font-size: 12px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .suggestion-tag:hover {
          background: var(--primary-color);
          border-color: var(--primary-color);
          color: white;
        }

        .note-prompt-actions {
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

        @keyframes overlayOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes panelSlide {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes panelSlideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes dialogPop {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}