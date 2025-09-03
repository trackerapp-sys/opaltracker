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
  
  // Multiple bid detection patterns
  const patterns = [
    /\$(\d{1,3})/g,           // $45, $55
    /\b(\d{2,3})\b/g,         // 45, 55 standalone
    /bid\s*:?\s*(\d{1,3})/gi, // bid 45, bid: 55
    /(\d{1,3})\s*dollars?/gi  // 45 dollars
  ];
  
  let allBids = [];
  for (const pattern of patterns) {
    const matches = [...pageText.matchAll(pattern)];
    for (const match of matches) {
      const bid = parseInt(match[1]);
      if (bid >= 20 && bid <= 300) {
        allBids.push(bid);
      }
    }
  }
  
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
          
          const updateResponse = await fetch(`https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions/${auction.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              currentBid: highest.toString(),
              currentBidder: 'Extension User'
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