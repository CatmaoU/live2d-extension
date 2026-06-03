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
  });
}
