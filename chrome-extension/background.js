// Background service worker for Opal Auction Tracker
console.log('Opal Auction Tracker background script loaded');

// Install/startup handler
chrome.runtime.onInstalled.addListener(() => {
  console.log('Opal Auction Tracker extension installed');
  
  // Set default settings
  chrome.storage.sync.set({
    isMonitoring: false,
    trackerUrl: 'http://localhost:5000',
    stats: {
      bidsFound: 0,
      auctionsTracked: 0
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.action) {
    case 'bidFound':
      handleBidFound(message.data);
      break;
    case 'auctionTracked':
      handleAuctionTracked(message.data);
      break;
    case 'updateBadge':
      updateBadge(message.count);
      break;
  }
});

// Handle bid found event
function handleBidFound(bidData) {
  console.log('New bid found:', bidData);
  
  // Update stats
  chrome.storage.sync.get(['stats'], (result) => {
    const stats = result.stats || { bidsFound: 0, auctionsTracked: 0 };
    stats.bidsFound += 1;
    chrome.storage.sync.set({ stats });
    
    // Update badge
    updateBadge(stats.bidsFound);
  });
  
  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'New Bid Detected!',
    message: `$${bidData.amount} bid found in opal auction`
  });
}

// Handle auction tracked event
function handleAuctionTracked(auctionData) {
  console.log('Auction tracked:', auctionData);
  
  // Update stats
  chrome.storage.sync.get(['stats'], (result) => {
    const stats = result.stats || { bidsFound: 0, auctionsTracked: 0 };
    stats.auctionsTracked += 1;
    chrome.storage.sync.set({ stats });
  });
}

// Update extension badge
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Handle tab updates to reset monitoring state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
    // Inject monitoring state into new Facebook pages
    chrome.storage.sync.get(['isMonitoring'], (result) => {
      if (result.isMonitoring) {
        chrome.tabs.sendMessage(tabId, {
          action: 'toggleMonitoring',
          isMonitoring: true
        });
      }
    });
  }
});