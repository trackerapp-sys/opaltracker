// Smart Facebook Bid Detector - Runs in real browser context
(function() {
  console.log('🎯 Facebook Bid Detector Activated!');
  
  // Function to scan for all bids on the current page
  function scanForBids() {
    console.log('🔍 Scanning for bids...');
    
    // Get ALL text content from the page - this sees real comments
    const allText = document.body.innerText;
    const allHTML = document.body.innerHTML;
    
    // Enhanced bid detection patterns
    const bidPatterns = [
      /\$(\d{1,4})/g,                    // $200, $85
      /\b(\d{2,4})\s*(?:dollars?|bucks?)\b/gi, // 200 dollars
      /(?:bid|offer|take)\s*:?\s*\$?(\d{1,4})/gi, // bid 200, offer $200
      /I(?:'ll|l)?\s+(?:go|pay|bid)\s+\$?(\d{1,4})/gi, // I'll go 200
      /(\d{1,4})\s+for\s+me/gi,         // 200 for me
      /\b(\d{2,4})\b(?=\s|$|\.|\!|\?)/g // standalone numbers
    ];
    
    let allBids = [];
    
    // Search with each pattern
    bidPatterns.forEach(pattern => {
      const matches = [...allText.matchAll(pattern)];
      matches.forEach(match => {
        const bid = parseInt(match[1]);
        if (bid >= 20 && bid <= 1000) {
          allBids.push(bid);
          console.log(`💰 Found potential bid: $${bid}`);
        }
      });
    });
    
    // Also search individual comment elements directly
    const commentSelectors = [
      '[data-testid*="comment"]',
      '[role="comment"]',
      '[data-testid="UFI2Comment"]',
      '.UFIComment',
      'div[dir="auto"]'
    ];
    
    commentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.length < 20) { // Short comments more likely to be bids
          const bidMatch = text.match(/\b(\d{2,4})\b/);
          if (bidMatch) {
            const bid = parseInt(bidMatch[1]);
            if (bid >= 20 && bid <= 1000) {
              allBids.push(bid);
              console.log(`💬 Found bid in comment: $${bid} - "${text}"`);
            }
          }
        }
      });
    });
    
    if (allBids.length > 0) {
      const uniqueBids = [...new Set(allBids)].sort((a, b) => b - a);
      const highest = uniqueBids[0];
      
      console.log(`🔥 ALL BIDS FOUND: ${uniqueBids.join(', ')}`);
      console.log(`🎯 HIGHEST BID: $${highest}`);
      
      return {
        allBids: uniqueBids,
        highest: highest,
        count: allBids.length
      };
    }
    
    console.log('❌ No bids detected');
    return null;
  }
  
  // Function to update auction in the app
  async function updateAuction(bidAmount, bidderName = 'Facebook User') {
    try {
      console.log(`🚀 Updating auction with bid: $${bidAmount}`);
      
      // Get auction to update
      const response = await fetch('https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions');
      const data = await response.json();
      
      if (data.auctions && data.auctions.length > 0) {
        const auction = data.auctions[0];
        const currentBid = parseFloat(auction.currentBid || auction.startingBid || 0);
        
        if (bidAmount > currentBid) {
          const updateResponse = await fetch(`https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions/${auction.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              currentBid: bidAmount.toString(),
              currentBidder: bidderName
            })
          });
          
          if (updateResponse.ok) {
            console.log(`✅ SUCCESS! Updated: $${currentBid} → $${bidAmount}`);
            showNotification(`✅ BID UPDATED: $${currentBid} → $${bidAmount}`, 'success');
            return true;
          }
        } else {
          console.log(`💤 No update needed: $${bidAmount} not greater than $${currentBid}`);
          showNotification(`💤 Bid $${bidAmount} not higher than current $${currentBid}`, 'info');
        }
      }
    } catch (error) {
      console.error('❌ Update failed:', error);
      showNotification('❌ Update failed - check console', 'error');
    }
    
    return false;
  }
  
  // Function to show notifications
  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('bid-detector-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.id = 'bid-detector-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      padding: 15px 20px;
      border-radius: 8px;
      color: white;
      font-weight: bold;
      font-size: 14px;
      max-width: 300px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
  
  // Create control panel
  function createControlPanel() {
    // Remove existing panel
    const existing = document.getElementById('bid-detector-panel');
    if (existing) existing.remove();
    
    const panel = document.createElement('div');
    panel.id = 'bid-detector-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      z-index: 10000;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-family: Arial, sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      min-width: 200px;
    `;
    
    panel.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 16px;">🎯 Bid Detector</h3>
      <button id="scan-bids" style="
        width: 100%;
        padding: 10px;
        margin: 5px 0;
        border: none;
        border-radius: 6px;
        background: #22c55e;
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      ">🔍 Scan for Bids</button>
      <button id="auto-update" style="
        width: 100%;
        padding: 10px;
        margin: 5px 0;
        border: none;
        border-radius: 6px;
        background: #f59e0b;
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      ">⚡ Auto Update Highest</button>
      <div id="bid-results" style="
        margin-top: 10px;
        font-size: 12px;
        max-height: 100px;
        overflow-y: auto;
      "></div>
    `;
    
    document.body.appendChild(panel);
    
    // Add event listeners
    document.getElementById('scan-bids').onclick = () => {
      const results = scanForBids();
      const resultsDiv = document.getElementById('bid-results');
      
      if (results) {
        resultsDiv.innerHTML = `
          <div style="color: #22c55e;">✅ Found ${results.count} bids</div>
          <div>Highest: $${results.highest}</div>
          <div>All: $${results.allBids.join(', $')}</div>
        `;
      } else {
        resultsDiv.innerHTML = '<div style="color: #ef4444;">❌ No bids found</div>';
      }
    };
    
    document.getElementById('auto-update').onclick = async () => {
      const results = scanForBids();
      if (results) {
        await updateAuction(results.highest);
      } else {
        showNotification('❌ No bids found to update', 'error');
      }
    };
    
    // Auto-remove panel after 30 seconds
    setTimeout(() => {
      if (panel.parentNode) {
        panel.remove();
      }
    }, 30000);
  }
  
  // Start the detector
  createControlPanel();
  showNotification('🎯 Bid Detector Ready! Click buttons to detect bids.', 'success');
  
  // Auto-scan every 15 seconds and show results
  setInterval(() => {
    const results = scanForBids();
    if (results && results.highest >= 100) { // Only notify for significant bids
      showNotification(`🔥 High bid detected: $${results.highest}`, 'info');
    }
  }, 15000);
  
})();