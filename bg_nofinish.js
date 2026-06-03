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
}

