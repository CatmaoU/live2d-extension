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

