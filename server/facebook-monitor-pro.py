#!/usr/bin/env python3
"""
Professional Facebook Auction Monitor using NoDriver
- Successor to undetected-chromedriver
- Bypasses all modern anti-bot detection
- Commercial-grade automation for auction tracking
"""

import nodriver as uc
import asyncio
import json
import requests
import re
import random
import time
from typing import List, Dict, Optional

class FacebookAuctionMonitor:
    def __init__(self, replit_app_url: str):
        self.replit_url = replit_app_url
        self.browser = None
        self.page = None
        
    async def initialize(self):
        """Initialize the undetectable browser"""
        print("🚀 Starting professional Facebook monitor...")
        
        # Advanced stealth configuration
        self.browser = await uc.start(
            headless=True,  # Can run headless with full stealth
            sandbox=False,  # Better compatibility
            user_data_dir=None,  # Clean profile each time
        )
        
        # Get a clean page
        self.page = await self.browser.get("about:blank")
        
        # Wait for full initialization
        await asyncio.sleep(2)
        print("✅ Stealth browser initialized")
        
    async def monitor_auction(self, facebook_url: str, auction_id: str) -> Optional[Dict]:
        """Monitor a specific Facebook auction for new bids"""
        try:
            print(f"🔍 Monitoring: {facebook_url}")
            
            # Navigate to the Facebook page
            await self.page.get(facebook_url)
            
            # Wait for dynamic content to load
            await asyncio.sleep(random.uniform(3, 6))  # Human-like timing
            
            # Scroll down to load all comments
            for _ in range(3):
                await self.page.evaluate("window.scrollBy(0, 500)")
                await asyncio.sleep(random.uniform(1, 2))
            
            # Wait for comments to fully render
            await asyncio.sleep(3)
            
            # Extract all page content - this should see real comments
            page_content = await self.page.evaluate("""
                () => {
                    // Get all possible comment containers
                    const commentSelectors = [
                        '[data-testid*="comment"]',
                        '[role="comment"]', 
                        '.UFIComment',
                        'div[dir="auto"]'
                    ];
                    
                    let allText = [];
                    commentSelectors.forEach(selector => {
                        const elements = document.querySelectorAll(selector);
                        elements.forEach(el => {
                            const text = el.textContent?.trim();
                            if (text && text.length < 30) {
                                allText.push(text);
                            }
                        });
                    });
                    
                    return {
                        allComments: allText,
                        fullPageText: document.body.innerText,
                        pageTitle: document.title
                    };
                }
            """)
            
            # Analyze for bid patterns
            bids = self.extract_bids(page_content)
            
            if bids:
                highest_bid = max(bids['amounts'])
                print(f"🎯 FOUND BIDS: {bids['amounts']} - HIGHEST: ${highest_bid}")
                
                # Update the auction via API
                return await self.update_auction_api(auction_id, highest_bid, bids['highest_bidder'])
            else:
                print("📭 No valid bids detected")
                return None
                
        except Exception as e:
            print(f"❌ Error monitoring auction: {e}")
            return None
    
    def extract_bids(self, page_data: Dict) -> Optional[Dict]:
        """Extract bid amounts from page content"""
        all_texts = page_data['allComments'] + [page_data['fullPageText']]
        
        bid_patterns = [
            r'\$(\d{1,4})',                    # $200, $85
            r'\b(\d{2,4})\s*(?:dollars?|bucks?)\b',  # 200 dollars
            r'(?:bid|offer|take)\s*:?\s*\$?(\d{1,4})',  # bid 200
            r'(?:I(?:\'ll|l)?|will)\s+(?:go|pay|bid)\s+\$?(\d{1,4})',  # I'll go 200
            r'\b(\d{2,4})\s+for\s+me',         # 200 for me
            r'\b(\d{2,4})\b(?=\s|$|\.|\!|\?)'  # standalone numbers
        ]
        
        amounts = []
        potential_bidders = []
        
        for text in all_texts:
            if not text:
                continue
                
            for pattern in bid_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    bid_amount = int(match.group(1))
                    if 20 <= bid_amount <= 1000:  # Valid bid range
                        amounts.append(bid_amount)
                        
                        # Try to find associated bidder name
                        # Look for names before/after the bid in the same text
                        words = text.split()
                        for i, word in enumerate(words):
                            if str(bid_amount) in word or f"${bid_amount}" in word:
                                # Check surrounding words for names
                                context_start = max(0, i-3)
                                context_end = min(len(words), i+3)
                                context_words = words[context_start:context_end]
                                
                                # Simple name detection
                                for w in context_words:
                                    if (len(w) > 2 and w.isalpha() and 
                                        w not in ['bid', 'offer', 'take', 'pay', 'go', 'for', 'me', 'the', 'and']):
                                        potential_bidders.append(w)
                                        break
        
        if amounts:
            return {
                'amounts': sorted(set(amounts), reverse=True),
                'highest_bidder': potential_bidders[0] if potential_bidders else 'NoDriver User',
                'total_bids': len(amounts)
            }
        
        return None
    
    async def update_auction_api(self, auction_id: str, bid_amount: int, bidder_name: str) -> Dict:
        """Update auction via the Replit app API"""
        try:
            update_data = {
                'currentBid': str(bid_amount),
                'currentBidder': bidder_name
            }
            
            response = requests.patch(
                f"{self.replit_url}/api/auctions/{auction_id}",
                json=update_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.ok:
                print(f"✅ API Updated: ${bid_amount} by {bidder_name}")
                return {'success': True, 'bid': bid_amount, 'bidder': bidder_name}
            else:
                print(f"❌ API Error: {response.status_code}")
                return {'success': False, 'error': response.text}
                
        except Exception as e:
            print(f"❌ API Exception: {e}")
            return {'success': False, 'error': str(e)}
    
    async def monitor_multiple_auctions(self, auction_configs: List[Dict]):
        """Monitor multiple auctions in sequence"""
        results = []
        
        for config in auction_configs:
            try:
                result = await self.monitor_auction(config['url'], config['auction_id'])
                results.append({
                    'auction_id': config['auction_id'],
                    'url': config['url'],
                    'result': result
                })
                
                # Human-like delay between auctions
                await asyncio.sleep(random.uniform(5, 10))
                
            except Exception as e:
                print(f"❌ Failed to monitor {config['url']}: {e}")
                results.append({
                    'auction_id': config['auction_id'],
                    'url': config['url'], 
                    'result': {'success': False, 'error': str(e)}
                })
        
        return results
    
    async def close(self):
        """Clean shutdown"""
        if self.browser:
            await self.browser.stop()
            print("🔒 Browser closed")

# Main execution function
async def run_monitor(replit_url: str, auctions: List[Dict]):
    """Run the professional monitoring system"""
    monitor = FacebookAuctionMonitor(replit_url)
    
    try:
        await monitor.initialize()
        results = await monitor.monitor_multiple_auctions(auctions)
        
        print(f"📊 Monitoring complete. Results:")
        for result in results:
            print(f"  Auction {result['auction_id']}: {result['result']}")
        
        return results
        
    finally:
        await monitor.close()

# Example usage
if __name__ == "__main__":
    # Configuration
    REPLIT_URL = "https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev"
    
    # Test with your auction
    test_auctions = [{
        'auction_id': '60492f2e-c038-48b9-9193-707711ce14d1',  # Your current auction ID
        'url': 'https://www.facebook.com/share/v/16d2fETDWj/'
    }]
    
    # Run the monitor
    results = uc.loop().run_until_complete(
        run_monitor(REPLIT_URL, test_auctions)
    )
    
    print("🎯 Professional monitoring complete!")
    print(json.dumps(results, indent=2))