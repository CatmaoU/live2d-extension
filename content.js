// Live2D Widget Extension - Simple and Reliable
(function() {
    // 浏览器API兼容层：支持Chrome和Firefox
    const browserAPI = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
    console.log('[Live2D] Browser detected:', typeof browser !== 'undefined' && browser.storage ? 'Firefox (or compatible)' : 'Chrome/Edge');
    
    let lastSyncedSettings = null;
    
    // 同步 browser.storage 设置到 localStorage
    async function syncSettingsFromStorage() {
        try {
            const result = await new Promise((resolve) => {
                browserAPI.storage.local.get([
                    'aiEnabled', 'aiApiKey', 'siliconflowApiKey', 'aiProvider', 'aiConnected',
                    'pageSummaryEnabled',
                    'dailyImageEnabled', 'dailyImageCustomApi', 'dailyImageApiList',
                    'theme',
                    'longcatApiKey', 'qwenApiKey', 'hunyuanApiKey', 'ernieApiKey',
                    'doubaoApiKey', 'sparkApiKey', 'zhipuApiKey', 'moonshotApiKey', 'minimaxApiKey',
                    'atriApiKey',
                    'characterName', 'characterLikes', 'characterRelation', 'characterProfile', 'characterLimit',
                    'summaryRules',
                    // 模型选择字段
                    'deepseekModel', 'siliconflowModel', 'univibeModel', 'longcatModel',
                    'qwenModel', 'hunyuanModel', 'ernieModel', 'doubaoModel',
                    'sparkModel', 'zhipuModel', 'moonshotModel', 'minimaxModel', 'atriModel'
                ], (data) => {
                    resolve(data || {});
                });
            });
            
            const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            
            // 同步 AI 相关设置
            if (result.aiEnabled !== undefined) {
                settings.aiEnabled = result.aiEnabled;
            }
            if (result.aiApiKey) {
                settings.aiApiKey = result.aiApiKey;
            }
            if (result.siliconflowApiKey) {
                settings.siliconflowApiKey = result.siliconflowApiKey;
            }
            if (result.longcatApiKey) {
                settings.longcatApiKey = result.longcatApiKey;
                console.log('[Live2D Sync] Synced longcatApiKey from storage');
            }
            if (result.qwenApiKey) {
                settings.qwenApiKey = result.qwenApiKey;
            }
            if (result.hunyuanApiKey) {
                settings.hunyuanApiKey = result.hunyuanApiKey;
            }
            if (result.ernieApiKey) {
                settings.ernieApiKey = result.ernieApiKey;
            }
            if (result.doubaoApiKey) {
                settings.doubaoApiKey = result.doubaoApiKey;
            }
            if (result.sparkApiKey) {
                settings.sparkApiKey = result.sparkApiKey;
            }
            if (result.zhipuApiKey) {
                settings.zhipuApiKey = result.zhipuApiKey;
            }
            if (result.moonshotApiKey) {
                settings.moonshotApiKey = result.moonshotApiKey;
            }
            if (result.minimaxApiKey) {
                settings.minimaxApiKey = result.minimaxApiKey;
            }
            if (result.atriApiKey) {
                settings.atriApiKey = result.atriApiKey;
            }
            if (result.aiProvider) {
                settings.aiProvider = result.aiProvider;
            }
            if (result.aiConnected !== undefined) {
                settings.aiConnected = result.aiConnected;
            }
            if (result.pageSummaryEnabled !== undefined) {
                settings.pageSummaryEnabled = result.pageSummaryEnabled;
            }
            if (result.dailyImageEnabled !== undefined) {
                settings.dailyImageEnabled = result.dailyImageEnabled;
            }
            if (result.dailyImageCustomApi !== undefined) {
                settings.dailyImageCustomApi = result.dailyImageCustomApi;
            }
            if (result.dailyImageApiList !== undefined) {
                settings.dailyImageApiList = result.dailyImageApiList;
            }
            
            // 同步主题设置到 localStorage（用于 isDarkMode 检测）
            if (result.theme !== undefined) {
                localStorage.setItem('live2d-manual-theme', result.theme);
            }
            
            // 同步模型选择设置
            const modelFields = ['deepseekModel', 'siliconflowModel', 'univibeModel', 'longcatModel',
                                  'qwenModel', 'hunyuanModel', 'ernieModel', 'doubaoModel',
                                  'sparkModel', 'zhipuModel', 'moonshotModel', 'minimaxModel', 'atriModel'];
            modelFields.forEach(field => {
                if (result[field] !== undefined) {
                    settings[field] = result[field];
                }
            });
            
            // 同步角色信息
            if (result.characterName !== undefined) {
                settings.characterName = result.characterName;
            }
            if (result.characterLikes !== undefined) {
                settings.characterLikes = result.characterLikes;
            }
            if (result.characterRelation !== undefined) {
                settings.characterRelation = result.characterRelation;
            }
            if (result.characterProfile !== undefined) {
                settings.characterProfile = result.characterProfile;
            }
            if (result.characterLimit !== undefined) {
                settings.characterLimit = result.characterLimit;
            }
            if (result.summaryRules !== undefined) {
                settings.summaryRules = result.summaryRules;
            }
            
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
            
            // 只在设置变化时输出日志
            const resultStr = JSON.stringify(result);
            if (lastSyncedSettings !== resultStr) {
                lastSyncedSettings = resultStr;
                console.log('[Live2D] Settings synced from browser.storage:', result);
            }
            
            // 发送自定义事件通知页面
            const event = new CustomEvent('live2dSettingsUpdated', { detail: result });
            document.dispatchEvent(event);
        } catch (e) {
            console.log('[Live2D] Settings sync failed:', e);
        }
    }
    
    // 页面加载时同步设置
    syncSettingsFromStorage();
    
    // 定期同步设置（每 5 秒，减少日志频率）
    setInterval(syncSettingsFromStorage, 5000);

    // 即时同步：当 browser.storage 发生变化时立即同步到 localStorage
    if (browserAPI.storage.onChanged) {
        browserAPI.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') {
                syncSettingsFromStorage();
                // 同步模型按键映射到页面 localStorage
                if (changes.live2dModelKeyBindings && changes.live2dModelKeyBindings.newValue) {
                    try { localStorage.setItem('live2dModelKeyBindings', JSON.stringify(changes.live2dModelKeyBindings.newValue)); } catch(e) {}
                }
                if (changes.live2dSpecialBindings && changes.live2dSpecialBindings.newValue) {
                    try { localStorage.setItem('live2dSpecialBindings', JSON.stringify(changes.live2dSpecialBindings.newValue)); } catch(e) {}
                }
            }
        });
    }

    // 监听来自popup的消息
    browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'showPopupAchievement') {
            showPopupAchievement(message.title, message.message);
            sendResponse({ success: true });
        } else if (message.type === 'updateMouseCursorSize') {
            mouseCursorSize = message.size;
            console.log('[Live2D] Mouse cursor size updated to:', mouseCursorSize);
            initMouseCursor();
            sendResponse({ success: true });
        } else if (message.type === 'getSettings') {
            // 返回 AI 相关设置和角色信息
            browserAPI.storage.local.get(
                [
                    'aiEnabled', 'aiApiKey', 'siliconflowApiKey', 'aiProvider', 'aiConnected',
                    'pageSummaryEnabled',
                    'atriApiKey',
                    'characterName', 'characterLikes', 'characterRelation', 'characterProfile', 'characterLimit'
                ],
                (result) => {
                    console.log('[Live2D] getSettings requested, returning:', result);
                    sendResponse(result);
                }
            );
            return true; // 保持消息通道打开
        } else if (message.type === 'updateEnabledStatus') {
            // 更新 localStorage 中的 enabled 值
            var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            settingsData.enabled = message.enabled;
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
            console.log('[Live2D] Enabled status updated to:', message.enabled);
            
            // 重新初始化或隐藏看板娘
            if (message.enabled) {
                // 启用时重新初始化
                initLive2D();
            } else {
                // 禁用时隐藏看板娘
                const waifu = document.getElementById('waifu');
                if (waifu) {
                    waifu.style.display = 'none';
                }
                const tips = document.getElementById('waifu-tips');
                if (tips) {
                    tips.style.display = 'none';
                }
                const toggleBtn = document.getElementById('waifu-toggle');
                if (toggleBtn) {
                    toggleBtn.style.display = 'none';
                }
            }
            sendResponse({ success: true });
        } else if (message.type === 'updatePosition') {
            // 更新 localStorage 中的 position 值
            var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            settingsData.position = message.position;
            // 位置改变时清除拖拽位置
            delete settingsData.draggedLeft;
            delete settingsData.draggedTop;
            // 重置原始位置标记
            delete settingsData.originalIsTopPosition;
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
            console.log('[Live2D] Position updated to:', message.position);
            
            // 应用自定义样式
            applyCustomStyles();
            sendResponse({ success: true });
        } else if (message.type === 'updateModelSize') {
                // 更新 localStorage 中的 size 值
                var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settingsData.size = message.size;
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                console.log('[Live2D] Model size updated to:', message.size);
                
                // 检查当前是否是 Cubism3 模式
                if (settingsData.modelSource === 'local' && settingsData.useCubism3) {
                    // 对于 Cubism3 模式，动态更新 canvas 大小
                    updateCubism3Size(message.size);
                } else {
                    // 对于 Cubism2 模式，应用自定义样式
                    applyCustomStyles();
                }
                
                sendResponse({ success: true });
            } else if (message.type === 'updateDragStatus') {
        // 更新 localStorage 中的 drag 值
        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        
        // 如果开启拖拽并且还没有保存过位置，不先保存！
        // 如果关闭拖拽！把看板娘当前位置保存到 settings 的 draggedLeft 和 draggedTop！
        // 这样即使关闭拖拽，看板娘也固定在那！
        if (message.drag) {
            // 开启拖拽！暂时不做！
        } else {
            console.log('[Live2D] Closing drag, saving current position to localStorage');
            const waifu = document.getElementById('waifu');
            if (waifu) {
                const rect = waifu.getBoundingClientRect();
                // 保存当前视口位置！
                settingsData.draggedLeft = rect.left;
                settingsData.draggedTop = rect.top;
            }
        }
        
        settingsData.drag = message.drag;
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
        console.log('[Live2D] Drag status updated to:', message.drag);
                
                // 检查当前是否是 Cubism3 模式
                if (settingsData.modelSource === 'local' && settingsData.useCubism3) {
                    // 对于 Cubism3 模式，发送自定义事件给 autoload-cubism3.js
                    const event = new CustomEvent('live2dUpdateDrag', { detail: { drag: message.drag } });
                    window.dispatchEvent(event);
                } else {
                    // 对于 Cubism2 模式，无论开启或关闭拖拽，都重新应用自定义样式
                    console.log('[Live2D] Applying custom styles for Cubism2 drag update');
                    applyCustomStyles();
                    // 发送自定义事件给 Cubism2 的拖拽管理器
                    const event = new CustomEvent('live2dUpdateDragCubism2', { detail: { drag: message.drag } });
                    window.dispatchEvent(event);
                }
                
                sendResponse({ success: true });
            } else if (message.type === 'updateDragLimitStatus') {
                // 更新 localStorage 中的 dragLimit 值
                var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settingsData.dragLimit = message.dragLimit;
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                console.log('[Live2D] Drag limit status updated to:', message.dragLimit);
                
                // 检查当前是否是 Cubism3 模式
                if (settingsData.modelSource === 'local' && settingsData.useCubism3) {
                    // 对于 Cubism3 模式，发送自定义事件给 autoload-cubism3.js
                    const event = new CustomEvent('live2dUpdateDragLimit', { detail: { dragLimit: message.dragLimit } });
                    window.dispatchEvent(event);
                } else {
                    // 对于 Cubism2 模式，发送自定义事件给 autoload.js
                    const event = new CustomEvent('live2dUpdateDragLimitCubism2', { detail: { dragLimit: message.dragLimit } });
                    window.dispatchEvent(event);
                }
                
                sendResponse({ success: true });
            } else if (message.type === 'updateFreezeModelStatus') {
                // 更新 localStorage 中的 freezeModelEnabled 和 freezeMode 值
                var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settingsData.freezeModelEnabled = message.freezeModel;
                settingsData.freezeMode = message.freezeMode || 'quick'; // 默认快速恢复
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                console.log('[Live2D] Freeze model status updated to:', message.freezeModel, 'mode:', settingsData.freezeMode);
                
                // 实时生效
                if (message.freezeModel) {
                    // 先解冻再重新冻结（让新模式生效）
                    unfreezeLive2DModel();
                    setTimeout(function() {
                        freezeLive2DModel();
                    }, 50);
                } else {
                    unfreezeLive2DModel();
                }
                
                sendResponse({ success: true });
            } else if (message.type === 'cleanupModel') {
                // 清理当前标签页的模型（只要是隐藏页面就清理）
                window.__live2d_skipReload = message.skipReload === true;
                console.log('[Live2D] Received cleanupModel request, skipReload:', window.__live2d_skipReload);
                
                // 总是清理模型（发送清理命令的代码会确保只发送给非当前标签页）
                console.log('[Live2D] Cleaning up model for this tab');
                
                // 发送事件通知 Cubism3 清理模型
                const cleanupEvent = new CustomEvent('live2dCleanupModel');
                window.dispatchEvent(cleanupEvent);
                
                // 清理 UI 元素
                const waifu = document.getElementById('waifu');
                if (waifu) {
                    waifu.style.display = 'none';
                }
                
                // 清理资源
                cleanupLive2DResources();
                
                sendResponse({ success: true });
            } else if (message.type === 'getMemoryUsage') {
                // 估算当前标签页的内存使用
                let memoryMB = 0;
                
                // 方法1：使用 performance API（最准确）
                if (performance && performance.memory) {
                    memoryMB = performance.memory.usedJSHeapSize / 1048576;
                    // 确保最小合理值
                    if (memoryMB < 50) {
                        memoryMB = 100;
                    }
                } else {
                    // 方法2：基于模型类型估算
                    try {
                        const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        if (settingsData.modelSource === 'local' && settingsData.useCubism3) {
                            // Cubism3 模型约 100-250MB
                            memoryMB = 150;
                        } else {
                            // Cubism2 模型约 50-150MB
                            memoryMB = 100;
                        }
                    } catch (e) {
                        memoryMB = 100;
                    }
                    
                    // 加上 Canvas 纹理占用估算
                    const live2dCanvas = document.querySelector('#live2d-container canvas, #waifu-container canvas');
                    if (live2dCanvas) {
                        const width = live2dCanvas.width || 800;
                        const height = live2dCanvas.height || 800;
                        const textureMB = (width * height * 4) / 1048576; // RGBA
                        memoryMB += textureMB * 3; // 估算多帧纹理
                    }
                }
                
                console.log('[Live2D] Estimated memory usage:', memoryMB.toFixed(1), 'MB');
                sendResponse({ memoryMB: memoryMB });
            } else if (message.type === 'pageSummary') {
                // 触发页面总结
                triggerPageSummary();
                sendResponse({ success: true });
            } else if (message.type === 'updateKeybindings') {
                // 更新按键绑定
                if (message.keybindings) {
                    keyBindings = message.keybindings;
                    Object.keys(KB_DEFAULTS).forEach(function(k) {
                        if (!keyBindings[k]) keyBindings[k] = KB_DEFAULTS[k];
                    });
                    try { localStorage.setItem('live2dKeybindings', JSON.stringify(keyBindings)); } catch(e) {}
                }
                sendResponse({ success: true });
            } else if (message.type === 'updateDailyImageSettings') {
                // 更新每日一图设置
                const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settings.dailyImageEnabled = !!message.dailyImageEnabled;
                settings.dailyImageCustomApi = !!message.dailyImageCustomApi;
                settings.dailyImageApiList = message.dailyImageApiList || [{ url: 'https://api.yppp.net/api.php', enabled: true }];
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
                // 通知页面脚本刷新
                window.dispatchEvent(new CustomEvent('live2dUpdateSettings'));
                sendResponse({ success: true });
            } else if (message.type === 'getModelActions') {
                var actions = [];
                try {
                    var raw = localStorage.getItem('live2dModelActions');
                    if (raw) actions = JSON.parse(raw);
                } catch(e) {}
                sendResponse({ actions: actions });
            } else if (message.type === 'getCurrentModel') {
                var model = '';
                try {
                    var s = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    model = s.cubism3Model || s.localModel || '';
                } catch(e) {}
                sendResponse({ model: model });
            } else if (message.type === 'QUERY_HITAREA_STATUS') {
                var ha = localStorage.getItem('live2d_hasHitAreas') === 'true';
                var en = localStorage.getItem('live2d_hitAreaOverlay') === 'true';
                var sd = localStorage.getItem('live2d_hitAreaSound') !== 'false'; // default true
                var mo = localStorage.getItem('live2d_hitAreaMotion') !== 'false'; // default true
                sendResponse({
                    hasHitAreas: ha,
                    enabled: en,
                    soundEnabled: sd,
                    motionEnabled: mo
                });
            } else if (message.type === 'TOGGLE_HITAREA_OVERLAY') {
                localStorage.setItem('live2d_hitAreaOverlay', message.enabled ? 'true' : 'false');
                window.dispatchEvent(new CustomEvent('live2d-hitarea-toggle', { detail: { enabled: message.enabled } }));
                sendResponse({ success: true });
            } else if (message.type === 'TOGGLE_HITAREA_SOUND') {
                localStorage.setItem('live2d_hitAreaSound', message.enabled ? 'true' : 'false');
                sendResponse({ success: true });
            } else if (message.type === 'TOGGLE_HITAREA_MOTION') {
                localStorage.setItem('live2d_hitAreaMotion', message.enabled ? 'true' : 'false');
                sendResponse({ success: true });
            } else if (message.type === 'updateModelKeyBindings') {
                if (message.bindings) {
                    try { localStorage.setItem('live2dModelKeyBindings', JSON.stringify(message.bindings)); } catch(e) {}
                }
                if (message.specials) {
                    try { localStorage.setItem('live2dSpecialBindings', JSON.stringify(message.specials)); } catch(e) {}
                }
                sendResponse({ success: true });
            }
        return true;
    });

    // 页面总结功能（带缓存）
    let __lastSummaryResult = null;
    let __lastPageContent = '';
    let __lastPageParagraphs = []; // [{text, element}] DOM 段落索引

    // 构建 DOM 段落索引：遍历所有文本节点，收集非空段落
    function buildPageParagraphs() {
        var result = [];
        var walker = document.createTreeWalker(document.body, 4, null, false);
        var node;
        while (node = walker.nextNode()) {
            var text = node.textContent.trim();
            if (text) {
                result.push({ text: text, element: node });
            }
        }
        __lastPageParagraphs = result;
        return result;
    }

    function triggerPageSummary() {
        // 如果有缓存，直接显示弹窗，不重新调用 API
        if (__lastSummaryResult) {
            showSummaryModal(__lastSummaryResult);
            return;
        }
        // 构建 DOM 段落索引（用于后续 @§ 跳转）
        buildPageParagraphs();
        
        // 获取页面文本内容
        let pageText = __lastPageParagraphs.map(function(p) { return p.text; }).join('\n');
        if (pageText.length > 8000) {
            pageText = pageText.substring(0, 8000) + '\n...（内容过长已截断）';
        }
        
        // 通过 CustomEvent 通知 autoload-cubism3.js 执行总结
        const event = new CustomEvent('live2dPageSummary', { 
            detail: { pageContent: pageText } 
        });
        window.dispatchEvent(event);
    }

    // 监听总结结果事件，缓存并弹窗显示
    window.addEventListener('live2dShowSummary', function(e) {
        const summary = e.detail?.summary || '';
        if (!summary) return;
        __lastSummaryResult = summary;
        // 缓存页面全文（用于后续问答引用）
        if (e.detail?.pageContent) {
            __lastPageContent = e.detail.pageContent;
        }
        showSummaryModal(summary);
    });

    // 页面刷新时清除缓存
    window.addEventListener('beforeunload', function() {
        __lastSummaryResult = null;
    });

    // 创建/显示总结弹窗
    let summaryModalOverlay = null;
    let summaryModalTextarea = null;
    let __isSummaryResizing = false;
    let __summaryBtnTheme = { btnBg: '#fff', btnColor: '#667eea', isDark: false };

    let summaryModalAIPanel = null;
    let summaryModalQuestionInput = null;
    let summaryModalSendBtn = null;

    function showSummaryModal(summaryText) {
        // 确保 DOM 段落索引为最新
        buildPageParagraphs();
        
        const isDark = isDarkMode();
        const theme = {
            overlayBg: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)',
            boxBg: isDark ? '#1a1a2e' : '#fff',
            boxShadow: isDark ? '0 12px 48px rgba(0,0,0,0.6)' : '0 12px 48px rgba(0,0,0,0.25)',
            borderColor: isDark ? '#333' : '#eee',
            headerColor: isDark ? '#eee' : '#333',
            textareaBg: isDark ? '#0e0e24' : '#f5f5f5',
            textareaColor: isDark ? '#ddd' : '#333',
            footerColor: isDark ? '#888' : '#999',
            footerBorder: isDark ? '#333' : '#eee',
            btnBg: isDark ? '#2a2a4e' : '#fff',
            btnColor: '#667eea',
            aiPanelBg: isDark ? '#12122a' : '#fafafa',
            aiPanelColor: isDark ? '#ccc' : '#555',
            inputBg: isDark ? '#0e0e24' : '#f5f5f5',
            inputColor: isDark ? '#ddd' : '#333',
            sendBtnBg: '#667eea',
            sendBtnColor: '#fff',
        };
        
        __summaryBtnTheme = { btnBg: theme.btnBg, btnColor: theme.btnColor, isDark };

        // 辅助函数：更新已有弹窗主题
        function updateExistingTheme() {
            summaryModalOverlay.style.background = theme.overlayBg;
            const box = document.getElementById('live2d-summary-box');
            if (!box) return;
            const savedW = localStorage.getItem('live2dSummaryWidth');
            const savedH = localStorage.getItem('live2dSummaryHeight');
            if (savedW) box.style.width = savedW + 'px';
            if (savedH) box.style.height = savedH + 'px';
            box.style.background = theme.boxBg;
            box.style.boxShadow = theme.boxShadow;
            const hdr = box.querySelector('.summary-header');
            if (hdr) { hdr.style.color = theme.headerColor; hdr.style.borderBottomColor = theme.borderColor; }
            const ta = box.querySelector('.summary-textarea');
            if (ta) { ta.style.background = theme.textareaBg; ta.style.color = theme.textareaColor; }
            const aiPanel = box.querySelector('.summary-ai-panel');
            if (aiPanel) { aiPanel.style.background = theme.aiPanelBg; aiPanel.style.color = theme.aiPanelColor; }
            const dh = box.querySelector('.summary-dialogue-header');
            if (dh) { dh.style.color = theme.headerColor; dh.style.borderBottomColor = theme.borderColor; dh.style.background = theme.aiPanelBg; }
            // leftCol borderRight handled via leftCol class
            const leftColEl = box.querySelector('.summary-left-col');
            if (leftColEl) { leftColEl.style.borderRightColor = theme.borderColor; }
            const inp = box.querySelector('.summary-question-input');
            if (inp) { inp.style.background = theme.inputBg; inp.style.color = theme.inputColor; }
            const ftr = box.querySelector('.summary-footer');
            if (ftr) { ftr.style.borderTopColor = theme.footerBorder; }
            // 更新 scrollbar 主题
            const styleEl = document.getElementById('live2d-summary-style');
            if (styleEl) {
                const scrollTrack = isDark ? '#0e0e24' : '#eee';
                const scrollThumb = isDark ? '#3a3a5c' : '#ccc';
                const scrollHover = isDark ? '#5a5a7c' : '#aaa';
                styleEl.textContent = `
                    @keyframes live2dSummaryFadeIn { from { opacity: 0; } to { opacity: 1; } }
                    .summary-ai-panel::-webkit-scrollbar, .summary-textarea::-webkit-scrollbar { width: 6px; }
                    .summary-ai-panel::-webkit-scrollbar-track, .summary-textarea::-webkit-scrollbar-track { background: ${scrollTrack}; border-radius: 3px; }
                    .summary-ai-panel::-webkit-scrollbar-thumb, .summary-textarea::-webkit-scrollbar-thumb { background: ${scrollThumb}; border-radius: 3px; }
                    .summary-ai-panel::-webkit-scrollbar-thumb:hover, .summary-textarea::-webkit-scrollbar-thumb:hover { background: ${scrollHover}; }
                `;
            }
            __summaryBtnTheme = { btnBg: theme.btnBg, btnColor: theme.btnColor, isDark };
            ['.summary-btn-refresh','.summary-btn-copy'].forEach(cls => {
                const el = box.querySelector(cls);
                if (el) { el.style.background = theme.btnBg; el.style.color = theme.btnColor; el.style.borderColor = theme.btnColor; }
            });
            const xBtn = box.querySelector('.summary-btn-close');
            if (xBtn) { xBtn.style.background = isDark ? '#3a3a5c' : '#f0f0f0'; xBtn.style.color = isDark ? '#ccc' : '#666'; }
            summaryModalOverlay.style.display = 'flex';
        }

        if (summaryModalOverlay) {
            summaryModalTextarea.value = summaryText;
            updateExistingTheme();
            return;
        }
        
        // 遮罩层
        summaryModalOverlay = document.createElement('div');
        summaryModalOverlay.id = 'live2d-summary-overlay';
        summaryModalOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: ${theme.overlayBg};
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: live2dSummaryFadeIn 0.2s ease;
        `;
        summaryModalOverlay.addEventListener('click', function(e) {
            if (__isSummaryResizing) { __isSummaryResizing = false; return; }
            if (e.target === summaryModalOverlay) hideSummaryModal();
        });
        
        // 弹窗容器
        const savedWidth = localStorage.getItem('live2dSummaryWidth') || '780';
        const savedHeight = localStorage.getItem('live2dSummaryHeight') || '';
        const modalBox = document.createElement('div');
        modalBox.id = 'live2d-summary-box';
        modalBox.style.cssText = `
            background: ${theme.boxBg};
            border-radius: 12px;
            width: ${savedWidth}px;
            ${savedHeight ? 'height: ' + savedHeight + 'px;' : 'min-height: 360px; max-height: 85vh;'}
            display: flex;
            flex-direction: column;
            box-shadow: ${theme.boxShadow};
            overflow: hidden;
            position: relative;
        `;
        
        // 标题栏
        const header = document.createElement('div');
        header.className = 'summary-header';
        header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid ${theme.borderColor};font-size:15px;font-weight:600;color:${theme.headerColor};flex-shrink:0;`;
        header.innerHTML = '<span>页面总结</span>';
        
        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display:flex;gap:6px;';
        
        const refreshBtn = document.createElement('button');
        refreshBtn.className = 'summary-btn-refresh';
        refreshBtn.textContent = '刷新';
        refreshBtn.style.cssText = `padding:5px 12px;background:${theme.btnBg};color:${theme.btnColor};border:1px solid ${theme.btnColor};border-radius:6px;font-size:12px;cursor:pointer;transition:background 0.2s,color 0.2s;`;
        refreshBtn.addEventListener('mouseenter', () => { refreshBtn.style.background = __summaryBtnTheme.btnColor; refreshBtn.style.color = '#fff'; });
        refreshBtn.addEventListener('mouseleave', () => { refreshBtn.style.background = __summaryBtnTheme.btnBg; refreshBtn.style.color = __summaryBtnTheme.btnColor; });
        refreshBtn.addEventListener('click', function() {
            __lastSummaryResult = null;
            __lastPageContent = '';
            buildPageParagraphs();
            resetQuestionInputState();
            summaryModalTextarea.value = '正在重新总结喵~';
            if (summaryModalAIPanel) summaryModalAIPanel.innerHTML = '';
            let freshPageText = document.body.innerText || '';
            if (freshPageText.length > 8000) freshPageText = freshPageText.substring(0, 8000) + '\n...（内容过长已截断）';
            window.dispatchEvent(new CustomEvent('live2dPageSummary', { detail: { pageContent: freshPageText } }));
        });
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'summary-btn-copy';
        copyBtn.textContent = '复制';
        copyBtn.style.cssText = `padding:5px 12px;background:${theme.btnBg};color:${theme.btnColor};border:1px solid ${theme.btnColor};border-radius:6px;font-size:12px;cursor:pointer;transition:background 0.2s,color 0.2s;`;
        copyBtn.addEventListener('mouseenter', () => { copyBtn.style.background = __summaryBtnTheme.btnColor; copyBtn.style.color = '#fff'; });
        copyBtn.addEventListener('mouseleave', () => { copyBtn.style.background = __summaryBtnTheme.btnBg; copyBtn.style.color = __summaryBtnTheme.btnColor; });
        copyBtn.addEventListener('click', async function() {
            try { await navigator.clipboard.writeText(summaryModalTextarea.value); } catch(e) {
                const ta = document.createElement('textarea'); ta.value = summaryModalTextarea.value; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
            }
            copyBtn.textContent = '已复制'; setTimeout(() => copyBtn.textContent = '复制', 2000);
        });
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'summary-btn-close';
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `padding:5px 10px;background:${isDark?'#3a3a5c':'#f0f0f0'};color:${isDark?'#ccc':'#666'};border:none;border-radius:6px;font-size:13px;cursor:pointer;transition:background 0.2s;`;
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = isDark ? '#4a4a6c' : '#e0e0e0'; });
        closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = isDark ? '#3a3a5c' : '#f0f0f0'; });
        closeBtn.addEventListener('click', hideSummaryModal);
        
        btnGroup.appendChild(refreshBtn);
        btnGroup.appendChild(copyBtn);
        btnGroup.appendChild(closeBtn);
        header.appendChild(btnGroup);
        modalBox.appendChild(header);
        
        // ===== 内容区域：左侧 AI 回复框 + 右侧总结（含底部输入框） =====
        const contentRow = document.createElement('div');
        contentRow.style.cssText = `
            display: flex;
            flex: 1;
            min-height: 0;
            overflow: hidden;
        `;
        
        // 左侧：对话标题 + AI 回复框
        const leftCol = document.createElement('div');
        leftCol.className = 'summary-left-col';
        leftCol.style.cssText = `
            display: flex;
            flex-direction: column;
            width: 40%;
            min-width: 180px;
            min-height: 0;
            overflow: hidden;
            border-right: 1px solid ${theme.borderColor};
        `;
        
        // 对话标题
        const dialogueHeader = document.createElement('div');
        dialogueHeader.className = 'summary-dialogue-header';
        dialogueHeader.style.cssText = `
            padding: 8px 14px;
            font-size: 13px;
            font-weight: 600;
            color: ${theme.headerColor};
            background: ${theme.aiPanelBg};
            border-bottom: 1px solid ${theme.borderColor};
            flex-shrink: 0;
        `;
        dialogueHeader.textContent = '对话';
        leftCol.appendChild(dialogueHeader);
        
        // AI 回复框
        const aiPanel = document.createElement('div');
        aiPanel.className = 'summary-ai-panel';
        summaryModalAIPanel = aiPanel;
        aiPanel.style.cssText = `
            flex: 1;
            padding: 12px 14px;
            font-size: 13px;
            line-height: 1.6;
            overflow-y: auto;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: ${theme.aiPanelBg};
            color: ${theme.aiPanelColor};
            white-space: pre-wrap;
            word-break: break-word;
        `;
        // AI 面板提示文字
        const aiPlaceholder = document.createElement('div');
        aiPlaceholder.id = 'summary-ai-placeholder';
        aiPlaceholder.style.cssText = 'color:' + (isDark ? '#555' : '#bbb') + ';text-align:center;margin-top:40%;font-size:13px;';
        aiPlaceholder.textContent = '在下方输入框提问\n即可询问关于总结的详细内容喵~';
        aiPanel.appendChild(aiPlaceholder);
        leftCol.appendChild(aiPanel);
        
        // 右侧：总结 textarea + 底部输入框（垂直排列）
        const rightCol = document.createElement('div');
        rightCol.style.cssText = `
            display: flex;
            flex-direction: column;
            flex: 1;
            min-width: 200px;
            min-height: 0;
            overflow: hidden;
        `;
        
        // 总结 textarea
        summaryModalTextarea = document.createElement('textarea');
        summaryModalTextarea.className = 'summary-textarea';
        summaryModalTextarea.value = summaryText;
        summaryModalTextarea.style.cssText = `
            flex: 1;
            min-height: 200px;
            padding: 14px 18px;
            border: none;
            outline: none;
            font-size: 14px;
            line-height: 1.7;
            color: ${theme.textareaColor};
            background: ${theme.textareaBg};
            resize: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        rightCol.appendChild(summaryModalTextarea);
        
        // 输入框 + 发送按钮
        const inputRow = document.createElement('div');
        inputRow.className = 'summary-footer';
        inputRow.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 16px;
            border-top: 1px solid ${theme.footerBorder};
            flex-shrink: 0;
        `;
        
        const questionInput = document.createElement('input');
        questionInput.className = 'summary-question-input';
        summaryModalQuestionInput = questionInput;
        questionInput.type = 'text';
        questionInput.placeholder = '询问总结的详细内容...';
        questionInput.style.cssText = `
            flex: 1;
            padding: 8px 12px;
            border: 1px solid ${theme.borderColor};
            border-radius: 6px;
            font-size: 13px;
            background: ${theme.inputBg};
            color: ${theme.inputColor};
            outline: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        questionInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendSummaryQuestion();
            }
        });
        
        const sendBtn = document.createElement('button');
        sendBtn.className = 'summary-send-btn';
        summaryModalSendBtn = sendBtn;
        sendBtn.textContent = '发送';
        sendBtn.style.cssText = `
            padding: 8px 18px;
            background: ${theme.sendBtnBg};
            color: ${theme.sendBtnColor};
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
            flex-shrink: 0;
        `;
        sendBtn.addEventListener('mouseenter', () => sendBtn.style.opacity = '0.85');
        sendBtn.addEventListener('mouseleave', () => sendBtn.style.opacity = '1');
        sendBtn.addEventListener('click', sendSummaryQuestion);
        
        inputRow.appendChild(questionInput);
        inputRow.appendChild(sendBtn);
        rightCol.appendChild(inputRow);
        
        contentRow.appendChild(leftCol);
        contentRow.appendChild(rightCol);
        modalBox.appendChild(contentRow);

        // 拖拽缩放手柄
        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `position:absolute;right:0;bottom:0;width:20px;height:20px;cursor:nwse-resize;z-index:10;`;
        resizeHandle.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" style="position:absolute;right:3px;bottom:3px;"><path d="M0 12 L12 12 L12 0" fill="none" stroke="#bbb" stroke-width="2"/></svg>';
        modalBox.appendChild(resizeHandle);

        let isResizing = false;
        resizeHandle.addEventListener('mousedown', function(e) {
            isResizing = true;
            __isSummaryResizing = true;
            e.preventDefault(); e.stopPropagation();
            const startX = e.clientX, startY = e.clientY;
            const startW = modalBox.offsetWidth, startH = modalBox.offsetHeight;
            function onMouseMove(ev) {
                if (!isResizing) return;
                modalBox.style.width = Math.max(350, startW + (ev.clientX - startX)) + 'px';
                modalBox.style.height = Math.max(250, startH + (ev.clientY - startY)) + 'px';
            }
            function onMouseUp(ev) {
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                localStorage.setItem('live2dSummaryWidth', Math.round(modalBox.offsetWidth));
                localStorage.setItem('live2dSummaryHeight', Math.round(modalBox.offsetHeight));
            }
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        summaryModalOverlay.appendChild(modalBox);
        document.body.appendChild(summaryModalOverlay);
        
        // 淡入动画
        if (!document.getElementById('live2d-summary-style')) {
            const style = document.createElement('style');
            style.id = 'live2d-summary-style';
            style.textContent = `
                 @keyframes live2dSummaryFadeIn { from { opacity: 0; } to { opacity: 1; } }
                 .summary-ai-panel::-webkit-scrollbar { width: 6px; }
                 .summary-ai-panel::-webkit-scrollbar-track { background: ${isDark ? '#0e0e24' : '#eee'}; border-radius: 3px; }
                 .summary-ai-panel::-webkit-scrollbar-thumb { background: ${isDark ? '#3a3a5c' : '#ccc'}; border-radius: 3px; }
                 .summary-ai-panel::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#5a5a7c' : '#aaa'}; }
                 .summary-textarea::-webkit-scrollbar { width: 6px; }
                 .summary-textarea::-webkit-scrollbar-track { background: ${isDark ? '#0e0e24' : '#eee'}; border-radius: 3px; }
                 .summary-textarea::-webkit-scrollbar-thumb { background: ${isDark ? '#3a3a5c' : '#ccc'}; border-radius: 3px; }
                 .summary-textarea::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#5a5a7c' : '#aaa'}; }
             `;
            document.head.appendChild(style);
        }
    }

    // 重置聊天输入框状态（中断发送、恢复按钮）
    function resetQuestionInputState() {
        if (summaryModalSendBtn) {
            summaryModalSendBtn.disabled = false;
            summaryModalSendBtn.textContent = '发送';
        }
        if (summaryModalQuestionInput) {
            summaryModalQuestionInput.disabled = false;
            summaryModalQuestionInput.value = '';
        }
        // 移除所有待处理的问答监听器
        const oldHandlers = window._summaryQAHandlers || [];
        oldHandlers.forEach(function(fn) {
            window.removeEventListener('live2dPageSummaryAnswer', fn);
        });
        window._summaryQAHandlers = [];
    }

    // 发送总结相关问题
    function sendSummaryQuestion() {
        if (!summaryModalQuestionInput || !summaryModalSendBtn) return;
        const question = summaryModalQuestionInput.value.trim();
        if (!question) return;
        const summary = summaryModalTextarea.value;
        if (!summary) return;
        
        // 显示加载状态
        summaryModalSendBtn.disabled = true;
        summaryModalSendBtn.textContent = '发送中...';
        summaryModalQuestionInput.disabled = true;
        if (summaryModalAIPanel) {
            const ph = document.getElementById('summary-ai-placeholder');
            if (ph) ph.style.display = 'none';
            summaryModalAIPanel.textContent = '少女祈祷中...';
        }
        
        // 清除旧监听，避免重复
        const oldListeners = window._summaryQAHandlers || [];
        oldListeners.forEach(fn => window.removeEventListener('live2dPageSummaryAnswer', fn));
        window._summaryQAHandlers = [];
        
        const handler = function(e) {
            const answer = e.detail?.answer || '';
            if (!answer) return;
            if (summaryModalAIPanel) {
                const ph = document.getElementById('summary-ai-placeholder');
                if (ph) ph.style.display = 'none';
                summaryModalAIPanel.innerHTML = '';
                // 显示问题和回答
                const qDiv = document.createElement('div');
                qDiv.style.cssText = 'color:#667eea;font-weight:600;margin-bottom:6px;font-size:13px;';
                qDiv.textContent = '> ' + question;
                summaryModalAIPanel.appendChild(qDiv);
                
                // 渲染回答：解析 @§段落号 和 [来源] 标记
                const aDiv = renderAnswerWithCitations(answer);
                summaryModalAIPanel.appendChild(aDiv);
            }
            if (summaryModalSendBtn) { summaryModalSendBtn.disabled = false; summaryModalSendBtn.textContent = '发送'; }
            if (summaryModalQuestionInput) summaryModalQuestionInput.disabled = false;
            // 清空输入框
            summaryModalQuestionInput.value = '';
            window.removeEventListener('live2dPageSummaryAnswer', handler);
            const idx = window._summaryQAHandlers.indexOf(handler);
            if (idx > -1) window._summaryQAHandlers.splice(idx, 1);
        };
        window._summaryQAHandlers.push(handler);
        window.addEventListener('live2dPageSummaryAnswer', handler);
        
        // 发送事件给 AI（附带页面全文用于引用检索）
        window.dispatchEvent(new CustomEvent('live2dPageSummaryQuestion', {
            detail: { question: question, summary: summary, pageContent: __lastPageContent }
        }));
    }

    function hideSummaryModal() {
        if (summaryModalOverlay) {
            summaryModalOverlay.style.display = 'none';
        }
    }

    // 代码语法高亮：键名/函数变量 → 蓝色，字符串/值 → 绿色，数字 → 橙色
    function highlightCode(code, lang) {
        var span = document.createElement('span');
        
        // 按行处理保持换行
        var lines = code.split('\n');
        for (var li = 0; li < lines.length; li++) {
            if (li > 0) span.appendChild(document.createElement('br'));
            var line = lines[li];
            
            // JSON 风格高亮：匹配 "key": 模式
            // 步骤1: 匹配字符串值 "..." → 绿色
            var parts = [];
            var lastIdx = 0;
            var strRegex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
            var m;
            while ((m = strRegex.exec(line)) !== null) {
                if (m.index > lastIdx) {
                    parts.push({ type: 'text', content: line.substring(lastIdx, m.index) });
                }
                // 判断是否是 key（后面紧跟 : 或 ：）
                var after = line.substring(m.index + m[0].length).replace(/^\s+/, '');
                if (after.charAt(0) === ':' || after.charAt(0) === '：') {
                    // 这是键名 → 蓝色
                    parts.push({ type: 'key', content: m[0] });
                } else {
                    // 这是字符串值 → 绿色
                    parts.push({ type: 'string', content: m[0] });
                }
                lastIdx = m.index + m[0].length;
            }
            if (lastIdx < line.length) {
                parts.push({ type: 'text', content: line.substring(lastIdx) });
            }
            
            // 渲染每个部分
            for (var pi = 0; pi < parts.length; pi++) {
                var p = parts[pi];
                if (p.type === 'key') {
                    var keySpan = document.createElement('span');
                    keySpan.style.cssText = 'color:#569cd6;';
                    keySpan.textContent = p.content;
                    span.appendChild(keySpan);
                } else if (p.type === 'string') {
                    var strSpan = document.createElement('span');
                    strSpan.style.cssText = 'color:#6aab73;';
                    strSpan.textContent = p.content;
                    span.appendChild(strSpan);
                } else {
                    // 纯文本：再高亮数字和关键词
                    var textParts = p.content.split(/(\b\d+(?:\.\d+)?\b)/);
                    for (var ti = 0; ti < textParts.length; ti++) {
                        var tp = textParts[ti];
                        if (/^\d+(?:\.\d+)?$/.test(tp)) {
                            var numSpan = document.createElement('span');
                            numSpan.style.cssText = 'color:#dcdcaa;';
                            numSpan.textContent = tp;
                            span.appendChild(numSpan);
                        } else {
                            // 高亮常见关键字
                            var kwParts = tp.split(/(\b(?:function|const|let|var|if|else|for|while|return|import|export|from|class|extends|new|this|async|await|true|false|null|undefined|typeof|instanceof|try|catch|finally|throw|switch|case|break|default|continue|do|in|of|with|yield|enum|implements|interface|package|private|protected|public|static)\b)/g);
                            for (var ki = 0; ki < kwParts.length; ki++) {
                                var kwp = kwParts[ki];
                                if (/^(?:function|const|let|var|if|else|for|while|return|import|export|from|class|extends|new|this|async|await|true|false|null|undefined|typeof|instanceof|try|catch|finally|throw|switch|case|break|default|continue|do|in|of|with|yield|enum|implements|interface|package|private|protected|public|static)$/.test(kwp)) {
                                    var kwSpan = document.createElement('span');
                                    kwSpan.style.cssText = 'color:#c586c0;';
                                    kwSpan.textContent = kwp;
                                    span.appendChild(kwSpan);
                                } else {
                                    span.appendChild(document.createTextNode(kwp));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return span;
    }

    // 渲染回答文本，支持代码块、@数字标注和 [来源] 标记
    function renderAnswerWithCitations(text) {
        const container = document.createElement('div');
        container.style.cssText = 'line-height:1.7;font-size:13px;word-break:break-word;white-space:pre-wrap;';
        
        // 第0步：按代码块分割文本（``` ... ```）
        var segments = [];
        var lastEnd = 0;
        var codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
        var match;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            if (match.index > lastEnd) {
                segments.push({ type: 'text', content: text.substring(lastEnd, match.index) });
            }
            segments.push({ type: 'code', lang: match[1] || '', content: match[2] });
            lastEnd = match.index + match[0].length;
        }
        if (lastEnd < text.length) {
            segments.push({ type: 'text', content: text.substring(lastEnd) });
        }
        
        // 如果没有代码块，降级为纯文本模式
        if (segments.length === 0) {
            segments.push({ type: 'text', content: text });
        }
        
        // 处理每个片段
        for (var si = 0; si < segments.length; si++) {
            var seg = segments[si];
            
            if (seg.type === 'code') {
                // 修复闭包：捕获 seg 的值
                var codeContent = seg.content;
                var codeLang = seg.lang || 'code';
                // ── 渲染代码块 ──
                var codeBox = document.createElement('div');
                codeBox.style.cssText = 'position:relative;background:#0e0e24;border:1px solid #333;border-radius:8px;margin:8px 0;overflow:hidden;';
                
                // 标题栏（语言标签 + 复制按钮）
                var codeHeader = document.createElement('div');
                codeHeader.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:6px 12px;background:#1a1a3e;border-bottom:1px solid #333;font-size:11px;';
                
                var langLabel = document.createElement('span');
                langLabel.style.cssText = 'color:#888;font-family:monospace;';
                langLabel.textContent = codeLang;
                codeHeader.appendChild(langLabel);
                
                var copyBtn = document.createElement('button');
                copyBtn.textContent = '复制';
                copyBtn.style.cssText = 'padding:0;background:transparent;color:#888;border:0;outline:none;font-size:11px;cursor:pointer;transition:color 0.2s;';
                copyBtn.addEventListener('mouseenter', function() { this.style.color = '#fff'; });
                copyBtn.addEventListener('mouseleave', function() { this.style.color = '#888'; });
                // 用 IIFE 捕获 codeContent
                (function(btn, content) {
                    btn.addEventListener('click', function() {
                        navigator.clipboard.writeText(content).then(function() {
                            btn.textContent = '已复制';
                            setTimeout(function() { btn.textContent = '复制'; }, 2000);
                        }).catch(function() {
                            var ta = document.createElement('textarea');
                            ta.value = content;
                            document.body.appendChild(ta);
                            ta.select();
                            document.execCommand('copy');
                            document.body.removeChild(ta);
                            btn.textContent = '已复制';
                            setTimeout(function() { btn.textContent = '复制'; }, 2000);
                        });
                    });
                })(copyBtn, codeContent);
                codeHeader.appendChild(copyBtn);
                codeBox.appendChild(codeHeader);
                
                // 代码内容（语法高亮）
                var codePre = document.createElement('pre');
                codePre.style.cssText = 'margin:0;padding:12px 16px;overflow-x:auto;font-size:12px;line-height:1.5;color:#6aab73;background:#0e0e24;font-family:Consolas,monospace;white-space:pre;tab-size:4;';
                var codeEl = document.createElement('code');
                codeEl.style.cssText = 'color:#6aab73;font-family:Consolas,monospace;';
                codeEl.appendChild(highlightCode(codeContent, codeLang));
                codePre.appendChild(codeEl);
                codeBox.appendChild(codePre);
                
                container.appendChild(codeBox);
                continue;
            }
            
            // ── 渲染文本段（含标注解析）──
            var segText = seg.content;
            if (!segText) continue;
            
            // 解析标注
            var badges = [];
            var srcBadges = [];
            
            // 范围标注：@12-@15、@P12-P15、§12-§15、(@P12-P15)
            var s1 = segText.replace(/(?:@|§)P?(\d+)\s*[-–—]\s*(?:@|§)?P?(\d+)/g, function(m, s, e) {
                var key = '__BDG_' + badges.length + '__';
                badges.push({ id: s, text: '@' + s + '-@' + e });
                return key;
            });
            // 单个标注：@12、@P12、§12
            var s2 = s1.replace(/(?:@|§)P?(\d+)/g, function(m, id) {
                var key = '__BDG_' + badges.length + '__';
                badges.push({ id: id, text: '@' + id });
                return key;
            });
            // 来源标记
            var s3 = s2.replace(/\[来源\s+([^\]]+)\]/g, function(m, domain) {
                var key = '__SRC_' + srcBadges.length + '__';
                srcBadges.push({ domain: domain });
                return key;
            });
            
            // 换行分段
            var lines = s3.split('\n');
            for (var li = 0; li < lines.length; li++) {
                if (li > 0) container.appendChild(document.createElement('br'));
                var line = lines[li];
                if (!line) { container.appendChild(document.createTextNode('')); continue; }
                
                var parts = line.split(/(__BDG_\d+__|__SRC_\d+__)/);
                for (var pi = 0; pi < parts.length; pi++) {
                    var part = parts[pi];
                    
                    var bm = part.match(/^__BDG_(\d+)__$/);
                    if (bm) {
                        var bi = parseInt(bm[1], 10);
                        var badgeData = badges[bi];
                        if (badgeData) {
                            var badge = document.createElement('span');
                            badge.textContent = badgeData.text;
                            badge.title = '点击跳转到网页对应段落';
                            badge.style.cssText = 'display:inline-block;background:#667eea;color:#fff;border-radius:3px;padding:0 5px;font-size:11px;cursor:pointer;margin:0 2px;line-height:1.6;';
                            (function(pid) {
                                badge.addEventListener('click', function(e) {
                                    e.stopPropagation();
                                    scrollToPageText(pid);
                                    this.style.background = '#ff8800';
                                    setTimeout(function() { this.style.background = '#667eea'; }.bind(this), 1000);
                                });
                            })(badgeData.id);
                            container.appendChild(badge);
                            continue;
                        }
                    }
                    
                    var sm = part.match(/^__SRC_(\d+)__$/);
                    if (sm) {
                        var si = parseInt(sm[1], 10);
                        var srcData = srcBadges[si];
                        if (srcData) {
                            var srcBadge = document.createElement('span');
                            srcBadge.textContent = '[' + srcData.domain + ']';
                            srcBadge.style.cssText = 'display:inline-block;background:#555;color:#ccc;border-radius:3px;padding:0 5px;font-size:11px;margin:0 2px;line-height:1.6;';
                            container.appendChild(srcBadge);
                            continue;
                        }
                    }
                    
                    if (part) container.appendChild(document.createTextNode(part));
                }
            }
        }
        
        return container;
    }

    // 跳转到页面上对应的段落（基于 DOM 段落索引）
    function scrollToPageText(paragraphId) {
        hideSummaryModal();
        
        var idx = parseInt(paragraphId, 10) - 1;
        if (idx < 0 || idx >= __lastPageParagraphs.length) return;
        
        var para = __lastPageParagraphs[idx];
        if (!para || !para.element) return;
        
        // 找到块级父元素用于滚动和高亮
        var el = para.element;
        if (el.nodeType === 3) el = el.parentElement;
        while (el && el !== document.body && el.tagName !== 'P' && el.tagName !== 'DIV' && el.tagName !== 'LI' && el.tagName !== 'H1' && el.tagName !== 'H2' && el.tagName !== 'H3' && el.tagName !== 'H4' && el.tagName !== 'SECTION' && el.tagName !== 'ARTICLE') {
            el = el.parentElement;
        }
        if (!el || el === document.body) el = para.element.parentElement || document.body;
        
        // 滚动到该元素
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 用闪烁边框代替 DOM 结构修改
        var origOutline = el.style.outline;
        var origOutlineOffset = el.style.outlineOffset;
        el.style.outline = '3px solid #667eea';
        el.style.outlineOffset = '2px';
        el.style.transition = 'outline 3s ease, outline-offset 3s ease';
        setTimeout(function() {
            el.style.outline = origOutline || '';
            el.style.outlineOffset = origOutlineOffset || '';
        }, 3000);
        
        // 同时用 Range 选中文本（浏览器原生高亮）
        try {
            var range = document.createRange();
            range.selectNodeContents(para.element);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } catch(e) {}
        
        // 聚焦到段落
        try { el.focus({ preventScroll: true }); } catch(e) {}
    }

    // ─── 按键绑定系统 ───
    // 尝试从 localStorage 读取；若无则从 chrome.storage 读并同步到 localStorage
    const KB_DEFAULTS = {
        pageSummary: { ctrl: true, shift: true, alt: false, key: 'V' },
        screenshot: { ctrl: true, shift: false, alt: true, key: 'V' },
        screenshotNoMascot: { ctrl: true, shift: false, alt: true, key: 'B' },
        dailyImage: { ctrl: true, shift: false, alt: true, key: 'G' }
    };

    function loadBindings() {
        let b = {};
        try {
            const stored = localStorage.getItem('live2dKeybindings');
            if (stored) b = JSON.parse(stored);
        } catch(e) {}
        Object.keys(KB_DEFAULTS).forEach(function(k) {
            if (!b[k]) b[k] = KB_DEFAULTS[k];
        });
        // 写回 localStorage 确保 page 脚本也能读取
        try { localStorage.setItem('live2dKeybindings', JSON.stringify(b)); } catch(e) {}
        return b;
    }

    let keyBindings = loadBindings();

    // 从 chrome.storage 读取最新绑定（第一次加载时覆盖 localStorage）
    browserAPI.storage.local.get('keybindings', function(result) {
        if (result.keybindings) {
            keyBindings = result.keybindings;
            Object.keys(KB_DEFAULTS).forEach(function(k) {
                if (!keyBindings[k]) keyBindings[k] = KB_DEFAULTS[k];
            });
            try { localStorage.setItem('live2dKeybindings', JSON.stringify(keyBindings)); } catch(e) {}
        }
    });

    function matchBinding(e, b) {
        if (!b || !b.key) return false;
        return (!!e.ctrlKey === !!b.ctrl) &&
               (!!e.shiftKey === !!b.shift) &&
               (!!e.altKey === !!b.alt) &&
               (e.key.toUpperCase() === b.key.toUpperCase());
    }

    document.addEventListener('keydown', function(e) {
        // 页面总结快捷键
        if (matchBinding(e, keyBindings.pageSummary)) {
            // 如果弹窗已打开，则关闭
            if (summaryModalOverlay && summaryModalOverlay.style.display !== 'none') {
                e.preventDefault();
                hideSummaryModal();
                return;
            }
            // 检查页面总结功能是否启用
            const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            if (settings.pageSummaryEnabled && settings.aiEnabled && settings.aiConnected) {
                e.preventDefault();
                triggerPageSummary();
            } else if (settings.pageSummaryEnabled) {
                e.preventDefault();
                // API 未连接，通知模型气泡显示提示
                const tipEvent = new CustomEvent('live2dShowTips', {
                    detail: { text: '未连接api喵！无法总结喵！' }
                });
                window.dispatchEvent(tipEvent);
            }
        }
    });

    // 主题变化时刷新弹窗主题
    document.addEventListener('live2dSettingsUpdated', function() {
        if (summaryModalOverlay && summaryModalOverlay.style.display !== 'none' && __lastSummaryResult) {
            showSummaryModal(__lastSummaryResult);
        }
    });

    // ─── AI API 网络代理桥接 ───
     // 注入脚本在页面上下文 (main world)，无法直接访问 chrome.runtime
     // content.js 在隔离世界 (isolated world)，可以通过 runtime.sendMessage 转发到 background
     // CustomEvent 桥接链路：页面脚本 ↔ content.js ↔ background ↔ content.js ↔ 页面脚本

    window.addEventListener('live2dFetchProxy', function(e) {
         const detail = e.detail || {};
         const requestId = detail.requestId;
         const url = detail.url;
         const opts = detail.options;
         if (!requestId || !url) return;

         if (!browserAPI.runtime || !browserAPI.runtime.sendMessage) {
             window.dispatchEvent(new CustomEvent('live2dFetchProxyResult', {
                 detail: { requestId, success: false, error: 'runtime not available' }
             }));
             return;
         }

         browserAPI.runtime.sendMessage(
             { action: 'fetchApi', url, options: opts },
             (response) => {
                 const err = browserAPI.runtime.lastError;
                 if (err) {
                     window.dispatchEvent(new CustomEvent('live2dFetchProxyResult', {
                         detail: { requestId, success: false, error: err.message || 'Runtime error' }
                     }));
                     return;
                 }
                 if (response && response.success) {
                     window.dispatchEvent(new CustomEvent('live2dFetchProxyResult', {
                         detail: { requestId, success: true, data: response.data }
                     }));
                 } else {
                     window.dispatchEvent(new CustomEvent('live2dFetchProxyResult', {
                         detail: { requestId, success: false, error: response?.error || 'Proxy request failed' }
                     }));
                 }
             }
         );
    });

     // ─── 截图下载桥接 ───
     // 注入脚本 → content.js → background → chrome.downloads.download()
     window.addEventListener('live2dDownloadScreenshot', function(e) {
         const detail = e.detail || {};
         const dataUrl = detail.dataUrl;
         const fileName = detail.fileName || 'screenshot.png';
         if (!dataUrl) return;

         browserAPI.runtime.sendMessage(
             { action: 'downloadFile', dataUrl: dataUrl, filename: fileName },
             function() { browserAPI.runtime.lastError; }
         );
     });

     // ─── 每日一图：两步走（content 取 JSON → background 取图片 → data URL）───
     window.addEventListener('live2dDailyImageFetch', async function(e) {
         const detail = e.detail || {};
         const requestId = detail.requestId;
         const apiUrl = detail.url;
         if (!requestId || !apiUrl) return;

         console.log('[Live2D Bridge] Step 1: fetch JSON from', apiUrl);

         try {
             // Step 1: 从 JSON API 获取 acgurl 直链
             const sep = apiUrl.includes('?') ? '&' : '?';
             const jsonUrl = apiUrl.replace(/\/api\.php/, '/pc.php') + sep + 'return=json';
             
             const jsonResp = await fetch(jsonUrl, { cache: 'no-cache' });
             if (!jsonResp.ok) throw new Error('JSON HTTP ' + jsonResp.status);
             const json = await jsonResp.json();
             
             let acgurl = json.acgurl || json.img || json.image || json.url || json.pic || json.picUrl || json.imgurl;
             if (!acgurl) throw new Error('no acgurl in response');
             
             if (acgurl.startsWith('//')) acgurl = 'https:' + acgurl;
             else if (acgurl.startsWith('/')) acgurl = new URL(acgurl, jsonUrl).href;

             console.log('[Live2D Bridge] Step 1 OK, acgurl:', acgurl);

             // Step 2: 让 background 取图片转 data URL（有 host_permissions，绕过 CORS）
             console.log('[Live2D Bridge] Step 2: background fetch image');
             browserAPI.runtime.sendMessage(
                 { action: 'fetchDailyImage', url: acgurl },
                 function(response) {
                     const err = browserAPI.runtime.lastError;
                     if (err) {
                         console.log('[Live2D Bridge] Background error:', err.message);
                         window.dispatchEvent(new CustomEvent('live2dDailyImageResult', {
                             detail: { requestId, success: true, imageUrl: acgurl }
                         }));
                         return;
                     }
                     if (response && response.success) {
                         if (response.dataUrl) {
                             console.log('[Live2D Bridge] Got data URL from background, length:', response.dataUrl.length);
                             window.dispatchEvent(new CustomEvent('live2dDailyImageResult', {
                                 detail: { requestId, success: true, dataUrl: response.dataUrl }
                             }));
                         } else {
                             console.log('[Live2D Bridge] Got image URL from background:', response.imageUrl);
                             window.dispatchEvent(new CustomEvent('live2dDailyImageResult', {
                                 detail: { requestId, success: true, imageUrl: response.imageUrl || acgurl }
                             }));
                         }
                     } else {
                         console.log('[Live2D Bridge] Background failed:', response?.error);
                         window.dispatchEvent(new CustomEvent('live2dDailyImageResult', {
                             detail: { requestId, success: true, imageUrl: acgurl }
                         }));
                     }
                 }
             );
         } catch(err) {
             console.log('[Live2D Bridge] All failed:', err.message);
             window.dispatchEvent(new CustomEvent('live2dDailyImageResult', {
                 detail: { requestId, success: true, imageUrl: apiUrl }
             }));
         }
     });

     // 显示成就通知（来自popup的成就显示）
    function showPopupAchievement(title, message) {
        const existingNotification = document.getElementById('popup-achievement-notification');
        if (existingNotification) existingNotification.remove();

        const notification = document.createElement('div');
        notification.id = 'popup-achievement-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.98) 0%, rgba(255, 165, 0, 0.98) 100%);
            color: #2d1810;
            padding: 28px 45px;
            border-radius: 20px;
            z-index: 999999;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            animation: popupAchievementFadeIn 0.5s ease-out;
        `;

        const style = document.createElement('style');
        style.id = 'popup-achievement-style';
        style.textContent = `
            @keyframes popupAchievementFadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.6) rotate(-5deg); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
            }
            @keyframes popupAchievementFadeOut {
                from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                to { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
            }
            #popup-achievement-notification.fade-out {
                animation: popupAchievementFadeOut 0.3s ease-out forwards;
            }
        `;
        document.head.appendChild(style);

        notification.innerHTML = `
            <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px; letter-spacing: 2px; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);">${title}</div>
            <div style="font-size: 22px; font-weight: 500; opacity: 0.9; letter-spacing: 1px;">${message}</div>
            <div style="margin-top: 12px; font-size: 13px; opacity: 0.7;">(✧ω✧)</div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) notification.remove();
                    if (style.parentNode) style.remove();
                }, 300);
            }
        }, 3000);
    }

    // 检测是否是首次加载
    function checkFirstLoad() {
        try {
            if (browserAPI.storage && browserAPI.storage.local) {
                browserAPI.storage.local.get(['live2d-first-load'], (result) => {
                    if (!result['live2d-first-load']) {
                        showFirstLoadNotification();
                        browserAPI.storage.local.set({ 'live2d-first-load': 'true' });
                    }
                });
            } else {
                // 回退到 localStorage
                const hasLoaded = localStorage.getItem('live2d-first-load');
                if (!hasLoaded) {
                    showFirstLoadNotification();
                    localStorage.setItem('live2d-first-load', 'true');
                }
            }
        } catch (e) {
            console.log('[Live2D] Storage check failed, using localStorage', e);
            const hasLoaded = localStorage.getItem('live2d-first-load');
            if (!hasLoaded) {
                showFirstLoadNotification();
                localStorage.setItem('live2d-first-load', 'true');
            }
        }
    }

    // 显示首次加载提示
    function showFirstLoadNotification() {
        const notification = document.createElement('div');
        notification.id = 'live2d-first-load-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.85);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            z-index: 999999;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: fadeIn 0.3s ease;
        `;
        notification.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">✨</div>
            <div>第一次加载有点慢喔~</div>
            <div style="margin-top: 5px;">请耐心等待~</div>
        `;

        // 添加动画样式
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            #live2d-first-load-notification.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);

        // 5秒后自动关闭
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
    }

    // 检测网页是否已有看板娘模型
    function checkExistingLive2D() {
        const hasLive2DCanvas = document.querySelector('canvas[id*="live2d"], canvas[class*="live2d"], canvas[class*="waifu"]');
        const hasWaifuElement = document.querySelector('#waifu, .waifu, [id*="waifu"], [class*="waifu"]');
        const hasLive2DScript = document.querySelector('script[src*="live2d"], script[src*="waifu"]');
        
        return hasLive2DCanvas || hasWaifuElement || hasLive2DScript;
    }

    // 显示已有看板娘提示
    function showExistingLive2DNotification() {
        const notification = document.createElement('div');
        notification.id = 'live2d-existing-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 200, 100, 0.95);
            color: #333;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            z-index: 999999;
            box-shadow: 0 8px 32px rgba(255, 150, 0, 0.3);
            text-align: center;
            animation: live2dSlideIn 0.3s ease;
            max-width: 400px;
        `;

        const checkboxId = 'live2d-hide-existing-checkbox-' + Date.now();

        notification.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 10px;">⚠️</div>
            <div style="font-size: 16px; margin-bottom: 8px;">「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span></div>
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">网页拥有相同看板娘喵~</div>
            <div style="font-size: 14px; line-height: 1.5; margin-bottom: 15px;">我先告辞了喵~</div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 15px;">
                <input type="checkbox" id="${checkboxId}" style="width: 16px; height: 16px; cursor: pointer;">
                <label for="${checkboxId}" style="font-size: 13px; cursor: pointer; user-select: none;">不再显示</label>
            </div>
            <button id="live2d-existing-confirm-btn" style="
                background: rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(0, 0, 0, 0.2);
                color: #333;
                padding: 8px 24px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
            ">确定</button>
        `;

        if (!document.getElementById('live2d-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'live2d-notification-styles';
            style.textContent = `
                @keyframes live2dSlideIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes live2dSlideOut {
                    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                }
                #live2d-existing-notification.fade-out {
                    animation: live2dSlideOut 0.3s ease forwards;
                }
                #live2d-existing-confirm-btn:hover {
                    background: rgba(0, 0, 0, 0.2);
                }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(notification);

        const autoCloseTimer = setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 7000);

        const confirmBtn = document.getElementById('live2d-existing-confirm-btn');
        const checkbox = document.getElementById(checkboxId);

        confirmBtn.addEventListener('click', function() {
            clearTimeout(autoCloseTimer);
            if (checkbox.checked) {
                sessionStorage.setItem('live2d-hide-existing-' + siteDomain, 'true');
            }
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }

    // 全局变量 - 先定义用于检测
    let siteDomain = window.location.hostname;
    let siteName = window.location.hostname;
    try {
        const ogSiteName = document.querySelector('meta[property="og:site_name"]');
        if (ogSiteName && ogSiteName.content) {
            siteName = ogSiteName.content;
        }
    } catch (e) {}

    // 同步 freezeModelEnabled 和 freezeMode 设置到 localStorage（优先读 chrome.storage）
    (function syncFreezeModelSetting() {
        try {
            // 先从 chrome.storage.local 读已保存的值
            storage.get(['freezeModelEnabled', 'freezeMode'], function(stored) {
                const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                if (stored.freezeModelEnabled !== undefined) {
                    settings.freezeModelEnabled = stored.freezeModelEnabled;
                } else if (settings.freezeModelEnabled === undefined) {
                    settings.freezeModelEnabled = false; // 默认关闭
                }
                if (stored.freezeMode !== undefined) {
                    settings.freezeMode = stored.freezeMode;
                } else if (settings.freezeMode === undefined) {
                    settings.freezeMode = 'quick'; // 默认快速恢复
                }
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
                console.log('[Live2D] Synced freeze settings from chrome.storage:', stored);
            });
        } catch (e) {
            console.log('[Live2D] Could not sync freeze settings:', e);
            // 回退到默认
            try {
                const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                if (settings.freezeModelEnabled === undefined) settings.freezeModelEnabled = false;
                if (settings.freezeMode === undefined) settings.freezeMode = 'quick';
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
            } catch(e2) {}
        }
    })();

    // 检测首次加载
    checkFirstLoad();

    // 检测页面是否已有看板娘
    if (checkExistingLive2D()) {
        const hideKey = 'live2d-hide-existing-' + siteDomain;
        if (sessionStorage.getItem(hideKey) !== 'true') {
            console.log('[Live2D] Existing Live2D detected on page, showing notification');
            showExistingLive2DNotification();
        }
        console.log('[Live2D] Skipping initialization - page already has Live2D');
        return;
    }

    // 鼠标特效相关变量
    let mouseCursorEnabled = false;
    let clickEffectEnabled = false;
    let mouseFeaturesAvailable = { mouseCursor: false, clickEffect: false };

    let mouseCursorsConfig = [];
    let cursorManifest = [];
    let selectedCursorId = '';
    let mouseCursorSize = 150;

    // 检测鼠标特效资源是否可用
    async function checkMouseFeaturesResources() {
        try {
            const baseUrl = runtime.getURL('');
            
            let mouseCursorAvailable = false;
            mouseCursorsConfig = [];
            cursorManifest = [];

            try {
                const manifestRes = await fetch(baseUrl + 'mouse-features/mouse-cursors/cursors_manifest.json', { cache: 'no-cache' });
                if (manifestRes.ok) {
                    const manifestData = await manifestRes.json();
                    cursorManifest = manifestData.cursors || [];

                    for (const cursor of cursorManifest) {
                        try {
                            const configRes = await fetch(baseUrl + `mouse-features/mouse-cursors/${cursor.folder}/cursors.json`, { cache: 'no-cache' });
                            if (configRes.ok) {
                                const configData = await configRes.json();
                                mouseCursorsConfig.push({
                                    id: cursor.id,
                                    folder: cursor.folder,
                                    name: configData.name || cursor.id,
                                    normal: configData.normal || 'Normal.ani',
                                    pointer: configData.pointer || 'Link.ani',
                                    text: configData.text || 'Text.ani',
                                    move: configData.move || 'Move.ani',
                                    wait: configData.wait || 'Busy.ani',
                                    help: configData.help || 'Help.ani'
                                });
                            }
                        } catch (e) {}
                    }

                    mouseCursorAvailable = mouseCursorsConfig.length > 0;
                }
            } catch (e) {
                mouseCursorAvailable = false;
            }

            let clickEffectAvailable = false;
            try {
                const configRes = await fetch(baseUrl + 'mouse-features/click-effects/kaomoji.js');
                if (configRes.ok) {
                    clickEffectAvailable = true;
                }
            } catch (e) {
                clickEffectAvailable = false;
            }

            return { mouseCursorAvailable, clickEffectAvailable };
        } catch (e) {
            console.error('[Live2D] Failed to check mouse features:', e);
            return { mouseCursorAvailable: false, clickEffectAvailable: false };
        }
    }

    async function initMouseCursor() {
        console.log('[Live2D] Mouse cursor init - enabled:', mouseCursorEnabled, 'available:', mouseFeaturesAvailable.mouseCursorAvailable);
        
        if (!mouseCursorEnabled) {
            console.log('[Live2D] Mouse cursor disabled by user settings');
            return;
        }
        
        if (!mouseFeaturesAvailable.mouseCursorAvailable || mouseCursorsConfig.length === 0) {
            console.log('[Live2D] Mouse cursor resources not available');
            return;
        }
        
        if (!selectedCursorId) {
            console.log('[Live2D] No cursor selected');
            return;
        }
        
        const cursorConfig = mouseCursorsConfig.find(c => c.id === selectedCursorId);
        if (!cursorConfig) {
            console.log('[Live2D] Cursor config not found:', selectedCursorId);
            return;
        }
        
        const baseUrl = runtime.getURL('');
        const cursorFolder = cursorConfig.folder;
        
        // 检查是否是动态指针（.ani格式）
        const isAnimated = cursorConfig.normal && cursorConfig.normal.toLowerCase().endsWith('.ani');
        
        // 获取指针 URL
        const normalCursor = `${baseUrl}mouse-features/mouse-cursors/${cursorFolder}/${cursorConfig.normal}`;
        const pointerCursor = cursorConfig.pointer ? `${baseUrl}mouse-features/mouse-cursors/${cursorFolder}/${cursorConfig.pointer}` : null;
        const textCursor = cursorConfig.text ? `${baseUrl}mouse-features/mouse-cursors/${cursorFolder}/${cursorConfig.text}` : null;
        
        const scale = mouseCursorSize / 100;
        
        // 从配置中读取热点位置，默认为 0（鼠标指针通常从左上角开始）
        const baseHotspotX = cursorConfig.hotspotX != null ? cursorConfig.hotspotX : 0;
        const baseHotspotY = cursorConfig.hotspotY != null ? cursorConfig.hotspotY : 0;
        
        // 移除旧的指针元素
        const existingPointer = document.getElementById('live2d-custom-pointer');
        if (existingPointer) existingPointer.remove();
        
        // 移除旧的样式
        const existingStyle = document.getElementById('live2d-custom-cursor');
        if (existingStyle) existingStyle.remove();
        
        // 如果是动态指针，用自定义 div 跟随鼠标
        if (isAnimated) {
            console.log('[Live2D] Using custom pointer for animated cursor:', cursorConfig.name);
            
            // 隐藏原生鼠标
            const hideCursorCSS = `
                *, *::before, *::after {
                    cursor: none !important;
                }
                html, body {
                    cursor: none !important;
                }
            `;
            const hideStyle = document.createElement('style');
            hideStyle.id = 'live2d-custom-cursor';
            hideStyle.textContent = hideCursorCSS;
            document.documentElement.appendChild(hideStyle);
            
            // 创建自定义指针元素
            const pointer = document.createElement('div');
            pointer.id = 'live2d-custom-pointer';
            pointer.style.cssText = `
                position: fixed;
                pointer-events: none;
                z-index: 2147483647;
                width: ${32 * scale}px;
                height: ${32 * scale}px;
                background-image: url("${normalCursor}");
                background-repeat: no-repeat;
                background-size: contain;
                image-rendering: -webkit-optimize-contrast;
            `;
            document.body.appendChild(pointer);
            
            // 鼠标移动时更新位置
            document.addEventListener('mousemove', (e) => {
                pointer.style.left = (e.clientX - baseHotspotX * scale) + 'px';
                pointer.style.top = (e.clientY - baseHotspotY * scale) + 'px';
            });
        } else {
            // 静态指针，用原生 cursor
            const hotspotX = baseHotspotX;
            const hotspotY = baseHotspotY;
            
            const cursorCSS = `
                *, *::before, *::after {
                    cursor: url("${normalCursor}") ${hotspotX} ${hotspotY}, auto !important;
                }
                html, body {
                    cursor: url("${normalCursor}") ${hotspotX} ${hotspotY}, auto !important;
                }
                a, button, [role="button"], *[onclick], input[type="submit"], input[type="button"], label, select, option, summary, [tabindex]:not([tabindex="-1"]) {
                    cursor: url("${pointerCursor || normalCursor}") ${hotspotX} ${hotspotY}, pointer !important;
                }
                input:not([type="submit"]):not([type="button"]), textarea, [contenteditable], [contenteditable="true"], [contenteditable="plaintext-only"] {
                    cursor: url("${textCursor || normalCursor}") ${hotspotX} ${hotspotY}, text !important;
                }
                *[draggable="true"], [draggable="true"] *, .draggable, .draggable * {
                    cursor: url("${normalCursor}") ${hotspotX} ${hotspotY}, move !important;
                }
                *:disabled, :disabled *, .disabled, .disabled * {
                    cursor: url("${normalCursor}") ${hotspotX} ${hotspotY}, not-allowed !important;
                }
            `;
            
            const styleEl = document.createElement('style');
            styleEl.id = 'live2d-custom-cursor';
            styleEl.textContent = cursorCSS;
            document.documentElement.appendChild(styleEl);
            
            console.log('[Live2D] Using native cursor mode:', cursorConfig.name);
        }
    }

    // 初始化点击特效
    function initClickEffect() {
        console.log('[Live2D] Click effect init - enabled:', clickEffectEnabled, 'available:', mouseFeaturesAvailable.clickEffectAvailable);
        
        if (!clickEffectEnabled) {
            console.log('[Live2D] Click effect disabled by user settings');
            return;
        }
        
        // 优先尝试加载外部文件
        try {
            const baseUrl = runtime.getURL('');
            const scriptPath = baseUrl + 'mouse-features/click-effects/kaomoji.js';
            console.log('[Live2D] Loading click effect from:', scriptPath);
            
            const scriptEl = document.createElement('script');
            scriptEl.src = scriptPath;
            scriptEl.onload = function() {
                console.log('[Live2D] Click effect (kaomoji) loaded from file');
            };
            scriptEl.onerror = function(err) {
                console.log('[Live2D] External file not found, using inline click effect');
                initClickEffectInline();
            };
            document.head.appendChild(scriptEl);
        } catch (e) {
            console.log('[Live2D] Error loading script, using inline click effect');
            initClickEffectInline();
        }
    }
    
    // 内联点击特效（当外部文件加载失败时使用）
    function initClickEffectInline() {
        const kaomojis = [
            "₍^>ᴗo^₎⟆", "₍^𐄁ᢦ𐄁^₎⟆", "₍^• ᵕ •^₎⟆", "₍^◡◡^₎⟆", "₍^⸝⸝⬮ ω ⬮⸝⸝^₎⟆", "₍^ɞ̴̶̷ · ɞ̴̶̷^₎⟆",
            "₍^ɞ̴̶̷   ̫ ɞ̴̶̷^₎⟆", "₍^•༚•^₎⟆", "₍^ฅ˃ ᵕ ˂ฅ^₎⟆", "₍^･∞︎･^₎⟆", "₍^•𖥦•^₎⟆", "₍^> 。o^₎⟆",
            "₍^◕ ﹏ ◕^₎⟆", "₍^˵- ᴗ -˵^₎⟆", "₍^• ⌄ •^₎⟆", "₍^꒦ິ 。꒦ິ^₎⟆", "₍^ᴗ͈ 。ᴗ͈^₎⟆", "₍^• 。•^₎⟆",
            "₍^> 𖥦 <^₎⟆", "₍^ƒ 。ƒ^₎⟆", "₍^o̴̶̷̥᷅ ‎ࡇ o̴̶̷̥᷅^₎⟆", "₍^꩜ 。꩜^₎⟆", "₍^•⩊•^₎⟆",
            "₍^•̥ 𖥦 •̥ ྀི^₎⟆", "₍^•༚• ྀི^₎⟆", "₍^＞ ₃ ＜^₎⟆", "₍^-⩊-^₎⟆", "₍^•-•^₎⟆", "₍^• ˕ • ྀི^₎⟆",
            "₍^⎚˕⎚^₎⟆", "₍^៸៸⦁⩊⦁ᴗ͈^₎⟆", "₍^-˕-^₎⟆", "₍^• ◡ •^₎⟆", "₍^„• ֊ •„^₎⟆", "₍^˶ᵔᗜᵔ˶^₎⟆",
            "₍^✪ω✪^₎⟆", "₍^•͈ ₃ •͈^₎⟆", "₍^⇀‸↼^₎⟆", "₍^>𖥦<^₎⟆", "₍^ɞ̴̶̷ ·̮ ɞ̴̶̷^₎⟆", "₍^◕‿◕^₎⟆",
            "₍^˃̵ ֊ ˂̵^₎⟆", "₍^• ·̭ •̥^₎⟆", "₍^߹𖥦߹^₎⟆", "₍^≖◡≖^₎⟆", "₍^◕ᴗ<^₎⟆", "₍^ॱᯅॱ^₎⟆",
            "₍^⬮𖧉⬮^₎⟆", "₍^> ಲ <^₎⟆", "₍^๑ᯅ๑^₎⟆", "₍^•ㅅ•^₎⟆", "₍^•̥ o •̥^ ྀི₎⟆", "₍^oᴗo^₎⟆",
            "₍^>ᴗ<^₎⟆", "₍^•ω<^₎⟆", "₍^･3･^₎⟆", "₍^◕⤙◕^₎⟆", "₍^◍×◍^₎⟆", "₍^ʚ̴̶̷.ʚ̴̶̷̥̀^₎⟆",
            "₍^･∀･^₎⟆", "₍^. ֑ .^₎⟆", "₍^>ᆺ<^₎⟆", "₍^•o•^₎⟆", "₍^ᦲ 𖥦 ᦲ^₎⟆", "₍^ᴗ.ᴗ^₎⟆",
            "₍^•̆₃•̑^₎⟆", "₍^★˕★^₎⟆", "₍^•ェ•^₎⟆", "₍^𖦹ω𖦹^₎⟆", "₍^›⩊‹^₎⟆", "₍^⦁᎑-^₎⟆",
            "₍^⊝ᴥ⊝^₎⟆", "₍^×   ̫ ×^₎⟆", "₍^˃̶ᗜ˂̶^₎⟆", "₍^°⌓°^₎⟆", "₍^◍ㅅ◍^₎⟆", "₍^●.●^₎⟆",
            "₍^˙О˙^₎⟆", "₍^-﹏-^₎⟆", "₍^˃ ⤙ ˂^₎⟆", "₍^꒦ິ^꒦ິ^₎⟆", "₍^◐∀◐^₎⟆", "₍^¬ ᴗ ¬^₎⟆",
            "₍^๑˃ ᵕ ˂๑^₎⟆", "₍^ˊᵒ̴̶̷̤ ꇴ ᵒ̴̶̷̤ˋ^₎⟆", "₍^ᴗ͈ . ᴗ͈^₎⟆", "₍^ᵒ ᵕ ˂^₎⟆", "₍^๑′0`๑^₎⟆",
            "₍^◕‿◕^₎⟆", "₍^⑅˶•▿•˶⑅^₎⟆", "₍^ˣ ˷ ˣ^₎⟆", "₍^•̀ᜊ•́^₎⟆", "₍^>ㅿ<^₎⟆", "₍^⁰ᯅ⁰^₎⟆",
            "₍^๑•⌔•๑^₎⟆", "⭐", "❤", "🌸"
        ];
        const symbols = ["⭐", "❤", "🌸"];
        const colors = ["#FF69B4", "#ff6651", "orange", "#FF00FF", "#00FF7F", "#00BFFF", "#BA55D3"];
        
        let clsCount = 0;
        
        function createFront(classname) {
            const ospan = document.createElement('span');
            const cssText = "position:absolute; width:auto; height:20px; cursor:default; transform:translate(-50%,-50%); font-weight:bold; opacity:1; z-index:1000; transition:1s; -moz-user-select:none; -webkit-user-select:none; -ms-user-select:none; user-select:none; white-space:nowrap; display:inline-block; line-height:20px; text-align:center;";
            
            let randomFront;
            if (Math.random() < 0.3) {
                randomFront = symbols[Math.floor(Math.random() * symbols.length)];
            } else {
                randomFront = kaomojis[Math.floor(Math.random() * kaomojis.length)];
            }
            
            const randomColor = colors[Math.round(Math.random() * (colors.length - 1))];
            document.body.appendChild(ospan);
            ospan.className = String(classname);
            ospan.style.cssText = cssText;
            ospan.style.color = randomColor;
            ospan.innerHTML = randomFront;
            
            // 随机飘动方向和距离
            const angle = Math.random() * Math.PI * 2; // 0-360度
            const distance = 50 + Math.random() * 100; // 50-150px
            const offsetX = Math.cos(angle) * distance;
            const offsetY = Math.sin(angle) * distance;
            
            setTimeout(function() {
                ospan.style.opacity = 0;
                ospan.style.top = (ospan.offsetTop + offsetY) + 'px';
                ospan.style.left = (ospan.offsetLeft + offsetX) + 'px';
            }, 100);
            setTimeout(function() {
                if (ospan.parentNode) {
                    ospan.parentNode.removeChild(ospan);
                }
            }, 2000);
        }
        
        document.addEventListener('click', function(e) {
            if (clsCount === 20) {
                clsCount = 0;
            } else {
                clsCount += 1;
            }
            createFront(clsCount);
            const el = document.getElementsByClassName(clsCount)[0];
            if (el) {
                el.style.left = e.clientX + 'px';
                el.style.top = e.clientY + 'px';
            }
        }, true);
        
        console.log('[Live2D] Click effect (kaomoji) enabled inline');
    }

    // 其他全局变量
    let modelSuccessfullyLoaded = false;
    let hasShownNotification = false;
    let hasStartedLoading = false;
    let hasModelLoadError = false;

    // 显示模型加载失败通知
    function showModelLoadFailedNotification(reason, forceReplace = false) {
        console.log('[Live2D] showModelLoadFailedNotification called, reason:', reason, 'forceReplace:', forceReplace);

        // 检查是否已经选择不再显示（针对这个网站）
        const hideKey = 'live2d-hide-' + siteDomain;
        if (sessionStorage.getItem(hideKey) === 'true') {
            console.log('[Live2D] Notification hidden for this site:', siteDomain);
            return;
        }
        
        // 调试信息
        console.log('[Live2D] Notification status: hasShownNotification =', hasShownNotification);

        // 如果已经显示过通知，且新来的不是强制替换，则跳过（避免重复）
        // CSP 错误总是强制替换，因为更准确
        if (hasShownNotification && !forceReplace && reason !== 'csp') {
            console.log('[Live2D] Notification already shown on this page, skipping');
            return;
        }

        // 如果已经显示过通知，则移除旧的
        if (hasShownNotification) {
            const oldNotification = document.getElementById('live2d-model-load-failed-notification');
            if (oldNotification) {
                oldNotification.remove();
            }
            console.log('[Live2D] Replacing old notification with new one');
        }

        hasShownNotification = true;

        const notification = document.createElement('div');
        notification.id = 'live2d-model-load-failed-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 100, 100, 0.95);
            color: white;
            padding: 20px 30px;
            border-radius: 12px;
            font-size: 16px;
            z-index: 999999;
            box-shadow: 0 8px 32px rgba(255, 0, 0, 0.3);
            text-align: center;
            animation: live2dSlideIn 0.3s ease;
            max-width: 400px;
        `;

        const checkboxId = 'live2d-hide-notification-checkbox-' + Date.now();

        // 根据错误类型生成不同的提示内容
        let errorTitle = '';
        let errorMessage = '';
        let errorIcon = '⚠️';

        if (reason === 'csp') {
            errorTitle = `「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span>`;
            errorMessage = `是网站的追踪脚本被广告拦截器阻止了，无法显示模型喵！这不是我们的问题喵！`;
            errorIcon = '⚠️';
        } else if (reason === 'network') {
            errorTitle = `「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span>`;
            errorMessage = `网络连接失败，无法加载模型喵~`;
            errorIcon = '📡';
        } else if (reason === 'notfound') {
            errorTitle = `「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span>`;
            errorMessage = `是网站的追踪脚本被广告拦截器阻止了，无法显示模型喵！这不是我们的问题喵！`;
            errorIcon = '⚠️';
        } else if (reason === 'cors') {
            errorTitle = `「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span>`;
            errorMessage = `模型CDN资源被CORS策略阻止了！建议切换到本地模型使用喵~`;
            errorIcon = '🚫';
        } else if (reason === 'blocked') {
            errorTitle = `「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span>`;
            errorMessage = `模型CDN资源被CORS策略阻止了！建议切换到本地模型使用喵~`;
            errorIcon = '🚫';
        } else {
            errorTitle = `「${siteName}」<span style="font-size: 12px; opacity: 0.8;">(${siteDomain})</span>`;
            errorMessage = `是网站的追踪脚本被广告拦截器阻止了，无法显示模型喵！这不是我们的问题喵！`;
        }

        notification.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">${errorIcon}</div>
            <div style="font-size: 16px; margin-bottom: 8px;">${errorTitle} 模型加载失败喵！</div>
            <div style="font-size: 14px; line-height: 1.5; margin-bottom: 15px;">${errorMessage}</div>
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 15px;">
                <input type="checkbox" id="${checkboxId}" style="width: 16px; height: 16px; cursor: pointer;">
                <label for="${checkboxId}" style="font-size: 13px; cursor: pointer; user-select: none;">不再显示</label>
            </div>
            <button id="live2d-notification-confirm-btn" style="
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 8px 24px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
            ">确定</button>
        `;

        // 添加动画样式
        if (!document.getElementById('live2d-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'live2d-notification-styles';
            style.textContent = `
                @keyframes live2dSlideIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes live2dSlideOut {
                    from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    to { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                }
                #live2d-model-load-failed-notification.fade-out {
                    animation: live2dSlideOut 0.3s ease forwards;
                }
                #live2d-notification-confirm-btn:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `;
            document.head.appendChild(style);
        }
        document.body.appendChild(notification);
        console.log('[Live2D] Notification added to DOM');

        // 7秒后自动关闭
        const autoCloseTimer = setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 7000);

        // 绑定确定按钮事件
        const confirmBtn = document.getElementById('live2d-notification-confirm-btn');
        const checkbox = document.getElementById(checkboxId);

        confirmBtn.addEventListener('click', function() {
            clearTimeout(autoCloseTimer);
            // 如果勾选了"不再显示"（针对这个网站）
            if (checkbox.checked) {
                sessionStorage.setItem(hideKey, 'true');
            }
            // 关闭通知
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
    }

    // 统一的错误检测和通知函数
    function checkAndShowNotification(message, forceReplace = false) {
        // 先将消息转为小写进行初步检测
        const lowerMessage = message.toLowerCase();

        // 检测所有可能的错误（更宽泛的检测）
        const isError = message.includes('Loading the script') ||
            message.includes('violates the following') ||
            message.includes('Content Security Policy') ||
            message.includes('script-src') ||
            message.includes('CSP') ||
            message.includes('Uncaught') ||
            message.includes('Failed to load resource') ||
            message.includes('ERR_FILE_NOT_FOUND') ||
            message.includes('net::ERR_') ||
            message.includes('waifu-tips') ||
            message.includes('live2d-widgets') ||
            message.includes('waifu') ||
            message.includes('CORS') ||
            message.includes('Access-Control-Allow-Origin') ||
            message.includes('blocked by CORS policy') ||
            message.includes('has been blocked by CORS policy') ||
            lowerMessage.includes('live2d') ||
            lowerMessage.includes('waifu') ||
            lowerMessage.includes('model') ||
            lowerMessage.includes('moc');

        if (isError) {
            console.log('[Live2D] Potential error detected:', message.substring(0, 200));
            console.log('[Live2D] Model-related error detected, modelSuccessfullyLoaded:', modelSuccessfullyLoaded);
            // 标记有错误发生
            hasModelLoadError = true;
            if (!modelSuccessfullyLoaded) {
                // 根据错误类型传递不同的 reason
                let reasonType = 'blocked';
                // CSP 相关错误
                if (message.includes('Loading the script') || message.includes('violates the following') || message.includes('Content Security Policy') || message.includes('script-src') || message.includes('CSP') || message.includes('waifu-tips') || message.includes('live2d-widgets') || message.includes('waifu-tips.js') || message.includes('live2d-widgets.js')) {
                    reasonType = 'csp';
                } else if (message.includes('ERR_FILE_NOT_FOUND') || message.includes('net::ERR_FILE_NOT_FOUND')) {
                    reasonType = 'notfound';
                } else if (message.includes('net::ERR_') || message.includes('Failed to load resource')) {
                    reasonType = 'network';
                } else if (message.includes('CORS') || message.includes('Access-Control-Allow-Origin') || message.includes('blocked by CORS policy')) {
                    reasonType = 'cors';
                }
                // 如果包含 Uncaught (in promise) 和 .js URL，也当作 CSP 错误
                else if (message.includes('Uncaught (in promise)') && (message.includes('.js') || message.includes("'"))) {
                    reasonType = 'csp';
                }
                showModelLoadFailedNotification(reasonType, forceReplace);
            }
        }
    }

    // 监听控制台错误，检测模型加载失败
    const originalError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        console.log('[Live2D] Console error detected:', message.substring(0, 300));
        checkAndShowNotification(message);
        return originalError.apply(console, args);
    };

    // 监听控制台警告
    const originalWarn = console.warn;
    console.warn = function(...args) {
        const message = args.join(' ');
        console.log('[Live2D] Console warn detected:', message.substring(0, 300));
        checkAndShowNotification(message);
        return originalWarn.apply(console, args);
    };

    // 监听未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', function(event) {
        let message = 'Unknown error';
        if (event.reason) {
            if (typeof event.reason === 'string') {
                message = event.reason;
            } else if (event.reason.message) {
                message = event.reason.message;
            } else if (event.reason.stack) {
                message = event.reason.stack;
            } else {
                message = JSON.stringify(event.reason);
            }
        }
        console.log('[Live2D] unhandledrejection detected:', message.substring(0, 300));
        checkAndShowNotification(message, true);
    });

    // 监听全局错误
    window.addEventListener('error', function(event) {
        let message = 'Unknown error';
        if (event.error) {
            if (typeof event.error === 'string') {
                message = event.error;
            } else if (event.error.message) {
                message = event.error.message;
            } else if (event.error.stack) {
                message = event.error.stack;
            } else {
                message = JSON.stringify(event.error);
            }
        }
        console.log('[Live2D] window.error detected:', message.substring(0, 300));
        checkAndShowNotification(message, true);
    });

    // 监听 CSP 违规事件
    document.addEventListener('securitypolicyviolation', function(event) {
        let message = 'CSP Violation: ' + (event.violatedDirective || '') + ' - ' + (event.blockedURI || '');
        console.log('[Live2D] CSP violation detected! Message:', message);
        console.log('[Live2D] CSP event details:', event);
        checkAndShowNotification(message, true);
    });



    // 模型加载状态检测
    let modelLoadTimeout = null;
    let modelLoadCheckCount = 0;

    function checkModelLoadStatus() {
        console.log('[Live2D] Site:', siteDomain, 'Timeout: 5s');
        console.log('[Live2D] Starting model load check, hasStartedLoading =', hasStartedLoading);

        // 额外检测：如果页面有 Live2D 元素但长时间没加载成功
        modelLoadTimeout = setTimeout(function() {
            modelLoadCheckCount++;
            console.log('[Live2D] Model load timeout check #' + modelLoadCheckCount);

            // 检查是否存在 Live2D canvas 但没有成功加载
            const live2dCanvas = document.getElementById('live2d') || document.querySelector('canvas[ id*="live2d"]');
            const waifuElement = document.getElementById('waifu');

            console.log('[Live2D] Canvas found:', !!live2dCanvas, 'Waifu element:', !!waifuElement, 'Already loaded:', modelSuccessfullyLoaded);
            
            // 检查 canvas 是否真的有内容
            let canvasHasContent = false;
            if (live2dCanvas) {
                // 检查基本尺寸
                if (live2dCanvas.width > 0 && live2dCanvas.height > 0) {
                    canvasHasContent = true;
                }
                // 额外检查 webgl canvas 的绘制缓冲区
                try {
                    const gl = live2dCanvas.getContext('webgl') || live2dCanvas.getContext('webgl2');
                    if (gl) {
                        const dbWidth = live2dCanvas.drawingBufferWidth || 0;
                        const dbHeight = live2dCanvas.drawingBufferHeight || 0;
                        if (dbWidth > 0 && dbHeight > 0) {
                            canvasHasContent = true;
                        }
                    }
                } catch (e) {}
                
                // 更严格的检查：检查是否有live2d相关的类名或数据属性
                const waifuTool = document.querySelector('#waifu-tool');
                const canvasParent = live2dCanvas.closest('#waifu');
                const hasVisibleElements = waifuTool && waifuTool.children.length > 0;
                
                // 如果canvas被设置了尺寸但实际上看不到任何内容，可能是加载失败
                if (canvasHasContent && !hasVisibleElements) {
                    console.log('[Live2D] Canvas has size but no visible tools, checking if actually visible...');
                    // 检查canvas是否真的有内容（通过getImageData）
                    try {
                        const ctx = live2dCanvas.getContext('2d');
                        if (ctx) {
                            const imageData = ctx.getImageData(0, 0, 10, 10);
                            // 检查是否所有像素都是透明的
                            let allTransparent = true;
                            for (let i = 0; i < imageData.data.length; i += 4) {
                                if (imageData.data[i + 3] > 0) {
                                    allTransparent = false;
                                    break;
                                }
                            }
                            if (allTransparent) {
                                console.log('[Live2D] Canvas appears to be empty (all pixels transparent)');
                                canvasHasContent = false;
                            }
                        }
                    } catch (e) {
                        // 2d context可能不可用，检查是否有其他线索
                        const canvasStyle = window.getComputedStyle(live2dCanvas);
                        const isVisible = canvasStyle.display !== 'none' && canvasStyle.visibility !== 'hidden' && parseFloat(canvasStyle.opacity) > 0;
                        if (!isVisible) {
                            canvasHasContent = false;
                        }
                    }
                }
            }
            
            console.log('[Live2D] Canvas has content:', canvasHasContent, 'Canvas width/height:', live2dCanvas?.width, live2dCanvas?.height, 'Has error:', hasModelLoadError);

            // 只有 canvas 有内容且没有错误才算真正加载成功
            if (live2dCanvas && canvasHasContent && !hasModelLoadError) {
                if (!modelSuccessfullyLoaded) {
                    console.log('[Live2D] Model appears to be loaded successfully!');
                    modelSuccessfullyLoaded = true;
                    // 清除超时检测
                    if (modelLoadTimeout) {
                        clearTimeout(modelLoadTimeout);
                        modelLoadTimeout = null;
                    }
                }
            }

            if (!modelSuccessfullyLoaded && hasStartedLoading) {
                // 情况1: 连元素都没找到
                if (!live2dCanvas && !waifuElement) {
                    console.log('[Live2D] No Live2D elements found, showing notification');
                    showModelLoadFailedNotification('notfound');
                }
                // 情况2: 有错误发生或没有canvas内容，或者已经检测了多次仍然没加载成功
                else if (hasModelLoadError || !canvasHasContent || modelLoadCheckCount >= 3) {
                    console.log('[Live2D] Model load error detected or canvas empty or timeout, showing notification');
                    // 如果有错误标志，优先用对应类型；否则用blocked
                    const reasonType = hasModelLoadError ? 'cors' : 'blocked';
                    showModelLoadFailedNotification(reasonType);
                }
            }

            // 如果还没加载成功，继续检测（最多6次）
            if (!modelSuccessfullyLoaded && modelLoadCheckCount < 6) {
                modelLoadTimeout = setTimeout(arguments.callee, 5000);
            }
        }, 5000);
    }

    // 检测启动函数 - 等待初始化完成
    function startModelLoadDetection() {
        // 延迟一点，确保初始化代码已经执行
        setTimeout(function() {
            console.log('[Live2D] Starting model load detection, hasStartedLoading =', hasStartedLoading);
            checkModelLoadStatus();
        }, 300);
    }

    // 一言缓存
    let cachedHitokoto = '欢迎回来~';

    // 本地一言备用库
    const localHitokotos = [
        '今天也要元气满满哦！',
        '摸摸头~',
        '你好啊！',
        '今天天气真好呢~',
        '开心每一天！',
        '有什么我可以帮你的吗？',
        '欢迎回来！',
        '工作辛苦了~',
        '来聊聊天吧！',
        '加油哦！',
        '新的一天开始啦！',
        '注意休息哦~',
        '你真的很棒！',
        '保持好心情~',
        '今天也要努力呢！'
    ];

    // 获取一言
    async function fetchHitokoto() {
        try {
            const response = await fetch('https://v1.hitokoto.cn/');
            if (response.ok) {
                const data = await response.json();
                return data.hitokoto || localHitokotos[Math.floor(Math.random() * localHitokotos.length)];
            }
        } catch (e) {
            console.log('[Live2D] Hitokoto API failed, using local');
        }
        return localHitokotos[Math.floor(Math.random() * localHitokotos.length)];
    }

    // 预缓存一言
    async function preCacheHitokoto() {
        cachedHitokoto = await fetchHitokoto();
    }

    // 显示气泡
    function showCubism2Tips(text) {
        const tipsEl = document.getElementById('waifu-tips');
        if (tipsEl) {
            tipsEl.textContent = text;
            tipsEl.classList.add('waifu-tips-active');
            setTimeout(function() {
                tipsEl.classList.remove('waifu-tips-active');
            }, 5000);
        }
    }

    // 添加Cubism2点击监听
    function addCubism2ClickListener() {
        let checkCount = 0;
        const checkInterval = setInterval(function() {
            const canvas = document.getElementById('live2d');
            if (canvas) {
                clearInterval(checkInterval);
                canvas.addEventListener('click', async function() {
                    showCubism2Tips(cachedHitokoto);
                    const text = await fetchHitokoto();
                    cachedHitokoto = text;
                });
                console.log('[Live2D] Cubism2 click listener added');
                preCacheHitokoto();
            }
            checkCount++;
            if (checkCount > 100) {
                clearInterval(checkInterval);
            }
        }, 100);
    }

    // 将回调API转换为Promise API的辅助函数
    const storage = {
        get: function(keys) {
            return new Promise((resolve, reject) => {
                try {
                    if (typeof browserAPI.storage.local.get === 'function') {
                        let isPromiseStyle = false;
                        try {
                            const testResult = browserAPI.storage.local.get(keys);
                            if (testResult && typeof testResult.then === 'function') {
                                isPromiseStyle = true;
                                testResult.then(resolve).catch(reject);
                            }
                        } catch (e) {}

                        if (!isPromiseStyle) {
                            browserAPI.storage.local.get(keys, function(result) {
                                if (browserAPI.runtime.lastError) {
                                    reject(browserAPI.runtime.lastError);
                                } else {
                                    resolve(result || {});
                                }
                            });
                        }
                    } else {
                        resolve({});
                    }
                } catch (e) {
                    console.error('[Live2D] Storage get error:', e);
                    resolve({});
                }
            });
        },
        set: function(items) {
            return new Promise((resolve, reject) => {
                try {
                    if (typeof browserAPI.storage.local.set === 'function') {
                        let isPromiseStyle = false;
                        try {
                            const testResult = browserAPI.storage.local.set(items);
                            if (testResult && typeof testResult.then === 'function') {
                                isPromiseStyle = true;
                                testResult.then(resolve).catch(reject);
                            }
                        } catch (e) {}

                        if (!isPromiseStyle) {
                            browserAPI.storage.local.set(items, function() {
                                if (browserAPI.runtime.lastError) {
                                    reject(browserAPI.runtime.lastError);
                                } else {
                                    resolve();
                                }
                            });
                        }
                    } else {
                        resolve();
                    }
                } catch (e) {
                    console.error('[Live2D] Storage set error:', e);
                    resolve();
                }
            });
        },
        onChanged: browserAPI.storage.onChanged
    };
    const runtime = {
        getURL: function(path) {
            return browserAPI.runtime.getURL(path);
        }
    };
    // Prevent multiple initializations
    if (window.__live2dInitialized) {
        console.log('[Live2D] Already initialized');
        return;
    }
    window.__live2dInitialized = true;

    // Default CDN
    var DEFAULT_CDN = 'https://cdn.jsdelivr.net/gh/fghrsh/live2d_api@1.0.1/';

    // 检测暗色模式
    function isDarkMode() {
        const manualTheme = localStorage.getItem('live2d-manual-theme');
        if (manualTheme === 'dark') return true;
        if (manualTheme === 'light') return false;
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 切换主题
    function toggleTheme() {
        const currentIsDark = isDarkMode();
        const newTheme = currentIsDark ? 'light' : 'dark';
        localStorage.setItem('live2d-manual-theme', newTheme);
        console.log('[Live2D] Theme toggled to:', newTheme);
        injectCubism2ThemeStyles();
    }

    // 为 Cubism 2 版本注入主题样式
    function injectCubism2ThemeStyles() {
        const oldStyle = document.getElementById('live2d-cubism2-theme-styles');
        if (oldStyle) oldStyle.remove();

        const isDark = isDarkMode();

        // 只设置主题相关样式，不设置气泡位置！气泡位置交由气泡监控机制管理
        const style = document.createElement('style');
        style.id = 'live2d-cubism2-theme-styles';
        style.textContent = `
            #waifu-tips {
                background: ${isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.75)'};
                color: ${isDark ? '#000' : '#fff'};
                left: 50% !important;
                transform: translateX(calc(-50% - 26px)) !important;
                bottom: auto !important;
                right: auto !important;
            }
            #waifu-tool {
                left: calc(50% + 52px) !important;
                right: auto !important;
            }
            .waifu-tool {
                background: ${isDark ? 'rgba(255, 255, 255, 0.5) !important' : 'rgba(0, 0, 0, 0.5) !important'};
                color: ${isDark ? '#000 !important' : '#fff !important'};
            }
            .waifu-tool:hover {
                background: ${isDark ? 'rgba(255, 255, 255, 0.8) !important' : 'rgba(0, 0, 0, 0.8) !important'};
            }
        `;
        document.head.appendChild(style);
        
        // 确保气泡位置正确（只在Cubism2模式下）
        setTimeout(function() {
            if (!isCubism3Mode()) {
                enforceTipsPosition();
            }
        }, 100);
    }

    // 监听主题变化
    function watchThemeChanges() {
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                if (!localStorage.getItem('live2d-manual-theme')) {
                    console.log('[Live2D] System theme changed, updating styles...');
                    injectCubism2ThemeStyles();
                }
            });
        }
    }

    // 为 Cubism 2 添加主题切换按钮
    function addCubism2ThemeButton() {
        const checkWaifu = setInterval(function() {
            const waifuTools = document.querySelector('#waifu-tool');
            if (waifuTools) {
                clearInterval(checkWaifu);

                const themeBtn = document.createElement('span');
                themeBtn.className = 'waifu-tool';
                themeBtn.id = 'waifu-theme';
                themeBtn.title = '切换主题';
                themeBtn.innerHTML = '☀';

                themeBtn.addEventListener('click', function() {
                    toggleTheme();
                    themeBtn.innerHTML = isDarkMode() ? '☀' : '☾';
                });

                themeBtn.innerHTML = isDarkMode() ? '☀' : '☾';

                if (waifuTools.firstChild) {
                    waifuTools.insertBefore(themeBtn, waifuTools.firstChild);
                } else {
                    waifuTools.appendChild(themeBtn);
                }

                console.log('[Live2D] Theme toggle button added');
            }
        }, 100);

        setTimeout(function() {
            clearInterval(checkWaifu);
        }, 10000);
    }

    // 加载脚本的辅助函数（TrustedScriptURL 兼容）
    function loadScriptSafely(url) {
        const script = document.createElement('script');
        try {
            if (window.trustedTypes && window.trustedTypes.createPolicy) {
                let policy;
                try {
                    policy = window.trustedTypes.getPolicy('live2d-loader');
                } catch (e) {
                    policy = window.trustedTypes.createPolicy('live2d-loader', {
                        createScriptURL: (input) => input
                    });
                }
                script.src = policy.createScriptURL(url);
            } else {
                script.src = url;
            }
        } catch (e) {
            console.log('[Live2D] TrustedScriptURL not supported, using fallback');
            script.src = url;
        }
        document.head.appendChild(script);
    }

    // Check if enabled first and load all settings
    storage.get(['enabled', 'modelSource', 'cdnPath', 'drag', 'position', 'size', 'localModel', 'cubism3Model', 'useCubism3', 'experimentalEnabled', 'mouseFeaturesEnabled', 'mouseCursorEnabled', 'clickEffectEnabled', 'selectedCursor', 'mouseCursorSize']).then(async function(userConfig) {
        if (userConfig.enabled === false) {
            console.log('[Live2D] Disabled by user');
            window.__live2dInitialized = false;
            return;
        }

        // 检测是否是 lemon tab（新标签页）- 提前定义，确保在任何使用前都已定义
        const isLemonTab = window.location.protocol === 'chrome-extension:' || window.location.pathname.includes('lemon') || window.location.hostname === '';
        
        // 检测是否是Edge浏览器且在B站上，如果是则自动切换到本地模型
        const isEdgeBrowser = navigator.userAgent.includes('Edg');
        const isBilibili = window.location.hostname.includes('bilibili.com');

        // 检查实验功能开关
        const experimentalEnabled = userConfig.experimentalEnabled || false;
        console.log('[Live2D] Experimental features enabled:', experimentalEnabled);
        
        // 检查鼠标特效资源并初始化
        console.log('[Live2D] Checking mouse features resources...');
        const resources = await checkMouseFeaturesResources();
        console.log('[Live2D] Resources check result:', resources);
        mouseFeaturesAvailable = resources;
        console.log('[Live2D] mouseFeaturesAvailable set to:', mouseFeaturesAvailable);
        
        // 只有当实验功能启用时，鼠标特效才会生效
        const mouseFeaturesEnabled = experimentalEnabled ? (userConfig.mouseFeaturesEnabled || false) : false;
        mouseCursorEnabled = experimentalEnabled && mouseFeaturesEnabled ? (userConfig.mouseCursorEnabled || false) : false;
        clickEffectEnabled = experimentalEnabled && mouseFeaturesEnabled ? (userConfig.clickEffectEnabled || false) : false;
        selectedCursorId = userConfig.selectedCursor || '';
        mouseCursorSize = userConfig.mouseCursorSize || 150;
        
        console.log('[Live2D] Mouse features config:', {
            experimentalEnabled,
            mouseFeaturesEnabled,
            mouseCursorEnabled,
            clickEffectEnabled,
            selectedCursorId,
            mouseCursorSize,
            mouseFeaturesAvailable
        });
        
        // 初始化鼠标特效 - 只有当实验功能启用时才会生效
        if (mouseCursorEnabled && mouseFeaturesAvailable && mouseFeaturesAvailable.mouseCursorAvailable) {
            console.log('[Live2D] Calling initMouseCursor');
            initMouseCursor();
        } else {
            console.log('[Live2D] initMouseCursor skipped:', {
                experimentalEnabled,
                mouseCursorEnabled,
                mouseFeaturesAvailable,
                mouseFeaturesAvailableMouseCursor: mouseFeaturesAvailable?.mouseCursorAvailable
            });
        }
        if (clickEffectEnabled && mouseFeaturesAvailable) {
            console.log('[Live2D] Calling initClickEffect');
            initClickEffect();
        } else {
            console.log('[Live2D] initClickEffect skipped:', {
                experimentalEnabled,
                clickEffectEnabled,
                mouseFeaturesAvailable,
                clickEffectAvailable: mouseFeaturesAvailable?.clickEffectAvailable
            });
        }

        var baseUrl = runtime.getURL('');
        if (!baseUrl.endsWith('/')) baseUrl += '/';

        var effectiveCdn;
        var localModelPath = userConfig.localModel || '';
        var cubism3ModelPath = userConfig.cubism3Model || '';
        var modelSource = userConfig.modelSource !== undefined ? userConfig.modelSource : 'local';
        var useCubism3 = userConfig.useCubism3 !== undefined ? userConfig.useCubism3 : true;
        
        if (isEdgeBrowser && isBilibili && modelSource === 'official') {
            console.log('[Live2D] Edge browser detected on Bilibili, auto-switching to local model');
            modelSource = 'local';
            // 更新本地存储
            browserAPI.storage.local.set({ modelSource: 'local' });
        }

        // 如果是Cubism3模式，让autoload-cubism3.js完全接管
        if (modelSource === 'local' && useCubism3) {
            console.log('[Live2D] Using local model library (Cubism3):', effectiveCdn);

            var settingsData = {
                modelSource: modelSource,
                cdnPath: baseUrl + 'live2d-static-api/indexes/',
                localModel: localModelPath,
                cubism3Model: cubism3ModelPath,
                useCubism3: useCubism3,
                drag: userConfig.drag || false,
                position: userConfig.position || 'left-bottom',
                size: userConfig.size || 100,
                baseUrl: baseUrl,
                cubism3BasePath: baseUrl + 'live2d-moc3/',
                modelBasePath: baseUrl + 'live2d-static-api/models_Cubism3/',
                isNewTab: isLemonTab,
                aiEnabled: userConfig.aiEnabled,
                aiApiKey: userConfig.aiApiKey,
                siliconflowApiKey: userConfig.siliconflowApiKey,
                univibeApiKey: userConfig.univibeApiKey,
                longcatApiKey: userConfig.longcatApiKey,
                qwenApiKey: userConfig.qwenApiKey,
                hunyuanApiKey: userConfig.hunyuanApiKey,
                ernieApiKey: userConfig.ernieApiKey,
                doubaoApiKey: userConfig.doubaoApiKey,
                sparkApiKey: userConfig.sparkApiKey,
                zhipuApiKey: userConfig.zhipuApiKey,
                moonshotApiKey: userConfig.moonshotApiKey,
                minimaxApiKey: userConfig.minimaxApiKey,
                aiProvider: userConfig.aiProvider,
                aiConnected: userConfig.aiConnected,
                experimentalEnabled: userConfig.experimentalEnabled,
                mouseFeaturesEnabled: userConfig.mouseFeaturesEnabled,
                mouseCursorEnabled: userConfig.mouseCursorEnabled,
                clickEffectEnabled: userConfig.clickEffectEnabled,
                selectedCursor: userConfig.selectedCursor,
                mouseCursorSize: userConfig.mouseCursorSize,
                sakanaWidgetEnabled: userConfig.sakanaWidgetEnabled,
                sakanaWidgetDraggable: userConfig.sakanaWidgetDraggable,
                sakanaWidgetSize: userConfig.sakanaWidgetSize,
                sakanaWidgetPositionSaved: userConfig.sakanaWidgetPositionSaved,
                sakanaWidgetPositionX: userConfig.sakanaWidgetPositionX,
                sakanaWidgetPositionY: userConfig.sakanaWidgetPositionY
            };

            console.log('[Live2D] Settings:', settingsData);
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
            
            // 标记模型已开始加载
            hasStartedLoading = true;
            console.log('[Live2D] Model loading started');
            
            // 启动模型加载检测
            startModelLoadDetection();

            var timestamp = Date.now();
            setTimeout(function() {
                loadScriptSafely(baseUrl + 'dist/autoload-cubism3.js?v=' + timestamp);
            }, 100);
            return;
        }

        // Cubism2模式继续
        if (modelSource === 'local') {
            effectiveCdn = baseUrl + 'live2d-static-api/indexes/';
            console.log('[Live2D] Using local model library (Cubism2):', effectiveCdn);
            if (localModelPath) {
                console.log('[Live2D] Selected local model:', localModelPath);
            }
        } else if (userConfig.cdnPath && userConfig.cdnPath.trim()) {
            effectiveCdn = userConfig.cdnPath.trim();
            if (!effectiveCdn.endsWith('/')) effectiveCdn += '/';
            console.log('[Live2D] Using custom CDN:', effectiveCdn);
        } else {
            effectiveCdn = DEFAULT_CDN;
            console.log('[Live2D] Using default CDN:', effectiveCdn);
        }

        var settingsData = {
            modelSource: modelSource,
            cdnPath: effectiveCdn,
            localModel: localModelPath,
            cubism3Model: cubism3ModelPath,
            useCubism3: useCubism3,
            drag: userConfig.drag || false, // Cubism2 的拖拽不需要实验性功能
            position: userConfig.position || 'left-bottom',
            size: userConfig.size || 100,
            baseUrl: baseUrl,
            cubism3BasePath: baseUrl + 'live2d-moc3/',
            modelBasePath: baseUrl + 'live2d-static-api/models_Cubism3/',
            isNewTab: isLemonTab,
            aiEnabled: userConfig.aiEnabled,
            aiApiKey: userConfig.aiApiKey,
            siliconflowApiKey: userConfig.siliconflowApiKey,
            univibeApiKey: userConfig.univibeApiKey,
            longcatApiKey: userConfig.longcatApiKey,
            qwenApiKey: userConfig.qwenApiKey,
            hunyuanApiKey: userConfig.hunyuanApiKey,
            ernieApiKey: userConfig.ernieApiKey,
            doubaoApiKey: userConfig.doubaoApiKey,
            sparkApiKey: userConfig.sparkApiKey,
            zhipuApiKey: userConfig.zhipuApiKey,
            moonshotApiKey: userConfig.moonshotApiKey,
            minimaxApiKey: userConfig.minimaxApiKey,
            aiProvider: userConfig.aiProvider,
            aiConnected: userConfig.aiConnected,
            experimentalEnabled: userConfig.experimentalEnabled,
            mouseFeaturesEnabled: userConfig.mouseFeaturesEnabled,
            mouseCursorEnabled: userConfig.mouseCursorEnabled,
            clickEffectEnabled: userConfig.clickEffectEnabled,
            selectedCursor: userConfig.selectedCursor,
            mouseCursorSize: userConfig.mouseCursorSize,
            sakanaWidgetEnabled: userConfig.sakanaWidgetEnabled,
            sakanaWidgetDraggable: userConfig.sakanaWidgetDraggable,
            sakanaWidgetSize: userConfig.sakanaWidgetSize,
            sakanaWidgetPositionSaved: userConfig.sakanaWidgetPositionSaved,
            sakanaWidgetPositionX: userConfig.sakanaWidgetPositionX,
            sakanaWidgetPositionY: userConfig.sakanaWidgetPositionY
        };

        console.log('[Live2D] Settings:', settingsData);
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
        
        // 标记模型已开始加载
        hasStartedLoading = true;
        console.log('[Live2D] Model loading started');
        
        // 启动模型加载检测
        startModelLoadDetection();

        applyCustomStyles();

        var OriginalImage = window.Image;
        window.Image = function() {
            var img = new OriginalImage();
            img.crossOrigin = 'anonymous';
            return img;
        };
        window.Image.prototype = OriginalImage.prototype;

        injectCubism2ThemeStyles();
        watchThemeChanges();

        var timestamp = Date.now();
        console.log('[Live2D] Using Cubism 2 renderer');

        setTimeout(function() {
            loadScriptSafely(baseUrl + 'dist/autoload.js?v=' + timestamp);
            addCubism2ThemeButton();
            addCubism2ClickListener();
        }, 100);
    });

    // 动态更新 Cubism3 模型大小
    function updateCubism3Size(newSize) {
        const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        const position = settings.position || 'left-bottom';
        const sizeScale = newSize / 100;
        const canvasWidth = Math.round(450 * sizeScale);
        const canvasHeight = Math.round(450 * sizeScale);
        
        console.log('[Live2D Cubism3] Updating size to:', newSize + '%', 'Canvas:', canvasWidth + 'x' + canvasHeight);
        
        // 位置配置
        const positionConfig = {
            'left-bottom': { waifuLeft: 0, waifuBottom: 0, tipsLeft: canvasWidth / 2, buttonsLeft: canvasWidth / 2, buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: canvasWidth / 2, chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'right-bottom': { waifuRight: 0, waifuBottom: 0, tipsLeft: canvasWidth / 2, buttonsLeft: canvasWidth / 2, buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: canvasWidth / 2, chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'left-top': { waifuLeft: 0, waifuTop: 35, tipsLeft: canvasWidth / 2, buttonsLeft: canvasWidth / 2, buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: canvasWidth / 2, chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'right-top': { waifuRight: 0, waifuTop: 35, tipsLeft: canvasWidth / 2, buttonsLeft: canvasWidth / 2, buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: canvasWidth / 2, chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'center': { waifuLeft: '50%', waifuTop: '50%', waifuTransform: 'translate(-50%, -50%)', tipsLeft: '50%', buttonsLeft: '50%', buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: '50%', chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'top-center': { waifuLeft: '50%', waifuTop: 35, waifuTransform: 'translateX(-50%)', tipsLeft: '50%', buttonsLeft: '50%', buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: '50%', chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'bottom-center': { waifuLeft: '50%', waifuBottom: 0, waifuTransform: 'translateX(-50%)', tipsLeft: '50%', buttonsLeft: '50%', buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: '50%', chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'left-center': { waifuLeft: 0, waifuTop: '50%', waifuTransform: 'translateY(-50%)', tipsLeft: canvasWidth / 2, buttonsLeft: canvasWidth / 2, buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: canvasWidth / 2, chatBottom: 'auto', chatTop: 'calc(62% + 35px)' },
            'right-center': { waifuRight: 0, waifuTop: '50%', waifuTransform: 'translateY(-50%)', tipsLeft: canvasWidth / 2, buttonsLeft: canvasWidth / 2, buttonsBottom: 'auto', buttonsTop: '62%', chatLeft: canvasWidth / 2, chatBottom: 'auto', chatTop: 'calc(62% + 35px)' }
        };
        
        const mainPos = positionConfig[position] || positionConfig['left-bottom'];
        
        // 更新所有 waifu 容器
        const waifuContainers = document.querySelectorAll('[id^="waifu"]');
        waifuContainers.forEach(container => {
            // 只更新主容器的大小，不要影响按钮和气泡
            if (container.id === 'waifu' || container.id.startsWith('waifu-')) {
                container.style.width = canvasWidth + 'px';
                container.style.height = canvasHeight + 'px';
            }
        });
        
        // 更新所有 canvas 元素
        const canvases = document.querySelectorAll('[id^="live2d"]');
        canvases.forEach(canvas => {
            if (canvas.getContext) { // 确保是 canvas 元素
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
            }
        });
        
        // 更新按钮容器位置
        const buttonsEl = document.getElementById('waifu-buttons');
        if (buttonsEl) {
            let buttonsStyle = 'display: flex; flex-direction: row; gap: 5px;';
            if (mainPos.buttonsLeft !== undefined) {
                if (typeof mainPos.buttonsLeft === 'string' && mainPos.buttonsLeft.includes('%')) {
                    buttonsStyle += ' left: ' + mainPos.buttonsLeft + '; transform: translateX(-50%);';
                } else {
                    buttonsStyle += ' left: ' + mainPos.buttonsLeft + 'px; transform: translateX(-50%);';
                }
            }
            if (mainPos.buttonsBottom !== undefined) {
                if (typeof mainPos.buttonsBottom === 'string' && mainPos.buttonsBottom.includes('%')) {
                    buttonsStyle += ' bottom: ' + mainPos.buttonsBottom + '; top: auto;';
                } else {
                    buttonsStyle += ' bottom: ' + mainPos.buttonsBottom + 'px; top: auto;';
                }
            }
            if (mainPos.buttonsTop !== undefined) {
                if (typeof mainPos.buttonsTop === 'string' && (mainPos.buttonsTop.includes('%') || mainPos.buttonsTop.includes('calc'))) {
                    buttonsStyle += ' top: ' + mainPos.buttonsTop + '; bottom: auto;';
                } else {
                    buttonsStyle += ' top: ' + mainPos.buttonsTop + 'px; bottom: auto;';
                }
            }
            buttonsEl.style.cssText = buttonsStyle;
        }
        
        // 更新聊天容器位置
        const chatEl = document.getElementById('waifu-chat');
        if (chatEl) {
            let chatStyle = 'display: flex; gap: 5px;';
            if (mainPos.chatLeft !== undefined) {
                if (typeof mainPos.chatLeft === 'string' && mainPos.chatLeft.includes('%')) {
                    chatStyle += ' left: ' + mainPos.chatLeft + '; transform: translateX(-50%);';
                } else {
                    chatStyle += ' left: ' + mainPos.chatLeft + 'px; transform: translateX(-50%);';
                }
            }
            if (mainPos.chatBottom !== undefined) {
                if (typeof mainPos.chatBottom === 'string' && mainPos.chatBottom.includes('%')) {
                    chatStyle += ' bottom: ' + mainPos.chatBottom + '; top: auto;';
                } else {
                    chatStyle += ' bottom: ' + mainPos.chatBottom + 'px; top: auto;';
                }
            }
            if (mainPos.chatTop !== undefined) {
                if (typeof mainPos.chatTop === 'string' && (mainPos.chatTop.includes('%') || mainPos.chatTop.includes('calc'))) {
                    chatStyle += ' top: ' + mainPos.chatTop + '; bottom: auto;';
                } else {
                    chatStyle += ' top: ' + mainPos.chatTop + 'px; bottom: auto;';
                }
            }
            chatEl.style.cssText = chatStyle;
        }
        
        // 更新气泡位置（CSS 中已经设置好了，主要是确保容器大小正确）
        const tipsEl = document.getElementById('waifu-tips');
        if (tipsEl) {
            // 气泡的位置由 CSS 控制，不需要手动调整
            tipsEl.style.cssText = ''; // 清除可能存在的内联样式
        }
        
        console.log('[Live2D Cubism3] Size updated dynamically with correct button/tip positions');
    }

    function applyCustomStyles() {
        var oldStyle = document.getElementById('live2d-custom-styles');
        if (oldStyle) oldStyle.remove();

        var style = document.createElement('style');
        style.id = 'live2d-custom-styles';
        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        var size = settingsData.size || 100;
        var position = settingsData.position || 'left-bottom';

        // 检查是否有保存的拖拽位置！不管是否开启拖拽！只要有保存的位置！就用那个位置！
        const hasSavedDragPosition = settingsData.draggedLeft !== undefined && settingsData.draggedTop !== undefined;

        if (hasSavedDragPosition) {
            console.log('[Live2D] Found saved drag position, using it (regardless of drag enabled)');
            // 有保存的拖拽位置！只修改大小，并且恢复这个位置！
            style.textContent = [
                '#waifu{',
                'position:fixed !important;',
                'z-index:2147483647 !important;',
                'left:' + settingsData.draggedLeft + 'px !important;',
                'top:' + settingsData.draggedTop + 'px !important;',
                'bottom:auto !important;',
                'right:auto !important;',
                'transform:scale(' + (size / 100) + ') !important;',
                '}',
                '#waifu.waifu-active{',
                'position:fixed !important;',
                'z-index:2147483647 !important;',
                'left:' + settingsData.draggedLeft + 'px !important;',
                'top:' + settingsData.draggedTop + 'px !important;',
                'bottom:auto !important;',
                'right:auto !important;',
                'transform:scale(' + (size / 100) + ') !important;',
                '}'
            ].join('');
            document.head.appendChild(style);
            return;
        }

        // 检查是否开启了拖拽！只要开启了拖拽，只修改大小，不修改位置！
        const isDraggingEnabled = settingsData.drag === true;

        if (isDraggingEnabled) {
            console.log('[Live2D] Drag is enabled, only updating size');
            // 只修改大小和z-index，保持默认 CSS 位置！
            style.textContent = [
                '#waifu{',
                'z-index:2147483647 !important;',
                'transform:scale(' + (size / 100) + ') !important;',
                '}',
                '#waifu.waifu-active{',
                'z-index:2147483647 !important;',
                'transform:scale(' + (size / 100) + ') !important;',
                '}'
            ].join('');
            document.head.appendChild(style);
            
            // 不修改任何位置样式！让默认 CSS 位置生效！
            return;
        }

        if (position === 'all') {
            console.log('[Live2D] Cubism2 does not support "all" position, using left-bottom');
            position = 'left-bottom';
        }

        var positionStyles = {
            'center': 'position:fixed !important;z-index:2147483647 !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) scale(' + (size / 100) + ') !important;transform-origin:center center !important;bottom:auto !important;right:auto !important;',
            'left-top': 'position:fixed !important;z-index:2147483647 !important;top:35px !important;left:5px !important;transform:scale(' + (size / 100) + ') !important;transform-origin:top left !important;bottom:auto !important;right:auto !important;',
            'right-top': 'position:fixed !important;z-index:2147483647 !important;top:30px !important;right:0 !important;transform:scale(' + (size / 100) + ') !important;transform-origin:top right !important;bottom:auto !important;left:auto !important;',
            'left-bottom': 'position:fixed !important;z-index:2147483647 !important;bottom:0 !important;left:0 !important;transform:scale(' + (size / 100) + ') !important;transform-origin:bottom left !important;top:auto !important;right:auto !important;',
            'right-bottom': 'position:fixed !important;z-index:2147483647 !important;bottom:5px !important;right:5px !important;transform:scale(' + (size / 100) + ') !important;transform-origin:bottom right !important;top:auto !important;left:auto !important;',
            'top-center': 'position:fixed !important;z-index:2147483647 !important;top:35px !important;left:50% !important;transform:translateX(-50%) scale(' + (size / 100) + ') !important;transform-origin:top center !important;bottom:auto !important;right:auto !important;',
            'bottom-center': 'position:fixed !important;z-index:2147483647 !important;bottom:0 !important;left:50% !important;transform:translateX(-50%) scale(' + (size / 100) + ') !important;transform-origin:bottom center !important;top:auto !important;right:auto !important;',
            'left-center': 'position:fixed !important;z-index:2147483647 !important;top:50% !important;left:0 !important;transform:translateY(-50%) scale(' + (size / 100) + ') !important;transform-origin:center left !important;bottom:auto !important;right:auto !important;',
            'right-center': 'position:fixed !important;z-index:2147483647 !important;top:50% !important;right:0 !important;transform:translateY(-50%) scale(' + (size / 100) + ') !important;transform-origin:center right !important;bottom:auto !important;left:auto !important;'
        };

        var waifuStyle = positionStyles[position] || positionStyles['left-bottom'];

        var toggleStyle, togglePosition;
        if (position.indexOf('bottom') !== -1) {
            toggleStyle = 'bottom:66px !important;';
        } else if (position.indexOf('top') !== -1) {
            toggleStyle = 'top:66px !important;';
        } else {
            toggleStyle = 'top:50% !important;transform:translateY(-50%) !important;';
        }

        if (position.indexOf('left') !== -1) {
            togglePosition = 'left:0 !important;';
        } else if (position.indexOf('right') !== -1) {
            togglePosition = 'right:0 !important;';
        } else {
            togglePosition = 'right:0 !important;';
        }

        style.textContent = [
            '#waifu{',
            waifuStyle,
            '}',
            '#waifu-toggle{',
            'position:fixed !important;',
            toggleStyle,
            togglePosition,
            '}',
            '#waifu.waifu-active{',
            waifuStyle,
            '}'
        ].join('');

        document.head.appendChild(style);
        console.log('[Live2D] Custom styles applied: position=' + position + ', size=' + size + '%');
        
        // 确保气泡位置正确（只在Cubism2模式下）
        setTimeout(function() {
            if (!isCubism3Mode()) {
                enforceTipsPosition();
            }
        }, 100);
    }

    // 监听设置变化，重新应用样式
    storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            // 同步 freeze/drag 设置到 localStorage
            if (changes.freezeModelEnabled || changes.freezeMode || changes.dragLimit || changes.drag) {
                const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                if (changes.freezeModelEnabled) {
                    settings.freezeModelEnabled = changes.freezeModelEnabled.newValue;
                }
                if (changes.freezeMode) {
                    settings.freezeMode = changes.freezeMode.newValue;
                }
                if (changes.dragLimit !== undefined) {
                    settings.dragLimit = changes.dragLimit.newValue;
                }
                if (changes.drag !== undefined) {
                    settings.drag = changes.drag.newValue;
                }
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
                // 同步到其他标签页：冻结模式变化时重新冻结
                if (changes.freezeMode || changes.freezeModelEnabled) {
                    if (settings.freezeModelEnabled) {
                        unfreezeLive2DModel();
                        setTimeout(freezeLive2DModel, 50);
                    } else {
                        unfreezeLive2DModel();
                    }
                }
                console.log('[Live2D] Settings synced to localStorage');
            }
            
            // 当位置改变时，重置原始位置
            if (changes.position) {
                resetOriginalPosition();
            }
            
            if (changes.position || changes.size) {
                console.log('[Live2D] Settings changed, reapplying styles');

                storage.get(['modelSource', 'useCubism3', 'size']).then(function(config) {
                    if (config.modelSource === 'local' && config.useCubism3) {
                        // 对于 Cubism3 模式，动态更新大小，不刷新页面
                        if (config.size) {
                            updateCubism3Size(config.size);
                        }
                        // 如果是位置变化，可能需要重新初始化，但我们不刷新页面
                    } else {
                        // 对于 Cubism2 模式，应用自定义样式
                        applyCustomStyles();
                        injectCubism2ThemeStyles();
                    }
                });
            }
        }
    });
    // Cubism2 拖拽功能 - 暂时禁用，直接在 autoload.js 中处理
    // 如果 autoload.js 的方案还有问题，再启用这个
    
    // 检查当前是否是Cubism3模式
    function isCubism3Mode() {
        const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        return settingsData.modelSource === 'local' && settingsData.useCubism3 === true;
    }
    
    // 气泡位置监控机制
    let tipsObserver = null;
    let tipsCheckInterval = null;
    let originalIsTopPosition = null; // 记住模型的原始位置
    
    // 初始化时记录原始位置
    function initializeOriginalPosition() {
        if (originalIsTopPosition === null) {
            const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            // 先检查 localStorage 中是否有保存的原始位置
            if (settingsData.originalIsTopPosition !== undefined) {
                originalIsTopPosition = settingsData.originalIsTopPosition;
                console.log('[Live2D] Loaded original position from localStorage:', originalIsTopPosition);
            } else {
                const position = settingsData.position || 'left-bottom';
                originalIsTopPosition = position === 'left-top' || position === 'right-top' || position === 'top-center';
                // 保存原始位置到 localStorage
                settingsData.originalIsTopPosition = originalIsTopPosition;
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                console.log('[Live2D] Original position is top:', originalIsTopPosition);
            }
        }
    }
    
    // 重置原始位置（当用户改变设置中的位置时调用）
    function resetOriginalPosition() {
        originalIsTopPosition = null;
        const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        delete settingsData.originalIsTopPosition;
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
        console.log('[Live2D] Original position reset');
    }
    
    function enforceTipsPosition() {
        // 如果是Cubism3模式，不做任何处理
        if (isCubism3Mode()) return;
        
        const tipsEl = document.getElementById('waifu-tips');
        if (!tipsEl) return;
        
        initializeOriginalPosition();
        
        const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        const hasSavedDragPosition = settingsData.draggedLeft !== undefined && settingsData.draggedTop !== undefined;
        const position = settingsData.position || 'left-bottom';
        const isTopPosition = position === 'left-top' || position === 'right-top' || position === 'top-center';
        const isDragToTop = hasSavedDragPosition && settingsData.draggedTop < 200;
        
        // 决定气泡位置
        if (hasSavedDragPosition) {
            // 有拖拽位置，使用智能逻辑
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
        } else {
            // 没有拖拽位置，只根据设置中的位置来决定
            if (isTopPosition) {
                // 在顶端位置，气泡朝下
                tipsEl.style.setProperty('top', 'calc(50% + 190px)', 'important');
                tipsEl.style.setProperty('bottom', 'auto', 'important');
            } else {
                // 在底端位置，气泡朝上
                tipsEl.style.setProperty('top', 'calc(50% - 165px)', 'important');
                tipsEl.style.setProperty('bottom', 'auto', 'important');
            }
        }
        tipsEl.style.setProperty('left', '50%', 'important');
        tipsEl.style.setProperty('transform', 'translateX(calc(-50% - 26px))', 'important');
    }
    
    function setupTipsMonitoring() {
        // 如果是Cubism3模式，不做任何处理
        if (isCubism3Mode()) return;
        
        // 先立即执行一次
        enforceTipsPosition();
        
        // 设置 MutationObserver 监听气泡元素的变化
        const tipsEl = document.getElementById('waifu-tips');
        if (tipsEl && !tipsObserver) {
            tipsObserver = new MutationObserver(function(mutations) {
                enforceTipsPosition();
            });
            tipsObserver.observe(tipsEl, {
                attributes: true,
                attributeFilter: ['style', 'class']
            });
        }
        
        // 设置定期检查定时器（每 500ms 检查一次）
        if (!tipsCheckInterval) {
            tipsCheckInterval = setInterval(function() {
                enforceTipsPosition();
            }, 500);
        }
    }
    
    // 尝试启动气泡监控，每隔 1 秒尝试一次，最多尝试 10 次（只在Cubism2模式下）
    let tipsSetupAttempts = 0;
    const tipsSetupInterval = setInterval(function() {
        // 如果是Cubism3模式，直接停止
        if (isCubism3Mode()) {
            console.log('[Live2D] Cubism3 mode detected, skipping tips monitoring setup');
            clearInterval(tipsSetupInterval);
            return;
        }
        
        tipsSetupAttempts++;
        const tipsEl = document.getElementById('waifu-tips');
        if (tipsEl) {
            console.log('[Live2D] Tips element found, starting monitoring');
            setupTipsMonitoring();
            clearInterval(tipsSetupInterval);
        } else if (tipsSetupAttempts >= 10) {
            console.log('[Live2D] Tips element not found after 10 attempts');
            clearInterval(tipsSetupInterval);
        }
    }, 1000);
    
    // 关键修复：刷新后主动调用一次 applyCustomStyles 来激活拖拽！
    setTimeout(function() {
        try {
            const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            // 如果不是 Cubism3，且开启了拖拽，就调用！
            if (!(settingsData.modelSource === 'local' && settingsData.useCubism3) && settingsData.drag === true) {
                console.log('[Live2D] Auto applying custom styles for drag on initialization');
                applyCustomStyles();
            }
        } catch (e) {
            console.error('[Live2D] Error auto applying styles', e);
        }
    }, 3000);
    
    // ================================================
    // 页面可见性优化：冻结/解冻实例以降低内存占用
    // ================================================
    
    let isModelFrozen = false;
    let savedDisplayStates = {};
    let freezeModeUsed = 'quick';
    
    function freezeLive2DModel() {
        if (isModelFrozen) return;
        
        console.log('[Live2D] Page hidden, freezing Live2D model to save memory');
        isModelFrozen = true;
        
        // 获取当前冻结模式
        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        freezeModeUsed = settingsData.freezeMode || 'quick';
        
        console.log('[Live2D] Freeze mode:', freezeModeUsed);
        
        // 发送事件通知 Cubism3 渲染器冻结（传递冻结模式）
        const cubism3FreezeEvent = new CustomEvent('live2dFreezeModel', { detail: { mode: freezeModeUsed } });
        window.dispatchEvent(cubism3FreezeEvent);
        
        // 对于 Cubism2：保存当前显示状态并隐藏元素（Cubism3 由 autoload-cubism3.js 自己处理）
        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        if (!settingsData.useCubism3) {
            const waifu = document.getElementById('waifu');
            if (waifu) {
                savedDisplayStates.waifu = waifu.style.display;
                waifu.style.display = 'none';
            }
            const tips = document.getElementById('waifu-tips');
            if (tips) {
                savedDisplayStates.tips = tips.style.display;
                tips.style.display = 'none';
            }
            const toggle = document.getElementById('waifu-toggle');
            if (toggle) {
                savedDisplayStates.toggle = toggle.style.display;
                toggle.style.display = 'none';
            }
        }
        
        // 停止鼠标特效
        if (window.__live2dMouseFeatures) {
            window.__live2dMouseFeatures.freeze && window.__live2dMouseFeatures.freeze();
        }
        
        // 根据冻结模式决定是否清理资源
        if (freezeModeUsed === 'full') {
            // 彻底释放模式：清理所有资源
            cleanupLive2DResources();
        }
        // 快速恢复模式：不清理资源，保持模型在内存中以便快速恢复
    }
    
    function cleanupLive2DResources() {
        console.log('[Live2D] Cleaning up Live2D resources to free memory');
        
        try {
            // 1. 清除 Canvas 上下文，释放 GPU 内存
            const canvases = document.querySelectorAll('#waifu canvas, #live2d-container canvas, .waifu-canvas');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
                // 释放 Canvas 尺寸以节省内存
                canvas.width = 0;
                canvas.height = 0;
            });
            
            // 2. 清除 Live2D 模型引用
            if (window.live2dModels) {
                Object.keys(window.live2dModels).forEach(key => {
                    window.live2dModels[key] = null;
                });
            }
            
            // 3. 清除临时数据
            if (window.__live2dTempData) {
                window.__live2dTempData = null;
            }
            
            // 4. 尝试触发垃圾回收（通过分配大量内存然后释放）
            triggerGarbageCollection();
            
            console.log('[Live2D] Live2D resources cleaned up successfully');
        } catch (e) {
            console.error('[Live2D] Error cleaning up resources:', e);
        }
    }
    
    function triggerGarbageCollection() {
        try {
            if (window.gc) {
                setTimeout(function() { window.gc(); }, 50);
            }
        } catch (e) {
        }
    }
    
    function unfreezeLive2DModel() {
        if (!isModelFrozen) return;
        
        console.log('[Live2D] Page visible, unfreezing Live2D model');
        isModelFrozen = false;
        
        // 如果被 cleanupModel 标记了跳过加载，则不解冻
        if (window.__live2d_skipReload) {
          console.log('[Live2D] Skip reload flag set, clearing and returning');
          window.__live2d_skipReload = false;
          return;
        }
        
        // 彻底释放模式：检查是否在保留标签页范围内
        try {
          var unfreezeSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
          if (unfreezeSettings.freezeModelEnabled && unfreezeSettings.freezeMode === 'full') {
            var keepTabs = parseInt(unfreezeSettings.freezeKeepTabs, 10) || 5;
            if (typeof chrome !== 'undefined' && chrome.tabs) {
              chrome.tabs.query({ currentWindow: true }, function(allTabs) {
                if (allTabs && allTabs.length > keepTabs) {
                  // 找到当前标签页在标签栏中的位置（从左到右，最右为最新）
                  for (var ui = 0; ui < allTabs.length; ui++) {
                    if (allTabs[ui].active) {
                      // 从右往左数，索引 >= length - keepTabs 的保留
                      if (ui < allTabs.length - keepTabs) {
                        console.log('[Live2D] Tab beyond keep limit (' + keepTabs + '), skipping model init');
                        return;
                      }
                      break;
                    }
                  }
                }
                // 在保留范围内，正常解冻
                dispatchUnfreeze();
              });
              return;
            }
          }
        } catch(e) {}
        dispatchUnfreeze();
        function dispatchUnfreeze() {
          var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
          var cubism3UnfreezeEvent = new CustomEvent('live2dUnfreezeModel');
          window.dispatchEvent(cubism3UnfreezeEvent);
        }
        
        // 对于 Cubism2：恢复之前保存的显示状态
        const wasVisible = savedDisplayStates.waifu !== 'none';
        if (!settingsData.useCubism3) {
            const waifu = document.getElementById('waifu');
            if (waifu) {
                waifu.style.display = savedDisplayStates.waifu || '';
            }
            const tips = document.getElementById('waifu-tips');
            if (tips) {
                tips.style.display = savedDisplayStates.tips || '';
            }
            const toggle = document.getElementById('waifu-toggle');
            if (toggle) {
                toggle.style.display = savedDisplayStates.toggle || '';
            }
        }
        
        // 恢复鼠标特效
        if (window.__live2dMouseFeatures) {
            window.__live2dMouseFeatures.unfreeze && window.__live2dMouseFeatures.unfreeze();
        }
        
        // 如果是 full 模式且看板娘之前是显示的，需要重新加载模型
        if (freezeModeUsed === 'full' && wasVisible) {
            console.log('[Live2D] Full freeze mode detected, reloading model...');
            reloadLive2DModel();
        }
        
        // 清空保存的显示状态
        savedDisplayStates = {};
        freezeModeUsed = 'quick';
    }
    
    function reloadLive2DModel() {
        console.log('[Live2D] Reloading Live2D model after full freeze');
        
        try {
            // 获取当前设置
            var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            var baseUrl = settingsData.baseUrl || browserAPI.runtime.getURL('');
            if (!baseUrl.endsWith('/')) baseUrl += '/';
            
            // 检查使用的是 Cubism2 还是 Cubism3
            var useCubism3 = settingsData.useCubism3 || false;
            
            // 生成时间戳避免缓存
            var timestamp = Date.now();
            
            // 构建脚本URL
            var scriptUrl = useCubism3 
                ? baseUrl + 'dist/autoload-cubism3.js?v=' + timestamp
                : baseUrl + 'dist/autoload.js?v=' + timestamp;
            
            // 直接创建脚本元素加载（避免作用域问题）
            const script = document.createElement('script');
            try {
                if (window.trustedTypes && window.trustedTypes.createPolicy) {
                    let policy;
                    try {
                        policy = window.trustedTypes.getPolicy('live2d-loader');
                    } catch (e) {
                        policy = window.trustedTypes.createPolicy('live2d-loader', {
                            createScriptURL: (input) => input
                        });
                    }
                    script.src = policy.createScriptURL(scriptUrl);
                } else {
                    script.src = scriptUrl;
                }
            } catch (e) {
                console.log('[Live2D] TrustedScriptURL not supported, using fallback');
                script.src = scriptUrl;
            }
            document.head.appendChild(script);
            
            console.log('[Live2D] Model reload initiated:', scriptUrl);
        } catch (e) {
            console.error('[Live2D] Error reloading model:', e);
        }
    }
    
    // 页面可见性监听器
    document.addEventListener('visibilitychange', function() {
        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        var freezeEnabled = settingsData.freezeModelEnabled === true; // 默认关闭
        if (!freezeEnabled) {
            console.log('[Live2D] Freeze model disabled, skipping visibility change');
            return;
        }
        
        if (document.hidden) {
            // 页面不可见时冻结
            freezeLive2DModel();
        } else {
            // 页面可见时解冻
            unfreezeLive2DModel();
        }
    });
    
    // 窗口可见时立即检查一次
    var settingsDataInit = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
    var freezeEnabledInit = settingsDataInit.freezeModelEnabled === true; // 默认关闭
    if (document.hidden && freezeEnabledInit) {
        // 如果初始加载时页面已经隐藏，且开启了冻结功能，立即冻结
        setTimeout(freezeLive2DModel, 500);
    }
    
    console.log('[Live2D] Memory optimization with page visibility API enabled, freezeModelEnabled:', freezeEnabledInit);
})();
