// Popup script for Opal Auction Tracker extension
console.log('Popup loaded');

let isMonitoring = false;
let trackerUrl = 'http://localhost:5000';

// Load saved settings
chrome.storage.sync.get(['isMonitoring', 'trackerUrl', 'stats'], (result) => {
  isMonitoring = result.isMonitoring || false;
  trackerUrl = result.trackerUrl || 'http://localhost:5000';
  
  updateUI();
  
  // Load stats
  if (result.stats) {
    document.getElementById('bids-found').textContent = result.stats.bidsFound || 0;
    document.getElementById('auctions-tracked').textContent = result.stats.auctionsTracked || 0;
  }
  
  // Set tracker URL input
  document.getElementById('tracker-url').value = trackerUrl;
});

// Update UI based on monitoring state
function updateUI() {
  const statusIndicator = document.getElementById('status-indicator');
  const statusIcon = document.getElementById('status-icon');
  const statusText = document.getElementById('status-text');
  const toggleBtn = document.getElementById('toggle-monitoring');
  
  if (isMonitoring) {
    statusIndicator.className = 'status-indicator status-active';
    statusIcon.textContent = '🟢';
    statusText.textContent = 'Monitoring Active';
    toggleBtn.textContent = 'Stop Monitoring';
    toggleBtn.className = 'button button-success';
  } else {
    statusIndicator.className = 'status-indicator status-inactive';
    statusIcon.textContent = '⭕';
    statusText.textContent = 'Monitoring Inactive';
    toggleBtn.textContent = 'Start Monitoring';
    toggleBtn.className = 'button button-primary';
  }
}

// Toggle monitoring
document.getElementById('toggle-monitoring').addEventListener('click', () => {
  isMonitoring = !isMonitoring;
  
  // Save state
  chrome.storage.sync.set({ isMonitoring });
  
  // Send message to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url.includes('facebook.com')) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleMonitoring',
        isMonitoring: isMonitoring
      });
    }
  });
  
  updateUI();
});

// Open auction tracker
document.getElementById('open-tracker').addEventListener('click', () => {
  chrome.tabs.create({ url: trackerUrl });
});

// Save tracker URL when changed
document.getElementById('tracker-url').addEventListener('change', (e) => {
  trackerUrl = e.target.value;
  chrome.storage.sync.set({ trackerUrl });
});

// Test connection to tracker
async function testConnection() {
  try {
    const response = await fetch(`${trackerUrl}/api/analytics`);
    if (response.ok) {
      console.log('✅ Connected to auction tracker');
    } else {
      console.warn('⚠️ Tracker responded but with error status');
    }
  } catch (error) {
    console.error('❌ Cannot connect to auction tracker:', error);
  }
}

// Test connection on popup open
testConnection();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateStats') {
    document.getElementById('bids-found').textContent = message.stats.bidsFound;
    document.getElementById('auctions-tracked').textContent = message.stats.auctionsTracked;
    
    // Save stats
    chrome.storage.sync.set({ stats: message.stats });
  }
});