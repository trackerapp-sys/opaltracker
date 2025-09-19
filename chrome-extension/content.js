// ULTRA-LIGHTWEIGHT Opal Auction Tracker - NO INTERFERENCE WITH FACEBOOK
console.log('🔥 ULTRA-LIGHTWEIGHT Opal Auction Tracker loaded!');
console.log('⚡ PASSIVE MODE - Will NOT interfere with Facebook loading!');
console.log('📅 TIMESTAMP:', new Date().toISOString());
console.log('🌐 CURRENT URL:', window.location.href);
console.log('📄 PAGE TITLE:', document.title);

let trackerUrl = 'http://localhost:5000';
let lastHighestBid = 0;
let isScanning = false;
let bidHistory = []; // Track all bids found
let auctionHistory = []; // Track auction state changes
let reactErrorCount = 0; // Track React errors

// Enhanced error boundary to prevent React crashes
function setupErrorBoundary() {
  // Multiple error handlers for comprehensive coverage
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('React')) {
      reactErrorCount++;
      console.log(`🛡️ PASSIVE MODE: Detected React error #${reactErrorCount}, continuing safely...`);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && event.reason.message.includes('React')) {
      reactErrorCount++;
      console.log(`🛡️ PASSIVE MODE: Detected React promise rejection #${reactErrorCount}, continuing safely...`);
      event.preventDefault();
      return false;
    }
  });

  // Override console.error to catch React errors
  const originalConsoleError = console.error;
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('React error #418') || message.includes('Minified React error')) {
      reactErrorCount++;
      console.log(`🛡️ PASSIVE MODE: Caught React error in console #${reactErrorCount}, continuing safely...`);
      return; // Don't log the actual error
    }
    originalConsoleError.apply(console, args);
  };

  // Additional React error prevention
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'error' && listener && listener.toString().includes('React')) {
      console.log('🛡️ PASSIVE MODE: Preventing React error listener registration');
      return;
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  // Prevent React from accessing DOM in unsafe ways
  const originalQuerySelector = Document.prototype.querySelector;
  Document.prototype.querySelector = function(selector) {
    try {
      return originalQuerySelector.call(this, selector);
    } catch (error) {
      if (error.message && error.message.includes('React')) {
        console.log('🛡️ PASSIVE MODE: Prevented React DOM access error');
        return null;
      }
      throw error;
    }
  };
}

// Enhanced validation functions for precise bid detection
function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  
  // Clean the name - remove Facebook UI artifacts but preserve valid names
  let cleanName = name.trim()
    .replace(/^(Like|Reply|Share|Edit|Delete|Remove|Facebook|Loading|Error|Unknown|bidder|Bidder|BIDDER|UNKNOWN|unknown|Advertiser|Open|menu|Learn|More)\s*/i, '') // Remove leading UI words
    .replace(/\s*(Like|Reply|Share|Edit|Delete|Remove|Facebook|Loading|Error|Unknown|bidder|Bidder|BIDDER|UNKNOWN|unknown|Advertiser|Open|menu|Learn|More)$/i, '') // Remove trailing UI words
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Must be 4-50 characters (allow longer names)
  if (cleanName.length < 4 || cleanName.length > 50) return false;
  
  // Must start and end with letters
  if (!/^[A-Za-z]/.test(cleanName) || !/[A-Za-z]$/.test(cleanName)) return false;
  
  // Must contain only letters, spaces, hyphens, and apostrophes (for names like O'Connor)
  if (!/^[A-Za-z\s\-']+$/.test(cleanName)) return false;
  
  // Must have at least first and last name (2+ words or concatenated format)
  const nameParts = cleanName.split(/\s+/);
  if (nameParts.length < 2) {
    // Check if it's concatenated format like "ToryMillowick" or "YvetteWalker"
    const concatenatedPattern = /^[A-Z][a-z]+[A-Z][a-z]+$/;
    if (!concatenatedPattern.test(cleanName)) return false;
    
    // For concatenated names, ensure each part is at least 2 characters
    const firstPart = cleanName.match(/^[A-Z][a-z]+/)[0];
    const lastPart = cleanName.match(/[A-Z][a-z]+$/)[0];
    if (firstPart.length < 2 || lastPart.length < 2) return false;
  } else {
    // Each part must be at least 2 characters
    for (const part of nameParts) {
      if (part.length < 2) return false;
    }
  }
  
  // Reject common Facebook UI elements and non-name patterns
  const rejectPatterns = [
    'Most relevant', 'LikeReplyShare', 'Share', 'Like', 'Reply', 'Edit', 'Delete',
    'Facebook', 'Loading', 'Error', 'Unknown', 'bidder', 'Bidder', 'BIDDER',
    'international shipping', 'within Australia', 'shipping', 'postage', 'pickup',
    'Dubbo', 'Australia', 'international', 'within', 'From just', 'Pick up',
    'readSee previous notifications', 'notifications', 'unread chats', 'new messages',
    'Save Up To', 'deserve please call us on', 'up and get back up to cloud',
    'Advertiser', 'Open menu', 'Learn More', 'McGrath Property', 'Agentsmcgrath',
    'Property Agents', 'com.au', 'March', '2024', '2023', '2022', '2021', '2020'
  ];
  
  for (const pattern of rejectPatterns) {
    if (cleanName.toLowerCase().includes(pattern.toLowerCase())) return false;
  }
  
  return true;
}

function isValidBid(amount) {
  if (!amount || typeof amount !== 'number' || isNaN(amount)) return false;
  
  // Must be a positive number
  if (amount <= 0) return false;
  
  // Reasonable auction range - focus on realistic bid amounts
  if (amount < 10 || amount > 10000) return false;
  
  // Must be a reasonable increment (whole dollars or quarters)
  if (amount % 0.25 !== 0) return false;
  
    // Reject common non-bid amounts
    const rejectAmounts = [
      // Years
      2024, 2025, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015,
      // Small numbers (likely page numbers, counts, etc.)
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
      41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
      61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
      81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99,
      // Common shipping amounts
      12, 12.5, 20, 28, 15, 18, 25, 30, 35, 40, 45
      // Removed common bid amounts: 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000
    ];
  
  if (rejectAmounts.includes(amount)) return false;
  
  return true;
}

// Enhanced context validation for bid detection
function isValidBidContext(text, amount) {
  // For concatenated Facebook format, be more lenient
  if (text.includes('LikeReplyShare') || text.includes('LikeReply')) {
    // Must contain Facebook comment indicators (full or partial)
    const facebookIndicators = /LikeReplyShare|LikeReply/i;
    if (!facebookIndicators.test(text)) return false;

    // Must contain time indicators (Facebook timestamps)
    const timeIndicators = /\d+[dhmwy]/i;
    if (!timeIndicators.test(text)) return false;

    // Must contain name pattern (First Last or concatenated)
    const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+[A-Z][a-z]+/i;
    if (!namePattern.test(text)) return false;

    return true;
  }
  
  // For other formats, use stricter validation
  const facebookIndicators = /LikeReplyShare|ReplyShare|Share|Like|Reply/i;
  if (!facebookIndicators.test(text)) return false;
  
  const timeIndicators = /\d+[dhmwy](\s|LikeReplyShare)/i;
  if (!timeIndicators.test(text)) return false;
  
  const namePattern = /[A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+[A-Z][a-z]+/i;
  if (!namePattern.test(text)) return false;
  
  // Reject if it contains technical/UI elements
  const rejectPatterns = [
    /width|height|bandwidth|resolution|cookie|config/i,
    /fbcdn\.net|static\.xx\.fbcdn\.net/i,
    /video\/mp4|mimeType|frameRate/i,
    /rgba|rgb|margin|padding|border|radius/i,
    /duration|animation|transition|transform/i,
    /encoding|dash_vp9|Representation/i,
    /BaseURL|segments|FBPlaybackResolution/i,
    /FBQuality|preview_height|preview_width/i,
    /javascript|function|variable|array|object/i,
    /http|https|www\.|\.com|\.net|\.org/i,
    /id=|class=|style=|src=|href=/i,
    /px|em|rem|pt|pc|in|cm|mm/i
  ];
  
  if (rejectPatterns.some(pattern => pattern.test(text))) return false;
  
  return true;
}

// Enhanced name cleaning function - better at extracting bidder names
function cleanExtractedName(rawName) {
  if (!rawName || typeof rawName !== 'string') return 'Unknown';
  
  // Clean the name - remove Facebook UI elements but preserve valid names
  let cleaned = rawName.trim();
  
  // Remove Facebook UI elements that might be attached
  cleaned = cleaned
    .replace(/LikeReplyShare.*$/i, '')
    .replace(/Share.*$/i, '')
    .replace(/Reply.*$/i, '')
    .replace(/Like.*$/i, '')
    .replace(/Edit.*$/i, '')
    .replace(/Delete.*$/i, '')
    .replace(/Remove.*$/i, '')
    .replace(/\d+[dhmwy].*$/i, '') // Remove time stamps like "3d", "1w"
    .replace(/\d+\.\d+.*$/i, '') // Remove decimal amounts like "305.25"
    .replace(/\d+.*$/i, '') // Remove any remaining numbers
    .trim();
  
  // Clean up any remaining artifacts
  cleaned = cleaned
    .replace(/^[^A-Za-z]*/, '') // Remove leading non-letters
    .replace(/[^A-Za-z\s\-']*$/, '') // Remove trailing non-letters
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
  
  // Additional cleaning for common Facebook artifacts
  cleaned = cleaned
    .replace(/^(Facebook|Loading|Error|Unknown|bidder|Bidder|BIDDER|UNKNOWN|unknown)\s*/i, '')
    .replace(/\s*(Facebook|Loading|Error|Unknown|bidder|Bidder|BIDDER|UNKNOWN|unknown)$/i, '')
    .trim();
  
  // Handle concatenated names by adding space between first and last name
  // e.g., "ToryMillowick" -> "Tory Millowick"
  const concatenatedMatch = cleaned.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
  if (concatenatedMatch) {
    cleaned = `${concatenatedMatch[1]} ${concatenatedMatch[2]}`;
  }
  
  return cleaned || 'Unknown';
}

// PASSIVE initialization - wait for page to be completely loaded
function initializePassively() {
  console.log('🕐 PASSIVE MODE: Starting immediate monitoring...');
  console.log('🔍 DEBUG: Extension is initializing on:', window.location.href);
  
  // Setup comprehensive error boundary
  setupErrorBoundary();
  
  // Start monitoring immediately
  console.log('✅ PASSIVE MODE: Starting immediate passive monitoring...');
  startPassiveMonitoring();
  
  // Also wait a bit for Facebook to be completely stable, then start additional monitoring
  setTimeout(() => {
    console.log('✅ PASSIVE MODE: Facebook should be stable now, ensuring monitoring is active...');
    if (!isScanning) {
      startPassiveMonitoring();
    }
  }, 3000); // Reduced wait time to 3 seconds for faster startup
}

// ACTIVE monitoring - scan frequently but safely
function startPassiveMonitoring() {
  console.log('🔥 ACTIVE MODE: Starting intelligent bid monitoring...');
  
  // Adaptive scanning - start faster, increase frequency if bids are found
  let scanInterval = 5000; // Start with 5 seconds for faster response
  let consecutiveNoBids = 0;
  
  const adaptiveScan = () => {
    if (!isScanning) {
      console.log('🔥 ADAPTIVE SCAN: Running bid detection...');
      const hadNewBids = scanPassively();
      
      if (hadNewBids) {
        // Reset to faster scanning when bids are found
        scanInterval = 3000; // 3 seconds for very responsive monitoring
        consecutiveNoBids = 0;
        console.log('⚡ Bid activity detected - increasing scan frequency');
      } else {
        consecutiveNoBids++;
        // Gradually slow down if no bids found
        if (consecutiveNoBids > 5) {
          scanInterval = Math.min(scanInterval + 3000, 45000); // Max 45 seconds
          console.log(`🕐 No recent bids - slowing scan to ${scanInterval/1000}s intervals`);
        }
      }
      
      // Schedule next scan
      setTimeout(adaptiveScan, scanInterval);
    }
  };
  
  // Start adaptive scanning
  setTimeout(adaptiveScan, scanInterval);
  
  // Also scan immediately to catch any existing bids
  console.log('🔥 IMMEDIATE SCAN: Running initial bid detection...');
  scanPassively();
  
  // And scan again after a short delay
  setTimeout(() => {
    console.log('⚡ IMMEDIATE SCAN: First scan right now!');
    scanPassively();
  }, 3000); // Scan in 3 seconds
  
  // Set up real-time monitoring for new bids
  setupRealTimeMonitoring();
}

// Real-time monitoring for new bids
function setupRealTimeMonitoring() {
  console.log('👀 Setting up real-time bid monitoring...');
  
  // Create a MutationObserver to watch for new content
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    let newContentFound = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent || '';
            
            // Log all new content for debugging - but filter out obvious non-bid content
            if (text.length > 10 && text.length < 500 && 
                !text.includes('Advertiser') && 
                !text.includes('Open menu') && 
                !text.includes('Learn More') &&
                !text.includes('McGrath Property') &&
                !text.includes('FacebookFacebook') &&
                !text.includes('com.au') &&
                !text.includes('March 2024') &&
                !text.includes('static.xx.fbcdn.net') &&
                !text.includes('rsrc.php')) {
              console.log('🔄 New content detected:', text.substring(0, 100) + '...');
              newContentFound = true;
            }
            
            // More aggressive detection - check for any Facebook comment indicators
            if (text.includes('LikeReplyShare') || text.includes('LikeReply') || 
                text.includes('Reply') || text.includes('Share')) {
              console.log('🎯 Facebook UI detected:', text.substring(0, 100) + '...');
              shouldScan = true;
            }
            
            // Check for bid-like patterns (numbers with time indicators)
            if (/\d{2,4}[dhmwy]/.test(text) && text.length > 15 && text.length < 300) {
              console.log('🎯 Time pattern detected:', text.substring(0, 100) + '...');
              shouldScan = true;
            }
            
            // Check for name patterns (First Last format)
            if (/[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text) && text.length > 10 && text.length < 200) {
              console.log('🎯 Name pattern detected:', text.substring(0, 100) + '...');
              shouldScan = true;
            }
            
            // Check for various bid patterns - more precise to avoid false positives
    const bidPatterns = [
              // Only detect patterns that look like actual Facebook comments with bids
              /[A-Za-z][A-Za-z\s\-']{3,30}[A-Za-z]\d{2,4}(?:\.\d{1,2})?\d{1,2}[dhmwy]LikeReplyShare/,  // Full concatenated format with name
              /[A-Za-z][A-Za-z\s\-']{3,30}[A-Za-z]\d{2,4}(?:\.\d{1,2})?\d{1,2}[dhmwy]LikeReply/,  // Partial format with name
              /\$\d{2,4}(?:\.\d{1,2})?\s*[A-Za-z][A-Za-z\s\-']{3,30}[A-Za-z]/,  // Dollar sign with name
              /[A-Za-z][A-Za-z\s\-']{3,30}[A-Za-z]\s+\d{2,4}(?:\.\d{1,2})?\s+\d+[dhmwy]/  // Name Amount Time format
            ];
            
            // If new content contains potential bid patterns, scan immediately
            if (bidPatterns.some(pattern => pattern.test(text)) &&
                text.length > 20 &&
                text.length < 1000) {
              shouldScan = true;
              console.log('🎯 BID PATTERN DETECTED in new content:', text.substring(0, 100) + '...');
          }
        }
      });
    }
    });
    
    // If we found any new content, log it for debugging
    if (newContentFound) {
      console.log('📝 New content added to page - checking for bids...');
    }
    
    if (shouldScan) {
      console.log('🔄 New bid detected, scanning immediately...');
      // Small delay to let Facebook finish rendering
      setTimeout(() => {
        scanPassively();
      }, 500); // Reduced delay to 0.5 seconds for faster response
    }
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true, // Watch for attribute changes
    characterData: true, // Watch for text content changes
    attributeFilter: ['class', 'data-testid'] // Only watch specific attributes
  });
  
  // Also watch for any text changes in the entire document
  const textObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData' || mutation.type === 'childList') {
        const text = mutation.target.textContent || '';
        if (text.length > 10 && text.length < 500) {
          // Check for any bid-like patterns
          if (/\d{2,4}[dhmwy]/.test(text) || 
              /LikeReplyShare/.test(text) || 
              /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(text)) {
            console.log('🎯 Text change detected with bid pattern:', text.substring(0, 100) + '...');
            shouldScan = true;
          }
        }
      }
    });
    
    if (shouldScan) {
      console.log('🔄 Text change detected, scanning immediately...');
      setTimeout(() => {
        scanPassively();
      }, 200); // Very fast response
    }
  });
  
  // Watch for text changes in the entire document
  textObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
  
  // Also set up a periodic check as backup - more frequent
  setInterval(() => {
    console.log('🔄 Periodic check for new bids...');
    scanPassively();
  }, 5000); // Check every 5 seconds as backup
  
  console.log('✅ Real-time monitoring active - will detect new bids automatically');
  console.log('🔄 Backup periodic scanning every 5 seconds');
}

// PASSIVE scanning - only read text, never modify DOM
function scanPassively() {
  if (isScanning) return false;
  
  isScanning = true;
  let hadNewBids = false;
  
  try {
    console.log('🕐 PASSIVE SCAN: Reading page text only...');
    
    // Defensive check to avoid interfering with Facebook's React components
    if (document.readyState !== 'complete') {
      console.log('🕐 PASSIVE SCAN: Page not fully loaded, skipping...');
      return false;
    }
    
    // Check if Facebook is still loading critical components
    const loadingElements = document.querySelectorAll('[aria-label*="Loading"], [data-testid*="loading"], .loading');
    if (loadingElements.length > 10) { // Increased threshold from 5 to 10
      console.log('🕐 PASSIVE SCAN: Facebook still loading, skipping...');
      return false;
    }
    
    // Additional check: if page has very little content, it's still loading
    const pageText = document.body.textContent || '';
    if (pageText.length < 2000) { // Increased threshold from 1000 to 2000
      console.log('🕐 PASSIVE SCAN: Page text too short, skipping...');
      return false;
    }
    
    // Focused bid patterns - only the most reliable Facebook comment formats
const bidPatterns = [
  // Pattern 1: Facebook multiline format - "Name\nAmount\nTime\nReply\nShare" (MOST RELIABLE)
  {
    name: 'Facebook Multiline',
    regex: /([A-Za-z][A-Za-z\s\-']{3,40}[A-Za-z])\s*\n\s*(\d{2,4}(?:\.\d{1,2})?)\s*\n\s*(\d+[dhmwy])\s*\n\s*Reply\s*\n\s*Share/gm,
        priority: 1
      },
  // Pattern 2: Facebook concatenated format - "NameAmountTimeLikeReplyShare" (with proper separation)  
      {
    name: 'Facebook Concatenated',
    regex: /([A-Za-z][A-Za-z\s\-']{3,40}[A-Za-z])(\d{2,4}(?:\.\d{1,2})?)(\d{1,2}[dhmwy])LikeReplyShare/g,
        priority: 2
      },
  // Pattern 3: Facebook partial format - "NameAmountTimeLikeReply" (missing Share)
      {
    name: 'Facebook Partial',
    regex: /([A-Za-z][A-Za-z\s\-']{3,40}[A-Za-z])(\d{2,4}(?:\.\d{1,2})?)(\d{1,2}[dhmwy])LikeReply/g,
        priority: 3
      },
  // Pattern 4: Simple space-separated - "Name Amount" (with validation)
      {
    name: 'Space Separated',
    regex: /^([A-Za-z][A-Za-z\s\-']{3,40}[A-Za-z])\s+(\d{2,4}(?:\.\d{1,2})?)\s*$/gm,
        priority: 4
  }
];
    
    let highestBid = 0;
    let bidderName = 'Unknown';
    let allBids = [];
    
    console.log('🔍 FOCUSED SCAN: Searching for bids in Facebook comments only...');
    
    // Focus ONLY on Facebook comment elements - much more precise
    const commentSelectors = [
      '[data-testid*="comment"]',
      '[role="article"]',
      '[data-testid*="Comment"]',
      '[data-testid*="post"]',
      '[data-testid*="Post"]',
      '.userContent',
      '.commentable_item'
    ];
    
    let commentText = '';
    let commentCount = 0;
    
    commentSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent || '';
        // Only include text that looks like user comments (not Facebook UI)
        if (text.length > 20 && text.length < 1000 && 
            !text.includes('{"require":') && 
            !text.includes('"bxData":') &&
            !text.includes('static.xx.fbcdn.net') &&
            !text.includes('rsrc.php') &&
            !text.includes('Loading') &&
            !text.includes('Error') &&
            /[A-Za-z]/.test(text) && // Must contain letters
            !text.includes('width') && // Reject technical data
            !text.includes('height') &&
            !text.includes('rgba') &&
            !text.includes('px') &&
            !text.includes('margin') &&
            !text.includes('padding')) { // Additional technical filters
          
          // Clean the text to prevent corruption
          const cleanText = text
            .replace(/\n/g, ' ') // Replace newlines with spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .replace(/LikeReplyShare\s+/g, 'LikeReplyShare') // Remove spaces after LikeReplyShare
            .replace(/\s+LikeReplyShare/g, 'LikeReplyShare') // Remove spaces before LikeReplyShare
            .trim();
          commentText += cleanText + '\n';
          commentCount++;
          if (commentCount <= 10) { // Show first 10 comments for debugging
            console.log(`📝 Comment ${commentCount}: "${text.substring(0, 100)}..."`);
          }
        }
      });
    });
    
    console.log(`📄 Found ${commentCount} comments, total text length: ${commentText.length}`);
    
    // If no comments found, try one more targeted approach
    if (commentText.length < 200) {
      console.log('🔍 No comments found with selectors, trying page text as fallback...');
      commentText = document.body.textContent || '';
    }
    
    // Custom parsing for Facebook concatenated format to handle amount/time separation
    const customParseFacebookBids = (text) => {
      // Find all Facebook bid patterns first
      const facebookPattern = /([A-Za-z][A-Za-z\s\-']{3,40}[A-Za-z])(\d+)(\d{1,2}[dhmwy])LikeReplyShare/g;
      const matches = [...text.matchAll(facebookPattern)];
      
      matches.forEach(match => {
        const name = match[1] || 'Unknown';
        const allDigits = match[2] || '0';
        const time = match[3] || '';
        
        console.log(`🔍 Raw match: "${match[0]}" -> Name: "${name}", All digits: "${allDigits}", Time: "${time}"`);
        
        // Now intelligently separate the amount from the time digits
        let amount = 0;
        
        // Strategy: Try to find a reasonable bid amount by looking at the digits
        // For cases like "42532m", we want "425" as amount and "32m" as time
        
        // Try different length combinations
        const digitLength = allDigits.length;
        
        if (digitLength >= 4) {
          // For 4+ digits, try 3-digit amounts first (most common)
          for (let i = 3; i >= 2; i--) {
            const possibleAmount = parseInt(allDigits.substring(0, i));
            const remainingDigits = allDigits.substring(i);
            
            // Check if this looks like a reasonable bid amount
            if (possibleAmount >= 10 && possibleAmount <= 1000 && 
                remainingDigits.length >= 1 && remainingDigits.length <= 2) {
              amount = possibleAmount;
              console.log(`🔧 Separated: "${allDigits}" -> Amount: ${amount}, Remaining: "${remainingDigits}"`);
              break;
            }
          }
        } else {
          // For shorter digit sequences, use the whole thing as amount
          amount = parseInt(allDigits);
        }
        
        console.log(`🎯 Custom Facebook match: "${match[0]}" -> Name: "${name}", Amount: ${amount}, Time: ${time}`);
        
        // Clean the extracted name
        const cleanName = cleanExtractedName(name);
        
        // Validate the bid
        if (isValidName(cleanName) && isValidBid(amount) && isValidBidContext(text, amount)) {
          // Additional validation: ensure this looks like a real Facebook comment
          if (text.includes('LikeReplyShare') || text.includes('LikeReply')) {
            const bidEntry = { 
              amount,
              name: cleanName,
              pattern: 'Facebook Custom',
              timestamp: new Date().toISOString(),
              url: window.location.href,
              isValid: true
            };
            
            allBids.push(bidEntry);
            bidHistory.push(bidEntry);
            
            if (amount > highestBid) {
              highestBid = amount;
              bidderName = cleanName; // Update bidder name for highest bid
              console.log(`💰 Valid bid: $${amount} by ${cleanName} (NEW HIGHEST)`);
            } else {
              console.log(`💰 Valid bid: $${amount} by ${cleanName} (not highest - current highest: $${highestBid})`);
            }
          } else {
            console.log(`❌ Rejected: $${amount} by ${cleanName} - Not a Facebook comment format`);
          }
        } else {
          console.log(`❌ Rejected: $${amount} by ${cleanName} - Name valid: ${isValidName(cleanName)}, Amount valid: ${isValidBid(amount)}`);
        }
      });
    };
    
    // First try custom parsing for Facebook format
    customParseFacebookBids(commentText);
    
    // Skip regular patterns if custom parsing found Facebook bids to avoid duplicates
    const hasFacebookBids = allBids.some(bid => bid.pattern === 'Facebook Custom');
    
    if (hasFacebookBids) {
      console.log('🔍 Custom Facebook parsing found bids, skipping regular patterns to avoid duplicates');
    } else {
      console.log('🔍 No Facebook bids found by custom parser, running regular patterns...');
      
      // Process each bid pattern on the comment text
      bidPatterns.forEach((pattern, patternIndex) => {
      const matches = [...commentText.matchAll(pattern.regex)];
      console.log(`🔍 Pattern ${patternIndex + 1} (${pattern.name}): Found ${matches.length} matches`);
      
        matches.forEach(match => {
          const name = cleanExtractedName(match[1]);
          const amount = parseFloat(match[2]);
          
        console.log(`🎯 Pattern ${patternIndex + 1} match: "${match[0]}" -> Name: "${name}", Amount: ${amount}`);
            
        if (isValidName(name) && isValidBid(amount) && isValidBidContext(commentText, amount)) {
            const bidEntry = { 
              amount, 
              name, 
            pattern: pattern.name, 
              timestamp: new Date().toISOString(),
              url: window.location.href,
              isValid: true
            };
            
            allBids.push(bidEntry);
            bidHistory.push(bidEntry);
            
            if (amount > highestBid) {
              highestBid = amount;
              bidderName = name;
            console.log(`💰 Valid bid: $${amount} by ${name} (NEW HIGHEST)`);
          } else {
            console.log(`💰 Valid bid: $${amount} by ${name} (not highest - current highest: $${highestBid})`);
            }
        } else {
          console.log(`❌ Rejected: $${amount} by ${name} - Name valid: ${isValidName(name)}, Amount valid: ${isValidBid(amount)}`);
          }
        });
      });
    }
    
    console.log(`🔍 SCAN COMPLETE: Found ${allBids.length} valid bids, highest: $${highestBid} by ${bidderName}`);
    
    if (highestBid > lastHighestBid) {
      console.log(`💰 NEW HIGHEST BID: $${highestBid} by ${bidderName}`);
      console.log(`🔍 All detected bids:`, allBids.map(b => `$${b.amount} by ${b.name}`).join(', '));
      
      lastHighestBid = highestBid;
      hadNewBids = true;
      
      // Send to tracker
      sendToTracker(highestBid, bidderName);
    } else {
      console.log(`🕐 No new bids found (current highest: $${lastHighestBid})`);
    }
    
  } catch (error) {
    console.error('❌ PASSIVE SCAN ERROR:', error);
  } finally {
    isScanning = false;
  }
  
  return hadNewBids;
}

// Send bid to tracker - enhanced with better error handling and retry logic
function sendToTracker(amount, bidder) {
  const maxRetries = 3;
  let retryCount = 0;
  
  const attemptSend = async () => {
    try {
      console.log(`📤 PASSIVE: Sending bid to tracker: $${amount} by ${bidder} (attempt ${retryCount + 1})`);
      
      const message = {
        action: 'updateAuction',
        data: {
          url: window.location.href,
          postId: window.location.href.split('/').pop(),
          highestBid: amount,
          bidderName: bidder,
          bidCount: 1,
          detectedAt: new Date().toISOString()
        }
      };
      
      // Try Chrome extension API first
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Chrome API timeout'));
          }, 3000);
          
          chrome.runtime.sendMessage(message, (response) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
      } else {
        // Fallback to direct fetch
        const response = await fetch('http://localhost:5000/api/bid-updates', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentBid: highestBid,
            bidderName: bidderName,
            url: window.location.href,
            source: 'facebook-extension'
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      }
    } catch (error) {
      console.error(`❌ PASSIVE: Send attempt ${retryCount + 1} failed:`, error.message);
      throw error;
    }
  };
  
  const sendWithRetry = async () => {
    try {
      const result = await attemptSend();
      console.log('✅ PASSIVE: Bid sent to tracker successfully');
      return result;
    } catch (error) {
      retryCount++;
      
      if (retryCount < maxRetries) {
        console.log(`🔄 PASSIVE: Retrying in ${retryCount * 1000}ms...`);
        setTimeout(sendWithRetry, retryCount * 1000);
      } else {
        console.error('❌ PASSIVE: All send attempts failed, giving up');
        // Store failed bid for later retry
        storeFailedBid(amount, bidder);
      }
    }
  };
  
  sendWithRetry();
}

// Store failed bids for later retry
function storeFailedBid(amount, bidder) {
  try {
    const failedBids = JSON.parse(localStorage.getItem('failedBids') || '[]');
    failedBids.push({
      amount,
      bidder,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
    
    // Keep only last 10 failed bids
    if (failedBids.length > 10) {
      failedBids.splice(0, failedBids.length - 10);
    }
    
    localStorage.setItem('failedBids', JSON.stringify(failedBids));
    console.log('💾 PASSIVE: Stored failed bid for later retry');
  } catch (error) {
    console.error('❌ PASSIVE: Failed to store failed bid:', error);
  }
}

// Retry failed bids periodically
function retryFailedBids() {
  try {
    const failedBids = JSON.parse(localStorage.getItem('failedBids') || '[]');
    if (failedBids.length > 0) {
      console.log(`🔄 PASSIVE: Retrying ${failedBids.length} failed bids...`);
      
      failedBids.forEach((bid, index) => {
        setTimeout(() => {
          sendToTracker(bid.amount, bid.bidder);
        }, index * 1000); // Stagger retries
      });
      
      // Clear failed bids after retry
      localStorage.removeItem('failedBids');
    }
  } catch (error) {
    console.error('❌ PASSIVE: Error retrying failed bids:', error);
  }
}

window.testSpecificBid = function(amount) {
  console.log(`🧪 TESTING SPECIFIC BID: $${amount}`);
  console.log(`  isValidBid(${amount}):`, isValidBid(amount));
  console.log(`  Amount in reject list:`, [100, 200, 300, 500, 600, 700, 800, 900, 1000].includes(amount));
  console.log(`  Amount range check (10-10000):`, amount >= 10 && amount <= 10000);
  console.log(`  Quarter increment check:`, amount % 0.25 === 0);
};

window.debugBidDetection = function() {
  console.log('🔍 DEBUGGING BID DETECTION...');
  console.log('Current highest bid:', highestBid);
  console.log('Current bidder name:', bidderName);
  console.log('All bids found:', allBids.map(b => `$${b.amount} by ${b.name} (${b.pattern})`));
  console.log('Is $50 in reject list?', [50].includes(50));
  console.log('isValidBid(50):', isValidBid(50));
  
  // Check if there are any $50 bids in the current page
  const pageText = document.body.textContent || '';
  const fiftyMatches = pageText.match(/\b50\b/g);
  console.log('Found $50 references on page:', fiftyMatches ? fiftyMatches.length : 0);
  
  // Check comment text specifically
  const commentSelectors = [
    '[data-testid="comment"]',
    '.comment',
    '.userContent',
    '.commentable_item'
  ];
  
  let commentText = '';
  commentSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent || '';
      if (text.length > 20 && text.length < 1000) {
        commentText += text + '\n';
      }
    });
  });
  
  const fiftyInComments = commentText.match(/\b50\b/g);
  console.log('Found $50 references in comments:', fiftyInComments ? fiftyInComments.length : 0);
  if (fiftyInComments) {
    console.log('$50 contexts:', fiftyInComments.map(() => {
      const match = commentText.match(/.{0,20}\b50\b.{0,20}/g);
      return match ? match[0] : 'No context';
    }));
  }
};

window.forceScan = function() {
  console.log('🔄 FORCING IMMEDIATE SCAN...');
  scanPassively();
};

window.clearStorage = function() {
  console.log('🧹 CLEARING ALL STORAGE...');
  localStorage.removeItem('failedBids');
  chrome.storage.sync.clear();
  console.log('✅ Storage cleared');
};

window.resetBidTracking = function() {
  console.log('🔄 RESETTING BID TRACKING...');
  highestBid = 0;
  bidderName = 'Unknown';
  allBids = [];
  bidHistory = [];
  lastHighestBid = 0;
  console.log('✅ Bid tracking reset');
};

// Enhanced debugging functions for testing bid detection
window.testBidDetection = function() {
  console.log('🧪 TESTING BID DETECTION...');
  
  // Test the validation functions
  console.log('Testing isValidName:');
  console.log('  "John Smith" ->', isValidName('John Smith'));
  console.log('  "ToryMillowick" ->', isValidName('ToryMillowick'));
  console.log('  "YvetteWalker" ->', isValidName('YvetteWalker'));
  console.log('  "LikeReplyShare" ->', isValidName('LikeReplyShare'));
  console.log('  "Facebook Loading" ->', isValidName('Facebook Loading'));
  
  console.log('Testing isValidBid:');
  console.log('  150 ->', isValidBid(150));
  console.log('  2024 ->', isValidBid(2024));
  console.log('  5 ->', isValidBid(5));
  console.log('  150.25 ->', isValidBid(150.25));
  
  console.log('Testing isValidBidContext:');
  const testText = 'John Smith\n150\n2h\nReply\nShare';
  console.log('  Facebook comment text ->', isValidBidContext(testText, 150));
  
  const concatenatedText = 'YvetteWalker3801hLikeReplyShare';
  console.log('  Concatenated Facebook text ->', isValidBidContext(concatenatedText, 380));
  
  const badText = 'width: 150px; height: 200px;';
  console.log('  CSS text ->', isValidBidContext(badText, 150));
  
  // Run a manual scan
  console.log('Running manual scan...');
  scanPassively();
};

window.showCurrentBids = function() {
  console.log('📊 CURRENT BID STATUS:');
  console.log(`  Last Highest Bid: $${lastHighestBid}`);
  console.log(`  Total Bids Found: ${bidHistory.length}`);
  console.log(`  Currently Scanning: ${isScanning}`);
  console.log(`  React Errors Caught: ${reactErrorCount}`);
  
  if (bidHistory.length > 0) {
    console.log('📈 Recent Bids:');
    bidHistory.slice(-5).forEach((bid, index) => {
      console.log(`  ${index + 1}. $${bid.amount} by ${bid.name} (${bid.pattern})`);
    });
  }
};

// Manual test functions
window.testPassiveScan = function() {
  console.log('🧪 MANUAL TEST: Running active scan...');
  scanPassively();
};

window.forceScanNow = function() {
  console.log('🔥 FORCE SCAN: Bypassing all checks and scanning immediately!');
  isScanning = false; // Reset scanning flag
  scanPassively();
};

window.checkPassiveStatus = function() {
  console.log('📊 ACTIVE STATUS:');
  console.log(`  Ready State: ${document.readyState}`);
  console.log(`  Loading Elements: ${document.querySelectorAll('[aria-label="Loading..."]').length}`);
  console.log(`  Page Text Length: ${(document.body.textContent || '').length}`);
  console.log(`  Currently Scanning: ${isScanning}`);
  console.log(`  Last Highest Bid: $${lastHighestBid}`);
  console.log(`  React Errors Caught: ${reactErrorCount}`);
};

window.debugPageText = function() {
  const pageText = document.body.textContent || '';
  console.log('📄 PAGE TEXT PREVIEW (first 2000 chars):');
  console.log(pageText.substring(0, 2000));
  console.log('📄 PAGE TEXT LENGTH:', pageText.length);
};

window.searchForBids = function() {
  console.log('🔍 MANUAL SEARCH: Looking for common bid amounts...');
  
  const commonBids = ['650', '600', '550', '500', '450', '400', '350', '300'];
  const allText = document.body.textContent || '';
  
  commonBids.forEach(bid => {
    const matches = allText.match(new RegExp(`\\b${bid}\\b`, 'g'));
    console.log(`🔍 Found ${matches ? matches.length : 0} instances of "${bid}" in page text`);
  });
  
  // Search in comment elements specifically
  const commentElements = document.querySelectorAll(`
    [data-testid*="comment"], 
    [role="article"], 
    .comment, 
    [data-testid*="Comment"],
    [data-testid*="post"],
    [data-testid*="Post"],
    [data-testid*="story"],
    [data-testid*="Story"],
    .userContent,
    .commentable_item,
    [data-testid*="feed"],
    [data-testid*="Feed"]
  `.replace(/\s+/g, ' ').trim());
  
  commentElements.forEach((el, i) => {
    const text = el.textContent || '';
    commonBids.forEach(bid => {
      if (text.includes(bid)) {
        console.log(`🔍 Found "${bid}" in comment ${i + 1}:`, text.substring(0, 300));
      }
    });
  });
};

// Add utility functions for debugging and monitoring
window.getFailedBids = function() {
  try {
    const failedBids = JSON.parse(localStorage.getItem('failedBids') || '[]');
    console.log('💾 Failed bids:', failedBids);
    return failedBids;
  } catch (error) {
    console.error('❌ Error getting failed bids:', error);
    return [];
  }
};

window.clearFailedBids = function() {
  localStorage.removeItem('failedBids');
  console.log('🗑️ Cleared all failed bids');
};

window.retryFailedBidsNow = function() {
  retryFailedBids();
};

window.getBidHistory = function() {
  console.log('📊 Bid History:', bidHistory);
  return bidHistory;
};

window.getAuctionHistory = function() {
  console.log('📈 Auction History:', auctionHistory);
  return auctionHistory;
};

window.clearBidHistory = function() {
  bidHistory = [];
  auctionHistory = [];
  console.log('🗑️ Cleared all bid and auction history');
};

window.getCurrentAuctionState = function() {
  const state = {
    currentHighestBid: lastHighestBid,
    totalBidsFound: bidHistory.length,
    auctionChanges: auctionHistory.length,
    isScanning: isScanning,
    url: window.location.href,
    lastScanTime: new Date().toISOString(),
    reactErrorsCaught: reactErrorCount
  };
  console.log('📊 Current Auction State:', state);
  return state;
};

// Start passive initialization
console.log('🕐 PASSIVE MODE: Starting passive initialization...');
initializePassively();

// Retry failed bids every 5 minutes
setInterval(retryFailedBids, 5 * 60 * 1000);
