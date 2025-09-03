// Simple Opal Auction Tracker - Facebook Content Script
console.log('🔥 Simple Opal Auction Tracker Loaded');

class SimpleAuctionTracker {
  constructor() {
    this.trackerUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev';
    this.bidPattern = /\b(\d{1,3}(?:\.\d{1,2})?)\b/g;
    this.init();
  }

  init() {
    console.log('🔍 Starting simple auction monitoring...');
    
    // Add monitoring button to page
    this.addTrackButton();
    
    // Monitor for new comments every 5 seconds
    setInterval(() => {
      this.checkForNewBids();
    }, 5000);
  }

  addTrackButton() {
    if (document.getElementById('opal-track-btn')) return;
    
    const button = document.createElement('button');
    button.id = 'opal-track-btn';
    button.innerHTML = '🔥 Track Auction';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      background: #1877f2;
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    button.onclick = () => this.trackCurrentPage();
    document.body.appendChild(button);
  }

  async trackCurrentPage() {
    const url = window.location.href;
    console.log('🔥 Tracking auction on:', url);
    
    // Extract auction info from page
    const auctionData = this.extractAuctionData();
    if (auctionData) {
      try {
        const response = await fetch(`${this.trackerUrl}/api/auctions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auctionData)
        });
        
        if (response.ok) {
          this.showNotification('✅ Auction tracked successfully!');
          this.startBidMonitoring(await response.json());
        } else {
          this.showNotification('❌ Failed to track auction');
        }
      } catch (error) {
        console.error('Error tracking auction:', error);
        this.showNotification('❌ Connection error');
      }
    }
  }

  extractAuctionData() {
    // Simple extraction - you can customize this
    return {
      opalType: 'Crystal Opal',
      weight: '22',
      description: 'Facebook auction',
      origin: '',
      shape: '',
      facebookGroup: 'Australian Opal Trading Post',
      postUrl: window.location.href,
      startingBid: '20',
      endTime: new Date(Date.now() + 24*60*60*1000).toISOString(), // 24 hours from now
      status: 'active',
      notes: 'Added via extension',
      isWatchlist: false
    };
  }

  checkForNewBids() {
    // Find all text that looks like bid amounts
    const allText = document.body.innerText;
    const potentialBids = [];
    
    // Look for numbers that could be bids
    let match;
    this.bidPattern.lastIndex = 0;
    while ((match = this.bidPattern.exec(allText)) !== null) {
      const amount = parseFloat(match[1]);
      if (amount >= 5 && amount <= 999) {
        potentialBids.push(amount);
      }
    }
    
    if (potentialBids.length > 0) {
      const highestBid = Math.max(...potentialBids);
      console.log(`🔍 Found potential bids: ${potentialBids.join(', ')} - Highest: $${highestBid}`);
      
      // Update auction with highest bid found
      this.updateBid(highestBid);
    }
  }

  async updateBid(bidAmount) {
    try {
      // Get current auctions to find the one to update
      const response = await fetch(`${this.trackerUrl}/api/auctions`);
      const data = await response.json();
      
      if (data.auctions && data.auctions.length > 0) {
        const auction = data.auctions[0]; // Update first auction
        const currentBid = parseFloat(auction.currentBid || auction.startingBid);
        
        if (bidAmount > currentBid) {
          console.log(`🔥 Updating bid: $${currentBid} → $${bidAmount}`);
          
          const updateResponse = await fetch(`${this.trackerUrl}/api/auctions/${auction.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentBid: bidAmount.toString() })
          });
          
          if (updateResponse.ok) {
            this.showNotification(`🔥 New bid: $${bidAmount}!`);
          }
        }
      }
    } catch (error) {
      console.error('Error updating bid:', error);
    }
  }

  showNotification(message) {
    // Simple notification
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 10000;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
    
    console.log(message);
  }
}

// Start the tracker when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new SimpleAuctionTracker());
} else {
  new SimpleAuctionTracker();
}