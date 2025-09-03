import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

export interface CommentBid {
  amount: number;
  commentText: string;
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

  // Extract bid amount from a single comment
  extractBidFromComment(commentText: string): number | null {
    const text = commentText.trim().toLowerCase();
    
    // Skip if too long (probably not a simple bid)
    if (text.length > 50) return null;
    
    // Common bid patterns in order of reliability
    const patterns = [
      // "bid 25", "offer 25", "take 25"
      /(?:bid|offer|take)\s*:?\s*\$?(\d{1,3}(?:\.\d{1,2})?)/i,
      // "$25", "$25.50"  
      /^\$(\d{1,3}(?:\.\d{1,2})?)$/,
      // Just "25", "25.50" (only if comment is very short)
      text.length < 10 ? /^(\d{1,3}(?:\.\d{1,2})?)$/ : null,
      // "25 dollars", "25 bucks"
      /^(\d{1,3}(?:\.\d{1,2})?)\s*(dollars?|bucks?)$/i
    ].filter(p => p !== null);

    for (const pattern of patterns) {
      const match = text.match(pattern!);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount >= 1 && amount <= 999) {
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

    // Clean URL if malformed
    const cleanUrl = postUrl.includes('/https://') 
      ? postUrl.substring(0, postUrl.lastIndexOf('/https://'))
      : postUrl;

    console.log(`🔍 Checking comments on: ${cleanUrl}`);
    console.log(`📊 Current state: highest=$${currentHighest}, starting=$${startingBid}`);

    try {
      const page = await this.browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for comments to load

      const content = await page.content();
      const $ = cheerio.load(content);

      const foundBids: CommentBid[] = [];

      // Facebook comment selectors - focus on actual comment text
      const commentSelectors = [
        '[data-testid="UFI2Comment"] [dir="auto"]',    // Modern comments
        '[role="comment"] [dir="auto"]',               // Comment role
        '.UFICommentBody',                             // Legacy comments
        '[data-testid="comment"] [dir="auto"]'         // Generic comments
      ];

      commentSelectors.forEach(selector => {
        $(selector).each((_, element) => {
          const commentText = $(element).text().trim();
          
          // Only process short, comment-like text
          if (commentText.length > 0 && commentText.length < 100) {
            const bidAmount = this.extractBidFromComment(commentText);
            
            if (bidAmount !== null) {
              const isValid = this.isValidBid(bidAmount, currentHighest, startingBid);
              
              foundBids.push({
                amount: bidAmount,
                commentText: commentText.substring(0, 50),
                timestamp: new Date(),
                isValid
              });

              if (isValid) {
                console.log(`✅ Valid bid: $${bidAmount} from: "${commentText.substring(0, 30)}..."`);
              } else {
                console.log(`⚠️ Invalid bid: $${bidAmount} from: "${commentText.substring(0, 30)}..."`);
              }
            }
          }
        });
      });

      await page.close();

      // Return only valid bids, sorted by amount (highest first)
      const validBids = foundBids.filter(bid => bid.isValid);
      validBids.sort((a, b) => b.amount - a.amount);

      console.log(`📈 Found ${validBids.length} valid bids out of ${foundBids.length} total`);
      
      return validBids;

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