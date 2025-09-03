// Ultra Simple Test Version - Opal Auction Tracker
console.log('🔥 TEST EXTENSION LOADED ON:', window.location.href);

// Show a big notification that we're working
const notification = document.createElement('div');
notification.innerHTML = '🔥 OPAL TRACKER ACTIVE!<br>Scanning for bids every 5 seconds...';
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
`;
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
        
        // Enhanced bidder name detection
        let bidderName = 'Extension User';
        
        // Try multiple approaches to get the user's name
        const nameSelectors = [
          // Main navigation profile
          '[data-testid="nav_account_switcher"] span',
          '[aria-label*="Your profile"] span',
          // Profile links
          'a[href*="/profile.php"] span, a[href*="/profile.php"] div',
          // Header profile elements
          'header [role="button"] span',
          // Any profile-related elements
          '[data-testid*="profile"] span',
          // Fallback to any navigation text that looks like a name
          'nav span[dir="auto"]'
        ];
        
        for (const selector of nameSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent?.trim();
            if (text && text.length > 0 && text.length < 50 && 
                !text.includes('Profile') && !text.includes('profile') && 
                !text.includes('Menu') && !text.includes('menu') &&
                !text.includes('Search') && !text.includes('Home')) {
              bidderName = text;
              console.log(`👤 Found bidder name: ${bidderName}`);
              break;
            }
          }
          if (bidderName !== 'Extension User') break;
        }
        
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