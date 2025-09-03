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

// Scan for bids every 5 seconds
setInterval(() => {
  const pageText = document.body.innerText;
  console.log('🔍 Scanning page text...');
  
  // Look for your specific bids
  const bids = [];
  if (pageText.includes('125')) bids.push(125);
  if (pageText.includes('100')) bids.push(100);
  if (pageText.includes('65')) bids.push(65);
  if (pageText.includes('55')) bids.push(55);
  if (pageText.includes('25')) bids.push(25);
  
  if (bids.length > 0) {
    const highest = Math.max(...bids);
    console.log(`🔥 FOUND BIDS: ${bids.join(', ')} - HIGHEST: $${highest}`);
    
    // Update the notification
    notification.innerHTML = `🔥 FOUND BIDS!<br>Detected: ${bids.join(', ')}<br>Highest: $${highest}`;
    notification.style.background = '#44ff44';
    
    // Send to auction tracker
    updateAuction(highest);
  } else {
    console.log('❌ No bids found in page text');
  }
}, 5000);

async function updateAuction(bidAmount) {
  try {
    console.log(`💰 Sending bid $${bidAmount} to auction tracker...`);
    
    // Get current auctions
    const response = await fetch('https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions');
    const data = await response.json();
    
    if (data.auctions && data.auctions.length > 0) {
      const auction = data.auctions[0];
      const currentBid = parseFloat(auction.currentBid || auction.startingBid);
      
      if (bidAmount > currentBid) {
        console.log(`🚀 UPDATING: $${currentBid} → $${bidAmount}`);
        
        const updateResponse = await fetch(`https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev/api/auctions/${auction.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentBid: bidAmount.toString() })
        });
        
        if (updateResponse.ok) {
          console.log(`✅ SUCCESS! Updated to $${bidAmount}`);
          notification.innerHTML = `✅ UPDATED TO $${bidAmount}!`;
        } else {
          console.log('❌ Update failed');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

console.log('🔥 Extension ready! Check console for bid detection...');