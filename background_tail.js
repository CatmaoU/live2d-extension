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

// ========== GitHub 代理拦截下载 ==========
var _browser = typeof chrome !== 'undefined' ? chrome : (typeof browser !== 'undefined' ? browser : null);
if (_browser && _browser.downloads) {
_browser.downloads.onCreated.addListener(function(downloadItem) {
  var url = downloadItem.url || '';
  
  // 如果定向代理开启，使用选中的节点
  if (_ghProxyEnabled && _ghProxyUrl) {
    if (url.indexOf(_ghProxyUrl) === 0) return; // 已走当前节点，跳过
    
    var proxyBase = _ghProxyUrl.replace(/\/+$/, '');
    var newUrl = null;
    
    // 原始 GitHub 下载
    var m = url.match(/^(https:\/\/(?:codeload\.github\.com\/|raw\.githubusercontent\.com\/|github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*))/);
    if (m) newUrl = proxyBase + '/' + m[1];
    
    // 已走代理双 https
    if (!newUrl) {
      m = url.match(/^https:\/\/[^\/]+\/(https:\/\/github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*)/);
      if (m) newUrl = proxyBase + '/' + m[1];
    }
    
    // 已走代理单 https
    if (!newUrl) {
      m = url.match(/^https:\/\/[^\/]+\/(github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*)/);
      if (m) newUrl = proxyBase + '/https://' + m[1];
    }
    
    if (newUrl) {
      console.log('[GH] Intercept:', url.substring(0,50), '->', newUrl.substring(0,50));
      try {
        _browser.downloads.cancel(downloadItem.id, function() {
          if (!(chrome || browser).runtime.lastError) {
            _browser.downloads.download({ url: newUrl, conflictAction: 'overwrite' });
          }
        });
      } catch(e) {}
      return;
    }
  }
  
  // 如果是原始 GitHub 链接（未被代理），不处理
  if (/^https:\/\/(codeload\.github\.com|raw\.githubusercontent\.com|github\.com)\//.test(url)) return;
  
  // 定向代理关闭时：还原被代理的下载链接
  var restoreUrl = null;
  var restoreMatch = url.match(/^https:\/\/[^\/]+\/(https:\/\/(?:codeload\.github\.com\/|github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*))/);
  if (restoreMatch) restoreUrl = restoreMatch[1];
  if (!restoreUrl) {
    restoreMatch = url.match(/^https:\/\/[^\/]+\/((?:codeload\.)?github\.com\/[^\/]+\/[^\/]+\/(?:archive\/|releases\/download\/|raw\/).*)/);
    if (restoreMatch) restoreUrl = 'https://' + restoreMatch[1];
  }
  if (restoreUrl) {
      console.log('[GH] Restore:', url.substring(0,50), '->', restoreUrl.substring(0,50));
      try {
        _browser.downloads.cancel(downloadItem.id, function() {
          if (!(chrome || browser).runtime.lastError) {
            _browser.downloads.download({ url: restoreUrl, conflictAction: 'overwrite' });
          }
        });
      } catch(e) {}
    }
  });
} // end if(_browser && _browser.downloads)

// 来自 popup 的消息处理
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkUpdate') {
    checkForUpdate(function(info) {
      sendResponse(info || { version: chrome.runtime.getManifest().version, upToDate: true });
    });
    return true;
  }
  if (request.action === 'switchGhProxy') {
    console.log('[GH] switchGhProxy:', request.proxy);
    _ghProxyUrl = request.proxy;
    _ghProxyEnabled = true;
    chrome.storage.local.set({ githubProxyUrl: request.proxy, githubProxyEnabled: true });
    updateGhProxyRules(true, request.proxy);
    sendResponse({ ok: true });
    return true;
  }
  if (request.action === 'disableGhProxy') {
    _ghProxyEnabled = false;
    _ghProxyUrl = '';
    chrome.storage.local.set({ githubProxyEnabled: false, githubProxyUrl: '' });
    // 直接替换为回源规则（移除旧规则 + 添加还原规则）
    try {
      _dnr.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [1001,1002,1003,1004,1005,1006,1007,1008,1009,1010],
        addRules: [
          { id: 1001, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: 'https://\\1' } }, condition: { regexFilter: '^https://[^/]+/https://(codeload\\.github\\.com/.*|github\\.com/[^/]+/[^/]+/(archive/|releases/download/|raw/).*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } },
          { id: 1002, priority: 1, action: { type: 'redirect', redirect: { regexSubstitution: 'https://\\1' } }, condition: { regexFilter: '^https://[^/]+/(codeload\\.github\\.com/.*|github\\.com/[^/]+/[^/]+/(archive/|releases/download/|raw/).*)', resourceTypes: ['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','other'] } }
        ]
      });
    } catch(e){}
    // 清理所有动态 + session 规则
    if (_dnr) {
      try {
        _dnr.declarativeNetRequest.getDynamicRules(function(rules) {
          var ids = rules.map(function(r) { return r.id; });
          if (ids.length > 0) _dnr.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids });
        });
      } catch(ex) {}
      try {
        _dnr.declarativeNetRequest.getSessionRules(function(rules) {
          var ids = rules.map(function(r) { return r.id; });
          if (ids.length > 0) _dnr.declarativeNetRequest.updateSessionRules({ removeRuleIds: ids });
        });
      } catch(ex) {}
      // 用简单 removal 做最后保障
      try { _dnr.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1001,1002,1003,1004,1005,1006,1007,1008,1009,1010] }); } catch(ex) {}
      try { _dnr.declarativeNetRequest.updateSessionRules({ removeRuleIds: [1001,1002,1003,1004,1005,1006,1007,1008,1009,1010] }); } catch(ex) {}
    }
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
