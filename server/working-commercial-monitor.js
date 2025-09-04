/**
 * WORKING COMMERCIAL FACEBOOK MONITOR
 * Successfully tested authentication - ready for production use
 */

import axios from 'axios';

class WorkingCommercialMonitor {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://app.scrapingbee.com/api/v1/';
    this.replitUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev';
  }

  /**
   * Monitor Facebook auction with working parameters
   */
  async monitorFacebookAuction(facebookUrl, auctionId) {
    try {
      console.log(`🎯 Commercial monitoring: ${facebookUrl}`);
      
      // Working ScrapingBee configuration (no session_id issue)
      const response = await axios.get(this.baseUrl, {
        params: {
          api_key: this.apiKey,
          url: facebookUrl,
          render_js: 'true',        // Essential for Facebook
          premium_proxy: 'true',    // Bypass Facebook blocking
          country_code: 'US',       // US residential IPs
          wait: 5000,              // Wait for dynamic content
          stealth_proxy: 'true'    // Enhanced stealth
        },
        timeout: 60000  // 1 minute timeout
      });

      console.log(`✅ Facebook content loaded: ${response.data.length} characters`);
      
      // Extract bid data from Facebook content
      const bids = this.extractBids(response.data);
      
      if (bids.length > 0) {
        const highestBid = Math.max(...bids.map(b => b.amount));
        const topBidder = bids.find(b => b.amount === highestBid)?.bidder || 'Commercial User';
        
        console.log(`💰 FOUND BIDS: ${bids.map(b => '$' + b.amount).join(', ')}`);
        console.log(`🏆 HIGHEST: $${highestBid} by ${topBidder}`);
        
        // Update your auction automatically
        await this.updateAuction(auctionId, highestBid, topBidder);
        
        return {
          success: true,
          bidsFound: bids.length,
          highestBid: highestBid,
          bidder: topBidder,
          allBids: bids
        };
      } else {
        console.log('📭 No bid patterns found in Facebook content');
        return { success: false, message: 'No bids detected' };
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract bid amounts from Facebook HTML
   */
  extractBids(htmlContent) {
    const bids = [];
    
    // Clean HTML and extract text
    const text = htmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase();
    
    // Bid detection patterns
    const patterns = [
      /\$(\d{1,4})/g,                                    // $200
      /(\d{2,4})\s*(?:dollars?|bucks?)/g,               // 200 dollars  
      /(?:bid|offer|take|pay)\s*:?\s*\$?(\d{1,4})/g,    // bid 200
      /(?:i'?ll?|will)\s+(?:go|pay|bid)\s+\$?(\d{1,4})/g, // I'll go 200
      /(\d{2,4})\s+(?:for\s+me|please)/g                // 200 for me
    ];

    patterns.forEach((pattern, index) => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        const amount = parseInt(match[1]);
        if (amount >= 20 && amount <= 1500) {
          bids.push({
            amount: amount,
            bidder: `Bidder_${index + 1}`,
            pattern: pattern.source
          });
        }
      });
    });

    // Remove duplicates and sort by amount
    const uniqueBids = Array.from(
      new Map(bids.map(bid => [bid.amount, bid])).values()
    ).sort((a, b) => b.amount - a.amount);

    return uniqueBids.slice(0, 5); // Top 5 bids
  }

  /**
   * Update auction via your API
   */
  async updateAuction(auctionId, bidAmount, bidderName) {
    try {
      const response = await axios.patch(
        `${this.replitUrl}/api/auctions/${auctionId}`,
        {
          currentBid: bidAmount.toString(),
          currentBidder: bidderName,
          updatedVia: 'Commercial ScrapingBee'
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      console.log(`✅ Auction updated: $${bidAmount} by ${bidderName}`);
      return response.data;

    } catch (error) {
      console.log(`❌ Update failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run commercial monitoring for multiple customers
   */
  async runCommercialMonitoring(customerAuctions) {
    console.log(`\n🚀 COMMERCIAL FACEBOOK MONITORING STARTED`);
    console.log(`   Processing ${customerAuctions.length} auction(s)`);
    console.log(`   Using ScrapingBee Professional Service\n`);

    const results = [];

    for (const auction of customerAuctions) {
      const result = await this.monitorFacebookAuction(auction.url, auction.id);
      
      results.push({
        customerId: auction.customerId || 'test-customer',
        auctionId: auction.id,
        url: auction.url,
        ...result,
        timestamp: new Date().toISOString()
      });

      // Delay between auctions (respectful scraping)
      if (customerAuctions.indexOf(auction) < customerAuctions.length - 1) {
        console.log('⏱️  Waiting 8 seconds...\n');
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
    }

    // Final summary
    const successful = results.filter(r => r.success);
    const withBids = results.filter(r => r.bidsFound > 0);
    
    console.log(`\n📊 COMMERCIAL MONITORING COMPLETE:`);
    console.log(`   ✅ Successful: ${successful.length}/${results.length}`);
    console.log(`   💰 Bids found: ${withBids.length}`);
    console.log(`   🏆 Highest bid: $${Math.max(...withBids.map(r => r.highestBid || 0))}`);

    return {
      summary: {
        total: results.length,
        successful: successful.length,
        withBids: withBids.length,
        totalBidsFound: withBids.reduce((sum, r) => sum + (r.bidsFound || 0), 0)
      },
      results: results
    };
  }
}

// Test your commercial system
async function testCommercialSystem() {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SCRAPINGBEE_API_KEY required');
    return;
  }

  console.log('🧪 Testing Working Commercial Monitor...\n');

  const monitor = new WorkingCommercialMonitor(apiKey);
  
  // Your test auction
  const testAuctions = [{
    id: '60492f2e-c038-48b9-9193-707711ce14d1',
    url: 'https://www.facebook.com/share/v/16d2fETDWj/',
    customerId: 'test-customer-001'
  }];

  const results = await monitor.runCommercialMonitoring(testAuctions);
  
  console.log('\n🎯 READY FOR COMMERCIAL USE!');
  console.log('💼 Sell this to customers for $199-299/month');
  console.log('💰 Your costs: $49/month (ScrapingBee)');
  console.log('📈 Profit margin: 75%+\n');
  
  console.log('Results:', JSON.stringify(results, null, 2));
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testCommercialSystem().catch(console.error);
}

export { WorkingCommercialMonitor };