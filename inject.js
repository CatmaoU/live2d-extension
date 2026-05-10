// Live2D Widget Extension - Direct Implementation
(function() {
  // 浏览器API兼容层：支持Chrome和Firefox
  const browserAPI = (typeof browser !== 'undefined' && browser.storage) ? browser : chrome;

  // 封装 storage API 为 Promise 风格
  function storageGet(keys) {
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
        console.error('[Live2D Inject] Storage get error:', e);
        resolve({});
      }
    });
  }

  // Use local extension resources to avoid CSP issues
  let live2d_path;
  try {
    if (browserAPI && browserAPI.runtime && browserAPI.runtime.getURL) {
      live2d_path = browserAPI.runtime.getURL('dist/');
      if (!live2d_path.endsWith('/')) live2d_path += '/';
    } else {
      live2d_path = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0-rc.6/dist/';
    }
  } catch (e) {
    live2d_path = 'https://fastly.jsdelivr.net/npm/live2d-widgets@1.0.0-rc.6/dist/';
  }

  // Method to encapsulate asynchronous resource loading
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
    try {
      // Get extension specific: check if enabled
      const config = await storageGet(['enabled', 'modelId', 'drag', 'cdnPath']);
      if (config.enabled === false) return;

      // Avoid cross-origin issues with image resources
      const OriginalImage = window.Image;
      window.Image = function(...args) {
        const img = new OriginalImage(...args);
        img.crossOrigin = "anonymous";
        return img;
      };
      window.Image.prototype = OriginalImage.prototype;

      // Load waifu.css and waifu-tips.js
      await Promise.all([
        loadExternalResource(live2d_path + 'waifu.css', 'css'),
        loadExternalResource(live2d_path + 'waifu-tips.js', 'js')
      ]);

      // Call initWidget with custom config
      window.initWidget({
        waifuPath: live2d_path + 'waifu-tips.json',
        cdnPath: config.cdnPath || 'https://fastly.jsdelivr.net/gh/fghrsh/live2d_api/',
        cubism2Path: live2d_path + 'live2d.min.js',
        cubism5Path: live2d_path + 'live2dcubismcore.min.js',
        modelId: config.modelId || 0,
        tools: ['hitokoto', 'switch-model', 'switch-texture', 'photo', 'info', 'quit'],
        logLevel: 'warn',
        drag: config.drag || false,
      });

      console.log('%cLive2D%cWidget%c\n', 'padding: 8px; background: #cd3e45; font-weight: bold; font-size: large; color: white;', 'padding: 8px; background: #ff5450; font-size: large; color: #eee;', '');
    } catch (error) {
      console.error('Live2D Widget Extension Error:', error);
    }
  })();
})();