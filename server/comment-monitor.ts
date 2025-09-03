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

  // Extract bid amount from a single comment
  extractBidFromComment(commentText: string): number | null {
    const text = commentText.trim().toLowerCase();
    
    // Skip if too long (probably not a simple bid)
    if (text.length > 100) return null;
    
    // Enhanced bid patterns - more aggressive detection
    const patterns = [
      // Standard formats: "bid 25", "offer 25", "take 25"
      /(?:bid|offer|take|i bid|my bid)\s*:?\s*\$?(\d{1,3}(?:\.\d{1,2})?)/i,
      // Dollar formats: "$25", "$25.50", "$ 25"
      /\$\s*(\d{1,3}(?:\.\d{1,2})?)/,
      // Number + currency: "25 dollars", "25 bucks", "25$"
      /(\d{1,3}(?:\.\d{1,2})?)\s*(?:dollars?|bucks?|\$)/i,
      // Standalone numbers (if comment is short and looks like just a bid)
      text.length <= 15 ? /^(\d{1,3}(?:\.\d{1,2})?)$/ : null,
      // More natural language: "I'll go 85", "85 for me"
      /(?:go|for|pay)\s+(\d{1,3})/i,
      // Any number in reasonable range (broader search)
      /\b(\d{2,3})\b/
    ].filter(p => p !== null);

    for (const pattern of patterns) {
      const match = text.match(pattern!);
      if (match) {
        const amount = parseFloat(match[1]);
        // Reasonable bid range
        if (amount >= 10 && amount <= 500) {
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
      const allCommentTexts: string[] = [];

      // Facebook comment selectors - focus on actual comment text
      const commentSelectors = [
        '[data-testid="UFI2Comment"] [dir="auto"]',    // Modern comments
        '[role="comment"] [dir="auto"]',               // Comment role
        '.UFICommentBody',                             // Legacy comments
        '[data-testid="comment"] [dir="auto"]',        // Generic comments
        '[dir="auto"]'                                 // All auto-direction text (broader search)
      ];

      commentSelectors.forEach(selector => {
        $(selector).each((_, element) => {
          const commentText = $(element).text().trim();
          
          // Collect all text for debugging
          if (commentText.length > 0 && commentText.length < 200) {
            allCommentTexts.push(commentText);
          }
          
          // Only process short, comment-like text
          if (commentText.length > 0 && commentText.length < 100) {
            const bidAmount = this.extractBidFromComment(commentText);
            
            if (bidAmount !== null) {
              // Enhanced bidder name detection with more Facebook selectors
              let bidderName = 'Unknown';
              
              // Try multiple strategies to find the bidder name
              const nameSelectors = [
                // Modern Facebook comment structures
                '[data-testid="UFI2Comment"] a[role="link"]',
                '[role="comment"] a[role="link"]',
                '[data-testid="comment_author"]',
                // Legacy structures
                '.UFICommentActorName',
                '.profileLink',
                '.actorName',
                // Generic approaches
                'a[href*="/user/"]',
                'a[href*="facebook.com/"]',
                // Broader search within comment containers
                '[data-testid*="comment"] a',
                '[role*="comment"] a'
              ];
              
              // Look for comment container first
              const commentContainer = $(element).closest([
                '[data-testid="UFI2Comment"]',
                '[role="comment"]', 
                '.UFIComment',
                '[data-testid*="comment"]'
              ].join(', '));
              
              if (commentContainer.length > 0) {
                // Try each selector within the comment container
                for (const selector of nameSelectors) {
                  const nameElement = commentContainer.find(selector).first();
                  if (nameElement.length > 0) {
                    const nameText = nameElement.text().trim();
                    if (nameText && nameText.length > 0 && nameText.length < 100 && 
                        !nameText.includes('http') && !nameText.includes('www.') &&
                        !nameText.match(/^\d+$/)) { // Not just numbers
                      bidderName = nameText;
                      break;
                    }
                  }
                }
              }
              
              // Fallback: scan all nearby links
              if (bidderName === 'Unknown') {
                const nearbyLinks = $(element).parent().parent().find('a');
                for (let i = 0; i < Math.min(nearbyLinks.length, 5); i++) {
                  const linkText = $(nearbyLinks[i]).text().trim();
                  if (linkText && linkText.length > 1 && linkText.length < 50 && 
                      !linkText.includes('http') && !linkText.includes('ago') &&
                      !linkText.match(/^\d+$/) && !linkText.includes('Like') &&
                      !linkText.includes('Reply')) {
                    bidderName = linkText;
                    break;
                  }
                }
              }
              
              // Don't validate yet - collect all bids first, then find highest
              foundBids.push({
                amount: bidAmount,
                commentText: commentText.substring(0, 50),
                bidderName: bidderName.substring(0, 50), // Limit name length
                timestamp: new Date(),
                isValid: false // Will be set later for the highest bid only
              });

              console.log(`📝 Found bid: $${bidAmount} from: "${bidderName}" (${commentText.substring(0, 30)}...)`);
            }
          }
        });
      });

      await page.close();

      // NEW LOGIC: Find the absolute highest bid regardless of current state
      // First, get all detected bid amounts
      const allBidAmounts = foundBids.map(bid => bid.amount);
      const absoluteHighest = allBidAmounts.length > 0 ? Math.max(...allBidAmounts) : 0;
      
      console.log(`🔍 All detected bids: [${allBidAmounts.join(', ')}]`);
      console.log(`🎯 Absolute highest bid found: $${absoluteHighest}`);
      console.log(`📊 Current database bid: $${currentHighest}`);
      
      // Only return the highest bid if it's actually higher than current
      let finalValidBids: CommentBid[] = [];
      if (absoluteHighest > currentHighest && absoluteHighest >= startingBid) {
        // Find the bid entry with the highest amount
        const highestBidEntry = foundBids.find(bid => bid.amount === absoluteHighest);
        if (highestBidEntry) {
          highestBidEntry.isValid = true; // Mark as valid since it's the highest
          finalValidBids = [highestBidEntry];
          console.log(`✅ NEW HIGHEST BID: $${absoluteHighest} from "${highestBidEntry.bidderName}"`);
        }
      } else if (absoluteHighest <= currentHighest) {
        console.log(`⚪ Highest found ($${absoluteHighest}) not greater than current ($${currentHighest})`);
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