import React, { useState, useEffect, useMemo, useRef } from 'react';
import Icon from './Icon';
import { useStore } from '../hooks/useStore';

/**
 * 从 curl (bash) 命令中解析出 HTTP 请求信息
 * 支持多行 curl，提取 URL、method、headers、body
 */
function parseCurl(curlText) {
  if (!curlText || !curlText.trim()) {
    return { error: '请粘贴 curl 命令' };
  }

  let text = curlText.replace(/\r\n/g, '\n').trim();

  // 去掉开头的 "curl"
  text = text.replace(/^curl\s+/i, '');

  // 去掉行尾的换行反斜杠续行符
  text = text.replace(/\\\n/g, ' ');

  // 去掉换行，curl 通常用 \ 续行
  text = text.replace(/\n\s+/g, ' ');

  // 提取 URL
  const urlMatch = text.match(/['"]?(https?:\/\/[^'"\s]+)['"]?/i);
  if (!urlMatch) {
    return { error: '未找到有效的 URL，请确认 curl 命令格式' };
  }
  const url = urlMatch[1];

  // 提取 method
  let method = 'GET';
  const methodMatch = text.match(/-X\s+['"]?([A-Z]+)['"]?/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  } else if (/-d\s+|--data\s+/i.test(text) || /--data-raw\s+/i.test(text)) {
    method = 'POST';
  }

  // 提取 headers
  const headers = {};
  const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(text)) !== null) {
    const headerStr = headerMatch[1];
    const idx = headerStr.indexOf(':');
    if (idx > 0) {
      const key = headerStr.substring(0, idx).trim();
      const value = headerStr.substring(idx + 1).trim();
      headers[key] = value;
    }
  }

  // 提取 -b / --cookie 参数（curl 简写形式），转为 Cookie header
  const cookieMatch = text.match(/(?:-b|--cookie|--cookie-jar)\s+(['])([^']+)\1/);
  if (cookieMatch && !hasHeader(headers, 'cookie')) {
    headers['Cookie'] = cookieMatch[2];
  } else {
    // 尝试不带引号的形式
    const cookieMatchNoQuote = text.match(/(?:-b|--cookie|--cookie-jar)\s+([^\s-]+(?:\s+[^\s-]+)*?)(?=\s+-|$)/);
    if (cookieMatchNoQuote && !hasHeader(headers, 'cookie')) {
      headers['Cookie'] = cookieMatchNoQuote[1].trim();
    }
  }

  // 提取 body
  let body = null;
  const bodyPatterns = [
    /--data-raw\s+(['"])([\s\S]*?)\1/,
    /--data-binary\s+(['"])([\s\S]*?)\1/,
    /-d\s+(['"])([\s\S]*?)\1/,
    /--data\s+(['"])([\s\S]*?)\1/,
  ];
  for (const pattern of bodyPatterns) {
    const m = text.match(pattern);
    if (m) {
      body = m[2];
      break;
    }
  }
  // 如果没有匹配到带引号的 body，尝试匹配不带引号的
  if (body === null) {
    const noQuotePatterns = [
      /--data-raw\s+([^\s-]+(?:\s+[^\s-]+)*?)(?=\s+-|$)/,
      /-d\s+([^\s-]+(?:\s+[^\s-]+)*?)(?=\s+-|$)/,
    ];
    for (const pattern of noQuotePatterns) {
      const m = text.match(pattern);
      if (m) {
        body = m[1].trim();
        break;
      }
    }
  }

  // 自动从 Cookie 中提取 csrftoken 并补全 X-CSRF-Token header
  // 适用于飞书项目（project.feishu.cn）等需要 CSRF 防护的接口
  let csrfAutoAdded = false;
  let csrfSource = null;
  let csrfCandidates = [];
  const cookieStr = headers['cookie'] || headers['Cookie'];
  if (cookieStr) {
    // 枚举所有 csrf 相关 cookie 供调试展示
    csrfCandidates = enumerateCsrfCookies(cookieStr);
  }
  if (!hasHeader(headers, 'x-csrf-token')) {
    const found = extractCsrfToken(cookieStr);
    if (found) {
      headers['X-CSRF-Token'] = found.value;
      csrfAutoAdded = true;
      csrfSource = found.name;
    }
  }

  return { url, method, headers, body, csrfAutoAdded, csrfSource, csrfCandidates, cookieStr };
}

function hasHeader(headers, key) {
  const lower = key.toLowerCase();
  return Object.keys(headers).some(k => k.toLowerCase() === lower);
}

/**
 * 枚举 cookie 中所有 csrf 相关字段（用于调试展示）
 */
function enumerateCsrfCookies(cookieStr) {
  if (!cookieStr) return [];
  const candidates = [];
  const pairs = cookieStr.split(/;\s*/);
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const name = pair.substring(0, idx).trim();
    const value = pair.substring(idx + 1).trim();
    // 匹配所有 csrf 相关字段
    if (/csrf|_token/i.test(name) || /csrf/i.test(value)) {
      candidates.push({ name, valuePreview: value.substring(0, 20) + (value.length > 20 ? '...' : '') });
    }
  }
  return candidates;
}

// 常见的 CSRF cookie 名称（按优先级排序）
const CSRF_COOKIE_NAMES = [
  'csrftoken',         // Django / 飞书项目
  'csrf_token',        // Laravel 等
  'csrfmiddlewaretoken', // Django 旧版
  'XSRF-TOKEN',        // Laravel 默认（X-XSRF-TOKEN header）
  '_csrf',             // Express csurf
  'anti_csrf_token',   // 自定义
];

// 飞书项目（meego）专用的 CSRF cookie 名
const MEEGO_CSRF_COOKIE_NAMES = [
  'meego_csrf_token',
  'swp_csrf_token',
];

/**
 * 从 Cookie 字符串中提取 CSRF token
 * 支持多种 cookie 名称，匹配到第一个即返回 { name, value }
 */
function extractCsrfToken(cookieStr) {
  if (!cookieStr) return null;

  // 先尝试精确匹配已知名称（包括飞书 meego 专用名）
  const allNames = [...MEEGO_CSRF_COOKIE_NAMES, ...CSRF_COOKIE_NAMES];
  for (const name of allNames) {
    const re = new RegExp(`(?:^|;\\s*)${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*=\\s*([^;]+)`, 'i');
    const m = cookieStr.match(re);
    if (m) {
      return { name, value: m[1].trim() };
    }
  }

  // 再尝试模糊匹配：cookie 名等于或以 csrf 开头/结尾
  const csrfLike = cookieStr.match(/(?:^|;\s*)(?:csrftoken|csrf_token|csrf[A-Za-z0-9_-]*|[A-Za-z0-9_-]*csrf)\s*=\s*([^;]+)/i);
  if (csrfLike) {
    const nameMatch = cookieStr.match(/(?:^|;\s*)((?:csrftoken|csrf_token|csrf[A-Za-z0-9_-]*|[A-Za-z0-9_-]*csrf))\s*=/i);
    return { name: nameMatch ? nameMatch[1] : 'csrf', value: csrfLike[1].trim() };
  }

  // 最后兜底：尝试包含 csrf 字样的所有 cookie（包括 meego 这种下划线连接的）
  const anyCsrf = cookieStr.match(/(?:^|;\s*)([\w-]*csrf[\w-]*)\s*=\s*([^;]+)/i);
  if (anyCsrf) {
    return { name: anyCsrf[1], value: anyCsrf[2].trim() };
  }

  return null;
}

/**
 * 飞书创建任务的接口响应数据结构推测 (基于常见 open_api 格式)
 */
function extractTasksFromResponse(jsonData) {
  if (!jsonData) return [];

  // 飞书任务/项目常见数据格式：data.items / data.tasks / data.list 等
  const candidates = [];
  const seen = new WeakSet();

  const tryExtract = (obj) => {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);

    // 飞书创建任务响应：通常包含 task_id 或 task
    if (obj.task_id && obj.summary) {
      candidates.push({
        task_id: obj.task_id,
        summary: obj.summary,
        description: obj.description || '',
        due_date: obj.due_date || obj.due || null,
        start_date: obj.start_date || obj.start || null,
        members: obj.members || [],
        url: obj.url || obj.task_url || ''
      });
    }

    // 飞书项目列表响应
    if (Array.isArray(obj.items)) {
      obj.items.forEach(tryExtract);
    }
    if (Array.isArray(obj.tasks)) {
      obj.tasks.forEach(tryExtract);
    }
    if (Array.isArray(obj.list)) {
      obj.list.forEach(tryExtract);
    }
    if (Array.isArray(obj.data)) {
      obj.data.forEach(tryExtract);
    }

    // 递归查找其他可能包含 summary 的对象
    Object.values(obj).forEach(v => {
      if (v && typeof v === 'object') tryExtract(v);
    });
  };

  tryExtract(jsonData);
  return candidates;
}

/**
 * 将时间戳（秒）转换为 YYYY-MM-DD HH:mm 格式
 * 自动判断秒级（10 位）和毫秒级（13 位）
 */
function timestampToDateTime(ts) {
  if (ts === null || ts === undefined || ts === '') return '';
  // 数字字符串转换
  const num = typeof ts === 'string' ? Number(ts) : ts;
  if (Number.isNaN(num) || num <= 0) return '';
  // 秒级时间戳（10 位）转换为毫秒级
  const ms = num < 1e12 ? num * 1000 : num;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 从飞书项目甘特图响应中提取任务数据
 * 路径：data.user_schedules[].tasks
 * 不做去重，保留所有任务（同一日期的任务将在导入时平均分配时间）
 * @returns {{ tasks: Array, totalCount: number }}
 */
function extractSchedules(responseData) {
  if (!responseData || typeof responseData !== 'object') {
    return { tasks: [], totalCount: 0 };
  }

  const data = responseData.data;
  if (!data) return { tasks: [], totalCount: 0 };

  const schedules = data.user_schedules;
  if (!Array.isArray(schedules)) {
    return { tasks: [], totalCount: 0 };
  }

  const tasks = [];
  let totalCount = 0;
  schedules.forEach((schedule) => {
    if (!schedule || !Array.isArray(schedule.tasks)) return;
    schedule.tasks.forEach((task) => {
      const workItemInfo = task.work_item_info || {};
      const time = task.time || {};

      const storyId = workItemInfo.story_id || task.story_id || '';
      const name = workItemInfo.name || task.name || '';

      if (!name) return;
      totalCount++;

      const url = storyId ? `https://project.feishu.cn/demo-002/story/detail/${storyId}` : '';

      tasks.push({
        name,
        storyId,
        url,
        startTs: time.start,
        endTs: time.end,
        startTime: timestampToDateTime(time.start),
        endTime: timestampToDateTime(time.end),
        assignee: schedule.user_info?.name_ch || schedule.user_info?.name_en || '',
      });
    });
  });
  return { tasks, totalCount };
}

function FeishuImportModal({ isOpen, onCancel, onImport, showToast, defaultListId = 'todo' }) {
  const { lists } = useStore();
  const [curlText, setCurlText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [previewTasks, setPreviewTasks] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [showExtracted, setShowExtracted] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [targetListId, setTargetListId] = useState(defaultListId);
  const responseSectionRef = useRef(null);
  const extractedSectionRef = useRef(null);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCurlText('');
      setParsed(null);
      setPreviewTasks([]);
      setIsSubmitting(false);
      setResponseData(null);
      setError('');
      setIsClosing(false);
      setExtractedTasks([]);
      setShowExtracted(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  const safeJsonParse = (text) => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  // 解析 curl，实时更新解析结果
  const handleParse = () => {
    setError('');
    setResponseData(null);
    const result = parseCurl(curlText);
    if (result.error) {
      setParsed(null);
      setError(result.error);
      return;
    }
    setParsed(result);
    setPreviewTasks(extractTasksFromResponse(result.body ? safeJsonParse(result.body) : null));
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCancel();
    }, 200);
  };

  // 提交请求并展示响应（通过 Electron 主进程代发，绕过浏览器 CORS）
  const handleSubmit = async () => {
    if (!parsed) {
      setError('请先粘贴并解析 curl 命令');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setResponseData(null);

    try {
      // 清洗 headers：去掉 undefined / 非字符串值，确保能被 JSON 序列化
      const cleanHeaders = {};
      Object.entries(parsed.headers || {}).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        cleanHeaders[k] = String(v);
      });

      console.log('[FeishuImport] Submitting request');
      console.log('[FeishuImport] parsed.headers keys:', Object.keys(parsed.headers || {}));
      console.log('[FeishuImport] cleanHeaders keys:', Object.keys(cleanHeaders));
      console.log('[FeishuImport] cookie in clean:', (cleanHeaders.cookie || cleanHeaders.Cookie || '').length);

      let result;
      if (window.electronAPI?.httpRequest) {
        // Electron 环境：走主进程代发，绕过 CORS
        result = await window.electronAPI.httpRequest({
          url: parsed.url,
          method: parsed.method,
          headers: cleanHeaders,
          body: parsed.body,
        });
      } else {
        // 浏览器环境：通过本地开发服务器代理转发
        const proxyUrl = `${window.location.origin}/api/proxy`;
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: parsed.url,
            method: parsed.method,
            headers: cleanHeaders,
            body: parsed.body,
          }),
        });

        if (!response.ok) {
          // 代理层错误（如 500）
          let errText;
          try {
            errText = await response.text();
          } catch {
            errText = `HTTP ${response.status}`;
          }
          throw new Error(`代理请求失败 (${response.status}): ${errText}`);
        }

        result = await response.json();
        // 代理层错误（如 ok=false, error=...）
        if (!result.ok && result.error) {
          setError(`请求失败：${result.error}`);
          setResponseData({
            status: 0,
            statusText: 'ERROR',
            ok: false,
            data: { error: result.error },
          });
          setIsSubmitting(false);
          return;
        }
      }

      if (!result.ok && result.error) {
        setError(`请求失败：${result.error}`);
        setResponseData({
          status: 0,
          statusText: 'ERROR',
          ok: false,
          data: { error: result.error },
        });
        return;
      }

      setResponseData({
        status: result.status,
        statusText: result.statusText,
        ok: result.ok,
        data: result.data,
      });

      // 自动滚动到响应区域
      setTimeout(() => {
        if (responseSectionRef.current && bodyRef.current) {
          const sectionTop = responseSectionRef.current.offsetTop;
          const bodyScrollTop = bodyRef.current.scrollTop;
          const sectionHeight = responseSectionRef.current.offsetHeight;
          const bodyHeight = bodyRef.current.clientHeight;

          // 如果响应区域完全在可视范围之外，滚动到响应区顶部
          // 如果部分可见，滚动使其完整显示在底部
          const visibleTop = bodyScrollTop;
          const visibleBottom = bodyScrollTop + bodyHeight;
          const sectionBottom = sectionTop + sectionHeight;

          if (sectionBottom > visibleBottom || sectionTop < visibleTop) {
            bodyRef.current.scrollTo({
              top: Math.max(0, sectionBottom - bodyHeight),
              behavior: 'smooth',
            });
          }
        }
      }, 50);

      const data = result.data;
      const tasks = extractTasksFromResponse(typeof data === 'object' ? data : safeJsonParse(data));
      setPreviewTasks(tasks);

      if (result.ok) {
        showToast(`请求成功 (${result.status})`, 'success');
        if (onImport && tasks.length > 0) {
          onImport(tasks);
        }
      } else {
        setError(`请求失败：${result.status} ${result.statusText}`);
      }
    } catch (err) {
      setError(`请求失败：${err.message || '网络错误'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 提取数据：从飞书甘特图响应中提取任务
  const handleExtract = () => {
    if (!responseData || !responseData.data) {
      setError('响应数据为空，无法提取');
      return;
    }
    const rawData = typeof responseData.data === 'string'
      ? safeJsonParse(responseData.data)
      : responseData.data;
    const { tasks, totalCount } = extractSchedules(rawData);
    setExtractedTasks(tasks);
    setShowExtracted(true);
    if (tasks.length === 0) {
      showToast('未提取到任务，请检查响应数据中是否包含 user_schedules', 'warning');
    } else {
      showToast(`提取到 ${tasks.length} 个任务`, 'success');
      // 异步滚动到提取区（等 DOM 更新后）
      setTimeout(() => {
        if (extractedSectionRef.current && bodyRef.current) {
          const container = bodyRef.current;
          const target = extractedSectionRef.current;
          const offsetTop = target.offsetTop - container.offsetTop - 16;
          container.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      }, 100);
    }
  };

  // 批量导入提取的任务到任务系统
  const handleImportExtracted = async () => {
    if (extractedTasks.length === 0) return;
    setIsImporting(true);
    try {
      // 先把整批任务一次性传给 onImport，让外部统一处理（按日期分组、平均分配时间等）
      // 期望 onImport 返回 { success, failed, mode: 'batch' | 'single' }
      let handled = false;
      if (onImport) {
        try {
          const result = await onImport({
            tasks: extractedTasks,
            targetListId,
            mode: 'batch',
          });
          if (result && result.acknowledged === true) {
            handled = true;
          }
        } catch (err) {
          // fallback 到逐个调用
          console.warn('Batch import failed, fallback to single:', err);
        }
      }

      let successCount = 0;
      let failCount = 0;
      const failedTasks = [];
      if (!handled && onImport) {
        // 逐个调用（兼容老回调）
        for (const task of extractedTasks) {
          if (!task.name) {
            failCount++;
            failedTasks.push('未命名任务');
            continue;
          }
          try {
            await onImport({ ...task, _targetListId: targetListId, mode: 'single' });
            successCount++;
          } catch (err) {
            failCount++;
            failedTasks.push(task.name);
          }
        }
      } else {
        successCount = extractedTasks.filter(t => t.name).length;
      }

      const targetListName = lists.find(l => l.id === targetListId)?.name || targetListId;
      if (failCount === 0) {
        showToast(`成功生成 ${successCount} 个任务到「${targetListName}」`, 'success');
        // 全部导入成功后自动关闭弹窗
        setTimeout(() => handleClose(), 300);
      } else {
        showToast(`成功 ${successCount} 个，失败 ${failCount} 个（${failedTasks.slice(0, 3).join('、')}${failedTasks.length > 3 ? '...' : ''}）`, failCount > successCount ? 'error' : 'warning');
      }
    } catch (err) {
      showToast(`导入失败：${err.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const responseBodyText = useMemo(() => {
    if (!responseData) return '';
    const d = responseData.data;
    if (typeof d === 'string') return d;
    try {
      return JSON.stringify(d, null, 2);
    } catch {
      return String(d);
    }
  }, [responseData]);

  if (!isOpen && !isClosing) return null;

  return (
    <div className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`} onClick={handleClose}>
      <div
        className={`feishu-import-modal ${isClosing ? 'modal-content-closing' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="export-modal-header">
          <div className="export-modal-icon">
            <Icon name="cloud-download" size={24} />
          </div>
          <h3 className="export-modal-title">导入飞书项目</h3>
          <button className="export-modal-close-btn" onClick={handleClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="feishu-import-body" ref={bodyRef}>
          <div className="feishu-import-section">
            <label className="export-form-label">粘贴 curl (bash) 命令</label>
            <textarea
              className="feishu-import-textarea"
              placeholder={'curl -X POST \'https://open.feishu.cn/open-apis/task/v2/tasks\' \\\n  -H \'Authorization: Bearer t-xxx\' \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"summary": "示例任务"}\''}
              value={curlText}
              onChange={e => setCurlText(e.target.value)}
              spellCheck={false}
            />
            <div className="feishu-import-actions">
              <button
                className="btn btn-secondary"
                onClick={handleParse}
                disabled={!curlText.trim()}
              >
                <Icon name="file-text" size={14} />
                解析
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!parsed || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icon name="loader" size={14} className="exporting-icon" />
                    请求中...
                  </>
                ) : (
                  <>
                    <Icon name="check" size={14} />
                    提交请求
                  </>
                )}
              </button>
            </div>
          </div>

          {parsed && (
            <div className="feishu-import-section">
              <label className="export-form-label">
                请求预览
                {parsed.csrfAutoAdded && (
                  <span className="feishu-csrf-badge" title={`已从 Cookie 自动补全 X-CSRF-Token（来源：${parsed.csrfSource}）`}>
                    <Icon name="check" size={11} />
                    已自动添加 CSRF Token（{parsed.csrfSource}）
                  </span>
                )}
                {!parsed.csrfAutoAdded && parsed.csrfCandidates && parsed.csrfCandidates.length > 0 && (
                  <span className="feishu-csrf-badge feishu-csrf-warn" title="找到疑似 CSRF cookie 但未匹配，请检查">
                    <Icon name="alert-circle" size={11} />
                    找到 {parsed.csrfCandidates.length} 个疑似 CSRF 字段
                  </span>
                )}
                {!parsed.csrfAutoAdded && (!parsed.csrfCandidates || parsed.csrfCandidates.length === 0) && (
                  <span className="feishu-csrf-badge feishu-csrf-fail" title="Cookie 中未发现 CSRF 字段，可能需要手动添加 X-CSRF-Token header">
                    <Icon name="x" size={11} />
                    Cookie 中无 CSRF 字段
                  </span>
                )}
              </label>

              {parsed.csrfCandidates && parsed.csrfCandidates.length > 0 && (
                <details className="feishu-import-details" open>
                  <summary>CSRF 候选字段（{parsed.csrfCandidates.length}）</summary>
                  <pre>{parsed.csrfCandidates.map(c => `${c.name} = ${c.valuePreview}`).join('\n')}</pre>
                </details>
              )}
              <div className="feishu-import-preview">
                <div className="feishu-import-meta">
                  <span className={`feishu-method feishu-method-${parsed.method.toLowerCase()}`}>
                    {parsed.method}
                  </span>
                  <span className="feishu-url" title={parsed.url}>{parsed.url}</span>
                </div>
                {Object.keys(parsed.headers).length > 0 && (
                  <details className="feishu-import-details">
                    <summary>请求头 ({Object.keys(parsed.headers).length})</summary>
                    <pre>{Object.entries(parsed.headers).map(([k, v]) => `${k}: ${v}`).join('\n')}</pre>
                  </details>
                )}
                {parsed.body && (
                  <details className="feishu-import-details" open>
                    <summary>请求体</summary>
                    <pre>{(() => {
                      try { return JSON.stringify(JSON.parse(parsed.body), null, 2); }
                      catch { return parsed.body; }
                    })()}</pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {responseData && (
            <div className="feishu-import-section feishu-response-section" ref={responseSectionRef}>
              <label className="export-form-label">
                <span>响应数据</span>
                <span className={`feishu-status feishu-status-${responseData.ok ? 'ok' : 'fail'}`}>
                  {responseData.status} {responseData.statusText}
                </span>
              </label>
              <pre className="feishu-import-response">{responseBodyText}</pre>
              <div className="feishu-import-actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-primary"
                  onClick={handleExtract}
                  disabled={!responseData.ok}
                >
                  <Icon name="file-text" size={14} />
                  提取数据
                </button>
              </div>
            </div>
          )}

          {showExtracted && extractedTasks.length > 0 && (
            <div className="feishu-import-section feishu-response-section" ref={extractedSectionRef}>
              <div className="export-form-label feishu-extract-header">
                <span>提取的任务（{extractedTasks.length}）</span>
                <button
                  className="btn btn-primary feishu-import-confirm-btn"
                  onClick={handleImportExtracted}
                  disabled={isImporting}
                >
                  {isImporting ? (
                    <>
                      <Icon name="loader" size={14} className="exporting-icon" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Icon name="check" size={14} />
                      确认导入
                    </>
                  )}
                </button>
              </div>
              <div className="feishu-import-target-row">
                <label className="feishu-import-target-label">导入到：</label>
                <select
                  className="feishu-import-target-select"
                  value={targetListId}
                  onChange={(e) => setTargetListId(e.target.value)}
                >
                  {lists.map(list => (
                    <option key={list.id} value={list.id}>
                      {list.name}{list.isDefault ? '（默认）' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="feishu-task-list feishu-task-list-scrollable">
                {extractedTasks.map((task, idx) => (
                  <div key={`${task.storyId || idx}`} className="feishu-task-item">
                    <div className="feishu-task-title">
                      <Icon name="check" size={14} />
                      <span>{task.name}</span>
                    </div>
                    <div className="feishu-task-meta">
                      {task.assignee && <span>负责人：{task.assignee}</span>}
                      {task.startTime && <span>开始：{task.startTime}</span>}
                      {task.endTime && <span>结束：{task.endTime}</span>}
                    </div>
                    {task.url && (
                      <div className="feishu-task-meta">
                        <a href={task.url} target="_blank" rel="noreferrer">
                          {task.url}
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showExtracted && extractedTasks.length === 0 && (
            <div className="feishu-import-section">
              <div className="export-error">
                <Icon name="alert-circle" size={14} />
                <span>未提取到任务。请确认响应数据中包含 <code>data.user_schedules[].tasks</code> 路径</span>
              </div>
            </div>
          )}

          {previewTasks.length > 0 && (
            <div className="feishu-import-section">
              <label className="export-form-label">解析到 {previewTasks.length} 个任务</label>
              <div className="feishu-task-list">
                {previewTasks.map((task, idx) => (
                  <div key={task.task_id || idx} className="feishu-task-item">
                    <div className="feishu-task-title">
                      <Icon name="check" size={14} />
                      <span>{task.summary || task.task_id || `任务 ${idx + 1}`}</span>
                    </div>
                    {task.description && (
                      <div className="feishu-task-desc">{task.description}</div>
                    )}
                    <div className="feishu-task-meta">
                      {task.start_date && <span>开始: {task.start_date}</span>}
                      {task.due_date && <span>截止: {task.due_date}</span>}
                      {task.url && (
                        <a href={task.url} target="_blank" rel="noreferrer">查看</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="export-error">
              <Icon name="alert-circle" size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="export-modal-actions">
          <button className="btn btn-secondary" onClick={handleClose} disabled={isSubmitting}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeishuImportModal;