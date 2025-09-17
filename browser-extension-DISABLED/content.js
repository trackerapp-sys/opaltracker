// Opal Auction Tracker - Facebook Content Script
console.log('🔥 Opal Auction Tracker Extension Loaded');

class OpalAuctionDetector {
  constructor() {
    this.trackerUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-workspace.yvettewalkerboo.replit.dev'; // Your current app URL
    this.isMonitoring = false;
    this.trackedPosts = new Set();
    // Refined bid pattern (more specific)
    this.bidPattern = /(?:bid|offer)\s*:?\s*\$?(\d{1,3}(?:\.\d{1,2})?)|^\$(\d{1,3}(?:\.\d{1,2})?)$/i;
    this.init();
  }

  async init() {
    // Load settings from storage
    const settings = await this.getSettings();
    if (settings.trackerUrl) {
      this.trackerUrl = settings.trackerUrl;
    }

    // Start monitoring
    this.startMonitoring();
    this.addUI();
  }

  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['trackerUrl', 'autoTrack'], (result) => {
        resolve(result);
      });
    });
  }

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('🔍 Starting auction monitoring...');

    // Monitor for new posts
    this.observeNewPosts();

    // Monitor existing posts for comments/bids
    this.monitorExistingPosts();

    // Check for posts every 5 seconds
    setInterval(() => {
      this.scanForAuctionPosts();
    }, 5000);
  }

  observeNewPosts() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if this is a new post
            const posts = node.querySelectorAll('[role="article"], [data-pagelet*="FeedUnit"]');
            posts.forEach(post => this.analyzePost(post));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  monitorExistingPosts() {
    // Check existing posts on page load
    const posts = document.querySelectorAll('[role="article"], [data-pagelet*="FeedUnit"]');
    posts.forEach(post => this.analyzePost(post));
  }

  scanForAuctionPosts() {
    const posts = document.querySelectorAll('[role="article"], [data-pagelet*="FeedUnit"]');
    posts.forEach(post => this.analyzePost(post));
  }

  analyzePost(postElement) {
    if (!postElement || this.trackedPosts.has(postElement)) return;

    const postText = postElement.innerText || '';
    const postId = this.getPostId(postElement);

    if (!postId) return;

    // Check if this looks like an opal auction
    if (this.isOpalAuction(postText)) {
      console.log('🏆 Found opal auction post:', postId);
      this.trackedPosts.add(postElement);
      this.handleAuctionPost(postElement, postText, postId);
    }
  }

  isOpalAuction(text) {
    const opalKeywords = /(?:opal|crystal|black|boulder|white|fire|matrix|lightning ridge|coober pedy)/i;
    const auctionKeywords = /(?:auction|bid|starting|reserve|ends?|closing)/i;
    const priceKeywords = /\$\d+|\d+\s*(?:dollars?|AUD)/i;

    return opalKeywords.test(text) && auctionKeywords.test(text) && priceKeywords.test(text);
  }

  getPostId(postElement) {
    // Try to find Facebook post ID from various attributes
    const link = postElement.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
    if (link) {
      const href = link.getAttribute('href');
      const match = href.match(/\/posts\/(\d+)|\/permalink\/(\d+)/);
      if (match) return match[1] || match[2];
    }

    // Fallback: use data attributes or generate ID
    const dataFt = postElement.querySelector('[data-ft]');
    if (dataFt) {
      try {
        const ft = JSON.parse(dataFt.getAttribute('data-ft'));
        if (ft.mf_story_key) return ft.mf_story_key;
        if (ft.content_owner_id_new) return ft.content_owner_id_new;
      } catch (e) { }
    }

    // Generate unique ID based on post content
    return btoa(postElement.innerText.substring(0, 100)).substring(0, 16);
  }

  async handleAuctionPost(postElement, postText, postId) {
    // Extract auction details
    const auctionData = this.extractAuctionDetails(postText, postId);

    if (auctionData) {
      // Add tracking button to post
      this.addTrackingButton(postElement, auctionData);

      // Auto-save if enabled
      const settings = await this.getSettings();
      if (settings.autoTrack) {
        this.saveAuction(auctionData);
      }

      // Start monitoring this post for bids
      this.monitorPostForBids(postElement, auctionData);
    }
  }

  extractAuctionDetails(text, postId) {
    try {
      // Extract opal type
      const opalTypes = ['Black Opal', 'Crystal Opal', 'Boulder Opal', 'White Opal', 'Fire Opal', 'Matrix Opal'];
      let opalType = 'Crystal Opal'; // default

      for (const type of opalTypes) {
        if (new RegExp(type, 'i').test(text)) {
          opalType = type;
          break;
        }
      }

      // Extract weight
      const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:ct|carat|gram)/i);
      const weight = weightMatch ? weightMatch[1] : '';

      // Extract starting bid
      const startingBidMatch = text.match(/(?:starting|start|reserve|minimum|min).*?\$(\d+(?:\.\d{2})?)/i);
      const bidMatch = text.match(/\$(\d+(?:\.\d{2})?)/);
      const startingBid = startingBidMatch ? startingBidMatch[1] : (bidMatch ? bidMatch[1] : '');

      // Extract group name
      const groupElement = document.querySelector('[data-testid="breadcrumb"] a, .breadcrumb a');
      const facebookGroup = groupElement ? groupElement.textContent.trim() : 'Unknown Group';

      // Get the post URL from the link within the post
      let postUrl = '';
      const link = postElement.querySelector('a[href*="/posts/"], a[href*="/permalink/"]');
      if (link) {
        postUrl = link.href;
      } else {
        postUrl = window.location.href; // Fallback to current URL
      }

      return {
        opalType,
        weight,
        description: text.substring(0, 200),
        startingBid,
        facebookGroup,
        postUrl,
        endTime: '', // endTime was removed
        postId,
        status: 'active'
      };
    } catch (error) {
      console.error('Error extracting auction details:', error);
      return null;
    }
  }

  addTrackingButton(postElement, auctionData) {
    // Don't add if button already exists
    if (postElement.querySelector('.opal-tracker-btn')) return;

    // Find a good place to add the button
    const actionBar = postElement.querySelector('[role="button"], .UFIActionRow, [data-testid="ufi_action_bar"]');

    if (actionBar) {
      const button = document.createElement('button');
      button.className = 'opal-tracker-btn';
      button.innerHTML = '🔥 Track Auction';
      button.style.cssText = `
        background: #1877f2;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        margin-left: 8px;
        transition: background-color 0.2s;
      `;

      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.saveAuction(auctionData);
        button.innerHTML = '✅ Tracked';
        button.style.background = '#42b883';
      });

      button.addEventListener('mouseenter', () => {
        button.style.background = '#166fe5';
      });

      button.addEventListener('mouseleave', () => {
        if (button.innerHTML === '🔥 Track Auction') {
          button.style.background = '#1877f2';
        }
      });

      actionBar.appendChild(button);
    }
  }

  async saveAuction(auctionData) {
    try {
      console.log('💾 Saving auction to tracker:', auctionData);

      const response = await fetch(`${this.trackerUrl}/api/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(auctionData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Auction saved successfully:', result);

        // Show notification
        this.showNotification('Auction Tracked!', `${auctionData.opalType} auction added to tracker`);

        return result;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Failed to save auction:', error);
      this.showNotification('Error', 'Failed to save auction to tracker');
    }
  }

  monitorPostForBids(postElement, auctionData) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check for new comments that might contain bids
            const comments = node.querySelectorAll('[data-testid="UFI2Comment"], .UFICommentContent');
            comments.forEach(comment => {
              this.checkCommentForBid(comment, auctionData);
            });
          }
        });
      });
    });

    observer.observe(postElement, {
      childList: true,
      subtree: true
    });

    // Also check existing comments
    const existingComments = postElement.querySelectorAll('[data-testid="UFI2Comment"], .UFICommentContent');
    existingComments.forEach(comment => {
      this.checkCommentForBid(comment, auctionData);
    });
  }

  checkCommentForBid(commentElement, auctionData) {
    const commentText = commentElement.innerText || '';
    const bids = this.extractBidsFromText(commentText);

    if (bids.length > 0) {
      const highestBid = Math.max(...bids);
      console.log(`💰 New bid detected: $${highestBid} on ${auctionData.opalType}`);

      // Update the auction with new bid
      this.updateAuctionBid(auctionData.postId, highestBid);

      // Show notification
      this.showNotification('New Bid!', `$${highestBid} on ${auctionData.opalType}`);
    }
  }

  extractBidsFromText(text) {
    const bids = [];
    let match;

    while ((match = this.bidPattern.exec(text)) !== null) {
      const amount = parseFloat(match[1] || match[2]);
      if (amount >= 1 && amount <= 500) {
        bids.push(amount);
      }
    }

    return bids;
  }

  async updateAuctionBid(postId, newBid) {
    try {
      // Find the auction by postId and update the bid
      const response = await fetch(`${this.trackerUrl}/api/auctions?postId=${postId}`);
      if (response.ok) {
        const auctions = await response.json();
        if (auctions.length > 0) {
          const auction = auctions[0];
          const currentBid = parseFloat(auction.currentBid || auction.startingBid);

          if (newBid > currentBid) {
            await fetch(`${this.trackerUrl}/api/auctions/${auction.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                currentBid: newBid.toString()
              })
            });

            console.log(`✅ Updated auction ${auction.id} with new bid: $${newBid}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to update auction bid:', error);
    }
  }

  showNotification(title, message) {
    // Try to show browser notification
    if (chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: title,
        message: message
      });
    }

    // Also show in-page notification
    this.showInPageNotification(title, message);
  }

  showInPageNotification(title, message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #42b883;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      max-width: 300px;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${title}</div>
      <div>${message}</div>
    `;

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  addUI() {
    // Add floating action button for quick access
    const fab = document.createElement('div');
    fab.innerHTML = '🔥';
    fab.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: #1877f2;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
      transition: all 0.2s;
    `;

    fab.addEventListener('click', () => {
      this.showQuickStats();
    });

    fab.addEventListener('mouseenter', () => {
      fab.style.transform = 'scale(1.1)';
    });

    fab.addEventListener('mouseleave', () => {
      fab.style.transform = 'scale(1)';
    });

    document.body.appendChild(fab);
  }

  showQuickStats() {
    // Show quick overlay with tracking stats
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 10001;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      padding: 24px;
      border-radius: 12px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
    `;

    modal.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #1877f2;">🔥 Opal Auction Tracker</h3>
      <p style="margin: 0 0 16px 0; color: #65676b;">
        Tracking ${this.trackedPosts.size} auction posts on this page.
      </p>
      <button id="openTracker" style="
        background: #1877f2;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        margin-right: 8px;
      ">Open Tracker</button>
      <button id="closeModal" style="
        background: #e4e6ea;
        color: #1c1e21;
        border: none;
        padding: 12px 24px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      ">Close</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Event listeners
    modal.querySelector('#openTracker').addEventListener('click', () => {
      window.open(this.trackerUrl, '_blank');
      document.body.removeChild(overlay);
    });

    modal.querySelector('#closeModal').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });
  }
}

// Initialize the auction detector
if (window.location.hostname.includes('facebook.com')) {
  new OpalAuctionDetector();
}