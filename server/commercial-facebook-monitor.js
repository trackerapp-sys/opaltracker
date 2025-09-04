/**
 * PRODUCTION-READY COMMERCIAL FACEBOOK MONITOR
 * Professional solution for selling to customers
 */

import axios from 'axios';
import fs from 'fs';

class ProductionFacebookMonitor {
  constructor(scrapingBeeKey, zenRowsKey = null) {
    this.scrapingBeeKey = scrapingBeeKey;
    this.zenRowsKey = zenRowsKey;
    this.replitUrl = process.env.REPLIT_URL || 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev';
  }

  /**
   * Test ScrapingBee authentication and Facebook access
   */
  async testScrapingBeeAccess() {
    try {
      console.log('🧪 Testing ScrapingBee API access...');
      console.log(`🔑 Using API key: ${this.scrapingBeeKey.substring(0, 20)}...`);
      
      // First test with a simple page
      const testResponse = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: {
          api_key: this.scrapingBeeKey,
          url: 'https://httpbin.org/json',
          render_js: 'false'
        },
        timeout: 15000
      });

      if (testResponse.status === 200) {
        console.log('✅ ScrapingBee API authentication SUCCESS');
        console.log(`📊 Response: ${JSON.stringify(testResponse.data).substring(0, 100)}...`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.log(`❌ ScrapingBee authentication failed: ${error.message}`);
      
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
      
      return false;
    }
  }

  /**
   * Monitor Facebook auction with enhanced error handling
   */
  async monitorFacebookAuction(facebookUrl, auctionId) {
    console.log(`\n🎯 Starting Facebook auction monitoring...`);
    console.log(`   URL: ${facebookUrl}`);
    console.log(`   Auction ID: ${auctionId}`);

    if (!this.scrapingBeeKey) {
      throw new Error('ScrapingBee API key required');
    }

    try {
      // Advanced ScrapingBee configuration for Facebook
      const scrapingParams = {
        api_key: this.scrapingBeeKey,
        url: facebookUrl,
        render_js: 'true',            // Essential for Facebook
        premium_proxy: 'true',        // Premium residential IPs
        country_code: 'US',           // US-based IPs work better
        wait: 8000,                   // Wait for dynamic content
        wait_for: 'body',             // Wait for body to load
        session_id: Math.random().toString(36).substring(7), // Unique session
        stealth_proxy: 'true',        // Enhanced stealth mode
        custom_google: 'false'        // Disable Google-specific features
      };

      console.log('📡 Sending request to ScrapingBee...');
      console.log(`   Parameters: render_js=true, premium_proxy=true, wait=8s`);

      const response = await axios.get('https://app.scrapingbee.com/api/v1/', {
        params: scrapingParams,
        timeout: 45000,  // 45 second timeout for Facebook
        headers: {
          'User-Agent': 'Commercial-Auction-Monitor/1.0'
        }
      });

      console.log(`✅ Facebook page loaded successfully!`);
      console.log(`📄 Content length: ${response.data.length} characters`);
      
      // Extract potential auction data
      const auctionData = this.extractAuctionData(response.data, facebookUrl);
      
      if (auctionData.bids.length > 0) {
        console.log(`💰 FOUND ${auctionData.bids.length} POTENTIAL BIDS:`);
        auctionData.bids.forEach((bid, i) => {
          console.log(`   ${i+1}. $${bid.amount} by ${bid.bidder || 'Unknown'}`);
        });

        const highestBid = Math.max(...auctionData.bids.map(b => b.amount));
        const topBidder = auctionData.bids.find(b => b.amount === highestBid)?.bidder || 'Commercial User';

        // Update auction automatically
        const updateResult = await this.updateAuctionAPI(auctionId, highestBid, topBidder);
        
        return {
          success: true,
          bidsFound: auctionData.bids.length,
          highestBid: highestBid,
          topBidder: topBidder,
          updated: updateResult.success,
          facebookUrl: facebookUrl
        };
      } else {
        console.log('📭 No bid patterns detected in Facebook content');
        
        // Save raw content for debugging (optional)
        if (process.env.DEBUG_SAVE_CONTENT) {
          fs.writeFileSync(`debug-facebook-${Date.now()}.html`, response.data);
          console.log('💾 Debug: Saved Facebook content for analysis');
        }
        
        return {
          success: false,
          message: 'No bids detected',
          contentLength: response.data.length,
          facebookUrl: facebookUrl
        };
      }

    } catch (error) {
      console.log(`❌ Facebook monitoring failed: ${error.message}`);
      
      if (error.response) {
        console.log(`   HTTP Status: ${error.response.status}`);
        if (error.response.data) {
          console.log(`   Response: ${JSON.stringify(error.response.data).substring(0, 200)}`);
        }
      }
      
      return {
        success: false,
        error: error.message,
        httpStatus: error.response?.status,
        facebookUrl: facebookUrl
      };
    }
  }

  /**
   * Enhanced bid extraction with multiple pattern matching
   */
  extractAuctionData(htmlContent, url) {
    const bids = [];
    
    // Remove HTML tags and clean content
    const textContent = htmlContent
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
    
    // Advanced bid detection patterns
    const bidPatterns = [
      // Direct dollar amounts
      { pattern: /\$(\d{1,4})(?!\d)/g, type: 'dollar' },
      
      // Bid statements
      { pattern: /(?:bid|offer|take|pay)[\s:]*\$?(\d{1,4})/gi, type: 'bid_statement' },
      
      // "I'll go" patterns
      { pattern: /(?:I'?ll?|will|can)\s+(?:go|pay|bid|do)\s+\$?(\d{1,4})/gi, type: 'commitment' },
      
      // Number + context
      { pattern: /(\d{2,4})\s+(?:for me|please|thanks|dollars?|bucks?)/gi, type: 'contextual' },
      
      // Standalone numbers in likely bid ranges
      { pattern: /\b(\d{2,4})\b(?=\s|$|\.|\!|\?)/g, type: 'standalone' }
    ];

    bidPatterns.forEach(({ pattern, type }) => {
      const matches = [...textContent.matchAll(pattern)];
      matches.forEach(match => {
        const amount = parseInt(match[1]);
        
        // Filter realistic bid amounts
        if (amount >= 20 && amount <= 2000) {
          
          // Try to find bidder name near the bid
          const contextStart = Math.max(0, match.index - 100);
          const contextEnd = Math.min(textContent.length, match.index + 100);
          const context = textContent.substring(contextStart, contextEnd);
          
          const bidderName = this.extractBidderName(context) || `${type}_bidder`;
          
          bids.push({
            amount: amount,
            bidder: bidderName,
            type: type,
            context: context.trim().substring(0, 50)
          });
        }
      });
    });

    // Remove duplicates and sort by amount
    const uniqueBids = Array.from(
      new Map(bids.map(bid => [bid.amount, bid])).values()
    ).sort((a, b) => b.amount - a.amount);

    return {
      bids: uniqueBids.slice(0, 10), // Top 10 bids
      url: url,
      extractedAt: new Date().toISOString()
    };
  }

  /**
   * Extract potential bidder names from context
   */
  extractBidderName(context) {
    // Simple name detection - look for capitalized words
    const namePattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
    const matches = context.match(namePattern);
    
    if (matches) {
      // Filter out common non-names
      const filtered = matches.filter(word => 
        !['I', 'The', 'This', 'That', 'For', 'With', 'Facebook', 'Like', 'Share', 'Comment'].includes(word)
      );
      
      return filtered[0] || null;
    }
    
    return null;
  }

  /**
   * Update auction via API with retry logic
   */
  async updateAuctionAPI(auctionId, bidAmount, bidderName, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Updating auction (attempt ${attempt}/${maxRetries})...`);
        
        const response = await axios.patch(
          `${this.replitUrl}/api/auctions/${auctionId}`,
          {
            currentBid: bidAmount.toString(),
            currentBidder: bidderName,
            updatedVia: 'ScrapingBee Commercial'
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000
          }
        );

        console.log(`✅ Auction updated successfully: $${bidAmount} by ${bidderName}`);
        return { success: true, data: response.data };

      } catch (error) {
        console.log(`❌ Update attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          return { success: false, error: error.message };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Commercial monitoring service - monitors multiple auctions
   */
  async runCommercialMonitoring(auctions) {
    console.log(`\n🚀 STARTING COMMERCIAL FACEBOOK MONITORING`);
    console.log(`   Monitoring ${auctions.length} auction(s)`);
    console.log(`   Using ScrapingBee Professional API\n`);

    const results = [];

    for (const auction of auctions) {
      const result = await this.monitorFacebookAuction(auction.url, auction.id);
      results.push({
        auctionId: auction.id,
        ...result
      });

      // Respectful delay between requests
      if (auctions.indexOf(auction) < auctions.length - 1) {
        console.log('⏱️  Waiting 10 seconds before next auction...\n');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Summary
    console.log(`\n📊 MONITORING COMPLETE:`);
    console.log(`   Total auctions: ${results.length}`);
    console.log(`   Successful: ${results.filter(r => r.success).length}`);
    console.log(`   With bids found: ${results.filter(r => r.bidsFound > 0).length}`);
    console.log(`   Updated: ${results.filter(r => r.updated).length}`);

    return results;
  }
}

// Test execution
async function runTest() {
  const API_KEY = process.env.SCRAPINGBEE_API_KEY;
  
  if (!API_KEY) {
    console.log('❌ SCRAPINGBEE_API_KEY environment variable required');
    process.exit(1);
  }

  const monitor = new ProductionFacebookMonitor(API_KEY);
  
  // Test API access first
  const authTest = await monitor.testScrapingBeeAccess();
  if (!authTest) {
    console.log('❌ Authentication failed - check API key');
    return;
  }

  // Test with real auction
  const testAuctions = [{
    id: '60492f2e-c038-48b9-9193-707711ce14d1',  // Your auction ID
    url: 'https://www.facebook.com/share/v/16d2fETDWj/'
  }];

  const results = await monitor.runCommercialMonitoring(testAuctions);
  
  console.log('\n🎯 COMMERCIAL TEST COMPLETE!');
  console.log(JSON.stringify(results, null, 2));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest().catch(console.error);
}

export { ProductionFacebookMonitor };