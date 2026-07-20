/**
 * 开发环境 CORS 代理
 * 浏览器请求 POST /api/proxy { url, method, headers, body } -> 转发到目标 URL
 * 用于飞书等不支持 CORS 的第三方接口调试
 */
module.exports = function (app) {
  app.use('/api/proxy', (req, res) => {
    // CORS 预检
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      });
      return res.end();
    }

    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });
    req.on('end', async () => {
      try {
          const payload = JSON.parse(rawBody || '{}');
          const { url, method = 'GET', headers = {}, body = null, timeout = 30000 } = payload;

          // 调试日志：记录接收到的所有 headers 和 payload 大小
          console.log('[Proxy] Request:', method, url);
          console.log('[Proxy] Header count:', Object.keys(headers).length);
          console.log('[Proxy] All header keys:', Object.keys(headers));
          console.log('[Proxy] X-CSRF-Token:', headers['X-CSRF-Token'] || headers['x-csrf-token'] || '(missing)');
          console.log('[Proxy] cookie length:', (headers.cookie || headers.Cookie || '').length);
          console.log('[Proxy] body length:', (body || '').length);
          console.log('[Proxy] rawBody length:', rawBody.length);

        if (!url) {
          return jsonResponse(res, 400, { ok: false, error: 'URL 不能为空' });
        }

        let parsedUrl;
        try {
          parsedUrl = new URL(url);
        } catch (e) {
          return jsonResponse(res, 400, { ok: false, error: 'URL 格式无效' });
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          return jsonResponse(res, 400, { ok: false, error: '仅支持 http/https 协议' });
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(url, {
            method,
            headers,
            body: body || undefined,
            signal: controller.signal,
          });

          const contentType = response.headers.get('content-type') || '';
          let data;
          if (contentType.includes('application/json')) {
            try {
              data = await response.json();
            } catch (e) {
              data = await response.text();
            }
          } else {
            data = await response.text();
          }

          jsonResponse(res, 200, {
            ok: response.ok,
            status: response.status,
            statusText: response.statusText,
            contentType,
            data,
          });
        } catch (err) {
          jsonResponse(res, 200, {
            ok: false,
            error: err.name === 'AbortError' ? `请求超时（${timeout}ms）` : (err.message || '网络请求失败'),
          });
        } finally {
          clearTimeout(timer);
        }
      } catch (err) {
        jsonResponse(res, 500, { ok: false, error: `代理内部错误：${err.message}` });
      }
    });
  });
};

function jsonResponse(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}