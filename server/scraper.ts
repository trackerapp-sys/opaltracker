import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { storage } from './storage';

export interface BidUpdate {
  auctionId: string;
  currentBid: string;
  bidCount?: number;
  lastUpdated: Date;
}

export class AuctionScraper {
  private browser: any = null;

  async init() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection'
        ],
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
      });
      console.log('✅ Browser initialized successfully for auction scraping');
    } catch (error) {
      console.error('❌ Failed to initialize browser:', error);
      console.log('🔄 Falling back to cheerio-only mode for web scraping');
      this.browser = null;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  extractBidsFromText(text: string): { highestBid: number; bidCount: number } {
    // Clean the text to focus on potential bid content
    const cleanText = text
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/[^\w\s\$\.\,]/g, ' ')  // Remove special chars except $ . ,
      .trim();

    console.log(`📝 Analyzing text (${cleanText.length} chars): "${cleanText.substring(0, 100)}..."`);    
    
    // Skip if this looks like a data dump or list (too many sequential numbers)
    const numbers = cleanText.match(/\b\d{1,3}\b/g) || [];
    if (numbers.length > 10) {
      console.log(`⚠️ Skipping text with too many numbers (${numbers.length}) - likely not comment content`);
      return { highestBid: 0, bidCount: 0 };
    }
    
    // Check for sequential numbers (indicates data table/list, not comments)
    const sortedNumbers = numbers.map(n => parseInt(n)).sort((a, b) => a - b);
    let sequentialCount = 0;
    for (let i = 1; i < sortedNumbers.length; i++) {
      if (sortedNumbers[i] - sortedNumbers[i-1] === 1) {
        sequentialCount++;
      }
    }
    if (sequentialCount > 5) {
      console.log(`⚠️ Skipping text with ${sequentialCount} sequential numbers - likely data table`);
      return { highestBid: 0, bidCount: 0 };
    }
    
    // Facebook comment-focused bid detection
    const bidPatterns = [
      // Explicit bid context - highest priority
      { pattern: /(?:bid|current bid|highest bid|offer|take)\s*:?\s*\$(\d{1,4}(?:\.\d{1,2})?)/gi, priority: 1 },
      { pattern: /(?:bid|current bid|highest bid|offer|take)\s*:?\s*(\d{1,4}(?:\.\d{1,2})?)(?!\d)/gi, priority: 1 },
      // Dollar amounts in comment context
      { pattern: /(?:^|\s)\$(\d{1,4}(?:\.\d{1,2})?)(?=\s|$|[!\.,])/g, priority: 2 },
      { pattern: /(?:^|\s)\$(\d{1,4})(?=\s|$|[!\.,])/g, priority: 3 },
      // Standalone numbers in Facebook comment format (most common)
      { pattern: cleanText.length < 50 ? /(?:^|\s)(\d{2,4})(?=\s|$|[!\.,])/g : /(?!.*)/g, priority: 4 },
    ];

    const foundBids: Array<{ amount: number; source: string; priority: number }> = [];

    for (const { pattern, priority } of bidPatterns) {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      
      while ((match = regex.exec(cleanText)) !== null) {
        const matchText = match[0].trim();
        const amountStr = match[1];
        const amount = parseFloat(amountStr);

        // Skip invalid amounts
        if (isNaN(amount) || amount <= 0) {
          continue;
        }

        // Skip obvious non-bid patterns
        if (/bid\d+/i.test(matchText) && !/\$/.test(matchText)) {
          console.log(`⚠️ Skipping non-currency pattern: "${matchText}"`);
          continue;
        }

        // Skip unrealistic amounts (over $2000 for more accuracy)
        if (amount > 2000) {
          console.log(`⚠️ Ignoring large amount: $${amount} (likely not a bid)`);
          continue;
        }

        // Skip common non-bid numbers (years, phone numbers, etc.)
        if (/20\d{2}|19\d{2}|\d{4,}/.test(amountStr) || amount < 1) {
          console.log(`⚠️ Skipping invalid pattern: "${matchText}"`);
          continue;
        }

        // Skip amounts that are too low to be realistic bids
        if (amount < 5 && priority > 2) {
          console.log(`⚠️ Skipping small amount: $${amount} (priority ${priority})`);
          continue;
        }
        
        // Skip if we're finding too many bids (indicates data dump)
        if (foundBids.length > 5 && priority > 2) {
          console.log(`⚠️ Skipping excess bid: $${amount} (too many found already)`);
          continue;
        }

        // Skip common non-bid patterns
        if (matchText.includes('members') || matchText.includes('comments') || matchText.includes('March') || matchText.includes('2024') || matchText.includes('Message') || matchText.includes('Like') || matchText.includes('Reply') || matchText.includes('Share') || matchText.includes('Reserve price') || matchText.includes('AU$') || matchText.includes('ct') || matchText.includes('g /') || matchText.includes('increments')) {
          console.log(`⚠️ Skipping non-bid pattern: "${matchText}"`);
          continue;
        }

        // Skip specific false positives from logs
        if (amount === 5671 || amount === 2833 || amount === 2783 || amount === 1353 || amount === 1253 || amount === 603 || amount === 2053 || amount === 1503) {
          console.log(`⚠️ Skipping known false positive: $${amount}`);
          continue;
        }

        // Valid bid found
        if (amount >= 5 && amount <= 200) {
          console.log(`🔍 Found potential bid: $${amount} from: "${matchText}" (priority ${priority})`);
          foundBids.push({ amount, source: matchText, priority });
        }
      }
    }

    // Sort bids by priority (lower number = higher priority) then by amount
    foundBids.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.amount - a.amount;
    });

    // Remove duplicates and find highest
    const uniqueBids = foundBids.filter((bid, index, arr) => 
      arr.findIndex(b => b.amount === bid.amount) === index
    );

    const highestBid = uniqueBids.length > 0 ? Math.max(...uniqueBids.map(b => b.amount)) : 0;
    const bidCount = uniqueBids.length;

    if (highestBid > 0) {
      console.log(`✅ Highest bid found: $${highestBid} from ${bidCount} unique bids`);
      console.log(`📊 All bids: ${uniqueBids.map(b => `$${b.amount}`).join(', ')}`);
    }

    return { highestBid, bidCount };
  }

  async scrapeFacebookPost(url: string): Promise<{ currentBid: string; bidCount: number } | null> {
    if (!this.browser) {
      await this.init();
      if (!this.browser) {
        console.log('🔄 Browser unavailable, using fallback HTTP request for:', url);
        return this.scrapeFacebookPostFallback(url);
      }
    }
    
    try {
      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to Facebook post
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Focus on specific post and comment content only
      let postContent = '';
      
      // Enhanced selectors for Facebook post content and comments
      const postSelectors = [
        '[data-pagelet="FeedUnit_0"]',           // Main post content
        '[role="article"]',                      // Article content  
        '[data-testid="post_content"]',          // Post content
        '.userContentWrapper',                    // Legacy post wrapper
        '[data-testid="UFI2Comment"]',           // Comments
        '.UFICommentContent',                     // Comment content
        '.UFICommentBody',                        // Comment body
        '[role="comment"]',                      // Comment role
        '.comment',                               // Generic comment class
        '.fbUserContent',                         // User content
        '.userContent',                           // User content alt
      ];
      
      for (const selector of postSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          postContent += element.text() + ' ';
          console.log(`📋 Found content section: ${selector} (${element.text().length} chars)`);
        }
      }
      
      await page.close();
      
      // Extract bids from the focused content
      let text = postContent.length > 50 ? postContent : $.text();
      console.log(`📝 Using content: ${text.length} characters (${postContent.length > 50 ? 'post-specific' : 'full page'})`);
      
      const { highestBid, bidCount } = this.extractBidsFromText(text);
      
      if (highestBid > 0) {
        return {
          currentBid: highestBid.toString(),
          bidCount
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error scraping Facebook post:', error);
      return null;
    }
  }

  async scrapeFacebookPostFallback(url: string): Promise<{ currentBid: string; bidCount: number } | null> {
    try {
      console.log('🔄 Using HTTP fallback for Facebook post:', url);
      
      // Use fetch with proper headers to try to get content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        },
      });

      if (!response.ok) {
        console.log('⚠️ HTTP fallback failed, response not ok:', response.status);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Try to focus on specific post content and comments sections
      let postContent = '';
      
      // Try different selectors to find the main post and comments
      const postSelectors = [
        '[data-pagelet="FeedUnit_0"]',  // Main post content
        '[role="article"]',             // Article content
        '[data-testid="post_content"]', // Post content
        '.userContentWrapper',           // Legacy post wrapper
        '[data-testid="UFI2Comment"]',   // Comments
        '.UFICommentContent',            // Comment content
        '.UFICommentBody',               // Comment body
        '[role="comment"]',              // Comment role
        '.comment',                      // Generic comment class
        '.fbUserContent',                // User content
        '.userContent',                  // User content alt
      ];
      
      for (const selector of postSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          postContent += element.text() + ' ';
          console.log(`📋 Found content section: ${selector} (${element.text().length} chars)`);
        }
      }
      
      // Use post content if found, otherwise filter the full page text
      let text = '';
      if (postContent.length > 50) {
        text = postContent;
        console.log(`📝 Using post-specific content: ${text.length} characters`);
      } else {
        // Fall back but try to avoid navigation and sidebar content
        const bodyText = $('body').text();
        const excludePatterns = /(Home|News Feed|Profile|Settings|Marketplace|Groups|Pages|Create|Log Out|About|Friends|Photos|More)/gi;
        text = bodyText.replace(excludePatterns, ' ');
        console.log(`📝 Using filtered page content: ${text.length} characters`);
      }
      
      const { highestBid, bidCount } = this.extractBidsFromText(text);
      
      if (highestBid > 0) {
        console.log(`✅ Found highest bid via HTTP fallback: $${highestBid} from ${bidCount} total bids`);
        return {
          currentBid: highestBid.toString(),
          bidCount
        };
      }
      
      console.log('⚠️ No bids found via HTTP fallback');
      return null;
    } catch (error) {
      console.error('Error in fallback scraping:', error);
      return null;
    }
  }

  async scrapeGenericAuction(url: string): Promise<{ currentBid: string; bidCount: number } | null> {
    if (!this.browser) {
      await this.init();
      if (!this.browser) {
        console.log('🔄 Browser unavailable, using fallback HTTP request for generic auction:', url);
        return this.scrapeGenericAuctionFallback(url);
      }
    }
    
    try {
      const page = await this.browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Common auction site selectors
      const bidSelectors = [
        '.current-bid',
        '.bid-amount',
        '.price-current',
        '[data-testid="current-bid"]',
        '.auction-price',
        '.highest-bid'
      ];
      
      let currentBid = '';
      
      for (const selector of bidSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const match = text.match(/\$?(\d+(?:\.\d{2})?)/);
          if (match) {
            currentBid = match[1];
            break;
          }
        }
      }
      
      // Count bid elements for bid count
      const bidCountSelectors = [
        '.bid-count',
        '.total-bids',
        '[data-testid="bid-count"]'
      ];
      
      let bidCount = 0;
      for (const selector of bidCountSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const match = text.match(/(\d+)/);
          if (match) {
            bidCount = parseInt(match[1]);
            break;
          }
        }
      }
      
      await page.close();
      
      if (currentBid) {
        return {
          currentBid,
          bidCount
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error scraping generic auction:', error);
      return null;
    }
  }

  async scrapeGenericAuctionFallback(url: string): Promise<{ currentBid: string; bidCount: number } | null> {
    try {
      console.log('🔄 Using HTTP fallback for generic auction');
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        console.log('⚠️ HTTP fallback failed for generic auction:', response.status);
        return null;
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Enhanced bid detection for generic auction sites
      const bidSelectors = [
        '.current-bid',
        '.bid-amount', 
        '.price-current',
        '[data-testid="current-bid"]',
        '.auction-price',
        '.highest-bid',
        '.current-price'
      ];
      
      let currentBid = '';
      
      // Try specific selectors first
      for (const selector of bidSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          const text = element.text().trim();
          const match = text.match(/\$?(\d+(?:\.\d{2})?)/);
          if (match) {
            currentBid = match[1];
            break;
          }
        }
      }
      
      // If no specific selectors work, try pattern matching on full text
      if (!currentBid) {
        const text = $.text();
        const { highestBid } = this.extractBidsFromText(text);
        if (highestBid > 0) {
          currentBid = highestBid.toString();
        }
      }
      
      if (currentBid) {
        console.log('✅ Found bid via HTTP fallback for generic auction:', currentBid);
        return {
          currentBid,
          bidCount: 1
        };
      }
      
      console.log('⚠️ No bids found via HTTP fallback for generic auction');
      return null;
    } catch (error) {
      console.error('Error in fallback scraping for generic auction:', error);
      return null;
    }
  }

  async checkAuctionForUpdates(auctionId: string, url: string): Promise<BidUpdate | null> {
    try {
      let result = null;
      
      if (url.includes('facebook.com')) {
        result = await this.scrapeFacebookPost(url);
      } else {
        result = await this.scrapeGenericAuction(url);
      }
      
      if (result) {
        return {
          auctionId,
          currentBid: result.currentBid,
          bidCount: result.bidCount,
          lastUpdated: new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error checking auction ${auctionId}:`, error);
      return null;
    }
  }

  async updateAuctionBids(): Promise<BidUpdate[]> {
    try {
      // Get all active auctions with URLs
      const { auctions } = await storage.getAuctions({ status: 'active', limit: 100 });
      const updatedBids: BidUpdate[] = [];
      
      for (const auction of auctions) {
        if (auction.postUrl) {
          console.log(`Checking auction ${auction.id} at ${auction.postUrl}`);
          
          const update = await this.checkAuctionForUpdates(auction.id, auction.postUrl);
          
          if (update) {
            const currentBidFloat = parseFloat(update.currentBid);
            const existingBidFloat = parseFloat(auction.currentBid || auction.startingBid);
            
            // Only update if the bid has increased significantly (at least $1 difference)
            if (currentBidFloat > existingBidFloat + 0.99) {
              console.log(`✅ Bid updated for auction ${auction.id}: $${existingBidFloat} -> $${currentBidFloat}`);
              
              try {
                const updateResult = await storage.updateAuction(auction.id, {
                  currentBid: update.currentBid
                });
                
                if (updateResult) {
                  console.log(`✅ Database updated successfully for auction ${auction.id}`);
                  updatedBids.push(update);
                } else {
                  console.log(`❌ Failed to update database for auction ${auction.id}`);
                }
              } catch (error) {
                console.error(`❌ Error updating auction ${auction.id}:`, error);
              }
            } else {
              console.log(`📊 No significant bid change for auction ${auction.id}: Current $${currentBidFloat} vs Existing $${existingBidFloat}`);
            }
          }
          
          // Add delay between requests to be respectful
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return updatedBids;
    } catch (error) {
      console.error('Error updating auction bids:', error);
      return [];
    }
  }
}

export const auctionScraper = new AuctionScraper();