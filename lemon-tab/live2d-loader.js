// Live2D NewTab Loader - 外部脚本文件，避免 CSP 内联脚本限制

(function() {
    // 检查是否已经加载过看板娘脚本，避免重复加载
    if (window.live2dNewTabLoaded) {
        console.log('[Live2D NewTab] Live2D script already loaded, skipping');
        return;
    }
    
    // 检查是否在浏览器扩展环境中
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
        // 标记已加载
        window.live2dNewTabLoaded = true;
        
        var script = document.createElement('script');
        script.src = chrome.runtime.getURL('newtab-inject.js');
        script.onload = function() {
            console.log('[Live2D NewTab] newtab-inject.js loaded successfully');
        };
        script.onerror = function(err) {
            console.error('[Live2D NewTab] Failed to load newtab-inject.js:', err);
            // 重置标记，允许重试
            window.live2dNewTabLoaded = false;
        };
        document.head.appendChild(script);
    }
})();