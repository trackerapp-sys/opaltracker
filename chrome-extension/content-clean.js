// UNIVERSAL Opal Auction Tracker - Facebook Bid Monitor
console.log('🔥 UNIVERSAL EXTENSION LOADED:', window.location.href);

let lastHighestBid = 0;
let isScanning = false;
let allDetectedBids = new Set(); // Track all bids to avoid duplicates

// UNIVERSAL bid detection - catches ANY monetary amount in comments
function detectBids() {
  if (isScanning) return;
  isScanning = true;
  
  console.log('🔍 UNIVERSAL BID SCANNING...');
  
  // Get ALL text content from the page - we'll filter intelligently
  const allText = document.body.textContent || '';
  console.log(`📄 Total page text: ${allText.length} chars`);
  
  // UNIVERSAL MONETARY AMOUNT DETECTION
  // This regex catches ANY reasonable monetary amount regardless of format
  const universalMoneyPattern = /\b(\d{2,4}(?:\.\d{1,2})?)\b/g;
  
  // Also look for amounts with dollar signs
  const dollarPattern = /\$(\d{2,4}(?:\.\d{1,2})?)/g;
  
  // Special pattern for concatenated format: NameAmountTimeLikeReplyShare
  const concatenatedPattern = /([A-Z][a-z]+ [A-Z][a-z]+)(\d{2,4}(?:\.\d{1,2})?)(\d+[dhmwy]LikeReplyShare)/g;
  
  // Combine both patterns
  const allAmounts = [];
  
  // Find all potential amounts
  let match;
  while ((match = universalMoneyPattern.exec(allText)) !== null) {
    const amount = parseFloat(match[1]);
    const context = getContextAroundMatch(allText, match.index, match[0].length);
    allAmounts.push({ amount, context, fullMatch: match[0] });
  }
  
  // Find dollar amounts
  while ((match = dollarPattern.exec(allText)) !== null) {
    const amount = parseFloat(match[1]);
    const context = getContextAroundMatch(allText, match.index, match[0].length);
    allAmounts.push({ amount, context, fullMatch: match[0] });
  }
  
  // Find concatenated format amounts
  while ((match = concatenatedPattern.exec(allText)) !== null) {
    const name = match[1].trim();
    const amount = parseFloat(match[2]);
    const timeAndUI = match[3];
    const context = getContextAroundMatch(allText, match.index, match[0].length);
    allAmounts.push({ amount, context, fullMatch: match[0], name });
    console.log(`🔍 Concatenated format: "${name}" + $${amount} + "${timeAndUI}"`);
  }
  
  console.log(`🔍 Found ${allAmounts.length} potential monetary amounts`);
  
  // DEBUG: Log all detected amounts to see what's causing false positives
  allAmounts.forEach(({ amount, context, fullMatch }, index) => {
    console.log(`🔍 Amount ${index + 1}: $${amount} from "${fullMatch}"`);
    console.log(`   Context: "${context.substring(0, 150)}..."`);
  });
  
  // INTELLIGENT BID VALIDATION
  const validBids = [];
  
  allAmounts.forEach(({ amount, context, fullMatch, name }) => {
    if (isLikelyBid(amount, context, fullMatch)) {
      const bidKey = `${amount}-${context.substring(0, 50)}`;
      if (!allDetectedBids.has(bidKey)) {
        allDetectedBids.add(bidKey);
        const bidderName = name || extractBidderName(context);
        const position = allText.indexOf(fullMatch);
        validBids.push({ amount, context, fullMatch, bidderName, position });
        console.log(`💰 NEW BID DETECTED: $${amount} by ${bidderName} - Position: ${position} - Context: "${context.substring(0, 100)}..."`);
      }
    }
  });
  
  console.log(`🔍 Valid bids found: ${validBids.length}`);
  
  if (validBids.length > 0) {
    // Sort bids by position in text (most recent first) and then by amount
    validBids.sort((a, b) => {
      // First sort by position in text (later in text = more recent)
      if (a.position !== b.position) {
        return b.position - a.position; // Later position = more recent
      }
      
      // If positions are equal, sort by amount (highest first)
      return b.amount - a.amount;
    });
    
    // Get the most recent bid (first in sorted array)
    const mostRecentBid = validBids[0];
    
    console.log(`🎯 MOST RECENT BID: $${mostRecentBid.amount} by ${mostRecentBid.bidderName}`);
    console.log(`📊 All detected bids (sorted by recency):`, validBids.map(b => `$${b.amount} by ${b.bidderName}`));
    
    // Only update if it's different from last detected bid
    if (mostRecentBid.amount !== lastHighestBid || mostRecentBid.bidderName !== lastBidderName) {
      lastHighestBid = mostRecentBid.amount;
      
      // Send to server
      sendBidUpdate(mostRecentBid.amount, mostRecentBid.bidderName);
    }
  } else {
    console.log('❌ No valid bids found');
  }
  
  isScanning = false;
}

// Get context around a match for analysis
function getContextAroundMatch(text, index, matchLength) {
  const start = Math.max(0, index - 200);
  const end = Math.min(text.length, index + matchLength + 200);
  return text.substring(start, end);
}

// Extract bidder name from context
function extractBidderName(context) {
  // Look for name patterns before the amount
  const namePatterns = [
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+\d{2,4}/,  // "John Smith 380"
    /([A-Z][a-z]+ [A-Z][a-z]+)\s*\$?\d{2,4}/,  // "John Smith $380"
    /([A-Z][a-z]+ [A-Z][a-z]+)\s+\d{2,4}(?:\.\d{1,2})?/,  // "John Smith 380.50"
  ];
  
  for (const pattern of namePatterns) {
    const match = context.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  // Fallback: look for any capitalized words before the amount
  const wordsBeforeAmount = context.split(/\d{2,4}/)[0];
  const nameMatch = wordsBeforeAmount.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
  if (nameMatch) {
    return nameMatch[1];
  }
  
  return 'Unknown Bidder';
}

// INTELLIGENT BID VALIDATION FUNCTION
function isLikelyBid(amount, context, fullMatch) {
  console.log(`🔍 Analyzing: $${amount} - "${context.substring(0, 50)}..."`);
  
  // Basic amount validation - reasonable bid range
  if (amount < 10 || amount > 10000) {
    console.log(`❌ Amount $${amount} outside reasonable range (10-10000)`);
    return false;
  }
  
  // STRICT VALIDATION: Must have Facebook comment structure
  const hasFacebookCommentStructure = /LikeReplyShare|ReplyShare|Share|Like/i.test(context);
  if (!hasFacebookCommentStructure) {
    console.log(`❌ Missing Facebook comment structure (LikeReplyShare)`);
    return false;
  }
  
  // STRICT VALIDATION: Must have time indicator
  const hasTimeIndicator = /\d+[dhmwy]\s/i.test(context);
  if (!hasTimeIndicator) {
    console.log(`❌ Missing time indicator (1h, 2m, 3d, etc.)`);
    return false;
  }
  
  // STRICT VALIDATION: Must have name pattern
  const hasNamePattern = /[A-Z][a-z]+ [A-Z][a-z]+/i.test(context);
  if (!hasNamePattern) {
    console.log(`❌ Missing name pattern (First Last)`);
    return false;
  }
  
  // Check for Facebook internal data patterns (REJECT)
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
    /px|em|rem|pt|pc|in|cm|mm/i,
    /rgb|rgba|hsl|hsla|hex/i
  ];
  
  if (rejectPatterns.some(pattern => pattern.test(context))) {
    console.log(`❌ Matches Facebook internal data pattern`);
    return false;
  }
  
  // Check for bid-related context (ACCEPT)
  const acceptPatterns = [
    /bid|bidding|auction|offer|price|amount/i,
    /dollar|dollars|\$/i,
    /reply|share|like|comment/i,
    /minutes|hours|days|weeks|years/i,
    /m\s|h\s|d\s|w\s|y\s/i,  // time indicators
    /opal|gem|stone|jewelry|ring|necklace/i,
    /carat|ct|gram|g|weight|size|color|clarity/i
  ];
  
  const hasAcceptContext = acceptPatterns.some(pattern => pattern.test(context));
  
  console.log(`🔍 Analysis:`);
  console.log(`  - Has Facebook structure: ${hasFacebookCommentStructure}`);
  console.log(`  - Has time indicator: ${hasTimeIndicator}`);
  console.log(`  - Has name pattern: ${hasNamePattern}`);
  console.log(`  - Has accept context: ${hasAcceptContext}`);
  
  // Scoring system (much stricter)
  let score = 0;
  if (hasFacebookCommentStructure) score += 5;  // Required
  if (hasTimeIndicator) score += 4;  // Required
  if (hasNamePattern) score += 3;  // Required
  if (hasAcceptContext) score += 2;
  
  // Special bonus for amounts in common bid ranges
  if (amount >= 50 && amount <= 2000) score += 1;
  
  console.log(`🔍 Bid likelihood score: ${score}/15`);
  
  // Require minimum score of 12 (all required elements + some context)
  const isBid = score >= 12;
  console.log(`${isBid ? '✅' : '❌'} ${isBid ? 'ACCEPTED' : 'REJECTED'} as bid`);
  
  return isBid;
}

// Track last bid to prevent duplicate updates
let lastBidAmount = 0;
let lastBidderName = '';

// Send bid update to server
async function sendBidUpdate(amount, bidderName) {
  try {
    // Prevent duplicate updates
    if (amount === lastBidAmount && bidderName === lastBidderName) {
      console.log(`⏭️ Skipping duplicate bid update: $${amount} by ${bidderName}`);
      return;
    }
    
    console.log(`📤 Sending bid update: $${amount} by ${bidderName}`);
    
    const response = await fetch('http://localhost:5000/api/bid-updates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentBid: amount.toString(),
        bidderName: bidderName,
        url: window.location.href,
        source: 'clean-extension'
      })
    });
    
    if (response.ok) {
      console.log(`✅ Successfully updated bid to $${amount}`);
      lastBidAmount = amount;
      lastBidderName = bidderName;
    } else {
      console.log(`❌ Failed to update bid: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Error sending bid update:', error);
  }
}

// Start monitoring after page loads
setTimeout(() => {
  console.log('🚀 Starting UNIVERSAL bid monitoring...');
  
  // Initial scan
  detectBids();
  
  // Scan every 2 seconds for optimal performance
  setInterval(detectBids, 2000);
  
  // Monitor for DOM changes (new comments being added)
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if new content was added that might contain bids
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const text = node.textContent || '';
            // If new content contains monetary amounts, scan immediately
            if (text.match(/\b\d{2,4}(?:\.\d{1,2})?\b/) && text.length > 10) {
              shouldScan = true;
              console.log('🔄 New monetary content detected:', text.substring(0, 100));
            }
          }
        });
      }
    });
    
    if (shouldScan) {
      console.log('🔄 New content detected, scanning for bids...');
      detectBids();
    }
  });
  
  // Start observing the entire document for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('👀 DOM change monitoring started');
}, 2000);

// Manual bid reset function (for debugging)
window.resetBid = function(newAmount, bidderName = 'Manual Reset') {
  console.log(`🔄 MANUAL BID RESET: $${newAmount} by ${bidderName}`);
  lastBidAmount = newAmount;
  lastBidderName = bidderName;
  sendBidUpdate(newAmount, bidderName);
};

// Function to show all detected bids for debugging
window.showAllBids = function() {
  console.log('📊 ALL DETECTED BIDS:');
  console.log(`Current highest bid: $${lastHighestBid} by ${lastBidderName}`);
  console.log('All bids in memory:', Array.from(allDetectedBids));
};

// Function to clear all detected bids and rescan
window.rescanBids = function() {
  console.log('🔄 CLEARING ALL BIDS AND RESCANNING...');
  allDetectedBids.clear();
  lastHighestBid = 0;
  lastBidderName = '';
  detectBids();
};

console.log('✅ UNIVERSAL extension ready!');
console.log('💡 Use resetBid(amount, name) to manually reset the current bid');
console.log('💡 Use showAllBids() to see all detected bids');
console.log('💡 Use rescanBids() to clear memory and rescan');
