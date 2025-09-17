import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface CommentBid {
  amount: number;
  commentText: string;
  bidderName: string;
  timestamp: Date;
  isValid: boolean;
}

export class FacebookCommentMonitor {
  private browser: any = null;

  async init() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security'
        ]
      });
      console.log('✅ Comment monitor browser initialized');
    } catch (error) {
      console.error('❌ Failed to initialize comment monitor:', error);
      this.browser = null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Check if text is likely a Facebook UI element (not a real comment)
  isFacebookUIElement(text: string): boolean {
    const uiPatterns = [
      /^(log in|forgotten|create new|see more|like|reply|share)$/i,
      /^(short video|yvette walker|jun|ago)$/i,
      /^(australian opal trading post)$/i,
      /^(facebook|www\.|http)/i,
      /^(forgotten password|or)$/i,
      // Filter out date/time patterns
      /\d+\s*(jun|jul|aug|sep|oct|nov|dec|jan|feb|mar|apr|may)\s*\d*/i,
      // Filter out video metadata
      /short video.*yvette walker/i,
      // Filter out page names
      /australian opal trading post/i,
      // Filter out navigation elements
      /see more on facebook/i
    ];
    
    return uiPatterns.some(pattern => pattern.test(text.trim()));
  }

  // Extract bid amount from a single comment
  extractBidFromComment(commentText: string): number | null {
    const text = commentText.trim().toLowerCase();
    
    // Skip if too long (probably not a simple bid)
    if (text.length > 200) return null;
    
    // Enhanced bid patterns - optimized for Facebook auction comments
    const patterns = [
      // Standalone numbers (most common format for Facebook auctions)
      /^(\d{1,4}(?:\.\d{1,2})?)$/,
      // Standard formats: "bid 25", "offer 25", "take 25", "25 bid"
      /(?:bid|offer|take|i bid|my bid)\s*:?\s*\$?(\d{1,4}(?:\.\d{1,2})?)/i,
      /(\d{1,4}(?:\.\d{1,2})?)\s*(?:bid|offer)/i,
      // Dollar formats: "$25", "$25.50", "$ 25"
      /\$\s*(\d{1,4}(?:\.\d{1,2})?)/,
      // Number + currency: "25 dollars", "25 bucks", "25$"
      /(\d{1,4}(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/i,
      // More natural language: "I'll go 85", "85 for me", "I'll pay 25"
      /(?:go|for|pay|take)\s+(\d{1,4})/i,
      /(\d{1,4})\s*(?:for me|please|thanks)/i,
      // Any number in reasonable range for short comments
      text.length <= 20 ? /\b(\d{2,4})\b/ : null
    ].filter(p => p !== null);

    for (const pattern of patterns) {
      const match = text.match(pattern!);
      if (match) {
        const amount = parseFloat(match[1]);
        // Expanded reasonable bid range to handle higher bids
        if (amount >= 5 && amount <= 2000) {
          return amount;
        }
      }
    }

    return null;
  }

  // Check if a bid is valid based on current auction state
  isValidBid(bidAmount: number, currentHighest: number, startingBid: number): boolean {
    // Must be higher than current highest (or starting bid if no bids yet)
    const minimumBid = Math.max(currentHighest, startingBid);
    
    if (bidAmount <= minimumBid) {
      console.log(`🚫 Bid $${bidAmount} rejected - not higher than minimum $${minimumBid}`);
      return false;
    }

    // Reasonable increase check (no more than $100 jump)
    if (currentHighest > 0 && bidAmount > currentHighest + 100) {
      console.log(`🚫 Bid $${bidAmount} rejected - too large increase from $${currentHighest}`);
      return false;
    }

    // Must be reasonable range
    if (bidAmount < 1 || bidAmount > 999) {
      console.log(`🚫 Bid $${bidAmount} rejected - outside valid range`);
      return false;
    }

    return true;
  }

  // Monitor Facebook post for new bids
  async checkForNewBids(postUrl: string, currentHighest: number, startingBid: number): Promise<CommentBid[]> {
    if (!this.browser) {
      await this.init();
      if (!this.browser) {
        console.log('❌ Browser not available for comment monitoring');
        return [];
      }
    }

    // Check if browser is still connected
    try {
      const pages = await this.browser.pages();
      if (pages.length === 0) {
        console.log('🔄 Browser disconnected, reinitializing...');
        await this.close();
        await this.init();
        if (!this.browser) {
          console.log('❌ Failed to reinitialize browser');
          return [];
        }
      }
    } catch (error) {
      console.log('🔄 Browser connection lost, reinitializing...');
      await this.close();
      await this.init();
      if (!this.browser) {
        console.log('❌ Failed to reinitialize browser');
        return [];
      }
    }

    // Clean URL if malformed
    const cleanUrl = postUrl.includes('/https://') 
      ? postUrl.substring(0, postUrl.lastIndexOf('/https://'))
      : postUrl;

    console.log(`🔍 Checking comments on: ${cleanUrl}`);
    console.log(`📊 Current state: highest=$${currentHighest}, starting=$${startingBid}`);

    try {
      let page;
      try {
        page = await this.browser.newPage();
      } catch (pageError) {
        console.log('🔄 Failed to create page, reinitializing browser...');
        await this.close();
        await this.init();
        if (!this.browser) {
          console.log('❌ Failed to reinitialize browser');
          return [];
        }
        page = await this.browser.newPage();
      }
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait longer for comments to load

      // Check if we're on a login page
      const pageTitle = await page.title();
      if (pageTitle.toLowerCase().includes('log in') || pageTitle.toLowerCase().includes('facebook')) {
        console.log('⚠️ Facebook login page detected - comments may not be accessible');
        console.log('💡 Try using the Chrome extension for direct browser access');
      }

      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Debug: Check if we can see any comment-related elements
      const hasComments = $('[data-testid*="comment"], [role*="comment"], .UFIComment').length > 0;
      console.log(`🔍 Page analysis: ${hasComments ? 'Comments detected' : 'No comments found'}`);

      const foundBids: CommentBid[] = [];
      const allCommentTexts: string[] = [];

      // Facebook comment selectors - focus on actual comment text
      const commentSelectors = [
        '[data-testid="UFI2Comment"] [dir="auto"]',    // Modern comments
        '[role="comment"] [dir="auto"]',               // Comment role
        '.UFICommentBody',                             // Legacy comments
        '[data-testid="comment"] [dir="auto"]',        // Generic comments
        // More specific comment text selectors
        '[data-testid="UFI2Comment"] span[dir="auto"]',
        '[role="comment"] span[dir="auto"]',
        '.UFICommentBody span',
        // Comment text within comment containers
        '[data-testid*="comment"] span:not([class*="link"]):not([class*="name"])',
        '[role*="comment"] span:not([class*="link"]):not([class*="name"])'
      ];

      // Look for all text elements that might contain bids
      const allTextElements = $('*').filter(function() {
        const text = $(this).text().trim();
        return text.length > 0 && text.length < 50 && /\d/.test(text);
      });

      console.log(`🔍 Found ${allTextElements.length} text elements with numbers`);

      allTextElements.each((_, element) => {
        const commentText = $(element).text().trim();
        
        // Collect all text for debugging
        if (commentText.length > 0 && commentText.length < 200) {
          allCommentTexts.push(commentText);
        }
        
        // Process text that looks like bids (numbers only or very short)
        if (commentText.length > 0 && commentText.length < 20 && 
            !this.isFacebookUIElement(commentText)) {
          const bidAmount = this.extractBidFromComment(commentText);
          
          if (bidAmount !== null) {
            // Simplified bidder name detection - look for "Yvette Walker" or similar
            let bidderName = 'Unknown';
            
            // Look for the bidder name in nearby elements
            const $element = $(element);
            const nearbyText = $element.parent().parent().text();
            
            if (nearbyText.includes('Yvette Walker')) {
              bidderName = 'Yvette Walker';
            } else if (nearbyText.includes('Walker')) {
              bidderName = 'Yvette Walker';
            } else {
              // Try to extract any name-like text
              const nameMatch = nearbyText.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
              if (nameMatch) {
                bidderName = nameMatch[1];
              }
            }
            
            // Don't validate yet - collect all bids first, then find highest
            foundBids.push({
              amount: bidAmount,
              commentText: commentText.substring(0, 50),
              bidderName: bidderName.substring(0, 50),
              timestamp: new Date(),
              isValid: false // Will be set later for the highest bid only
            });

            console.log(`📝 Found bid: $${bidAmount} from: "${bidderName}" (${commentText.substring(0, 30)}...)`);
          }
        }
      });

      try {
        await page.close();
      } catch (closeError) {
        console.log('⚠️ Error closing page:', closeError);
      }

      // NEW LOGIC: Track any valid bid found in comments, not just higher ones
      // This allows tracking of bids that might be lower than starting bid
      const allBidAmounts = foundBids.map(bid => bid.amount);
      const absoluteHighest = allBidAmounts.length > 0 ? Math.max(...allBidAmounts) : 0;
      
      console.log(`🔍 All detected bids: [${allBidAmounts.join(', ')}]`);
      console.log(`🎯 Absolute highest bid found: $${absoluteHighest}`);
      console.log(`📊 Current database bid: $${currentHighest}`);
      
      // Return the highest bid found if it's reasonable and different from current
      let finalValidBids: CommentBid[] = [];
      if (absoluteHighest >= 10 && absoluteHighest <= 500) { // Reasonable bid range
        // Find the bid entry with the highest amount
        const highestBidEntry = foundBids.find(bid => bid.amount === absoluteHighest);
        if (highestBidEntry) {
          highestBidEntry.isValid = true;
          finalValidBids = [highestBidEntry];
          console.log(`✅ TRACKING HIGHEST BID: $${absoluteHighest} from "${highestBidEntry.bidderName}"`);
          console.log(`📊 This will update from current: $${currentHighest}`);
        }
      } else {
        console.log(`⚪ No reasonable bids found (highest: $${absoluteHighest})`);
      }

      // Enhanced debug logging to help troubleshoot
      console.log(`📄 Found ${allCommentTexts.length} text elements total`);
      
      // Show ALL text that might contain bids
      const potentialBids = allCommentTexts.filter(text => 
        /\d/.test(text) && text.length < 50
      );
      
      if (potentialBids.length > 0) {
        console.log('🔍 Text containing numbers (potential bids):');
        potentialBids.slice(0, 15).forEach((text, i) => {
          const testBid = this.extractBidFromComment(text);
          console.log(`  ${i + 1}. "${text}" → ${testBid ? `$${testBid}` : 'no bid'}`);
        });
      }
      
      if (allCommentTexts.length > 0) {
        console.log('📝 All text elements found:');
        allCommentTexts.slice(0, 20).forEach((text, i) => {
          console.log(`  ${i + 1}. "${text.substring(0, 80)}${text.length > 80 ? '...' : ''}"`);
        });
      } else {
        console.log('❌ No text content found - Facebook may be blocking automated access');
        console.log('💡 Try using the Chrome extension for direct browser access');
      }
      
      console.log(`📈 Found ${finalValidBids.length} valid bids out of ${foundBids.length} total`);
      
      return finalValidBids;

    } catch (error) {
      console.error('❌ Error checking comments:', error);
      return [];
    }
  }

  // Get the highest valid bid from comments
  async getHighestBid(postUrl: string, currentHighest: number, startingBid: number): Promise<number | null> {
    const bids = await this.checkForNewBids(postUrl, currentHighest, startingBid);
    return bids.length > 0 ? bids[0].amount : null;
  }
}

export const commentMonitor = new FacebookCommentMonitor();