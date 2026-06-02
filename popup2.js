// 浏览器API兼容层：支持Chrome和Firefox
const browserAPI = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
console.log('[Live2D Popup2] Browser detected:', typeof browser !== 'undefined' && browser.storage ? 'Firefox (or compatible)' : 'Chrome/Edge');

// 远程模型配置URL（可配置的远程更新源）
const REMOTE_MODEL_CONFIG_URL = 'https://raw.githubusercontent.com/yourusername/live2d-widget-extension/main/live2d-ai/json/models.json';

// 缓存的模型配置
let cachedModels = null;
let cachedVersion = null;

// 加载模型配置（优先使用本地配置，支持手动检查远程更新）
async function loadModelConfig(forceRefresh = false) {
  if (cachedModels && !forceRefresh) {
    return cachedModels;
  }

  // 尝试从本地文件获取（主要来源）
  try {
    const localUrl = browserAPI.runtime.getURL('live2d-ai/json/models.json');
    const response = await fetch(localUrl);
    if (response.ok) {
      const config = await response.json();
      cachedModels = config;
      cachedVersion = config.version || 'unknown';
      console.log('[Live2D Popup2] Model config loaded from local, Version:', cachedVersion);
      return config;
    }
  } catch (e) {
    console.warn('[Live2D Popup2] Failed to load local model config:', e);
  }

  // 返回内置默认模型配置
  return getDefaultModelConfig();
}

// 手动检查远程更新（用户触发）
async function checkRemoteUpdate() {
  if (!REMOTE_MODEL_CONFIG_URL || REMOTE_MODEL_CONFIG_URL.includes('yourusername')) {
    console.log('[Live2D Popup2] Remote update URL is not configured');
    return { updated: false, version: cachedVersion, message: '远程更新源未配置' };
  }

  try {
    const response = await fetch(REMOTE_MODEL_CONFIG_URL, { cache: 'no-cache' });
    if (response.ok) {
      const config = await response.json();
      const newVersion = config.version || 'unknown';
      
      if (newVersion !== cachedVersion) {
        console.log('[Live2D Popup2] New model config available! Current:', cachedVersion, 'New:', newVersion);
        cachedModels = config;
        cachedVersion = newVersion;
        
        // 刷新所有模型下拉框
        const providers = ['deepseek', 'siliconflow', 'univibe', 'longcat', 'qwen', 'hunyuan', 'ernie', 'doubao', 'spark', 'zhipu', 'moonshot', 'minimax', 'atri'];
        for (const provider of providers) {
          await populateModelSelect(provider);
        }
        
        return { updated: true, version: newVersion, message: `已更新到版本 ${newVersion}` };
      } else {
        return { updated: false, version: currentVersion, message: '已是最新版本' };
      }
    }
  } catch (e) {
    console.warn('[Live2D Popup2] Failed to check remote update:', e.message);
    return { updated: false, version: cachedVersion, message: '检查更新失败: ' + e.message };
  }
  
  return { updated: false, version: cachedVersion, message: '检查更新失败' };
}

// 默认模型配置（当网络和本地都无法获取时使用）
function getDefaultModelConfig() {
  return {
    models: {
      deepseek: { models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] },
      siliconflow: { models: [{ id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' }] },
      univibe: { models: [{ id: 'gpt-4', name: 'GPT-4' }] },
      longcat: { models: [{ id: 'LongCat-Flash-Chat', name: 'LongCat Flash' }] },
      qwen: { models: [{ id: 'qwen-plus', name: 'Qwen Plus' }] },
      hunyuan: { models: [{ id: 'hunyuan-pro', name: '混元 Pro' }] },
      ernie: { models: [{ id: 'ernie-4.0-8k-latest', name: '文心一言 4.0' }] },
      doubao: { models: [{ id: 'doubao-pro-32k', name: '豆包 Pro' }] },
      spark: { models: [{ id: 'generalv3', name: '星火 V3' }] },
      zhipu: { models: [{ id: 'glm-4', name: 'GLM-4' }] },
      moonshot: { models: [{ id: 'moonshot-v1-8k', name: 'Kimi 8K' }] },
      minimax: { models: [{ id: 'MiniMax-Text-01', name: 'MiniMax Text' }] },
      atri: { models: [{ id: 'gpt-5.4', name: 'GPT-5.4' }] }
    }
  };
}

// 填充模型下拉框
async function populateModelSelect(provider) {
  const modelConfig = await loadModelConfig();
  const selectElement = document.getElementById(`${provider}Model`);
  if (!selectElement) return;

  // 清空现有选项
  selectElement.innerHTML = '';

  // 获取该提供商的模型列表
  const providerModels = modelConfig.models[provider];
  if (providerModels && providerModels.models) {
    providerModels.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.name;
      selectElement.appendChild(option);
    });
  }
}

// 将回调API转换为PromiseAPI的辅助函数
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
        console.error('[Live2D Popup2] Storage get error:', e);
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
        console.error('[Live2D Popup2] Storage set error:', e);
        resolve();
      }
    });
  }
};

// 系统主题监听
let systemThemeMediaQuery = null;

function applyTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-theme');
  } else {
    document.body.classList.remove('dark-theme');
  }
}

function getSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function updateThemeFromSystem() {
  const isDark = getSystemTheme();
  applyTheme(isDark);
  // 保存主题到存储
  storage.set({ theme: isDark ? 'dark' : 'light' });
}

function handleSystemThemeChange(e) {
  console.log('[Live2D Popup2] System theme changed:', e.matches ? 'dark' : 'light');
  updateThemeFromSystem();
}

async function testDeepSeekApi(apiKey) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是一个友好的助手' },
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      // 友好化错误提示
      if (response.status === 401 || lowerErrorMsg.includes('invalid api key') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往 DeepSeek 平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('too many')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足或被拒绝访问，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = 'DeepSeek API 服务器暂时不可用，请稍后再试喵~';
      } else if (lowerErrorMsg.includes('quota') || lowerErrorMsg.includes('exceeded')) {
        errorMsg = 'API 调用额度已用完，请检查额度或充值喵~';
      } else if (lowerErrorMsg.includes('busy')) {
        errorMsg = 'API 服务繁忙，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] API Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

async function testSiliconFlowApi(apiKey) {
  try {
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-ai/DeepSeek-V3',
        messages: [
          { role: 'system', content: '你是一个友好的助手' },
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      // 友好化错误提示
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往硅基流动平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('too many')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足或被拒绝访问，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '硅基流动 API 服务器暂时不可用，请稍后再试喵~';
      } else if (lowerErrorMsg.includes('quota') || lowerErrorMsg.includes('exceeded')) {
        errorMsg = 'API 调用额度已用完，请检查额度或充值喵~';
      } else if (lowerErrorMsg.includes('busy')) {
        errorMsg = 'API 服务繁忙，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] SiliconFlow Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

async function testUnivibeApi(apiKey) {
  try {
    // 尝试多个可能的端点
    const endpoints = [
      'https://api.univibe.cc/v1/chat/completions'
    ];
    
    let lastError = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'user', content: 'hi' }
            ],
            max_tokens: 5
          })
        });

        if (response.ok) {
          return { success: true };
        }
        
        const errorData = await response.json().catch(() => null);
        lastError = { status: response.status, data: errorData, endpoint };
        
        // 如果不是 404，继续尝试其他端点
        if (response.status !== 404) {
          break;
        }
      } catch (e) {
        lastError = e;
      }
    }
    
    // 所有端点都失败
    if (lastError) {
      const errorObj = lastError.error || lastError.data;
      let errorMsg = '';
      
      if (errorObj?.error?.message) {
        errorMsg = errorObj.error.message;
      } else if (errorObj?.message) {
        errorMsg = errorObj.message;
      } else if (lastError.status) {
        errorMsg = `请求失败 (${lastError.status})`;
      } else {
        errorMsg = 'API 连接失败喵~';
      }
      
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      // 友好化错误提示
      if (lastError.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往 UniVibe 平台充值喵~';
      } else if (lastError.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('too many')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (lastError.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足或被拒绝访问，请检查 API Key 权限喵~';
      } else if (lastError.status === 500 || lastError.status === 502 || lastError.status === 503) {
        errorMsg = 'UniVibe API 服务器暂时不可用，请稍后再试喵~';
      } else if (lowerErrorMsg.includes('quota') || lowerErrorMsg.includes('exceeded')) {
        errorMsg = 'API 调用额度已用完，请检查额度或充值喵~';
      } else if (lowerErrorMsg.includes('busy')) {
        errorMsg = 'API 服务繁忙，请稍后再试喵~';
      } else if (lastError.status === 404) {
        errorMsg = 'UniVibe API 端点不存在，请检查配置喵~';
      }
      
      return { success: false, error: errorMsg };
    }
    
    return { success: false, error: '无法连接到 UniVibe API，请检查网络喵~' };
  } catch (e) {
    console.error('[Live2D Popup2] UniVibe Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

async function testLongCatApi(apiKey, modelToTest = 'LongCat-Flash-Chat') {
  try {
    console.log('[Live2D Popup2] Testing LongCat API with key:', apiKey ? apiKey.substring(0, 10) + '...' : 'empty', 'model:', modelToTest);
    
    const response = await fetch('https://api.longcat.chat/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelToTest,
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 10
      })
    });

    console.log('[Live2D Popup2] LongCat Response status:', response.status);
    console.log('[Live2D Popup2] LongCat Response headers:', [...response.headers.entries()]);

    if (response.ok) {
      const data = await response.json().catch(() => null);
      console.log('[Live2D Popup2] LongCat Response data:', data);
      
      if (data && data.error) {
        // LongCat returns 200 but with error field
        let errorMsg = data.error?.message || data.error?.code || 'API 返回错误喵~';
        return { success: false, error: errorMsg };
      }
      
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      console.log('[Live2D Popup2] LongCat Error data:', errorData);
      
      let errorMsg = errorData?.error?.message || errorData?.error?.code || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication') || lowerErrorMsg.includes('unauthorized')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额或额度不足，请前往 LongCat 平台检查喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('too many') || lowerErrorMsg.includes('exceeded')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied') || lowerErrorMsg.includes('permission')) {
        errorMsg = 'API Key 权限不足，请确认 Key 已激活或在 LongCat 平台检查权限设置喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = 'LongCat API 服务器暂时不可用，请稍后再试喵~';
      } else if (lowerErrorMsg.includes('busy')) {
        errorMsg = 'API 服务繁忙，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] LongCat Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// 通义千问 API 测试函数
async function testQwenApi(apiKey) {
  try {
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足或额度用完，请前往阿里云平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '阿里云 API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Qwen Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// 腾讯云混元 API 测试函数
async function testHunyuanApi(apiKey, modelToTest = 'hunyuan-pro') {
  try {
    const response = await fetch('https://tokenhub.tencentmaas.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelToTest,
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      const data = await response.json().catch(() => null);
      if (data && data.choices && data.choices.length > 0) {
        return { success: true };
      } else if (data && data.error) {
        let errorMsg = data.error?.message || '请求失败';
        const lowerErrorMsg = errorMsg.toLowerCase();
        
        if (lowerErrorMsg.includes('model') || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('not found')) {
          errorMsg = '模型 ID 无效，请检查选择的模型或账户权限喵~';
        }
        
        return { success: false, error: errorMsg };
      } else {
        return { success: false, error: 'API 响应格式异常喵~' };
      }
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往腾讯云平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '腾讯云 API 服务器暂时不可用，请稍后再试喵~';
      } else if (lowerErrorMsg.includes('model') || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('not found')) {
        errorMsg = '模型 ID 无效，请检查选择的模型或账户权限喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Hunyuan Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// 百度文心一言 API 测试函数
async function testErnieApi(apiKey) {
  try {
    const response = await fetch('https://qianfan.baidubce.com/v2/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'ernie-4.0-8k-latest',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往百度云平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '百度云 API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Ernie Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// 字节豆包 API 测试函数
async function testDoubaoApi(apiKey) {
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'doubao-pro-32k',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往火山引擎平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '火山引擎 API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Doubao Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// 讯飞星火 API 测试函数
async function testSparkApi(apiKey) {
  try {
    const response = await fetch('https://spark-api.xf-yun.com/v3.1/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'generalv3',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往讯飞平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '讯飞 API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Spark Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// 智谱 AI API 测试函数
async function testZhipuApi(apiKey) {
  try {
    const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'glm-4',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往智谱平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = '智谱 API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Zhipu Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// Kimi API 测试函数
async function testMoonshotApi(apiKey) {
  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往 Kimi 平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = 'Kimi API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] Moonshot Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// MiniMax API 测试函数
async function testMinimaxApi(apiKey) {
  try {
    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();
      
      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额不足，请前往 MiniMax 平台充值喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = 'MiniMax API 服务器暂时不可用，请稍后再试喵~';
      }
      
      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] MiniMax Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// ATRI（OpenAI Compatible）API 测试函数
async function testAtriApi(apiKey, modelToTest = 'gpt-5.4') {
  try {
    const response = await fetch('https://ai.zkmjnic.tech/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelToTest,
        messages: [
          { role: 'user', content: 'hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const errorData = await response.json().catch(() => null);
      let errorMsg = errorData?.error?.message || `请求失败 (${response.status})`;
      const lowerErrorMsg = errorMsg.toLowerCase();

      if (response.status === 401 || lowerErrorMsg.includes('invalid') || lowerErrorMsg.includes('authentication') || lowerErrorMsg.includes('unauthorized')) {
        errorMsg = 'API Key 无效，请检查输入喵~';
      } else if (lowerErrorMsg.includes('insufficient') || lowerErrorMsg.includes('balance') || lowerErrorMsg.includes('quota')) {
        errorMsg = 'API Key 有效，但账户余额或额度不足，请前往 ATRI 控制台检查喵~';
      } else if (response.status === 429 || lowerErrorMsg.includes('rate limit') || lowerErrorMsg.includes('too many') || lowerErrorMsg.includes('throttling')) {
        errorMsg = 'API 调用频率超限，请稍后再试喵~';
      } else if (response.status === 403 || lowerErrorMsg.includes('forbidden') || lowerErrorMsg.includes('access denied')) {
        errorMsg = 'API Key 权限不足或被拒绝访问，请检查 API Key 权限喵~';
      } else if (response.status === 500 || response.status === 502 || response.status === 503) {
        errorMsg = 'ATRI API 服务器暂时不可用，请稍后再试喵~';
      } else if (lowerErrorMsg.includes('model') || lowerErrorMsg.includes('not found')) {
        errorMsg = '模型 ID 无效，请检查选择的模型或账户权限喵~';
      }

      return { success: false, error: errorMsg };
    }
  } catch (e) {
    console.error('[Live2D Popup2] ATRI Test Error:', e);
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      return { success: false, error: '网络连接失败，请检查网络或防火墙设置喵~' };
    }
    return { success: false, error: '网络连接失败，请检查网络喵~' };
  }
}

// ===================== 自动更新功能 =====================

const GITHUB_REPO = 'CatmaoU/live2d-extension';
const RELEASES_URL = 'https://github.com/' + GITHUB_REPO + '/releases';
const GITHUB_API_URL = 'https://api.github.com/repos/' + GITHUB_REPO + '/releases/latest';

// 检查 GitHub Releases 最新版本
async function checkGitHubUpdate() {
  const updateStatusEl = document.getElementById('updateStatus');
  const checkBtn = document.getElementById('checkUpdateBtn');

  if (updateStatusEl) {
    updateStatusEl.className = 'connect-status loading';
    updateStatusEl.style.display = 'block';
    updateStatusEl.textContent = '正在检查更新喵...';
  }
  if (checkBtn) checkBtn.disabled = true;

  try {
    const response = await fetch(GITHUB_API_URL, { cache: 'no-cache', signal: AbortSignal.timeout(10000) });

    // 404 = 还没有发布任何 Release，不算错误
    if (response.status === 404) {
      const currentVersion = chrome.runtime.getManifest().version;
      return {
        success: true,
        currentVersion: currentVersion,
        latestVersion: null,
        noReleases: true,
        hasUpdate: false,
        releaseUrl: RELEASES_URL,
        releaseNotes: ''
      };
    }

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const data = await response.json();
    const latestTag = data.tag_name || '';
    const latestVersion = latestTag.replace(/^v/i, '');
    const currentVersion = chrome.runtime.getManifest().version;
    const releaseUrl = data.html_url || (RELEASES_URL + '/tag/' + latestTag);

    return {
      success: true,
      currentVersion: currentVersion,
      latestVersion: latestVersion,
      latestTag: latestTag,
      hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
      releaseUrl: releaseUrl,
      releaseNotes: data.body || ''
    };
  } catch (e) {
    console.error('[Live2D] Check update error:', e);
    return {
      success: false,
      error: e.message
    };
  } finally {
    if (checkBtn) checkBtn.disabled = false;
  }
}

// 版本号比较（返回 1: a>b, 0: a=b, -1: a<b）
// 支持 pre-release 后缀：1.0.5-beta.1 < 1.0.5-beta.2
function compareVersions(a, b) {
  // 分离基础版本和 pre-release 后缀
  const parse = function(v) {
    const idx = v.indexOf('-');
    const base = idx >= 0 ? v.substring(0, idx) : v;
    const suffix = idx >= 0 ? v.substring(idx + 1) : '';
    return {
      base: base.split('.').map(Number),
      suffix: suffix ? suffix.split('.').map(function(s) { return isNaN(Number(s)) ? s : Number(s); }) : []
    };
  };
  
  const pa = parse(a);
  const pb = parse(b);
  
  // 比较基础版本数字部分
  for (let i = 0; i < Math.max(pa.base.length, pb.base.length); i++) {
    const na = pa.base[i] || 0;
    const nb = pb.base[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  
  // 基础版本相同 → 比较 pre-release 后缀
  // 正式版 > beta（无后缀 > 有后缀）
  if (pa.suffix.length === 0 && pb.suffix.length > 0) return 1;    // a 正式版, b beta → a > b
  if (pa.suffix.length > 0 && pb.suffix.length === 0) return -1;   // a beta, b 正式版 → a < b
  if (pa.suffix.length === 0 && pb.suffix.length === 0) return 0;  // 都无后缀 → 版本相同
  
  // 比较后缀各部分（beta.1 vs beta.2）
  for (let i = 0; i < Math.max(pa.suffix.length, pb.suffix.length); i++) {
    const na = pa.suffix[i];
    const nb = pb.suffix[i];
    if (na === undefined) return -1;
    if (nb === undefined) return 1;
    if (typeof na === 'number' && typeof nb === 'number') {
      if (na > nb) return 1;
      if (na < nb) return -1;
    } else {
      const sa = String(na);
      const sb = String(nb);
      if (sa > sb) return 1;
      if (sa < sb) return -1;
    }
  }
  return 0;
}

// 显示更新状态
function showUpdateStatus(type, message) {
  const el = document.getElementById('updateStatus');
  if (!el) return;
  el.className = 'connect-status ' + type;
  el.style.display = 'block';
  el.textContent = message;
}

// 手动检查更新（按钮触发）
async function manualCheckUpdate() {
  const result = await checkGitHubUpdate();
  
  if (!result.success) {
    showUpdateStatus('error', '更新失败喵！请检查网络或代理喵！');
    return;
  }
  
  if (result.noReleases) {
    showUpdateStatus('success', '还没有发布版本喵～快去发布第一个 Release 吧！');
    return;
  }
  
  if (result.hasUpdate) {
    showUpdateStatus('error', '目前版本是 ' + result.currentVersion + ' 喵，可更新 ' + result.latestVersion + ' 喵！');
    
    if (confirm('新版本 ' + result.latestTag + ' 可用喵！\n当前版本：' + result.currentVersion + '\n\n是否前往下载更新？')) {
      chrome.tabs.create({ url: result.releaseUrl });
    }
  } else {
    showUpdateStatus('success', '版本是最新的了喵～');
  }
}

// 自动静默检查更新（自动更新开关开启时）
async function silentCheckUpdate() {
  const result = await checkGitHubUpdate();
  
  if (!result.success) return;
  if (result.noReleases) return;
  
  if (result.hasUpdate) {
    showUpdateStatus('error', '目前版本是 ' + result.currentVersion + ' 喵，可更新 ' + result.latestVersion + ' 喵！');
    
    if (confirm('新版本 ' + result.latestTag + ' 可用喵！\n当前版本：' + result.currentVersion + '\n\n是否前往下载更新？')) {
      chrome.tabs.create({ url: result.releaseUrl });
    }
  } else {
    showUpdateStatus('success', '版本是最新的了喵～');
    setTimeout(() => {
      const el = document.getElementById('updateStatus');
      if (el) { el.style.display = 'none'; }
    }, 3000);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const config = await storage.get(['theme', 'followSystemTheme', 'autoUpdate', 'aiEnabled', 'aiApiKey', 'siliconflowApiKey', 'univibeApiKey', 'longcatApiKey', 'qwenApiKey', 'hunyuanApiKey', 'ernieApiKey', 'doubaoApiKey', 'sparkApiKey', 'zhipuApiKey', 'moonshotApiKey', 'minimaxApiKey', 'atriApiKey', 'aiProvider', 'characterName', 'characterLikes', 'characterRelation', 'characterProfile', 'characterLimit', 'deepseekModel', 'siliconflowModel', 'univibeModel', 'longcatModel', 'qwenModel', 'hunyuanModel', 'ernieModel', 'doubaoModel', 'sparkModel', 'zhipuModel', 'moonshotModel', 'minimaxModel', 'atriModel', 'summaryRules']);
  const followSystemThemeCheckbox = document.getElementById('followSystemTheme');
  const autoUpdateCheckbox = document.getElementById('autoUpdate');
  const checkUpdateBtn = document.getElementById('checkUpdateBtn');
  const updateStatusEl = document.getElementById('updateStatus');
  const aiSettingsContainer = document.getElementById('aiSettingsContainer');
  const aiApiKeyInput = document.getElementById('aiApiKey');
  const siliconflowApiKeyInput = document.getElementById('siliconflowApiKey');
  const univibeApiKeyInput = document.getElementById('univibeApiKey');
  const longcatApiKeyInput = document.getElementById('longcatApiKey');
  const qwenApiKeyInput = document.getElementById('qwenApiKey');
  const hunyuanApiKeyInput = document.getElementById('hunyuanApiKey');
  const ernieApiKeyInput = document.getElementById('ernieApiKey');
  const doubaoApiKeyInput = document.getElementById('doubaoApiKey');
  const sparkApiKeyInput = document.getElementById('sparkApiKey');
  const zhipuApiKeyInput = document.getElementById('zhipuApiKey');
  const moonshotApiKeyInput = document.getElementById('moonshotApiKey');
  const minimaxApiKeyInput = document.getElementById('minimaxApiKey');
  const atriApiKeyInput = document.getElementById('atriApiKey');
  const aiApiKeyInputContainer = document.getElementById('aiApiKeyInputContainer');
  const aiDisabledHint = document.getElementById('aiDisabledHint');
  const connectBtn = document.getElementById('connectBtn');
  const connectStatus = document.getElementById('connectStatus');
  const aiProviderSelect = document.getElementById('aiProvider');
  const deepseekConfigDiv = document.getElementById('deepseekConfig');
  const siliconflowConfigDiv = document.getElementById('siliconflowConfig');
  const univibeConfigDiv = document.getElementById('univibeConfig');
  const longcatConfigDiv = document.getElementById('longcatConfig');
  const qwenConfigDiv = document.getElementById('qwenConfig');
  const hunyuanConfigDiv = document.getElementById('hunyuanConfig');
  const ernieConfigDiv = document.getElementById('ernieConfig');
  const doubaoConfigDiv = document.getElementById('doubaoConfig');
  const sparkConfigDiv = document.getElementById('sparkConfig');
  const zhipuConfigDiv = document.getElementById('zhipuConfig');
  const moonshotConfigDiv = document.getElementById('moonshotConfig');
  const minimaxConfigDiv = document.getElementById('minimaxConfig');
  const atriConfigDiv = document.getElementById('atriConfig');
  
  // 角色信息元素
  const characterNameInput = document.getElementById('characterName');
  const characterLikesInput = document.getElementById('characterLikes');
  const characterRelationInput = document.getElementById('characterRelation');
  const characterProfileInput = document.getElementById('characterProfile');
  const characterLimitInput = document.getElementById('characterLimit');
  const refreshInfoBtn = document.getElementById('refreshInfoBtn');
  const refreshStatus = document.getElementById('refreshStatus');
  const summaryRulesInput = document.getElementById('summaryRules');
  
  // 初始化角色信息
  if (characterNameInput) characterNameInput.value = config.characterName || '';
  if (characterLikesInput) characterLikesInput.value = config.characterLikes || '';
  if (characterRelationInput) characterRelationInput.value = config.characterRelation || '';
  if (characterProfileInput) characterProfileInput.value = config.characterProfile || '';
  if (characterLimitInput) characterLimitInput.value = config.characterLimit || '';
  if (summaryRulesInput) summaryRulesInput.value = config.summaryRules || '';
  
  // 动态加载所有提供商的模型列表
  const providers = ['deepseek', 'siliconflow', 'univibe', 'longcat', 'qwen', 'hunyuan', 'ernie', 'doubao', 'spark', 'zhipu', 'moonshot', 'minimax', 'atri'];
  for (const provider of providers) {
    await populateModelSelect(provider);
    // 恢复保存的模型选择
    const modelSelect = document.getElementById(`${provider}Model`);
    if (modelSelect && config[`${provider}Model`]) {
      modelSelect.value = config[`${provider}Model`];
    }
  }
  
  // 初始化 API 提供商选择
  if (aiProviderSelect && config.aiProvider) {
    aiProviderSelect.value = config.aiProvider;
    // 确保显示正确的配置界面
    updateProviderConfig(config.aiProvider);
  }
  
  // 页面加载时自动从配置文件读取 API Key（仅当存储中没有配置时）
  (async () => {
    try {
      // 先检查存储中是否已经有提供商选择
      const existingConfig = await storage.get(['aiProvider']);
      
      // 如果存储中已经有提供商选择，就不覆盖了
      if (existingConfig.aiProvider) {
        console.log('[Live2D Popup2] Using existing provider from storage:', existingConfig.aiProvider);
        // 确保显示正确的配置界面
        updateProviderConfig(existingConfig.aiProvider);
        return;
      }
      
      // 只有存储中没有时才加载默认配置
      const configRes = await fetch('live2d-ai/json/config.json');
      if (configRes.ok) {
        const localConfig = await configRes.json();
        const provider = localConfig.defaultProvider || 'siliconflow';
        
        if (provider === 'deepseek' && localConfig.api?.deepseek?.apiKey) {
          aiApiKeyInput.value = localConfig.api.deepseek.apiKey;
          aiProviderSelect.value = 'deepseek';
          await storage.set({ aiApiKey: localConfig.api.deepseek.apiKey, aiProvider: 'deepseek' });
        } else if (provider === 'siliconflow' && localConfig.api?.siliconflow?.apiKey) {
          siliconflowApiKeyInput.value = localConfig.api.siliconflow.apiKey;
          aiProviderSelect.value = 'siliconflow';
          await storage.set({ siliconflowApiKey: localConfig.api.siliconflow.apiKey, aiProvider: 'siliconflow' });
        } else if (provider === 'univibe' && localConfig.api?.univibe?.apiKey) {
          univibeApiKeyInput.value = localConfig.api.univibe.apiKey;
          aiProviderSelect.value = 'univibe';
          await storage.set({ univibeApiKey: localConfig.api.univibe.apiKey, aiProvider: 'univibe' });
        } else if (provider === 'longcat' && localConfig.api?.longcat?.apiKey) {
          longcatApiKeyInput.value = localConfig.api.longcat.apiKey;
          aiProviderSelect.value = 'longcat';
          await storage.set({ longcatApiKey: localConfig.api.longcat.apiKey, aiProvider: 'longcat' });
        } else if (provider === 'qwen' && localConfig.api?.qwen?.apiKey) {
          qwenApiKeyInput.value = localConfig.api.qwen.apiKey;
          aiProviderSelect.value = 'qwen';
          await storage.set({ qwenApiKey: localConfig.api.qwen.apiKey, aiProvider: 'qwen' });
        } else if (provider === 'hunyuan' && localConfig.api?.hunyuan?.apiKey) {
          hunyuanApiKeyInput.value = localConfig.api.hunyuan.apiKey;
          aiProviderSelect.value = 'hunyuan';
          await storage.set({ hunyuanApiKey: localConfig.api.hunyuan.apiKey, aiProvider: 'hunyuan' });
        } else if (provider === 'ernie' && localConfig.api?.ernie?.apiKey) {
          ernieApiKeyInput.value = localConfig.api.ernie.apiKey;
          aiProviderSelect.value = 'ernie';
          await storage.set({ ernieApiKey: localConfig.api.ernie.apiKey, aiProvider: 'ernie' });
        } else if (provider === 'doubao' && localConfig.api?.doubao?.apiKey) {
          doubaoApiKeyInput.value = localConfig.api.doubao.apiKey;
          aiProviderSelect.value = 'doubao';
          await storage.set({ doubaoApiKey: localConfig.api.doubao.apiKey, aiProvider: 'doubao' });
        } else if (provider === 'spark' && localConfig.api?.spark?.apiKey) {
          sparkApiKeyInput.value = localConfig.api.spark.apiKey;
          aiProviderSelect.value = 'spark';
          await storage.set({ sparkApiKey: localConfig.api.spark.apiKey, aiProvider: 'spark' });
        } else if (provider === 'zhipu' && localConfig.api?.zhipu?.apiKey) {
          zhipuApiKeyInput.value = localConfig.api.zhipu.apiKey;
          aiProviderSelect.value = 'zhipu';
          await storage.set({ zhipuApiKey: localConfig.api.zhipu.apiKey, aiProvider: 'zhipu' });
        } else if (provider === 'moonshot' && localConfig.api?.moonshot?.apiKey) {
          moonshotApiKeyInput.value = localConfig.api.moonshot.apiKey;
          aiProviderSelect.value = 'moonshot';
          await storage.set({ moonshotApiKey: localConfig.api.moonshot.apiKey, aiProvider: 'moonshot' });
        } else if (provider === 'minimax' && localConfig.api?.minimax?.apiKey) {
          minimaxApiKeyInput.value = localConfig.api.minimax.apiKey;
          aiProviderSelect.value = 'minimax';
          await storage.set({ minimaxApiKey: localConfig.api.minimax.apiKey, aiProvider: 'minimax' });
        } else if (provider === 'atri' && localConfig.api?.atri?.apiKey) {
          atriApiKeyInput.value = localConfig.api.atri.apiKey;
          aiProviderSelect.value = 'atri';
          await storage.set({ atriApiKey: localConfig.api.atri.apiKey, aiProvider: 'atri' });
        }
      }
    } catch (e) {
      console.log('[Live2D Popup2] Auto-load config failed:', e);
    }
  })();
  
  // 刷新信息按钮事件 - 从本地文件读取并同步到设置
  if (refreshInfoBtn) {
    refreshInfoBtn.addEventListener('click', async () => {
      refreshStatus.className = 'connect-status loading';
      refreshStatus.textContent = '正在读取本地文件...';
      
      try {
        let loadedConfig = null;
        let loadedPrompts = null;
        
        // 读取 config.json
        try {
          const configRes = await fetch('live2d-ai/json/config.json');
          if (configRes.ok) {
            loadedConfig = await configRes.json();
            console.log('[Live2D Popup2] Loaded config.json:', loadedConfig);
          }
        } catch (e) {
          console.log('[Live2D Popup2] Failed to load config.json:', e);
        }
        
        // 读取 prompts.json
        try {
          const promptsRes = await fetch('live2d-ai/json/prompts.json');
          if (promptsRes.ok) {
            loadedPrompts = await promptsRes.json();
            console.log('[Live2D Popup2] Loaded prompts.json:', loadedPrompts);
          }
        } catch (e) {
          console.log('[Live2D Popup2] Failed to load prompts.json:', e);
        }
        
        // 更新输入框和保存设置
        // 修改逻辑：只更新当前用户选择的提供商对应的 key，不切换提供商
        const currentProvider = aiProviderSelect.value;
        let hasUpdates = false;
        
        // 从 config.json 读取 API Key
        if (loadedConfig) {
          // 根据当前选择的提供商，只更新该提供商的 key（如果 config.json 中有配置）
          const currentProviderConfig = loadedConfig.api?.[currentProvider];
          if (currentProviderConfig?.apiKey) {
            // 只更新当前选择提供商的 key，不切换提供商
            if (currentProvider === 'deepseek') {
              aiApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ aiApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'siliconflow') {
              siliconflowApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ siliconflowApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'univibe') {
              univibeApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ univibeApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'longcat') {
              longcatApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ longcatApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'qwen') {
              qwenApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ qwenApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'hunyuan') {
              hunyuanApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ hunyuanApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'ernie') {
              ernieApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ ernieApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'doubao') {
              doubaoApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ doubaoApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'spark') {
              sparkApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ sparkApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'zhipu') {
              zhipuApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ zhipuApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'moonshot') {
              moonshotApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ moonshotApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'minimax') {
              minimaxApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ minimaxApiKey: currentProviderConfig.apiKey });
            } else if (currentProvider === 'atri') {
              atriApiKeyInput.value = currentProviderConfig.apiKey;
              await storage.set({ atriApiKey: currentProviderConfig.apiKey });
            }
            hasUpdates = true;
            console.log('[Live2D Popup2] Updated API key for provider:', currentProvider);
          }
        }
        
        // 从 prompts.json 读取角色信息
        if (loadedPrompts?.templates?.[0]) {
          const template = loadedPrompts.templates[0];
          const systemPrompt = template.system_prompt || '';
          
          // 解析角色信息
          let name = '', likes = '', relation = '', profile = '', limit = '';
          
          // 尝试从 system_prompt 中提取信息
          const nameMatch = systemPrompt.match(/你的名字是[^\n]+/);
          if (nameMatch) name = nameMatch[0].replace('你的名字是', '').trim().replace(/[。.，,、；！？]$/, '');
          
          const relationMatch = systemPrompt.match(/你与用户的关系是[^\n]+/);
          if (relationMatch) relation = relationMatch[0].replace('你与用户的关系是', '').trim().replace(/[。.，,、；！？]$/, '');
          
          const likesMatch = systemPrompt.match(/你喜欢[^\n]+/);
          if (likesMatch) likes = likesMatch[0].replace('你喜欢', '').trim().replace(/[。.，,、；！？]$/, '');
          
          // 从角色设定和限制部分提取
          const profileMatch = systemPrompt.match(/角色设定：\n([\s\S]*?)(?=\n限制：|$)/);
          if (profileMatch) profile = profileMatch[1].trim().replace(/[。.，,、；！？]$/, '');
          
          const limitMatch = systemPrompt.match(/限制：\n([\s\S]*?)(?=\n请始终|$)/);
          if (limitMatch) limit = limitMatch[1].trim().replace(/[。.，,、；！？]$/, '');
          
          // 如果模板有 name 字段则使用
          if (template.name && !name) name = template.name;
          
          // 更新输入框
          if (name) { characterNameInput.value = name; hasUpdates = true; }
          if (likes) { characterLikesInput.value = likes; hasUpdates = true; }
          if (relation) { characterRelationInput.value = relation; hasUpdates = true; }
          if (profile) { characterProfileInput.value = profile; hasUpdates = true; }
          if (limit) { characterLimitInput.value = limit; hasUpdates = true; }
          
          // 保存角色信息到 storage
          await storage.set({
            characterName: name,
            characterLikes: likes,
            characterRelation: relation,
            characterProfile: profile,
            characterLimit: limit
          });
        }
        
        // 同时保存到 localStorage
        const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        if (characterNameInput) settings.characterName = characterNameInput.value.trim();
        if (characterLikesInput) settings.characterLikes = characterLikesInput.value.trim();
        if (characterRelationInput) settings.characterRelation = characterRelationInput.value.trim();
        if (characterProfileInput) settings.characterProfile = characterProfileInput.value.trim();
        if (characterLimitInput) settings.characterLimit = characterLimitInput.value.trim();
        if (summaryRulesInput) settings.summaryRules = summaryRulesInput.value;
        if (aiApiKeyInput) settings.aiApiKey = aiApiKeyInput.value.trim();
        if (siliconflowApiKeyInput) settings.siliconflowApiKey = siliconflowApiKeyInput.value.trim();
        if (aiProviderSelect) settings.aiProvider = aiProviderSelect.value;
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
        
        if (hasUpdates) {
          refreshStatus.className = 'connect-status success';
          refreshStatus.textContent = '已从本地文件刷新信息喵~';
        } else {
          refreshStatus.className = 'connect-status error';
          refreshStatus.textContent = '⚠️ 未找到本地配置文件，请先创建文件';
        }
      } catch (e) {
        console.error('[Live2D Popup2] Refresh error:', e);
        refreshStatus.className = 'connect-status error';
        refreshStatus.textContent = '❌ 读取失败：' + e.message;
      }
      
      setTimeout(() => {
        refreshStatus.className = 'connect-status';
        refreshStatus.textContent = '';
      }, 3000);
    });
  }
  
  // 初始化跟随系统主题开关
  if (followSystemThemeCheckbox) {
    followSystemThemeCheckbox.checked = config.followSystemTheme || false;
  }
  
  // 初始化自动更新开关
  if (autoUpdateCheckbox) {
    autoUpdateCheckbox.checked = config.autoUpdate || false;
  }
  
  // 初始化AI设置状态
  const aiEnabled = config.aiEnabled || false;
  
  // 设置AI设置区域的可访问状态
  if (aiSettingsContainer && !aiEnabled) {
    aiSettingsContainer.style.opacity = '0.5';
    aiSettingsContainer.style.pointerEvents = 'none';
  }
  
  // 显示/隐藏AI禁用提示
  if (aiDisabledHint) {
    aiDisabledHint.style.display = aiEnabled ? 'none' : 'block';
  }
  
  // 初始化 API 提供商
  if (aiProviderSelect) {
    aiProviderSelect.value = config.aiProvider || 'deepseek';
  }
  
  // 初始化 API Keys
  if (aiApiKeyInput) {
    aiApiKeyInput.value = config.aiApiKey || '';
  }
  if (siliconflowApiKeyInput) {
    siliconflowApiKeyInput.value = config.siliconflowApiKey || '';
  }
  if (univibeApiKeyInput) {
    univibeApiKeyInput.value = config.univibeApiKey || '';
  }
  if (longcatApiKeyInput) {
    longcatApiKeyInput.value = config.longcatApiKey || '';
  }
  if (qwenApiKeyInput) {
    qwenApiKeyInput.value = config.qwenApiKey || '';
  }
  if (hunyuanApiKeyInput) {
    hunyuanApiKeyInput.value = config.hunyuanApiKey || '';
  }
  if (ernieApiKeyInput) {
    ernieApiKeyInput.value = config.ernieApiKey || '';
  }
  if (doubaoApiKeyInput) {
    doubaoApiKeyInput.value = config.doubaoApiKey || '';
  }
  if (sparkApiKeyInput) {
    sparkApiKeyInput.value = config.sparkApiKey || '';
  }
  if (zhipuApiKeyInput) {
    zhipuApiKeyInput.value = config.zhipuApiKey || '';
  }
  if (moonshotApiKeyInput) {
    moonshotApiKeyInput.value = config.moonshotApiKey || '';
  }
  if (minimaxApiKeyInput) {
    minimaxApiKeyInput.value = config.minimaxApiKey || '';
  }
  if (atriApiKeyInput) {
    atriApiKeyInput.value = config.atriApiKey || '';
  }
  
  // 显示对应 API 提供商的配置
  function updateProviderConfig(providerValue) {
    const provider = providerValue || aiProviderSelect.value;
    // 隐藏所有配置
    deepseekConfigDiv.style.display = 'none';
    siliconflowConfigDiv.style.display = 'none';
    univibeConfigDiv.style.display = 'none';
    longcatConfigDiv.style.display = 'none';
    qwenConfigDiv.style.display = 'none';
    hunyuanConfigDiv.style.display = 'none';
    ernieConfigDiv.style.display = 'none';
    doubaoConfigDiv.style.display = 'none';
    sparkConfigDiv.style.display = 'none';
    zhipuConfigDiv.style.display = 'none';
    moonshotConfigDiv.style.display = 'none';
    minimaxConfigDiv.style.display = 'none';
    atriConfigDiv.style.display = 'none';
    
    // 显示当前选中的配置
    if (provider === 'deepseek') {
      deepseekConfigDiv.style.display = 'block';
    } else if (provider === 'siliconflow') {
      siliconflowConfigDiv.style.display = 'block';
    } else if (provider === 'univibe') {
      univibeConfigDiv.style.display = 'block';
    } else if (provider === 'longcat') {
      longcatConfigDiv.style.display = 'block';
    } else if (provider === 'qwen') {
      qwenConfigDiv.style.display = 'block';
    } else if (provider === 'hunyuan') {
      hunyuanConfigDiv.style.display = 'block';
    } else if (provider === 'ernie') {
      ernieConfigDiv.style.display = 'block';
    } else if (provider === 'doubao') {
      doubaoConfigDiv.style.display = 'block';
    } else if (provider === 'spark') {
      sparkConfigDiv.style.display = 'block';
    } else if (provider === 'zhipu') {
      zhipuConfigDiv.style.display = 'block';
    } else if (provider === 'moonshot') {
      moonshotConfigDiv.style.display = 'block';
    } else if (provider === 'minimax') {
      minimaxConfigDiv.style.display = 'block';
    } else if (provider === 'atri') {
      atriConfigDiv.style.display = 'block';
    }
  }
  updateProviderConfig();
  
  // 如果开启了跟随系统主题，自动应用系统主题
  if (config.followSystemTheme) {
    updateThemeFromSystem();
  } else {
    // 否则使用保存的主题
    const savedTheme = config.theme || 'light';
    applyTheme(savedTheme === 'dark');
  }
  
  // 初始化连接状态显示
  const statusEl = document.getElementById('aiConnectionStatus');
  if (statusEl) {
    if (config.aiConnected) {
      statusEl.textContent = '已连接';
      statusEl.style.color = '#28a745';
    } else {
      statusEl.textContent = '未连接';
      statusEl.style.color = '#dc3545';
    }
  }
  
  // 更新 connectStatus 显示
  if (connectStatus) {
    if (config.aiConnected) {
      connectStatus.className = 'connect-status success';
      connectStatus.textContent = '已连接喵~';
    } else {
      connectStatus.className = 'connect-status';
      connectStatus.textContent = '';
    }
  }
  
  // 设置系统主题监听
  if (window.matchMedia) {
    systemThemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    systemThemeMediaQuery.addEventListener('change', (e) => {
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      if (settings.followSystemTheme) {
        handleSystemThemeChange(e);
      }
    });
  }
  
  // 监听存储变化，实时更新连接状态
  function updateConnectionStatusFromStorage() {
    const statusEl = document.getElementById('aiConnectionStatus');
    const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
    
    if (statusEl) {
      if (settings.aiConnected) {
        statusEl.textContent = '已连接';
        statusEl.style.color = '#28a745';
      } else {
        statusEl.textContent = '未连接';
        statusEl.style.color = '#dc3545';
      }
    }
    
    if (connectStatus) {
      if (settings.aiConnected) {
        // 只有 connectStatus 当前没有显示其他状态时才更新
        if (!connectStatus.classList.contains('loading') && 
            !connectStatus.classList.contains('error') &&
            !connectStatus.classList.contains('success')) {
          connectStatus.className = 'connect-status success';
          connectStatus.textContent = '已连接喵~';
        }
      } else {
        // 断开连接时，不管之前是什么状态，都清空
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    }
  }
  
  // 监听 chrome.storage 变化
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (changes.aiConnected) {
        updateConnectionStatusFromStorage();
      }
    });
  }
  
  // 监听 localStorage 变化
  window.addEventListener('storage', (e) => {
    if (e.key === 'live2dExtensionSettings') {
      updateConnectionStatusFromStorage();
    }
  });
  
  // 定期检查连接状态（5秒检查一次）
  setInterval(updateConnectionStatusFromStorage, 5000);
  
  // 跟随系统主题开关事件
  if (followSystemThemeCheckbox) {
    followSystemThemeCheckbox.addEventListener('change', async () => {
      const isFollow = followSystemThemeCheckbox.checked;
      await storage.set({ followSystemTheme: isFollow });
      
      // 更新 localStorage 中的设置
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.followSystemTheme = isFollow;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
      
      if (isFollow) {
        // 开启跟随系统主题，立即应用系统主题
        updateThemeFromSystem();
      }
    });
  }
  
  // 自动更新开关事件
  if (autoUpdateCheckbox) {
    autoUpdateCheckbox.addEventListener('change', async () => {
      const enabled = autoUpdateCheckbox.checked;
      await storage.set({ autoUpdate: enabled });
      
      // 更新 localStorage 中的设置
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.autoUpdate = enabled;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
      
      if (enabled) {
        // 开启自动更新时立即检查一次
        showUpdateStatus('loading', '自动更新已开启，正在检查...');
        if (checkUpdateBtn) checkUpdateBtn.disabled = true;
        try {
          await silentCheckUpdate();
        } finally {
          if (checkUpdateBtn) checkUpdateBtn.disabled = false;
        }
        
        // 每6小时自动检查一次
        if (window._autoUpdateTimer) clearInterval(window._autoUpdateTimer);
        window._autoUpdateTimer = setInterval(async () => {
          await silentCheckUpdate();
        }, 6 * 60 * 60 * 1000);
      } else {
        // 关闭自动更新，清除定时器
        if (window._autoUpdateTimer) {
          clearInterval(window._autoUpdateTimer);
          window._autoUpdateTimer = null;
        }
        // 隐藏状态
        if (updateStatusEl) {
          updateStatusEl.style.display = 'none';
        }
      }
    });
    
    // 如果已开启自动更新，启动定时器
    if (config.autoUpdate) {
      window._autoUpdateTimer = setInterval(async () => {
        await silentCheckUpdate();
      }, 6 * 60 * 60 * 1000);
    }
  }
  
  // 检查更新按钮事件
  if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', async () => {
      await manualCheckUpdate();
    });
  }
  
  // API 提供商切换事件
  if (aiProviderSelect) {
    aiProviderSelect.addEventListener('change', async () => {
      const provider = aiProviderSelect.value;
      await storage.set({ aiProvider: provider });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.aiProvider = provider;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
      
      updateProviderConfig();
      
      // 清除状态
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // DeepSeek API Key 输入事件
  if (aiApiKeyInput) {
    aiApiKeyInput.addEventListener('change', async () => {
      const apiKey = aiApiKeyInput.value.trim();
      await storage.set({ aiApiKey: apiKey });
      
      // 更新 localStorage 中的设置
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.aiApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    // 输入时清除状态
    aiApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 硅基流动 API Key 输入事件
  if (siliconflowApiKeyInput) {
    siliconflowApiKeyInput.addEventListener('change', async () => {
      const apiKey = siliconflowApiKeyInput.value.trim();
      await storage.set({ siliconflowApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.siliconflowApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    // 输入时清除状态
    siliconflowApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // UniVibe API Key 输入事件
  if (univibeApiKeyInput) {
    univibeApiKeyInput.addEventListener('change', async () => {
      const apiKey = univibeApiKeyInput.value.trim();
      await storage.set({ univibeApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.univibeApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    // 输入时清除状态
    univibeApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // LongCat API Key 输入事件
  if (longcatApiKeyInput) {
    longcatApiKeyInput.addEventListener('change', async () => {
      const apiKey = longcatApiKeyInput.value.trim();
      console.log('[Live2D Popup2] Longcat API Key change event, key:', apiKey ? '已输入' : '为空');
      await storage.set({ longcatApiKey: apiKey });
      console.log('[Live2D Popup2] Longcat API Key saved to storage');
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.longcatApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
      console.log('[Live2D Popup2] Longcat API Key saved to localStorage');
    });
    
    longcatApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 通义千问 API Key 输入事件
  if (qwenApiKeyInput) {
    qwenApiKeyInput.addEventListener('change', async () => {
      const apiKey = qwenApiKeyInput.value.trim();
      await storage.set({ qwenApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.qwenApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    qwenApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 腾讯云混元 API Key 输入事件
  if (hunyuanApiKeyInput) {
    hunyuanApiKeyInput.addEventListener('change', async () => {
      const apiKey = hunyuanApiKeyInput.value.trim();
      await storage.set({ hunyuanApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.hunyuanApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    hunyuanApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 百度文心 API Key 输入事件
  if (ernieApiKeyInput) {
    ernieApiKeyInput.addEventListener('change', async () => {
      const apiKey = ernieApiKeyInput.value.trim();
      await storage.set({ ernieApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.ernieApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    ernieApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 字节豆包 API Key 输入事件
  if (doubaoApiKeyInput) {
    doubaoApiKeyInput.addEventListener('change', async () => {
      const apiKey = doubaoApiKeyInput.value.trim();
      await storage.set({ doubaoApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.doubaoApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    doubaoApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 讯飞星火 API Key 输入事件
  if (sparkApiKeyInput) {
    sparkApiKeyInput.addEventListener('change', async () => {
      const apiKey = sparkApiKeyInput.value.trim();
      await storage.set({ sparkApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.sparkApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    sparkApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // 智谱 AI API Key 输入事件
  if (zhipuApiKeyInput) {
    zhipuApiKeyInput.addEventListener('change', async () => {
      const apiKey = zhipuApiKeyInput.value.trim();
      await storage.set({ zhipuApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.zhipuApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    zhipuApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // Kimi API Key 输入事件
  if (moonshotApiKeyInput) {
    moonshotApiKeyInput.addEventListener('change', async () => {
      const apiKey = moonshotApiKeyInput.value.trim();
      await storage.set({ moonshotApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.moonshotApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    moonshotApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }
  
  // MiniMax API Key 输入事件
  if (minimaxApiKeyInput) {
    minimaxApiKeyInput.addEventListener('change', async () => {
      const apiKey = minimaxApiKeyInput.value.trim();
      await storage.set({ minimaxApiKey: apiKey });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.minimaxApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
    
    minimaxApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }

  // ATRI API Key 输入事件
  if (atriApiKeyInput) {
    atriApiKeyInput.addEventListener('change', async () => {
      const apiKey = atriApiKeyInput.value.trim();
      await storage.set({ atriApiKey: apiKey });

      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.atriApiKey = apiKey;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });

    atriApiKeyInput.addEventListener('input', () => {
      if (connectStatus) {
        connectStatus.className = 'connect-status';
        connectStatus.textContent = '';
      }
    });
  }

  // 总结规则输入事件
  if (summaryRulesInput) {
    summaryRulesInput.addEventListener('change', async () => {
      const val = summaryRulesInput.value;
      await storage.set({ summaryRules: val });
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.summaryRules = val;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
    });
  }

  // 连接按钮事件
  if (connectBtn && connectStatus) {
    connectBtn.addEventListener('click', async () => {
      const provider = aiProviderSelect.value;
      let apiKey;
      
      if (provider === 'deepseek') {
        apiKey = aiApiKeyInput.value.trim();
      } else if (provider === 'siliconflow') {
        apiKey = siliconflowApiKeyInput.value.trim();
      } else if (provider === 'univibe') {
        apiKey = univibeApiKeyInput.value.trim();
      } else if (provider === 'longcat') {
        apiKey = longcatApiKeyInput.value.trim();
      } else if (provider === 'qwen') {
        apiKey = qwenApiKeyInput.value.trim();
      } else if (provider === 'hunyuan') {
        apiKey = hunyuanApiKeyInput.value.trim();
      } else if (provider === 'ernie') {
        apiKey = ernieApiKeyInput.value.trim();
      } else if (provider === 'doubao') {
        apiKey = doubaoApiKeyInput.value.trim();
      } else if (provider === 'spark') {
        apiKey = sparkApiKeyInput.value.trim();
      } else if (provider === 'zhipu') {
        apiKey = zhipuApiKeyInput.value.trim();
      } else if (provider === 'moonshot') {
        apiKey = moonshotApiKeyInput.value.trim();
      } else if (provider === 'minimax') {
        apiKey = minimaxApiKeyInput.value.trim();
      } else if (provider === 'atri') {
        apiKey = atriApiKeyInput.value.trim();
      }
      
      if (!apiKey) {
        connectStatus.className = 'connect-status error';
        connectStatus.textContent = '请输入 API Key喵~';
        return;
      }
      
      // 保存 API Key
      const apiKeyMap = {
        deepseek: { storageKey: 'aiApiKey', value: apiKey },
        siliconflow: { storageKey: 'siliconflowApiKey', value: apiKey },
        univibe: { storageKey: 'univibeApiKey', value: apiKey },
        longcat: { storageKey: 'longcatApiKey', value: apiKey },
        qwen: { storageKey: 'qwenApiKey', value: apiKey },
        hunyuan: { storageKey: 'hunyuanApiKey', value: apiKey },
        ernie: { storageKey: 'ernieApiKey', value: apiKey },
        doubao: { storageKey: 'doubaoApiKey', value: apiKey },
        spark: { storageKey: 'sparkApiKey', value: apiKey },
        zhipu: { storageKey: 'zhipuApiKey', value: apiKey },
        moonshot: { storageKey: 'moonshotApiKey', value: apiKey },
        minimax: { storageKey: 'minimaxApiKey', value: apiKey },
        atri: { storageKey: 'atriApiKey', value: apiKey }
      };
      
      const keyInfo = apiKeyMap[provider] || apiKeyMap.deepseek;
      const modelSelect = document.getElementById(`${provider}Model`);
      const selectedModel = modelSelect ? modelSelect.value : '';
      console.log('[Live2D Popup2] Connect button clicked, provider:', provider, 'model:', selectedModel, 'apiKey length:', keyInfo.value.length);
      await storage.set({ [keyInfo.storageKey]: keyInfo.value, aiProvider: provider, aiConnected: false, [`${provider}Model`]: selectedModel });
      console.log('[Live2D Popup2] API Key saved to storage:', keyInfo.storageKey);
      
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.aiProvider = provider;
      settings[keyInfo.storageKey] = keyInfo.value;
      settings[`${provider}Model`] = selectedModel;
      settings.aiConnected = false;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
      
      // 显示加载状态
      connectBtn.disabled = true;
      connectStatus.className = 'connect-status loading';
      connectStatus.textContent = '正在连接喵...';
      
      // 测试对应 API
      let result;
      if (provider === 'deepseek') {
        result = await testDeepSeekApi(apiKey);
      } else if (provider === 'siliconflow') {
        result = await testSiliconFlowApi(apiKey);
      } else if (provider === 'univibe') {
        result = await testUnivibeApi(apiKey);
      } else if (provider === 'longcat') {
        result = await testLongCatApi(apiKey, selectedModel);
      } else if (provider === 'qwen') {
        result = await testQwenApi(apiKey);
      } else if (provider === 'hunyuan') {
        result = await testHunyuanApi(apiKey, selectedModel);
      } else if (provider === 'ernie') {
        result = await testErnieApi(apiKey);
      } else if (provider === 'doubao') {
        result = await testDoubaoApi(apiKey);
      } else if (provider === 'spark') {
        result = await testSparkApi(apiKey);
      } else if (provider === 'zhipu') {
        result = await testZhipuApi(apiKey);
      } else if (provider === 'moonshot') {
        result = await testMoonshotApi(apiKey);
      } else if (provider === 'minimax') {
        result = await testMinimaxApi(apiKey);
      } else if (provider === 'atri') {
        result = await testAtriApi(apiKey, selectedModel || 'gpt-5.4');
      } else {
        result = { success: false, error: '不支持的 API 提供商' };
      }
      
      connectBtn.disabled = false;
      
      if (result.success) {
        connectStatus.className = 'connect-status success';
        connectStatus.textContent = '连接成功！API Key 有效喵~';
        
        // 保存连接成功状态
        await storage.set({ aiConnected: true });
        const successSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        successSettings.aiConnected = true;
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(successSettings));
        
        // 如果有页面上的状态显示，也更新一下
        const statusEl = document.getElementById('aiConnectionStatus');
        if (statusEl) {
          statusEl.textContent = '已连接';
          statusEl.style.color = '#28a745';
        }
      } else {
        connectStatus.className = 'connect-status error';
        connectStatus.textContent = '连接失败喵~';
        
        // 保存连接失败状态
        await storage.set({ aiConnected: false });
        const failSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
        failSettings.aiConnected = false;
        localStorage.setItem('live2dExtensionSettings', JSON.stringify(failSettings));
        
        // 更新状态显示
        const statusEl = document.getElementById('aiConnectionStatus');
        if (statusEl) {
          statusEl.textContent = '未连接';
          statusEl.style.color = '#dc3545';
        }
        
        // 2秒后清空错误提示
        setTimeout(() => {
          connectStatus.className = 'connect-status';
          connectStatus.textContent = '';
        }, 2000);
      }
    });
  }

  // 返回按钮点击事件
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'popup.html';
    });
  }
  
  // 跳转到popup按钮点击事件
  const goToPopupBtn = document.getElementById('goToPopupBtn');
  if (goToPopupBtn) {
    goToPopupBtn.addEventListener('click', () => {
      window.location.href = 'popup.html';
    });
    
    // 添加hover样式
    goToPopupBtn.addEventListener('mouseenter', () => {
      goToPopupBtn.style.background = 'rgba(102, 126, 234, 0.1)';
      goToPopupBtn.style.color = '#764ba2';
    });
    goToPopupBtn.addEventListener('mouseleave', () => {
      goToPopupBtn.style.background = 'none';
      goToPopupBtn.style.color = '#667eea';
    });
  }

  // ========== GitHub 代理加速（节点管理）==========
  var DEFAULT_GH_PROXIES = [
    'https://v6.gh-proxy.org/',
    'https://gh-proxy.org/',
    'https://v4.gh-proxy.org/',
    'https://cdn.gh-proxy.org/'
  ];
  var ghToggle = document.getElementById('githubProxyToggle');
  var ghStatus = document.getElementById('githubProxyStatus');
  var ghNodeListEl = document.getElementById('ghProxyNodeList');
  var ghCustomInput = document.getElementById('ghProxyCustomInput');
  var ghAddBtn = document.getElementById('ghProxyAddBtn');
  var ghRefreshBtn = document.getElementById('ghProxyRefreshBtn');
  var ghResetBtn = document.getElementById('ghProxyResetBtn');
  var _ghNodes = [];
  var _ghSelected = '';

  function loadGhNodes(callback) {
    browserAPI.storage.local.get(['ghProxyNodes', 'githubProxyUrl', 'githubProxyEnabled', 'ghProxyExpanded'], function(r) {
      _ghNodes = r.ghProxyNodes || DEFAULT_GH_PROXIES.slice();
      _ghSelected = r.githubProxyUrl || _ghNodes[0] || '';
      if (ghToggle) ghToggle.checked = !!r.githubProxyEnabled;
      updateGhStatus(!!r.githubProxyEnabled);
      renderGhNodes();
      // 恢复展开/折叠状态
      if (r.ghProxyExpanded) setGhExpanded(true);
      if (callback) callback();
    });
  }

  function saveGhNodes() {
    browserAPI.storage.local.set({ ghProxyNodes: _ghNodes });
  }

  function renderGhNodes() {
    if (!ghNodeListEl) return;
    ghNodeListEl.innerHTML = '';
    _ghNodes.forEach(function(url, idx) {
      var row = document.createElement('div');
      row.className = 'gh-node-row' + (url === _ghSelected ? ' selected' : '');
      // 选中 radio
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'ghProxyNode';
      radio.checked = url === _ghSelected;
      radio.style.cssText = 'margin:0; flex-shrink:0;';
      radio.addEventListener('change', function() {
        if (radio.checked) {
          _ghSelected = url;
          browserAPI.storage.local.set({ githubProxyUrl: url, ghManualOverride: true, _ghProxyForceSwitch: Date.now() });
          // 更新折叠状态标签
          if (ghLabel) {
            var activeNode = url.replace('https://', '').replace(/\/$/, '');
            ghLabel.textContent = '代理节点 (' + activeNode + ')';
          }
          renderGhNodes();
          updateGhSummary();
        }
      });
      row.appendChild(radio);
      // 地址显示
      var label = document.createElement('span');
      label.className = 'gh-node-label';
      label.textContent = url.replace('https://', '').replace(/\/$/, '');
      row.appendChild(label);
      // 延迟标签
      var latency = document.createElement('span');
      latency.id = 'ghLat_' + idx;
      latency.textContent = '...';
      latency.style.cssText = 'font-size:10px; color:#888; min-width:48px; text-align:right;';
      row.appendChild(latency);
      // 删除按钮（最少保留一条）
      var delBtn = document.createElement('button');
      delBtn.textContent = '✕';
      delBtn.title = '删除节点';
      delBtn.style.cssText = 'background:none; border:none; color:#e06060; cursor:pointer; font-size:12px; padding:0 2px; flex-shrink:0;';
      delBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (_ghNodes.length <= 1) return;
        _ghNodes.splice(idx, 1);
        if (_ghSelected === url) {
          _ghSelected = _ghNodes[0];
          browserAPI.storage.local.set({ githubProxyUrl: _ghSelected });
          browserAPI.runtime.sendMessage({ action: 'switchGhProxy', proxy: _ghSelected });
        }
        saveGhNodes();
        renderGhNodes();
        testGhLatencies();
      });
      row.appendChild(delBtn);
      ghNodeListEl.appendChild(row);
    });
    // 触发延迟测试
    testGhLatencies();
  }

  function updateGhSummary() {
    var summaryEl = document.getElementById('ghProxySummary');
    if (!summaryEl) return;
    var idx = _ghNodes.indexOf(_ghSelected);
    if (idx < 0) { summaryEl.textContent = ''; return; }
    var el = document.getElementById('ghLat_' + idx);
    if (el && el.textContent && el.textContent !== '测速中...' && el.textContent !== '...') {
      summaryEl.textContent = el.textContent;
      summaryEl.style.color = el.style.color;
    } else {
      summaryEl.textContent = '测速中...';
      summaryEl.style.color = '#999';
    }
  }

  function testGhLatencies() {
    _ghNodes.forEach(function(url, idx) {
      var el = document.getElementById('ghLat_' + idx);
      if (!el) return;
      el.textContent = '测速中...';
      var testUrl = url.replace(/\/+$/, '') + '/https://raw.githubusercontent.com/CatmaoU/live2d-extension/main/README.md';
      var start = Date.now();
      fetch(testUrl, { method: 'GET', mode: 'cors', signal: AbortSignal.timeout(6000) })
        .then(function(r) {
          var latencyMs = Date.now() - start;
          return r.text().then(function(body) {
            var totalMs = Date.now() - start;
            var speedKB = totalMs > 0 ? (body.length / (totalMs / 1000)) / 1024 : 0;
            var speedStr = speedKB >= 1024 ? (speedKB/1024).toFixed(1) + 'MB/s' : Math.round(speedKB) + 'KB/s';
            el.textContent = latencyMs + 'ms | ' + speedStr;
            el.style.color = speedKB >= 500 ? '#4CAF50' : speedKB >= 100 ? '#FF9800' : '#e06060';
            updateGhSummary();
          });
        })
        .catch(function() {
          var img = new Image();
          var start2 = Date.now();
          var timedOut = false;
          var timer = setTimeout(function() { timedOut = true; img.src = ''; }, 6000);
          img.onerror = function() {
            clearTimeout(timer);
            if (timedOut) return;
            var ms = Date.now() - start2;
            el.textContent = ms + 'ms';
            el.style.color = ms < 500 ? '#4CAF50' : ms < 1500 ? '#FF9800' : '#e06060';
            updateGhSummary();
          };
          img.src = testUrl;
        });
    });
  }

  // 折叠切换
  var ghToggleBtn = document.getElementById('ghProxyToggleBtn');
  var ghBody = document.getElementById('ghProxyBody');
  var ghArrow = document.getElementById('ghProxyArrow');
  var ghLabel = document.getElementById('ghProxyToggleLabel');
  var _expanded = false;
  var _ghAutoTimer = null;

  function setGhExpanded(expanded) {
    _expanded = expanded;
    if (ghBody) ghBody.style.display = expanded ? 'block' : 'none';
    if (ghArrow) ghArrow.style.transform = expanded ? 'rotate(90deg)' : 'none';
    browserAPI.storage.local.set({ ghProxyExpanded: expanded });
    if (expanded) {
      if (_ghAutoTimer) { clearInterval(_ghAutoTimer); _ghAutoTimer = null; }
      browserAPI.storage.local.set({ ghManualOverride: true });
    } else {
      browserAPI.storage.local.set({ ghManualOverride: false });
      startGhAutoRefresh();
    }
  }

  if (ghToggleBtn && ghBody) {
    ghToggleBtn.addEventListener('click', function() {
      setGhExpanded(!_expanded);
    });
  }
  function startGhAutoRefresh() {
    if (_ghAutoTimer) clearInterval(_ghAutoTimer);
    if (_expanded) return;
    // 首次测速
    testGhLatencies();
    // 每 2 秒刷新
    _ghAutoTimer = setInterval(function() {
      if (_expanded) { clearInterval(_ghAutoTimer); _ghAutoTimer = null; return; }
      testGhLatencies();
    }, 2000);
  }

  // 测速完成后自动选择最快节点（折叠状态下）
  function autoPickFastest() {
    // 如果已展开（用户手动模式）不自动切换
    if (_expanded) return;
    // 读取测速结果，找速度最快的
    var bestIdx = -1;
    var bestSpeed = -1;
    _ghNodes.forEach(function(url, idx) {
      var el = document.getElementById('ghLat_' + idx);
      if (!el) return;
      // 从显示文本中提取速度值
      var text = el.textContent;
      var match = text.match(/([\d.]+)\s*(KB|MB)/);
      if (!match) return;
      var val = parseFloat(match[1]);
      if (match[2] === 'MB') val *= 1024;
      if (val > bestSpeed) {
        bestSpeed = val;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0 && _ghNodes[bestIdx] !== _ghSelected) {
      _ghSelected = _ghNodes[bestIdx];
      browserAPI.storage.local.set({ githubProxyUrl: _ghSelected });
      browserAPI.runtime.sendMessage({ action: 'switchGhProxy', proxy: _ghSelected });
      if (ghLabel) ghLabel.textContent = '代理节点 (' + _ghSelected.replace('https://', '').replace(/\/$/, '') + ')';
    }
  }

  if (ghToggle) {
    loadGhNodes(function() {
      // 测速完成后自动选最快
      setTimeout(autoPickFastest, 3000);
      // 状态标签
      if (ghLabel) {
        var activeNode = _ghSelected.replace('https://', '').replace(/\/$/, '');
        ghLabel.textContent = '代理节点 (' + activeNode + ')';
      }
      // 初始状态：如果处于折叠状态则清除手动标记，否则保持展开状态设置的手动标记
      if (!_expanded) {
        browserAPI.storage.local.set({ ghManualOverride: false });
        startGhAutoRefresh();
      }
    });
    ghToggle.addEventListener('change', function() {
      var enabled = ghToggle.checked;
      updateGhStatus(enabled);
      if (enabled && _ghSelected) {
        browserAPI.storage.local.set({ githubProxyEnabled: true, _ghProxyForceSwitch: Date.now() });
      } else {
        browserAPI.storage.local.set({ githubProxyEnabled: false });
      }
    });
  }
  // 展开时显示当前选中节点
  function onExpandSelect() {
    if (ghLabel) {
      var activeNode = _ghSelected.replace('https://', '').replace(/\/$/, '');
      ghLabel.textContent = '代理节点 (' + activeNode + ')';
    }
  }

  // 添加自定义节点
  if (ghAddBtn && ghCustomInput) {
    ghAddBtn.addEventListener('click', function() {
      var val = ghCustomInput.value.trim();
      if (!val) return;
      if (!val.startsWith('http://') && !val.startsWith('https://')) val = 'https://' + val;
      if (!val.endsWith('/')) val += '/';
      if (_ghNodes.indexOf(val) >= 0) { ghCustomInput.value = ''; return; }
      _ghNodes.push(val);
      saveGhNodes();
      ghCustomInput.value = '';
      renderGhNodes();
    });
    ghCustomInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') ghAddBtn.click();
    });
  }

  // 刷新延迟
  if (ghRefreshBtn) ghRefreshBtn.addEventListener('click', testGhLatencies);

  // 重置节点
  if (ghResetBtn) {
    ghResetBtn.addEventListener('click', function() {
      if (_ghNodes.length === DEFAULT_GH_PROXIES.length && _ghNodes.every(function(v,i){ return v === DEFAULT_GH_PROXIES[i]; })) return;
      _ghNodes = DEFAULT_GH_PROXIES.slice();
      _ghSelected = _ghNodes[0];
      saveGhNodes();
      browserAPI.storage.local.set({ githubProxyUrl: _ghSelected });
      browserAPI.runtime.sendMessage({ action: 'switchGhProxy', proxy: _ghSelected });
      renderGhNodes();
    });
  }

  function updateGhStatus(enabled) {
    if (!ghStatus) return;
    ghStatus.textContent = enabled ? '已启用' : '已关闭';
    ghStatus.style.color = enabled ? '#4CAF50' : '#888';
  }

  // ========== 分页导航 ==========
  (function() {
    var page1 = document.getElementById('page1');
    var page2 = document.getElementById('page2');
    var pagePrev = document.getElementById('pagePrevBtn');
    var pageNext = document.getElementById('pageNextBtn');
    var pageIndicator = document.getElementById('pageIndicator');
    var currentPage = 1;
    function showPage(num) {
      currentPage = num;
      if (page1) page1.style.display = num === 1 ? 'block' : 'none';
      if (page2) page2.style.display = num === 2 ? 'block' : 'none';
      if (pagePrev) {
        if (num === 1) pagePrev.setAttribute('disabled', '');
        else pagePrev.removeAttribute('disabled');
      }
      if (pageNext) {
        if (num === 2) pageNext.setAttribute('disabled', '');
        else pageNext.removeAttribute('disabled');
      }
      if (pageIndicator) pageIndicator.textContent = num + ' / 2';
    }
    if (pagePrev) pagePrev.addEventListener('click', function() { if (currentPage > 1) showPage(currentPage - 1); });
    if (pageNext) pageNext.addEventListener('click', function() { if (currentPage < 2) showPage(currentPage + 1); });
    var startPage = window.location.hash === '#page2' ? 2 : 1;
    showPage(startPage);
  })();
});
