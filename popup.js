/*
 * Live2D Widget Extension
 * Popup Script
 */

// 浏览器API兼容层：支持Chrome和Firefox
const browserAPI = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;
console.log('[Live2D Popup] Browser detected:', typeof browser !== 'undefined' && browser.storage ? 'Firefox (or compatible)' : 'Chrome/Edge');

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
                console.error('[Live2D Popup] Storage get error:', e);
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
                console.error('[Live2D Popup] Storage set error:', e);
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

function updateThemeIcon(isDark) {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;
  
  if (isDark) {
    themeToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  } else {
    themeToggle.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }
}

function updateThemeFromSystem() {
  const isDark = getSystemTheme();
  applyTheme(isDark);
  updateThemeIcon(isDark);
  // 保存主题到存储
  storage.set({ theme: isDark ? 'dark' : 'light' });
  // 同步到 localStorage
  const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
  settings.theme = isDark ? 'dark' : 'light';
  localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));

  // 更新冻结模式下拉菜单样式
  const freezeModeSelectEl = document.getElementById('freezeModeSelect');
  const freezeModelEnabledCheckboxEl = document.getElementById('freezeModelEnabled');
  if (freezeModeSelectEl) {
    if (freezeModelEnabledCheckboxEl && freezeModelEnabledCheckboxEl.checked) {
      freezeModeSelectEl.style.backgroundColor = isDark ? '#1a1a2e' : '#fff';
      freezeModeSelectEl.style.color = isDark ? '#ffffff' : '#333';
      freezeModeSelectEl.style.cursor = 'pointer';
    } else {
      freezeModeSelectEl.style.backgroundColor = isDark ? '#252542' : '#f5f5f5';
      freezeModeSelectEl.style.color = isDark ? '#888' : '#999';
      freezeModeSelectEl.style.cursor = 'not-allowed';
    }
  }
}

function handleSystemThemeChange(e) {
  console.log('[Live2D Popup] System theme changed:', e.matches ? 'dark' : 'light');
  updateThemeFromSystem();
}

const tabs = {
    query: function(options) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof browserAPI.tabs.query === 'function') {
                    let isPromiseStyle = false;
                    try {
                        const testResult = browserAPI.tabs.query(options);
                        if (testResult && typeof testResult.then === 'function') {
                            isPromiseStyle = true;
                            testResult.then(resolve).catch(reject);
                        }
                    } catch (e) {}

                    if (!isPromiseStyle) {                       browserAPI.tabs.query(options, function(result) {
                            if (browserAPI.runtime.lastError) {
                                reject(browserAPI.runtime.lastError);
                            } else {
                                resolve(result || []);
                            }
                        });
                    }
                } else {
                    resolve([]);
                }
            } catch (e) {
                console.error('[Live2D Popup] Tabs query error:', e);
                resolve([]);
            }
        });
    },
    reload: function(tabId) {
        return new Promise((resolve, reject) => {
            try {
                if (typeof browserAPI.tabs.reload === 'function') {
                    let isPromiseStyle = false;
                    try {
                        const testResult = browserAPI.tabs.reload(tabId);
                        if (testResult && typeof testResult.then === 'function') {
                            isPromiseStyle = true;
                            testResult.then(resolve).catch(reject);
                        }
                    } catch (e) {}

                    if (!isPromiseStyle) {
                        browserAPI.tabs.reload(tabId, function() {
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
                console.error('[Live2D Popup] Tabs reload error:', e);
                resolve();
            }
        });
    }
};

let modelsList = [];
let modelsNameMap = {};
let cubism3ModelsList = [];
let currentFormatIsCubism3 = false;
let modelCategories = {};
let categoryToFolder = {};

async function loadLocalModels() {
  try {
    const baseUrl = runtime.getURL('');
    if (!baseUrl) {
      console.error('[Live2D] Failed to get extension base URL');
      return [];
    }

    const modelsRes = await fetch(baseUrl + 'live2d-static-api/indexes/models.json', { cache: 'no-cache' });
    const models = await modelsRes.json();

    try {
      const namesRes = await fetch(baseUrl + 'live2d-static-api/models_name.json', { cache: 'no-cache' });
      modelsNameMap = await namesRes.json();
    } catch (e) {
      console.warn('[Live2D] Could not load models_name.json, using default names');
    }

    try {
      const categoriesRes = await fetch(baseUrl + 'live2d-static-api/model-categories.json', { cache: 'no-cache' });
      modelCategories = await categoriesRes.json();

      categoryToFolder = {};
      for (const [folder, name] of Object.entries(modelCategories)) {
        categoryToFolder[name] = folder;
      }
      console.log('[Live2D] Model categories loaded:', modelCategories);
    } catch (e) {
      console.warn('[Live2D] Could not load model-categories.json, skipping categories');
    }

    modelsList = models.filter(m => m.isCubism3 !== true);
    cubism3ModelsList = models.filter(m => m.isCubism3 === true);

    console.log('[Live2D] Loaded models:', {
      cubism2: modelsList.length,
      cubism3: cubism3ModelsList.length,
      currentFormat: currentFormatIsCubism3 ? 'Cubism3' : 'Cubism2'
    });

    populateModelSelect();
    updateModelsCount();
    return models;
  } catch (e) {
    console.error('[Live2D] Failed to load models list:', e);
    return [];
  }
}

function updateModelsCount() {
  const modelsCount = document.getElementById('modelsCount');
  const currentList = currentFormatIsCubism3 ? cubism3ModelsList : modelsList;
  if (modelsCount) {
    modelsCount.textContent = `模型数量: ${currentList.length}`;
  }
}

function getModelDisplayName(modelPath) {
  if (!modelPath) return null;

  if (modelsNameMap[modelPath]) {
    return modelsNameMap[modelPath];
  }

  const parts = modelPath.split('/');
  if (parts.length >= 2 && modelCategories[parts[0]]) {
    const category = modelCategories[parts[0]];
    const modelName = parts[1];
    return `${category} - ${modelName}`;
  }

  return modelPath;
}

function populateModelSelect() {
  const select = document.getElementById('localModel');
  if (!select) return;

  select.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = currentFormatIsCubism3 ? '请选择 Cubism 3 模型' : '请选择 Cubism 2 模型';
  select.appendChild(defaultOption);

  const currentList = currentFormatIsCubism3 ? cubism3ModelsList : modelsList;

  if (currentList.length === 0) {
    const noOption = document.createElement('option');
    noOption.value = '';
    noOption.textContent = '暂无可用模型';
    noOption.disabled = true;
    select.appendChild(noOption);
    return;
  }

  currentList.forEach(model => {
    const option = document.createElement('option');
    option.value = model.modelPath;
    option.textContent = getModelDisplayName(model.modelPath) || model.modelPath;
    select.appendChild(option);
  });
}

function updateFormatLabel() {
  const label = document.getElementById('formatLabel');
  if (label) {
    label.textContent = currentFormatIsCubism3 ? '当前格式: Cubism 3.0+' : '当前格式: Cubism 2.0';
  }
  updateDragHint();
  updateAiChatVisibility();
}

function updateDragHint() {
  const dragHint = document.getElementById('dragHint');
  if (dragHint) {
    dragHint.textContent = currentFormatIsCubism3 ? 'Cubism3不受影响，网页刷新后位置重置' : '限制刷新在左下角，网页刷新后位置重置';
  }
}

function updateAiChatVisibility() {
  const aiChatContainer = document.getElementById('aiChatContainer');
  if (aiChatContainer) {
    if (currentFormatIsCubism3) {
      aiChatContainer.style.display = 'block';
    } else {
      aiChatContainer.style.display = 'none';
    }
  }
}

async function refreshDisplay() {
  const config = await storage.get(['useCubism3', 'localModel', 'cubism3Model']);

  currentFormatIsCubism3 = config.useCubism3 !== undefined ? config.useCubism3 : true;

  const cubism2Radio = document.getElementById('cubism2');
  const cubism3Radio = document.getElementById('cubism3');
  if (currentFormatIsCubism3 && cubism3Radio) {
    cubism3Radio.checked = true;
  } else if (cubism2Radio) {
    cubism2Radio.checked = true;
  }

  updateFormatLabel();
  populateModelSelect();
  updateModelsCount();

  const select = document.getElementById('localModel');
  const savedModel = currentFormatIsCubism3 ? config.cubism3Model : config.localModel;
  if (select && savedModel) {
    select.value = savedModel;
  }
}

let mouseCursorsConfig = [];
let cursorManifest = [];

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
                description: configData.description || '',
                normal: configData.normal || 'Normal.ani',
                pointer: configData.pointer || 'Link.ani',
                text: configData.text || 'Text.ani',
                move: configData.move || 'Move.ani',
                wait: configData.wait || 'Busy.ani',
                help: configData.help || 'Help.ani',
                hotspotX: configData.hotspotX,
                hotspotY: configData.hotspotY
              });
            }
          } catch (e) {
            console.warn('[Live2D Popup] Failed to load config for:', cursor.folder);
          }
        }

        // 排序：确保"昔涟"排在"昔涟-动态"前面
        mouseCursorsConfig.sort((a, b) => {
          if (a.name === '昔涟' && b.name === '昔涟-动态') {
            return -1;
          }
          if (a.name === '昔涟-动态' && b.name === '昔涟') {
            return 1;
          }
          return 0;
        });

        mouseCursorAvailable = mouseCursorsConfig.length > 0;
      }
    } catch (e) {
      console.warn('[Live2D Popup] Failed to load cursor manifest');
      mouseCursorAvailable = false;
    }

    let clickEffectAvailable = false;
    try {
      const configRes = await fetch(baseUrl + 'mouse-features/click-effects/kaomoji.js');
      clickEffectAvailable = configRes.ok;
    } catch (e) {
      clickEffectAvailable = false;
    }

    return { mouseCursorAvailable, clickEffectAvailable };
  } catch (e) {
    console.error('[Live2D Popup] Failed to check mouse features:', e);
    return { mouseCursorAvailable: false, clickEffectAvailable: false };
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const config = await storage.get([
    'enabled', 'modelSource', 'cdnPath', 'drag', 'position', 'size',
    'localModel', 'cubism3Model', 'useCubism3', 'aiEnabled', 'aiApiKey', 'aiConnected',
    'experimentalEnabled', 'mouseFeaturesEnabled', 'mouseCursorEnabled', 'clickEffectEnabled',
    'selectedCursor', 'mouseCursorSize', 'theme', 'dragLimit', 'followSystemTheme',
    'pageSummaryEnabled', 'freezeModelEnabled', 'freezeMode', 'freezeKeepTabs', 'newTabEnabled', 'sakanaWidgetEnabled', 'sakanaWidgetDraggable', 'sakanaWidgetSize', 'sakanaWidgetPositionSaved',
    'positionAutoRefresh', 'atriApiKey',
    'dailyImageEnabled', 'dailyImageCustomApi', 'dailyImageApiList',
  ]);

  // 同步所有设置到 localStorage
  const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
  
  // 同步 AI 相关设置
  settings.aiEnabled = config.aiEnabled || false;
  settings.aiApiKey = config.aiApiKey || settings.aiApiKey;
  settings.siliconflowApiKey = config.siliconflowApiKey || settings.siliconflowApiKey;
  settings.atriApiKey = config.atriApiKey || settings.atriApiKey;
  settings.aiProvider = config.aiProvider || settings.aiProvider;
  settings.aiConnected = config.aiConnected || false;
  
  // 同步其他设置
  settings.followSystemTheme = config.followSystemTheme || false;
  
  localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));

  const dragLimitCheckbox = document.getElementById('dragLimit');

  const enabledCheckbox = document.getElementById('enabled');
  const modelSourceSelect = document.getElementById('modelSource');
  const localModelSelect = document.getElementById('localModel');
  const localModelContainer = document.getElementById('localModelContainer');
  const cdnPathContainer = document.getElementById('cdnPathContainer');
  const cdnPathInput = document.getElementById('cdnPath');
  const dragCheckbox = document.getElementById('drag');
  const positionButtons = document.querySelectorAll('.position-btn');
  const sizeRangeInput = document.getElementById('size');
  const sizeNumberInput = document.getElementById('sizeInput');
  const sizeWarning = document.getElementById('sizeWarning');
  const refreshBtn = document.getElementById('refresh');
  const aiEnabledCheckbox = document.getElementById('aiEnabled');
  const aiConnectionDisplay = document.getElementById('aiConnectionDisplay');
  const aiConnectionStatus = document.getElementById('aiConnectionStatus');
  const goToPopup2Btn = document.getElementById('goToPopup2Btn');
  const experimentalEnabledCheckbox = document.getElementById('experimentalEnabled');
  const experimentalContent = document.getElementById('experimentalContent');
  const experimentalHeader = document.getElementById('experimentalHeader');
  const mouseCursorCheckbox = document.getElementById('mouseCursorEnabled');
  const clickEffectCheckbox = document.getElementById('clickEffectEnabled');
  const mouseCursorStatus = document.getElementById('mouseCursorStatus');
  const clickEffectStatus = document.getElementById('clickEffectStatus');
  const mouseFeaturesEnabledCheckbox = document.getElementById('mouseFeaturesEnabled');
  const mouseFeaturesContainer = document.getElementById('mouseFeaturesContainer');
  const clickEffectContainer = document.getElementById('clickEffectContainer');
  const mouseCursorSelect = document.getElementById('mouseCursorSelect');
  const mouseCursorSelectContainer = document.getElementById('mouseCursorSelectContainer');
  const mouseCursorSizeInput = document.getElementById('mouseCursorSize');
  const mouseCursorSizeValue = document.getElementById('mouseCursorSizeValue');
  const mouseCursorSizeContainer = document.getElementById('mouseCursorSizeContainer');
  const themeToggle = document.getElementById('themeToggle');
  const aiConfigHint = document.getElementById('aiConfigHint');
  const pageSummarySection = document.getElementById('pageSummarySection');
  const quickSummaryBtn = document.getElementById('quickSummaryBtn');
  const freezeModelEnabledCheckbox = document.getElementById('freezeModelEnabled');
  const newTabEnabledCheckbox = document.getElementById('newTabEnabled');
  const sakanaWidgetEnabledCheckbox = document.getElementById('sakanaWidgetEnabled');
  const sakanaWidgetDraggableCheckbox = document.getElementById('sakanaWidgetDraggable');
  const sakanaWidgetPositionSavedCheckbox = document.getElementById('sakanaWidgetPositionSaved');
  const sakanaWidgetSizeInput = document.getElementById('sakanaWidgetSize');
  const sakanaWidgetSizeValue = document.getElementById('sakanaWidgetSizeValue');
  const sakanaWidgetSettings = document.getElementById('sakanaWidgetSettings');
  const memoryUsageElement = document.getElementById('memoryUsage');
  const memoryProgressBar = document.getElementById('memoryProgressBar');
  const browserMemoryUsageElement = document.getElementById('browserMemoryUsage');
  const browserMemoryProgressBar = document.getElementById('browserMemoryProgressBar');
  const pluginMemoryPercent = document.getElementById('pluginMemoryPercent');
  const memoryPieChart = document.getElementById('memoryPieChart');
  const dailyImageEnabledCheckbox = document.getElementById('dailyImageEnabled');
  const dailyImageApiSection = document.getElementById('dailyImageApiSection');
  const dailyImageCustomApiCheckbox = document.getElementById('dailyImageCustomApi');
  const dailyImageApiList = document.getElementById('dailyImageApiList');
  const systemTotalMemoryDisplay = document.getElementById('systemTotalMemoryDisplay');
  
  // 估算浏览器进程内存（默认 500MB）
  let browserTotalMemoryMB = 500;
  
  // 自动检测系统总内存
  let systemTotalMemoryGB = 16; // 默认 16GB
  
  function detectSystemTotalMemory() {
    // 方法1: 使用 deviceMemory API（Chrome/Edge 支持）
    if (navigator.deviceMemory) {
      systemTotalMemoryGB = navigator.deviceMemory;
      console.log('[Live2D] Detected system memory via deviceMemory:', systemTotalMemoryGB, 'GB');
    }
    // 方法2: 通过 performance.memory 估算
    else if (performance && performance.memory) {
      const heapLimitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
      // 根据堆内存限制估算系统总内存
      if (heapLimitMB <= 2048) {
        systemTotalMemoryGB = 8;
      } else if (heapLimitMB <= 4096) {
        systemTotalMemoryGB = 16;
      } else if (heapLimitMB <= 8192) {
        systemTotalMemoryGB = 32;
      } else if (heapLimitMB <= 16384) {
        systemTotalMemoryGB = 64;
      } else {
        systemTotalMemoryGB = 128;
      }
      console.log('[Live2D] Estimated system memory via heap limit:', systemTotalMemoryGB, 'GB');
    }
    
    // 更新显示
    systemTotalMemoryDisplay.textContent = `${systemTotalMemoryGB} GB`;
  }
  
  // 获取系统内存信息
  function detectBrowserMemory(callback) {
    if (browserAPI.system && browserAPI.system.memory) {
      try {
        browserAPI.system.memory.getInfo(function(info) {
          if (info && info.capacity) {
            browserTotalMemoryMB = Math.round(info.capacity / (1024 * 1024));
            window.__availableMemoryMB = Math.round((info.availableCapacity || 0) / (1024 * 1024));
            var totalGB = (info.capacity / (1024*1024*1024)).toFixed(1);
            systemTotalMemoryDisplay.textContent = totalGB + ' GB';
          }
          if (callback) callback();
        });
        return;
      } catch(e) {}
    }
    if (systemTotalMemoryGB > 0) {
      browserTotalMemoryMB = systemTotalMemoryGB * 1024;
    } else if (performance && performance.memory) {
      var hl = performance.memory.jsHeapSizeLimit / (1024 * 1024);
      browserTotalMemoryMB = Math.round(hl * 4);
    } else {
      browserTotalMemoryMB = 8 * 1024;
    }
    if (callback) callback();
  }

   // 初始化主题的调用移到后面（在 DOM 元素定义之后）
   
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
   

   
   themeToggle.addEventListener('click', async () => {
     const isDark = document.body.classList.toggle('dark-theme');
     await storage.set({ theme: isDark ? 'dark' : 'light' });
     // 同步到 localStorage
     const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
     settings.theme = isDark ? 'dark' : 'light';
     localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
     updateThemeIcon(isDark);

     // 更新冻结模式下拉菜单样式
     const freezeModeSelectEl = document.getElementById('freezeModeSelect');
     const freezeModelEnabledCheckboxEl = document.getElementById('freezeModelEnabled');
     if (freezeModeSelectEl) {
       if (freezeModelEnabledCheckboxEl && freezeModelEnabledCheckboxEl.checked) {
         freezeModeSelectEl.style.backgroundColor = isDark ? '#1a1a2e' : '#fff';
         freezeModeSelectEl.style.color = isDark ? '#ffffff' : '#333';
         freezeModeSelectEl.style.cursor = 'pointer';
       } else {
         freezeModeSelectEl.style.backgroundColor = isDark ? '#252542' : '#f5f5f5';
         freezeModeSelectEl.style.color = isDark ? '#888' : '#999';
         freezeModeSelectEl.style.cursor = 'not-allowed';
       }
     }
   });
   
   // 设置按钮点击事件
  document.getElementById('settingsBtn').addEventListener('click', () => {
    window.location.href = 'popup2.html';
  });

  // 跳转到popup2按钮点击事件
  if (goToPopup2Btn) {
    goToPopup2Btn.addEventListener('click', () => {
      window.location.href = 'popup2.html';
    });
    
    // 添加hover样式
    goToPopup2Btn.addEventListener('mouseenter', () => {
      goToPopup2Btn.style.background = 'rgba(102, 126, 234, 0.1)';
      goToPopup2Btn.style.color = '#764ba2';
    });
    goToPopup2Btn.addEventListener('mouseleave', () => {
      goToPopup2Btn.style.background = 'none';
      goToPopup2Btn.style.color = '#667eea';
    });
  }

  await loadLocalModels();

  const { mouseCursorAvailable, clickEffectAvailable } = await checkMouseFeaturesResources();

  if (mouseCursorAvailable) {
    mouseCursorStatus.textContent = `资源可用 (${mouseCursorsConfig.length} 个样式)`;
    mouseCursorStatus.style.color = '#28a745';

    mouseCursorSelect.innerHTML = '<option value="">请选择...</option>';
    mouseCursorsConfig.forEach(cursor => {
      const option = document.createElement('option');
      option.value = cursor.id;
      option.textContent = cursor.name;
      option.title = cursor.description || '';
      mouseCursorSelect.appendChild(option);
    });

    mouseCursorSelect.value = config.selectedCursor || '';
  } else {
    mouseCursorStatus.textContent = '资源缺失，请添加 mouse-cursors 文件夹';
    mouseCursorStatus.style.color = '#dc3545';
    mouseCursorCheckbox.disabled = true;
    mouseCursorSelectContainer.style.display = 'none';
    mouseCursorSizeContainer.style.display = 'none';
  }

  if (clickEffectAvailable) {
    clickEffectStatus.textContent = '资源可用';
    clickEffectStatus.style.color = '#28a745';
  } else {
    clickEffectStatus.textContent = '资源缺失，请添加 click-effects 文件夹';
    clickEffectStatus.style.color = '#dc3545';
    clickEffectCheckbox.disabled = true;
  }

  enabledCheckbox.checked = config.enabled !== false;
  modelSourceSelect.value = config.modelSource !== undefined ? config.modelSource : 'local';
  cdnPathInput.value = config.cdnPath || '';
  if (config.cdnPath && config.cdnPath.trim() !== '') {
    cdnPathInput.style.color = '#333';
  }
  dragCheckbox.checked = config.drag || false;
  dragLimitCheckbox.checked = config.dragLimit !== false; // 默认开启
  
  const positionAutoRefreshCheckbox = document.getElementById('positionAutoRefresh');
  positionAutoRefreshCheckbox.checked = config.positionAutoRefresh || false; // 默认关闭
  
  const currentPosition = config.position || 'left-bottom';
  positionButtons.forEach(btn => {
    btn.classList.remove('selected');
    if (btn.dataset.position === currentPosition && !btn.classList.contains('disabled-btn')) {
      btn.classList.add('selected');
    }
  });
  const savedSize = config.size || 100;
  sizeRangeInput.value = savedSize;
  sizeNumberInput.value = savedSize;

  currentFormatIsCubism3 = config.useCubism3 !== undefined ? config.useCubism3 : true;
  const cubism2Radio = document.getElementById('cubism2');
  const cubism3Radio = document.getElementById('cubism3');
  if (currentFormatIsCubism3 && cubism3Radio) {
    cubism3Radio.checked = true;
  } else if (cubism2Radio) {
    cubism2Radio.checked = true;
  }
  
  // 先更新模型来源可见性，确保 formatContainer 正确显示/隐藏
  updateModelSourceVisibility(true);

  // 如果是本地模型且第一次使用，自动设置默认的Cubism3模型
  if (modelSourceSelect.value === 'local' && !config.cubism3Model && cubism3ModelsList.length > 0) {
    console.log('[Live2D] First time use, auto-selecting default Cubism3 model:', cubism3ModelsList[0].modelPath);
    await storage.set({ cubism3Model: cubism3ModelsList[0].modelPath });
    if (localModelSelect) {
      localModelSelect.value = cubism3ModelsList[0].modelPath;
    }
  }

  // 如果是本地模型，需要刷新显示
  if (modelSourceSelect.value === 'local') {
    refreshDisplay();
  } else {
    // 如果是官方模型，需要更新一下格式标签和 AI 聊天可见性
    updateFormatLabel();
  }

  aiEnabledCheckbox.checked = config.aiEnabled || false;
  
  // 更新连接状态显示
  function updateConnectionStatus(connected) {
    if (aiConnectionStatus) {
      if (connected === 'reconnecting') {
        aiConnectionStatus.textContent = '正在重连...';
        aiConnectionStatus.style.color = '#17a2b8';
      } else if (connected) {
        aiConnectionStatus.textContent = '已连接';
        aiConnectionStatus.style.color = '#28a745';
      } else {
        aiConnectionStatus.textContent = '未连接';
        aiConnectionStatus.style.color = '#ffc107';
      }
    }
  }
  
  // 根据开关状态显示/隐藏连接状态
  if (aiEnabledCheckbox.checked) {
    aiConnectionDisplay.style.display = 'block';
    updateConnectionStatus(config.aiConnected || false);
  } else {
    aiConnectionDisplay.style.display = 'none';
  }
  
  // 初始化页面总结区域可见性
  if (pageSummarySection) {
    pageSummarySection.style.display = (aiEnabledCheckbox.checked && config.aiConnected) ? 'block' : 'none';
  }
  
  // 根据开关状态设置跳转按钮状态
  if (goToPopup2Btn) {
    if (aiEnabledCheckbox.checked) {
      goToPopup2Btn.style.opacity = '1';
      goToPopup2Btn.style.pointerEvents = 'auto';
    } else {
      goToPopup2Btn.style.opacity = '0.4';
      goToPopup2Btn.style.pointerEvents = 'none';
    }
  }
  
  // 根据开关状态显示/隐藏配置提示
  if (aiConfigHint) {
    aiConfigHint.style.display = aiEnabledCheckbox.checked ? 'block' : 'none';
  }

  // 实验功能设置
  const experimentalEnabled = config.experimentalEnabled || false;
  experimentalEnabledCheckbox.checked = experimentalEnabled;

  if (experimentalEnabled) {
    experimentalContent.classList.remove('collapsed');
  } else {
    experimentalContent.classList.add('collapsed');
  }

  // 如果实验功能未启用，禁用所有子开关
  if (!experimentalEnabled) {
    dragCheckbox.disabled = true;
    mouseFeaturesEnabledCheckbox.disabled = true;
    mouseCursorCheckbox.disabled = true;
    clickEffectCheckbox.disabled = true;

    // 同时确保它们的状态是关闭的
    dragCheckbox.checked = false;
    mouseFeaturesEnabledCheckbox.checked = false;
    mouseCursorCheckbox.checked = false;
    clickEffectCheckbox.checked = false;

    await storage.set({
      drag: false,
      mouseFeaturesEnabled: false,
      mouseCursorEnabled: false,
      clickEffectEnabled: false
    });
  }

  const mouseFeaturesEnabled = experimentalEnabled ? (config.mouseFeaturesEnabled || false) : false;
  mouseFeaturesEnabledCheckbox.checked = mouseFeaturesEnabled;

  mouseFeaturesContainer.style.display = (mouseFeaturesEnabled && experimentalEnabled) ? 'block' : 'none';

  const mouseCursorEnabled = experimentalEnabled && mouseFeaturesEnabled ? (config.mouseCursorEnabled || false) : false;
  mouseCursorCheckbox.checked = mouseCursorEnabled;
  clickEffectCheckbox.checked = experimentalEnabled && mouseFeaturesEnabled ? (config.clickEffectEnabled || false) : false;

  if (!mouseCursorAvailable) {
    mouseCursorCheckbox.disabled = true;
    mouseCursorCheckbox.checked = false;
  }
  if (!clickEffectAvailable) {
    clickEffectCheckbox.disabled = true;
    clickEffectCheckbox.checked = false;
  }

  // 初始化冻结模型开关
  freezeModelEnabledCheckbox.checked = config.freezeModelEnabled || false;

  // 初始化新标签页开关
  if (newTabEnabledCheckbox) {
    newTabEnabledCheckbox.checked = config.newTabEnabled || false;
  }

  // 初始化 Sakana Widget 开关（默认关闭）
  if (sakanaWidgetEnabledCheckbox) {
    sakanaWidgetEnabledCheckbox.checked = config.sakanaWidgetEnabled || false;
  }

  // 初始化 Sakana Widget 设置显示状态
  function updateSakanaWidgetVisibility() {
    const newTabEnabled = config.newTabEnabled || false;
    const sakanaEnabled = config.sakanaWidgetEnabled || false;
    
    // 新标签页开关控制整个区域
    sakanaWidgetSettings.style.display = newTabEnabled ? 'block' : 'none';
    
    // 石蒜小组件开关控制详细设置的显示
    const detailSettings = document.getElementById('sakanaWidgetDetailSettings');
    if (detailSettings) {
      detailSettings.style.display = newTabEnabled && sakanaEnabled ? 'block' : 'none';
    }
  }
  updateSakanaWidgetVisibility();

  // 初始化 Sakana Widget 交互开关
  if (sakanaWidgetDraggableCheckbox) {
    // 保存事件监听器引用
    var draggableChangeHandler = async () => {
      await storage.set({ sakanaWidgetDraggable: sakanaWidgetDraggableCheckbox.checked });
      console.log('[Live2D Popup] Sakana Widget draggable:', sakanaWidgetDraggableCheckbox.checked);
      
      // 如果关闭了"允许拖拽"，刷新 newtab 页面以确保新状态生效
      if (!sakanaWidgetDraggableCheckbox.checked) {
        console.log('[Live2D Popup] Drag disabled, reloading newtab...');
        // 查询当前活动的 newtab 页面并刷新
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
          if (tabs[0] && tabs[0].url && tabs[0].url.includes('lemon-tab')) {
            chrome.tabs.reload(tabs[0].id);
          } else {
            // 如果找不到 newtab，创建新标签页
            chrome.tabs.create({ url: chrome.runtime.getURL('lemon-tab/index.html') });
          }
        });
      }
    };
    
    // 直接使用 config.sakanaWidgetDraggable 的值（可以是 true、false 或 undefined）
    // 如果是 undefined，则根据组件启用状态决定默认值
    if (config.sakanaWidgetDraggable !== undefined) {
      // 用户已经明确设置过，使用该值
      sakanaWidgetDraggableCheckbox.checked = config.sakanaWidgetDraggable;
    } else if (config.sakanaWidgetEnabled) {
      // 组件开启且用户没有设置过，默认开启
      sakanaWidgetDraggableCheckbox.checked = true;
    } else {
      // 组件关闭，默认关闭
      sakanaWidgetDraggableCheckbox.checked = false;
    }
    
    // 初始化完成后再添加事件监听器
    sakanaWidgetDraggableCheckbox.addEventListener('change', draggableChangeHandler);
  }

  // 初始化 Sakana Widget 位置拖拽开关
  if (sakanaWidgetPositionSavedCheckbox) {
    // 保存事件监听器引用
    var positionSavedChangeHandler = async () => {
      await storage.set({ sakanaWidgetPositionSaved: sakanaWidgetPositionSavedCheckbox.checked });
      console.log('[Live2D Popup] Sakana Widget position saved:', sakanaWidgetPositionSavedCheckbox.checked);
    };
    
    // 直接使用 config.sakanaWidgetPositionSaved 的值
    sakanaWidgetPositionSavedCheckbox.checked = config.sakanaWidgetPositionSaved || false;
    
    // 初始化完成后再添加事件监听器
    sakanaWidgetPositionSavedCheckbox.addEventListener('change', positionSavedChangeHandler);
  }

  // 初始化 Sakana Widget 大小（默认120px）
  const savedSakanaWidgetSize = config.sakanaWidgetSize || 120;
  if (sakanaWidgetSizeInput) {
    sakanaWidgetSizeInput.value = savedSakanaWidgetSize;
  }
  if (sakanaWidgetSizeValue) {
    sakanaWidgetSizeValue.value = savedSakanaWidgetSize;
  }

  // 初始化冻结模式下拉菜单
  const freezeModeSelect = document.getElementById('freezeModeSelect');
  freezeModeSelect.value = config.freezeMode || 'quick';

  var freezeKeepTabsInput = document.getElementById('freezeKeepTabs');
  if (freezeKeepTabsInput) freezeKeepTabsInput.value = config.freezeKeepTabs || 5;
  setTimeout(function() { if (typeof updateFreezeKeepTabsVis === 'function') updateFreezeKeepTabsVis(); }, 0);

  // 检测暗色主题
  const isDark = document.body.classList.contains('dark-theme');

  // 设置下拉菜单的初始状态
  if (freezeModelEnabledCheckbox.checked) {
    freezeModeSelect.disabled = false;
    freezeModeSelect.style.backgroundColor = isDark ? '#1a1a2e' : '#fff';
    freezeModeSelect.style.color = isDark ? '#ffffff' : '#333';
    freezeModeSelect.style.cursor = 'pointer';
  } else {
    freezeModeSelect.disabled = true;
    freezeModeSelect.style.backgroundColor = isDark ? '#252542' : '#f5f5f5';
    freezeModeSelect.style.color = isDark ? '#888' : '#999';
    freezeModeSelect.style.cursor = 'not-allowed';
  }

  // 初始化主题（移到 DOM 元素定义之后）
  if (config.followSystemTheme) {
    // 如果开启了跟随系统主题，自动应用系统主题
    updateThemeFromSystem();
  } else {
    // 否则使用保存的主题
    const savedTheme = config.theme || 'light';
    applyTheme(savedTheme === 'dark');
    updateThemeIcon(savedTheme === 'dark');
  }

  if (mouseCursorCheckbox.checked && mouseCursorAvailable && experimentalEnabled && mouseFeaturesEnabled) {
    mouseCursorSelectContainer.style.display = 'block';
    mouseCursorSizeContainer.style.display = 'block';
  } else {
    mouseCursorSelectContainer.style.display = 'none';
    mouseCursorSizeContainer.style.display = 'none';
  }

  // ─── 每日一图初始化 ───
  const dailyImageEnabled = experimentalEnabled ? (config.dailyImageEnabled || false) : false;
  if (dailyImageEnabledCheckbox) {
    dailyImageEnabledCheckbox.checked = dailyImageEnabled;
    dailyImageEnabledCheckbox.disabled = !experimentalEnabled;
    dailyImageApiSection.style.display = dailyImageEnabled ? 'block' : 'none';
  }
  const customApiEnabled = experimentalEnabled && dailyImageEnabled ? (config.dailyImageCustomApi || false) : false;
  if (dailyImageCustomApiCheckbox) {
    dailyImageCustomApiCheckbox.checked = customApiEnabled;
    dailyImageCustomApiCheckbox.disabled = !(experimentalEnabled && dailyImageEnabled);
    dailyImageApiList.style.display = customApiEnabled ? 'block' : 'none';
  }
  // 初始化 API 列表
  var savedApiList = config.dailyImageApiList || [
    { url: 'https://api.yppp.net/api.php', enabled: true },
    { url: '', enabled: false }
  ];
  function renderApiList() {
    if (!dailyImageApiList) return;
    // 清空只保留 #dailyApiAddBtn
    var addBtn = document.getElementById('dailyApiAddBtn');
    dailyImageApiList.innerHTML = '';
    savedApiList.forEach(function(item) {
      var row = document.createElement('div');
      row.className = 'daily-api-row';
      row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;';
      row.innerHTML = '<button type="button" class="daily-api-del" style="background:#3a1a1a;border:1px solid #663333;color:#f88;border-radius:4px;width:26px;height:26px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;">−</button>' +
        '<input type="text" class="daily-api-input" value="' + (item.url || '').replace(/"/g, '&quot;') + '" placeholder="请输入 API 地址" style="flex:1;background:#1a1a2e;border:1px solid #555;border-radius:4px;padding:4px 8px;color:#fff;font-size:12px;">' +
        '<label class="switch small-switch" style="margin:0;flex-shrink:0;"><input type="checkbox" class="daily-api-toggle" ' + (item.enabled ? 'checked' : '') + '><span class="slider"></span></label>';
      dailyImageApiList.appendChild(row);
    });
    // 重新添加 + 按钮
    if (addBtn) {
      dailyImageApiList.appendChild(addBtn);
    } else {
      var newBtn = document.createElement('button');
      newBtn.type = 'button';
      newBtn.id = 'dailyApiAddBtn';
      newBtn.textContent = '+ 添加';
      newBtn.style.cssText = 'width:100%;margin-top:4px;background:#2a5a2a;border:1px solid #3a7a3a;color:#8f8;padding:4px;border-radius:4px;cursor:pointer;font-size:12px;';
      dailyImageApiList.appendChild(newBtn);
    }
    attachDailyImageEvents();
  }
  function attachDailyImageEvents() {
    // 删除按钮
    dailyImageApiList.querySelectorAll('.daily-api-del').forEach(function(btn) {
      btn.onclick = function() {
        var row = btn.closest('.daily-api-row');
        if (row) row.remove();
        saveDailyImageApiList();
      };
    });
    // 添加按钮（独立）
    var addBtn = document.getElementById('dailyApiAddBtn');
    if (addBtn) {
      addBtn.onclick = function() {
        var row = document.createElement('div');
        row.className = 'daily-api-row';
        row.style.cssText = 'display:flex;align-items:center;gap:4px;margin-bottom:4px;';
        row.innerHTML = '<button type="button" class="daily-api-del" style="background:#3a1a1a;border:1px solid #663333;color:#f88;border-radius:4px;width:26px;height:26px;cursor:pointer;font-size:16px;line-height:1;display:flex;align-items:center;justify-content:center;flex-shrink:0;">−</button>' +
          '<input type="text" class="daily-api-input" value="" placeholder="请输入 API 地址" style="flex:1;background:#1a1a2e;border:1px solid #555;border-radius:4px;padding:4px 8px;color:#fff;font-size:12px;">' +
          '<label class="switch small-switch" style="margin:0;flex-shrink:0;"><input type="checkbox" class="daily-api-toggle"><span class="slider"></span></label>';
        dailyImageApiList.insertBefore(row, addBtn);
        attachDailyImageEvents();
        saveDailyImageApiList();
      };
    }
  }
  function saveDailyImageApiList() {
    var rows = dailyImageApiList.querySelectorAll('.daily-api-row');
    var list = [];
    rows.forEach(function(row) {
      var input = row.querySelector('.daily-api-input');
      var toggle = row.querySelector('.daily-api-toggle');
      if (input) {
        list.push({ url: input.value, enabled: toggle ? toggle.checked : true });
      }
    });
    if (list.length === 0) {
      list = [{ url: 'https://api.yppp.net/api.php', enabled: true }];
    }
    savedApiList = list;
    storage.set({ dailyImageApiList: list });
  }
  renderApiList();

  // 每日一图开关
  if (dailyImageEnabledCheckbox) {
    dailyImageEnabledCheckbox.addEventListener('change', async function() {
      var val = dailyImageEnabledCheckbox.checked;
      await storage.set({ dailyImageEnabled: val });
      if (dailyImageApiSection) dailyImageApiSection.style.display = val ? 'block' : 'none';
      if (dailyImageCustomApiCheckbox) dailyImageCustomApiCheckbox.disabled = !val;
      // 通知 content.js
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'updateDailyImageSettings',
            dailyImageEnabled: val,
            dailyImageCustomApi: dailyImageCustomApiCheckbox ? dailyImageCustomApiCheckbox.checked : false,
            dailyImageApiList: savedApiList
          }).catch(() => {});
        }
      });
    });
  }
  // 调用 API 子开关
  if (dailyImageCustomApiCheckbox) {
    dailyImageCustomApiCheckbox.addEventListener('change', async function() {
      var val = dailyImageCustomApiCheckbox.checked;
      await storage.set({ dailyImageCustomApi: val });
      if (dailyImageApiList) dailyImageApiList.style.display = val ? 'block' : 'none';
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'updateDailyImageSettings',
            dailyImageEnabled: dailyImageEnabledCheckbox ? dailyImageEnabledCheckbox.checked : false,
            dailyImageCustomApi: val,
            dailyImageApiList: savedApiList
          }).catch(() => {});
        }
      });
    });
    // 输入框/开关变化时保存
    dailyImageApiList.addEventListener('change', function(e) {
      if (e.target.classList.contains('daily-api-input') || e.target.classList.contains('daily-api-toggle')) {
        saveDailyImageApiList();
        browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            var rows = dailyImageApiList.querySelectorAll('.daily-api-row');
            var list = [];
            rows.forEach(function(row) {
              var inp = row.querySelector('.daily-api-input');
              var tog = row.querySelector('.daily-api-toggle');
              if (inp) list.push({ url: inp.value, enabled: tog ? tog.checked : true });
            });
            browserAPI.tabs.sendMessage(tabs[0].id, {
              type: 'updateDailyImageSettings',
              dailyImageEnabled: dailyImageEnabledCheckbox.checked,
              dailyImageCustomApi: dailyImageCustomApiCheckbox.checked,
              dailyImageApiList: list
            }).catch(() => {});
          }
        });
      }
    });
  }

  const savedMouseCursorSize = config.mouseCursorSize || 150;
  mouseCursorSizeInput.value = savedMouseCursorSize;
  mouseCursorSizeValue.textContent = savedMouseCursorSize;

  function updateModelSourceVisibility(skipRefresh = false) {
    const source = modelSourceSelect.value;
    const modelSourceHint = document.getElementById('modelSourceHint');
    const cdnPathContainer = document.getElementById('cdnPathContainer');
    const formatContainer = document.getElementById('formatContainer');
    
    if (source === 'local') {
      localModelContainer.style.display = 'block';
      if (cdnPathContainer) {
        cdnPathContainer.style.display = 'none';
      }
      if (formatContainer) {
        formatContainer.style.display = 'block';
      }
      // 更新提示文字
      if (modelSourceHint) {
        modelSourceHint.textContent = '本地模型从扩展目录加载';
      }
      if (!skipRefresh) {
        refreshDisplay();
      }
    } else {
      localModelContainer.style.display = 'none';
      if (cdnPathContainer) {
        cdnPathContainer.style.display = 'block';
      }
      if (formatContainer) {
        formatContainer.style.display = 'none';
      }
      // 更新提示文字
      if (modelSourceHint) {
        modelSourceHint.textContent = '官方模型从 CDN 加载';
      }
      // 官方模型默认是 Cubism 2.0
      currentFormatIsCubism3 = false;
      updateDragHint();
      updateAiChatVisibility();
    }
  }

  enabledCheckbox.addEventListener('change', async () => {
    await storage.set({ enabled: enabledCheckbox.checked });
    
    // 发送消息到 content.js 更新启用状态
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateEnabledStatus',
          enabled: enabledCheckbox.checked
        }).catch(err => {
          console.log('[Live2D Popup] Could not send message:', err);
        });
      }
    });
  });

  modelSourceSelect.addEventListener('change', async () => {
    await storage.set({ modelSource: modelSourceSelect.value });
    updateModelSourceVisibility();
  });

  // Cubism版本切换
  document.getElementById('cubism2').addEventListener('change', async () => {
    currentFormatIsCubism3 = false;
    await storage.set({ useCubism3: false });
    console.log('[Live2D] Format switched to: Cubism2');
    updateFormatLabel();
    populateModelSelect();
    updateModelsCount();

    const savedConfig = await storage.get(['localModel', 'cubism3Model']);
    const savedModel = savedConfig.localModel;
    console.log('[Live2D] Saved model for current format:', savedModel);

    if (localModelSelect) {
      const hasModel = modelsList.some(m => m.modelPath === savedModel);
      console.log('[Live2D] Has saved model in current list:', hasModel);

      if (hasModel && savedModel) {
        localModelSelect.value = savedModel;
        console.log('[Live2D] Restored saved model:', savedModel);
      } else if (modelsList.length > 0) {
        localModelSelect.value = modelsList[0].modelPath;
        await storage.set({ localModel: modelsList[0].modelPath });
        console.log('[Live2D] Auto-selected first model:', modelsList[0].modelPath);
      }
    }
  });

  document.getElementById('cubism3').addEventListener('change', async () => {
    currentFormatIsCubism3 = true;
    await storage.set({ useCubism3: true });
    console.log('[Live2D] Format switched to: Cubism3');
    updateFormatLabel();
    populateModelSelect();
    updateModelsCount();

    const savedConfig = await storage.get(['localModel', 'cubism3Model']);
    const savedModel = savedConfig.cubism3Model;
    console.log('[Live2D] Saved model for current format:', savedModel);

    if (localModelSelect) {
      const hasModel = cubism3ModelsList.some(m => m.modelPath === savedModel);
      console.log('[Live2D] Has saved model in current list:', hasModel);

      if (hasModel && savedModel) {
        localModelSelect.value = savedModel;
        console.log('[Live2D] Restored saved model:', savedModel);
      } else if (cubism3ModelsList.length > 0) {
        localModelSelect.value = cubism3ModelsList[0].modelPath;
        await storage.set({ cubism3Model: cubism3ModelsList[0].modelPath });
        console.log('[Live2D] Auto-selected first model:', cubism3ModelsList[0].modelPath);
      }
    }
  });

  localModelSelect.addEventListener('change', async () => {
    const selectedModel = localModelSelect.value;
    if (selectedModel) {
      const storageKey = currentFormatIsCubism3 ? 'cubism3Model' : 'localModel';
      await storage.set({ [storageKey]: selectedModel });
      console.log('[Live2D] Model selected:', selectedModel, 'Format:', currentFormatIsCubism3 ? 'Cubism3' : 'Cubism2');
      // 自动刷新页面使新模型生效
      try {
        const tabs = await new Promise(resolve => browserAPI.tabs.query({ active: true, currentWindow: true }, resolve));
        const tab = tabs && tabs[0];
        if (tab && tab.id) {
          browserAPI.tabs.reload(tab.id);
          window.close();
        }
      } catch(e) {
        console.log('[Live2D] Auto-reload failed:', e);
      }
    }
  });

  cdnPathInput.addEventListener('input', () => {
    if (cdnPathInput.value.trim() !== '') {
      cdnPathInput.style.color = '#333';
    } else {
      cdnPathInput.style.color = '#999';
    }
  });

  cdnPathInput.addEventListener('change', async () => {
    let cdnPath = cdnPathInput.value.trim();
    if (cdnPath) {
      if (!cdnPath.endsWith('/')) cdnPath += '/';
      await storage.set({ cdnPath: cdnPath });
    } else {
      await storage.set({ cdnPath: '' });
    }
  });

  dragCheckbox.addEventListener('change', async () => {
    await storage.set({ drag: dragCheckbox.checked });
    
    // 发送消息到 content.js 更新拖拽状态
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            browserAPI.tabs.sendMessage(tabs[0].id, {
                type: 'updateDragStatus',
                drag: dragCheckbox.checked
            }).catch(err => {
                // 静默失败，不影响用户体验
                console.log('[Live2D Popup] Could not send message:', err);
            });
        }
    });
  });

  dragLimitCheckbox.addEventListener('change', async () => {
    await storage.set({ dragLimit: dragLimitCheckbox.checked });
    
    // 发送消息到 content.js 更新拖拽限位状态
    const tabsList = await tabs.query({ active: true, currentWindow: true });
    if (tabsList[0]) {
      browserAPI.tabs.sendMessage(tabsList[0].id, {
        type: 'updateDragLimitStatus',
        dragLimit: dragLimitCheckbox.checked
      }, (response) => {
        if (browserAPI.runtime.lastError) {
          console.log('[Live2D Popup] Could not send message:', browserAPI.runtime.lastError);
        }
      });
    }
  });

  positionAutoRefreshCheckbox.addEventListener('change', async () => {
    await storage.set({ positionAutoRefresh: positionAutoRefreshCheckbox.checked });
    console.log('[Live2D Popup] Position auto-refresh setting saved:', positionAutoRefreshCheckbox.checked);
  });

  positionButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.classList.contains('disabled-btn')) return;
      positionButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      await storage.set({ position: btn.dataset.position });
      
      // 发送消息到 content.js 更新位置
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'updatePosition',
            position: btn.dataset.position
          }).catch(err => {
            console.log('[Live2D Popup] Could not send message:', err);
          });
        }
      });
      
      if (positionAutoRefreshCheckbox && positionAutoRefreshCheckbox.checked) {
        const [tab] = await tabs.query({ active: true, currentWindow: true });
        if (tab && tab.id) {
          await tabs.reload(tab.id);
        }
      }
    });
  });

  sizeRangeInput.addEventListener('input', async () => {
            sizeNumberInput.value = sizeRangeInput.value;
            const newSize = parseInt(sizeRangeInput.value) || 100;
            await storage.set({ size: newSize });

            // 发送消息到 content.js 更新大小
            browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    console.log('[Live2D Popup] Sending size update to tab:', tabs[0].id, tabs[0].url);
                    browserAPI.tabs.sendMessage(tabs[0].id, {
                        type: 'updateModelSize',
                        size: newSize
                    }).catch(err => {
                        console.log('[Live2D Popup] Could not send message:', err.message);
                    });
                } else {
                    console.log('[Live2D Popup] No active tab found');
                }
            });
        });

  sizeNumberInput.addEventListener('input', async () => {
            const val = parseInt(sizeNumberInput.value) || 100;
            if (val >= 50 && val <= 200) {
                sizeRangeInput.value = val;
            } else if (val < 50) {
                sizeRangeInput.value = 50;
            } else if (val > 200) {
                sizeRangeInput.value = 200;
            }
            await storage.set({ size: val });
            
            // 发送消息到 content.js 更新大小
            browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    browserAPI.tabs.sendMessage(tabs[0].id, {
                        type: 'updateModelSize',
                        size: val
                    }).catch(err => {
                        // 静默失败，不影响用户体验
                        console.log('[Live2D Popup] Could not send message:', err);
                    });
                }
            });
        });

  sizeNumberInput.addEventListener('change', async () => {
    const val = parseInt(sizeNumberInput.value) || 100;
    const outOfRange = val < 50 || val > 200;
    if (outOfRange) {
      sizeWarning.style.display = 'block';
      showAchievement('解锁成就', '不逝世怎么知道喵！');
    } else {
      sizeWarning.style.display = 'none';
    }
    sizeNumberInput.value = val;
    if (val >= 50 && val <= 200) {
      sizeRangeInput.value = val;
    } else if (val < 50) {
      sizeRangeInput.value = 50;
    } else if (val > 200) {
      sizeRangeInput.value = 200;
    }
    await storage.set({ size: val });
  });

  function showAchievement(title, message) {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'showPopupAchievement',
          title: title,
          message: message
        }, (response) => {
          if (browserAPI.runtime.lastError) {
            console.log('[Live2D Popup] Cannot send message:', browserAPI.runtime.lastError.message);
          }
        });
      }
    });
  }

  aiEnabledCheckbox.addEventListener('change', async () => {
    await storage.set({ aiEnabled: aiEnabledCheckbox.checked });

    // 更新 localStorage 中的设置
    const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
    settings.aiEnabled = aiEnabledCheckbox.checked;
    localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));

    // 发送消息到 content.js 更新 AI 状态
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateAIEnabled',
          aiEnabled: aiEnabledCheckbox.checked
        }).catch(err => {
          console.log('[Live2D Popup] Could not send message:', err);
        });
      }
    });

    // 根据开关状态显示/隐藏连接状态
    if (aiEnabledCheckbox.checked) {
      aiConnectionDisplay.style.display = 'block';
      // 重新读取连接状态并更新显示
      const latestConfig = await storage.get(['aiConnected']);
      updateConnectionStatus(latestConfig.aiConnected || false);
    } else {
      aiConnectionDisplay.style.display = 'none';
      // 关闭 AI 聊天时断开连接
      await storage.set({ aiConnected: false });
      const offSettings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      offSettings.aiConnected = false;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(offSettings));
      updateConnectionStatus(false);
    }

    // 显示/隐藏页面总结区域
    const showPageSummary = aiEnabledCheckbox.checked && config.aiConnected;
    if (pageSummarySection) {
      pageSummarySection.style.display = showPageSummary ? 'block' : 'none';
    }
    
    // 根据开关状态更新跳转按钮状态
    if (goToPopup2Btn) {
      if (aiEnabledCheckbox.checked) {
        goToPopup2Btn.style.opacity = '1';
        goToPopup2Btn.style.pointerEvents = 'auto';
      } else {
        goToPopup2Btn.style.opacity = '0.4';
        goToPopup2Btn.style.pointerEvents = 'none';
      }
    }
    
    // 根据开关状态显示/隐藏配置提示
    if (aiConfigHint) {
      aiConfigHint.style.display = aiEnabledCheckbox.checked ? 'block' : 'none';
    }
  });

  // 页面总结功能始终默认开启，移除切换开关
  // 确保 storage 中 pageSummaryEnabled 始终为 true
  (async () => {
    await storage.set({ pageSummaryEnabled: true });
    const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
    settings.pageSummaryEnabled = true;
    localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
  })();
  
  // 一键总结按钮事件
  if (quickSummaryBtn) {
    quickSummaryBtn.addEventListener('click', () => {
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'pageSummary'
          }).catch(err => {
            console.log('[Live2D Popup] Could not send pageSummary message:', err);
          });
        }
      });
    });
  }

  // 实验功能总开关
  experimentalEnabledCheckbox.addEventListener('change', async () => {
    const isEnabled = experimentalEnabledCheckbox.checked;
    await storage.set({ experimentalEnabled: isEnabled });

    if (isEnabled) {
      experimentalContent.classList.remove('collapsed');
      dragCheckbox.disabled = false;
      mouseFeaturesEnabledCheckbox.disabled = false;
      
      // 只有当资源可用时才启用子开关
      if (mouseCursorAvailable) {
        mouseCursorCheckbox.disabled = false;
      }
      if (clickEffectAvailable) {
        clickEffectCheckbox.disabled = false;
      }
    } else {
      experimentalContent.classList.add('collapsed');
      dragCheckbox.disabled = true;
      mouseFeaturesEnabledCheckbox.disabled = true;
      mouseCursorCheckbox.disabled = true;
      clickEffectCheckbox.disabled = true;

      // 关闭所有子功能
      dragCheckbox.checked = false;
      mouseFeaturesEnabledCheckbox.checked = false;
      mouseCursorCheckbox.checked = false;
      clickEffectCheckbox.checked = false;
      mouseFeaturesContainer.style.opacity = '0.5';
      mouseFeaturesContainer.style.pointerEvents = 'none';
      clickEffectContainer.style.opacity = '0.5';
      clickEffectContainer.style.pointerEvents = 'none';
      mouseCursorSelectContainer.style.display = 'none';
      mouseCursorSizeContainer.style.display = 'none';

      await storage.set({
        drag: false,
        mouseFeaturesEnabled: false,
        mouseCursorEnabled: false,
        clickEffectEnabled: false
      });
    }
  });

  mouseFeaturesEnabledCheckbox.addEventListener('change', async () => {
    const isEnabled = mouseFeaturesEnabledCheckbox.checked;
    await storage.set({ mouseFeaturesEnabled: isEnabled });

    if (!isEnabled) {
      mouseCursorCheckbox.checked = false;
      clickEffectCheckbox.checked = false;
      await storage.set({ mouseCursorEnabled: false, clickEffectEnabled: false });
    }

    mouseFeaturesContainer.style.display = isEnabled ? 'block' : 'none';
  });

  mouseCursorCheckbox.addEventListener('change', async () => {
    await storage.set({ mouseCursorEnabled: mouseCursorCheckbox.checked });
    if (mouseCursorCheckbox.checked && mouseCursorAvailable) {
      mouseCursorSelectContainer.style.display = 'block';
      mouseCursorSizeContainer.style.display = 'block';
      // 如果没有选择过样式，默认选择第一个
      if (!mouseCursorSelect.value || mouseCursorSelect.value === '') {
        const firstOption = mouseCursorSelect.querySelector('option:not([value=""])');
        if (firstOption) {
          mouseCursorSelect.value = firstOption.value;
          await storage.set({ selectedCursor: firstOption.value });
        }
      }
    } else {
      mouseCursorSelectContainer.style.display = 'none';
      mouseCursorSizeContainer.style.display = 'none';
    }
  });

  mouseCursorSelect.addEventListener('change', async () => {
    await storage.set({ selectedCursor: mouseCursorSelect.value });
  });

  mouseCursorSizeInput.addEventListener('input', async () => {
    mouseCursorSizeValue.textContent = mouseCursorSizeInput.value;
    const newSize = parseInt(mouseCursorSizeInput.value) || 150;
    await storage.set({ mouseCursorSize: newSize });
    
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateMouseCursorSize',
          size: newSize
        });
      }
    });
  });

  const resetCursorSizeBtn = document.getElementById('resetCursorSize');
  if (resetCursorSizeBtn) {
    resetCursorSizeBtn.addEventListener('click', async () => {
      const defaultSize = 100;
      mouseCursorSizeInput.value = defaultSize;
      document.getElementById('mouseCursorSizeValue').textContent = defaultSize;
      await storage.set({ mouseCursorSize: defaultSize });
      
      browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          browserAPI.tabs.sendMessage(tabs[0].id, {
            type: 'updateMouseCursorSize',
            size: defaultSize
          });
        }
      });
    });
  }

  clickEffectCheckbox.addEventListener('change', async () => {
    await storage.set({ clickEffectEnabled: clickEffectCheckbox.checked });
  });

  freezeModelEnabledCheckbox.addEventListener('change', async () => {
    await storage.set({ freezeModelEnabled: freezeModelEnabledCheckbox.checked });

    // 检测暗色主题
    const isDarkNow = document.body.classList.contains('dark-theme');

    // 更新下拉菜单的状态
    if (freezeModelEnabledCheckbox.checked) {
      freezeModeSelect.disabled = false;
      freezeModeSelect.style.backgroundColor = isDarkNow ? '#1a1a2e' : '#fff';
      freezeModeSelect.style.color = isDarkNow ? '#ffffff' : '#333';
      freezeModeSelect.style.cursor = 'pointer';
    } else {
      freezeModeSelect.disabled = true;
      freezeModeSelect.style.backgroundColor = isDarkNow ? '#252542' : '#f5f5f5';
      freezeModeSelect.style.color = isDarkNow ? '#888' : '#999';
      freezeModeSelect.style.cursor = 'not-allowed';
    }
    
    // 获取当前冻结模式
    const freezeMode = freezeModeSelect.value;
    await storage.set({ freezeMode: freezeMode });
    
    // 发送消息到 content.js 更新冻结设置
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateFreezeModelStatus',
          freezeModel: freezeModelEnabledCheckbox.checked,
          freezeMode: freezeMode
        }).catch(err => {
          console.log('[Live2D Popup] Could not send freeze model status:', err);
        });
      }
    });
  });
  
  // 显示/隐藏保留标签页输入框
  var freezeKeepTabsInput = document.getElementById('freezeKeepTabs');
  function updateFreezeKeepTabsVis() {
    var wrap = document.getElementById('freezeKeepTabsWrap');
    if (wrap) {
      wrap.style.display = freezeModeSelect.value === 'full' ? 'flex' : 'none';
    }
  }
  
  // 下拉菜单改变事件
  freezeModeSelect.addEventListener('change', async () => {
    const freezeMode = freezeModeSelect.value;
    await storage.set({ freezeMode: freezeMode });
    updateFreezeKeepTabsVis();
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateFreezeModelStatus',
          freezeModel: freezeModelEnabledCheckbox.checked,
          freezeMode: freezeMode
        }).catch(function() {});
      }
    });
  });
  
  // 保存保留标签页数量
  if (freezeKeepTabsInput) {
    freezeKeepTabsInput.addEventListener('change', function() {
      var val = parseInt(this.value, 10);
      if (isNaN(val) || val < 1) val = 5;
      if (val > 50) val = 50;
      this.value = val;
      storage.set({ freezeKeepTabs: val });
    });
  }

  // 新标签页开关事件
  let previousSakanaState = config.sakanaWidgetEnabled || false;
  
  if (newTabEnabledCheckbox) {
    newTabEnabledCheckbox.addEventListener('change', async () => {
      await storage.set({ newTabEnabled: newTabEnabledCheckbox.checked });
      console.log('[Live2D Popup] New tab enabled:', newTabEnabledCheckbox.checked);
      config.newTabEnabled = newTabEnabledCheckbox.checked;
      
      if (newTabEnabledCheckbox.checked) {
        // 打开新标签页时，显示整个区域，恢复之前保存的石蒜小组件状态
        sakanaWidgetSettings.style.display = 'block';
        // 恢复之前的石蒜小组件状态
        sakanaWidgetEnabledCheckbox.checked = previousSakanaState;
        // 显式调用 storage.set 触发 newtab-inject 的监听器
        await storage.set({ sakanaWidgetEnabled: previousSakanaState });
        config.sakanaWidgetEnabled = previousSakanaState;
        // 详细设置根据恢复的状态显示
        const detailSettings = document.getElementById('sakanaWidgetDetailSettings');
        if (detailSettings) {
          detailSettings.style.display = previousSakanaState ? 'block' : 'none';
        }
      } else {
        // 关闭新标签页时，保存当前石蒜小组件状态
        previousSakanaState = config.sakanaWidgetEnabled || false;
        // 关闭石蒜小组件
        sakanaWidgetEnabledCheckbox.checked = false;
        await storage.set({ sakanaWidgetEnabled: false });
        config.sakanaWidgetEnabled = false;
        // 隐藏整个石蒜小组件区域
        sakanaWidgetSettings.style.display = 'none';
      }
    });
  }

  // Sakana Widget 开关事件
  if (sakanaWidgetEnabledCheckbox) {
    sakanaWidgetEnabledCheckbox.addEventListener('change', async () => {
      await storage.set({ sakanaWidgetEnabled: sakanaWidgetEnabledCheckbox.checked });
      console.log('[Live2D Popup] Sakana Widget enabled:', sakanaWidgetEnabledCheckbox.checked);
      config.sakanaWidgetEnabled = sakanaWidgetEnabledCheckbox.checked;
      // 更新详细设置的显示
      const detailSettings = document.getElementById('sakanaWidgetDetailSettings');
      if (detailSettings) {
        detailSettings.style.display = sakanaWidgetEnabledCheckbox.checked ? 'block' : 'none';
      }
    });
  }

  // Sakana Widget 拖拽开关事件 - 已在初始化时添加

  // Sakana Widget 位置拖拽开关事件 - 已在初始化时添加

  // Sakana Widget 重置位置按钮
  const resetSakanaWidgetPositionBtn = document.getElementById('resetSakanaWidgetPosition');
  if (resetSakanaWidgetPositionBtn) {
    resetSakanaWidgetPositionBtn.addEventListener('click', async () => {
      // 重置位置到默认（右上角）
      // 使用特殊标记来区分重置操作和关闭开关操作
      await storage.set({ 
        sakanaWidgetPositionX: 20, 
        sakanaWidgetPositionY: 20, 
        sakanaWidgetPositionSaved: false,
        sakanaWidgetPositionReset: true 
      });
      
      // 同时更新 localStorage
      const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
      settings.sakanaWidgetPositionX = 20;
      settings.sakanaWidgetPositionY = 20;
      settings.sakanaWidgetPositionSaved = false;
      settings.sakanaWidgetPositionReset = true;
      localStorage.setItem('live2dExtensionSettings', JSON.stringify(settings));
      
      console.log('[Live2D Popup] Sakana Widget position reset to default');
    });
  }

  // Sakana Widget 大小滑块事件
  if (sakanaWidgetSizeInput) {
    sakanaWidgetSizeInput.addEventListener('input', async () => {
      const newSize = parseInt(sakanaWidgetSizeInput.value) || 120;
      // 同步到输入框
      if (sakanaWidgetSizeValue) {
        sakanaWidgetSizeValue.value = newSize;
      }
      await storage.set({ sakanaWidgetSize: newSize });
      console.log('[Live2D Popup] Sakana Widget size:', newSize);
    });
  }

  // Sakana Widget 大小输入框事件
  if (sakanaWidgetSizeValue) {
    sakanaWidgetSizeValue.addEventListener('input', async () => {
      let newSize = parseInt(sakanaWidgetSizeValue.value) || 120;
      // 限制范围
      newSize = Math.max(60, Math.min(200, newSize));
      // 同步到滑块
      if (sakanaWidgetSizeInput) {
        sakanaWidgetSizeInput.value = newSize;
      }
      await storage.set({ sakanaWidgetSize: newSize });
      console.log('[Live2D Popup] Sakana Widget size:', newSize);
    });
  }

  // Sakana Widget 重置大小按钮
  const resetSakanaWidgetSizeBtn = document.getElementById('resetSakanaWidgetSize');
  if (resetSakanaWidgetSizeBtn) {
    resetSakanaWidgetSizeBtn.addEventListener('click', async () => {
      const defaultSize = 120;
      sakanaWidgetSizeInput.value = defaultSize;
      if (sakanaWidgetSizeValue) {
        sakanaWidgetSizeValue.value = defaultSize;
      }
      await storage.set({ sakanaWidgetSize: defaultSize });
      console.log('[Live2D Popup] Sakana Widget size reset to default:', defaultSize);
    });
  }



  // 清理所有其他标签页的模型（保留当前页）
  const cleanupOtherTabsBtn = document.getElementById('cleanupOtherTabsBtn');
  if (cleanupOtherTabsBtn) cleanupOtherTabsBtn.addEventListener('click', async () => {
    try {
      var allTabs = await tabs.query({});
      var [currentTab] = await tabs.query({ active: true, currentWindow: true });
      var cleanedCount = 0;
      
      for (var ci = 0; ci < allTabs.length; ci++) {
        var tab = allTabs[ci];
        if (tab.id !== currentTab.id) {
          try {
            browserAPI.tabs.sendMessage(tab.id, { type: 'cleanupModel', skipReload: true }, function() { cleanedCount++; });
          } catch(e) {}
        }
      }
      
      await new Promise(function(resolve) { setTimeout(resolve, 1000); });

      await updateMemoryUsage();

      // 显示提示
      alert(`已尝试清理其他标签页的模型喵~`);
    } catch (err) {
      console.error('[Live2D Popup] Cleanup error:', err);
      alert('清理失败，请重试喵~');
    }
  });

  refreshBtn.addEventListener('click', async () => {
    const [tab] = await tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      await tabs.reload(tab.id);
      await new Promise(resolve => setTimeout(resolve, 800));
      await tabs.reload(tab.id);
      await new Promise(resolve => setTimeout(resolve, 200));
      window.close();
    }
  });



  storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && (changes.localModel || changes.cubism3Model || changes.useCubism3)) {
      refreshDisplay();
    }
    // 监听 aiConnected 变化，实时更新连接状态
    if (areaName === 'local' && changes.aiConnected) {
      updateConnectionStatus(changes.aiConnected.newValue);
    }
    // 监听 aiConnected 变化，更新页面总结区域可见性
    if (areaName === 'local' && changes.aiConnected && pageSummarySection) {
      pageSummarySection.style.display = (aiEnabledCheckbox.checked && changes.aiConnected.newValue) ? 'block' : 'none';
    }
  });

  // ==============================
  // 内存占用显示功能
  // ==============================

  function formatBytes(bytes) {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async function updateMemoryUsage() {
    try {
      var allTabs = await tabs.query({});
      var totalMemory = 0;
      var tabCount = 0;

      for (var ti = 0; ti < allTabs.length; ti++) {
        try {
          var resp = await new Promise(function(resolve, reject) {
            browserAPI.tabs.sendMessage(allTabs[ti].id, { type: 'getMemoryUsage' }, function(r) {
              if (browserAPI.runtime.lastError) { reject(); } else { resolve(r); }
            });
          });
          if (resp && resp.memoryMB) { totalMemory += resp.memoryMB; tabCount++; }
        } catch(e) {}
      }
      
      var avgMB = tabCount > 0 ? (totalMemory / tabCount) : 80;
      memoryUsageElement.textContent = `${avgMB.toFixed(1)} MB`;
      var progressPercent = Math.min((avgMB / 300) * 100, 100);
      updateProgressBar(progressPercent);
      await new Promise(function(r) { detectBrowserMemory(r); });
      await updateBrowserMemory(avgMB);
    } catch (e) {
      console.error('[Live2D Popup] Error getting memory:', e);
      memoryUsageElement.textContent = '错误';
    }
  }
  
  function updateProgressBar(percent) {
    memoryProgressBar.style.width = `${percent}%`;
    
    // 根据内存占用调整颜色
    if (percent < 30) {
      memoryProgressBar.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)'; // 绿色
    } else if (percent < 60) {
      memoryProgressBar.style.background = 'linear-gradient(90deg, #FFC107, #FF9800)'; // 黄色
    } else if (percent < 85) {
      memoryProgressBar.style.background = 'linear-gradient(90deg, #FF9800, #FF5722)'; // 橙色
    } else {
      memoryProgressBar.style.background = 'linear-gradient(90deg, #F44336, #E91E63)'; // 红色
    }
  }
  
  async function updateBrowserMemory(currentTabMemoryMB) {
    try {
      // 显示可用内存
      var availMB = window.__availableMemoryMB || 0;
      browserMemoryUsageElement.textContent = availMB > 0 ? `${availMB.toFixed(0)} MB` : '-- MB';
      
      // 已用百分比 = 当前标签页插件内存 / 系统总内存
      var usedPercent = browserTotalMemoryMB > 0 ? (currentTabMemoryMB / browserTotalMemoryMB) * 100 : 0;
      pluginMemoryPercent.textContent = `${Math.min(usedPercent, 100).toFixed(2)}%`;
      
      // 更新饼图
      updateMemoryPieChart(Math.min(usedPercent, 100));
      
      if (usedPercent < 10) {
        pluginMemoryPercent.style.color = '#4CAF50';
      } else if (usedPercent < 20) {
        pluginMemoryPercent.style.color = '#FF9800';
      } else {
        pluginMemoryPercent.style.color = '#F44336';
      }
    } catch (e) {
      console.error('[Live2D Popup] Error calculating browser memory:', e);
      browserMemoryUsageElement.textContent = '-- MB';
    }
  }
  
  function updateMemoryPieChart(percent) {
    try {
      const circumference = 2 * Math.PI * 40; // 2πr, r=40
      const dashLength = Math.min((percent / 100) * circumference, circumference);
      memoryPieChart.style.strokeDasharray = `${dashLength} ${circumference}`;
      memoryPieChart.style.strokeDashoffset = 0;
    } catch (e) {
      console.error('[Live2D Popup] Error updating pie chart:', e);
    }
  }

  // 初始化系统总内存检测
  detectSystemTotalMemory();
  
  // 初始化浏览器内存检测
  detectBrowserMemory();
  
  // ─── 按键绑定系统 ───
  
  const DEFAULT_KEYBINDINGS = {
    pageSummary:       { ctrl: true, shift: true,  alt: false, key: 'V' },
    screenshot:        { ctrl: true, shift: false, alt: true,  key: 'V' },
    screenshotNoMascot:{ ctrl: true, shift: false, alt: true,  key: 'B' },
    dailyImage:        { ctrl: true, shift: false, alt: true,  key: 'G' }
  };

  let currentKeybindings = {};
  let recordingAction = null;
  let slotRebinding = null; // { action: string, type: 'key'|'ctrl'|'shift'|'alt' } 表示正在等待按键的小格子

  function formatBinding(b) {
    if (!b || !b.key) return '未绑定';
    var parts = [];
    if (b.ctrl) parts.push('Ctrl');
    if (b.shift) parts.push('Shift');
    if (b.alt) parts.push('Alt');
    parts.push(b.key.toUpperCase());
    return parts.join('+');
  }

  function kbdStyle(extra) {
    return 'background:#2a2a2a;padding:1px 5px;border-radius:3px;border:1px solid #555;font-size:11px;color:#4fa3ff;cursor:pointer;' + (extra || '');
  }

  function renderKeySlots() {
    document.querySelectorAll('.key-slot').forEach(function(slot) {
      var action = slot.dataset.action;
      var bind = currentKeybindings[action];
      // 清除旧内容
      slot.innerHTML = '';
      slot.onclick = null;

      if (bind && bind.key) {
        // Ctrl badge
        if (bind.ctrl) {
          var ctrlKbd = document.createElement('kbd');
          ctrlKbd.textContent = 'Ctrl';
          ctrlKbd.style.cssText = kbdStyle();
          ctrlKbd.dataset.modifier = 'ctrl';
          ctrlKbd.title = '点击切换 Ctrl';
          slot.appendChild(ctrlKbd);
          slot.appendChild(document.createTextNode(' + '));
        }
        // Shift badge
        if (bind.shift) {
          var shiftKbd = document.createElement('kbd');
          shiftKbd.textContent = 'Shift';
          shiftKbd.style.cssText = kbdStyle();
          shiftKbd.dataset.modifier = 'shift';
          shiftKbd.title = '点击切换 Shift';
          slot.appendChild(shiftKbd);
          slot.appendChild(document.createTextNode(' + '));
        }
        // Alt badge
        if (bind.alt) {
          var altKbd = document.createElement('kbd');
          altKbd.textContent = 'Alt';
          altKbd.style.cssText = kbdStyle();
          altKbd.dataset.modifier = 'alt';
          altKbd.title = '点击切换 Alt';
          slot.appendChild(altKbd);
          slot.appendChild(document.createTextNode(' + '));
        }
        // Key badge（可点击修改键位）
        var keyKbd = document.createElement('kbd');
        keyKbd.textContent = bind.key.toUpperCase();
        keyKbd.style.cssText = kbdStyle('color:#ffc107;');
        keyKbd.dataset.keyBadge = action;
        keyKbd.title = '点击修改按键';
        slot.appendChild(keyKbd);
      } else {
        // 未绑定，显示占位
        var placeholder = document.createElement('span');
        placeholder.textContent = '点击绑定';
        placeholder.style.cssText = 'color:#666;font-size:11px;cursor:pointer;';
        slot.appendChild(placeholder);
        placeholder.onclick = function() { openKeybindDialog(action); };
      }
    });

    // 绑定单个 badge 的点击事件（事件委托）
    attachSlotBadgeEvents();
  }

  function attachSlotBadgeEvents() {
    // 修饰键 badge 点击：切换该修饰键
    document.querySelectorAll('.key-slot kbd[data-modifier]').forEach(function(el) {
      el.onclick = function(e) {
        e.stopPropagation();
        var slot = el.closest('.key-slot');
        if (!slot) return;
        var action = slot.dataset.action;
        var bind = currentKeybindings[action];
        if (!bind) return;
        var mod = el.dataset.modifier;
        bind[mod] = !bind[mod];
        // 确保至少有一个修饰键或键位
        if (!bind.ctrl && !bind.shift && !bind.alt && !bind.key) bind.key = 'V';
        saveKeybindings();
      };
    });

    // key badge 点击：进入「等待按键」模式
    document.querySelectorAll('.key-slot kbd[data-key-badge]').forEach(function(el) {
      el.onclick = function(e) {
        e.stopPropagation();
        var action = el.dataset.keyBadge;
        slotRebinding = { action: action, type: 'key' };
        el.textContent = '...';
        el.style.color = '#ff8800';
        el.style.borderColor = '#ff8800';
        console.log('[Keybind] Waiting for key press for', action);
      };
    });
  }

  function renderDialogBindings() {
    document.querySelectorAll('.kbd-recorder').forEach(function(el) {
      var action = el.dataset.action;
      var bind = currentKeybindings[action];
      el.textContent = bind && bind.key ? formatBinding(bind) : '点击绑定';
    });
  }

  function openKeybindDialog(highlightAction) {
    var overlay = document.getElementById('keybindOverlay');
    if (overlay) overlay.style.display = 'flex';
    renderDialogBindings();
    recordingAction = null;
    slotRebinding = null; // 关闭小格子录制状态
    // 如果有高亮 action，自动激活录制
    if (highlightAction) {
      startRecording(highlightAction);
    }
  }

  function startRecording(action) {
    recordingAction = action;
    document.querySelectorAll('.kbd-recorder').forEach(function(el) {
      if (el.dataset.action === action) {
        el.textContent = '按下按键...';
        el.style.color = '#ffc107';
      } else {
        el.style.color = '#4fa3ff';
      }
    });
  }

  function saveKeybindings() {
    chrome.storage.local.set({ keybindings: currentKeybindings }, function() {
      // 同步到 localStorage（供 page 脚本读取）
      try { localStorage.setItem('live2dKeybindings', JSON.stringify(currentKeybindings)); } catch(e) {}
      renderKeySlots();
    });
    // 通知当前页面 content.js 更新绑定
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateKeybindings',
          keybindings: currentKeybindings
        }).catch(() => {});
      }
    });
  }

  // 按键绑定按钮
  var keyBindBtn = document.getElementById('keyBindBtn');
  if (keyBindBtn) {
    keyBindBtn.addEventListener('click', function() { openKeybindDialog(); });
  }

  // 关闭按钮
  var keybindCloseBtn = document.getElementById('keybindCloseBtn');
  if (keybindCloseBtn) {
    keybindCloseBtn.addEventListener('click', function() {
      document.getElementById('keybindOverlay').style.display = 'none';
      recordingAction = null;
      slotRebinding = null;
    });
  }

  // 重置按钮
  var keybindResetBtn = document.getElementById('keybindResetBtn');
  if (keybindResetBtn) {
    keybindResetBtn.addEventListener('click', function() {
      currentKeybindings = JSON.parse(JSON.stringify(DEFAULT_KEYBINDINGS));
      saveKeybindings();
      renderDialogBindings();
      renderKeySlots();
    });
  }

  // 录制键盘事件
  document.addEventListener('keydown', function(e) {
    // 1️⃣ 处理小格子 key 重新绑定（slotRebinding）
    if (slotRebinding) {
      e.preventDefault();
      var isModifier = e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta';
      if (isModifier) return; // 忽略单独的修饰键

      if (e.key === 'Escape') {
        slotRebinding = null;
        renderKeySlots();
        return;
      }

      var action = slotRebinding.action;
      var bind = currentKeybindings[action];
      if (bind) {
        bind.key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        saveKeybindings();
      }
      slotRebinding = null;
      return;
    }

    // 2️⃣ 处理绑定对话框（完整录制）
    var overlay = document.getElementById('keybindOverlay');
    if (!overlay || overlay.style.display !== 'flex') return;
    
    if (recordingAction) {
      e.preventDefault();
      e.stopPropagation();
      
      // 检查是否按了 Escape（取消录制）
      if (e.key === 'Escape') {
        recordingAction = null;
        renderDialogBindings();
        return;
      }
      
      // 检查是否按了 Delete 或 Backspace（清除绑定）
      if (e.key === 'Delete' || e.key === 'Backspace') {
        currentKeybindings[recordingAction] = { ctrl: false, shift: false, alt: false, key: '' };
        saveKeybindings();
        recordingAction = null;
        renderDialogBindings();
        return;
      }
      
      // 只记录修饰键 + 一个普通键
      var isModifier = e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta';
      if (isModifier) return;
      
      var bind = {
        ctrl: e.ctrlKey || false,
        shift: e.shiftKey || false,
        alt: e.altKey || false,
        key: e.key.length === 1 ? e.key.toUpperCase() : e.key
      };
      
      currentKeybindings[recordingAction] = bind;
      saveKeybindings();
      recordingAction = null;
      renderDialogBindings();
      return;
    }
  });

  // 点击 dialog 中的 .kbd-recorder 开始录制（独立的 click 事件）
  document.getElementById('keybindDialogList').addEventListener('click', function(e) {
    var target = e.target;
    if (target.classList.contains('kbd-recorder')) {
      e.preventDefault();
      var action = target.dataset.action;
      startRecording(action);
    }
  });

  // 加载已保存的绑定
  chrome.storage.local.get('keybindings', function(result) {
    currentKeybindings = result.keybindings || JSON.parse(JSON.stringify(DEFAULT_KEYBINDINGS));
    // 确保所有 action 都有默认值
    Object.keys(DEFAULT_KEYBINDINGS).forEach(function(act) {
      if (!currentKeybindings[act]) currentKeybindings[act] = DEFAULT_KEYBINDINGS[act];
    });
    saveKeybindings(); // 同步到 localStorage
  });

  // ─── 结束按键绑定系统 ───

  // ─── 模型按键映射系统 ───

  var DEFAULT_MODEL_KEYS = ['Numpad1','Numpad2','Numpad3','Numpad4','Numpad5','Numpad6','Numpad7','Numpad8','Numpad9','Numpad0','NumpadMultiply','NumpadSubtract','NumpadAdd','1','2','3','4','5','6','7','8','9','0','-','=','[',']','\\',';','\'',',','.','/'];
  var _modelKeyBindings = {};
  var _modelKeyRecording = null;
  var _modelSpecialBindings = {}; // { "watermark": "ctrl+alt+F1", ... }

  function loadModelKeyBindings() {
    try {
      var raw = localStorage.getItem('live2dModelKeyBindings');
      if (raw) { _modelKeyBindings = JSON.parse(raw); return; }
    } catch(e) {}
    _modelKeyBindings = {};
    DEFAULT_MODEL_KEYS.forEach(function(k, i) { _modelKeyBindings[k] = i; });
    try {
      var raw2 = localStorage.getItem('live2dSpecialBindings');
      if (raw2) _modelSpecialBindings = JSON.parse(raw2);
    } catch(e) {}
    if (!_modelSpecialBindings.watermark) _modelSpecialBindings.watermark = 'ctrl+alt+F1';
    if (!_modelSpecialBindings.reset) _modelSpecialBindings.reset = 'ctrl+alt+F2';
  }
  function saveModelKeyBindings() {
    try { localStorage.setItem('live2dModelKeyBindings', JSON.stringify(_modelKeyBindings)); } catch(e) {}
    try { localStorage.setItem('live2dSpecialBindings', JSON.stringify(_modelSpecialBindings)); } catch(e) {}
    try { chrome.storage.local.set({ live2dModelKeyBindings: _modelKeyBindings, live2dSpecialBindings: _modelSpecialBindings }); } catch(e) {}
    browserAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) return;
      browserAPI.tabs.sendMessage(tabs[0].id, { type: 'updateModelKeyBindings', bindings: _modelKeyBindings, specials: _modelSpecialBindings }).catch(function() {});
    });
  }
  function fmtKey(k) {
    if (k.startsWith('Numpad')) {
      var n = k.replace('Numpad','').replace('Multiply','*').replace('Subtract','-').replace('Add','+');
      return 'Num' + n;
    }
    var map = { '[':'[', ']':']', '\\':'\\', ';':';', '\'':'\'', ',':',', '.':'.', '/':'/' };
    return map[k] || k;
  }
  function getKeyForAction(index) {
    for (var k in _modelKeyBindings) {
      if (_modelKeyBindings.hasOwnProperty(k) && _modelKeyBindings[k] === index) return fmtKey(k);
    }
    return DEFAULT_MODEL_KEYS[index] || '?';
  }

  function renderModelActions(actions) {
    var list = document.getElementById('modelActionDialogList');
    if (!list) return;
    list.innerHTML = '';
    if (!actions || actions.length === 0) {
      list.innerHTML = '<div style="color: #666; font-size: 12px; text-align: center; padding: 20px;">暂无可用动作，请先加载 Cubism3 模型</div>';
      return;
    }
    // 去重
    var seen = {};
    actions = actions.filter(function(a) {
      var k = a.type + ':' + a.name + ':' + (a.id || '');
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
    loadModelKeyBindings();
    var hasSpecial = false;
    actions.forEach(function(action, i) {
      if (action.type === 'special') {
        if (!hasSpecial) {
          hasSpecial = true;
          var sep = document.createElement('div');
          sep.style.cssText = 'border-top: 1px solid #444; margin: 4px 0;';
          list.appendChild(sep);
        }
        var key = _modelSpecialBindings[action.id] || action.combo || '未绑定';
        var row = document.createElement('div');
        row.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
        var label = document.createElement('span');
        label.style.cssText = 'color: #4fa3ff; font-size: 12px; font-weight: bold;';
        label.textContent = '[' + action.name + ']';
        var kbd = document.createElement('span');
        kbd.style.cssText = 'background: #2a2a2a; border: 1px solid #555; border-radius: 4px; padding: 4px 10px; min-width: 80px; text-align: center; font-size: 12px; cursor: pointer; color: #4fa3ff;';
        kbd.textContent = key;
        kbd.dataset.actionIdx = i;
        kbd.dataset.special = action.id;
        kbd.title = '点击更改组合键';
        kbd.addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(this.dataset.actionIdx, 10);
          _modelKeyRecording = idx;
          this.textContent = '按下组合键...';
          this.style.color = '#ff8800';
          this.style.borderColor = '#ff8800';
        });
        row.appendChild(label);
        row.appendChild(kbd);
        list.appendChild(row);
        return;
      }
      var key = getKeyForAction(i);
      var row = document.createElement('div');
      row.style.cssText = 'display: flex; align-items: center; justify-content: space-between;';
      var label = document.createElement('span');
      label.style.cssText = 'color: #bbb; font-size: 12px;';
      var isSwitch = action.name && action.name.indexOf('[切换]') === 0;
      label.textContent = isSwitch ? action.name : '[表情] ' + action.name;
      if (isSwitch) label.style.textDecoration = 'line-through';
      var kbd = document.createElement('span');
      kbd.style.cssText = 'background: #2a2a2a; border: 1px solid #555; border-radius: 4px; padding: 4px 10px; min-width: 40px; text-align: center; font-size: 12px; cursor: ' + (isSwitch ? 'default' : 'pointer') + '; color: ' + (isSwitch ? '#666' : '#4fa3ff') + ';';
      if (isSwitch) kbd.style.textDecoration = 'line-through';
      kbd.textContent = key;
      kbd.dataset.actionIdx = i;
      if (!isSwitch) {
        kbd.title = '点击更改按键';
        kbd.addEventListener('click', function(e) {
          e.stopPropagation();
          var idx = parseInt(this.dataset.actionIdx, 10);
          _modelKeyRecording = idx;
          this.textContent = '...';
          this.style.color = '#ff8800';
          this.style.borderColor = '#ff8800';
        });
      }
      row.appendChild(label);
      row.appendChild(kbd);
      list.appendChild(row);
    });
  }

  // 键盘录制
  document.addEventListener('keydown', function(e) {
    if (_modelKeyRecording === null) return;
    var overlay = document.getElementById('modelActionOverlay');
    if (!overlay || overlay.style.display !== 'flex') { _modelKeyRecording = null; return; }
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { _modelKeyRecording = null; fetchModelActionsAndRender(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      // 删除此动作的绑定
      for (var k in _modelKeyBindings) {
        if (_modelKeyBindings.hasOwnProperty(k) && _modelKeyBindings[k] === _modelKeyRecording) {
          delete _modelKeyBindings[k];
          break;
        }
      }
      _modelKeyRecording = null;
      saveModelKeyBindings();
      // 重新获取最新 actions 并渲染
      fetchModelActionsAndRender();
      return;
    }
    // 检查当前录制的是否为特殊动作（组合键）
    var isSpecial = false;
    var specialId = '';
    if (_lastFetchedActions[_modelKeyRecording] && _lastFetchedActions[_modelKeyRecording].type === 'special') {
      isSpecial = true;
      specialId = _lastFetchedActions[_modelKeyRecording].id || '';
    }
    if (isSpecial) {
      // 组合键录制：捕获修饰键 + 普通键
      if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return;
      var parts = [];
      if (e.ctrlKey) parts.push('ctrl');
      if (e.altKey) parts.push('alt');
      if (e.shiftKey) parts.push('shift');
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      var combo = parts.join('+');
      _modelSpecialBindings[specialId] = combo;
      _modelKeyRecording = null;
      saveModelKeyBindings();
      fetchModelActionsAndRender();
      return;
    }
    // 用 e.code 区分主键盘和小键盘
    var code = e.code || '';
    var pressed = code.startsWith('Numpad') ? code : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
    // 如果按的是小键盘键，自动解除对应主键盘键的绑定（避免冲突）
    if (code.startsWith('Numpad')) {
        var mainKey = code.replace('Numpad','').replace('Subtract','-').replace('Add','=');
        for (var mk in _modelKeyBindings) {
            if (_modelKeyBindings.hasOwnProperty(mk) && mk === mainKey && _modelKeyBindings[mk] === _modelKeyRecording) {
                delete _modelKeyBindings[mk];
            }
        }
    }
    // 检查新键是否已被其他动作占用
    var conflictIdx = null;
    for (var k in _modelKeyBindings) {
      if (_modelKeyBindings.hasOwnProperty(k) && k === pressed && _modelKeyBindings[k] !== _modelKeyRecording) {
        conflictIdx = _modelKeyBindings[k];
        break;
      }
    }
    if (conflictIdx !== null) {
      // 查找冲突的动作名称
      var conflictName = '';
      if (_lastFetchedActions[conflictIdx]) {
        conflictName = _lastFetchedActions[conflictIdx].name;
      }
      if (!confirm('按键 "' + pressed + '" 已被 "' + conflictName + '" 占用，是否覆盖？')) {
        _modelKeyRecording = null;
        fetchModelActionsAndRender();
        return;
      }
      // 用户确认覆盖，删除冲突绑定
      delete _modelKeyBindings[pressed];
      // 被覆盖的动作自动获得其默认快捷键
      var defaultKeyForConflict = DEFAULT_MODEL_KEYS[conflictIdx];
      if (defaultKeyForConflict) {
        // 检查是否已有其他键指向此动作（说明用户之前自定义过）
        var alreadyBound = false;
        for (var kk in _modelKeyBindings) {
          if (_modelKeyBindings.hasOwnProperty(kk) && _modelKeyBindings[kk] === conflictIdx) {
            alreadyBound = true;
            break;
          }
        }
        if (!alreadyBound) {
          // 默认键已被其他动作占用？则解除旧占用
          for (var kk in _modelKeyBindings) {
            if (_modelKeyBindings.hasOwnProperty(kk) && kk === defaultKeyForConflict) {
              delete _modelKeyBindings[kk];
              break;
            }
          }
          _modelKeyBindings[defaultKeyForConflict] = conflictIdx;
        }
      }
    }
    // 移除旧绑定（同一动作只能绑一个键）
    for (var k in _modelKeyBindings) {
      if (_modelKeyBindings.hasOwnProperty(k) && _modelKeyBindings[k] === _modelKeyRecording) {
        delete _modelKeyBindings[k];
      }
    }
    _modelKeyBindings[pressed] = _modelKeyRecording;
    _modelKeyRecording = null;
    saveModelKeyBindings();
    fetchModelActionsAndRender();
  });

  var _lastFetchedActions = [];
  var _fetchRetryTimer = null;
  // 默认使用缓存，fallback 到消息获取
  function tryCacheThenFetch(forceRefresh) {
    if (forceRefresh) {
      fetchModelActionsAndRender();
      return;
    }
    // 1) 优先从 assets/ 缓存读取
    browserAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) { fetchModelActionsAndRender(); return; }
      browserAPI.tabs.sendMessage(tabs[0].id, { type: 'getCurrentModel' }).then(function(resp) {
        var modelName = (resp && resp.model) || '';
        if (!modelName) { fetchModelActionsAndRender(); return; }
        var parts = modelName.split('/');
        var cacheUrl = chrome.runtime.getURL('live2d-static-api/assets/' + parts[0] + '/' + parts.slice(1).join('/') + '/actions_cache.json');
        fetch(cacheUrl).then(function(r) {
          if (!r.ok) throw new Error('no cache');
          return r.json();
        }).then(function(cached) {
          if (cached && cached.length > 0) {
            // 按与运行时 finalizeActions 相同的排序规则排序，保证按键映射一致
            cached.sort(function(a, b) {
              var ao = a.sortOrder !== undefined ? a.sortOrder : 9999;
              var bo = b.sortOrder !== undefined ? b.sortOrder : 9999;
              return ao - bo;
            });
            _lastFetchedActions = cached;
            renderModelActions(cached);
            var hint = document.getElementById('modelActionHint');
            if (hint) hint.innerHTML = '加载模型后可设置动作快捷键（' + (cached.length > 0 ? '<span style="color:#4fa3ff;font-weight:bold;">' + cached.length + '</span>' : '0') + '表情）';
          } else {
            fetchModelActionsAndRender();
          }
        }).catch(function() { fetchModelActionsAndRender(); });
      }).catch(function() { fetchModelActionsAndRender(); });
    });
  }
  // 2) fallback：通过消息从页面获取
  function fetchModelActionsAndRender() {
    if (_fetchRetryTimer) { clearTimeout(_fetchRetryTimer); _fetchRetryTimer = null; }
    browserAPI.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs[0]) { scheduleRetry(); return; }
      browserAPI.tabs.sendMessage(tabs[0].id, { type: 'getModelActions' })
        .then(function(response) {
          var actions = (response && response.actions) || [];
          _lastFetchedActions = actions;
          renderModelActions(actions);
          var hint = document.getElementById('modelActionHint');
          if (hint) {
            hint.innerHTML = actions.length > 0
              ? '发现 <span style="color:#4fa3ff;font-weight:bold;">' + actions.length + '</span> 个可用动作，点击按键可更改'
              : '当前模型没有可用的动作/表情文件';
          }
          if (actions.length === 0) scheduleRetry();
        })
        .catch(function() {
          renderModelActions([]);
          var hint = document.getElementById('modelActionHint');
          if (hint) hint.textContent = '请先在有 Live2D 模型的页面打开此弹窗';
          scheduleRetry();
        });
    });
  }
  function scheduleRetry() {
    if (_fetchRetryTimer) clearTimeout(_fetchRetryTimer);
    _fetchRetryTimer = setTimeout(function() { fetchModelActionsAndRender(); }, 1500);
  }

  // 模型按键映射按钮 → 默认用缓存
  var modelActionBindBtn = document.getElementById('modelActionBindBtn');
  if (modelActionBindBtn) {
    modelActionBindBtn.addEventListener('click', function() {
      var overlay = document.getElementById('modelActionOverlay');
      if (overlay) overlay.style.display = 'flex';
      loadModelKeyBindings();
      tryCacheThenFetch(false);
    });
  }

  // 刷新按钮 → 强制从页面重新获取
  var modelActionRefreshBtn = document.getElementById('modelActionRefreshBtn');
  if (modelActionRefreshBtn) {
    modelActionRefreshBtn.addEventListener('click', function() {
      tryCacheThenFetch(true);
    });
  }

  // 重置按钮
  var modelActionResetBtn = document.getElementById('modelActionResetBtn');
  if (modelActionResetBtn) {
    modelActionResetBtn.addEventListener('click', function() {
      _modelKeyBindings = {};
      DEFAULT_MODEL_KEYS.forEach(function(k, i) { _modelKeyBindings[k] = i; });
      _modelSpecialBindings = { watermark: 'ctrl+alt+F1', reset: 'ctrl+alt+F2' };
      _modelKeyRecording = null;
      saveModelKeyBindings();
      tryCacheThenFetch(true);
    });
  }

  // 关闭按钮
  var modelActionCloseBtn = document.getElementById('modelActionCloseBtn');
  if (modelActionCloseBtn) {
    modelActionCloseBtn.addEventListener('click', function() {
      document.getElementById('modelActionOverlay').style.display = 'none';
      _modelKeyRecording = null;
    });
  }

  // 点击蒙层背景关闭
  document.addEventListener('click', function(e) {
    var overlay = document.getElementById('modelActionOverlay');
    if (overlay && overlay.style.display === 'flex' && e.target === overlay) {
      overlay.style.display = 'none';
      _modelKeyRecording = null;
    }
  });

  // ─── 结束模型按键映射系统 ───

  // 初始加载时从缓存读取（forceRefresh=false）
  setTimeout(function() { tryCacheThenFetch(false); }, 300);

  // 立即更新一次
  updateMemoryUsage();

  // 每 3 秒更新一次
  const memoryUpdateInterval = setInterval(updateMemoryUsage, 3000);

  // ========== 模型参数按钮 + 蒙层 ==========
  var modelParamBtn = document.getElementById('modelParamBtn');
  var modelParamOverlay = document.getElementById('modelParamOverlay');
  var hitAreaCheckbox = document.getElementById('hitAreaCheckbox');
  
  var hitAreaSoundCheckbox = document.getElementById('hitAreaSoundCheckbox');
  var hitAreaMotionCheckbox = document.getElementById('hitAreaMotionCheckbox');
  
  function updateParamBtnVisibility() {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      browserAPI.tabs.sendMessage(tabs[0].id, { type: 'QUERY_HITAREA_STATUS' }).then((resp) => {
        var hasHitAreas = resp && resp.hasHitAreas;
        if (modelParamBtn) modelParamBtn.style.display = hasHitAreas ? 'inline' : 'none';
        if (hitAreaCheckbox) hitAreaCheckbox.checked = !!(resp && resp.enabled);
        if (hitAreaSoundCheckbox) hitAreaSoundCheckbox.checked = !!(resp && resp.soundEnabled);
        if (hitAreaMotionCheckbox) hitAreaMotionCheckbox.checked = !!(resp && resp.motionEnabled);
        if (resp && resp.volume !== undefined) {
          if (volumeSlider) volumeSlider.value = resp.volume;
          if (volumeInput) volumeInput.value = resp.volume;
        }
      }).catch(() => {});
    });
  }
  updateParamBtnVisibility();
  window.addEventListener('focus', updateParamBtnVisibility);
  
  // 打开蒙层
  if (modelParamBtn) {
    modelParamBtn.addEventListener('click', function() {
      if (modelParamOverlay) modelParamOverlay.style.display = 'flex';
    });
  }
  // 点击蒙层背景关闭
  if (modelParamOverlay) {
    modelParamOverlay.addEventListener('click', function(e) {
      if (e.target === modelParamOverlay) modelParamOverlay.style.display = 'none';
    });
  }
  // 关闭按钮
  var paramCloseBtn = document.getElementById('paramCloseBtn');
  if (paramCloseBtn) {
    paramCloseBtn.addEventListener('click', function() {
      if (modelParamOverlay) modelParamOverlay.style.display = 'none';
    });
  }
  function sendToggle(type, checked) {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      browserAPI.tabs.sendMessage(tabs[0].id, { type: type, enabled: checked }).catch(() => {});
    });
  }
  if (hitAreaCheckbox) {
    hitAreaCheckbox.addEventListener('change', function() {
      sendToggle('TOGGLE_HITAREA_OVERLAY', hitAreaCheckbox.checked);
    });
  }
  var volumeRow = document.getElementById('volumeRow');
  var volumeSlider = document.getElementById('volumeSlider');
  var volumeInput = document.getElementById('volumeInput');
  
  function updateVolumeRow() {
    if (volumeRow) volumeRow.style.display = hitAreaSoundCheckbox && hitAreaSoundCheckbox.checked ? 'flex' : 'none';
  }
  
  if (hitAreaSoundCheckbox) {
    hitAreaSoundCheckbox.addEventListener('change', function() {
      sendToggle('TOGGLE_HITAREA_SOUND', hitAreaSoundCheckbox.checked);
      updateVolumeRow();
    });
  }
  
  function sendVolume(val) {
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      browserAPI.tabs.sendMessage(tabs[0].id, { type: 'SET_HITAREA_VOLUME', volume: val }).catch(() => {});
    });
  }
  
  if (volumeSlider && volumeInput) {
    // 从 localStorage 读取音量值
    var savedVol = localStorage.getItem('live2d_hitAreaVolume');
    if (savedVol !== null) {
      volumeSlider.value = savedVol;
      volumeInput.value = savedVol;
    }
    volumeSlider.addEventListener('input', function() {
      volumeInput.value = volumeSlider.value;
      localStorage.setItem('live2d_hitAreaVolume', volumeSlider.value);
      sendVolume(parseInt(volumeSlider.value));
    });
    volumeInput.addEventListener('change', function() {
      var v = Math.min(100, Math.max(0, parseInt(volumeInput.value) || 0));
      volumeInput.value = v;
      volumeSlider.value = v;
      localStorage.setItem('live2d_hitAreaVolume', v);
      sendVolume(v);
    });
  }
  updateVolumeRow();
  if (hitAreaMotionCheckbox) {
    hitAreaMotionCheckbox.addEventListener('change', function() {
      sendToggle('TOGGLE_HITAREA_MOTION', hitAreaMotionCheckbox.checked);
    });
  }

  // 窗口关闭时清除定时器
  window.addEventListener('beforeunload', () => {
    clearInterval(memoryUpdateInterval);
  });
});