// Live2D Widget Extension - Background Script for Title Fetching
// This service worker handles title fetching via Chrome Extension APIs

let tabTitles = {};

// Load stored titles on startup
chrome.storage.local.get(['tabTitles'], (result) => {
  if (result.tabTitles) {
    tabTitles = result.tabTitles;
    console.log('[Live2D Background] Loaded stored titles:', Object.keys(tabTitles).length);
  }
});

// Listen for tab updates to store page titles
chrome.webNavigation?.onCompleted?.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => {
      if (tab && tab.title && tab.url && tab.url.startsWith('http')) {
        try {
          const urlObj = new URL(tab.url);
          const domain = urlObj.hostname.replace(/^www\./, '');
          tabTitles[domain] = tab.title;
          // Also store by full domain with www
          tabTitles[urlObj.hostname] = tab.title;
          // Store in extension storage for persistence
          chrome.storage.local.set({ tabTitles: tabTitles }, () => {
            console.log('[Live2D Background] Stored title for:', domain, '=', tab.title);
          });
        } catch (e) {
          // Invalid URL, ignore
        }
      }
    });
  }
});

// Also listen for tab updates via tabs API as fallback
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.title && tab.url && tab.url.startsWith('http')) {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      tabTitles[domain] = tab.title;
      tabTitles[urlObj.hostname] = tab.title;
    } catch (e) {
      // Invalid URL, ignore
    }
  }
});

// Listen for messages from content scripts
chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTitle') {
    const url = request.url || '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      const hostname = urlObj.hostname;
      const domain = hostname.replace(/^www\./, '');

      console.log('[Live2D Background] getTitle request:', hostname, 'domain:', domain);
      console.log('[Live2D Background] Available titles:', Object.keys(tabTitles));

      // Check exact hostname match
      if (tabTitles[hostname]) {
        console.log('[Live2D Background] Found exact match:', tabTitles[hostname]);
        sendResponse({ title: tabTitles[hostname] });
        return true;
      }

      // Check domain without www
      if (tabTitles[domain]) {
        console.log('[Live2D Background] Found domain match:', tabTitles[domain]);
        sendResponse({ title: tabTitles[domain] });
        return true;
      }

      // Check partial matches
      for (const [key, value] of Object.entries(tabTitles)) {
        if (key.includes(domain) || domain.includes(key)) {
          console.log('[Live2D Background] Found partial match:', key, '=', value);
          sendResponse({ title: value });
          return true;
        }
      }

      console.log('[Live2D Background] No title found for:', hostname);
      sendResponse({ title: null });
    } catch (e) {
      console.error('[Live2D Background] Error:', e);
      sendResponse({ title: null });
    }
    return true;
  }

  if (request.action === 'storeTitle') {
    const { url, title } = request;
    if (url && title) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
        const domain = urlObj.hostname.replace(/^www\./, '');
        tabTitles[domain] = title;
        tabTitles[urlObj.hostname] = title;
        chrome.storage.local.set({ tabTitles: tabTitles });
        console.log('[Live2D Background] Stored title:', domain, '=', title);
      } catch (e) {
        // Invalid URL
      }
    }
    sendResponse({ success: true });
    return true;
  }

  // Proxy API requests to bypass CORS
  if (request.action === 'fetchApi') {
    const { url, options } = request;
    const responseType = (options && options.responseType) || 'json';
    console.log('[Live2D Background] Proxying API request:', url, 'responseType:', responseType);

    if (responseType === 'dataUrl') {
      fetch(url, options)
        .then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          var ct = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
          return r.arrayBuffer().then(function(buf) { return { buf: buf, ct: ct }; });
        })
        .then(function(info) {
          var binary = new TextDecoder('latin1').decode(new Uint8Array(info.buf));
          sendResponse({ success: true, data: 'data:' + info.ct + ';base64,' + btoa(binary) });
        })
        .catch(function(error) {
          console.error('[Live2D Background] dataUrl fetch failed:', error);
          sendResponse({ success: false, error: error.message });
        });
    } else {
      fetch(url, options)
        .then(async function(response) {
          const data = await response.json();
          sendResponse({ success: true, data: data, status: response.status });
        })
        .catch(function(error) {
          console.error('[Live2D Background] Proxy request failed:', error);
          sendResponse({ success: false, error: error.message });
        });
    }

    return true;
  }

  // Fetch lewd image from sex.nyan.run (bypass CORS: host_permissions)
  if (request.action === 'fetchLewdImage') {
    fetch('https://sex.nyan.run/api/v2/?keyword=all&r18=true&num=1&t=' + Date.now(), { cache: 'no-store' })
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(j) {
        if (!j.success || !Array.isArray(j.data) || !j.data[0]) throw new Error('no data');
        var imgUrl = j.data[0].url;
        if (!imgUrl) throw new Error('no url');
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        // Also fetch the image as data URL
        fetch(imgUrl, { cache: 'no-cache' })
          .then(function(r2) {
            if (!r2.ok) throw new Error('HTTP ' + r2.status);
            var ct = (r2.headers.get('content-type') || 'image/jpeg').split(';')[0];
            return r2.arrayBuffer().then(function(buf) { return { buf: buf, ct: ct }; });
          })
          .then(function(info) {
            var binary = new TextDecoder('latin1').decode(new Uint8Array(info.buf));
            sendResponse({ success: true, dataUrl: 'data:' + info.ct + ';base64,' + btoa(binary), imageUrl: imgUrl });
          })
          .catch(function() { sendResponse({ success: true, imageUrl: imgUrl }); });
      })
      .catch(function(e) { sendResponse({ success: false, error: e.message }); });
    return true;
  }

  // Fetch image → base64 data URL (bypass CORS: background has host_permissions)
  if (request.action === 'fetchDailyImage') {
    const imgUrl = request.url;

    fetch(imgUrl, { cache: 'no-cache' })
      .then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        var ct = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
        return r.arrayBuffer().then(function(buf) {
          return { buf: buf, ct: ct };
        });
      })
      .then(function(info) {
        var u8 = new Uint8Array(info.buf);
        var binary = new TextDecoder('latin1').decode(u8);
        var dataUrl = 'data:' + info.ct + ';base64,' + btoa(binary);
        console.log('[Live2D Background] Data URL OK, size:', info.buf.byteLength, 'bytes, type:', info.ct);
        sendResponse({ success: true, dataUrl: dataUrl });
      })
      .catch(function(e) {
        console.error('[Live2D Background] Image fetch failed:', e.message);
        sendResponse({ success: true, imageUrl: imgUrl });
      });

    return true;
  }

  // Download screenshot (direct dataUrl from content script)
  if (request.action === 'downloadFile') {
    const { dataUrl, filename } = request;
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    }, function() { chrome.runtime.lastError; });
    return;
  }
});

// ─── 自动更新检查 ───
const UPDATE_URL = 'https://api.github.com/repos/CatmaoU/live2d-extension/releases/latest';
const DOWNLOAD_URL = 'https://github.com/CatmaoU/live2d-extension/releases/latest';

function compareVersions(a, b) {
  var pa = a.replace(/[^0-9.]/g, '').split('.');
  var pb = b.replace(/[^0-9.]/g, '').split('.');
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    var na = parseInt(pa[i] || '0', 10);
    var nb = parseInt(pb[i] || '0', 10);
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function checkForUpdate(callback) {
  var currentVer = chrome.runtime.getManifest().version;
  fetch(UPDATE_URL)
    .then(function(r) { if (!r.ok) throw 'HTTP ' + r.status; return r.json(); })
    .then(function(data) {
      var latestVer = (data.tag_name || '').replace(/^v/i, '');
      if (!latestVer) { callback(null); return; }
      if (compareVersions(latestVer, currentVer) > 0) {
        callback({ version: latestVer, url: data.html_url || DOWNLOAD_URL, notes: data.body || '' });
      } else {
        callback(null);
      }
    })
    .catch(function() { callback(null); });
}

chrome.runtime.onInstalled.addListener(function() {
  // 安装/更新后 1 小时首次检查，之后每 6 小时检查一次
  setTimeout(function() { checkForUpdate(function() {}); }, 3600000);
  setInterval(function() { checkForUpdate(function() {}); }, 21600000);
});

// ========== GitHub 代理加速 ==========
const GH_PROXY_RULE_PRIORITY = 1;
const GH_PROXIES = [
  'https://gh-proxy.org/',
  'https://v4.gh-proxy.org/',
  'https://v6.gh-proxy.org/',
  'https://cdn.gh-proxy.org/'
];
let _ghProxyEnabled = false;
let _ghProxyUrl = GH_PROXIES[2]; // 默认 v6

// 测试代理速度
function testProxySpeed(proxyUrl, timeout) {
  timeout = timeout || 5000;
  var testUrl = proxyUrl + 'https://raw.githubusercontent.com/';
  var start = Date.now();
  return fetch(testUrl, { method: 'HEAD', mode: 'no-cors', signal: AbortSignal.timeout(timeout) })
    .then(function() { return Date.now() - start; })
    .catch(function() { return null; });
}

// 选择最快代理
function pickFastestProxy() {
  var results = [];
  return Promise.all(GH_PROXIES.map(function(proxy) {
    return testProxySpeed(proxy).then(function(latency) {
      if (latency !== null) results.push({ proxy: proxy, latency: latency });
    });
  })).then(function() {
    results.sort(function(a, b) { return a.latency - b.latency; });
    return results.length > 0 ? results[0].proxy : GH_PROXIES[2];
  });
}

// 更新 DNR 规则
var _ghRuleIds = [1001, 1002, 1003, 1004, 1009, 1010];
function updateGhProxyRules(enabled, proxyUrl) {
  var prefix = (proxyUrl || '').replace(/\/+$/, '') + '/';
  if (enabled && proxyUrl) {
    var rules = [
      // 原始 GitHub 下载链接
      { id: 1001, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: prefix + '\\1' } }, condition: { regexFilter: '^(https://raw\\.githubusercontent\\.com/.*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } },
      { id: 1002, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: prefix + '\\1' } }, condition: { regexFilter: '^(https://github\\.com/[^/]+/[^/]+/archive/.*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } },
      { id: 1003, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: prefix + '\\1' } }, condition: { regexFilter: '^(https://github\\.com/[^/]+/[^/]+/releases/download/.*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } },
      { id: 1004, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: prefix + '\\1' } }, condition: { regexFilter: '^(https://github\\.com/[^/]+/[^/]+/raw/.*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } },
      // 通用匹配：任意代理域名后接 /https://github.com/（含 gh.api.99988866.xyz 等）
      { id: 1009, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: prefix + 'https://\\1' } }, condition: { regexFilter: '^https://[^/]+/https://(github\\.com/.*|raw\\.githubusercontent\\.com/.*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } },
      // 兼容单 https 格式：https://proxy/github.com/...
      { id: 1010, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: prefix + 'https://\\1' } }, condition: { regexFilter: '^https://[^/]+/(github\\.com/.*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } }
    ];
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: _ghRuleIds,
      addRules: rules
    }, function() {
      if (chrome.runtime.lastError) {
        console.log('[GitHub Proxy] Error adding rules:', chrome.runtime.lastError.message);
      } else {
        console.log('[GitHub Proxy] Proxy enabled:', proxyUrl);
      }
    });
  } else {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: _ghRuleIds
    }, function() {
      console.log('[GitHub Proxy] Proxy disabled');
    });
  }
}

// 监听 GitHub 代理开关
chrome.storage.onChanged.addListener(function(changes, area) {
  if (area === 'local' && changes.githubProxyEnabled !== undefined) {
    _ghProxyEnabled = changes.githubProxyEnabled.newValue;
    if (_ghProxyEnabled) {
      updateGhProxyRules(true, _ghProxyUrl || GH_PROXIES[2]);
    } else {
      updateGhProxyRules(false);
    }
  }
  if (area === 'local' && (changes.githubProxyUrl !== undefined || changes._ghProxyForceSwitch !== undefined)) {
    if (changes.githubProxyUrl) {
      _ghProxyUrl = changes.githubProxyUrl.newValue;
    } else {
      // _ghProxyForceSwitch 触发，从 storage 读最新值
      chrome.storage.local.get(['githubProxyUrl'], function(st) {
        if (st.githubProxyUrl) _ghProxyUrl = st.githubProxyUrl;
        if (_ghProxyUrl && _ghProxyEnabled) updateGhProxyRules(true, _ghProxyUrl);
      });
      return;
    }
    if (_ghProxyUrl && _ghProxyEnabled) updateGhProxyRules(true, _ghProxyUrl);
  }
});

// 后台 30 秒自动测速 + 切换到最快节点
function backgroundAutoPickFastest() {
  if (!_ghProxyEnabled) return;
  var results = [];
  var testUrl = 'https://raw.githubusercontent.com/CatmaoU/live2d-extension/main/README.md';
  // 从 storage 读用户节点列表
  chrome.storage.local.get(['ghProxyNodes'], function(st) {
    var nodes = st.ghProxyNodes || GH_PROXIES;
    var pending = nodes.length;
    nodes.forEach(function(proxy) {
    var fullUrl = proxy.replace(/\/+$/, '') + '/' + testUrl;
    var start = Date.now();
    fetch(fullUrl, { method: 'GET', signal: AbortSignal.timeout(8000) })
      .then(function(r) { return r.text(); })
      .then(function(body) {
        var elapsed = (Date.now() - start) / 1000;
        if (elapsed <= 0) elapsed = 0.001;
        var speedKB = (body.length / elapsed) / 1024;
        results.push({ proxy: proxy, speed: speedKB });
        pending--;
        if (pending <= 0) finishPick();
      })
      .catch(function() {
        results.push({ proxy: proxy, speed: 0 });
        pending--;
        if (pending <= 0) finishPick();
      });
  });
  function finishPick() {
    // 检查用户是否手动选择了节点（展开时手动选择）
    chrome.storage.local.get(['ghManualOverride'], function(st) {
      if (st.ghManualOverride) return; // 用户手动选择，不自动切换
      results.sort(function(a, b) { return b.speed - a.speed; });
      var best = results[0];
      if (best && best.speed > 0 && best.proxy !== _ghProxyUrl) {
        console.log('[GitHub Proxy] Auto-switching to fastest:', best.proxy, Math.round(best.speed) + 'KB/s');
        _ghProxyUrl = best.proxy;
        chrome.storage.local.set({ githubProxyUrl: best.proxy });
        updateGhProxyRules(true, best.proxy);
      }
    });
  }
}

// 启动时检查状态
chrome.storage.local.get(['githubProxyEnabled', 'githubProxyUrl', 'ghProxyNodes'], function(result) {
  if (result.githubProxyEnabled) {
    _ghProxyEnabled = true;
    _ghProxyUrl = result.githubProxyUrl || GH_PROXIES[2];
    if (result.ghProxyNodes) GH_PROXIES.length = 0; Array.prototype.push.apply(GH_PROXIES, result.ghProxyNodes);
    updateGhProxyRules(true, _ghProxyUrl);
    // 启动 30 秒自动切换
    backgroundAutoPickFastest();
    setInterval(backgroundAutoPickFastest, 30000);
  }
});

// ========== GitHub 代理拦截下载（通过 chrome.downloads API，从 storage 读最新节点）==========
chrome.downloads.onCreated.addListener(function(downloadItem) {
  // 从 storage 实时读取当前节点（而非缓存变量，确保与 UI 一致）
  chrome.storage.local.get(['githubProxyEnabled', 'githubProxyUrl'], function(st) {
    if (!st.githubProxyEnabled || !st.githubProxyUrl) return;
    var proxyUrl = st.githubProxyUrl;
    var url = downloadItem.url || '';
    if (url.indexOf(proxyUrl) === 0) return; // 跳过已代理下载
    
    var proxyBase = proxyUrl.replace(/\/+$/, '');
  var newUrl = null;
  
  // 原始 GitHub 下载
  var m = url.match(/^(https:\/\/(?:raw\.githubusercontent\.com\/|github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*))/);
  if (m) newUrl = proxyBase + '/' + m[1];
  
  // 已走代理双 https：https://任意域名/https://github.com/...
  if (!newUrl) {
    m = url.match(/^https:\/\/[^\/]+\/(https:\/\/github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*)/);
    if (m) newUrl = proxyBase + '/' + m[1];
  }
  
  // 已走代理单 https：https://任意域名/github.com/...
  if (!newUrl) {
    m = url.match(/^https:\/\/[^\/]+\/(github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*)/);
    if (m) newUrl = proxyBase + '/https://' + m[1];
  }
  
    if (newUrl) {
      console.log('[GitHub Proxy] Intercepting download:', url, '->', newUrl);
      try {
        chrome.downloads.cancel(downloadItem.id, function() {
          if (!chrome.runtime.lastError) {
            chrome.downloads.download({ url: newUrl, filename: downloadItem.filename, conflictAction: 'overwrite' });
          }
        });
      } catch(e) {
        console.log('[GitHub Proxy] Cancel failed:', e);
      }
    }
  }); // 关闭 storage.get 回调
});

// 来自 popup 的消息处理
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkUpdate') {
    checkForUpdate(function(info) {
      sendResponse(info || { version: chrome.runtime.getManifest().version, upToDate: true });
    });
    return true;
  }
  if (request.action === 'switchGhProxy') {
    _ghProxyUrl = request.proxy;
    _ghProxyEnabled = true;
    chrome.storage.local.set({ githubProxyUrl: request.proxy, githubProxyEnabled: true });
    updateGhProxyRules(true, request.proxy);
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'disableGhProxy') {
    _ghProxyEnabled = false;
    updateGhProxyRules(false);
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'testProxyLatency') {
    var start = Date.now();
    fetch(request.testUrl, { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(8000) })
      .then(function(r) {
        var latencyMs = Date.now() - start;
        return r.text().then(function(body) {
          var elapsed = (Date.now() - start) / 1000;
          if (elapsed <= 0) elapsed = 0.001;
          var speedKB = (body.length / elapsed) / 1024;
          sendResponse({ latency: latencyMs, speed: Math.round(speedKB) });
        });
      })
      .catch(function(e) {
        console.log('[GitHub Proxy] Speed test failed:', request.testUrl, e.message);
        sendResponse({ latency: null, speed: null });
      });
    return true;
  }
});

console.log('[Live2D Background] Title fetching service worker started');
