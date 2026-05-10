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
                        'minimax': latestSettings.minimaxApiKey
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
                    'minimax': { endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'MiniMax-Text-01' }
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
                        'minimax': latestSettings.minimaxApiKey
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
                    'minimax': { endpoint: 'https://api.minimax.chat/v1/text/chatcompletion_v2', model: 'MiniMax-Text-01' }
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
                    
                    characterPrompt += '\n请始终以这个角色的身份进行对话，保持角色设定一致。用友好、可爱的方式回复用户。';
                    
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
                    console.log('[Live2D AI] Trying to use background proxy...');
                    console.log('[Live2D AI] chrome.runtime available:', typeof chrome !== 'undefined' && chrome.runtime);
                    
                    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                        const proxyResult = await new Promise((resolve, reject) => {
                            console.log('[Live2D AI] Sending message to background...');
                            chrome.runtime.sendMessage(
                                { action: 'fetchApi', url: endpoint, options: options },
                                (response) => {
                                    console.log('[Live2D AI] Received response from background:', response);
                                    if (chrome.runtime.lastError) {
                                        console.error('[Live2D AI] Chrome runtime error:', chrome.runtime.lastError);
                                        reject(new Error(chrome.runtime.lastError.message || 'Runtime error'));
                                        return;
                                    }
                                    if (response && response.success) {
                                        resolve(response.data);
                                    } else {
                                        reject(new Error(response?.error || 'Proxy request failed'));
                                    }
                                }
                            );
                        });
                        data = proxyResult;
                        proxySuccess = true;
                        console.log('[Live2D AI] Request via background proxy succeeded');
                    } else {
                        console.log('[Live2D AI] Background proxy not available, falling back to direct fetch');
                        throw new Error('chrome.runtime not available');
                    }
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
        `;
        document.head.appendChild(style);
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
                isDragLimitEnabled = settingsData.dragLimit !== false; // 默认开启
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
                    
                    showTips('连接已恢复！');
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

            const modelPath = actualModelBase + cubism3Model + '/';
            console.log('[Live2D Cubism3] Model path:', modelPath);
            
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
                    }
                    
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
                    
                    console.log('[Live2D Tips] Display time:', displayTime / 1000, 'seconds for', text.length, 'chars');
                }
            }

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
                    const hasApiKey = aiProvider === 'siliconflow' ? siliconflowApiKey : aiApiKey;
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
                
                if (aiEnabled) {
                    // 检查 API Key
                    const hasApiKey = aiProvider === 'siliconflow' ? siliconflowApiKey : aiApiKey;
                    if (!hasApiKey) {
                        console.log('[Live2D AI Chat] 错误: API Key 未配置');
                        showTips('请先在设置中配置 API Key');
                        if (!isMouseInWaifu) {
                            hideChatDelayed();
                        }
                        return;
                    }
                    
                    try {
                        showTips('正在思考...');
                        console.log('[Live2D AI Chat] 开始调用 AI API...');
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

            chatSend.addEventListener('click', handleChat);
            chatInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    handleChat();
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
                                    showTips('图片生成失败，请确保模型已加载~');
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
                                
                                showTips('图片已保存！');
                            } catch (e) {
                                console.error('[Live2D Cubism3] Screenshot error:', e);
                                showTips('截图失败，请重试~');
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
                showTips('请在扩展设置中切换模型');
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

            if (typeof window.live2d !== 'undefined') {
                try {
                    window.live2d.init();
                    window.live2d.loadModel(modelPath);
                    console.log('[Live2D Cubism3] Model loaded successfully');
                    
                    // 启用拖拽功能
                    const waifu = document.getElementById('waifu');
                    const dragEnabled = settings.drag || false;
                    enableDragging(waifu, dragEnabled);
                } catch (e) {
                    console.error('[Live2D Cubism3] Failed to load model:', e);
                    showTips('模型加载失败，请尝试切换其他模型~');
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

                // 为所有canvas添加点击事件
                const allCanvasElements = document.querySelectorAll('[id^="live2d"]');
                allCanvasElements.forEach(canvas => {
                    canvas.addEventListener('click', async function() {
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
            // 重新调用 enableDragging 来更新拖拽状态
            enableDragging(currentWaifuElement, event.detail.drag);
        }
    });
    
    // ================================================
    // 页面可见性优化：冻结/解冻 Cubism3 实例
    // ================================================
    
    let cubism3ModelFrozen = false;
    let cubism3AnimationFrameId = null;
    let mirrorIntervalId = null; // 保存第1121行的setInterval
    let originalAutoQuoteTimer = null;
    let originalModel = null; // 保存 Live2D 模型引用
    let savedCubism3DisplayStates = {}; // 保存冻结前的显示状态
    
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
        
        // 4. 根据冻结模式处理渲染
        try {
            if (window.live2d && window.live2d.model) {
                originalModel = window.live2d.model;
                
                if (window.live2d.stop) {
                    window.live2d.stop();
                }
                
                if (freezeMode === 'full') {
                    if (window.live2d.gl && window.live2d.gl.getExtension) {
                        try {
                            const loseContext = window.live2d.gl.getExtension('WEBGL_lose_context');
                            if (loseContext) {
                                loseContext.loseContext();
                            }
                        } catch (e) {
                        }
                    }
                    console.log('[Live2D Cubism3] Model resources fully released');
                } else {
                    console.log('[Live2D Cubism3] Model frozen (rendering paused)');
                }
            }
        } catch (e) {
            console.warn('[Live2D Cubism3] Could not pause Live2D SDK:', e);
        }
        
        if (freezeMode === 'full') {
            cleanupCubism3CanvasResources();
            triggerGCForCubism3();
        }
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
            const tempArray = new Array(512 * 1024);
            for (let i = 0; i < tempArray.length; i++) {
                tempArray[i] = Math.random();
            }
            setTimeout(() => {
                tempArray.length = 0;
                if (window.gc) window.gc();
            }, 100);
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
        
        // 3. 如果模型已加载过，尝试重新渲染
        if (window.live2d && window.live2d.model) {
            try {
                // 尝试重启渲染循环
                if (window.live2d.start) {
                    window.live2d.start();
                } else if (window.live2d.render) {
                    // 手动触发一次渲染
                    window.live2d.render();
                }
                console.log('[Live2D Cubism3] Rendering resumed');
            } catch (e) {
                console.warn('[Live2D Cubism3] Failed to resume rendering:', e);
                // 如果重启失败，尝试重新加载模型
                try {
                    if (currentModelName && currentModelName !== '') {
                        console.log('[Live2D Cubism3] Reinitializing model:', currentModelName);
                        // 重新初始化整个 Cubism3
                        window.__live2d_cubism3_initialized = false;
                        const waifu = document.getElementById('waifu');
                        if (waifu) waifu.remove();
                        const style = document.getElementById('live2d-cubism3-styles');
                        if (style) style.remove();
                        setTimeout(initCubism3, 100);
                    }
                } catch (reinitError) {
                    console.error('[Live2D Cubism3] Failed to reinitialize:', reinitError);
                }
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
        
        // 4. 释放 WebGL 上下文
        try {
            if (window.live2d && window.live2d.model) {
                if (window.live2d.stop) {
                    window.live2d.stop();
                }
                
                if (window.live2d.gl && window.live2d.gl.getExtension) {
                    try {
                        const loseContext = window.live2d.gl.getExtension('WEBGL_lose_context');
                        if (loseContext) {
                            loseContext.loseContext();
                        }
                    } catch (e) {
                    }
                }
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
    
    console.log('[Live2D Cubism3] Page visibility memory optimization enabled');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCubism3);
    } else {
        setTimeout(initCubism3, 100);
    }
})();
