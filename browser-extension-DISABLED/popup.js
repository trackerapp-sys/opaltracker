// Popup script for Opal Auction Tracker Extension

document.addEventListener('DOMContentLoaded', function() {
  loadSettings();
  loadStatus();
  
  // Event listeners
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('openTracker').addEventListener('click', openTracker);
});

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'trackerUrl', 
      'autoTrack', 
      'notifications'
    ]);
    
    document.getElementById('trackerUrl').value = settings.trackerUrl || 'http://localhost:5003';
    document.getElementById('autoTrack').checked = settings.autoTrack || false;
    document.getElementById('notifications').checked = settings.notifications || false;
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

async function saveSettings() {
  const trackerUrl = document.getElementById('trackerUrl').value.trim();
  const autoTrack = document.getElementById('autoTrack').checked;
  const notifications = document.getElementById('notifications').checked;
  
  // Validate URL
  if (trackerUrl) {
    try {
      new URL(trackerUrl);
    } catch (error) {
      showError('Please enter a valid URL');
      return;
    }
  }
  
  try {
    await chrome.storage.sync.set({
      trackerUrl,
      autoTrack,
      notifications
    });
    
    showSuccess('Settings saved successfully!');
    
    // Test connection to tracker
    if (trackerUrl) {
      testConnection(trackerUrl);
    }
    
  } catch (error) {
    showError('Failed to save settings');
    console.error('Save error:', error);
  }
}

async function testConnection(url) {
  try {
    const response = await fetch(`${url}/api/analytics`);
    if (response.ok) {
      showSuccess('✅ Connected to tracker successfully!');
      loadStatus(); // Refresh status
    } else {
      showError('⚠️ Could not connect to tracker. Check your URL.');
    }
  } catch (error) {
    showError('⚠️ Could not reach tracker. Check your URL and internet connection.');
  }
}

async function loadStatus() {
  try {
    // Set default status
    document.getElementById('status').textContent = '⚪ Loading...';
    
    // Get current tab info with better error handling
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs && tabs[0];
    
    if (currentTab && currentTab.url) {
      if (currentTab.url.includes('facebook.com')) {
        document.getElementById('status').textContent = '🟢 Active on Facebook';
        
        // Try to get stats from content script
        try {
          if (currentTab.id) {
            const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getStats' });
            if (response && response.postsTracked !== undefined) {
              document.getElementById('postsTracked').textContent = response.postsTracked;
            }
          }
        } catch (error) {
          // Content script might not be loaded yet
          console.log('Could not get stats from content script');
        }
      } else {
        document.getElementById('status').textContent = '⚪ Not on Facebook';
      }
    } else {
      document.getElementById('status').textContent = '⚪ No active tab';
    }
    
    // Load auction stats from tracker
    try {
      const settings = await chrome.storage.sync.get(['trackerUrl']);
      if (settings && settings.trackerUrl && typeof settings.trackerUrl === 'string') {
        const response = await fetch(`${settings.trackerUrl}/api/analytics`);
        if (response && response.ok) {
          const data = await response.json();
          if (data && typeof data.activeAuctions !== 'undefined') {
            const activeElement = document.getElementById('activeAuctions');
            if (activeElement) {
              activeElement.textContent = data.activeAuctions;
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not load tracker stats:', error?.message || 'Unknown error');
    }
    
  } catch (error) {
    console.error('Failed to load status:', error);
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = '❌ Error loading status';
    }
  }
}

async function openTracker() {
  const settings = await chrome.storage.sync.get(['trackerUrl']);
  if (settings.trackerUrl) {
    chrome.tabs.create({ url: settings.trackerUrl });
  } else {
    showError('Please set your tracker URL first');
  }
}

function showSuccess(message) {
  const element = document.getElementById('successMessage');
  element.textContent = message;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 3000);
}

function showError(message) {
  const element = document.getElementById('errorMessage');
  element.textContent = message;
  element.style.display = 'block';
  setTimeout(() => {
    element.style.display = 'none';
  }, 5000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    loadStatus();
  }
});