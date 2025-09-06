// Opal Auction Tracker - Facebook Bid Detection
console.log('🔥 Opal Auction Tracker extension loaded!');

let isMonitoring = false;
let currentAuctions = [];
let trackerUrl = 'http://localhost:5000'; // Will be configurable

// Get tracker URL from storage
chrome.storage.sync.get(['trackerUrl'], (result) => {
  if (result.trackerUrl) {
    trackerUrl = result.trackerUrl;
  }
});

// Enhanced bid detection patterns
const bidPatterns = [
  /\$(\d{1,4})/g,                        // $200, $1500
  /\b(\d{2,4})\s*(?:dollars?|bucks?)\b/gi, // 200 dollars, 85 bucks
  /\b(?:bid|offer|pay|take)\s*:?\s*\$?(\d{2,4})\b/gi, // bid 200, offer $85
  /\b(\d{2,4})\s*(?:for\s+me|please)\b/gi, // 200 for me
  /\b(?:I'll\s+)?(?:go|pay|bid)\s+\$?(\d{2,4})\b/gi, // I'll go 200, pay $150
  /\b(\d{2,4})\s*(?:firm|final)\b/gi,    // 200 firm
];

// Track auction information from page
function detectAuctionInfo() {
  const url = window.location.href;
  
  // Check if we're on a Facebook post
  if (!url.includes('facebook.com') || !url.includes('posts/')) {
    return null;
  }
  
  // Extract post content for auction details
  const postContent = document.querySelector('[data-testid="post_message"]')?.textContent || 
                     document.querySelector('[role="article"]')?.textContent || '';
  
  // Look for opal-related keywords
  const opalKeywords = ['opal', 'crystal', 'black opal', 'boulder', 'lightning ridge', 'auction'];
  const hasOpalContent = opalKeywords.some(keyword => 
    postContent.toLowerCase().includes(keyword)
  );
  
  if (!hasOpalContent) {
    return null;
  }
  
  // Extract auction details
  const auctionInfo = {
    url: url,
    postId: extractPostId(url),
    content: postContent.substring(0, 500), // First 500 chars
    detectedAt: new Date().toISOString(),
    currentBid: 0,
    bidCount: 0
  };
  
  return auctionInfo;
}

function extractPostId(url) {
  const match = url.match(/posts\/(\d+)/);
  return match ? match[1] : url.split('/').pop();
}

// Scan for bids in comments
function scanForBids() {
  if (!isMonitoring) return;
  
  const comments = document.querySelectorAll([
    '[data-testid="UFI2Comment/body"]',
    '[role="comment"]',
    '.UFICommentBody',
    '.comment-content',
    '[data-testid="comment"]'
  ].join(', '));
  
  let allBids = [];
  let totalComments = comments.length;
  
  comments.forEach(comment => {
    const text = comment.textContent?.trim() || '';
    
    bidPatterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const bid = parseInt(match[1]);
        if (bid >= 10 && bid <= 5000) { // Reasonable bid range
          allBids.push({
            amount: bid,
            comment: text.substring(0, 100),
            timestamp: new Date().toISOString()
          });
          console.log(`💰 Found bid: $${bid} in: "${text.substring(0, 50)}..."`);
        }
      });
    });
  });
  
  if (allBids.length > 0) {
    const uniqueBids = [...new Set(allBids.map(b => b.amount))].sort((a, b) => b - a);
    const highestBid = uniqueBids[0];
    
    console.log(`🏆 Highest bid found: $${highestBid} (${allBids.length} total bids)`);
    
    // Update auction tracker
    updateAuctionTracker(highestBid, allBids.length);
    
    // Show notification
    showBidNotification(highestBid, allBids.length);
  }
}

// Auto-create auction from Facebook post
async function createAuctionAutomatically(auctionInfo, highestBid, bidCount) {
  try {
    // Extract opal details from post content
    const content = auctionInfo.content.toLowerCase();
    
    // Detect opal type
    let opalType = 'Opal';
    if (content.includes('boulder')) opalType = 'Boulder Opal';
    else if (content.includes('crystal')) opalType = 'Crystal Opal';
    else if (content.includes('black opal')) opalType = 'Black Opal';
    else if (content.includes('white opal')) opalType = 'White Opal';
    
    // Extract weight if possible
    const weightMatch = content.match(/(\d+(?:\.\d+)?)\s*(?:ct|carat|gram|g)/i);
    const weight = weightMatch ? weightMatch[1] : '0';
    
    // Create auction automatically
    const auctionData = {
      opalType: opalType,
      weight: weight,
      description: `Auto-detected auction from Facebook post`,
      origin: 'Unknown',
      shape: 'free-form',
      facebookGroup: 'Facebook Auction',
      postUrl: auctionInfo.url,
      startingBid: '20',
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'active',
      currentBid: highestBid.toString()
    };
    
    const response = await fetch(`${trackerUrl}/api/auctions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(auctionData)
    });
    
    if (response.ok) {
      const newAuction = await response.json();
      console.log(`✅ Auto-created auction: ${newAuction.id} with bid $${highestBid}`);
      showBidNotification(highestBid, bidCount, 'Auto-created & tracking!');
    } else {
      console.error('❌ Failed to auto-create auction:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error auto-creating auction:', error);
  }
}

// Update the auction tracker app
async function updateAuctionTracker(highestBid, bidCount) {
  const auctionInfo = detectAuctionInfo();
  if (!auctionInfo) return;
  
  try {
    // First, try to find existing auction by URL
    const response = await fetch(`${trackerUrl}/api/auctions?search=${encodeURIComponent(auctionInfo.url)}`);
    const data = await response.json();
    
    if (data.auctions && data.auctions.length > 0) {
      // Update existing auction
      const auction = data.auctions[0];
      const updateResponse = await fetch(`${trackerUrl}/api/auctions/${auction.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentBid: highestBid.toString(),
          bidCount: bidCount,
          lastUpdated: new Date().toISOString()
        })
      });
      
      if (updateResponse.ok) {
        console.log(`✅ Updated auction ${auction.id} with bid $${highestBid}`);
      } else {
        console.error('❌ Failed to update auction:', await updateResponse.text());
      }
    } else {
      // AUTO-CREATE auction if not found
      console.log('📝 No matching auction found. Auto-creating auction...');
      await createAuctionAutomatically(auctionInfo, highestBid, bidCount);
    }
  } catch (error) {
    console.error('❌ Error updating auction tracker:', error);
  }
}

// Show visual notification of bid update
function showBidNotification(bid, count, customMessage = null) {
  // Remove existing notification
  const existing = document.getElementById('opal-bid-notification');
  if (existing) existing.remove();
  
  // Create notification
  const notification = document.createElement('div');
  notification.id = 'opal-bid-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
    font-size: 14px;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">💎</span>
      <div>
        <div style="font-weight: 600;">Highest Bid: $${bid}</div>
        <div style="font-size: 12px; opacity: 0.9;">
          ${customMessage || `${count} total bids detected`}
        </div>
      </div>
    </div>
  `;
  
  // Add animation keyframes
  if (!document.getElementById('opal-animation-styles')) {
    const style = document.createElement('style');
    style.id = 'opal-animation-styles';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

// Add floating control panel
function addControlPanel() {
  if (document.getElementById('opal-control-panel')) return;
  
  const panel = document.createElement('div');
  panel.id = 'opal-control-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: white;
    border: 2px solid #667eea;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
    min-width: 200px;
  `;
  
  panel.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <span style="font-size: 18px;">💎</span>
      <strong style="color: #333;">Opal Tracker</strong>
    </div>
    <div style="margin-bottom: 8px;">
      <button id="toggle-monitoring" style="
        background: ${isMonitoring ? '#22c55e' : '#667eea'};
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        width: 100%;
      ">
        ${isMonitoring ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring'}
      </button>
    </div>
    <div style="font-size: 11px; color: #666; text-align: center;">
      Status: ${isMonitoring ? 'Active' : 'Inactive'}
    </div>
  `;
  
  // Add event listeners
  const toggleBtn = panel.querySelector('#toggle-monitoring');
  toggleBtn.addEventListener('click', () => {
    isMonitoring = !isMonitoring;
    updateControlPanel();
    
    if (isMonitoring) {
      console.log('🟢 Auction monitoring started');
      startMonitoring();
    } else {
      console.log('🔴 Auction monitoring stopped');
    }
  });
  
  document.body.appendChild(panel);
}

function updateControlPanel() {
  const panel = document.getElementById('opal-control-panel');
  if (!panel) return;
  
  const toggleBtn = panel.querySelector('#toggle-monitoring');
  const status = panel.querySelector('div:last-child');
  
  toggleBtn.style.background = isMonitoring ? '#22c55e' : '#667eea';
  toggleBtn.textContent = isMonitoring ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring';
  status.textContent = `Status: ${isMonitoring ? 'Active' : 'Inactive'}`;
}

// Start monitoring with intervals
function startMonitoring() {
  // Initial scan
  scanForBids();
  
  // Set up aggressive periodic scanning for real-time detection
  const scanInterval = setInterval(() => {
    if (!isMonitoring) {
      clearInterval(scanInterval);
      return;
    }
    scanForBids();
  }, 5000); // Scan every 5 seconds for real-time updates
  
  // Monitor for new comments being added
  const observer = new MutationObserver((mutations) => {
    if (!isMonitoring) return;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        // New content added, scan for bids
        setTimeout(scanForBids, 2000);
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize when page loads
function initialize() {
  console.log('🚀 Initializing Opal Auction Tracker...');
  
  // Check if this looks like an auction post
  const auctionInfo = detectAuctionInfo();
  if (auctionInfo) {
    console.log('📍 Auction detected on this page:', auctionInfo);
    addControlPanel();
    
    // AUTO-START monitoring for full automation
    console.log('🤖 AUTO-STARTING monitoring for fully automated bid detection');
    isMonitoring = true;
    updateControlPanel();
    startMonitoring();
  } else {
    console.log('ℹ️ No auction detected on this page');
  }
}

// Wait for page to load, then initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Re-initialize on navigation (Facebook is SPA)
let currentUrl = location.href;
new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    setTimeout(initialize, 2000); // Give page time to load
  }
}).observe(document, { subtree: true, childList: true });