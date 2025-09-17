// Enhanced Facebook Bid Detector - Improved Pattern Matching and Bidder Name Extraction
console.log('🔥 Enhanced Facebook Bid Detector Loaded!');

class EnhancedBidDetector {
  constructor() {
    this.trackerUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-workspace.yvettewalkerboo.replit.dev';
    this.detectedBids = new Map(); // Track bids to avoid duplicates
    this.lastScanTime = 0;
    this.scanInterval = 10000; // 10 seconds
    this.init();
  }

  init() {
    console.log('🚀 Initializing Enhanced Bid Detector...');
    this.setupMutationObserver();
    this.startPeriodicScanning();
    this.addDebugTools();
  }

  setupMutationObserver() {
    // Watch for new comments being added to the page
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.scanElementForBids(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('👀 Mutation observer setup complete');
  }

  startPeriodicScanning() {
    setInterval(() => {
      this.performFullScan();
    }, this.scanInterval);

    // Initial scan after page loads
    setTimeout(() => {
      this.performFullScan();
    }, 3000);
  }

  performFullScan() {
    console.log('🔍 Performing full bid scan...');
    
    // Get all potential comment containers
    const commentContainers = this.getCommentContainers();
    console.log(`📦 Found ${commentContainers.length} comment containers`);

    commentContainers.forEach((container, index) => {
      this.scanElementForBids(container);
    });

    this.lastScanTime = Date.now();
  }

  getCommentContainers() {
    // Multiple selectors to catch different Facebook comment structures
    const selectors = [
      '[data-testid*="comment"]',
      '[role="article"]',
      '[data-testid*="Comment"]',
      '[data-testid*="post"]',
      '[data-testid*="story"]',
      '.userContent',
      '.commentable_item',
      // Generic containers that might hold comments
      'div[dir="auto"]',
      'span[dir="auto"]',
      // Facebook's newer comment structure
      '[data-testid="UFI2Comment"]',
      '[data-testid="UFI2CommentBody"]'
    ];

    const containers = [];
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (!containers.includes(el)) {
          containers.push(el);
        }
      });
    });

    return containers;
  }

  scanElementForBids(element) {
    const text = element.textContent || '';
    if (text.length < 3 || text.length > 500) return; // Skip too short or too long text

    // Look for bid patterns in this element
    const bids = this.extractBidsFromText(text);
    
    if (bids.length > 0) {
      bids.forEach(bid => {
        const bidderName = this.extractBidderName(element, bid.amount);
        this.processDetectedBid(bid.amount, bidderName, text, element);
      });
    }
  }

  extractBidsFromText(text) {
    const bids = [];
    
    // Enhanced bid patterns - more comprehensive
    const patterns = [
      // Standalone numbers (most common)
      { regex: /^(\d{1,4}(?:\.\d{1,2})?)$/gm, type: 'standalone' },
      
      // Dollar amounts
      { regex: /\$(\d{1,4}(?:\.\d{1,2})?)/g, type: 'dollar' },
      
      // Bid statements
      { regex: /(?:bid|offer|take|i bid|my bid)\s*:?\s*\$?(\d{1,4}(?:\.\d{1,2})?)/gi, type: 'bid_statement' },
      { regex: /(\d{1,4}(?:\.\d{1,2})?)\s*(?:bid|offer|take)/gi, type: 'amount_bid' },
      
      // Natural language bids
      { regex: /(?:i'?ll?|will|can)\s+(?:go|pay|bid|do)\s+\$?(\d{1,4}(?:\.\d{1,2})?)/gi, type: 'commitment' },
      { regex: /(\d{1,4}(?:\.\d{1,2})?)\s*(?:for me|please|thanks)/gi, type: 'request' },
      
      // Currency formats
      { regex: /(\d{1,4}(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/gi, type: 'currency' },
      
      // High-value bids (500+)
      { regex: /\b([5-9]\d{2}|[1-9]\d{3})\b/g, type: 'high_value' },
      
      // Facebook comment format: Name Amount Time
      { regex: /^([A-Za-z][A-Za-z\s]{1,25}[A-Za-z])\s+(\d{1,4}(?:\.\d{1,2})?)\s*$/gm, type: 'name_amount' }
    ];

    patterns.forEach(pattern => {
      const matches = [...text.matchAll(pattern.regex)];
      matches.forEach(match => {
        let amount;
        
        if (pattern.type === 'name_amount') {
          amount = parseFloat(match[2]);
        } else {
          amount = parseFloat(match[1]);
        }

        if (this.isValidBidAmount(amount)) {
          bids.push({
            amount: amount,
            type: pattern.type,
            context: match[0],
            confidence: this.calculateConfidence(pattern.type, amount, text)
          });
        }
      });
    });

    // Remove duplicates and sort by confidence
    const uniqueBids = Array.from(
      new Map(bids.map(bid => [bid.amount, bid])).values()
    ).sort((a, b) => b.confidence - a.confidence);

    return uniqueBids;
  }

  isValidBidAmount(amount) {
    if (!amount || isNaN(amount)) return false;
    
    // Reasonable auction bid range
    if (amount < 10 || amount > 5000) return false;
    
    // Must be a reasonable increment
    if (amount % 0.25 !== 0 && amount % 1 !== 0) return false;
    
    // Reject common non-bid amounts
    const rejectAmounts = [12, 12.5, 20, 28, 1, 2, 3, 4, 5];
    if (rejectAmounts.includes(amount)) return false;
    
    return true;
  }

  calculateConfidence(type, amount, context) {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence for explicit bid patterns
    if (type === 'bid_statement' || type === 'commitment') confidence += 0.3;
    if (type === 'dollar') confidence += 0.2;
    if (type === 'standalone' && context.length < 10) confidence += 0.2;
    
    // Lower confidence for high amounts without context
    if (amount > 1000 && type === 'standalone') confidence -= 0.2;
    
    // Higher confidence for reasonable amounts
    if (amount >= 25 && amount <= 500) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  extractBidderName(element, bidAmount) {
    // Try multiple strategies to find the bidder name
    
    // Strategy 1: Look for name in parent elements
    let currentElement = element;
    for (let i = 0; i < 5; i++) {
      if (!currentElement) break;
      
      const parentText = currentElement.textContent || '';
      const name = this.extractNameFromText(parentText);
      if (name) return name;
      
      currentElement = currentElement.parentElement;
    }
    
    // Strategy 2: Look for name in sibling elements
    const siblings = Array.from(element.parentElement?.children || []);
    for (const sibling of siblings) {
      const siblingText = sibling.textContent || '';
      const name = this.extractNameFromText(siblingText);
      if (name) return name;
    }
    
    // Strategy 3: Look for name patterns in the same element
    const elementText = element.textContent || '';
    const name = this.extractNameFromText(elementText);
    if (name) return name;
    
    return 'Unknown Bidder';
  }

  extractNameFromText(text) {
    // Enhanced name extraction patterns
    const namePatterns = [
      // Full name patterns
      /([A-Z][a-z]+ [A-Z][a-z]+)/g,
      // First name only (less reliable)
      /^([A-Z][a-z]{2,15})\s/g,
      // Names followed by common separators
      /([A-Z][a-z]+ [A-Z][a-z]+)(?:\s+\d|\s+\$|\s+\d+[dhmwy]|LikeReplyShare)/g
    ];

    for (const pattern of namePatterns) {
      const matches = [...text.matchAll(pattern)];
      for (const match of matches) {
        const name = match[1].trim();
        if (this.isValidName(name)) {
          return name;
        }
      }
    }

    return null;
  }

  isValidName(name) {
    if (!name || typeof name !== 'string') return false;
    
    // Clean the name
    const cleanName = name.trim()
      .replace(/^[^A-Za-z]*/, '')
      .replace(/[^A-Za-z\s]*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Must be 3-30 characters
    if (cleanName.length < 3 || cleanName.length > 30) return false;
    
    // Must start and end with letters
    if (!/^[A-Za-z]/.test(cleanName) || !/[A-Za-z]$/.test(cleanName)) return false;
    
    // Must contain only letters and spaces
    if (!/^[A-Za-z\s]+$/.test(cleanName)) return false;
    
    // Reject common false positives
    const rejectPatterns = [
      'Most relevant', 'LikeReplyShare', 'Share', 'Like', 'Reply',
      'Unknown', 'unknown', 'UNKNOWN', 'bidder', 'Bidder',
      'international shipping', 'within Australia', 'shipping', 'postage'
    ];
    
    for (const pattern of rejectPatterns) {
      if (cleanName.includes(pattern)) return false;
    }
    
    // Must have proper name structure
    const nameParts = cleanName.split(' ');
    if (nameParts.length < 2) return false;
    
    // Each part must be at least 2 characters
    for (const part of nameParts) {
      if (part.length < 2) return false;
    }
    
    return true;
  }

  processDetectedBid(amount, bidderName, context, element) {
    const bidKey = `${amount}_${bidderName}`;
    
    // Avoid processing the same bid multiple times
    if (this.detectedBids.has(bidKey)) {
      return;
    }
    
    this.detectedBids.set(bidKey, {
      amount,
      bidderName,
      context: context.substring(0, 100),
      timestamp: new Date().toISOString(),
      element: element
    });
    
    console.log(`💰 NEW BID DETECTED: $${amount} by ${bidderName}`);
    console.log(`📝 Context: "${context.substring(0, 50)}..."`);
    
    // Send to tracker
    this.sendBidToTracker(amount, bidderName, context);
    
    // Visual feedback
    this.showBidNotification(amount, bidderName);
  }

  async sendBidToTracker(amount, bidderName, context) {
    try {
      const bidData = {
        url: window.location.href,
        postId: this.extractPostId(),
        amount: amount,
        bidderName: bidderName,
        context: context.substring(0, 200),
        detectedAt: new Date().toISOString(),
        source: 'enhanced-browser-detector'
      };

      console.log('📤 Sending bid to tracker:', bidData);

      // Try Chrome extension API first
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'updateAuction',
          data: bidData
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('Chrome API error:', chrome.runtime.lastError);
            this.fallbackToDirectAPI(bidData);
          } else {
            console.log('✅ Bid sent via Chrome extension');
          }
        });
      } else {
        this.fallbackToDirectAPI(bidData);
      }
    } catch (error) {
      console.error('❌ Error sending bid to tracker:', error);
    }
  }

  async fallbackToDirectAPI(bidData) {
    try {
      const response = await fetch(`${this.trackerUrl}/api/auctions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          opalType: 'Detected Opal',
          weight: '1.00',
          facebookGroup: 'Facebook Opal Auction Group',
          postUrl: bidData.url,
          startingBid: bidData.amount.toString(),
          currentBid: bidData.amount.toString(),
          currentBidder: bidData.bidderName,
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          durationHours: '24',
          status: 'active'
        })
      });

      if (response.ok) {
        console.log('✅ Bid sent via direct API');
      } else {
        console.error('❌ API request failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Direct API fallback failed:', error);
    }
  }

  extractPostId() {
    // Try to extract Facebook post ID from URL
    const urlMatch = window.location.href.match(/\/posts\/(\d+)|\/permalink\/(\d+)/);
    if (urlMatch) return urlMatch[1] || urlMatch[2];
    
    // Fallback: generate ID from URL
    return btoa(window.location.href).substring(0, 16);
  }

  showBidNotification(amount, bidderName) {
    // Create a temporary notification
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
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">💰 New Bid Detected!</div>
      <div>$${amount} by ${bidderName}</div>
    `;

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 4 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 4000);
  }

  addDebugTools() {
    // Add debugging functions to window for manual testing
    window.enhancedBidDetector = {
      scan: () => this.performFullScan(),
      getDetectedBids: () => Array.from(this.detectedBids.values()),
      clearBids: () => this.detectedBids.clear(),
      testPattern: (text) => this.extractBidsFromText(text),
      getCommentContainers: () => this.getCommentContainers()
    };

    console.log('🛠️ Debug tools added to window.enhancedBidDetector');
  }
}

// Initialize the enhanced bid detector
if (window.location.hostname.includes('facebook.com')) {
  new EnhancedBidDetector();
}
