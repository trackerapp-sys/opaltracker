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

// Auto scan for bids every 5 seconds
setInterval(() => {
  const pageText = document.body.innerText;
  const bidMatches = pageText.match(/\b(\d{2,3})\b/g);
  
  if (bidMatches) {
    const bids = bidMatches.map(Number).filter(n => n >= 20 && n <= 200);
    if (bids.length > 0) {
      const highest = Math.max(...bids);
      console.log(`📊 Found bids: ${bids.join(', ')} - Highest: $${highest}`);
    }
  }
}, 5000);

console.log('🎯 Extension ready - click red box to test!');