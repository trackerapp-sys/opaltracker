// Clean Opal Auction Tracker - Facebook Bid Monitor
console.log('🔥 CLEAN EXTENSION LOADED:', window.location.href);

// Create notification
const notification = document.createElement('div');
notification.innerHTML = '🔥 TRACKER ACTIVE!<br>Click to test $50 bid';
notification.style.cssText = `
  position: fixed; top: 20px; right: 20px; z-index: 99999;
  background: #ff4444; color: white; padding: 15px; border-radius: 8px;
  font-weight: bold; font-size: 14px; cursor: pointer; min-width: 200px;
`;

// Manual test when clicked
notification.onclick = async () => {
  console.log('🧪 TESTING $50 BID...');
  try {
    // Get auctions
    const response = await fetch('https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions');
    const data = await response.json();
    
    if (data.auctions && data.auctions.length > 0) {
      const auction = data.auctions[0];
      console.log('🎯 Found auction:', auction.opalType);
      
      // Update bid to $50
      const updateResponse = await fetch(`https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions/${auction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentBid: '50',
          currentBidder: 'Test User'
        })
      });
      
      if (updateResponse.ok) {
        notification.innerHTML = '✅ SUCCESS!<br>Updated to $50';
        notification.style.background = '#44ff44';
        console.log('✅ Successfully updated to $50!');
      } else {
        notification.innerHTML = '❌ FAILED<br>Check console';
        notification.style.background = '#ff8844';
        console.log('❌ Update failed:', await updateResponse.text());
      }
    } else {
      notification.innerHTML = '❌ NO AUCTIONS<br>Check setup';
      console.log('❌ No auctions found');
    }
  } catch (error) {
    notification.innerHTML = '❌ ERROR<br>Check console';
    console.error('❌ Test failed:', error);
  }
};

document.body.appendChild(notification);

// Auto scan for bids every 3 seconds with aggressive detection
setInterval(async () => {
  const pageText = document.body.innerText;
  console.log('🔍 SCANNING PAGE FOR BIDS...');
  
  // Enhanced bid detection patterns to catch all formats
  const patterns = [
    /\$(\d{1,3})/g,                    // $45, $85
    /\b(\d{2,3})\b/g,                  // 45, 85 standalone numbers
    /(?:bid|offer|take)\s*:?\s*(\d{1,3})/gi, // bid 85, offer 85
    /(\d{1,3})\s*(?:dollars?|bucks?)/gi,     // 85 dollars, 85 bucks
    /(?:go|pay)\s+(\d{1,3})/gi,       // I'll go 85, pay 85
    /(\d{1,3})\s*for\s*me/gi          // 85 for me
  ];
  
  let allBids = [];
  for (const pattern of patterns) {
    const matches = [...pageText.matchAll(pattern)];
    for (const match of matches) {
      const bid = parseInt(match[1]);
      if (bid >= 10 && bid <= 500) {  // Wider range to catch more bids
        allBids.push(bid);
      }
    }
  }
  
  // Also scan individual comments for better accuracy
  const commentElements = document.querySelectorAll('[data-testid="UFI2Comment"], [role="comment"], [dir="auto"]');
  commentElements.forEach(element => {
    const commentText = element.textContent || '';
    if (commentText.length < 50) {  // Short comments more likely to be bids
      const singleBidMatch = commentText.match(/\b(\d{2,3})\b/);
      if (singleBidMatch) {
        const bid = parseInt(singleBidMatch[1]);
        if (bid >= 10 && bid <= 500) {
          allBids.push(bid);
        }
      }
    }
  });
  
  if (allBids.length > 0) {
    const uniqueBids = [...new Set(allBids)].sort((a, b) => b - a);
    const highest = uniqueBids[0];
    console.log(`🔥 FOUND BIDS: ${uniqueBids.slice(0, 10).join(', ')} - HIGHEST: $${highest}`);
    
    // Try to update auction with highest bid
    try {
      const response = await fetch('https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions');
      const data = await response.json();
      
      if (data.auctions && data.auctions.length > 0) {
        const auction = data.auctions[0];
        const currentBid = parseFloat(auction.currentBid || auction.startingBid || 0);
        
        if (highest > currentBid) {
          console.log(`🚀 UPDATING: $${currentBid} → $${highest}`);
          
          // Try to find the actual bidder name from the page
          let bidderName = 'Extension User';
          const nameSelectors = [
            '[data-testid="UFI2Comment"] a[role="link"]',
            '[role="comment"] a[role="link"]', 
            '.UFICommentActorName',
            '.profileLink',
            'a[href*="facebook.com/"]'
          ];
          
          for (const selector of nameSelectors) {
            const nameElement = document.querySelector(selector);
            if (nameElement) {
              const nameText = nameElement.textContent.trim();
              if (nameText && nameText.length > 1 && nameText.length < 50 && 
                  !nameText.includes('http') && !nameText.includes('ago')) {
                bidderName = nameText;
                break;
              }
            }
          }

          const updateResponse = await fetch(`https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions/${auction.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              currentBid: highest.toString(),
              currentBidder: bidderName
            })
          });
          
          if (updateResponse.ok) {
            console.log(`✅ SUCCESS! Updated to $${highest}`);
            notification.innerHTML = `✅ UPDATED!<br>$${currentBid} → $${highest}`;
            notification.style.background = '#44ff44';
          } else {
            console.log('❌ Update failed:', await updateResponse.text());
          }
        } else {
          console.log(`⚪ $${highest} not higher than current $${currentBid}`);
        }
      }
    } catch (error) {
      console.error('❌ Auto-update error:', error);
    }
  } else {
    console.log('❌ No bids found in scan');
  }
}, 3000);

console.log('🎯 Extension ready - click red box to test!');