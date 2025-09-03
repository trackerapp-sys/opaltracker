// Opal Auction Tracker - Facebook Bid Monitor
console.log('🔥 OPAL TRACKER LOADED ON:', window.location.href);

// Safety check for chrome.runtime
if (typeof chrome === 'undefined' || !chrome.runtime) {
  console.log('⚠️ Chrome extension API not available');
}

// Show a big notification that we're working
const notification = document.createElement('div');
notification.innerHTML = '🔥 OPAL TRACKER ACTIVE!<br>Scanning for bids every 3 seconds...';
notification.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 99999;
  background: #ff4444;
  color: white;
  padding: 15px;
  border-radius: 8px;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  min-width: 250px;
  cursor: pointer;
`;

// Add click handler for manual test
notification.addEventListener('click', () => {
  console.log('🧪 MANUAL TEST - Simulating $50 bid...');
  updateAuction(50);
});

document.body.appendChild(notification);

// Scan for bids every 3 seconds - enhanced detection
setInterval(() => {
  const pageText = document.body.innerText;
  console.log('🔍 SCANNING FOR ALL BIDS...');
  
  // Enhanced patterns to detect any bid amount
  const bidPatterns = [
    /\$(\d{1,3}(?:\.\d{1,2})?)/g,                    // $25, $25.50, $100
    /(\d{1,3}(?:\.\d{1,2})?)\s*dollars?/gi,          // 25 dollars, 100 dollars
    /bid\s*:?\s*\$?(\d{1,3}(?:\.\d{1,2})?)/gi,       // bid 45, bid: $45, bid 100
    /offer\s*:?\s*\$?(\d{1,3}(?:\.\d{1,2})?)/gi,     // offer 50
    /(\d{1,3}(?:\.\d{1,2})?)\b(?!\s*(?:kg|g|mm|cm|carats?|members|K\s|hours?|days?|minutes?|years?))/gi  // standalone numbers
  ];
  
  const foundBids = [];
  let allMatches = [];
  
  for (const pattern of bidPatterns) {
    const matches = [...pageText.matchAll(pattern)];
    for (const match of matches) {
      const bid = parseFloat(match[1]);
      if (bid >= 15 && bid <= 1000) {  // Reasonable bid range
        foundBids.push(bid);
        allMatches.push(`$${bid}`);
      }
    }
  }
  
  if (foundBids.length > 0) {
    // Remove duplicates and sort
    const uniqueBids = [...new Set(foundBids)].sort((a, b) => b - a);
    const highest = uniqueBids[0];
    
    console.log(`🔥 FOUND ${foundBids.length} BIDS: ${uniqueBids.join(', ')} - HIGHEST: $${highest}`);
    
    // Update the notification
    notification.innerHTML = `🔥 FOUND BIDS!<br>All: ${uniqueBids.slice(0, 5).join(', ')}<br>Highest: $${highest}`;
    notification.style.background = '#44ff44';
    
    // Send to auction tracker
    updateAuction(highest);
  } else {
    console.log('❌ No valid bids found');
    notification.innerHTML = '🔍 SCANNING...<br>No bids detected yet';
    notification.style.background = '#ff8844';
  }
}, 3000);

async function updateAuction(bidAmount) {
  try {
    console.log(`💰 Sending bid $${bidAmount} to auction tracker...`);
    
    // Get current auctions
    const response = await fetch('https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions');
    const data = await response.json();
    console.log('📊 Auction data received:', data);
    
    if (data.auctions && data.auctions.length > 0) {
      const auction = data.auctions[0];
      console.log('🎯 Target auction:', auction);
      const currentBid = parseFloat(auction.currentBid || auction.startingBid);
      
      if (bidAmount > currentBid) {
        console.log(`🚀 UPDATING: $${currentBid} → $${bidAmount}`);
        
        // Enhanced bidder name detection with more comprehensive approach
        let bidderName = 'Extension User';
        
        // Debug: log all potential name elements
        console.log('🔍 Searching for Facebook username...');
        
        // Most comprehensive list of Facebook name selectors
        const nameSelectors = [
          // Main navigation and account areas
          '[data-testid="nav_account_switcher"]',
          '[aria-label*="Your profile"]',
          '[aria-label*="Account"]',
          '[data-testid*="profile"]',
          
          // Profile links and buttons
          'a[href*="/profile.php"]',
          'a[href*="/me/"]',
          'a[href^="/"]',
          
          // Header and navigation elements
          'header [role="button"]',
          'nav [role="button"]',
          '[role="navigation"] [role="button"]',
          
          // Text elements that might contain names
          'span[dir="auto"]',
          'div[dir="auto"]',
          
          // Facebook-specific classes (these change but worth trying)
          '[class*="profile"]',
          '[class*="account"]'
        ];
        
        for (const selector of nameSelectors) {
          const elements = document.querySelectorAll(selector);
          console.log(`🔎 Checking selector "${selector}" - found ${elements.length} elements`);
          
          for (let i = 0; i < elements.length; i++) {
            const element = elements[i];
            const texts = [
              element.textContent?.trim(),
              element.getAttribute('aria-label'),
              element.getAttribute('title'),
              element.querySelector('span')?.textContent?.trim(),
              element.querySelector('div')?.textContent?.trim()
            ].filter(t => t);
            
            for (const text of texts) {
              if (text && text.length > 1 && text.length < 50) {
                // Filter out common non-name text
                const excludeWords = [
                  'profile', 'menu', 'search', 'home', 'notifications', 'messages',
                  'create', 'account', 'settings', 'log out', 'switch', 'see more',
                  'facebook', 'marketplace', 'groups', 'pages', 'gaming', 'video',
                  'events', 'ad', 'create post', 'story', 'reel'
                ];
                
                const lowerText = text.toLowerCase();
                const isExcluded = excludeWords.some(word => lowerText.includes(word));
                
                if (!isExcluded && !/^\d+$/.test(text) && text.length > 2) {
                  bidderName = text;
                  console.log(`👤 FOUND USERNAME: "${bidderName}" from selector: ${selector}`);
                  break;
                }
              }
            }
            if (bidderName !== 'Extension User') break;
          }
          if (bidderName !== 'Extension User') break;
        }
        
        // If still no name found, try a different approach - look for any likely names in the page
        if (bidderName === 'Extension User') {
          console.log('🔄 Trying fallback name detection...');
          const allText = document.body.innerText;
          const lines = allText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 30);
          
          for (const line of lines.slice(0, 20)) { // Check first 20 lines
            if (line.match(/^[A-Z][a-z]+ [A-Z][a-z]+$/) || // "John Smith" pattern
                line.match(/^[A-Z][a-z]+$/) && line.length > 2) { // "John" pattern
              bidderName = line;
              console.log(`👤 FALLBACK USERNAME: "${bidderName}"`);
              break;
            }
          }
        }
        
        console.log(`✅ Final bidder name: "${bidderName}"`)
        
        // Ensure auction.id is a string
        const auctionId = String(auction.id);
        console.log(`🔄 Updating auction ID: ${auctionId}`);
        
        const updateResponse = await fetch(`https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions/${auctionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            currentBid: bidAmount.toString(),
            currentBidder: bidderName
          })
        });
        
        if (updateResponse.ok) {
          console.log(`✅ SUCCESS! Updated to $${bidAmount} from ${bidderName}`);
          notification.innerHTML = `✅ UPDATED TO $${bidAmount}!<br>Bidder: ${bidderName}`;
          notification.style.background = '#44ff44';
        } else {
          console.log('❌ Update failed with status:', updateResponse.status);
          const errorText = await updateResponse.text();
          console.log('❌ Error details:', errorText);
          notification.innerHTML = `❌ Update failed: ${updateResponse.status}`;
          notification.style.background = '#ff4444';
        }
      } else {
        console.log(`⚪ Bid $${bidAmount} not higher than current $${currentBid}`);
      }
    } else {
      console.log('❌ No auctions found');
      notification.innerHTML = '❌ No auctions found';
      notification.style.background = '#ff4444';
    }
  } catch (error) {
    console.error('❌ Error:', error);
    notification.innerHTML = `❌ Error: ${error.message}`;
    notification.style.background = '#ff4444';
  }
}

console.log('🔥 Extension ready! Check console for bid detection...');