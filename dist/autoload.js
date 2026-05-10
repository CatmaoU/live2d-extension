/*!
 * Live2D Widget
 * https://github.com/stevenjoezhang/live2d-widget
 */

// Recommended to use absolute path for live2d_path parameter
// live2d_path 参数建议使用绝对路径
// Get base URL from chrome/firefox extension if available, otherwise use default CDN
var live2d_path;
try {
    const browserAPI = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) ? browser : ((typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome : null);
    if (browserAPI.runtime && browserAPI.runtime.getURL) {
        live2d_path = browserAPI.runtime.getURL('dist/');
        if (!live2d_path.endsWith('/')) live2d_path += '/';
    } else {
        live2d_path = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0-rc.6/dist/';
    }
} catch (e) {
    live2d_path = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0-rc.6/dist/';
}

// Method to encapsulate asynchronous resource loading
// 封装异步加载资源的方法
function loadExternalResource(url, type) {
    return new Promise((resolve, reject) => {
        let tag;

        if (type === 'css') {
            tag = document.createElement('link');
            tag.rel = 'stylesheet';
            tag.href = url;
        }
        else if (type === 'js') {
            tag = document.createElement('script');
            tag.type = 'module';
            tag.src = url;
        }
        if (tag) {
            tag.onload = () => resolve(url);
            tag.onerror = () => reject(url);
            document.head.appendChild(tag);
        }
    });
}

(async () => {
    // If you're concerned about display issues on mobile devices, you can use screen.width to determine whether to load
    // 如果担心手机上显示效果不好，可以根据屏幕宽度来判断是否加载
    // if (screen.width < 768) return;

    // Avoid cross-origin issues with image resources
    // 避免图片资源跨域问题
    const OriginalImage = window.Image;
    window.Image = function(...args) {
        const img = new OriginalImage(...args);
        img.crossOrigin = "anonymous";
        return img;
    };
    window.Image.prototype = OriginalImage.prototype;

    // Get settings from localStorage if available
    var settings = {};
    try {
        var savedSettings = localStorage.getItem('live2dExtensionSettings');
        if (savedSettings) {
            settings = JSON.parse(savedSettings);
        }
    } catch (e) {
        console.log('[Live2D] Could not read settings from localStorage');
    }
    var DEFAULT_CDN = 'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api@1.0.1/';
    var effectiveCdn = settings.cdnPath || DEFAULT_CDN;
    var drag = settings.drag || false;
    var modelSource = settings.modelSource || 'official';
    var localModel = settings.localModel || '';
    var cubism3Model = settings.cubism3Model || '';
    var useCubism3 = settings.useCubism3 || false;

    console.log('[Live2D] Model source:', modelSource, 'Use Cubism3:', useCubism3);

    // If using Cubism 3, skip Cubism 2 initialization
    if (modelSource === 'local' && useCubism3) {
        console.log('[Live2D] Using Cubism 3 renderer, skipping Cubism 2 initialization');
        return;
    }

    var targetModel = useCubism3 ? cubism3Model : localModel;

    // Determine modelId and models to pass to initWidget
    var modelId = 0;
    var modelsList = [];
    var widgetModels = [];

    if (modelSource === 'local' && effectiveCdn.includes('live2d-static-api')) {
        try {
            console.log('[Live2D] Loading models list from:', effectiveCdn + 'models.json');
            const modelsResponse = await fetch(effectiveCdn + 'models.json', { cache: 'no-cache' });
            modelsList = await modelsResponse.json();
            console.log('[Live2D] Loaded', modelsList.length, 'models');

            const targetModels = useCubism3 ?
                modelsList.filter(m => m.isCubism3) :
                modelsList.filter(m => !m.isCubism3);
            
            console.log('[Live2D] Filtered', targetModels.length, 'target models');
            
            // Build widget-compatible models array
            widgetModels = targetModels.map(m => ({
                paths: [effectiveCdn + m.modelPath + '/default.json'],
                message: m.modelIntroduce || m.modelPath
            }));
            
            // Find model index
            const modelIndex = targetModels.findIndex(m => m.modelPath === targetModel);

            if (modelIndex !== -1) {
                modelId = modelIndex;
                console.log('[Live2D] Found model at index:', modelIndex, '(Cubism3:', useCubism3, ')');
            } else {
                console.log('[Live2D] Model not found in list, using default');
            }
        } catch (e) {
            console.error('[Live2D] Failed to load models list:', e);
        }
    }

    // Load waifu.css and waifu-tips.js from extension's dist folder
    // 加载 waifu.css 和 waifu-tips.js 从扩展的 dist 文件夹
    await Promise.all([
        loadExternalResource(live2d_path + 'waifu.css', 'css'),
        loadExternalResource(live2d_path + 'waifu-tips.js', 'js')
    ]);

    // Get live2d.min.js path from extension
    var localLive2dPath = live2d_path + 'live2d.min.js';

    // Save model switching to chrome/firefox storage
    function saveCurrentModelToStorage(modelId) {
        const browserAPI = (typeof browser !== 'undefined' && browser.storage) ? browser : ((typeof chrome !== 'undefined' && chrome.storage) ? chrome : null);
        if (browserAPI.storage && browserAPI.storage.local && modelSource === 'local') {
            try {
                const targetModels = useCubism3 ?
                    modelsList.filter(m => m.isCubism3) :
                    modelsList.filter(m => !m.isCubism3);
                if (targetModels[modelId]) {
                    const storageKey = useCubism3 ? 'cubism3Model' : 'localModel';
                    browserAPI.storage.local.set({
                        [storageKey]: targetModels[modelId].modelPath
                    }, () => {
                        console.log('[Live2D] Model choice saved:', targetModels[modelId].modelPath, '(Cubism3:', useCubism3, ')');
                    });
                }
            } catch (err) {
                console.error('[Live2D] Failed to save model choice:', err);
            }
        }
    }

    // Monitor localStorage for model changes
    let lastModelId = localStorage.getItem('modelId');
    const modelObserver = setInterval(() => {
        const currentModelId = localStorage.getItem('modelId');
        if (currentModelId !== lastModelId && modelSource === 'local' && effectiveCdn.includes('live2d-static-api')) {
            lastModelId = currentModelId;
            const newModelId = parseInt(currentModelId, 10);
            if (!isNaN(newModelId)) {
                saveCurrentModelToStorage(newModelId);
            }
        }
    }, 1000);

    // Cleanup observer when page unloads
    window.addEventListener('beforeunload', () => {
        clearInterval(modelObserver);
    });

    // Configure initWidget
    const widgetConfig = {
        waifuPath: live2d_path + 'waifu-tips.json',
        cubism2Path: localLive2dPath,
        cubism5Path: 'https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js',
        modelId: modelId,
        tools: ['hitokoto', 'asteroids', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
        logLevel: 'info',
        drag: drag,
    };

    // For local models, pass widgetModels directly without cdnPath
    if (modelSource === 'local' && widgetModels.length > 0) {
        console.log('[Live2D] Using local models with direct widgetModels');
        window.initWidget(widgetConfig, widgetModels);
    } else {
        // Use CDN
        console.log('[Live2D] Using CDN models');
        widgetConfig.cdnPath = effectiveCdn;
        window.initWidget(widgetConfig);
    }

    // -------------------------------------------------------------------------
    // 核心拖拽修复：我们加一个完全独立的拖拽功能，不依赖 waifu-tips.js
    // -------------------------------------------------------------------------
    setTimeout(function() {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let initialLeft = 0;
        let initialTop = 0;

        const waifu = document.getElementById('waifu');
        if (!waifu) {
            console.warn('[Live2D] Could not find #waifu element for drag, trying again later...');
            setTimeout(arguments.callee, 1000);
            return;
        }

        console.log('[Live2D] Setting up custom drag handler');

        // 检查是否开启了拖拽，以及是否有保存的位置
        let isDragEnabledNow = false;
        let hasSavedPosition = false;
        try {
            const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            isDragEnabledNow = settingsData.drag === true;
            hasSavedPosition = settingsData.draggedLeft !== undefined && settingsData.draggedTop !== undefined;
            
            // 如果有保存的位置！不管是否开启拖拽！都恢复这个位置！
            if (hasSavedPosition) {
                console.log('[Live2D] Found saved drag position, restoring now');
                waifu.style.bottom = 'auto';
                waifu.style.right = 'auto';
                waifu.style.left = settingsData.draggedLeft + 'px';
                waifu.style.top = settingsData.draggedTop + 'px';
            }
        } catch (e) {}

        // 网页刷新后，如果没有保存位置！就用默认 CSS 位置！
        console.log('[Live2D] Drag handler initialized (no saved position, use default CSS)');
        
        // 初始化时调整气泡位置！
        if (hasSavedPosition) {
            try {
                const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                enforceTipsPositionAutoload(settingsData.draggedTop);
            } catch(e) {}
        }

        // 拖拽监听
        waifu.addEventListener('mousedown', function(e) {
            // 排除按钮
            if (e.target.closest('button') || e.target.closest('#waifu-tool')) return;
            // 排除右键
            if (e.button === 2) return;

            // 检查是否开启拖拽
            try {
                const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                if (settingsData.drag !== true) return;
            } catch (e) {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            // 关键修复：强制清除 bottom/right！
            waifu.style.bottom = 'auto';
            waifu.style.right = 'auto';

            // 检查是否有保存的位置！
            let hasSavedPosition = false;
            try {
                const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                hasSavedPosition = settingsData.draggedLeft !== undefined && settingsData.draggedTop !== undefined;
            } catch(e) {}

            if (hasSavedPosition) {
                // 有保存的位置！从保存的位置开始拖拽！
                const rect = waifu.getBoundingClientRect();
                initialLeft = rect.left;
                initialTop = rect.top;
                console.log('[Live2D] Drag started from saved position:', initialLeft, initialTop);
            } else {
                // 没有保存的位置！强制放在视口左下角！绝对不会消失！
                initialLeft = 0;
                initialTop = window.innerHeight - 300;
                waifu.style.left = initialLeft + 'px';
                waifu.style.top = initialTop + 'px';
                console.log('[Live2D] Drag started from viewport bottom-left:', initialLeft, initialTop);
            }

            e.preventDefault();
        });

        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            let newLeft = initialLeft + (e.clientX - startX);
            let newTop = initialTop + (e.clientY - startY);
            
            // 检查是否开启限位
            let isDragLimitEnabled = true;
            try {
                const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                isDragLimitEnabled = settingsData.dragLimit !== false; // 默认开启
            } catch (e) {
                isDragLimitEnabled = true;
            }
            
            if (isDragLimitEnabled) {
                // 限位！防止看板娘拖出屏幕！
                const waifuRect = waifu.getBoundingClientRect();
                const minLeft = 0; // 左边界
                const maxLeft = window.innerWidth - waifuRect.width; // 右边界
                const minTop = 0; // 上边界
                const maxTop = window.innerHeight - waifuRect.height; // 下边界
                
                newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
                newTop = Math.max(minTop, Math.min(newTop, maxTop));
            }
            
            waifu.style.left = newLeft + 'px';
            waifu.style.top = newTop + 'px';
            waifu.style.bottom = 'auto';
            waifu.style.right = 'auto';
            
            // 实时调整气泡位置！
            enforceTipsPositionAutoload(newTop);
        });

        document.addEventListener('mouseup', function() {
            if (!isDragging) return;
            isDragging = false;
            
            let settingsData = null;
            // 每次拖拽结束都保存位置！不管是否开启拖拽！
            try {
                const rect = waifu.getBoundingClientRect();
                settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settingsData.draggedLeft = rect.left;
                settingsData.draggedTop = rect.top;
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                console.log('[Live2D] Drag position saved at:', rect.left, rect.top);
            } catch (e) {
                console.error('[Live2D] Could not save drag position', e);
            }
            
            // 更新气泡位置！
            if (settingsData) {
                enforceTipsPositionAutoload(settingsData.draggedTop);
            }
        });
    }, 1500);

    // 获取或初始化原始位置信息
    function getOriginalPositionInfo() {
        try {
            const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            // 如果还没有保存过原始位置，就记录一次
            if (settingsData.originalIsTopPosition === undefined) {
                const position = settingsData.position || 'left-bottom';
                settingsData.originalIsTopPosition = position === 'left-top' || position === 'right-top' || position === 'top-center';
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                console.log('[Live2D] Saved original position info:', settingsData.originalIsTopPosition);
            }
            return settingsData.originalIsTopPosition;
        } catch (e) {
            return false; // 默认是底端位置
        }
    }
    
    // 气泡位置强制更新函数（用于 autoload.js 中）
    function enforceTipsPositionAutoload(newTop) {
        const tipsEl = document.getElementById('waifu-tips');
        if (!tipsEl) return;
        
        const originalIsTopPosition = getOriginalPositionInfo();
        const isDragToTop = newTop < 200;
        
        // 根据原始位置和当前拖拽位置来决定气泡位置
        if (originalIsTopPosition) {
            // 原始在顶端位置
            if (isDragToTop) {
                // 仍在顶端，气泡朝下
                tipsEl.style.setProperty('top', 'calc(50% + 190px)', 'important');
                tipsEl.style.setProperty('bottom', 'auto', 'important');
            } else {
                // 拖到下方，气泡朝上
                tipsEl.style.setProperty('top', 'calc(50% - 165px)', 'important');
                tipsEl.style.setProperty('bottom', 'auto', 'important');
            }
        } else {
            // 原始在底端位置
            if (isDragToTop) {
                // 拖到上方，气泡朝下
                tipsEl.style.setProperty('top', 'calc(50% + 190px)', 'important');
                tipsEl.style.setProperty('bottom', 'auto', 'important');
            } else {
                // 仍在底端，气泡朝上
                tipsEl.style.setProperty('top', 'calc(50% - 165px)', 'important');
                tipsEl.style.setProperty('bottom', 'auto', 'important');
            }
        }
        tipsEl.style.setProperty('left', '50%', 'important');
        tipsEl.style.setProperty('transform', 'translateX(calc(-50% - 26px))', 'important');
    }
    
    // 监听拖拽开关更新
    window.addEventListener('live2dUpdateDragCubism2', function(event) {
        console.log('[Live2D] Drag switch updated:', event.detail.drag);
        const waifu = document.getElementById('waifu');
        if (!waifu) return;

        // 如果开启拖拽！检查是否有保存的位置！
        if (event.detail.drag) {
            try {
                const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                if (settingsData.draggedLeft !== undefined && settingsData.draggedTop !== undefined) {
                    // 有保存的位置！恢复！
                    waifu.style.bottom = 'auto';
                    waifu.style.right = 'auto';
                    waifu.style.left = settingsData.draggedLeft + 'px';
                    waifu.style.top = settingsData.draggedTop + 'px';
                    console.log('[Live2D] Drag enabled, restored saved position');
                    // 同时更新气泡位置
                    enforceTipsPositionAutoload(settingsData.draggedTop);
                } else {
                    // 没有保存的位置！用默认 CSS 位置！
                    console.log('[Live2D] Drag enabled, using default CSS position');
                }
            } catch (e) {
                console.error('[Live2D] Could not restore position on drag enable', e);
            }
        } else {
            // 关闭拖拽！不做任何位置修改！保持当前位置！
            console.log('[Live2D] Drag disabled, keeping current position');
        }
    });

    // ================================================
    // 页面可见性优化：配合 content.js 处理
    // ================================================
    
    // 监听冻结/解冻事件，添加日志以便调试
    window.addEventListener('live2dFreezeModel', function() {
        console.log('[Live2D Cubism2] Model freeze event received');
    });
    
    window.addEventListener('live2dUnfreezeModel', function() {
        console.log('[Live2D Cubism2] Model unfreeze event received');
    });
    
    console.log('[Live2D Cubism2] Page visibility memory optimization enabled');
})();

console.log('\n%cLive2D%cWidget%c\n', 'padding: 8px; background: #cd3e45; font-weight: bold; font-size: large; color: white;', 'padding: 8px; background: #ff5450; font-size: large; color: #eee;', '');
