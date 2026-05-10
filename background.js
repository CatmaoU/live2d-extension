// Live2D Widget Extension - Background Script for Title Fetching
// This service worker handles title fetching via Chrome Extension APIs

let tabTitles = {};

// Load stored titles on startup
chrome.storage.local.get(['tabTitles'], (result) => {
  if (result.tabTitles) {
    tabTitles = result.tabTitles;
    console.log('[Live2D Background] Loaded stored titles:', Object.keys(tabTitles).length);
  }
});

// Listen for tab updates to store page titles
chrome.webNavigation?.onCompleted?.addListener((details) => {
  if (details.frameId === 0) {
    chrome.tabs.get(details.tabId, (tab) => {
      if (tab && tab.title && tab.url && tab.url.startsWith('http')) {
        try {
          const urlObj = new URL(tab.url);
          const domain = urlObj.hostname.replace(/^www\./, '');
          tabTitles[domain] = tab.title;
          // Also store by full domain with www
          tabTitles[urlObj.hostname] = tab.title;
          // Store in extension storage for persistence
          chrome.storage.local.set({ tabTitles: tabTitles }, () => {
            console.log('[Live2D Background] Stored title for:', domain, '=', tab.title);
          });
        } catch (e) {
          // Invalid URL, ignore
        }
      }
    });
  }
});

// Also listen for tab updates via tabs API as fallback
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.title && tab.url && tab.url.startsWith('http')) {
    try {
      const urlObj = new URL(tab.url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      tabTitles[domain] = tab.title;
      tabTitles[urlObj.hostname] = tab.title;
    } catch (e) {
      // Invalid URL, ignore
    }
  }
});

// Listen for messages from content scripts
chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTitle') {
    const url = request.url || '';
    try {
      const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
      const hostname = urlObj.hostname;
      const domain = hostname.replace(/^www\./, '');

      console.log('[Live2D Background] getTitle request:', hostname, 'domain:', domain);
      console.log('[Live2D Background] Available titles:', Object.keys(tabTitles));

      // Check exact hostname match
      if (tabTitles[hostname]) {
        console.log('[Live2D Background] Found exact match:', tabTitles[hostname]);
        sendResponse({ title: tabTitles[hostname] });
        return true;
      }

      // Check domain without www
      if (tabTitles[domain]) {
        console.log('[Live2D Background] Found domain match:', tabTitles[domain]);
        sendResponse({ title: tabTitles[domain] });
        return true;
      }

      // Check partial matches
      for (const [key, value] of Object.entries(tabTitles)) {
        if (key.includes(domain) || domain.includes(key)) {
          console.log('[Live2D Background] Found partial match:', key, '=', value);
          sendResponse({ title: value });
          return true;
        }
      }

      console.log('[Live2D Background] No title found for:', hostname);
      sendResponse({ title: null });
    } catch (e) {
      console.error('[Live2D Background] Error:', e);
      sendResponse({ title: null });
    }
    return true;
  }

  if (request.action === 'storeTitle') {
    const { url, title } = request;
    if (url && title) {
      try {
        const urlObj = new URL(url.startsWith('http') ? url : 'https://' + url);
        const domain = urlObj.hostname.replace(/^www\./, '');
        tabTitles[domain] = title;
        tabTitles[urlObj.hostname] = title;
        chrome.storage.local.set({ tabTitles: tabTitles });
        console.log('[Live2D Background] Stored title:', domain, '=', title);
      } catch (e) {
        // Invalid URL
      }
    }
    sendResponse({ success: true });
    return true;
  }

  // Proxy API requests to bypass CORS
  if (request.action === 'fetchApi') {
    const { url, options } = request;
    console.log('[Live2D Background] Proxying API request:', url);

    fetch(url, options)
      .then(async (response) => {
        const data = await response.json();
        sendResponse({ success: true, data, status: response.status });
      })
      .catch((error) => {
        console.error('[Live2D Background] Proxy request failed:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep message port open for async response
  }
});

console.log('[Live2D Background] Title fetching service worker started');
