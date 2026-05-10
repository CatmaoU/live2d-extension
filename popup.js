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
    'freezeModelEnabled', 'freezeMode', 'newTabEnabled', 'sakanaWidgetEnabled', 'sakanaWidgetDraggable', 'sakanaWidgetSize', 'sakanaWidgetPositionSaved'
  ]);

  // 同步所有设置到 localStorage
  const settings = JSON.parse(localStorage.getItem('live2dExtensionSettings') || '{}');
  
  // 同步 AI 相关设置
  settings.aiEnabled = config.aiEnabled || false;
  settings.aiApiKey = config.aiApiKey || settings.aiApiKey;
  settings.siliconflowApiKey = config.siliconflowApiKey || settings.siliconflowApiKey;
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
  
  // 自动检测浏览器进程内存
  function detectBrowserMemory() {
    // 通过 performance.memory 估算
    if (performance && performance.memory) {
      // performance.memory.jsHeapSizeLimit 通常是浏览器为当前标签页分配的堆内存上限
      const heapLimitMB = performance.memory.jsHeapSizeLimit / (1024 * 1024);
      // 浏览器总进程内存通常是堆内存的 2-4 倍
      browserTotalMemoryMB = Math.round(heapLimitMB * 3);
    }
    
    console.log('[Live2D] Estimated browser total memory:', browserTotalMemoryMB, 'MB');
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
      
      const positionAutoRefresh = document.getElementById('positionAutoRefresh');
      if (positionAutoRefresh && positionAutoRefresh.checked) {
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
  
  // 下拉菜单改变事件
  freezeModeSelect.addEventListener('change', async () => {
    const freezeMode = freezeModeSelect.value;
    await storage.set({ freezeMode: freezeMode });
    
    // 发送消息到 content.js 更新冻结模式
    browserAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browserAPI.tabs.sendMessage(tabs[0].id, {
          type: 'updateFreezeModelStatus',
          freezeModel: freezeModelEnabledCheckbox.checked,
          freezeMode: freezeMode
        }).catch(err => {
          console.log('[Live2D Popup] Could not send freeze mode:', err);
        });
      }
    });
  });

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



  // 清理其他标签页模型的按钮
  const cleanupOtherTabsBtn = document.getElementById('cleanupOtherTabsBtn');
  cleanupOtherTabsBtn.addEventListener('click', async () => {
    try {
      // 获取当前窗口的所有标签页
      const allTabs = await tabs.query({ currentWindow: true });
      const [currentTab] = await tabs.query({ active: true, currentWindow: true });
      
      // 发送消息给所有非当前标签页，让它们清理模型
      let cleanedCount = 0;
      let failedCount = 0;
      
      for (const tab of allTabs) {
        if (tab.id !== currentTab.id && tab.id !== undefined) {
          try {
            // 使用回调方式发送消息，兼容所有浏览器
            browserAPI.tabs.sendMessage(tab.id, { type: 'cleanupModel' }, (response) => {
              if (browserAPI.runtime.lastError) {
                // 忽略没有 content script 的标签页
                console.log('[Live2D Popup] Tab not ready for message:', browserAPI.runtime.lastError);
                failedCount++;
              } else {
                cleanedCount++;
              }
            });
          } catch (err) {
            // 忽略无法发送消息的标签页（可能没有加载扩展）
            failedCount++;
          }
        }
      }
      
      // 等待一下，让消息发送完成
      await new Promise(resolve => setTimeout(resolve, 200));

      // 更新内存显示
      updateMemoryUsage();

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
      let currentTabMemoryMB = 0;

      // 总是从 content script 获取准确的内存使用（当前标签页）
      const tabList = await tabs.query({ active: true, currentWindow: true });
      if (tabList[0] && tabList[0].id) {
        try {
          // 使用回调方式发送消息，兼容所有浏览器
          const response = await new Promise((resolve, reject) => {
            browserAPI.tabs.sendMessage(tabList[0].id, { type: 'getMemoryUsage' }, (response) => {
              if (browserAPI.runtime.lastError) {
                reject(browserAPI.runtime.lastError);
              } else {
                resolve(response);
              }
            });
          });
          if (response && response.memoryMB) {
            currentTabMemoryMB = response.memoryMB;
            memoryUsageElement.textContent = `${currentTabMemoryMB.toFixed(1)} MB`;
            
            // 更新进度条（最大限制 300MB）
            const progressPercent = Math.min((currentTabMemoryMB / 300) * 100, 100);
            updateProgressBar(progressPercent);
          } else {
            // 如果没有数据，显示默认值
            memoryUsageElement.textContent = '80 MB';
            updateProgressBar(27);
            currentTabMemoryMB = 80;
          }
        } catch (e) {
          // 如果无法连接 content script，使用默认估算
          memoryUsageElement.textContent = '80 MB';
          updateProgressBar(27);
          currentTabMemoryMB = 80;
        }
      } else {
        memoryUsageElement.textContent = '80 MB';
        updateProgressBar(27);
        currentTabMemoryMB = 80;
      }
      
      // 计算浏览器内存占用
      await updateBrowserMemory(currentTabMemoryMB);
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
      // 获取所有打开的标签页数量
      const allTabs = await tabs.query({});
      const activeTabsCount = allTabs.length;
      
      // 估算总内存：
      // 当前标签页（运行中）+ 其他标签页（冻结或运行）
      let totalPluginMemoryMB = 0;
      
      if (currentTabMemoryMB > 0) {
        totalPluginMemoryMB = currentTabMemoryMB; // 当前标签页
        
        // 估算其他标签页
        for (let i = 0; i < activeTabsCount - 1; i++) {
          // 假设其他标签页约 50-80% 的内存（冻结状态更低）
          totalPluginMemoryMB += currentTabMemoryMB * 0.6;
        }
        
        // 加上扩展后台进程约 10-30MB
        totalPluginMemoryMB += 20;
      } else {
        // 如果没有当前标签页的内存数据，使用默认估算
        totalPluginMemoryMB = activeTabsCount * 60 + 20;
      }
      
      browserMemoryUsageElement.textContent = `${totalPluginMemoryMB.toFixed(0)} MB`;
      
      // 更新浏览器内存进度条
      const browserProgressPercent = Math.min((totalPluginMemoryMB / browserTotalMemoryMB) * 100, 100);
      browserMemoryProgressBar.style.width = `${browserProgressPercent}%`;
      
      // 计算插件占浏览器内存的百分比
      const pluginPercent = (totalPluginMemoryMB / browserTotalMemoryMB) * 100;
      pluginMemoryPercent.textContent = `${pluginPercent.toFixed(2)}%`;
      
      // 更新饼图
      updateMemoryPieChart(pluginPercent);
      
      // 根据百分比调整颜色
      if (pluginPercent < 10) {
        pluginMemoryPercent.style.color = '#4CAF50';
      } else if (pluginPercent < 20) {
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
  
  // 立即更新一次
  updateMemoryUsage();

  // 每 3 秒更新一次
  const memoryUpdateInterval = setInterval(updateMemoryUsage, 3000);

  // 窗口关闭时清除定时器
  window.addEventListener('beforeunload', () => {
    clearInterval(memoryUpdateInterval);
  });
});