// Background service worker for Opal Auction Tracker Extension

console.log('🔥 Opal Auction Tracker Background Script Loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('Extension installed for the first time');
    
    // Set default settings
    await chrome.storage.sync.set({
      trackerUrl: '',
      autoTrack: false,
      notifications: true
    });
    
    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'showNotification') {
    showNotification(request.title, request.message);
  } else if (request.action === 'updateBadge') {
    updateBadge(request.count);
  }
});

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message,
    priority: 1
  });
}

// Update extension badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#1877f2' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Handle tab updates to inject content script on Facebook pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
    // Content script should auto-inject based on manifest
    console.log('Facebook page loaded:', tab.url);
  }
});

// Periodic check for auction updates
setInterval(async () => {
  try {
    const settings = await chrome.storage.sync.get(['trackerUrl']);
    if (settings.trackerUrl) {
      // Check for auction updates
      const response = await fetch(`${settings.trackerUrl}/api/analytics`);
      if (response.ok) {
        const data = await response.json();
        updateBadge(data.activeAuctions);
      }
    }
  } catch (error) {
    console.log('Background check failed:', error);
  }
}, 30000); // Check every 30 seconds