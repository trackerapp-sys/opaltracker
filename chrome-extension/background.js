// Background service worker for Opal Auction Tracker
console.log('Opal Auction Tracker background script loaded');

// Check if Chrome APIs are available
if (typeof chrome === 'undefined') {
  console.error('Chrome APIs not available in this context');
} else {
  console.log('Chrome APIs available:', Object.keys(chrome));
}

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
  }).catch(error => {
    console.error('Error setting default settings:', error);
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
    case 'updateAuction':
      handleUpdateAuction(message.data, sendResponse);
      return true; // Keep the message channel open for async response
  }
});

// Handle bid found event
function handleBidFound(bidData) {
  console.log('New bid found:', bidData);
  
  // Update stats
  chrome.storage.sync.get(['stats']).then((result) => {
    const stats = result.stats || { bidsFound: 0, auctionsTracked: 0 };
    stats.bidsFound += 1;
    return chrome.storage.sync.set({ stats }).then(() => stats);
  }).then((stats) => {
    // Update badge
    updateBadge(stats.bidsFound);
  }).catch(error => {
    console.error('Error updating bid stats:', error);
  });
  
  // Log bid detection (notifications require additional permission)
  console.log(`🎯 New bid detected: $${bidData.amount} in opal auction`);
}

// Handle notification clicks - removed to avoid permission issues
// chrome.notifications.onClicked.addListener((notificationId) => {
//   chrome.notifications.clear(notificationId);
// });

// Handle auction tracked event
function handleAuctionTracked(auctionData) {
  console.log('Auction tracked:', auctionData);
  
  // Update stats
  chrome.storage.sync.get(['stats']).then((result) => {
    const stats = result.stats || { bidsFound: 0, auctionsTracked: 0 };
    stats.auctionsTracked += 1;
    return chrome.storage.sync.set({ stats });
  }).catch(error => {
    console.error('Error updating auction stats:', error);
  });
}

// Update extension badge
function updateBadge(count) {
  try {
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Handle auction update request
async function handleUpdateAuction(data, sendResponse) {
  try {
    console.log('Background: Handling auction update:', data);
    console.log('Background: Data details:', {
      url: data.url,
      highestBid: data.highestBid,
      bidCount: data.bidCount,
      bidderName: data.bidderName
    });
    
    // Get tracker URL from storage
    const result = await chrome.storage.sync.get(['trackerUrl']);
    const trackerUrl = result.trackerUrl || 'http://localhost:5000';
    console.log('Background: Using tracker URL:', trackerUrl);
    
    // First, try to find existing auction by URL
    const searchResponse = await fetch(`${trackerUrl}/api/auctions?search=${encodeURIComponent(data.url)}`);
    const searchData = await searchResponse.json();
    console.log('Background: Search response:', searchData);
    
    if (searchData.auctions && searchData.auctions.length > 0) {
      const auction = searchData.auctions[0];
      console.log('Background: Found auction:', auction);
      
      const updateData = {
        currentBid: data.highestBid.toString(),
        bidCount: data.bidCount,
        lastUpdated: new Date().toISOString()
      };
      
      // Add bidder name if available
      if (data.bidderName) {
        updateData.currentBidder = data.bidderName;
      }
      
      console.log('Background: Sending update to server:', updateData);
      
      const updateResponse = await fetch(`${trackerUrl}/api/auctions/${auction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });
      
      if (updateResponse.ok) {
        console.log(`Background: Updated auction ${auction.id} with bid $${data.highestBid}${data.bidderName ? ` by ${data.bidderName}` : ''}`);
        sendResponse({ success: true });
      } else {
        const errorText = await updateResponse.text();
        console.error('Background: Failed to update auction:', errorText);
        sendResponse({ success: false, error: errorText });
      }
    } else {
      console.log('Background: No matching auction found for this URL. Create one in the tracker first.');
      sendResponse({ success: false, error: 'No matching auction found' });
    }
  } catch (error) {
    console.error('Background: Error updating auction:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle tab updates to reset monitoring state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  try {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('facebook.com')) {
      // Inject monitoring state into new Facebook pages
      chrome.storage.sync.get(['isMonitoring']).then((result) => {
        if (result.isMonitoring) {
          chrome.tabs.sendMessage(tabId, {
            action: 'toggleMonitoring',
            isMonitoring: true
          }).catch(error => {
            console.log('Could not send message to tab (tab may have closed):', error);
          });
        }
      }).catch(error => {
        console.error('Error getting monitoring state:', error);
      });
    }
  } catch (error) {
    console.error('Error in tab update listener:', error);
  }
});