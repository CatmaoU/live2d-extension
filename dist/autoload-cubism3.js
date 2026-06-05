(function() {
    console.log('[Live2D Cubism3] Loading with UI...');
    
    // 浏览器API兼容层：支持Chrome和Firefox
    const browserAPI = (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) ? browser : ((typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) ? chrome : null);
    
    // 防止重复初始化
    if (window.__live2d_cubism3_initialized) {
        console.log('[Live2D Cubism3] Already initialized, skipping');
        return;
    }
    window.__live2d_cubism3_initialized = true;
    
    // 成就相关变量
    let clickCount = 0;
    let lastClickTime = 0;
    const CLICK_THRESHOLD = 5; // 连续点击5次解锁成就
    const CLICK_WINDOW = 3000; // 3秒内的点击算连续点击
    let achievementShown = false;
    let currentModelName = ''; // 保存当前模型名称
    let currentMeowQuotes = []; // 保存喵言语录
    
    // 初始化时检查成就是否已解锁
    try {
        if (browserAPI.storage && browserAPI.storage.local) {
            browserAPI.storage.local.get(['live2d-achievement-unlocked'], (result) => {
                if (result['live2d-achievement-unlocked']) {
                    achievementShown = true;
                    console.log('[Live2D Achievement] Already unlocked, skipping');
                }
            });
        } else {
            const isUnlocked = localStorage.getItem('live2d-achievement-unlocked');
            if (isUnlocked) {
                achievementShown = true;
                console.log('[Live2D Achievement] Already unlocked (localStorage), skipping');
            }
        }
    } catch (e) {
        console.log('[Live2D Achievement] Init check failed', e);
    }
    
    // 自动触发一言相关变量
    let autoQuoteTimer = null;

    // 默认 hitokoto 列表（CSP 阻止时使用）
    const DEFAULT_HITOKOTO = [
        '\u4F60\u597D\u5440~',
        '\u5F88\u9AD8\u5174\u89C1\u5230\u4F60\uFF01',
        '\u4ECA\u5929\u8FC7\u5F97\u600E\u4E48\u6837\uFF1F',
        '\u6709\u4EC0\u4E48\u60F3\u804A\u7684\u5417\uFF1F',
        '\u55B5~',
        '(*^▽^*)',
        '\u6765\u804A\u5929\u5427~',
        '\u751F\u6D3B\u5982\u6B64\u7F8E\u597D~',
        '\u52A0\u6CB9\uFF01\u4F60\u53EF\u4EE5\u7684\uFF01'
    ];

    function getRandomHitokoto() {
        return DEFAULT_HITOKOTO[Math.floor(Math.random() * DEFAULT_HITOKOTO.length)];
    }

    function loadScript(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            
            try {
                if (window.trustedTypes && window.trustedTypes.createPolicy) {
                    let policy;
                    try {
                        policy = window.trustedTypes.getPolicy('live2d-script');
                    } catch (e) {
                        policy = window.trustedTypes.createPolicy('live2d-script', {
                            createScriptURL: (input) => input
                        });
                    }
                    script.src = policy.createScriptURL(url);
                } else {
                    script.src = url;
                }
            } catch (e) {
                console.log('[Live2D Cubism3] TrustedScriptURL not supported, using fallback');
                script.src = url;
            }
            
            script.onload = () => {
                console.log('[Live2D Cubism3] Loaded:', url);
                resolve();
            };
            script.onerror = (e) => {
                console.error('[Live2D Cubism3] Failed to load:', url, e);
                reject(e);
            };
            document.head.appendChild(script);
        });
    }

    class Live2DAI {
        constructor() {
            this.isInitialized = false;
            this.chatHistory = [];
            this.config = null;
            this.prompts = null;
            this.characters = null;
            this.settings = null;
            this.isConnected = false;
            this.needsSystemPrompt = true;
            this.reconnectInterval = null;
            this.reconnectAttempts = 0;
            this.onDisconnect = null;
            this.onReconnect = null;
        }

        async init(settings) {
            this.settings = settings;
            console.log('[Live2D AI] Initializing with settings:', settings);
            this.isInitialized = true;
            this.chatHistory = [];
            return true;
        }
        
        setCallbacks(onDisconnect, onReconnect) {
            this.onDisconnect = onDisconnect;
            this.onReconnect = onReconnect;
        }
        
        startReconnect() {
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
            }
            this.reconnectInterval = setInterval(async () => {
                if (!this.isConnected && this.settings?.aiEnabled) {
                    this.reconnectAttempts++;
                    console.log('[Live2D AI] 尝试重连... (第', this.reconnectAttempts, '次)');
                    
                    // 最多重试10次，避免无限重连
                    if (this.reconnectAttempts >= 10) {
                        console.log('[Live2D AI] 重连次数过多，停止重连。请检查模型选择或API配置。');
                        this.stopReconnect();
                        if (this.onDisconnect) {
                            this.onDisconnect();
                        }
                        return;
                    }
                    
                    await this.testConnection();
                }
            }, 5000);
        }
        
        stopReconnect() {
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            this.reconnectAttempts = 0;
        }
        
        async testConnection() {
            try {
                // 优先从本地文件读取配置
                const baseUrl = this.settings?.baseUrl || '';
                let localConfig = null;
                
                try {
                    const configRes = await fetch(baseUrl + 'live2d-ai/json/config.json');
                    if (configRes.ok) {
                        localConfig = await configRes.json();
                        console.log('[Live2D AI] testConnection: Loaded config from local file');
                    }
                } catch (e) {
                    console.log('[Live2D AI] testConnection: Failed to load local config:', e);
                }
                
                // 获取最新设置
                let latestSettings = {};
                try {
                    latestSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                } catch (e) {
                    console.log('[Live2D AI] localStorage 读取失败:', e);
                }
                
                // 等待设置同步
                const syncedSettings = await this.waitForSettings(3000);
                Object.assign(latestSettings, syncedSettings);
                
                // 确定提供商：优先使用用户设置，其次使用本地配置
                let provider = 'deepseek';
                if (latestSettings.aiProvider) {
                    provider = latestSettings.aiProvider;
                    console.log('[Live2D AI] Using provider from settings:', provider);
                } else if (localConfig?.defaultProvider) {
                    provider = localConfig.defaultProvider;
                    console.log('[Live2D AI] Using provider from local config:', provider);
                }
                
                // 获取 API Key：优先从本地配置文件，其次从设置
                let apiKey = '';
                const providerConfig = localConfig?.api?.[provider];
                if (providerConfig?.apiKey) {
                    apiKey = providerConfig.apiKey;
                } else {
                    const apiKeyMap = {
                        'deepseek': latestSettings.aiApiKey,
                        'siliconflow': latestSettings.siliconflowApiKey,
                        'univibe': latestSettings.univibeApiKey,
                        'longcat': latestSettings.longcatApiKey,
                        'qwen': latestSettings.qwenApiKey,
                        'hunyuan': latestSettings.hunyuanApiKey,
                        'ernie': latestSettings.ernieApiKey,
                        'doubao': latestSettings.doubaoApiKey,
                        'spark': latestSettings.sparkApiKey,
                        'zhipu': latestSettings.zhipuApiKey,
                        'moonshot': latestSettings.moonshotApiKey,
                        'minimax': latestSettings.minimaxApiKey,
                        'atri': latestSettings.atriApiKey
                    };
                    apiKey = apiKeyMap[provider] || '';
                }
                
                if (!apiKey) {
                    return false;
                }
                
                // 获取端点和模型
                let endpoint = '';
                let model = '';
                
                // 定义默认配置
                const defaults = {
                    'deepseek': { endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
                    'siliconflow': { endpoint: 'https://api.siliconflow.cn/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V3' },
                    'univibe': { endpoint: 'https://api.univibe.cc/v1/chat/completions', model: 'gpt-4' },
                    'longcat': { endpoint: 'https://api.longcat.chat/openai/v1/chat/completions', model: 'LongCat-Flash-Chat' },
                    'qwen': { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
                    'hunyuan': { endpoint: 'https://tokenhub.tencentmaas.com/v1/chat/completions', model: 'deepseek-v4-pro' },
                    'ernie': { endpoint: 'https://qianfan.baidubce.com/v2/chat/completions', model: 'ernie-4.0-8k-latest' },
                    'doubao': { endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
                    'spark': { endpoint: 'https://spark-api.xf-yun.com/v3.1/chat', model: 'generalv3' },
                    'zhipu': { endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4' },
                    'moonshot': { endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
                    'minimax': { endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'MiniMax-Text-01' },
                    'atri': { endpoint: 'https://ai.zkmjnic.tech/v1/chat/completions', model: 'gpt-5.4' }
                };
                
                // 优先从本地配置获取端点
                if (providerConfig) {
                    endpoint = providerConfig.endpoint || '';
                }
                
                // 如果本地配置没有端点，使用默认端点
                if (!endpoint) {
                    const defaultConfig = defaults[provider];
                    if (defaultConfig) {
                        endpoint = defaultConfig.endpoint;
                    } else {
                        endpoint = 'https://api.deepseek.com/v1/chat/completions';
                    }
                }
                
                // 优先从设置中获取用户选择的模型
                const modelSettingKey = `${provider}Model`;
                if (latestSettings[modelSettingKey]) {
                    model = latestSettings[modelSettingKey];
                    console.log('[Live2D AI] Using model from settings:', model);
                } else if (providerConfig?.model) {
                    // 其次从本地配置文件获取
                    model = providerConfig.model;
                } else {
                    // 最后使用默认模型
                    const defaultConfig = defaults[provider];
                    model = defaultConfig ? defaultConfig.model : 'deepseek-chat';
                }
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: 'ping' }],
                        max_tokens: 1
                    })
                });
                
                if (response.ok) {
                    if (!this.isConnected) {
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        console.log('[Live2D AI] 重连成功！');
                        if (this.onReconnect) {
                            this.onReconnect();
                        }
                    }
                    return true;
                }
                return false;
            } catch (e) {
                console.error('[Live2D AI] 连接测试失败:', e);
                return false;
            }
        }
        
        async disconnect() {
            this.isConnected = false;
            this.stopReconnect();
            console.log('[Live2D AI] 已断开连接');
        }

        async waitForSettings(timeout = 3000) {
            const start = Date.now();
            console.log('[Live2D AI] Waiting for settings...');
            return new Promise((resolve) => {
                const checkSettings = () => {
                    const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    if (settings.aiEnabled !== undefined) {
                        resolve(settings);
                    } else if (Date.now() - start > timeout) {
                        resolve(settings);
                    } else {
                        setTimeout(checkSettings, 200);
                    }
                };
                checkSettings();
            });
        }
        
        async getAIResponse(userMessage, systemPrompt = "你是一个友好的AI助手") {
            try {
                console.log('[Live2D AI] Getting AI response for:', userMessage);
                
                // 先从 live2d-ai/settings.json 读取配置模板
                // 优先从本地文件读取配置
                const baseUrl = this.settings?.baseUrl || '';
                
                let localConfig = null;
                let localPrompts = null;
                
                // 读取本地配置文件
                try {
                    const configRes = await fetch(baseUrl + 'live2d-ai/json/config.json');
                    if (configRes.ok) {
                        localConfig = await configRes.json();
                        console.log('[Live2D AI] Loaded config from live2d-ai/json/config.json');
                    }
                } catch (e) {
                    console.log('[Live2D AI] Failed to load live2d-ai/json/config.json:', e);
                }
                
                // 读取本地提示词文件
                try {
                    const promptsRes = await fetch(baseUrl + 'live2d-ai/json/prompts.json');
                    if (promptsRes.ok) {
                        localPrompts = await promptsRes.json();
                        console.log('[Live2D AI] Loaded prompts from live2d-ai/json/prompts.json');
                    }
                } catch (e) {
                    console.log('[Live2D AI] Failed to load live2d-ai/json/prompts.json:', e);
                }
                
                // 从本地文件或 browser.storage 获取设置
                let latestSettings = {};
                try {
                    latestSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                } catch (e) {
                    console.log('[Live2D AI] localStorage 读取失败:', e);
                }
                
                // 等待设置同步
                const syncedSettings = await this.waitForSettings(3000);
                Object.assign(latestSettings, syncedSettings);
                
                // 确定提供商：优先使用用户设置，其次使用本地配置
                let provider = 'deepseek';
                if (latestSettings.aiProvider) {
                    provider = latestSettings.aiProvider;
                    console.log('[Live2D AI] Using provider from settings:', provider);
                } else if (localConfig?.defaultProvider) {
                    provider = localConfig.defaultProvider;
                    console.log('[Live2D AI] Using provider from local config:', provider);
                }
                
                // 获取 API Key：优先从本地配置文件，其次从设置
                let apiKey = '';
                const providerConfig = localConfig?.api?.[provider];
                if (providerConfig?.apiKey) {
                    apiKey = providerConfig.apiKey;
                } else {
                    // 从设置中获取对应的 API Key
                    const apiKeyMap = {
                        'deepseek': latestSettings.aiApiKey,
                        'siliconflow': latestSettings.siliconflowApiKey,
                        'univibe': latestSettings.univibeApiKey,
                        'longcat': latestSettings.longcatApiKey,
                        'qwen': latestSettings.qwenApiKey,
                        'hunyuan': latestSettings.hunyuanApiKey,
                        'ernie': latestSettings.ernieApiKey,
                        'doubao': latestSettings.doubaoApiKey,
                        'spark': latestSettings.sparkApiKey,
                        'zhipu': latestSettings.zhipuApiKey,
                        'moonshot': latestSettings.moonshotApiKey,
                        'minimax': latestSettings.minimaxApiKey,
                        'atri': latestSettings.atriApiKey
                    };
                    apiKey = apiKeyMap[provider] || '';
                }
                
                // 获取端点和模型
                let endpoint = '';
                let model = '';
                
                // 定义默认配置
                const defaults = {
                    'deepseek': { endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
                    'siliconflow': { endpoint: 'https://api.siliconflow.cn/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V3' },
                    'univibe': { endpoint: 'https://api.univibe.cc/v1/chat/completions', model: 'gpt-4' },
                    'longcat': { endpoint: 'https://api.longcat.chat/openai/v1/chat/completions', model: 'LongCat-Flash-Chat' },
                    'qwen': { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
                    'hunyuan': { endpoint: 'https://tokenhub.tencentmaas.com/v1/chat/completions', model: 'deepseek-v4-pro' },
                    'ernie': { endpoint: 'https://qianfan.baidubce.com/v2/chat/completions', model: 'ernie-4.0-8k-latest' },
                    'doubao': { endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
                    'spark': { endpoint: 'https://spark-api.xf-yun.com/v3.1/chat', model: 'generalv3' },
                    'zhipu': { endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4' },
                    'moonshot': { endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
                    'minimax': { endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'MiniMax-Text-01' },
                    'atri': { endpoint: 'https://ai.zkmjnic.tech/v1/chat/completions', model: 'gpt-5.4' }
                };
                
                // 优先从本地配置获取端点
                if (providerConfig) {
                    endpoint = providerConfig.endpoint || '';
                }
                
                // 如果本地配置没有端点，使用默认端点
                if (!endpoint) {
                    const defaultConfig = defaults[provider];
                    if (defaultConfig) {
                        endpoint = defaultConfig.endpoint;
                    } else {
                        endpoint = 'https://api.deepseek.com/v1/chat/completions';
                    }
                }
                
                // 优先从设置中获取用户选择的模型
                const modelSettingKey = `${provider}Model`;
                if (latestSettings[modelSettingKey]) {
                    model = latestSettings[modelSettingKey];
                    console.log('[Live2D AI] Using model from settings:', model);
                } else if (providerConfig?.model) {
                    // 其次从本地配置文件获取
                    model = providerConfig.model;
                } else {
                    // 最后使用默认模型
                    const defaultConfig = defaults[provider];
                    model = defaultConfig ? defaultConfig.model : 'deepseek-chat';
                }
                
                console.log('[Live2D AI] Provider:', provider);
                console.log('[Live2D AI] Endpoint:', endpoint);
                console.log('[Live2D AI] Model:', model);
                console.log('[Live2D AI] Has API Key:', apiKey ? 'Yes (from ' + (localConfig?.api?.[provider]?.apiKey ? 'local file' : 'storage') + ')' : 'No');
                
                if (!apiKey) {
                    throw new Error('请先在设置中配置 API Key');
                }

                // 获取角色信息：优先从本地 prompts.json，其次从设置
                let characterName = '';
                let characterLikes = '';
                let characterRelation = '';
                let characterProfile = '';
                let characterLimit = '';
                
                if (localPrompts?.templates?.[0]?.system_prompt) {
                    // 从本地 prompts.json 读取
                    const template = localPrompts.templates[0];
                    console.log('[Live2D AI] Using character from prompts.json:', template.name || '未命名');
                } else {
                    // 从设置中读取
                    characterName = latestSettings.characterName || '';
                    characterLikes = latestSettings.characterLikes || '';
                    characterRelation = latestSettings.characterRelation || '';
                    characterProfile = latestSettings.characterProfile || '';
                    characterLimit = latestSettings.characterLimit || '';
                }
                
                console.log('[Live2D AI] Character info:', { characterName, characterLikes, characterRelation, characterProfile, characterLimit });
                
                let systemPromptToUse = systemPrompt;
                
                // 确定使用哪个提示词
                if (localPrompts?.templates?.[0]?.system_prompt) {
                    // 优先使用本地 prompts.json 的提示词
                    systemPromptToUse = localPrompts.templates[0].system_prompt;
                    console.log('[Live2D AI] Using system prompt from prompts.json');
                } else if (characterName || characterProfile) {
                    // 使用设置中的角色信息构建提示词
                    let characterPrompt = '';
                    
                    if (characterName) {
                        characterPrompt += `你的名字是 ${characterName}。\n`;
                    }
                    
                    if (characterRelation) {
                        characterPrompt += `你与用户的关系是 ${characterRelation}。\n`;
                    }
                    
                    if (characterLikes) {
                        characterPrompt += `你喜欢 ${characterLikes}。\n`;
                    }
                    
                    if (characterProfile) {
                        characterPrompt += `\n角色设定：\n${characterProfile}\n`;
                    }
                    
                    if (characterLimit) {
                        characterPrompt += `\n限制：\n${characterLimit}\n`;
                    }
                    
                    characterPrompt += '\n【重要】回复规则：\n- 禁止使用任何 emoji 图案表情（如😊、❤️、✨等）\n- 允许使用颜文字表达情绪（如 (´▽｀)、(*^▽^*)、_(:з」∠)_ 等）\n- 用友好、可爱的方式回复用户。';
                    
                    systemPromptToUse = characterPrompt;
                    console.log('[Live2D AI] Using character prompt from settings');
                }

                this.chatHistory.push({ role: 'user', content: userMessage });
                if (this.chatHistory.length > 20) {
                    this.chatHistory = this.chatHistory.slice(-20);
                }

                let messages = [];
                
                // 第一次连接或重新连接时发送完整的角色设定
                if (!this.isConnected || this.needsSystemPrompt) {
                    messages = [
                        { role: 'system', content: systemPromptToUse },
                        ...this.chatHistory
                    ];
                    this.isConnected = true;
                    this.needsSystemPrompt = false;
                    console.log('[Live2D AI] Sending request with full character settings');
                } else {
                    // 后续消息只发送对话历史，不重复发送角色设定
                    messages = [
                        ...this.chatHistory.slice(-10) // 只发送最近10条消息
                    ];
                    console.log('[Live2D AI] Sending request without system prompt (token saving mode)');
                }

                const requestBody = {
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000
                };

                console.log('[Live2D AI] Sending request to:', endpoint);
                
                const options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(requestBody)
                };
                
                // Try to use background proxy first to bypass CORS
                let data;
                let proxySuccess = false;
                
                try {
                    console.log('[Live2D AI] Trying to use CustomEvent proxy bridge...');
                    
                    // 通过 CustomEvent 桥接将请求发给 content.js → background
                    // （因为本脚本是注入的，在页面上下文，无法直接访问 chrome.runtime）
                    const requestId = 'fetch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                    
                    const proxyResult = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            window.removeEventListener('live2dFetchProxyResult', handler);
                            reject(new Error('Proxy request timeout'));
                        }, 30000);
                        
                        function handler(e) {
                            const d = e.detail || {};
                            if (d.requestId === requestId) {
                                clearTimeout(timeout);
                                window.removeEventListener('live2dFetchProxyResult', handler);
                                if (d.success) {
                                    resolve(d.data);
                                } else {
                                    reject(new Error(d.error || 'Unknown proxy error'));
                                }
                            }
                        }
                        
                        window.addEventListener('live2dFetchProxyResult', handler);
                        window.dispatchEvent(new CustomEvent('live2dFetchProxy', {
                            detail: { requestId, url: endpoint, options }
                        }));
                    });
                    
                    data = proxyResult;
                    proxySuccess = true;
                    console.log('[Live2D AI] Request via CustomEvent proxy succeeded');
                } catch (proxyError) {
                    console.log('[Live2D AI] Proxy failed, falling back to direct fetch:', proxyError);
                    
                    // 检测 Extension context invalidated 错误
                    const isContextInvalid = proxyError && 
                        (proxyError.message && proxyError.message.includes('Extension context invalidated') ||
                         proxyError.message && proxyError.message.includes('Could not establish connection'));
                    
                    if (isContextInvalid) {
                        console.log('[Live2D AI] 检测到扩展上下文失效，直接使用fetch');
                    }
                    
                    // Fallback to direct fetch
                    const response = await fetch(endpoint, options);
                    if (!response.ok) {
                        const errorText = await response.text();
                        // 标记断开连接并触发重连
                        if (this.isConnected) {
                            this.isConnected = false;
                            this.needsSystemPrompt = true; // 重连时需要重新发送角色设定
                            console.log('[Live2D AI] 连接断开，开始自动重连...');
                            if (this.onDisconnect) {
                                this.onDisconnect();
                            }
                            this.startReconnect();
                        }
                        throw new Error(`API请求失败: ${response.status} ${errorText}喵~`);
                    }
                    data = await response.json();
                }
                let aiText = data.choices[0].message.content;
                aiText = aiText.trim();
                
                this.chatHistory.push({ role: 'assistant', content: aiText });
                console.log('[Live2D AI] AI response:', aiText);
                return aiText;
            } catch (error) {
                console.error('[Live2D AI] Error:', error);
                
                // 出错时自动断开连接
                if (this.isConnected) {
                    this.isConnected = false;
                    this.needsSystemPrompt = true;
                    console.log('[Live2D AI] 连接断开（出错）');
                    
                    // 判断错误类型，设置错误消息
                    let errorMessage = error.message || '';
                    let disconnectReason = 'API调用失败喵~';
                    
                    // 检测CORS错误
                    if (errorMessage.includes('Failed to fetch') || 
                        errorMessage.includes('CORS') ||
                        errorMessage.includes('Access-Control')) {
                        disconnectReason = '运营商不让我们连接喵~';
                    }
                    
                    // 替换错误消息
                    error.message = disconnectReason;
                    
                    // 调用 onDisconnect 回调，让回调处理存储更新和提示
                    if (this.onDisconnect) {
                        this.onDisconnect();
                    }
                }
                
                throw error;
            }
        }

        // 判断用户消息是否为「总结当前页面」的意图
        async classifyIntent(userMessage) {
            console.log('[Live2D AI] classifyIntent checking:', userMessage);
            try {
                // 复用 getAIResponse 的提供商配置逻辑
                const baseUrl = this.settings?.baseUrl || '';
                let localConfig = null;
                try {
                    const configRes = await fetch(baseUrl + 'live2d-ai/json/config.json');
                    if (configRes.ok) localConfig = await configRes.json();
                } catch (e) {}

                let latestSettings = {};
                try { latestSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}'); } catch(e) {}
                const syncedSettings = await this.waitForSettings(3000);
                Object.assign(latestSettings, syncedSettings);

                let provider = 'deepseek';
                if (latestSettings.aiProvider) provider = latestSettings.aiProvider;

                let apiKey = '';
                const providerConfig = localConfig?.api?.[provider];
                if (providerConfig?.apiKey) {
                    apiKey = providerConfig.apiKey;
                } else {
                    const keyMap = {
                        'deepseek': latestSettings.aiApiKey, 'siliconflow': latestSettings.siliconflowApiKey,
                        'univibe': latestSettings.univibeApiKey, 'longcat': latestSettings.longcatApiKey,
                        'qwen': latestSettings.qwenApiKey, 'hunyuan': latestSettings.hunyuanApiKey,
                        'ernie': latestSettings.ernieApiKey, 'doubao': latestSettings.doubaoApiKey,
                        'spark': latestSettings.sparkApiKey, 'zhipu': latestSettings.zhipuApiKey,
                        'moonshot': latestSettings.moonshotApiKey, 'minimax': latestSettings.minimaxApiKey,
                        'atri': latestSettings.atriApiKey
                    };
                    apiKey = keyMap[provider] || '';
                }
                if (!apiKey) { console.log('[Live2D AI] classifyIntent: no API key'); return false; }

                // 获取端点和模型（复用 getAIResponse 的默认配置）
                const defaults = {
                    'deepseek': { endpoint: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
                    'siliconflow': { endpoint: 'https://api.siliconflow.cn/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V3' },
                    'univibe': { endpoint: 'https://api.univibe.cc/v1/chat/completions', model: 'gpt-4' },
                    'longcat': { endpoint: 'https://api.longcat.chat/openai/v1/chat/completions', model: 'LongCat-Flash-Chat' },
                    'qwen': { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
                    'hunyuan': { endpoint: 'https://tokenhub.tencentmaas.com/v1/chat/completions', model: 'deepseek-v4-pro' },
                    'ernie': { endpoint: 'https://qianfan.baidubce.com/v2/chat/completions', model: 'ernie-4.0-8k-latest' },
                    'doubao': { endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', model: 'doubao-pro-32k' },
                    'spark': { endpoint: 'https://spark-api.xf-yun.com/v3.1/chat', model: 'generalv3' },
                    'zhipu': { endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4' },
                    'moonshot': { endpoint: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
                    'minimax': { endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'MiniMax-Text-01' },
                    'atri': { endpoint: 'https://ai.zkmjnic.tech/v1/chat/completions', model: 'gpt-5.4' }
                };
                const cfg = defaults[provider] || defaults['deepseek'];
                const modelSettingKey = provider + 'Model';
                const model = latestSettings[modelSettingKey] || cfg.model;
                const endpoint = cfg.endpoint;

                const body = JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: '你是一个意图分类器。判断用户的消息是否想让AI总结当前网页的内容。包含总结、摘要、归纳、这篇文章讲了什么、页面内容、网页要点等意图都算。只回答一个字：是 或 否。' },
                        { role: 'user', content: userMessage }
                    ],
                    temperature: 0.1,
                    max_tokens: 50
                });

                const options = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                    body: body
                };

                // 始终通过 CustomEvent 桥接（兼容 CSP 严格页面如 GitHub）
                const requestId = 'cls_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                let data;
                try {
                    data = await new Promise((resolve, reject) => {
                        const tid = setTimeout(function() { reject(new Error('timeout')); }, 15000);
                        function handler(e) {
                            const d = e.detail || {};
                            if (d.requestId === requestId) {
                                clearTimeout(tid);
                                window.removeEventListener('live2dFetchProxyResult', handler);
                                if (d.success) resolve(d.data);
                                else reject(new Error(d.error));
                            }
                        }
                        window.addEventListener('live2dFetchProxyResult', handler);
                        window.dispatchEvent(new CustomEvent('live2dFetchProxy', {
                            detail: { requestId: requestId, url: endpoint, options: options }
                        }));
                    });
                } catch (e) {
                    console.log('[Live2D AI] classifyIntent request failed:', e);
                    // Fallback: keyword heuristic
                    return isSummaryKeyword(userMessage);
                }

                const answer = ((data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '').trim();
                console.log('[Live2D AI] classifyIntent result:', JSON.stringify(answer));
                if (answer === '是' || answer.includes('是')) return true;
                // Fallback: keyword heuristic when API returns unclear
                return isSummaryKeyword(userMessage);
            } catch (e) {
                console.log('[Live2D AI] classifyIntent error:', e);
                return false;
            }
        }

        clearHistory() {
            this.chatHistory = [];
            console.log('[Live2D AI] Chat history cleared');
        }
    }

    window.Live2DAI = new Live2DAI();

    function isDarkMode() {
        // 优先检查用户手动设置的主题
        const manualTheme = localStorage.getItem('live2d-manual-theme');
        if (manualTheme === 'dark') return true;
        if (manualTheme === 'light') return false;
        // 如果没有手动设置，使用系统主题
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function toggleTheme() {
        const currentIsDark = isDarkMode();
        const newTheme = currentIsDark ? 'light' : 'dark';
        localStorage.setItem('live2d-manual-theme', newTheme);
        console.log('[Live2D Cubism3] Theme toggled to:', newTheme);
        
        // 重新初始化以应用新主题
        window.__live2d_cubism3_initialized = false;
        const waifu = document.getElementById('waifu');
        if (waifu) waifu.remove();
        const style = document.getElementById('live2d-cubism3-styles');
        if (style) style.remove();
        setTimeout(initCubism3, 100);
    }

    function getThemeColors() {
        const isDark = isDarkMode();
        return {
            bubbleBg: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.75)',
            bubbleText: isDark ? '#000' : '#fff',
            buttonBg: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            buttonHoverBg: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)',
            buttonIcon: isDark ? '#000' : '#fff',
            inputBorder: isDark ? '#555' : '#ddd'
        };
    }

    function injectStyles() {
        const oldStyle = document.getElementById('live2d-cubism3-styles');
        if (oldStyle) oldStyle.remove();

        const colors = getThemeColors();
        const style = document.createElement('style');
        style.id = 'live2d-cubism3-styles';
        style.textContent = `
            #waifu{
                position:fixed;
                z-index:99999;
                width:450px;
                height:450px;
                /* 确保子元素absolute定位是相对于这个容器 */
            }
            #live2d{
                width:450px;
                height:450px;
            }
            #waifu-tips{
                position:absolute !important;
                top:auto !important;
                right:auto !important;
                bottom:100% !important;
                left:50% !important;
                transform:translateX(-50%) !important;
                margin-bottom:-130px !important;
                width:200px;
                padding:8px 10px;
                background:${colors.bubbleBg};
                color:${colors.bubbleText};
                border-radius:8px;
                font-size:12px;
                line-height:1.5;
                opacity:0;
                transition:opacity 0.3s;
                pointer-events:none;
                max-width:250px;
                word-break:break-all;
                text-align:center;
                z-index:100000;
            }
            #waifu-tips.waifu-tips-active{
                opacity:1;
            }
            #waifu-tips.waifu-tips-image{
                width:auto !important;
                max-width:420px !important;
                height:auto !important;
                padding:8px !important;
                min-height:60px;
            }
            #waifu-tips.waifu-tips-image img{
                opacity:0;
                transition:opacity 0.3s ease;
            }
            #waifu-buttons{
                position:absolute;
                display:flex;
                flex-direction:row;
                gap:5px;
                z-index:100000;
            }
            .waifu-btn{
                width:28px;
                height:28px;
                background:${colors.buttonBg};
                border:none;
                border-radius:50%;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                transition:opacity 0.3s, background 0.3s;
                opacity:0;
            }
            .waifu-btn:hover{
                background:${colors.buttonHoverBg};
            }
            .waifu-btn svg{
                width:16px;
                height:16px;
                fill:${colors.buttonIcon};
            }
            #waifu:hover .waifu-btn,
            #waifu-buttons:hover .waifu-btn{
                opacity:1;
            }
            #waifu-chat{
                position:absolute;
                display:flex;
                gap:5px;
                z-index:100000;
            }
            #waifu-chat input{
                width:150px;
                padding:6px 10px;
                border:1px solid ${colors.inputBorder};
                border-radius:15px;
                font-size:12px;
                outline:none;
                opacity:0;
                transition:opacity 0.3s;
                background:${colors.bubbleBg};
                color:${colors.bubbleText};
            }
            #waifu-chat input:focus{
                border-color:#fa0;
            }
            #waifu:hover #waifu-chat input,
            #waifu-chat:hover input,
            #waifu-chat input:focus,
            #waifu-chat.has-focus input{
                opacity:1;
            }
            #waifu-chat .chat-send{
                width:28px;
                height:28px;
                background:#fa0;
                border:none;
                border-radius:50%;
                cursor:pointer;
                display:flex;
                align-items:center;
                justify-content:center;
                opacity:0;
                transition:opacity 0.3s;
            }
            #waifu:hover #waifu-chat .chat-send,
            #waifu-chat:hover .chat-send,
            #waifu-chat.has-focus .chat-send{
                opacity:1;
            }
            #waifu-chat .chat-send svg{
                width:14px;
                height:14px;
                fill:#fff;
            }
            /* Alt 按住时隐藏按钮和输入框 */
            .waifu-alt-hide #waifu-buttons,
            .waifu-alt-hide #waifu-chat {
                display:none !important;
            }
        `;
        document.head.appendChild(style);
        
        // Alt 键 + 鼠标移到模型上 → 隐藏按钮和输入框
        var _altPressed = false, _altHover = false;
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Alt' && !_altPressed) {
                _altPressed = true;
                var w = document.getElementById('waifu');
                var isOver = w && w.matches(':hover');
                if (isOver) {
                    _altHover = true;
                    if (w) w.classList.add('waifu-alt-hide');
                } else {
                    _altHover = false;
                }
            }
        });
        document.addEventListener('keyup', function(e) {
            if (e.key === 'Alt') {
                _altPressed = false;
                _altHover = false;
                var w = document.getElementById('waifu');
                if (w) w.classList.remove('waifu-alt-hide');
            }
        });
        window.addEventListener('blur', function() {
            if (_altPressed || _altHover) {
                _altPressed = false; _altHover = false;
                var w = document.getElementById('waifu');
                if (w) w.classList.remove('waifu-alt-hide');
            }
        });
        // 鼠标进入/离开模型区域
        document.addEventListener('mouseover', function(e) {
            var w = document.getElementById('waifu');
            var isOver = w && (w === e.target || w.contains(e.target));
            if (_altPressed && isOver && !_altHover) {
                _altHover = true;
                if (w) w.classList.add('waifu-alt-hide');
            } else if (_altHover && !isOver) {
                _altHover = false;
                if (w) w.classList.remove('waifu-alt-hide');
            }
        });
    }

    async function fetchHitokoto() {
        try {
            const res = await fetch('https://v1.hitokoto.cn/');
            const data = await res.json();
            return data.hitokoto || getRandomHitokoto();
        } catch (e) {
            console.log('[Live2D Cubism3] Hitokoto fetch failed, using default:', e);
            return getRandomHitokoto();
        }
    }

    function addMeowSuffix(text) {
        if (!text) return text;
        
        // 检测是否为英语（大部分字符是英文字母或数字）
        function isEnglish(str) {
            if (!str) return false;
            let englishCount = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || 
                    (char >= '0' && char <= '9') || 
                    [' ', ',', '.', '!', '?', ';', ':', '"', "'", '-', '_'].includes(char)) {
                    englishCount++;
                }
            }
            return englishCount / str.length > 0.5;
        }
        
        // 检测是否为日语（必须包含平假名或片假名）
        function isJapanese(str) {
            if (!str) return false;
            let hasKana = false;
            for (let i = 0; i < str.length; i++) {
                const char = str[i];
                const code = char.charCodeAt(0);
                // 平假名或片假名
                if ((code >= 0x3040 && code <= 0x309F) ||  // 平假名
                    (code >= 0x30A0 && code <= 0x30FF)) {  // 片假名
                    hasKana = true;
                    break;
                }
            }
            return hasKana;
        }
        
        const isEnglishText = isEnglish(text);
        const isJapaneseText = isJapanese(text);
        const lastChar = text[text.length - 1];
        const exclamationEndings = ['！', '!', '？', '?'];
        const periodEndings = ['。', '.', '；', ';', '…', '...'];
        
        function getSuffix(isQuestion, isExclamation) {
            if (isJapaneseText) {
                if (isQuestion) return 'ニャ？';
                if (isExclamation) return 'ニャ！';
                return 'ニャ～';
            } else if (isEnglishText) {
                if (isQuestion) return ' nyan?';
                if (isExclamation) return ' nyan!';
                return ' nyan~';
            } else {
                if (isQuestion) return '喵？';
                if (isExclamation) return '喵！';
                return '喵~';
            }
        }
        
        if (exclamationEndings.includes(lastChar)) {
            const isQuestion = ['？', '?'].includes(lastChar);
            return text + getSuffix(isQuestion, !isQuestion);
        } else if (periodEndings.includes(lastChar)) {
            return text + getSuffix(false, false);
        } else {
            // 没有标点或其他结尾
            if (isJapaneseText) return text + 'ニャ';
            if (isEnglishText) return text + ' nyan';
            return text + '喵';
        }
    }
    
    // 显示成就解锁弹窗
    function showAchievementNotification() {
        // 检查是否已经存在成就弹窗
        if (document.getElementById('live2d-achievement-notification')) {
            console.log('[Live2D Achievement] Notification already exists, skipping');
            return;
        }
        
        const notification = document.createElement('div');
        notification.id = 'live2d-achievement-notification';
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(135deg, rgba(255, 215, 0, 0.95) 0%, rgba(255, 165, 0, 0.95) 100%);
            color: #2d1810;
            padding: 28px 45px;
            border-radius: 20px;
            z-index: 999999;
            box-shadow: 
                0 0 60px rgba(255, 215, 0, 0.4),
                0 10px 40px rgba(0, 0, 0, 0.25),
                inset 0 1px 0 rgba(255, 255, 255, 0.6);
            text-align: center;
            border: 2px solid rgba(255, 230, 150, 0.8);
            animation: achievementFadeIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            min-width: 260px;
        `;
        notification.innerHTML = `
            <div style="font-size: 50px; margin-bottom: 15px; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);">🏆</div>
            <div style="font-size: 28px; font-weight: 800; margin-bottom: 8px; letter-spacing: 2px; text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);">解锁成就</div>
            <div style="font-size: 22px; font-weight: 500; opacity: 0.9; letter-spacing: 1px;">喵言喵语喵！</div>
            <div style="margin-top: 12px; font-size: 13px; opacity: 0.7;">(✧ω✧)</div>
        `;
        
        // 添加动画样式
        const style = document.createElement('style');
        style.id = 'live2d-achievement-style';
        style.textContent = `
            @keyframes achievementFadeIn {
                from { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.6) rotate(-5deg); 
                }
                to { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1) rotate(0deg); 
                }
            }
            @keyframes achievementFadeOut {
                from { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) scale(1); 
                }
                to { 
                    opacity: 0; 
                    transform: translate(-50%, -50%) scale(0.8); 
                }
            }
            #live2d-achievement-notification.fade-out {
                animation: achievementFadeOut 0.3s ease-out forwards;
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(notification);
        
        console.log('[Live2D Achievement] Notification displayed');
        
        // 3秒后自动关闭
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
                const styleEl = document.getElementById('live2d-achievement-style');
                if (styleEl) styleEl.remove();
            }, 300);
        }, 3000);
    }
    
    // 检查成就是否已解锁
    function checkAchievementUnlocked(callback) {
        try {
            if (browserAPI.storage && browserAPI.storage.local) {
                browserAPI.storage.local.get(['live2d-achievement-unlocked'], (result) => {
                    callback(!result['live2d-achievement-unlocked']);
                });
            } else {
                // 回退到 localStorage
                const isUnlocked = localStorage.getItem('live2d-achievement-unlocked');
                callback(!isUnlocked);
            }
        } catch (e) {
            console.log('[Live2D Achievement] Storage check failed, using localStorage', e);
            const isUnlocked = localStorage.getItem('live2d-achievement-unlocked');
            callback(!isUnlocked);
        }
    }
    
    // 标记成就已解锁
    function markAchievementUnlocked() {
        try {
            if (browserAPI.storage && browserAPI.storage.local) {
                browserAPI.storage.local.set({ 'live2d-achievement-unlocked': 'true' });
            } else {
                localStorage.setItem('live2d-achievement-unlocked', 'true');
            }
        } catch (e) {
            console.log('[Live2D Achievement] Storage set failed, using localStorage', e);
            localStorage.setItem('live2d-achievement-unlocked', 'true');
        }
    }
    
    // 自动触发一言/喵言喵语
    function startAutoQuote() {
        // 清除之前的定时器
        if (autoQuoteTimer) {
            clearTimeout(autoQuoteTimer);
            autoQuoteTimer = null;
        }
        
        const isStrinova = currentModelName.startsWith('Strinova/');
        if (!isStrinova) {
            console.log('[Live2D AutoQuote] Not a Strinova model, skipping');
            return;
        }
        
        console.log('[Live2D AutoQuote] Starting auto quote for Strinova model');
        
        function scheduleNext() {
            // 3到20秒之间的随机时间
            const delay = Math.floor(Math.random() * 18000) + 3000;
            
            autoQuoteTimer = setTimeout(async () => {
                try {
                    // 100%概率显示普通一言加喵
                    const text = await fetchHitokoto();
                    showTips(addMeowSuffix(text));
                    console.log('[Live2D AutoQuote] Showed normal hitokoto with meow');
                } catch (e) {
                    console.log('[Live2D AutoQuote] Error', e);
                }
                
                // 调度下一次
                scheduleNext();
            }, delay);
            
            console.log('[Live2D AutoQuote] Next quote in', delay / 1000, 'seconds');
        }
        
        // 开始调度
        scheduleNext();
    }

    let cachedHitokoto = getRandomHitokoto();
    async function preCacheHitokoto() {
        cachedHitokoto = await fetchHitokoto();
    }
    
    // 清理旧的元素（防止和Cubism2冲突）
    function cleanupOldElements() {
        const oldWaifu = document.getElementById('waifu');
        if (oldWaifu) {
            oldWaifu.remove();
            console.log('[Live2D Cubism3] Removed old waifu element');
        }
        const oldWaifuToggle = document.getElementById('waifu-toggle');
        if (oldWaifuToggle) {
            oldWaifuToggle.remove();
            console.log('[Live2D Cubism3] Removed old waifu-toggle element');
        }
        const oldStyle = document.getElementById('live2d-custom-styles');
        if (oldStyle) {
            oldStyle.remove();
            console.log('[Live2D Cubism3] Removed old live2d-custom-styles');
        }
    }

    // 保存当前位置信息
    let currentPosition = 'left-bottom';
    
    // 拖拽功能
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let initialLeft = 0;
    let initialTop = 0;
    let currentWaifuElement = null;
    let currentTipsElement = null;
    let currentDragEnabled = false;
    
    // 拖拽事件监听器的引用，用于在禁用拖拽时可以移除
    let dragMousemoveHandler = null;
    let dragMouseupHandler = null;
    
    function enableDragging(waifu, dragEnabled) {
        if (!waifu) return;
        
        currentWaifuElement = waifu;
        currentDragEnabled = dragEnabled;
        
        // 先移除旧的事件监听器（如果有的话）
        if (dragMousemoveHandler) {
            document.removeEventListener('mousemove', dragMousemoveHandler);
            dragMousemoveHandler = null;
        }
        if (dragMouseupHandler) {
            document.removeEventListener('mouseup', dragMouseupHandler);
            dragMouseupHandler = null;
        }
        
        if (!dragEnabled) {
            waifu.style.cursor = 'default';
            return;
        }
        
        waifu.style.cursor = 'move';
        
        // 保存事件监听器的引用
        dragMousemoveHandler = function(e) {
            if (!isDragging) return;
            
            let newLeft = initialLeft + (e.clientX - dragStartX);
            let newTop = initialTop + (e.clientY - dragStartY);
            
            // 检查是否开启限位
            let isDragLimitEnabled = true;
            try {
                const settingsData = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                isDragLimitEnabled = settingsData.dragLimit !== false;
            } catch (e) {
                isDragLimitEnabled = true;
            }
            
            if (isDragLimitEnabled) {
                // 限位！防止看板娘拖出屏幕
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
            waifu.style.right = 'auto';
            waifu.style.bottom = 'auto';
            waifu.style.transform = 'none';
        };
        
        dragMouseupHandler = function() {
            if (!isDragging) return;
            
            isDragging = false;
            document.body.style.userSelect = '';
            
            // 保存位置到 localStorage
            const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            const rect = waifu.getBoundingClientRect();
            settings.draggedLeft = rect.left;
            settings.draggedTop = rect.top;
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
        };
        
        waifu.addEventListener('mousedown', function(e) {
            // 排除按钮点击
            if (e.target.closest('button') || e.target.closest('input')) return;
            
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            // 获取当前位置
            const rect = waifu.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            
            // 清除所有位置样式，只保留 left 和 top
            waifu.style.left = rect.left + 'px';
            waifu.style.top = rect.top + 'px';
            waifu.style.right = 'auto';
            waifu.style.bottom = 'auto';
            waifu.style.transform = 'none';
            
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', dragMousemoveHandler);
        document.addEventListener('mouseup', dragMouseupHandler);
    }
    
    async function initCubism3() {
        try {
            const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            console.log('[Live2D Cubism3] Settings:', settings);
            
            await window.Live2DAI.init(settings);
            
            // 设置 AI 连接回调
            window.Live2DAI.setCallbacks(
                function onDisconnect() {
                    console.log('[Live2D AI] 触发断开回调');
                    
                    // 更新存储里的连接状态
                    try {
                        const currentSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        currentSettings.aiConnected = false;
                        localStorage.setItem('live2dExtensionSettings', JSON.stringify(currentSettings));
                        
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                            chrome.storage.local.set({ aiConnected: false });
                        }
                    } catch (e) {
                        console.error('[Live2D AI] 保存断开状态失败:', e);
                    }
                    
                    showTips('运营商不让我们连接喵~');
                    // 更新连接状态
                    const statusEl = document.getElementById('aiConnectionStatus');
                    if (statusEl) {
                        statusEl.textContent = '未连接';
                        statusEl.style.color = '#dc3545';
                    }
                },
                function onReconnect() {
                    console.log('[Live2D AI] 触发重连回调');
                    
                    // 更新存储里的连接状态
                    try {
                        const currentSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        currentSettings.aiConnected = true;
                        localStorage.setItem('live2dExtensionSettings', JSON.stringify(currentSettings));
                        
                        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                            chrome.storage.local.set({ aiConnected: true });
                        }
                    } catch (e) {
                        console.error('[Live2D AI] 保存连接状态失败:', e);
                    }
                    
                    showTips('连接已恢复喵~');
                    // 更新连接状态
                    const statusEl = document.getElementById('aiConnectionStatus');
                    if (statusEl) {
                        statusEl.textContent = '已连接';
                        statusEl.style.color = '#28a745';
                    }
                }
            );
            
            // 如果 AI 已启用且已连接，开始自动重连检测
            if (settings.aiEnabled && settings.aiConnected) {
                window.Live2DAI.isConnected = true;
                window.Live2DAI.startReconnect();
                console.log('[Live2D AI] 自动重连已启动');
            }

            let cubism3Model = settings.cubism3Model || '';
            const baseUrl = settings.baseUrl || '';
            const actualModelBase = baseUrl + 'live2d-static-api/models_Cubism3/';
            const actualCorePath = baseUrl + 'dist/live2dcubismcore.min.js';
            const actualSdkPath = baseUrl + 'dist/live2d-sdk.js';

            if (!baseUrl) {
                console.error('[Live2D Cubism3] Base URL not found');
                return;
            }

            // 如果没有指定模型，尝试从indexes/models.json中找到第一个模型
            if (!cubism3Model) {
                console.log('[Live2D Cubism3] No model specified, trying to find default model');
                try {
                    const modelsJsonUrl = baseUrl + 'live2d-static-api/indexes/models.json';
                    const response = await fetch(modelsJsonUrl);
                    if (response.ok) {
                        const modelsData = await response.json();
                        if (modelsData && modelsData.length > 0) {
                            // 找到第一个Cubism3模型
                            for (const model of modelsData) {
                                if (model.isCubism3) {
                                    cubism3Model = model.modelPath;
                                    console.log('[Live2D Cubism3] Found default model:', cubism3Model);
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log('[Live2D Cubism3] Failed to load models.json:', e);
                }
                
                // 如果还是没有找到，尝试使用model_list.json
                if (!cubism3Model) {
                    try {
                        const modelListUrl = baseUrl + 'live2d-static-api/indexes/model_list.json';
                        const response = await fetch(modelListUrl);
                        if (response.ok) {
                            const modelList = await response.json();
                            if (modelList && modelList.length > 0) {
                                cubism3Model = modelList[0];
                                console.log('[Live2D Cubism3] Found default model from model_list:', cubism3Model);
                            }
                        }
                    } catch (e) {
                        console.log('[Live2D Cubism3] Failed to load model_list.json:', e);
                    }
                }
                
                // 如果还是没有找到，使用硬编码的默认模型
                if (!cubism3Model) {
                    cubism3Model = 'HyperdimensionNeptunia/noir';
                    console.log('[Live2D Cubism3] Using hardcoded default model:', cubism3Model);
                }
            }

            console.log('[Live2D Cubism3] Loading model:', cubism3Model);

            var modelPath = actualModelBase + cubism3Model + '/';
            console.log('[Live2D Cubism3] Model path:', modelPath);
            try { window.__live2d_modelPath = modelPath; } catch(exx) {} // 供 HitArea 线框使用
            
            // 保存当前位置
            currentPosition = settings.position || 'left-bottom';
            
            // 先清理旧元素
            cleanupOldElements();

            injectStyles();

            await loadScript(actualCorePath);
            await loadScript(actualSdkPath);
            
            // 加载喵言语录
            const isStrinovaModel = cubism3Model.startsWith('Strinova/');
            currentModelName = cubism3Model; // 保存当前模型名称到外层作用域
            currentMeowQuotes = []; // 清空
            console.log('[Live2D Cubism3] Current model:', currentModelName);
            if (isStrinovaModel) {
                try {
                    await loadScript(baseUrl + 'dist/meowQuotes.js');
                    if (window.meowQuotes && Array.isArray(window.meowQuotes)) {
                        currentMeowQuotes = window.meowQuotes;
                        console.log('[Live2D Cubism3] Loaded meow quotes:', currentMeowQuotes.length, 'quotes');
                    }
                } catch (e) {
                    console.log('[Live2D Cubism3] Failed to load meowQuotes.js:', e);
                }
            }

            console.log('[Live2D Cubism3] All core resources loaded');

            const position = settings.position || 'left-bottom';
            const sizeScale = (settings.size || 100) / 100;
            
            console.log('[Live2D Cubism3] Debug - Position setting:', position);
            console.log('[Live2D Cubism3] Debug - Settings:', settings);
            const canvasWidth = Math.round(450 * sizeScale);
            const canvasHeight = Math.round(450 * sizeScale);

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
            
            // 处理全部位置模式
            const allPositions = ['left-bottom', 'right-bottom', 'left-top', 'right-top', 'center', 'top-center', 'bottom-center', 'left-center', 'right-center'];
            let positionsToRender = position === 'all' ? allPositions : [position];
            
            console.log('[Live2D Cubism3] Positions to render:', positionsToRender);
            console.log('[Live2D Cubism3] Total positions:', positionsToRender.length);
            
            // 生成所有位置的模型容器
            positionsToRender.forEach((posName, index) => {
                console.log('[Live2D Cubism3] Creating container for:', posName, 'index:', index);
                const pos = positionConfig[posName] || positionConfig['left-bottom'];
                let waifuStyle = 'position: fixed; z-index: 2147483647; width: ' + canvasWidth + 'px; height: ' + canvasHeight + 'px;';
                
                const isMain = index === 0;
                
                // 如果是主容器并且有拖拽保存的位置，使用拖拽位置
                if (isMain && settings.drag && settings.draggedLeft !== undefined && settings.draggedTop !== undefined) {
                    waifuStyle += ' left: ' + settings.draggedLeft + 'px;';
                    waifuStyle += ' top: ' + settings.draggedTop + 'px;';
                    waifuStyle += ' right: auto;';
                    waifuStyle += ' bottom: auto;';
                    waifuStyle += ' transform: none;';
                } else {
                    // 使用原始位置配置
                    if (pos.waifuLeft !== undefined) {
                        if (typeof pos.waifuLeft === 'string' && pos.waifuLeft.includes('%')) {
                            waifuStyle += ' left: ' + pos.waifuLeft + ';';
                        } else {
                            waifuStyle += ' left: ' + pos.waifuLeft + 'px;';
                        }
                    }
                    if (pos.waifuRight !== undefined) {
                        if (typeof pos.waifuRight === 'string' && pos.waifuRight.includes('%')) {
                            waifuStyle += ' right: ' + pos.waifuRight + ';';
                        } else {
                            waifuStyle += ' right: ' + pos.waifuRight + 'px;';
                        }
                    }
                    if (pos.waifuTop !== undefined) {
                        if (typeof pos.waifuTop === 'string' && pos.waifuTop.includes('%')) {
                            waifuStyle += ' top: ' + pos.waifuTop + ';';
                        } else {
                            waifuStyle += ' top: ' + pos.waifuTop + 'px;';
                        }
                    }
                    if (pos.waifuBottom !== undefined) {
                        if (typeof pos.waifuBottom === 'string' && pos.waifuBottom.includes('%')) {
                            waifuStyle += ' bottom: ' + pos.waifuBottom + ';';
                        } else {
                            waifuStyle += ' bottom: ' + pos.waifuBottom + 'px;';
                        }
                    }
                    if (pos.waifuTransform !== undefined) waifuStyle += ' transform: ' + pos.waifuTransform + ';';
                }
                
                document.body.insertAdjacentHTML('beforeend', '\
                    <div id="waifu' + (isMain ? '' : '-' + posName) + '" class="waifu-container" style="' + waifuStyle + '">\
                        <div id="waifu-tips' + (isMain ? '' : '-' + posName) + '" class="waifu-tips"></div>\
                        <canvas id="live2d' + (isMain ? '' : '-' + posName) + '" width="' + canvasWidth + '" height="' + canvasHeight + '" style="width: 100%; height: 100%; object-fit: contain;"></canvas>\
                        ' + (isMain ? '\
                        <div id="waifu-buttons">\
                            <button class="waifu-btn" id="btn-switch" title="切换模型">\
                                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path></svg>\
                            </button>\
                            <button class="waifu-btn" id="btn-photo" title="保存图片">\
                                <svg viewBox="0 0 24 24"><path d="M12 12m-3.2 0a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0-6.4 0M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path></svg>\
                            </button>\
                            <button class="waifu-btn" id="btn-hitokoto" title="一言">\
                                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"></path></svg>\
                            </button>\
                            <button class="waifu-btn" id="btn-theme" title="切换主题">\
                                <svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"></path></svg>\
                            </button>\
                            <button class="waifu-btn" id="btn-hide" title="关闭">\
                                <svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path></svg>\
                            </button>\
                        </div>\
                        <div id="waifu-chat">\
                            <input type="text" id="chat-input" placeholder="输入消息...">\
                            <button class="chat-send" id="chat-send">\
                                <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>\
                            </button>\
                        </div>\
                        ' : '') + '\
                    </div>\
                ');
            });
            // 通知外部 waifu 容器已创建（供 newtab-inject 等覆盖样式）
            try { window.dispatchEvent(new CustomEvent('live2d-waifu-ready', { detail: { position: position } })); } catch(exx) {}
            
            console.log('[Live2D Cubism3] Position:', position);

            // 获取主位置的配置（用于按钮样式）
            const mainPos = positionConfig[positionsToRender[0]] || positionConfig['left-bottom'];

            const tipsEl = document.getElementById('waifu-tips');
            const buttonsEl = document.getElementById('waifu-buttons');
            const chatEl = document.getElementById('waifu-chat');

            const colors = getThemeColors();
            // 清除所有内联样式，完全靠CSS
            tipsEl.style.cssText = '';

            // 监听主题变化
            if (window.matchMedia) {
                window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
                    console.log('[Live2D Cubism3] Theme changed, reinitializing...');
                    // 重新初始化以应用新主题
                    window.__live2d_cubism3_initialized = false;
                    const waifu = document.getElementById('waifu');
                    if (waifu) waifu.remove();
                    const style = document.getElementById('live2d-cubism3-styles');
                    if (style) style.remove();
                    setTimeout(initCubism3, 100);
                });
            }

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

            const btnSwitch = document.getElementById('btn-switch');
            const btnPhoto = document.getElementById('btn-photo');
            const btnHitokoto = document.getElementById('btn-hitokoto');
            const btnTheme = document.getElementById('btn-theme');
            const btnHide = document.getElementById('btn-hide');
            const chatInput = document.getElementById('chat-input');
            const chatSend = document.getElementById('chat-send');
            const waifuEl = document.getElementById('waifu');

            let tipsTimeout = null;
            let chatHideTimeout = null;
            
            let isMouseInWaifu = false;
            let isInputFocused = false;
            
            // 监听鼠标进入/离开看板娘区域
            waifuEl.addEventListener('mouseenter', function() {
                isMouseInWaifu = true;
                // 清除隐藏定时器
                if (chatHideTimeout) {
                    clearTimeout(chatHideTimeout);
                    chatHideTimeout = null;
                }
            });
            
            waifuEl.addEventListener('mouseleave', function() {
                isMouseInWaifu = false;
                // 如果输入框没有焦点，延迟隐藏
                if (!isInputFocused) {
                    hideChatDelayed();
                }
            });
            
            // 输入框聚焦时保持显示
            chatInput.addEventListener('focus', function() {
                isInputFocused = true;
                chatEl.classList.add('has-focus');
                // 清除隐藏定时器
                if (chatHideTimeout) {
                    clearTimeout(chatHideTimeout);
                    chatHideTimeout = null;
                }
            });
            
            // 输入框失焦时检查是否需要隐藏
            chatInput.addEventListener('blur', function() {
                isInputFocused = false;
                // 如果鼠标不在看板娘区域，延迟隐藏
                if (!isMouseInWaifu) {
                    hideChatDelayed();
                }
            });
            
            function hideChatDelayed() {
                if (chatHideTimeout) {
                    clearTimeout(chatHideTimeout);
                }
                chatHideTimeout = setTimeout(function() {
                    chatEl.classList.remove('has-focus');
                    chatHideTimeout = null;
                }, 500);
            }
            
            async function showTips(text) {
                if (tipsEl) {
                    // 清除之前的定时器，刷新持续时间
                    if (tipsTimeout) {
                        clearTimeout(tipsTimeout);
                        tipsTimeout = null;
                    }
                    if (tipsEl._hideTimeout) {
                        clearTimeout(tipsEl._hideTimeout);
                        tipsEl._hideTimeout = null;
                    }
                    
                    // 清除图片
                    tipsEl.classList.remove('waifu-tips-image');
                    
                    tipsEl.textContent = text;
                    tipsEl.classList.add('waifu-tips-active');
                    
                    // 根据字数计算显示时间：基础5秒，每多10字加5秒
                    let displayTime = 5000;
                    if (text.length > 20) { // 超过20字开始计算额外时间
                        const extraWords = text.length - 20;
                        const extraTime = Math.floor(extraWords / 10) * 5000;
                        displayTime = 5000 + extraTime;
                    }
                    
                    // 显示后自动隐藏
                    tipsTimeout = setTimeout(function() {
                        tipsEl.classList.remove('waifu-tips-active');
                        tipsTimeout = null;
                    }, displayTime);
                    tipsEl._hideTimeout = tipsTimeout;
                    
                    console.log('[Live2D Tips] Display time:', displayTime / 1000, 'seconds for', text.length, 'chars');
                }
            }

            // ─── 每日一图 ───
            var _dailyImageFetching = false;

            // 在气泡中显示图片
            function showImageInTips(imageUrl, clickUrl) {
                if (!tipsEl) return;
                if (tipsTimeout) clearTimeout(tipsTimeout);
                if (tipsEl._hideTimeout) { clearTimeout(tipsEl._hideTimeout); tipsEl._hideTimeout = null; }
                var fullUrl = clickUrl || imageUrl;
                var safeUrl = imageUrl.replace(/['"]/g, '');
                var safeClick = fullUrl.replace(/['"]/g, '');
                tipsEl.innerHTML = '<div class="daily-image-container" style="display:block;text-align:center;">' +
                  '<div style="color:#999;font-size:11px;margin-bottom:4px;">点击查看原图</div>' +
                  '<a href="' + safeClick + '" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;" onclick="event.stopPropagation();var t=document.getElementById(\'waifu-tips\');if(t){if(t._hideTimeout)clearTimeout(t._hideTimeout);t.classList.remove(\'waifu-tips-active\');t.classList.remove(\'waifu-tips-image\');t.style.pointerEvents=\'none\';}"><img src="' + safeUrl + '" style="max-width:400px;max-height:300px;border-radius:8px;display:block;margin:0 auto;cursor:pointer;" onerror="var p=this.parentNode;if(p){var e=document.createElement(\'div\');e.style.cssText=\'color:#f88;padding:8px;font-size:12px;\';e.textContent=\'图片加载失败\';this.parentNode.replaceChild(e,this);}" onload="this.style.opacity=\'1\';var a=this.parentNode;if(a&&this.currentSrc)a.href=this.currentSrc;"></a>' +
                  '</div>';
                tipsEl.classList.add('waifu-tips-active');
                tipsEl.classList.add('waifu-tips-image');
                tipsEl.style.pointerEvents = 'auto';
                tipsEl.style.minWidth = '300px';
                tipsEl.style.minHeight = '120px';
                var stopBubble = function(e) { e.stopPropagation(); };
                tipsEl.addEventListener('pointerdown', stopBubble);
                tipsEl.addEventListener('mousedown', stopBubble);
                tipsEl.addEventListener('touchstart', stopBubble);
                // 等图片加载完再启动 15 秒倒计时（用 naturalWidth 检测，跨域也能用）
                var imgCheckTimer = setInterval(function() {
                    var im = tipsEl.querySelector('img');
                    if (im && (im.complete || im.naturalWidth > 0)) {
                        clearInterval(imgCheckTimer);
                        startHideTimer();
                    }
                }, 200);
                // 兜底：10 秒后强制启动（避免永远不消失）
                setTimeout(function() { clearInterval(imgCheckTimer); startHideTimer(); }, 10000);
                
                function startHideTimer() {
                    if (tipsEl._hideTimeout) return;
                    tipsTimeout = setTimeout(function() {
                        tipsEl.classList.remove('waifu-tips-active');
                        tipsEl.classList.remove('waifu-tips-image');
                        tipsEl.style.pointerEvents = 'none';
                        tipsTimeout = null;
                        tipsEl._hideTimeout = null;
                    }, 15000);
                    tipsEl._hideTimeout = tipsTimeout;
                }
            }

            // 获取每日一图设置
            function getDailyImageSettings() {
                try {
                    var s = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    return {
                        enabled: s.dailyImageEnabled === true, // 默认关闭
                        customApi: !!s.dailyImageCustomApi,
                        apiList: s.dailyImageApiList || [{ url: 'https://api.yppp.net/api.php', enabled: true }, { url: '', enabled: false }]
                    };
                } catch(e) { return { enabled: false, customApi: false, apiList: [{ url: 'https://api.yppp.net/api.php', enabled: true }] }; }
            }

            // 获取图片 URL 并显示
            async function fetchAndShowDailyImage() {
                if (_dailyImageFetching) { console.log('[Live2D DailyImage] Already fetching, skip'); return; }
                _dailyImageFetching = true;
                
                try {
                    var settings = getDailyImageSettings();
                    if (!settings.enabled) { showTips('未开启每日一图喵！'); _dailyImageFetching = false; return; }

                    var enabledApis = [];
                    for (var ai = 0; ai < settings.apiList.length; ai++) {
                        var item = settings.apiList[ai];
                        if (item.enabled && item.url) {
                            enabledApis.push(item.url);
                        }
                    }
                    if (enabledApis.length === 0) {
                        enabledApis.push('https://api.yppp.net/api.php');
                    }

                    var apiUrl = enabledApis[Math.floor(Math.random() * enabledApis.length)];
                    console.log('[Live2D DailyImage] Using API:', apiUrl);

                    var sep = apiUrl.includes('?') ? '&' : '?';
                    var urlWithTs = apiUrl + sep + 't=' + Date.now();

                    // 先显示加载提示
                    tipsEl.textContent = '加载中喵...';
                    tipsEl.classList.add('waifu-tips-active');

                    // 通过 background 桥接获取图片 URL
                    var imgUrlToShow = urlWithTs; // fallback（显示用）
                    var imgClickUrl = urlWithTs;  // fallback（点开用）
                    try {
                        var bridgeResult = await new Promise(function(resolve, reject) {
                            var rid = 'di_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
                            function handler(e) {
                                var d = e.detail || {};
                                if (d.requestId === rid) {
                                    window.removeEventListener('live2dDailyImageResult', handler);
                                    resolve(d); // 返回完整的 detail
                                }
                            }
                            window.addEventListener('live2dDailyImageResult', handler);
                            window.dispatchEvent(new CustomEvent('live2dDailyImageFetch', { detail: { requestId: rid, url: urlWithTs } }));
                            setTimeout(function() { window.removeEventListener('live2dDailyImageResult', handler); reject(new Error('Timeout')); }, 15000);
                        });
                        // 分离显示用 URL 和点开用 URL
                        if (bridgeResult.dataUrl) {
                            imgUrlToShow = bridgeResult.dataUrl;  // base64 显示
                            imgClickUrl = bridgeResult.imageUrl || urlWithTs; // 原图地址
                        } else if (bridgeResult.imageUrl) {
                            imgUrlToShow = bridgeResult.imageUrl;  // 直链显示
                            imgClickUrl = bridgeResult.imageUrl;   // 直链点开
                        }
                        console.log('[Live2D DailyImage] Show:', imgUrlToShow.slice(0, 80), '| Click:', imgClickUrl.slice(0, 80));
                    } catch(e) {
                        console.log('[Live2D DailyImage] Bridge:', e.message);
                    }

                    // 在气泡中显示
                    showImageInTips(imgUrlToShow, imgClickUrl);

                } catch(e) {
                    console.error('[Live2D DailyImage] Error:', e);
                    showTips('图片出错了喵~');
                }
                
                _dailyImageFetching = false;
            }

            // 每日一图已无自动轮询，仅由快捷键和关键词触发

            async function waitForSettings(timeout = 3000) {
                const start = Date.now();
                console.log('[Live2D AI Chat] Waiting for settings to sync...');
                return new Promise((resolve) => {
                    const checkSettings = () => {
                        const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        if (settings.aiEnabled !== undefined) {
                            console.log('[Live2D AI Chat] Settings found!');
                            resolve(settings);
                        } else if (Date.now() - start > timeout) {
                            console.log('[Live2D AI Chat] Settings timeout, returning what we have');
                            resolve(settings);
                        } else {
                            setTimeout(checkSettings, 200);
                        }
                    };
                    checkSettings();
                });
            }
            
            // 抚摸交互消息列表
            const petMessages = [
                '挠你', '摸摸', '捏捏', '揉揉', '拍拍', '戳戳',
                '戳你', '揉你', '摸你', '挠挠', '拍拍你',
                'rua', '揉揉你', '捏捏你', '戳戳你', '摸摸你'
            ];
            
            // 随机选择抚摸消息
            function getRandomPetMessage() {
                return petMessages[Math.floor(Math.random() * petMessages.length)];
            }

            // 关键词启发式判断：用户消息是否想总结页面
            function isSummaryKeyword(text) {
                const keywords = ['总结', '摘要', '归纳', '概括', '讲了什么', '页面内容', '网页要点', '页面要点', '页面讲了', '这篇文章', '文章内容', '内容概括', '内容摘要', '简短总结', '帮我总结', '总结一下', '总结页面', '页面总结', '网页总结', '什么内容'];
                const t = text.toLowerCase();
                for (const kw of keywords) {
                    if (t.includes(kw.toLowerCase())) return true;
                }
                return false;
            }

            // 截图关键词判断
            function isScreenshotKeyword(text) {
                const keywords = ['截图', '拍照', '截屏', '屏幕截图', '快照', '截图保存', '页面截图', '保存为图片', 'capture', 'screenshot', '截个图', '拍个照', '截图一下'];
                const t = text.toLowerCase();
                for (const kw of keywords) {
                    if (t.includes(kw.toLowerCase())) return true;
                }
                return false;
            }

            // 判断是否不要截看板娘
            function isNoMascotScreenshot(text) {
                const keywords = [
                    '不要截看板娘', '不截看板娘', '不要看板娘', '不看板娘', '不带看板娘',
                    '不要模型', '不要角色', '隐藏模型', '隐藏看板娘', '隐藏角色',
                    '只截页面', '只截网页', '不要截模型', '不截模型',
                    '截图不要看板娘', '截图不包含看板娘', '截图不带看板娘',
                    'without mascot', 'without character', 'hide mascot', 'hide character',
                    'no mascot', 'no character', 'no waifu'
                ];
                const t = text.toLowerCase();
                for (const kw of keywords) {
                    if (t.includes(kw.toLowerCase())) return true;
                }
                return false;
            }

            // 每日一图触发关键词
            function isDailyImageKeyword(text) {
                const keywords = [
                    '每日一图', '随机图片', '随机图', '看图片', '看美图', '看妹子图', '看风景', '看画', '看漫画',
                    '再来一张', '换一张', '来一张', '给我一张图', '来张图', '来图',
                    '显示图片', '展示图片', '秀图', '整张图', '放图', '出图',
                    'daily', 'random image', 'random pic', 'show image', 'show picture',
                    '让我看看', '有什么图', '好看吗', '美图'
                ];
                const t = text.toLowerCase();
                for (const kw of keywords) {
                    if (t.includes(kw.toLowerCase())) return true;
                }
                return false;
            }

            // 涩图触发关键词（仅输入框有效）
            function isLewdKeyword(text) {
                const keywords = ['瑟瑟', '色色', '涩涩', '色图', '涩图', '瑟图'];
                const t = text.toLowerCase();
                for (const kw of keywords) {
                    if (t.includes(kw.toLowerCase())) return true;
                }
                return false;
            }

            // 直接显示涩图（/api/v2/img 返回 302 到随机图片，浏览器处理重定向，无 CSP 问题）
            var _lewdImageFetching = false;
            async function fetchAndShowLewdImage() {
                if (_lewdImageFetching) { return; }
                _lewdImageFetching = true;

                try {
                    var imgApiUrl = 'https://sex.nyan.run/api/v2/img?keyword=all&r18=true';
                    // 显示：用 <img> 直接请求 API（302 到图片），每次不同 URL 防缓存
                    showImageInTips(imgApiUrl + '&t=' + Date.now(), imgApiUrl + '&t=' + (Date.now() + 1));
                } catch(e) {
                    console.error('[Live2D Lewd Image] Error:', e);
                    showTips('图片出错了喵~');
                }

                _lewdImageFetching = false;
            }

            // 全页面截图并下载
            // includeMascot: true=截图中包含看板娘（默认）, false=隐藏看板娘只截页面
            async function captureFullPageScreenshot(includeMascot) {
                if (includeMascot === undefined) includeMascot = true;
                try {
                    // 动态加载 html2canvas
                    if (typeof html2canvas === 'undefined') {
                        await new Promise(function(resolve, reject) {
                            var script = document.createElement('script');
                            try {
                                var url;
                                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                                    url = chrome.runtime.getURL('html2canvas.min.js');
                                } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                                    url = browser.runtime.getURL('html2canvas.min.js');
                                } else {
                                    url = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                                }
                                script.src = url;
                                script.onload = resolve;
                                script.onerror = function() { reject(new Error('Failed to load html2canvas')); };
                                document.head.appendChild(script);
                            } catch(e) { reject(e); }
                        });
                    }
                    
                    // 等待 html2canvas 加载完成
                    if (typeof html2canvas === 'undefined') {
                        // 尝试等待一帧
                        await new Promise(function(resolve) { setTimeout(resolve, 1000); });
                        if (typeof html2canvas === 'undefined') {
                            showTips('截图引擎加载失败喵~');
                            return;
                        }
                    }
                    
                    // ─── 自动滚动预加载 ───
                    // 很多网站使用懒加载（图片、iframe、评论区等），
                    // 需要逐屏滚动以触发加载，再截图才能得到完整内容。
                    // 先记录当前滚动位置，之后恢复。
                    var originalScrollY = window.scrollY || window.pageYOffset || 0;
                    
                    // 获取页面总高度（取较大参考值）
                    var totalHeight = Math.max(
                        document.documentElement.scrollHeight,
                        document.body.scrollHeight,
                        document.documentElement.offsetHeight
                    );
                    var viewportHeight = window.innerHeight;
                    var scrollStep = Math.max(viewportHeight - 100, 200); // 每步略重叠，不漏区域
                    var scrollDelay = 300; // 每步等待时间（ms），让懒加载有机会触发
                    
                    showTips('正在预加载页面内容喵...');
                    
                    // 如果页面需要滚动，逐屏滚动触发懒加载
                    if (totalHeight > viewportHeight * 1.5) {
                        var scrollPositions = [];
                        for (var sy = 0; sy < totalHeight; sy += scrollStep) {
                            scrollPositions.push(sy);
                        }
                        // 先向下滚动到底
                        for (var si = 0; si < scrollPositions.length; si++) {
                            window.scrollTo(0, scrollPositions[si]);
                            // 分发给 scroll/load 事件的时间
                            await new Promise(function(r) { setTimeout(r, scrollDelay); });
                            // 如果页面上有图片且是 IntersectionObserver 懒加载的，
                            // 手动触发加载：找到未加载的 img 强制设置 src
                            var lazyImgs = document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy-src], img[src$="svg"], img[src=""]');
                            for (var li = 0; li < lazyImgs.length; li++) {
                                var img = lazyImgs[li];
                                if (img) {
                                    var ds = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
                                    if (ds && (!img.src || img.src === '' || img.src.endsWith('svg'))) {
                                        img.src = ds;
                                    }
                                    // data-srcset 响应式图片
                                    var dss = img.getAttribute('data-srcset');
                                    if (dss && !img.srcset) {
                                        img.srcset = dss;
                                    }
                                }
                            }
                        }
                        // 额外等待一小段时间让滚动底部的内容完全加载
                        await new Promise(function(r) { setTimeout(r, 500); });
                    }
                    
                    // 滚动回顶部开始截图
                    window.scrollTo(0, 0);
                    await new Promise(function(r) { setTimeout(r, 300); });
                    
                    // 查找页面中最大的内容容器，临时解除溢出隐藏
                    var containers = document.querySelectorAll('html, body, #root, #app, #__nuxt, main, .main, .content, [class*="container"], [class*="wrapper"], [class*="layout"]');
                    var overflowOrigins = [];
                    for (var ci = 0; ci < containers.length; ci++) {
                        var el = containers[ci];
                        if (el && el.style) {
                            var ov = window.getComputedStyle(el).overflow;
                            if (ov === 'hidden' || ov === 'scroll' || ov === 'auto') {
                                overflowOrigins.push({ el: el, val: el.style.overflow });
                                el.style.overflow = 'visible';
                            }
                        }
                    }
                    
                    // ─── 临场处理看板娘 ───
                    // 直接操作真实 DOM，用 requestAnimationFrame 确保重排完成后再截图
                    var waifuEl = document.getElementById('waifu');
                    var waifuOrigStyles = {};
                    if (waifuEl) {
                        if (!includeMascot) {
                            // 隐藏看板娘
                            waifuOrigStyles.display = waifuEl.style.display;
                            waifuEl.style.display = 'none';
                        } else {
                            // 保留看板娘，但把 position:fixed 换成 position:absolute 并算好坐标
                            var cs = window.getComputedStyle(waifuEl);
                            waifuOrigStyles.position = waifuEl.style.position;
                            waifuOrigStyles.top = waifuEl.style.top;
                            waifuOrigStyles.left = waifuEl.style.left;
                            waifuOrigStyles.bottom = waifuEl.style.bottom;
                            waifuOrigStyles.right = waifuEl.style.right;
                            if (cs.position === 'fixed') {
                                var rect = waifuEl.getBoundingClientRect();
                                waifuEl.style.position = 'absolute';
                                waifuEl.style.top = (rect.top + window.scrollY) + 'px';
                                waifuEl.style.left = (rect.left + window.scrollX) + 'px';
                                waifuEl.style.bottom = '';
                                waifuEl.style.right = '';
                            }
                        }
                        // 等一帧让浏览器应用样式
                        await new Promise(function(r) { requestAnimationFrame(r); });
                    }
                    
                    var canvas = await html2canvas(document.documentElement, {
                        useCORS: true,
                        allowTaint: false,
                        logging: false,
                        scale: window.devicePixelRatio || 1
                    });
                    
                    // 恢复看板娘样式
                    if (waifuEl && Object.keys(waifuOrigStyles).length > 0) {
                        if (waifuOrigStyles.display !== undefined) waifuEl.style.display = waifuOrigStyles.display;
                        if (waifuOrigStyles.position !== undefined) waifuEl.style.position = waifuOrigStyles.position;
                        if (waifuOrigStyles.top !== undefined) waifuEl.style.top = waifuOrigStyles.top;
                        if (waifuOrigStyles.left !== undefined) waifuEl.style.left = waifuOrigStyles.left;
                        if (waifuOrigStyles.bottom !== undefined) waifuEl.style.bottom = waifuOrigStyles.bottom;
                        if (waifuOrigStyles.right !== undefined) waifuEl.style.right = waifuOrigStyles.right;
                    }
                    
                    // 恢复容器的 overflow 设置
                    for (var ri = 0; ri < overflowOrigins.length; ri++) {
                        overflowOrigins[ri].el.style.overflow = overflowOrigins[ri].val;
                    }
                    
                    // 恢复原始滚动位置
                    window.scrollTo(0, originalScrollY);
                    
                    // 转换为 base64 并通过 CustomEvent 发给 content.js 下载
                    var timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    var fileName = 'screenshot_' + timestamp + '.png';
                    try {
                        var dataUrl = canvas.toDataURL('image/png');
                        // 通过 CustomEvent 发送给 content.js → background → chrome.downloads
                        window.dispatchEvent(new CustomEvent('live2dDownloadScreenshot', {
                            detail: { dataUrl: dataUrl, fileName: fileName }
                        }));
                        showTips('正在保存截图喵~');
                    } catch (e) {
                        console.error('[Live2D Screenshot] toDataURL failed:', e);
                        showTips('截图保存失败: ' + e.message + ' 喵~');
                    }
                } catch (e) {
                    console.error('[Live2D Screenshot] Error:', e);
                    showTips('截图失败: ' + (e.message || '未知错误') + ' 喵~');
                }
            }
            
            // 处理抚摸交互
            async function handlePetInteraction() {
                // 等待设置同步
                let latestSettings = await waitForSettings(5000);
                try {
                    const latest = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    latestSettings = { ...latestSettings, ...latest };
                } catch (e) {
                    console.log('[Live2D Pet] localStorage 读取失败:', e);
                }
                
                const aiEnabled = latestSettings.aiEnabled;
                const aiApiKey = latestSettings.aiApiKey;
                const siliconflowApiKey = latestSettings.siliconflowApiKey;
                const aiProvider = latestSettings.aiProvider;
                
                if (aiEnabled) {
                    // 检查 API Key
                    const apiKeyMap = {
                        deepseek: aiApiKey,
                        siliconflow: siliconflowApiKey,
                        univibe: latestSettings.univibeApiKey,
                        longcat: latestSettings.longcatApiKey,
                        qwen: latestSettings.qwenApiKey,
                        hunyuan: latestSettings.hunyuanApiKey,
                        ernie: latestSettings.ernieApiKey,
                        doubao: latestSettings.doubaoApiKey,
                        spark: latestSettings.sparkApiKey,
                        zhipu: latestSettings.zhipuApiKey,
                        moonshot: latestSettings.moonshotApiKey,
                        minimax: latestSettings.minimaxApiKey,
                        atri: latestSettings.atriApiKey
                    };
                    const hasApiKey = apiKeyMap[aiProvider] || aiApiKey;
                    if (!hasApiKey) {
                        return;
                    }
                    
                    const petMessage = getRandomPetMessage();
                    console.log('[Live2D Pet] 发送抚摸消息:', petMessage);
                    
                    try {
                        const aiResponse = await window.Live2DAI.getAIResponse(petMessage);
                        showTips(aiResponse);
                    } catch (error) {
                        console.error('[Live2D Pet] API 调用失败:', error);
                    }
                }
            }
            
            async function handleChat() {
                const text = chatInput.value.trim();
                if (!text) return;
                
                chatInput.value = '';
                // 发送后保持输入框显示一段时间
                chatEl.classList.add('has-focus');
                
                // 等待设置同步
                let latestSettings = await waitForSettings(5000);
                
                // 再尝试读取一次最新的
                try {
                    const latest = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    latestSettings = { ...latestSettings, ...latest };
                } catch (e) {
                    console.log('[Live2D AI Chat] localStorage 读取失败:', e);
                }
                
                const aiEnabled = latestSettings.aiEnabled;
                const aiApiKey = latestSettings.aiApiKey;
                const siliconflowApiKey = latestSettings.siliconflowApiKey;
                const aiProvider = latestSettings.aiProvider;
                
                console.log('[Live2D AI Chat] ====== 调试信息 ======');
                console.log('[Live2D AI Chat] 完整设置:', latestSettings);
                console.log('[Live2D AI Chat] AI Enabled:', aiEnabled, '(类型:', typeof aiEnabled, ')');
                console.log('[Live2D AI Chat] AI Provider:', aiProvider);
                console.log('[Live2D AI Chat] DeepSeek API Key:', aiApiKey ? '已配置' : '未配置');
                console.log('[Live2D AI Chat] 硅基流动 API Key:', siliconflowApiKey ? '已配置' : '未配置');
                console.log('[Live2D AI Chat] User message:', text);
                
                // 涩图关键词触发（独立 API，无需 AI 聊天）
                if (isLewdKeyword(text)) {
                    console.log('[Live2D AI Chat] 检测到涩图意图');
                    showTips('给你看点好康的喵~');
                    if (!isMouseInWaifu) { hideChatDelayed(); }
                    fetchAndShowLewdImage();
                    return;
                }
                
                // 非 AI 功能：每日一图关键词触发（无需 AI 聊天）
                if (isDailyImageKeyword(text)) {
                    console.log('[Live2D AI Chat] 检测到每日一图意图');
                    showTips('来张美图喵~');
                    if (!isMouseInWaifu) { hideChatDelayed(); }
                    fetchAndShowDailyImage();
                    return;
                }
                
                if (aiEnabled) {
                    // 检查 API Key
                    const apiKeyMap = {
                        deepseek: aiApiKey,
                        siliconflow: siliconflowApiKey,
                        univibe: latestSettings.univibeApiKey,
                        longcat: latestSettings.longcatApiKey,
                        qwen: latestSettings.qwenApiKey,
                        hunyuan: latestSettings.hunyuanApiKey,
                        ernie: latestSettings.ernieApiKey,
                        doubao: latestSettings.doubaoApiKey,
                        spark: latestSettings.sparkApiKey,
                        zhipu: latestSettings.zhipuApiKey,
                        moonshot: latestSettings.moonshotApiKey,
                        minimax: latestSettings.minimaxApiKey,
                        atri: latestSettings.atriApiKey
                    };
                    const hasApiKey = apiKeyMap[aiProvider] || aiApiKey;
                    if (!hasApiKey) {
                        console.log('[Live2D AI Chat] 错误: API Key 未配置');
                        showTips('请先在设置中配置 API Key 喵~');
                        if (!isMouseInWaifu) {
                            hideChatDelayed();
                        }
                        return;
                    }
                    
                    try {
                        showTips('正在思考喵...');
                        console.log('[Live2D AI Chat] 开始调用 AI API...');
                        
                        // 先判断用户是否想总结当前页面
                        console.log('[Live2D AI Chat] classifyIntent available:', !!(window.Live2DAI && typeof window.Live2DAI.classifyIntent === 'function'));
                        if (window.Live2DAI && typeof window.Live2DAI.classifyIntent === 'function') {
                            const isSummaryIntent = await window.Live2DAI.classifyIntent(text);
                            if (isSummaryIntent) {
                                console.log('[Live2D AI Chat] 检测到总结页面的意图, 触发页面总结');
                                // 获取页面内容并触发总结
                                let pageText = document.body.innerText || '';
                                if (pageText.length > 8000) {
                                    pageText = pageText.substring(0, 8000) + '\n...（内容过长已截断）';
                                }
                                const summaryEvent = new CustomEvent('live2dPageSummary', {
                                    detail: { pageContent: pageText }
                                });
                                window.dispatchEvent(summaryEvent);
                                showTips('正在总结页面喵~');
                                if (!isMouseInWaifu) { hideChatDelayed(); }
                                return;
                            }
                        }
                        
                        // 判断用户是否想截图当前页面（先关键词快速判断，再 API 分类）
                        let isScreenshotIntent = isScreenshotKeyword(text);
                        if (!isScreenshotIntent && window.Live2DAI && typeof window.Live2DAI.classifyIntent === 'function') {
                            // 复用 classifyIntent 但不传给用户输入以避免重复 API 调用过多
                            // 直接关键词匹配即可，因为截图关键词很明确
                        }
                        if (isScreenshotIntent) {
                            console.log('[Live2D AI Chat] 检测到截图意图, 执行截图');
                            showTips('正在截图喵~');
                            if (!isMouseInWaifu) { hideChatDelayed(); }
                            // 判断是否要隐藏看板娘
                            var includeMascot = !isNoMascotScreenshot(text);
                            captureFullPageScreenshot(includeMascot);
                            return;
                        }
                        
                        const aiResponse = await window.Live2DAI.getAIResponse(text);
                        console.log('[Live2D AI Chat] AI 响应成功:', aiResponse);
                        showTips(aiResponse);
                    } catch (error) {
                        console.error('[Live2D AI Chat] API 调用失败:', error);
                        showTips(error.message || 'AI 响应失败，请稍后再试喵~');
                    }
                } else {
                    console.log('[Live2D AI Chat] AI 未启用，显示一言');
                    showTips(getRandomHitokoto());
                }
                
                // 发送后延迟隐藏输入框
                if (!isMouseInWaifu) {
                    hideChatDelayed();
                }
            }

            // 独立监听：无需 AI 聊天也能通过关键词触发每日一图（必须先添加，用 stopImmediatePropagation 阻止 handleChat 重复触发）
            chatInput.addEventListener('keypress', function _dailyImageKeypress(e) {
                if (e.key === 'Enter') {
                    if (isLewdKeyword(chatInput.value)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        chatInput.value = '';
                        showTips('给你看点好康的喵~');
                        if (!isMouseInWaifu) { hideChatDelayed(); }
                        fetchAndShowLewdImage();
                    } else if (isDailyImageKeyword(chatInput.value)) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        chatInput.value = '';
                        showTips('来张美图喵~');
                        if (!isMouseInWaifu) { hideChatDelayed(); }
                        fetchAndShowDailyImage();
                    }
                }
            });
            chatSend.addEventListener('click', handleChat);
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleChat();
                }
            });

            // ─── 动态快捷键系统 ───
            // 每次 keydown 时实时从 localStorage 读取，无需刷新页面
            function getLiveBindings() {
                var defaults = {
                    screenshot: { ctrl: true, shift: false, alt: true, key: 'V' },
                    screenshotNoMascot: { ctrl: true, shift: false, alt: true, key: 'B' },
                    dailyImage: { ctrl: true, shift: false, alt: true, key: 'G' }
                };
                var b = {};
                try {
                    var raw = localStorage.getItem('live2dKeybindings');
                    if (raw) b = JSON.parse(raw);
                } catch(e) {}
                Object.keys(defaults).forEach(function(k) {
                    if (!b[k]) b[k] = defaults[k];
                });
                return b;
            }
            
            function matchBinding(e, b) {
                if (!b || !b.key) return false;
                return (!!e.ctrlKey === !!b.ctrl) &&
                       (!!e.shiftKey === !!b.shift) &&
                       (!!e.altKey === !!b.alt) &&
                       (e.key.toUpperCase() === b.key.toUpperCase());
            }
            
            document.addEventListener('keydown', function(e) {
                var bindings = getLiveBindings();
                if (matchBinding(e, bindings.screenshot)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Live2D Screenshot] Keybinding triggered screenshot');
                    showTips('正在截图喵~');
                    captureFullPageScreenshot(true);
                } else if (matchBinding(e, bindings.screenshotNoMascot)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Live2D Screenshot] Keybinding triggered screenshot (no mascot)');
                    showTips('正在截图喵~');
                    captureFullPageScreenshot(false);
                } else if (matchBinding(e, bindings.dailyImage)) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('[Live2D DailyImage] Keybinding triggered');
                    showTips('来张美图喵~');
                    fetchAndShowDailyImage();
                } else if (e.ctrlKey || e.altKey || e.shiftKey) {
                    // 特殊组合键检测（从 localStorage 读取）
                    var specials = {};
                    try { specials = JSON.parse(localStorage.getItem('live2dSpecialBindings') || '{}'); } catch(e) {}
                    // 默认特殊快捷键
                    if (!specials.watermark) specials.watermark = 'ctrl+alt+F1';
                    if (!specials.reset) specials.reset = 'ctrl+alt+F2';

                    var combo = '';
                    if (e.ctrlKey) combo += 'ctrl+';
                    if (e.altKey) combo += 'alt+';
                    if (e.shiftKey) combo += 'shift+';
                    combo += e.key.length === 1 ? e.key.toUpperCase() : e.key;
                    if (specials.watermark === combo) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (window.live2d) {
                            var wmState = localStorage.getItem('live2d_watermarkHidden') === '1';
                            if (wmState) {
                                // 显示水印：恢复默认参数
                                if (window.live2d.resetParameters) window.live2d.resetParameters();
                                window.live2d.setParameterById('Param196', 0);
                                window.live2d.setParameterById('Param197', 1);
                                window.live2d.setParameterById('Param198', 1);
                                window.live2d.setParameterById('Param199', 0);
                                localStorage.setItem('live2d_watermarkHidden', '0');
                                showTips('水印已显示');
                            } else {
                                // 隐藏水印：用 setExpression 启动 expression13（表达式系统持续维持）
                                if (window.live2d.setExpression) window.live2d.setExpression('expression13');
                                window.live2d.setParameterById('Param196', 1);
                                window.live2d.setParameterById('Param197', 0);
                                window.live2d.setParameterById('Param198', 0);
                                window.live2d.setParameterById('Param199', 1);
                                localStorage.setItem('live2d_watermarkHidden', '1');
                                showTips('水印已隐藏');
                            }
                        }
                    } else if (specials.reset === combo) {
                        // ... already handled above

                        if (window.live2d) {
                            if (window.live2d.resetParameters) window.live2d.resetParameters();
                            localStorage.setItem('live2d_activeExpressionList', '[]');
                            showTips('表情已重置');
                        }
                    }
                } else if (!e.ctrlKey && !e.altKey && !e.metaKey) {
                    // 动作快捷键：支持自定义按键映射（用 e.code 区分主键盘和小键盘）
                    var keyMap = {};
                    try { keyMap = JSON.parse(localStorage.getItem('live2dModelKeyBindings') || '{}'); } catch(e) {}
                    var actions = window.__live2d_actions || [];
                    var code = e.code || '';
                    var lookupKey = code.startsWith('Digit') ? code.slice(5) : code.startsWith('Numpad') ? code : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
                    var keyIdx = keyMap[lookupKey];
                    if (keyIdx === undefined) {
                        // 默认映射：先小键盘，后主键盘
                        var allDefaultKeys = ['Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6','Numpad7','Numpad8','Numpad9','Numpad0','NumpadMultiply','NumpadSubtract','NumpadAdd','1','2','3','4','5','6','7','8','9','0','-','=','[',']','\\',';','\'',',','.','/'];
                        var fallbackIdx = allDefaultKeys.indexOf(lookupKey);
                        var taken = false;
                        if (fallbackIdx >= 0) {
                            for (var tk in keyMap) {
                                if (keyMap.hasOwnProperty(tk) && keyMap[tk] === fallbackIdx) { taken = true; break; }
                            }
                        }
                        if (!taken) keyIdx = fallbackIdx;
                    }
                    if (keyIdx >= 0 && keyIdx < actions.length) {
                        e.preventDefault();
                        e.stopPropagation();
                        var action = actions[keyIdx];
                        // [切换] 类动作：提示不可用
                        if (action.name && action.name.indexOf('[切换]') === 0) {
                            showTips('需在 VTube Studio 中使用');
                            return;
                        }

                        if (action.type === 'motion') {
                            if (window.live2d && window.live2d.startMotion) {
                                // Motion: 解析 JSON 提取最终参数值永久应用
                                fetch(modelPath + action.file).then(function(r) {
                                    if (!r.ok) { window.live2d.startMotion(action.group, action.index, 3); throw 'no motion file'; }
                                    return r.json();
                                }).then(function(motionData) {
                                    if (!motionData.Curves || !window.live2d) return;
                                    motionData.Curves.forEach(function(curve) {
                                        var segs = curve.Segments;
                                        if (!segs || segs.length < 2) return;
                                        var lastVal = segs[segs.length - 1];
                                        if (curve.Target === 'Parameter') {
                                            window.live2d.setParameterById(curve.Id, lastVal);
                                        } else if (curve.Target === 'PartOpacity') {
                                            window.live2d.setPartOpacityById(curve.Id, lastVal);
                                        }
                                    });
                                    console.log('[Live2D Motion] Applied state:', action.name);
                                }).catch(function() {});
                                showTips('动作: ' + action.name);
                                console.log('[Live2D Motion] Triggered:', action.name);
                            }
                        } else if (action.type === 'expression') {
                            if (window.live2d && window.live2d.setExpression) {
                                var stateKey = 'live2d_activeExpressionList';
                                var activeList = [];
                                try {
                                    var raw = localStorage.getItem(stateKey);
                                    if (raw) activeList = JSON.parse(raw);
                                    if (!Array.isArray(activeList)) activeList = [];
                                } catch(e) { activeList = []; }
                                function applyExpression(name, fileUrl, sdkName) {
                                    var actualName = sdkName || name;
                                    // 1) 用 SDK 原始名调用 setExpression（保证在 _expressions 映射表中找到）
                                    if (window.live2d.setExpression) window.live2d.setExpression(actualName);
                                    // 2) 如果有文件，动态注册到 SDK 的 _expressions 映射表
                                    if (fileUrl && window.live2d.loadAndRegisterExpression) {
                                        window.live2d.loadAndRegisterExpression(actualName, fileUrl);
                                    }
                                }
                                // 独立叠加模式：每个表情可独立开关，多个表情可同时叠加
                                var pos = activeList.indexOf(keyIdx);
                                if (pos >= 0) {
                                    activeList.splice(pos, 1);
                                } else {
                                    activeList.push(keyIdx);
                                }
                                // 1) 激活最近开启的表情（无论是否在 SDK 中注册）
                                if (activeList.length > 0) {
                                    var last = activeList[activeList.length - 1];
                                    var lastAct = actions[last];
                                    if (lastAct && lastAct.type === 'expression') {
                                        var sdkName = lastAct.sdkName || lastAct.name;
                                        if (window.live2d && window.live2d.loadAndRegisterExpression && lastAct.file) {
                                            window.live2d.loadAndRegisterExpression(sdkName, modelPath + lastAct.file);
                                        } else if (window.live2d && window.live2d.setExpression) {
                                            window.live2d.setExpression(sdkName);
                                        }
                                    }
                                }
                                // 2) 叠加所有开启表情的独立参数
                                var allParams = [];
                                activeList.forEach(function(idx) {
                                    if (idx >= 0 && idx < actions.length && actions[idx].type === 'expression') {
                                        var cached = window.__live2d_expParams && window.__live2d_expParams[idx];
                                        if (cached && cached.length > 0) {
                                            cached.forEach(function(p) { allParams.push(p); });
                                        }
                                    }
                                });
                                if (window.live2d && window.live2d.setParameterById) {
                                    allParams.forEach(function(p) { window.live2d.setParameterById(p.Id, p.Value); });
                                }
                                localStorage.setItem(stateKey, JSON.stringify(activeList));
                                showTips(pos >= 0 ? '表情已关闭' : '表情: ' + action.name);
                            }
                        }
                    }
                }
            });

            btnHitokoto.addEventListener('click', async function() {
                const text = await fetchHitokoto();
                showTips(text);
            });

            btnTheme.addEventListener('click', function() {
                toggleTheme();
            });

            btnPhoto.addEventListener('click', function() {
                const canvas = document.getElementById('live2d');
                if (canvas) {
                    // 使用两次 requestAnimationFrame 确保渲染完成
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            try {
                                // 检查 canvas 是否有内容
                                if (canvas.width === 0 || canvas.height === 0) {
                                    console.error('[Live2D Cubism3] Canvas has no size');
                                    showTips('图片生成失败喵！');
                                    return;
                                }
                                
                                // 尝试获取 WebGL 上下文
                                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                                let tempCanvas = null;
                                let ctx = null;
                                
                                if (gl) {
                                    // WebGL canvas - 使用 readPixels 获取像素
                                    const width = canvas.width;
                                    const height = canvas.height;
                                    const pixels = new Uint8Array(width * height * 4);
                                    
                                    // 读取像素数据（WebGL 的 Y 轴是倒置的）
                                    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
                                    
                                    // 创建临时 canvas
                                    tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = width;
                                    tempCanvas.height = height;
                                    ctx = tempCanvas.getContext('2d');
                                    
                                    // 创建 ImageData 并翻转 Y 轴
                                    const imageData = ctx.createImageData(width, height);
                                    for (let y = 0; y < height; y++) {
                                        for (let x = 0; x < width; x++) {
                                            const srcIdx = ((height - y - 1) * width + x) * 4;
                                            const dstIdx = (y * width + x) * 4;
                                            imageData.data[dstIdx] = pixels[srcIdx];
                                            imageData.data[dstIdx + 1] = pixels[srcIdx + 1];
                                            imageData.data[dstIdx + 2] = pixels[srcIdx + 2];
                                            imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
                                        }
                                    }
                                    ctx.putImageData(imageData, 0, 0);
                                } else {
                                    // 2D canvas - 直接绘制
                                    tempCanvas = document.createElement('canvas');
                                    tempCanvas.width = canvas.width;
                                    tempCanvas.height = canvas.height;
                                    ctx = tempCanvas.getContext('2d');
                                    ctx.drawImage(canvas, 0, 0);
                                }
                                
                                // 生成文件名
                                const date = new Date();
                                const fileName = `live2d_${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}.png`;
                                
                                // 创建下载链接
                                const url = tempCanvas.toDataURL('image/png');
                                const blob = dataURLtoBlob(url);
                                const blobUrl = URL.createObjectURL(blob);
                                
                                const a = document.createElement('a');
                                document.body.appendChild(a);
                                a.href = blobUrl;
                                a.download = fileName;
                                a.click();
                                
                                // 清理
                                setTimeout(() => {
                                    URL.revokeObjectURL(blobUrl);
                                    document.body.removeChild(a);
                                }, 100);
                                
                                showTips('图片已保存喵！');
                            } catch (e) {
                                console.error('[Live2D Cubism3] Screenshot error:', e);
                                showTips('截图失败，请重试喵！');
                            }
                        });
                    });
                }
            });
            
            function dataURLtoBlob(dataurl) {
                const arr = dataurl.split(',');
                const mime = arr[0].match(/:(.*?);/)[1];
                const bstr = atob(arr[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], { type: mime });
            }

            btnHide.addEventListener('click', function() {
                const waifu = document.getElementById('waifu');
                if (waifu) {
                    waifu.style.display = 'none';
                    // 创建悬浮窗
                    createFloatingButton();
                }
            });

            // 页面总结：监听来自 content.js 的事件
            window.addEventListener('live2dPageSummary', async function(e) {
                const pageContent = e.detail?.pageContent || '';
                if (!pageContent) {
                    showTips('无法获取页面内容喵~');
                    return;
                }
                showTips('正在总结喵~');
                try {
                    // 读取用户设置的总结规则
                    let summaryRules = '';
                    try {
                        const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        summaryRules = settings.summaryRules || '';
                    } catch (e) {}
                    
                    // 默认规则（始终生效，优先于用户输入）
                    const defaultRule = '自动识别和提取页面主要内容，过滤广告、导航等无关信息';
                    
                    let summaryPrompt;
                    if (summaryRules && summaryRules.trim()) {
                        // 默认规则 > 用户输入规则
                        summaryPrompt = '请用中文总结以下网页内容。\n\n规则：\n- ' + defaultRule + '\n- ' + summaryRules.trim().replace(/\n/g, '\n- ') + '\n- 不使用任何emoji图案表情，可以用颜文字\n\n网页内容：\n\n' + pageContent;
                    } else {
                        summaryPrompt = '请用中文简洁地总结以下网页内容。\n\n规则：\n- ' + defaultRule + '\n- 不使用任何emoji图案表情，可以用颜文字\n\n先显示页面标题，然后用每句摘要列出关键要点。\n\n网页内容：\n\n' + pageContent;
                    }
                    const response = await window.Live2DAI.getAIResponse(summaryPrompt);
                    // 通过自定义事件将结果发送给 content.js（弹窗显示、缓存复用）
                    const resultEvent = new CustomEvent('live2dShowSummary', {
                        detail: { summary: response, pageContent: pageContent }
                    });
                    window.dispatchEvent(resultEvent);
                    showTips('已生成总结喵~');
                } catch (error) {
                    console.error('[Live2D Page Summary] API 调用失败:', error);
                    showTips(error.message || '页面总结失败，请稍后再试喵~');
                }
            });

            // 页面总结问答：监听来自 content.js 的提问（三步回答：总结→页面→网络搜索）
            window.addEventListener('live2dPageSummaryQuestion', async function(e) {
                const question = e.detail?.question || '';
                const summary = e.detail?.summary || '';
                const pageContent = e.detail?.pageContent || '';
                if (!question || !summary) return;
                
                try {
                    // 第1步：用总结 + 页面全文（带段落编号）尝试回答
                    var paraText = '';
                    if (pageContent) {
                        var paragraphs = pageContent.split('\n').filter(function(p) { return p.trim(); });
                        paraText = paragraphs.map(function(p, i) { return '[P' + (i + 1) + '] ' + p; }).join('\n');
                    }

                    var firstPrompt = '基于以下信息回答用户的问题。\n\n请用中文回答，详细、清晰，不使用任何emoji图案表情（可以用颜文字）。\n\n【信息层级】\n先看「页面总结」，如果总结中有相关内容则用总结回答，不要添加 @标注。\n如果总结中没有足够信息，在「网页原文」中搜索相关内容，只标注最关键的1-2个段落来源（如 @12 表示引用第12段，@12-@15 表示第12到15段）。注意：使用 @12 格式而非 @P12 格式。\n【严格规则】回答中出现的 @数字 总数不得超过2个。不允许出现连续的 @标注，例如「@12@13@14」或大量「@12-@198」这种大范围标注都禁止。\n如果以上两者都无法回答，请在回答末尾输出：__NEED_SEARCH__||搜索关键词\n\n页面总结：\n' + summary;
                    if (paraText) {
                        firstPrompt += '\n\n网页原文（每段带编号[P数字]）：\n' + paraText;
                    }
                    firstPrompt += '\n\n用户问题：\n' + question;

                    var response = await window.Live2DAI.getAIResponse(firstPrompt);
                    
                    // 后处理：限制 @数字 标注数量不超过2个，过多的则折叠为范围或移除
                    response = limitAnnotationCount(response, 2);

                    // 检查是否需要网络搜索
                    var searchMatch = response.match(/__NEED_SEARCH__\|\|(.+)/);
                    if (searchMatch) {
                        var searchQuery = searchMatch[1].trim();
                        console.log('[Live2D Page Summary] Need web search for:', searchQuery);
                        
                        // 执行 DuckDuckGo 搜索
                        var searchResults = '';
                        try {
                            var searchUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(searchQuery) + '&format=json&no_html=1&skip_disambig=1';
                            var searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(10000) });
                            if (searchResp.ok) {
                                var searchData = await searchResp.json();
                                var results = [];
                                
                                // DuckDuckGo Instant Answer
                                if (searchData.AbstractText) {
                                    results.push('[来源 ' + (searchData.AbstractSource || 'duckduckgo') + '] ' + searchData.AbstractText);
                                }
                                // Related topics
                                if (searchData.RelatedTopics && searchData.RelatedTopics.length > 0) {
                                    for (var ri = 0; ri < Math.min(searchData.RelatedTopics.length, 5); ri++) {
                                        var rt = searchData.RelatedTopics[ri];
                                        if (rt.Text) {
                                            results.push('[来源 ' + (rt.FirstURL ? extractDomain(rt.FirstURL) : 'web') + '] ' + rt.Text);
                                        }
                                        if (rt.Topics) {
                                            for (var ti = 0; ti < Math.min(rt.Topics.length, 3); ti++) {
                                                if (rt.Topics[ti].Text) {
                                                    results.push('[来源 ' + (rt.Topics[ti].FirstURL ? extractDomain(rt.Topics[ti].FirstURL) : 'web') + '] ' + rt.Topics[ti].Text);
                                                }
                                            }
                                        }
                                    }
                                }
                                if (results.length === 0 && searchData.Answer) {
                                    results.push('[来源 duckduckgo] ' + searchData.Answer);
                                }
                                searchResults = results.join('\n') || '未找到相关搜索结果。';
                            } else {
                                searchResults = '搜索服务暂时不可用。';
                            }
                        } catch (searchErr) {
                            console.error('[Live2D Page Summary] Search error:', searchErr);
                            searchResults = '网络搜索失败喵～(' + searchErr.message + ')';
                        }

                        // 第2步：用搜索结果再次回答
                        var secondPrompt = '基于以下搜索结果回答用户的问题。\n\n规则：\n- 用中文回答，详细、清晰，不使用任何emoji图案表情（可以用颜文字）\n- 引用来源时用 [来源 域名] 标注\n- 如果搜索结果无法回答问题，如实说明\n\n用户问题：\n' + question + '\n\n搜索结果：\n' + searchResults;

                        response = await window.Live2DAI.getAIResponse(secondPrompt);
                    }

                    window.dispatchEvent(new CustomEvent('live2dPageSummaryAnswer', {
                        detail: { answer: response }
                    }));
                } catch (error) {
                    console.error('[Live2D Page Summary] Q&A API error:', error);
                    window.dispatchEvent(new CustomEvent('live2dPageSummaryAnswer', {
                        detail: { answer: 'AI 回答失败喵～' + (error.message || '请稍后再试') }
                    }));
                }
            });

            // 提取域名
            function extractDomain(url) {
                try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return url; }
            }

            // 限制回答中 @数字 标注的数量，超过 maxCount 的替换为范围或移除
            function limitAnnotationCount(text, maxCount) {
                // 收集所有 @数字 和 @数字-@数字 标注（含 @P 格式）
                var annotations = [];
                text.replace(/(?:@|§)P?(\d+)(?:\s*[-–—]\s*(?:@|§)?P?(\d+))?/g, function(m, s, e) {
                    annotations.push({ match: m, start: parseInt(s, 10), end: e ? parseInt(e, 10) : parseInt(s, 10) });
                    return m;
                });
                
                if (annotations.length <= maxCount) return text;
                
                // 大量连续标注 → 替换为 @起始-@结束
                var first = annotations[0];
                var last = annotations[annotations.length - 1];
                
                var allConsecutive = true;
                for (var i = 1; i < annotations.length; i++) {
                    if (annotations[i].start !== annotations[i-1].end + 1 &&
                        annotations[i].start !== annotations[i-1].start + 1) {
                        allConsecutive = false;
                        break;
                    }
                }
                
                // 用计数变量逐次替换
                var count = 0;
                var total = annotations.length;
                var rangeStr = allConsecutive ? '@' + first.start + '-@' + last.start : annotations[0].match;
                
                return text.replace(/(?:@|§)P?(\d+)(?:\s*[-–—]\s*(?:@|§)?P?(\d+))?/g, function(m, s, e) {
                    count++;
                    if (count === 1) {
                        return rangeStr;
                    }
                    return '';
                });
            }

            // 接收来自 content.js 的提示显示请求
            window.addEventListener('live2dShowTips', function(e) {
                const text = e.detail?.text || '';
                if (text) {
                    showTips(text);
                }
            });
            
            // 创建悬浮窗
            function createFloatingButton() {
                // 清理旧的悬浮窗
                const oldFloatBtn = document.getElementById('waifu-float');
                if (oldFloatBtn) {
                    oldFloatBtn.remove();
                }
                
                // 根据看板娘位置决定悬浮窗位置和方向
                let floatPosition = '';
                let arrowIcon = '▶';
                
                if (currentPosition.includes('left')) {
                    // 看板娘在左边，悬浮窗在左边
                    floatPosition = 'left: 20px; right: auto;';
                    arrowIcon = '▶';
                } else if (currentPosition.includes('right')) {
                    // 看板娘在右边，悬浮窗在右边
                    floatPosition = 'right: 20px; left: auto;';
                    arrowIcon = '◀';
                } else if (currentPosition === 'center') {
                    // 中心位置，默认右边
                    floatPosition = 'right: 20px; left: auto;';
                    arrowIcon = '◀';
                }
                
                // 垂直位置
                let initialTransform = '';
                if (currentPosition.includes('top')) {
                    floatPosition += ' top: 50px; bottom: auto;';
                } else if (currentPosition.includes('bottom')) {
                    floatPosition += ' bottom: 20px; top: auto;';
                } else if (currentPosition === 'center') {
                    floatPosition += ' top: 50%;';
                    initialTransform = 'translateY(-50%)';
                }
                
                // 创建新悬浮窗
                const floatBtn = document.createElement('div');
                floatBtn.id = 'waifu-float';
                
                // 基础样式
                let baseStyle = `
                    position: fixed;
                    ${floatPosition}
                    width: 50px;
                    height: 50px;
                    background: rgba(0, 0, 0, 0.6);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 99999;
                    color: white;
                    font-size: 24px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                `;
                
                if (initialTransform) {
                    baseStyle += ` transform: ${initialTransform};`;
                }
                
                floatBtn.style.cssText = baseStyle;
                floatBtn.innerHTML = arrowIcon;
                floatBtn.title = '显示看板娘';
                
                // 鼠标悬停效果
                floatBtn.addEventListener('mouseenter', function() {
                    this.style.background = 'rgba(0, 0, 0, 0.8)';
                    if (initialTransform) {
                        this.style.transform = initialTransform + ' scale(1.1)';
                    } else {
                        this.style.transform = 'scale(1.1)';
                    }
                });
                floatBtn.addEventListener('mouseleave', function() {
                    this.style.background = 'rgba(0, 0, 0, 0.6)';
                    if (initialTransform) {
                        this.style.transform = initialTransform;
                    } else {
                        this.style.transform = 'none';
                    }
                });
                
                // 点击显示看板娘
                floatBtn.addEventListener('click', function() {
                    const waifu = document.getElementById('waifu');
                    if (waifu) {
                        waifu.style.display = 'block';
                        this.style.display = 'none';
                    }
                });
                
                document.body.appendChild(floatBtn);
                console.log('[Live2D Cubism3] Floating button created at position:', currentPosition);
            }

            btnSwitch.addEventListener('click', function() {
                showTips('请在扩展设置中切换模型喵~');
            });

            // 检查成就是否已经解锁过
            try {
                if (browserAPI.storage && browserAPI.storage.local) {
                    browserAPI.storage.local.get(['live2d-achievement-unlocked'], (result) => {
                        if (result['live2d-achievement-unlocked']) {
                            achievementShown = true;
                            console.log('[Live2D Achievement] Already unlocked');
                        }
                    });
                } else {
                    const isUnlocked = localStorage.getItem('live2d-achievement-unlocked');
                    if (isUnlocked) {
                        achievementShown = true;
                        console.log('[Live2D Achievement] Already unlocked');
                    }
                }
            } catch (e) {
                console.log('[Live2D Achievement] Storage init check failed', e);
                const isUnlocked = localStorage.getItem('live2d-achievement-unlocked');
                if (isUnlocked) {
                    achievementShown = true;
                }
            }

            // ============================================================
            // Cubism3 动作快捷键系统
            // ============================================================
            // startMotion / setExpression 方法已由 live2d-sdk.js 暴露
            
            // 新模型加载时清除旧缓存
            try { localStorage.removeItem('live2dModelActions'); } catch(e) {}
            window.__live2d_actions = [];
            
            // 发现模型动作并设置快捷键
            var _allActions = [];
            function pushActions(acts) { if (acts && acts.length > 0) { _allActions = _allActions.concat(acts); } }
            function finalizeActions() {
                if (_allActions.length === 0) return;
                var seen = {}, merged = [];
                _allActions.forEach(function(a) { var k = a.type + ':' + a.name; if (!seen[k]) { seen[k] = true; var na = JSON.parse(JSON.stringify(a)); na.sortOrder = merged.length + 1; merged.push(na); } });
                // expression13 保留 + 名称映射（绯英，下移一位）
                if (cubism3Model.indexOf('Honkai_StarRail/feiying') >= 0) {
                    var feiyingNames = {'expression13':'空','expression12':'尾巴','expression1':'人类','expression10':'智慧','expression11':'狐耳','expression2':'新狐耳','expression3':'脸红','expression4':'星星眼','expression5':'拜托拜托','expression6':'爱心眼','expression7':'生气','expression8':'无语','expression9':'叼面包'};
                    merged.forEach(function(a) {
                        if (a.type === 'expression' && feiyingNames[a.name]) a.name = feiyingNames[a.name];
                        if (a.file === '14哭哭.exp3.json') a.name = '没脸见人了';
                    });
                }
                // 按原始顺序保留，特殊排最后
                var normActs = [], specActs = [];
                merged.forEach(function(a) { (a.type === 'special' ? specActs : normActs).push(a); });
                merged = normActs.concat(specActs);
                // 重新分配 sortOrder（从1开始）
                merged.forEach(function(a, idx) { a.sortOrder = idx + 1; });

                // 找 expression13 并异步验证是否为水印去除表情（含 Param196）
                var wmAction = null;
                for (var wi = 0; wi < merged.length; wi++) {
                    if ((merged[wi].sdkName || merged[wi].name) === 'expression13' && merged[wi].type === 'expression') {
                        wmAction = merged[wi];
                        break;
                    }
                }
                // 移除 expression13 和所有 motion
                merged = merged.filter(function(a) {
                    if (a.type === 'motion') return false;
                    var check = a.sdkName || a.name;
                    return !(a.type === 'expression' && check === 'expression13');
                });
                // 异步验证水印参数
                if (wmAction && wmAction.file) {
                    (function(wmFile) {
                        fetch(wmFile).then(function(r) {
                            if (!r.ok) return null;
                            return r.json();
                        }).then(function(d) {
                            if (d && d.Parameters && d.Parameters.some(function(p) { return p.Id === 'Param196'; })) {
                                merged.push({ type: 'special', name: '水印', id: 'watermark', combo: 'ctrl+alt+F1' });
                                // 更新 localStorage 和 __live2d_actions
                                window.__live2d_actions = merged;
                                try { localStorage.setItem('live2dModelActions', JSON.stringify(merged)); } catch(e) {}
                            }
                        }).catch(function() {});
                    })(modelPath + wmAction.file);
                }
                // 只有有实际表情的模型才添加特殊按键
                if (merged.some(function(a) { return a.type === 'expression'; })) {
                    merged.push({ type: 'special', name: '重置', id: 'reset', combo: 'ctrl+alt+F2' });
                }
                window.__live2d_actions = merged;
                try { localStorage.setItem('live2dModelActions', JSON.stringify(merged)); } catch(e) {}
                // 预缓存所有表情的参数
                window.__live2d_expParams = [];
                merged.forEach(function(a, i) {
                    if (a.type === 'expression' && a.file) {
                        fetch(modelPath + a.file).then(function(r) {
                            if (!r.ok) return null;
                            return r.json();
                        }).then(function(d) {
                            window.__live2d_expParams[i] = (d && d.Parameters) || [];
                        }).catch(function() {});
                    }
                });
                // 恢复上次保存的表情状态
                setTimeout(function() {
                    try {
                        var raw = localStorage.getItem('live2d_activeExpressionList');
                        if (raw) {
                            var savedList = JSON.parse(raw);
                            if (Array.isArray(savedList) && window.live2d) {
                                // 用 setExpression 激活最近的表情（确保表达式系统恢复）
                                if (savedList.length > 0) {
                                    var lastIdx = savedList[savedList.length - 1];
                                    if (lastIdx >= 0 && lastIdx < merged.length && merged[lastIdx].type === 'expression') {
                                        var lastAct = merged[lastIdx];
                                        if (window.live2d.setExpression) {
                                            window.live2d.setExpression(lastAct.sdkName || lastAct.name);
                                        }
                                    }
                                }
                                // 叠加所有表情的参数
                                var restoreParams = [];
                                savedList.forEach(function(idx) {
                                    if (idx >= 0 && idx < merged.length && merged[idx].type === 'expression') {
                                        var cached = window.__live2d_expParams && window.__live2d_expParams[idx];
                                        if (cached && cached.length > 0) {
                                            cached.forEach(function(p) { restoreParams.push(p); });
                                        }
                                    }
                                });
                                restoreParams.forEach(function(p) { window.live2d.setParameterById(p.Id, p.Value); });
                            }
                        }
                        // 恢复水印状态
                        if (localStorage.getItem('live2d_watermarkHidden') === '1' && window.live2d) {
                            if (window.live2d.setExpression) window.live2d.setExpression('expression13');
                            window.live2d.setParameterById('Param196', 1);
                            window.live2d.setParameterById('Param197', 0);
                            window.live2d.setParameterById('Param198', 0);
                            window.live2d.setParameterById('Param199', 1);
                        }
                    } catch(e) {}
                }, 800);
                console.log('[Live2D Cubism3] Discovered', merged.length, 'actions for', cubism3Model);
                merged.forEach(function(a, i) {
                    var key = ['1','2','3','4','5','6','7','8','9','0','-','='][i] || '';
                    console.log('[Live2D Cubism3]  Shortcut', key, '→', a.name);
                });
            }
            window.__live2d_discoverActions = function discoverModelActions() {
                var modelName = cubism3Model.split('/').pop();
                var modelDir = modelPath;
                // actions_index.json 在 indexes/ 目录下（由 build.js 生成）
                var indexDir = modelDir.replace('/models_Cubism3/', '/indexes/');
                // 1. 轮询 SDK，持续收集已加载的动作
                var sdkTimer = setInterval(function() {
                    if (window.live2d && window.live2d.getModelActions) {
                        pushActions(window.live2d.getModelActions());
                    }
                }, 400);
                // 2. 2.5 秒后停止轮询，开始尝试其他来源
                setTimeout(function() {
                    clearInterval(sdkTimer);
                    // 3. actions_index.json（由 build.js 生成到 indexes/ 目录）
                    fetch(indexDir + 'actions_index.json')
                        .then(function(r) { if (!r.ok) throw 'no idx'; return r.json(); })
                        .then(function(list) {
                            if (list && list.length > 0) {
                                pushActions(list.map(function(item) {
                                    var name = item.file.replace(/\.(motion3|exp3)\.json$/, '');
                                    return item.type === 'motion'
                                        ? { type:'motion', group:name, index:0, name:name, file:item.file }
                                        : { type:'expression', name:name, file:item.file };
                                }));
                            }
                        })
                        .catch(function() {})
                        .then(function() {
                            // 4. model.json（自定义配置）
                            return fetch(modelDir + 'model.json')
                                .then(function(r) { if (!r.ok) throw 'no'; return r.json(); })
                                .then(function(config) {
                                    // 设置 HitArea 标志（供 popup "点击区域"开关使用）
                                    if (config.HitAreas && config.HitAreas.length > 0) {
                                        try { localStorage.setItem('live2d_hasHitAreas', 'true'); } catch(exx) {}
                                    }
                                    var acts = [];
                                    if (config.FileReferences && config.FileReferences.Motions) {
                                        var addedSwitches = {};
                                        Object.keys(config.FileReferences.Motions).forEach(function(g) {
                                            config.FileReferences.Motions[g].forEach(function(m, i) {
                                                if (m.Sound && !m.File && !m.Expression) {
                                                    var name2 = g.replace(/^Tap/, '').replace(/[0-9]/g, '');
                                                    var tModel = '';
                                                    if (name2.indexOf('爱芮') >= 0) tModel = 'Zenless_Zone_Zero/irui';
                                                    else if (name2.indexOf('南宫') >= 0) tModel = 'Zenless_Zone_Zero/nangongyu';
                                                    else if (name2.indexOf('千夏') >= 0) tModel = 'Zenless_Zone_Zero/qianxia';
                                                    if (tModel && !addedSwitches[tModel]) {
                                                        addedSwitches[tModel] = true;
                                                        acts.push({ type: 'expression', name: '[切换]' + name2 });
                                                    }
                                                } else {
                                                    acts.push({ type: 'motion', group: g, index: i, name: m.Name || g, file: m.File });
                                                }
                                            });
                                        });
                                    }
                                    if (config.FileReferences && config.FileReferences.Expressions) {
                                        config.FileReferences.Expressions.forEach(function(e) { acts.push({ type:'expression', name:e.Name, file:e.File }); });
                                    }
                                    pushActions(acts);
                                })
                                .catch(function() {})
                                .then(function() {
                                    // 5. 原生 .model3.json
                                    return fetch(modelDir + modelName + '.model3.json')
                                        .then(function(r) { if (!r.ok) throw 'no'; return r.json(); })
                                        .then(function(config) {
                                            var acts = [];
                                            if (config.FileReferences) {
                                                if (config.FileReferences.Motions) {
                                                    Object.keys(config.FileReferences.Motions).forEach(function(g) {
                                                        config.FileReferences.Motions[g].forEach(function(m, i) { acts.push({ type:'motion', group:g, index:i, name:m.Name||g, file:m.File }); });
                                                    });
                                                }
                                                if (config.FileReferences.Expressions) {
                                                    config.FileReferences.Expressions.forEach(function(e) { acts.push({ type:'expression', name:e.Name, file:e.File }); });
                                                }
                                            }
                                            pushActions(acts);
                                        })
                                        .catch(function() {})
                                        .then(function() { finalizeActions(); });
                                });
                        });
                }, 2500);
            };
            window.__live2d_discoverActions();

            if (typeof window.live2d !== 'undefined') {
                try {
                    window.live2d.init();
                    window.live2d.loadModel(modelPath);
                    console.log('[Live2D Cubism3] Model loaded successfully');
                    // 重置 HitArea 标志，由 discoverModelActions 在检测到时重新设置
                    try { localStorage.setItem('live2d_hasHitAreas', 'false'); } catch(exx) {}
                    // 关闭任何残留的线框
                    if (typeof window.stopHitAreaOverlay === 'function') { try { window.stopHitAreaOverlay(); } catch(exx) {} }

                    
                    // 启用拖拽功能
                    const waifu = document.getElementById('waifu');
                    const dragEnabled = settings.drag || false;
                    enableDragging(waifu, dragEnabled);
                } catch (e) {
                    console.error('[Live2D Cubism3] Failed to load model:', e);
                    showTips('模型加载失败，请尝试切换其他模型喵！');
                }
                
                // 如果是全部位置模式，复制canvas到其他位置
                if (position === 'all') {
                    const mainCanvas = document.getElementById('live2d');
                    const otherCanvasElements = document.querySelectorAll('canvas[id^="live2d-"]');
                    
                    // 过滤出真正的canvas元素
                    const otherCanvases = Array.from(otherCanvasElements).filter(el => el.getContext);
                    
                    console.log('[Live2D Cubism3] All positions mode enabled');
                    console.log('[Live2D Cubism3] Main canvas:', mainCanvas);
                    console.log('[Live2D Cubism3] Other canvases count:', otherCanvases.length);
                    otherCanvases.forEach((canvas, i) => {
                        console.log('[Live2D Cubism3] Canvas', i, ':', canvas.id, canvas.getBoundingClientRect());
                    });
                    
                    // 定期复制主canvas内容到其他canvas
                    window.__cubism3Original.mirrorInterval = setInterval(() => {
                        if (mainCanvas && mainCanvas.width > 0 && mainCanvas.getContext) {
                            otherCanvases.forEach(canvas => {
                                if (canvas.getContext) {
                                    const ctx = canvas.getContext('2d');
                                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                                    ctx.drawImage(mainCanvas, 0, 0);
                                }
                            });
                        }
                    }, 50); // 每50ms复制一次
                    
                    console.log('[Live2D Cubism3] Mirroring to', otherCanvases.length, 'additional positions');
                }

                setTimeout(function() {
                    // 调试：打印气泡和waifu的位置
                    const waifu = document.getElementById('waifu');
                    if (waifu && tipsEl) {
                        console.log('[Live2D Debug] Waifu container rect:', waifu.getBoundingClientRect());
                        console.log('[Live2D Debug] Tips element rect:', tipsEl.getBoundingClientRect());
                        console.log('[Live2D Debug] Tips computed style:', window.getComputedStyle(tipsEl).cssText);
                        console.log('[Live2D Debug] Waifu computed style:', window.getComputedStyle(waifu).position);
                    }
                    fetchHitokoto().then(text => {
                        const isStrinova = currentModelName.startsWith('Strinova/');
                        if (isStrinova) {
                            text = addMeowSuffix(text);
                        }
                        showTips(text);
                    });
                }, 2000);

                preCacheHitokoto();
                
                // 监听 SPA 页面切换，清除残留的图片气泡
                var _lastUrl = location.href;
                setInterval(function() {
                    if (location.href !== _lastUrl) {
                        _lastUrl = location.href;
                        if (tipsTimeout) clearTimeout(tipsTimeout);
                        if (tipsEl._hideTimeout) { clearTimeout(tipsEl._hideTimeout); tipsEl._hideTimeout = null; }
                        tipsEl.classList.remove('waifu-tips-active');
                        tipsEl.classList.remove('waifu-tips-image');
                        tipsEl.style.pointerEvents = 'none';
                        tipsTimeout = null;
                        tipsEl._hideTimeout = null;
                    }
                }, 500);

                // 为所有canvas添加点击事件
                const allCanvasElements = document.querySelectorAll('[id^="live2d"]');
                allCanvasElements.forEach(canvas => {
                    canvas.addEventListener('click', async function(e) {
                    // 触摸关闭时不进行任何交互
                    if (localStorage.getItem('live2d_touchEnabled') === 'false') { return; }
                    // 如果图片气泡正在显示，忽略点击（打开原图由气泡自己的 handler 处理）
                    if (tipsEl && tipsEl.classList.contains('waifu-tips-image')) {
                        e.stopPropagation();
                        return;
                    }
                    // ===== HitArea 点击检测（用 drawable ID 直接检测） =====
                    try {
                        var haUrl2 = modelPath + 'model.json';
                        console.log('[HitArea] modelPath:', modelPath);
                        var haResp2 = await fetch(haUrl2, { cache: 'force-cache' }).catch(function(){ console.log('[HitArea] fetch fail'); });
                        console.log('[HitArea] fetch ok:', !!haResp2, haResp2 ? haResp2.status : 0);
                        if (haResp2 && haResp2.ok) {
                            var haCfg2 = await haResp2.json();
                            console.log('[HitArea] json keys:', Object.keys(haCfg2), 'has HitAreas:', !!haCfg2.HitAreas);
                            if (haCfg2 && haCfg2.HitAreas && haCfg2.HitAreas.length > 0) {
                                try { localStorage.setItem('live2d_hasHitAreas', 'true'); } catch(exx) {}
                                var mI2 = typeof window.live2d.getModelInstance === 'function' ? window.live2d.getModelInstance() : null;
                                if (localStorage.getItem('live2d_hitAreaOverlay') === 'true') {
                                    if (typeof startHitAreaOverlay === 'function') {
                                        try { startHitAreaOverlay(haCfg2, mI2); } catch(exx2) {}
                                    }
                                }
                                if (mI2 && mI2.getModelMatrix && mI2._model) {
                                    var htc = typeof window.live2d.hitTestCoord === 'function' ? window.live2d.hitTestCoord(e.clientX, e.clientY) : null;
                                    console.log('[HitArea] htc:', htc);
                                    if (htc) {
                                        var tx2 = htc.x;
                                        var ty2 = htc.y;
                                        var _hBestDist = Infinity, _hBestArea = null;
                                        var cvs = document.getElementById('live2d');
                                        var cRect = cvs ? cvs.getBoundingClientRect() : null;
                                        // 点击坐标换算为 canvas 内部分辨率（线框使用 canvas.width 而非 CSS 宽）
                                        var pxCSS = cRect ? e.clientX - cRect.left : 0;
                                        var pyCSS = cRect ? e.clientY - cRect.top : 0;
                                        var px = cvs ? pxCSS * (cvs.width / cRect.width) : pxCSS;
                                        var py = cvs ? pyCSS * (cvs.height / cRect.height) : pyCSS;
                                        for (var hi2 = 0; hi2 < haCfg2.HitAreas.length; hi2++) {
                                            var ha2 = haCfg2.HitAreas[hi2];
                                            var drawId2 = ha2.Id;
                                            var mg2 = ha2.Motion || (ha2.Name ? "Tap" + ha2.Name : drawId2) || drawId2;
                                            if (drawId2 && mI2._model) {
                                                var mi2 = -1;
                                                var dc2 = mI2._model.getDrawableCount();
                                                for (var di2 = 0; di2 < dc2; di2++) {
                                                    var dd2 = mI2._model.getDrawableId(di2);
                                                    var dnVal = dd2 && dd2._id ? dd2._id : dd2;
                                                    var dn2 = dnVal && dnVal.s ? dnVal.s : String(dnVal);
                                                    if (dn2 === drawId2) { mi2 = di2; break; }
                                                }
                                                if (mi2 >= 0) {
                                                    var vc2 = mI2._model.getDrawableVertexCount(mi2);
                                                    var verts2 = mI2._model.getDrawableVertices(mi2);
                                                    if (verts2 && vc2 > 0 && verts2.length >= 2) {
                                                        var nx2 = verts2[0], ux2 = verts2[0], ny2 = verts2[1], uy2 = verts2[1];
                                                        for (var ci2 = 1; ci2 < vc2; ci2++) {
                                                            var hx2 = verts2[ci2 * 2];
                                                            var hy2 = verts2[ci2 * 2 + 1];
                                                            if (hx2 < nx2) nx2 = hx2;
                                                            if (hx2 > ux2) ux2 = hx2;
                                                            if (hy2 < ny2) ny2 = hy2;
                                                            if (hy2 > uy2) uy2 = hy2;
                                                        }
                                                        // 用和线框相同的变换计算画布像素坐标
                                                        var mm2 = mI2.getModelMatrix();
                                                        var dts2 = typeof window.live2d.getDeviceToScreen === 'function' ? window.live2d.getDeviceToScreen() : null;
                                                        var live2dCanvas = document.getElementById('live2d');
                                                        var scaleFix = live2dCanvas ? live2dCanvas.width / 450 : 1;
                                                        if (scaleFix < 0.1) scaleFix = 1;
                                                        var cpx1 = dts2 ? dts2.invertTransformX(mm2.transformX(nx2)) * scaleFix : nx2;
                                                        var cpy1 = dts2 ? dts2.invertTransformY(mm2.transformY(ny2)) * scaleFix : ny2;
                                                        var cpx2 = dts2 ? dts2.invertTransformX(mm2.transformX(ux2)) * scaleFix : ux2;
                                                        var cpy2 = dts2 ? dts2.invertTransformY(mm2.transformY(uy2)) * scaleFix : uy2;
                                                        var minPx = Math.min(cpx1, cpx2), maxPx = Math.max(cpx1, cpx2);
                                                        var minPy = Math.min(cpy1, cpy2), maxPy = Math.max(cpy1, cpy2);
                                                        console.log('[HitArea] px:', drawId2, 'rect:', minPx.toFixed(0), maxPx.toFixed(0), minPy.toFixed(0), maxPy.toFixed(0), 'click:', px.toFixed(0), py.toFixed(0));
                                                        if (minPx <= px && px <= maxPx && minPy <= py && py <= maxPy) {
                                                            var area2 = (maxPx - minPx) * (maxPy - minPy);
                                                            // 小框优先：面积越小优先级越高，同面积选最近中心
                                                            var cX2 = (nx2 + ux2) / 2, cY2 = (ny2 + uy2) / 2;
                                                            var d2 = (tx2 - cX2) * (tx2 - cX2) + (ty2 - cY2) * (ty2 - cY2);
                                                            if (!_hBestArea || area2 < _hBestArea.area || (area2 === _hBestArea.area && d2 < _hBestDist)) {
                                                                _hBestDist = d2;
                                                                _hBestArea = { id:drawId2, mg:mg2, area: area2 };
                                                            }
                                                            continue;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        if (_hBestArea) {
                                            console.log('[HitArea] HIT!', _hBestArea.id, _hBestArea.mg);
                                            var _hMotionOn = localStorage.getItem('live2d_hitAreaMotion') !== 'false';
                                            var _hSoundOn = localStorage.getItem('live2d_hitAreaSound') !== 'false';
                                            if (_hMotionOn) { window.live2d.startMotion(_hBestArea.mg, 0, 3); }
                                            if (_hSoundOn && haCfg2.FileReferences && haCfg2.FileReferences.Motions && haCfg2.FileReferences.Motions[_hBestArea.mg] && haCfg2.FileReferences.Motions[_hBestArea.mg][0] && haCfg2.FileReferences.Motions[_hBestArea.mg][0].Sound) {
                                                var delayMs = haCfg2.FileReferences.Motions[_hBestArea.mg][0].SoundDelay || 0;
                                                var soundFn = function() {
                                                    if (window.__live2d_lastAudio) { try { window.__live2d_lastAudio.pause(); window.__live2d_lastAudio = null; } catch(ex){} }
                                                    var vol = parseInt(localStorage.getItem('live2d_hitAreaVolume')) || 50;
                                                    var au = new Audio(modelPath + haCfg2.FileReferences.Motions[_hBestArea.mg][0].Sound);
                                                    au.volume = Math.min(1, Math.max(0, vol / 100));
                                                    window.__live2d_lastAudio = au;
                                                    window.__live2d_lastAudio._vol = vol;
                                                    try { au.play(); } catch(ex){}
                                                };
                                                // 监听音量实时变化
                                                if (!window.__live2d_volumeListener) {
                                                    window.__live2d_volumeListener = true;
                                                    window.addEventListener('live2d-volume-change', function(ev) {
                                                        if (ev.detail && ev.detail.volume !== undefined && window.__live2d_lastAudio) {
                                                            var v = Math.min(1, Math.max(0, ev.detail.volume / 100));
                                                            window.__live2d_lastAudio.volume = v;
                                                        }
                                                    });
                                                }
                                                if (delayMs > 0) {
                                                    console.log('[HitArea] 音效延迟' + delayMs + 'ms播放');
                                                    if (window.__live2d_delayTimer) { clearTimeout(window.__live2d_delayTimer); }
                                                    window.__live2d_delayTimer = setTimeout(soundFn, delayMs);
                                                } else {
                                                    if (window.__live2d_delayTimer) { clearTimeout(window.__live2d_delayTimer); }
                                                    soundFn();
                                                }
                                            }
                                            return;
                                        }
                                    }
                                }
                            }
                        }
                    } catch(ex){ console.log('[HitArea] exception:', ex); }
                    // ===== =====
                    // 先检查是否开启 AI，如果开启则处理抚摸交互并返回
                    const latestSettings = await waitForSettings(2000);
                    try {
                        const latest = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                        Object.assign(latestSettings, latest);
                    } catch (e) {}
                    
                    if (latestSettings.aiEnabled) {
                        await handlePetInteraction();
                        return;
                    }
                    
                    // AI 未开启时，执行原有的一言逻辑
                    let displayText = cachedHitokoto;
                    let isMeowQuote = false;
                    const isStrinova = currentModelName.startsWith('Strinova/');
                    
                    console.log('[Live2D Achievement] Click event triggered, currentModelName:', currentModelName, 'isStrinova:', isStrinova, 'achievementShown:', achievementShown);
                    
                    // 成就解锁检测（仅Strinova模型）
                    if (isStrinova && !achievementShown) {
                        const now = Date.now();
                        console.log('[Live2D Achievement] Click detected, count:', clickCount + 1, 'lastClickTime:', lastClickTime, 'now - lastClickTime:', now - lastClickTime);
                        
                        // 检查是否在3秒内的连续点击
                        if (now - lastClickTime < CLICK_WINDOW) {
                            clickCount++;
                            
                            // 检查是否达到5次点击
                            if (clickCount >= CLICK_THRESHOLD) {
                                console.log('[Live2D Achievement] Threshold reached! Checking storage...');
                                
                                // 检查成就是否已解锁过
                                checkAchievementUnlocked((canUnlock) => {
                                    console.log('[Live2D Achievement] Can unlock:', canUnlock);
                                    if (canUnlock) {
                                        console.log('[Live2D Achievement] Showing achievement!');
                                        showAchievementNotification();
                                        markAchievementUnlocked();
                                        achievementShown = true;
                                    } else {
                                        console.log('[Live2D Achievement] Already unlocked before');
                                    }
                                });
                            }
                        } else {
                            clickCount = 1; // 超过3秒，重置计数
                            console.log('[Live2D Achievement] Reset count to 1 (timeout)');
                        }
                        lastClickTime = now;
                        console.log('[Live2D Achievement] Updated count:', clickCount, 'lastClickTime:', lastClickTime);
                    }
                    
                    console.log('[Live2D Tips] Before Strinova check - displayText:', displayText, 'currentMeowQuotes.length:', currentMeowQuotes.length);
                    
                    if (isStrinova && currentMeowQuotes.length > 0) {
                        console.log('[Live2D Tips] Strinova model detected, applying meow logic');
                        // 20%概率触发喵言语录
                        if (Math.random() < 0.2) {
                            displayText = currentMeowQuotes[Math.floor(Math.random() * currentMeowQuotes.length)];
                            isMeowQuote = true;
                            console.log('[Live2D Tips] Using meow quote:', displayText);
                        }
                        // 100%概率给普通一言添加喵后缀（喵言语录本身已有喵，不需要再加）
                        if (!isMeowQuote) {
                            displayText = addMeowSuffix(displayText);
                            console.log('[Live2D Tips] Added meow suffix:', displayText);
                        }
                    }
                    
                    console.log('[Live2D Tips] tipsEl exists:', !!tipsEl, 'displayText:', displayText);
                    showTips(displayText);
                    const text = await fetchHitokoto();
                    cachedHitokoto = text;
                    });
                });
                
                // 启动自动触发一言（仅Strinova模型）
                startAutoQuote();
            } else {
                console.error('[Live2D Cubism3] window.live2d not available');
            }

        } catch (error) {
            console.error('[Live2D Cubism3] Initialization error:', error);
        }
    }

    // 监听拖拽状态更新事件
    window.addEventListener('live2dUpdateDrag', function(event) {
        console.log('[Live2D Cubism3] Received drag update:', event.detail);
        if (currentWaifuElement) {
            enableDragging(currentWaifuElement, event.detail.drag);
        }
    });
    
    // 监听拖拽限位更新事件
    window.addEventListener('live2dUpdateDragLimit', function(event) {
        console.log('[Live2D Cubism3] Received drag limit update:', event.detail);
        try {
            var s = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
            s.dragLimit = event.detail.dragLimit;
            localStorage.setItem('live2dExtensionSettings', JSON.stringify(s));
        } catch(e) {}
    });
    
    // 直接从 chrome.storage 同步 dragLimit（绕过 localStorage 同步问题）
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.addListener(function(changes, area) {
            if (area === 'local' && (changes.dragLimit || changes.drag)) {
                try {
                    var s = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
                    if (changes.dragLimit) s.dragLimit = changes.dragLimit.newValue;
                    if (changes.drag) s.drag = changes.drag.newValue;
                    localStorage.setItem('live2dExtensionSettings', JSON.stringify(s));
                } catch(e) {}
            }
        });
    }
    
    // ================================================
    // 页面可见性优化：冻结/解冻 Cubism3 实例
    // ================================================
    
    let cubism3ModelFrozen = false;
    let lastFreezeMode = 'quick';
    let cubism3AnimationFrameId = null;
    let mirrorIntervalId = null;
    let originalAutoQuoteTimer = null;
    let originalModel = null;
    let savedCubism3DisplayStates = {};
    
    // 保存原始的循环引用
    window.__cubism3Original = {
        animationFrame: null,
        mirrorInterval: null,
        autoQuoteTimer: null
    };
    
    function freezeCubism3Model(event) {
        if (cubism3ModelFrozen) return;
        
        const freezeMode = event && event.detail && event.detail.mode ? event.detail.mode : 'quick';
        
        console.log('[Live2D Cubism3] Freezing model for memory optimization, mode:', freezeMode);
        cubism3ModelFrozen = true;
        lastFreezeMode = freezeMode;
        
        // 1. 保存当前显示状态并隐藏 UI 元素
        if (currentWaifuElement) {
            savedCubism3DisplayStates.waifu = currentWaifuElement.style.display;
            currentWaifuElement.style.display = 'none';
        }
        if (currentTipsElement) {
            savedCubism3DisplayStates.tips = currentTipsElement.style.display;
            currentTipsElement.style.display = 'none';
        }
        const waifuToggle = document.getElementById('waifu-toggle');
        if (waifuToggle) {
            savedCubism3DisplayStates.toggle = waifuToggle.style.display;
            waifuToggle.style.display = 'none';
        }
        
        // 2. 停止自动一言
        if (autoQuoteTimer) {
            originalAutoQuoteTimer = autoQuoteTimer;
            clearInterval(autoQuoteTimer);
            autoQuoteTimer = null;
        }
        
        // 3. 停止镜像间隔
        if (window.__cubism3Original.mirrorInterval) {
            clearInterval(window.__cubism3Original.mirrorInterval);
            window.__cubism3Original.mirrorInterval = null;
        }
        
        // 4. 停止渲染循环
        try {
            if (window.live2d) {
                if (window.live2d.stop) window.live2d.stop();
            }
        } catch (e) {
            console.warn('[Live2D Cubism3] Could not pause Live2D SDK:', e);
        }
        
        // 5. full 模式释放 WebGL 上下文（quick 模式不动 Canvas，避免白框）
        if (freezeMode === 'full') {
            try {
                const canvas = document.getElementById('live2d');
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
                    if (gl && gl.getExtension) {
                        const lose = gl.getExtension('WEBGL_lose_context');
                        if (lose) lose.loseContext();
                    }
                }
            } catch (e) {}
            triggerGCForCubism3();
        }
        
        console.log('[Live2D Cubism3] Model frozen, mode:', freezeMode);
    }
        
    function cleanupCubism3CanvasResources() {
        try {
            const canvases = document.querySelectorAll('canvas');
            canvases.forEach(canvas => {
                try {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    // 释放 Canvas
                    canvas.width = 0;
                    canvas.height = 0;
                } catch (e) {
                    // 忽略跨域错误
                }
            });
            console.log('[Live2D Cubism3] Canvas resources cleaned');
        } catch (e) {
            console.warn('[Live2D Cubism3] Canvas cleanup error:', e);
        }
    }
    
    function triggerGCForCubism3() {
        try {
            if (window.gc) {
                setTimeout(function() { window.gc(); }, 50);
            }
        } catch (e) {
            // 忽略
        }
    }
    
    function unfreezeCubism3Model() {
        if (!cubism3ModelFrozen) return;
        
        console.log('[Live2D Cubism3] Unfreezing model');
        cubism3ModelFrozen = false;
        
        // 1. 恢复之前保存的显示状态（如果用户之前手动关闭了看板娘，保持关闭状态）
        if (currentWaifuElement) {
            currentWaifuElement.style.display = savedCubism3DisplayStates.waifu || '';
        }
        if (currentTipsElement) {
            currentTipsElement.style.display = savedCubism3DisplayStates.tips || '';
        }
        const waifuToggle = document.getElementById('waifu-toggle');
        if (waifuToggle) {
            waifuToggle.style.display = savedCubism3DisplayStates.toggle || '';
        }
        
        // 清空保存的显示状态
        savedCubism3DisplayStates = {};
        
        // 2. 重启自动一言
        if (originalAutoQuoteTimer !== null) {
            startAutoQuote();
        }
        
        // 3. 尝试恢复
        if (lastFreezeMode === 'full') {
            // full 模式：重新初始化整个模型
            console.log('[Live2D Cubism3] Full mode - reinitializing model');
            try {
                window.__live2d_cubism3_initialized = false;
                if (window.live2d) {
                    try { window.live2d.releaseInstance(); } catch(e) {}
                }
                var _w = document.getElementById('waifu');
                if (_w) _w.remove();
                var _s = document.getElementById('live2d-cubism3-styles');
                if (_s) _s.remove();
                document.querySelectorAll('canvas[id^="live2d"]').forEach(function(c) { c.remove(); });
                setTimeout(initCubism3, 100);
            } catch (e) {
                console.error('[Live2D Cubism3] Failed to reinitialize:', e);
            }
        } else {
            // quick 模式：直接恢复动画
            try {
                if (window.live2d && window.live2d.start) {
                    window.live2d.start();
                }
                console.log('[Live2D Cubism3] Rendering resumed');
            } catch (e) {
                console.warn('[Live2D Cubism3] Failed to resume rendering:', e);
            }
        }
        
        console.log('[Live2D Cubism3] Model unfrozen and resumed');
    }
    
    function cleanupCubism3Model() {
        console.log('[Live2D Cubism3] Cleaning up model for cleanup request');
        
        // 1. 隐藏 UI 元素
        if (currentWaifuElement) {
            currentWaifuElement.style.display = 'none';
        }
        if (currentTipsElement) {
            currentTipsElement.style.display = 'none';
        }
        const waifuToggle = document.getElementById('waifu-toggle');
        if (waifuToggle) {
            waifuToggle.style.display = 'none';
        }
        
        // 2. 停止自动一言
        if (autoQuoteTimer) {
            clearInterval(autoQuoteTimer);
            autoQuoteTimer = null;
        }
        
        // 3. 停止镜像间隔
        if (window.__cubism3Original.mirrorInterval) {
            clearInterval(window.__cubism3Original.mirrorInterval);
            window.__cubism3Original.mirrorInterval = null;
        }
        
        // 4. 停止渲染 + 释放 WebGL
        try {
            if (window.live2d && window.live2d.stop) {
                window.live2d.stop();
            }
            const l2dCanvas = document.getElementById('live2d');
            if (l2dCanvas) {
                const glCtx = l2dCanvas.getContext('webgl2') || l2dCanvas.getContext('webgl');
                if (glCtx && glCtx.getExtension) {
                    try {
                        const lose = glCtx.getExtension('WEBGL_lose_context');
                        if (lose) lose.loseContext();
                    } catch (e) {}
                }
                l2dCanvas.width = 0;
                l2dCanvas.height = 0;
            }
        } catch (e) {
            console.warn('[Live2D Cubism3] Could not cleanup Live2D SDK:', e);
        }
        
        // 5. 清理 Canvas 资源
        cleanupCubism3CanvasResources();
        
        // 6. 触发垃圾回收
        triggerGCForCubism3();
        
        console.log('[Live2D Cubism3] Model cleaned up successfully');
    }
    
    // 监听来自 content.js 的事件
    window.addEventListener('live2dFreezeModel', freezeCubism3Model);
    window.addEventListener('live2dUnfreezeModel', unfreezeCubism3Model);
    window.addEventListener('live2dCleanupModel', cleanupCubism3Model);
    
    // ========== HitArea 包围盒线框显示 ==========
    var _hitAreaOverlayData = null;
    var _hitAreaAnimId = null;
    var _hitAreaOverlayEl = null;
    var _hitAreaCfg = null;
    var _hitAreaModel = null;
    
    function getHitAreaCanvasPx(coords2d, mm) {
        var px = mm.transformX ? mm.transformX(coords2d[0]) : coords2d[0];
        var py = mm.transformY ? mm.transformY(coords2d[1]) : coords2d[1];
        return { x: px, y: py };
    }
    
    window.startHitAreaOverlay = function(haCfg, mI) {
        console.log('[HitArea Overlay] start called, haCfg.HitAreas:', haCfg ? haCfg.HitAreas : 'null', 'mI:', !!mI);
        _hitAreaCfg = haCfg;
        _hitAreaModel = mI;
        if (_hitAreaOverlayEl) { console.log('[HitArea Overlay] already shown'); return; } // 已显示
        var canvas = document.getElementById('live2d');
        if (!canvas) return;
        var rect = canvas.getBoundingClientRect();
        var ov = document.createElement('canvas');
        // 匹配 canvas 内部分辨率（CSS 像素 × devicePixelRatio）
        ov.width = canvas.width;
        ov.height = canvas.height;
        ov.style.cssText = 'position:absolute;top:0;left:0;width:'+rect.width+'px;height:'+rect.height+'px;pointer-events:none;z-index:9999;';
        var parent = canvas.parentElement;
        if (parent && parent.style.position === '') { parent.style.position = 'relative'; }
        if (parent) { parent.appendChild(ov); }
        _hitAreaOverlayEl = ov;
        
        function drawLoop() {
            if (!_hitAreaOverlayEl) { _hitAreaAnimId = null; return; }
            var cv = _hitAreaOverlayEl;
            var ctx = cv.getContext('2d');
            ctx.clearRect(0, 0, cv.width, cv.height);
            
            if (_hitAreaCfg && _hitAreaCfg.HitAreas && _hitAreaModel && _hitAreaModel._model) {
                var mm = _hitAreaModel.getModelMatrix();
                var dts = typeof window.live2d.getDeviceToScreen === 'function' ? window.live2d.getDeviceToScreen() : null;
                
                for (var hi = 0; hi < _hitAreaCfg.HitAreas.length; hi++) {
                    var ha = _hitAreaCfg.HitAreas[hi];
                    var did = ha.Id;
                    if (!did || !_hitAreaModel._model) continue;
                    var mi = -1;
                    var dc = _hitAreaModel._model.getDrawableCount();
                    for (var di = 0; di < dc; di++) {
                        var dd = _hitAreaModel._model.getDrawableId(di);
                        var dv = dd && dd._id ? dd._id : dd;
                        var dn = dv && dv.s ? dv.s : String(dv);
                        if (dn === did) { mi = di; break; }
                    }
                    if (mi < 0) continue;
                    var vc = _hitAreaModel._model.getDrawableVertexCount(mi);
                    var verts = _hitAreaModel._model.getDrawableVertices(mi);
                    if (!verts || vc < 1) continue;
                    var nx = verts[0], ux = verts[0], ny = verts[1], uy = verts[1];
                    for (var ci = 1; ci < vc; ci++) {
                        var hx = verts[ci*2], hy = verts[ci*2+1];
                        if (hx < nx) nx = hx; if (hx > ux) ux = hx;
                        if (hy < ny) ny = hy; if (hy > uy) uy = hy;
                    }
                    // 模型坐标 → canvas 像素
                    var ndx1 = mm.transformX ? mm.transformX(nx) : nx;
                    var ndy1 = mm.transformY ? mm.transformY(ny) : ny;
                    var ndx2 = mm.transformX ? mm.transformX(ux) : ux;
                    var ndy2 = mm.transformY ? mm.transformY(uy) : uy;
                    var cx1 = dts && dts.invertTransformX ? dts.invertTransformX(ndx1) : ndx1;
                    var cy1 = dts && dts.invertTransformY ? dts.invertTransformY(ndy1) : ndy1;
                    var cx2 = dts && dts.invertTransformX ? dts.invertTransformX(ndx2) : ndx2;
                    var cy2 = dts && dts.invertTransformY ? dts.invertTransformY(ndy2) : ndy2;
                    // 缩放修正
                    var ovCanvas = document.getElementById('live2d');
                    var sf = ovCanvas ? ovCanvas.width / 450 : 1;
                    if (sf < 0.1) sf = 1;
                    cx1 *= sf; cy1 *= sf; cx2 *= sf; cy2 *= sf;
                    
                    ctx.strokeStyle = 'rgba(255,100,100,0.8)';
                    ctx.lineWidth = 1.5;
                    ctx.strokeRect(
                        Math.min(cx1, cx2),
                        Math.min(cy1, cy2),
                        Math.abs(cx2 - cx1),
                        Math.abs(cy2 - cy1)
                    );
                    ctx.fillStyle = 'rgba(255,100,100,0.5)';
                    ctx.font = '10px sans-serif';
                    ctx.fillText(ha.Name || did, Math.min(cx1, cx2) + 2, Math.min(cy1, cy2) - 2);
                }
            }
            _hitAreaAnimId = requestAnimationFrame(drawLoop);
        }
        
        _hitAreaAnimId = requestAnimationFrame(drawLoop);
    };
    
    window.stopHitAreaOverlay = function() {
        if (_hitAreaAnimId) { cancelAnimationFrame(_hitAreaAnimId); _hitAreaAnimId = null; }
        if (_hitAreaOverlayEl && _hitAreaOverlayEl.parentNode) { _hitAreaOverlayEl.parentNode.removeChild(_hitAreaOverlayEl); }
        _hitAreaOverlayEl = null;
        _hitAreaCfg = null;
        _hitAreaModel = null;
    };
    
    // 监听 toggle 事件
    window.addEventListener('live2d-hitarea-toggle', function(e) {
        console.log('[HitArea Overlay] toggle event:', e.detail);
        if (e.detail && e.detail.enabled) {
            console.log('[HitArea Overlay] enabling, overlayEl:', _hitAreaOverlayEl, 'startFn:', typeof window.startHitAreaOverlay);
            if (typeof window.startHitAreaOverlay === 'function') {
                if (_hitAreaOverlayEl) { console.log('[HitArea Overlay] already shown, skip'); return; }
                var mInst = typeof window.live2d.getModelInstance === 'function' ? window.live2d.getModelInstance() : null;
                var mp = window.__live2d_modelPath || '';
                console.log('[HitArea Overlay] mInst:', !!mInst, 'mp:', mp);
                if (mInst && mp) {
                    fetch(mp + 'model.json', { cache: 'force-cache' }).then(function(r) {
                        console.log('[HitArea Overlay] fetch result:', r ? r.status : 'null');
                        if (!r.ok) return null;
                        return r.json();
                    }).then(function(cfg) {
                        console.log('[HitArea Overlay] cfg:', cfg ? (cfg.HitAreas ? cfg.HitAreas.length + 'areas' : 'no areas') : 'null');
                        if (cfg && cfg.HitAreas && cfg.HitAreas.length > 0) {
                            window.startHitAreaOverlay(cfg, mInst);
                        }
                    }).catch(function(ex) { console.log('[HitArea Overlay] fetch error:', ex); });
                }
            }
        } else {
            if (typeof window.stopHitAreaOverlay === 'function') { window.stopHitAreaOverlay(); }
        }
    });
    
    // 监听触摸开关——关闭时移除线框释放内存
    window.addEventListener('live2d-touch-toggle', function(e) {
        if (e.detail && !e.detail.enabled) {
            if (typeof window.stopHitAreaOverlay === 'function') { window.stopHitAreaOverlay(); }
        }
    });

    // 监听位置更新事件（不重建容器，只更新样式）
    window.addEventListener('live2d-update-position', function(e) {
        if (!e.detail || !e.detail.position) return;
        var pos = e.detail.position;
        if (pos === 'all') return;
        var waifu = document.getElementById('waifu');
        if (!waifu) return;
        var cfg = {
            'left-bottom': { l:0, b:0 },
            'right-bottom': { r:0, b:0 },
            'left-top': { l:0, t:35 },
            'right-top': { r:0, t:35 },
            'center': { l:'50%', t:'50%', tr:'translate(-50%,-50%)' },
            'top-center': { l:'50%', t:35, tr:'translateX(-50%)' },
            'bottom-center': { l:'50%', b:0, tr:'translateX(-50%)' },
            'left-center': { l:0, t:'50%', tr:'translateY(-50%)' },
            'right-center': { r:0, t:'50%', tr:'translateY(-50%)' }
        };
        var p = cfg[pos] || cfg['left-bottom'];
        waifu.style.left = p.l !== undefined ? (typeof p.l === 'string' ? p.l : p.l + 'px') : 'auto';
        waifu.style.right = p.r !== undefined ? (typeof p.r === 'string' ? p.r : p.r + 'px') : 'auto';
        waifu.style.top = p.t !== undefined ? (typeof p.t === 'string' ? p.t : p.t + 'px') : 'auto';
        waifu.style.bottom = p.b !== undefined ? (typeof p.b === 'string' ? p.b : p.b + 'px') : 'auto';
        waifu.style.transform = p.tr || 'none';
    });

    console.log('[Live2D Cubism3] Page visibility memory optimization enabled');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCubism3);
    } else {
        setTimeout(initCubism3, 100);
    }
})();
