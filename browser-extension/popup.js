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
    
    document.getElementById('trackerUrl').value = settings.trackerUrl || '';
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
    // Get current tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (currentTab.url.includes('facebook.com')) {
      document.getElementById('status').textContent = '🟢 Active on Facebook';
      
      // Try to get stats from content script
      try {
        const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getStats' });
        if (response) {
          document.getElementById('postsTracked').textContent = response.postsTracked || 0;
        }
      } catch (error) {
        // Content script might not be loaded yet
        console.log('Could not get stats from content script');
      }
    } else {
      document.getElementById('status').textContent = '⚪ Not on Facebook';
    }
    
    // Load auction stats from tracker
    const settings = await chrome.storage.sync.get(['trackerUrl']);
    if (settings.trackerUrl) {
      try {
        const response = await fetch(`${settings.trackerUrl}/api/analytics`);
        if (response.ok) {
          const data = await response.json();
          document.getElementById('activeAuctions').textContent = data.activeAuctions || 0;
        }
      } catch (error) {
        console.log('Could not load tracker stats');
      }
    }
    
  } catch (error) {
    console.error('Failed to load status:', error);
    document.getElementById('status').textContent = '❌ Error';
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