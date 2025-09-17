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

// Automatic bid detection every 10 seconds - TRUE AUTOMATION
setInterval(async () => {
  console.log('🤖 AUTO-SCANNING FOR NEW BIDS...');
  
  // Get ALL comments from the page using multiple selectors
  const commentSelectors = [
    '[data-testid="UFI2Comment"] [dir="auto"]',
    '[role="comment"] [dir="auto"]', 
    '.UFICommentBody',
    '[data-testid="comment"] [dir="auto"]',
    '.UFIComment .UFICommentBody',
    'div[dir="auto"]' // Broader search
  ];
  
  let allComments = [];
  commentSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length < 50) { // Short comments more likely to be bids
        allComments.push(text);
      }
    });
  });
  
  // Enhanced bid patterns to catch everything
  const bidPatterns = [
    /\$(\d{1,3})/g,                    // $200, $85
    /\b(\d{2,3})\b/g,                  // 200, 85 standalone
    /(?:bid|offer|take)\s*:?\s*(\d{1,3})/gi, // bid 200
    /(\d{1,3})\s*(?:dollars?|bucks?)/gi,     // 200 dollars
    /(?:go|pay)\s+(\d{1,3})/gi,       // I'll go 200
    /(\d{1,3})\s*for\s*me/gi          // 200 for me
  ];
  
  let allBids = [];
  
  // Process each comment for bid detection
  console.log(`📝 Found ${allComments.length} comments to analyze`);
  
  allComments.forEach(commentText => {
    bidPatterns.forEach(pattern => {
      const matches = [...commentText.matchAll(pattern)];
      matches.forEach(match => {
        const bid = parseInt(match[1]);
        if (bid >= 20 && bid <= 1000) {  // Expanded range for higher bids
          allBids.push(bid);
          console.log(`💰 Found bid: $${bid} in comment: "${commentText}"`);
        }
      });
    });
  });
  
  // Also check page text for any missed bids
  const pageText = document.body.innerText;
  const pageMatches = [...pageText.matchAll(/\b(\d{2,4})\b/g)];
  pageMatches.forEach(match => {
    const num = parseInt(match[1]);
    if (num >= 50 && num <= 1000) {
      // Check if this number appears in a bid-like context
      const context = pageText.substring(match.index - 20, match.index + 20);
      if (!context.includes('members') && !context.includes('carats') && 
          !context.includes('date') && !context.includes('time') &&
          !context.includes('shipping') && !context.includes('comments')) {
        allBids.push(num);
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
          
          // Enhanced bidder name detection
          let bidderName = 'Auto-detected';
          
          // Try to find the name associated with the highest bid
          const commentContainers = document.querySelectorAll('[data-testid="UFI2Comment"], [role="comment"]');
          
          for (const container of commentContainers) {
            const containerText = container.textContent || '';
            // If this container has the highest bid, find the name
            if (containerText.includes(highest.toString()) || containerText.includes(`$${highest}`)) {
              const nameElements = container.querySelectorAll('a[role="link"], .UFICommentActorName, .profileLink');
              for (const nameEl of nameElements) {
                const nameText = nameEl.textContent?.trim();
                if (nameText && nameText.length > 1 && nameText.length < 50 && 
                    !nameText.includes('http') && !nameText.includes('ago') &&
                    !nameText.includes('Like') && !nameText.includes('Reply')) {
                  bidderName = nameText;
                  break;
                }
              }
              if (bidderName !== 'Auto-detected') break;
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
}, 10000);  // Check every 10 seconds for true automation

console.log('🎯 Extension ready - click red box to test!');