/**
 * APIFY FACEBOOK COMMENTS MONITOR
 * Professional solution for accessing real Facebook comments
 * Perfect for commercial auction monitoring
 */

import axios from 'axios';

class ApifyFacebookMonitor {
  constructor(apifyApiKey) {
    this.apiKey = apifyApiKey;
    this.baseUrl = 'https://api.apify.com/v2';
    this.replitUrl = 'https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev';
  }

  /**
   * Run Facebook Comments Scraper via Apify API
   * This gets REAL comments from Facebook posts
   */
  async scrapeFacebookComments(facebookUrl, maxComments = 100) {
    try {
      console.log(`🎯 Starting Apify Facebook Comments scraping...`);
      console.log(`   URL: ${facebookUrl}`);
      console.log(`   Max comments: ${maxComments}`);

      // Start the Apify actor for Facebook Comments
      const runResponse = await axios.post(
        `${this.baseUrl}/acts/apify~facebook-comments-scraper/runs`,
        {
          startUrls: [{ url: facebookUrl }],
          maxComments: maxComments,
          resultsLimit: maxComments,
          // Optional: Add cookies for authenticated access
          // cookies: 'your-facebook-cookies-here'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      const runId = runResponse.data.data.id;
      console.log(`🚀 Apify run started: ${runId}`);

      // Wait for completion and get results
      const results = await this.waitForApifyResults(runId);
      
      if (results && results.length > 0) {
        console.log(`✅ Found ${results.length} real Facebook comments!`);
        
        // Extract bid information from real comments
        const bids = this.extractBidsFromComments(results);
        
        if (bids.length > 0) {
          console.log(`💰 REAL BIDS FOUND:`);
          bids.forEach(bid => {
            console.log(`   $${bid.amount} by ${bid.author} - "${bid.text.substring(0, 30)}..."`);
          });
          
          return {
            success: true,
            realComments: results.length,
            bidsFound: bids.length,
            bids: bids,
            highestBid: Math.max(...bids.map(b => b.amount)),
            topBidder: bids.find(b => b.amount === Math.max(...bids.map(b => b.amount)))?.author
          };
        } else {
          console.log('📭 No bid patterns found in real comments');
          return {
            success: true,
            realComments: results.length,
            bidsFound: 0,
            message: 'Comments found but no bids detected'
          };
        }
      } else {
        console.log('❌ No comments retrieved - might need authentication');
        return {
          success: false,
          message: 'No comments found - authentication may be required'
        };
      }

    } catch (error) {
      console.log(`❌ Apify error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Wait for Apify run to complete and get results
   */
  async waitForApifyResults(runId, maxWait = 120) {
    console.log(`⏳ Waiting for Apify run ${runId} to complete...`);
    
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait * 1000) {
      try {
        const statusResponse = await axios.get(
          `${this.baseUrl}/actor-runs/${runId}`,
          {
            headers: { 'Authorization': `Bearer ${this.apiKey}` }
          }
        );

        const status = statusResponse.data.data.status;
        
        if (status === 'SUCCEEDED') {
          console.log(`✅ Apify run completed successfully`);
          
          // Get the results
          const resultsResponse = await axios.get(
            `${this.baseUrl}/actor-runs/${runId}/dataset/items`,
            {
              headers: { 'Authorization': `Bearer ${this.apiKey}` }
            }
          );
          
          return resultsResponse.data;
          
        } else if (status === 'FAILED') {
          console.log(`❌ Apify run failed`);
          return null;
          
        } else {
          console.log(`🔄 Status: ${status} - waiting...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } catch (error) {
        console.log(`❌ Error checking status: ${error.message}`);
        return null;
      }
    }
    
    console.log(`⏰ Timeout: Run took longer than ${maxWait} seconds`);
    return null;
  }

  /**
   * Extract bid information from real Facebook comments
   */
  extractBidsFromComments(comments) {
    const bids = [];
    
    for (const comment of comments) {
      if (!comment.text || !comment.ownerName) continue;
      
      const text = comment.text.toLowerCase();
      const author = comment.ownerName;
      
      // Bid detection patterns for real comments
      const bidPatterns = [
        /\$(\d{1,4})(?!\d)/g,                           // $200
        /(\d{2,4})\s*(?:dollars?|bucks?|aud?)\b/g,     // 200 dollars, 200 AUD
        /(?:bid|offer|take)\s*:?\s*\$?(\d{1,4})/g,     // bid 200, offer $200
        /(?:i'?ll?|will)\s+(?:go|pay|bid)\s+\$?(\d{1,4})/g, // I'll go 200
        /(\d{1,4})\s+(?:for\s+me|please|thanks)/g      // 200 for me
      ];

      for (const pattern of bidPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          const amount = parseInt(match[1]);
          
          // Valid auction bid range
          if (amount >= 20 && amount <= 2000) {
            bids.push({
              amount: amount,
              author: author,
              text: comment.text,
              timestamp: comment.publishedTime || new Date(),
              commentId: comment.id || `comment_${bids.length}`
            });
          }
        }
      }
    }

    // Remove duplicates by amount+author and sort by amount
    const uniqueBids = Array.from(
      new Map(bids.map(bid => [`${bid.amount}_${bid.author}`, bid])).values()
    ).sort((a, b) => b.amount - a.amount);

    return uniqueBids;
  }

  /**
   * Update auction with real bid data
   */
  async updateAuctionWithRealBid(auctionId, bidData) {
    try {
      const response = await axios.patch(
        `${this.replitUrl}/api/auctions/${auctionId}`,
        {
          currentBid: bidData.highestBid.toString(),
          currentBidder: bidData.topBidder,
          updatedVia: 'Apify Real Comments'
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      console.log(`✅ Auction updated with REAL data: $${bidData.highestBid} by ${bidData.topBidder}`);
      return response.data;

    } catch (error) {
      console.log(`❌ Update failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Commercial monitoring for customers
   */
  async monitorCustomerAuctions(customerAuctions) {
    console.log(`\n🚀 APIFY COMMERCIAL MONITORING STARTED`);
    console.log(`   Processing ${customerAuctions.length} auction(s)`);
    console.log(`   Using Apify Facebook Comments API\n`);

    const results = [];

    for (const auction of customerAuctions) {
      console.log(`\n📋 Processing auction: ${auction.id}`);
      
      const commentData = await this.scrapeFacebookComments(auction.url);
      
      if (commentData.success && commentData.bidsFound > 0) {
        // Update auction with real bid data
        await this.updateAuctionWithRealBid(auction.id, commentData);
      }
      
      results.push({
        customerId: auction.customerId,
        auctionId: auction.id,
        url: auction.url,
        ...commentData,
        timestamp: new Date().toISOString()
      });

      // Respectful delay between auctions
      if (customerAuctions.indexOf(auction) < customerAuctions.length - 1) {
        console.log('⏱️  Waiting 15 seconds between auctions...');
        await new Promise(resolve => setTimeout(resolve, 15000));
      }
    }

    return {
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        withBids: results.filter(r => r.bidsFound > 0).length,
        totalBidsFound: results.reduce((sum, r) => sum + (r.bidsFound || 0), 0)
      },
      results: results
    };
  }
}

// Export for use in your commercial system
export { ApifyFacebookMonitor };

/**
 * COMMERCIAL USAGE:
 * 
 * const monitor = new ApifyFacebookMonitor('your-apify-api-key');
 * const results = await monitor.monitorCustomerAuctions([
 *   { id: 'auction-123', url: 'facebook-url', customerId: 'customer-001' }
 * ]);
 * 
 * This gets REAL Facebook comments and extracts REAL bids!
 */