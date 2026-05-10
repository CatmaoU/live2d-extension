// Live2D New Tab Injector
// 这个脚本在新标签页上加载 Live2D 看板娘，并监听设置变化

(function() {
    console.log('[Live2D NewTab] Injector starting...');

    // 浏览器API兼容层
    var browserAPI = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) ? browser : ((typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome : null);

    if (!browserAPI) {
        console.error('[Live2D NewTab] No browser API found');
        return;
    }

    var baseUrl = browserAPI.runtime.getURL('');
    if (!baseUrl.endsWith('/')) baseUrl += '/';

    // 检测是否是 lemon-tab 页面
    var isLemonTab = window.location.href.includes('lemon-tab');
    console.log('[Live2D NewTab] Lemon tab detected:', isLemonTab);

    // 保存设置到 localStorage
    function saveSettings(userConfig) {
        console.log('[Live2D NewTab] Updating settings:', userConfig);

        if (userConfig.enabled === false) {
            console.log('[Live2D NewTab] Disabled by user');
            // 如果禁用了看板娘，隐藏看板娘
            var waifu = document.getElementById('waifu');
            if (waifu) {
                waifu.style.display = 'none';
            }
            return;
        }

        // 设置位置：优先使用用户设置，否则新标签页默认右下角
        var position = userConfig.position || 'right-bottom';

        // 清除可能存在的拖拽位置，确保使用预设位置！
        var existingSettings = {};
        try {
            existingSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            // 清除保存的拖拽位置，让它使用预设位置！
            delete existingSettings.draggedLeft;
            delete existingSettings.draggedTop;
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(existingSettings));
            console.log('[Live2D NewTab] Cleared saved drag positions to use preset position');
        } catch (e) {
            console.log('[Live2D NewTab] Failed to read existing settings:', e);
        }

        // 从用户配置读取模型源和是否使用Cubism3，新标签页默认使用本地Cubism3模型
        var modelSource = userConfig.modelSource !== undefined ? userConfig.modelSource : 'local'; 
        var useCubism3 = userConfig.useCubism3 !== undefined ? userConfig.useCubism3 : true;

        // 保存设置到 localStorage，让 autoload.js 或 autoload-cubism3.js 可以读取
        // 保留已保存的 draggedLeft 和 draggedTop
        // 注意：只有当 userConfig 中明确定义了某个属性时才覆盖，否则保留现有值
        var settingsData = {
            modelSource: modelSource,
            cdnPath: baseUrl + 'live2d-static-api/', // 确保有正确的CDN路径
            localModel: userConfig.localModel || '',
            cubism3Model: userConfig.cubism3Model || '',
            useCubism3: useCubism3, // 使用用户设置的 Cubism3 选项
            drag: userConfig.drag !== undefined ? userConfig.drag : (existingSettings.drag !== undefined ? existingSettings.drag : false),
            dragLimit: userConfig.dragLimit !== undefined ? userConfig.dragLimit : (existingSettings.dragLimit !== undefined ? existingSettings.dragLimit : true),
            position: position,
            size: userConfig.size !== undefined ? userConfig.size : 100,
            baseUrl: baseUrl,
            cubism3BasePath: baseUrl + 'live2d-moc3/',
            modelBasePath: baseUrl + 'live2d-static-api/models_Cubism3/',
            isNewTab: true,
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
            // 优先保留现有连接状态（特别是 'reconnecting' 状态）
            aiConnected: userConfig.aiConnected !== undefined ? userConfig.aiConnected : existingSettings.aiConnected,
            // 鼠标特效设置
            experimentalEnabled: userConfig.experimentalEnabled,
            mouseFeaturesEnabled: userConfig.mouseFeaturesEnabled,
            mouseCursorEnabled: userConfig.mouseCursorEnabled,
            clickEffectEnabled: userConfig.clickEffectEnabled,
            selectedCursor: userConfig.selectedCursor,
            mouseCursorSize: userConfig.mouseCursorSize,
            // Sakana Widget 设置
            sakanaWidgetEnabled: userConfig.sakanaWidgetEnabled,
            sakanaWidgetDraggable: userConfig.sakanaWidgetDraggable,
            sakanaWidgetSize: userConfig.sakanaWidgetSize,
            sakanaWidgetPositionSaved: userConfig.sakanaWidgetPositionSaved,
            sakanaWidgetPositionX: userConfig.sakanaWidgetPositionX,
            sakanaWidgetPositionY: userConfig.sakanaWidgetPositionY,
            // 保留已保存的拖拽位置
            draggedLeft: existingSettings.draggedLeft,
            draggedTop: existingSettings.draggedTop
        };

        console.log('[Live2D NewTab] Saving settings:', settingsData);
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));

        // 通知看板娘设置已更新
        window.dispatchEvent(new CustomEvent('live2d-settings-changed', { detail: settingsData }));

        // 应用自定义样式
        applyCustomStyles();
        // 如果看板娘已加载，尝试应用新设置
        applySettingsToWaifu(settingsData);
    }

    // 应用自定义样式（和普通网页保持一致）
    function applyCustomStyles() {
        // 设置正在应用样式的标志，防止 MutationObserver 触发无限循环
        isApplyingStyles = true;
        
        try {
            var oldStyle = document.getElementById('live2d-custom-styles');
            if (oldStyle) oldStyle.remove();

            var style = document.createElement('style');
            style.id = 'live2d-custom-styles';
            var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            var size = settingsData.size || 100;
            var position = settingsData.position || 'left-bottom';
            const scale = size / 100;

        console.log('[Live2D NewTab] applyCustomStyles called, position=' + position + ', size=' + size + '%');

        // 获取 #waifu 元素
        const waifu = document.getElementById('waifu');

        // 检查是否有保存的拖拽位置！不管是否开启拖拽！只要有保存的位置！就用那个位置！
        const hasSavedDragPosition = settingsData.draggedLeft !== undefined && settingsData.draggedTop !== undefined;

        if (hasSavedDragPosition) {
            console.log('[Live2D NewTab] Found saved drag position, using it (regardless of drag enabled): left=' + settingsData.draggedLeft + ', top=' + settingsData.draggedTop);
            // 有保存的拖拽位置！只修改大小，并且恢复这个位置！
            style.textContent = [
                '#waifu{',
                'position:fixed !important;',
                'z-index:2147483647 !important;',
                'left:' + settingsData.draggedLeft + 'px !important;',
                'top:' + settingsData.draggedTop + 'px !important;',
                'bottom:auto !important;',
                'right:auto !important;',
                'transform:scale(' + scale + ') !important;',
                '}',
                '#waifu.waifu-active{',
                'position:fixed !important;',
                'z-index:2147483647 !important;',
                'left:' + settingsData.draggedLeft + 'px !important;',
                'top:' + settingsData.draggedTop + 'px !important;',
                'bottom:auto !important;',
                'right:auto !important;',
                'transform:scale(' + scale + ') !important;',
                '}'
            ].join('');
            document.head.appendChild(style);
            // 同时直接设置 DOM 样式
            if (waifu) {
                waifu.style.setProperty('position', 'fixed', 'important');
                waifu.style.setProperty('z-index', '2147483647', 'important');
                waifu.style.setProperty('left', settingsData.draggedLeft + 'px', 'important');
                waifu.style.setProperty('top', settingsData.draggedTop + 'px', 'important');
                waifu.style.setProperty('bottom', 'auto', 'important');
                waifu.style.setProperty('right', 'auto', 'important');
                waifu.style.setProperty('transform', 'scale(' + scale + ')', 'important');
            }
            return;
        }

        // 检查是否开启了拖拽！只要开启了拖拽，只修改大小，不修改位置！
        const isDraggingEnabled = settingsData.drag === true;

        if (isDraggingEnabled) {
            console.log('[Live2D NewTab] Drag is enabled, only updating size');
            // 只修改大小和z-index，保持默认 CSS 位置！
            style.textContent = [
                '#waifu{',
                'z-index:2147483647 !important;',
                'transform:scale(' + scale + ') !important;',
                '}',
                '#waifu.waifu-active{',
                'z-index:2147483647 !important;',
                'transform:scale(' + scale + ') !important;',
                '}'
            ].join('');
            document.head.appendChild(style);
            // 同时直接设置 DOM 样式
            if (waifu) {
                waifu.style.setProperty('z-index', '2147483647', 'important');
                waifu.style.setProperty('transform', 'scale(' + scale + ')', 'important');
            }
            return;
        }

        if (position === 'all') {
            console.log('[Live2D NewTab] Cubism2 does not support "all" position, using left-bottom');
            position = 'left-bottom';
        }

        var positionStyles = {
            'center': 'position:fixed !important;z-index:2147483647 !important;top:50% !important;left:50% !important;transform:translate(-50%,-50%) scale(' + scale + ') !important;transform-origin:center center !important;bottom:auto !important;right:auto !important;',
            'left-top': 'position:fixed !important;z-index:2147483647 !important;top:35px !important;left:5px !important;transform:scale(' + scale + ') !important;transform-origin:top left !important;bottom:auto !important;right:auto !important;',
            'right-top': 'position:fixed !important;z-index:2147483647 !important;top:30px !important;right:0 !important;transform:scale(' + scale + ') !important;transform-origin:top right !important;bottom:auto !important;left:auto !important;',
            'left-bottom': 'position:fixed !important;z-index:2147483647 !important;bottom:0 !important;left:0 !important;transform:scale(' + scale + ') !important;transform-origin:bottom left !important;top:auto !important;right:auto !important;',
            'right-bottom': 'position:fixed !important;z-index:2147483647 !important;bottom:5px !important;right:5px !important;transform:scale(' + scale + ') !important;transform-origin:bottom right !important;top:auto !important;left:auto !important;',
            'top-center': 'position:fixed !important;z-index:2147483647 !important;top:35px !important;left:50% !important;transform:translateX(-50%) scale(' + scale + ') !important;transform-origin:top center !important;bottom:auto !important;right:auto !important;',
            'bottom-center': 'position:fixed !important;z-index:2147483647 !important;bottom:0 !important;left:50% !important;transform:translateX(-50%) scale(' + scale + ') !important;transform-origin:bottom center !important;top:auto !important;right:auto !important;',
            'left-center': 'position:fixed !important;z-index:2147483647 !important;top:50% !important;left:0 !important;transform:translateY(-50%) scale(' + scale + ') !important;transform-origin:center left !important;bottom:auto !important;right:auto !important;',
            'right-center': 'position:fixed !important;z-index:2147483647 !important;top:50% !important;right:0 !important;transform:translateY(-50%) scale(' + scale + ') !important;transform-origin:center right !important;bottom:auto !important;left:auto !important;'
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

        // 关键修复：直接设置 DOM 元素的 style 属性！绕过 CSS 覆盖问题！
        if (waifu) {
            waifu.style.setProperty('position', 'fixed', 'important');
            waifu.style.setProperty('z-index', '2147483647', 'important');
            waifu.style.setProperty('bottom', 'auto', 'important');
            waifu.style.setProperty('right', 'auto', 'important');

            if (position === 'center') {
                waifu.style.setProperty('top', '50%', 'important');
                waifu.style.setProperty('left', '50%', 'important');
                waifu.style.setProperty('transform', 'translate(-50%,-50%) scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'center center', 'important');
            } else if (position === 'top-center') {
                waifu.style.setProperty('top', '35px', 'important');
                waifu.style.setProperty('left', '50%', 'important');
                waifu.style.setProperty('transform', 'translateX(-50%) scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'top center', 'important');
            } else if (position === 'bottom-center') {
                waifu.style.setProperty('bottom', '0', 'important');
                waifu.style.setProperty('left', '50%', 'important');
                waifu.style.setProperty('transform', 'translateX(-50%) scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'bottom center', 'important');
            } else if (position === 'left-center') {
                waifu.style.setProperty('top', '50%', 'important');
                waifu.style.setProperty('left', '0', 'important');
                waifu.style.setProperty('transform', 'translateY(-50%) scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'center left', 'important');
            } else if (position === 'right-center') {
                waifu.style.setProperty('top', '50%', 'important');
                waifu.style.setProperty('right', '0', 'important');
                waifu.style.setProperty('transform', 'translateY(-50%) scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'center right', 'important');
            } else if (position === 'left-top') {
                waifu.style.setProperty('top', '35px', 'important');
                waifu.style.setProperty('left', '5px', 'important');
                waifu.style.setProperty('transform', 'scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'top left', 'important');
            } else if (position === 'right-top') {
                waifu.style.setProperty('top', '30px', 'important');
                waifu.style.setProperty('right', '0', 'important');
                waifu.style.setProperty('transform', 'scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'top right', 'important');
            } else if (position === 'left-bottom') {
                waifu.style.setProperty('bottom', '0', 'important');
                waifu.style.setProperty('left', '0', 'important');
                waifu.style.setProperty('transform', 'scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'bottom left', 'important');
            } else if (position === 'right-bottom') {
                waifu.style.setProperty('bottom', '5px', 'important');
                waifu.style.setProperty('right', '5px', 'important');
                waifu.style.setProperty('transform', 'scale(' + scale + ')', 'important');
                waifu.style.setProperty('transform-origin', 'bottom right', 'important');
            }
        }

            console.log('[Live2D NewTab] Custom styles applied: position=' + position + ', size=' + size + '%');
        } finally {
            // 重置正在应用样式的标志
            isApplyingStyles = false;
        }
    }

    // 防止重复应用样式的标志
    var isApplyingStyles = false;
    
    // 简单的样式应用调度器 - 延迟调用几次确保样式生效
    function setupStyleObserver() {
        console.log('[Live2D NewTab] Setting up style scheduler');
        
        // 多次调用 applyCustomStyles，确保覆盖 autoload.js/autoload-cubism3.js 的样式
        const scheduleStyleApply = () => {
            const delays = [0, 500, 1000, 2000, 3000]; // 延迟时间数组
            
            delays.forEach((delay, index) => {
                setTimeout(() => {
                    console.log('[Live2D NewTab] Scheduled style apply #' + (index + 1));
                    applyCustomStyles();
                }, delay);
            });
        };
        
        // 等待 #waifu 元素出现后开始调度
        const waitForWaifuElement = setInterval(() => {
            const waifu = document.getElementById('waifu');
            if (waifu) {
                clearInterval(waitForWaifuElement);
                scheduleStyleApply();
            }
        }, 50);
    }

    // 应用设置到看板娘
    function applySettingsToWaifu(settings) {
        var waifu = document.getElementById('waifu');
        if (!waifu) return;

        // 应用自定义样式（位置和大小）
        applyCustomStyles();

        // 先处理拖拽设置（这样关闭拖拽时可以先保存当前位置）
        if (settings.drag !== undefined && waifu) {
            waifu.draggable = settings.drag;
            
            // 移除旧的拖拽事件监听器（如果存在）
            if (waifu._dragHandlers) {
                waifu.removeEventListener('mousedown', waifu._dragHandlers.mouseDown);
                document.removeEventListener('mousemove', waifu._dragHandlers.mouseMove);
                document.removeEventListener('mouseup', waifu._dragHandlers.mouseUp);
                waifu._dragHandlers = null;
            }
            
            if (settings.drag) {
                // 启用拖拽 - 添加拖拽事件监听器
                var isDragging = false;
                var startX, startY, startLeft, startTop;
                
                var handlers = {
                    mouseDown: function(e) {
                        if (e.button !== 0) return; // 只响应左键
                        isDragging = true;
                        startX = e.clientX;
                        startY = e.clientY;
                        startLeft = waifu.offsetLeft;
                        startTop = waifu.offsetTop;
                        waifu.style.zIndex = 2147483647;
                        e.preventDefault();
                    },
                    mouseMove: function(e) {
                        if (!isDragging) return;
                        var dx = e.clientX - startX;
                        var dy = e.clientY - startY;
                        var newLeft = startLeft + dx;
                        var newTop = startTop + dy;
                        
                        // 应用拖拽限位
                        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        if (settingsData.dragLimit !== false) {
                            var maxX = window.innerWidth - waifu.offsetWidth;
                            var maxY = window.innerHeight - waifu.offsetHeight;
                            newLeft = Math.max(0, Math.min(newLeft, maxX));
                            newTop = Math.max(0, Math.min(newTop, maxY));
                        }
                        
                        waifu.style.left = newLeft + 'px';
                        waifu.style.top = newTop + 'px';
                        waifu.style.right = 'auto';
                        waifu.style.bottom = 'auto';
                    },
                    mouseUp: function(e) {
                        if (!isDragging) return;
                        isDragging = false;
                        // 保存拖拽位置
                        var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        settingsData.draggedLeft = waifu.offsetLeft;
                        settingsData.draggedTop = waifu.offsetTop;
                        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
                    }
                };
                
                waifu._dragHandlers = handlers;
                waifu.addEventListener('mousedown', handlers.mouseDown);
                document.addEventListener('mousemove', handlers.mouseMove);
                document.addEventListener('mouseup', handlers.mouseUp);
                
                console.log('[Live2D NewTab] Drag enabled');
            } else {
                // 禁用拖拽 - 不再保存位置！只更新设置
                console.log('[Live2D NewTab] Drag disabled, NOT saving position');
                var settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settingsData.drag = false;
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settingsData));
            }
        }

        // 应用位置设置
        if (settings.position !== undefined) {
            var position = settings.position;
            waifu.style.left = '';
            waifu.style.right = '';
            waifu.style.top = '';
            waifu.style.bottom = '';

            // 如果有保存的拖拽位置，使用拖拽位置；否则使用预设位置
            if (settings.draggedLeft !== undefined && settings.draggedTop !== undefined) {
                waifu.style.left = settings.draggedLeft + 'px';
                waifu.style.top = settings.draggedTop + 'px';
                waifu.style.right = 'auto';
                waifu.style.bottom = 'auto';
            } else {
                if (position.includes('left')) {
                    waifu.style.left = '0';
                } else if (position.includes('right')) {
                    waifu.style.right = '0';
                }

                if (position.includes('top')) {
                    waifu.style.top = '0';
                } else if (position.includes('bottom')) {
                    waifu.style.bottom = '0';
                }
            }
        }
    }
    
    var sakanaWidgetInstance = null;
    var sakanaWidgetContainer = null;

    // 加载 Sakana Widget
    function loadSakanaWidget() {
        console.log('[Live2D NewTab] Loading Sakana Widget...');
        
        // 先卸载已存在的实例
        unloadSakanaWidget();
        
        // 从 storage 获取最新设置
        browserAPI.storage.local.get([
            'sakanaWidgetSize', 'sakanaWidgetDraggable', 'sakanaWidgetPositionSaved', 'sakanaWidgetPositionX', 'sakanaWidgetPositionY', 'sakanaWidgetEnabled'
        ], function(storageSettings) {
            console.log('[Live2D NewTab] Storage settings received:', storageSettings);
            var settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            
            // 合并 storage 设置到 localStorage（storage 优先）
            if (storageSettings.sakanaWidgetSize !== undefined) {
                settings.sakanaWidgetSize = storageSettings.sakanaWidgetSize;
            }
            if (storageSettings.sakanaWidgetDraggable !== undefined) {
                settings.sakanaWidgetDraggable = storageSettings.sakanaWidgetDraggable;
            }
            if (storageSettings.sakanaWidgetPositionSaved !== undefined) {
                settings.sakanaWidgetPositionSaved = storageSettings.sakanaWidgetPositionSaved;
            }
            if (storageSettings.sakanaWidgetPositionX !== undefined) {
                settings.sakanaWidgetPositionX = storageSettings.sakanaWidgetPositionX;
            }
            if (storageSettings.sakanaWidgetPositionY !== undefined) {
                settings.sakanaWidgetPositionY = storageSettings.sakanaWidgetPositionY;
            }
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
            
            var widgetSize = settings.sakanaWidgetSize || 120;
            // 当组件开启且没有设置过交互时，默认开启交互
            var draggable;
            if (settings.sakanaWidgetEnabled && settings.sakanaWidgetDraggable === undefined) {
                draggable = true;
            } else {
                draggable = settings.sakanaWidgetDraggable !== false;
            }
            var positionSaved = settings.sakanaWidgetPositionSaved || false;
            var posX = settings.sakanaWidgetPositionX;
            var posY = settings.sakanaWidgetPositionY;
            
            // 如果有保存过位置，使用保存的位置（不依赖于开关状态）
            var hasSavedPosition = (posX !== undefined && posY !== undefined);
            if (!hasSavedPosition) {
                posX = 20;
                posY = 20;
            }
            
            console.log('[Live2D NewTab] Sakana Widget position:', posX, posY, 'saved:', hasSavedPosition, 'dragEnabled:', positionSaved);
            
            // 添加 CSS
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = baseUrl + 'sakana-widget/lib/sakana.min.css';
            document.head.appendChild(link);
            
            // 添加容器
            sakanaWidgetContainer = document.createElement('div');
            sakanaWidgetContainer.id = 'sakana-widget-container';
            // 使用保存的位置（如果有）
            sakanaWidgetContainer.style.cssText = 'position: fixed; z-index: 10000;';
            if (hasSavedPosition) {
                sakanaWidgetContainer.style.right = 'auto';
                sakanaWidgetContainer.style.left = posX + 'px';
                sakanaWidgetContainer.style.top = posY + 'px';
            } else {
                sakanaWidgetContainer.style.right = '20px';
                sakanaWidgetContainer.style.top = '20px';
            }
            document.body.appendChild(sakanaWidgetContainer);
            
            // 添加脚本
            var script = document.createElement('script');
            script.src = baseUrl + 'sakana-widget/lib/sakana.min.js';
            script.onload = function() {
                // 短暂延迟确保 DOM 就绪
                setTimeout(function() {
                    console.log('[Live2D NewTab] Sakana Widget script loaded successfully');
                    // 检查容器是否还存在
                    var container = document.getElementById('sakana-widget-container');
                    if (!container) {
                        console.error('[Live2D NewTab] Sakana Widget container not found');
                        return;
                    }
                    // 初始化 Sakana Widget
                    if (window.SakanaWidget) {
                        sakanaWidgetInstance = new SakanaWidget({
                            size: widgetSize,
                            character: 'chisato',
                            controls: true,
                            rod: true,
                            draggable: draggable
                        });
                        sakanaWidgetInstance.mount('#sakana-widget-container');
                        
                        // 如果开启了位置保存功能，添加自定义拖拽
                        if (positionSaved) {
                            setupPositionSaveDrag();
                        }
                        
                        // 监听关闭按钮点击
                        setupSakanaCloseHandler();
                    }
                }, 50);
            };
            script.onerror = function(e) {
                console.error('[Live2D NewTab] Failed to load Sakana Widget:', e);
            };
            document.head.appendChild(script);
        });
    }

    // 设置位置保存的拖拽功能
    function setupPositionSaveDrag() {
        setTimeout(function() {
            var container = document.getElementById('sakana-widget-container');
            if (!container) return;
            
            var isDragging = false;
            var startX, startY, startLeft, startTop;
            
            container.style.cursor = 'move';
            container.addEventListener('mousedown', function(e) {
                if (e.target.closest('.sakana-widget-ctrl')) return;
                
                isDragging = true;
                startX = e.clientX;
                startY = e.clientY;
                var rect = container.getBoundingClientRect();
                startLeft = rect.left;
                startTop = rect.top;
                
                document.body.style.userSelect = 'none';
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', function(e) {
                if (!isDragging) return;
                
                var dx = e.clientX - startX;
                var dy = e.clientY - startY;
                
                var newLeft = startLeft + dx;
                var newTop = startTop + dy;
                
                // 边界检查
                newLeft = Math.max(0, newLeft);
                newTop = Math.max(0, newTop);
                newLeft = Math.min(window.innerWidth - 150, newLeft);
                newTop = Math.min(window.innerHeight - 150, newTop);
                
                container.style.right = 'auto';
                container.style.left = newLeft + 'px';
                container.style.top = newTop + 'px';
            });
            
            document.addEventListener('mouseup', function(e) {
                if (!isDragging) return;
                
                isDragging = false;
                document.body.style.userSelect = '';
                
                // 获取新位置
                var rect = container.getBoundingClientRect();
                var newX = rect.left;
                var newY = rect.top;
                
                // 保存位置
                browserAPI.storage.local.set({ 
                    sakanaWidgetPositionX: Math.round(newX), 
                    sakanaWidgetPositionY: Math.round(newY),
                    sakanaWidgetPositionSaved: true
                }, function() {
                    console.log('[Live2D NewTab] Sakana Widget position saved to storage:', newX, newY);
                });
                
                // 更新 localStorage
                var settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                settings.sakanaWidgetPositionX = Math.round(newX);
                settings.sakanaWidgetPositionY = Math.round(newY);
                settings.sakanaWidgetPositionSaved = true;
                localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
            });
        }, 500);
    }

    // 更新 Sakana Widget 位置
    function updateSakanaWidgetPosition(x, y) {
        var container = document.getElementById('sakana-widget-container');
        if (container) {
            // 始终使用 left/top 格式更新位置
            container.style.right = 'auto';
            container.style.left = x + 'px';
            container.style.top = y + 'px';
            console.log('[Live2D NewTab] Sakana Widget position updated to:', x, y);
        }
    }

    // 重置 Sakana Widget 位置
    function resetSakanaWidgetPosition() {
        // 清除保存的位置数据
        browserAPI.storage.local.remove(['sakanaWidgetPositionX', 'sakanaWidgetPositionY'], function() {
            browserAPI.storage.local.set({ sakanaWidgetPositionSaved: false }, function() {
                console.log('[Live2D NewTab] Sakana Widget position reset');
            });
        });
        
        var settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        // 删除保存的位置
        delete settings.sakanaWidgetPositionX;
        delete settings.sakanaWidgetPositionY;
        settings.sakanaWidgetPositionSaved = false;
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
        
        // 直接调用更新位置函数使用默认值
        updateSakanaWidgetPosition(20, 20);
    }

    // 设置关闭按钮处理
    function setupSakanaCloseHandler() {
        setTimeout(function() {
            var closeBtn = document.querySelector('.sakana-widget-ctrl-item:last-child');
            if (closeBtn) {
                var originalClick = closeBtn.onclick;
                closeBtn.onclick = function(e) {
                    e.stopPropagation();
                    console.log('[Live2D NewTab] Sakana Widget closed by user');
                    
                    // 同步到设置
                    browserAPI.storage.local.set({ sakanaWidgetEnabled: false }, function() {
                        console.log('[Live2D NewTab] Sakana Widget disabled in storage');
                    });
                    
                    // 更新 localStorage
                    var settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    settings.sakanaWidgetEnabled = false;
                    localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
                    
                    // 调用原始关闭逻辑
                    if (sakanaWidgetInstance && sakanaWidgetInstance.unmount) {
                        sakanaWidgetInstance.unmount();
                    }
                };
            }
        }, 500);
    }

    // 实时更新 Sakana Widget 大小
    function updateSakanaWidgetSize(newSize) {
        if (sakanaWidgetInstance && sakanaWidgetInstance._updateSize) {
            sakanaWidgetInstance._updateSize(newSize);
            console.log('[Live2D NewTab] Sakana Widget size updated to:', newSize);
        }
    }

    // 实时更新 Sakana Widget 拖拽状态
    function updateSakanaWidgetDraggable(draggable) {
        if (sakanaWidgetInstance && sakanaWidgetInstance._domImage) {
            if (draggable) {
                sakanaWidgetInstance._domImage.addEventListener('mousedown', sakanaWidgetInstance._onMouseDown);
                sakanaWidgetInstance._domImage.addEventListener('touchstart', sakanaWidgetInstance._onTouchStart);
                sakanaWidgetInstance._domImage.style.cursor = 'move';
            } else {
                sakanaWidgetInstance._domImage.removeEventListener('mousedown', sakanaWidgetInstance._onMouseDown);
                sakanaWidgetInstance._domImage.removeEventListener('touchstart', sakanaWidgetInstance._onTouchStart);
                sakanaWidgetInstance._domImage.style.cursor = 'default';
            }
            console.log('[Live2D NewTab] Sakana Widget draggable updated to:', draggable);
        }
    }

    // 卸载 Sakana Widget
    function unloadSakanaWidget() {
        console.log('[Live2D NewTab] Unloading Sakana Widget...');
        if (sakanaWidgetInstance && sakanaWidgetInstance.unmount) {
            sakanaWidgetInstance.unmount();
            sakanaWidgetInstance = null;
        }
        var container = document.getElementById('sakana-widget-container');
        if (container) {
            container.remove();
        }
    }

    // 监听看板娘加载完成事件
    function waitForWaifu(callback) {
        var checkCount = 0;
        var maxChecks = 100;
        var checkInterval = setInterval(function() {
            var waifu = document.getElementById('waifu');
            checkCount++;
            if (waifu) {
                clearInterval(checkInterval);
                callback(waifu);
            } else if (checkCount >= maxChecks) {
                clearInterval(checkInterval);
                console.log('[Live2D NewTab] Waifu not found after max checks');
            }
        }, 100);
    }

    // 从 storage 获取初始设置
    browserAPI.storage.local.get([
        'enabled', 'modelSource', 'cdnPath', 'drag', 'dragLimit', 'position', 'size',
        'localModel', 'cubism3Model', 'useCubism3', 'aiEnabled',
        'aiApiKey', 'siliconflowApiKey', 'univibeApiKey', 'longcatApiKey', 
        'qwenApiKey', 'hunyuanApiKey', 'ernieApiKey', 'doubaoApiKey',
        'sparkApiKey', 'zhipuApiKey', 'moonshotApiKey', 'minimaxApiKey',
        'aiProvider', 'aiConnected',
        'experimentalEnabled', 'mouseFeaturesEnabled', 'mouseCursorEnabled', 'clickEffectEnabled',
        'selectedCursor', 'mouseCursorSize',
        'sakanaWidgetEnabled'
    ], function(userConfig) {
        console.log('[Live2D NewTab] Initial settings loaded:', userConfig);

        if (userConfig.enabled === false) {
            console.log('[Live2D NewTab] Disabled by user');
            return;
        }

        // 先保存初始设置
        saveSettings(userConfig);

        // 启动 style observer 来阻止 autoload.js 覆盖我们的位置
        setupStyleObserver();

        // 加载 Sakana Widget（如果启用）
        if (userConfig.sakanaWidgetEnabled) {
            loadSakanaWidget();
        }

        // 加载 Live2D 脚本（根据是否使用 Cubism3 决定加载哪个脚本）
        var timestamp = Date.now();
        var script = document.createElement('script');
        
        // 从用户配置读取是否使用 Cubism3，新标签页默认使用Cubism3
        var currentUseCubism3 = userConfig.useCubism3 !== undefined ? userConfig.useCubism3 : true;
        
        // 根据 useCubism3 决定加载哪个脚本，和普通网页保持一致
        if (currentUseCubism3) {
            script.src = baseUrl + 'dist/autoload-cubism3.js?v=' + timestamp;
            console.log('[Live2D NewTab] Using Cubism3 renderer, loading autoload-cubism3.js');
        } else {
            script.src = baseUrl + 'dist/autoload.js?v=' + timestamp;
            console.log('[Live2D NewTab] Using Cubism2 renderer, loading autoload.js');
        }
        
        script.onload = function() {
            console.log('[Live2D NewTab] Live2D script loaded successfully');
            // 只调用几次 applyCustomStyles，避免过度频繁
            applyCustomStyles();
            waitForWaifu(function(waifu) {
                console.log('[Live2D NewTab] Waifu loaded, applying settings');
                var userConfig = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                applySettingsToWaifu(userConfig);
                setTimeout(applyCustomStyles, 500);
            });
        };
        script.onerror = function(e) {
            console.error('[Live2D NewTab] Failed to load Live2D script:', e);
        };
        document.head.appendChild(script);
    });

    // 监听浏览器扩展设置变化
    browserAPI.storage.onChanged.addListener(function(changes, areaName) {
        if (areaName !== 'local') return;

        console.log('[Live2D NewTab] Settings changed:', changes);

        // 处理 Sakana Widget 设置变化
        console.log('[Live2D NewTab] Sakana Widget enabled changed:', changes.sakanaWidgetEnabled);
        if (changes.sakanaWidgetEnabled) {
            if (changes.sakanaWidgetEnabled.newValue) {
                console.log('[Live2D NewTab] Loading Sakana Widget due to setting change');
                loadSakanaWidget();
            } else {
                console.log('[Live2D NewTab] Unloading Sakana Widget due to setting change');
                unloadSakanaWidget();
            }
        }
        
        // 实时更新 Sakana Widget 大小
        if (changes.sakanaWidgetSize) {
            updateSakanaWidgetSize(changes.sakanaWidgetSize.newValue);
        }
        
        // 实时更新 Sakana Widget 拖拽状态
        if (changes.sakanaWidgetDraggable) {
            updateSakanaWidgetDraggable(changes.sakanaWidgetDraggable.newValue);
        }
        
        // 实时更新 Sakana Widget 位置拖拽状态
        if (changes.sakanaWidgetPositionSaved) {
            if (changes.sakanaWidgetPositionSaved.newValue) {
                setupPositionSaveDrag();
            }
        }
        
        // 实时更新 Sakana Widget 位置
        if (changes.sakanaWidgetPositionX !== undefined || changes.sakanaWidgetPositionY !== undefined) {
            // 优先使用 changes 中的新值，否则使用 localStorage 的值
            var settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            var x = (changes.sakanaWidgetPositionX !== undefined ? changes.sakanaWidgetPositionX.newValue : settings.sakanaWidgetPositionX) || 20;
            var y = (changes.sakanaWidgetPositionY !== undefined ? changes.sakanaWidgetPositionY.newValue : settings.sakanaWidgetPositionY) || 20;
            updateSakanaWidgetPosition(x, y);
        }
        
        // 监听重置标记 - 只有点击"重置位置"按钮时才会设置这个标记
        if (changes.sakanaWidgetPositionReset !== undefined && changes.sakanaWidgetPositionReset.newValue === true) {
            updateSakanaWidgetPosition(20, 20);
            // 清除重置标记
            browserAPI.storage.local.set({ sakanaWidgetPositionReset: false });
            var settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            settings.sakanaWidgetPositionReset = false;
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
        }

        // 获取所有相关设置
        browserAPI.storage.local.get([
            'enabled', 'modelSource', 'cdnPath', 'drag', 'dragLimit', 'position', 'size',
            'localModel', 'cubism3Model', 'useCubism3', 'aiEnabled',
            'aiApiKey', 'siliconflowApiKey', 'univibeApiKey', 'longcatApiKey',
            'qwenApiKey', 'hunyuanApiKey', 'ernieApiKey', 'doubaoApiKey',
            'sparkApiKey', 'zhipuApiKey', 'moonshotApiKey', 'minimaxApiKey',
            'aiProvider', 'aiConnected',
            'experimentalEnabled', 'mouseFeaturesEnabled', 'mouseCursorEnabled', 'clickEffectEnabled',
            'selectedCursor', 'mouseCursorSize',
            'sakanaWidgetEnabled', 'sakanaWidgetDraggable', 'sakanaWidgetSize', 'sakanaWidgetPositionSaved', 'sakanaWidgetPositionX', 'sakanaWidgetPositionY'
        ], function(userConfig) {
            // 如果看板娘存在，直接应用设置
            var waifu = document.getElementById('waifu');
            if (waifu) {
                saveSettings(userConfig);
                applyCustomStyles(); // 应用自定义样式
                applySettingsToWaifu(userConfig);
            } else {
                // 如果看板娘还没加载，先保存设置
                saveSettings(userConfig);
                // 等待看板娘加载完成后再应用
                waitForWaifu(function() {
                    var latestConfig = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    applyCustomStyles();
                    applySettingsToWaifu(latestConfig);
                });
            }
        });
    });

    // 监听来自 content.js 的设置同步消息
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'live2d-settings-update') {
            console.log('[Live2D NewTab] Received settings update:', event.data);
            saveSettings(event.data.settings);
        }
    });

    console.log('[Live2D NewTab] Injector initialized');
})();
