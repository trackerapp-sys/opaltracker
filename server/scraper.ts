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
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const content = await page.content();
      const $ = cheerio.load(content);
      
      // Facebook bid detection patterns
      const bidPatterns = [
        /\$(\d+(?:\.\d{2})?)/g,  // $123.45
        /(\d+(?:\.\d{2})?)\s*dollars?/gi,  // 123 dollars
        /bid:?\s*\$?(\d+(?:\.\d{2})?)/gi,  // bid: $123
        /current:?\s*\$?(\d+(?:\.\d{2})?)/gi,  // current: $123
      ];
      
      const text = $.text();
      let highestBid = 0;
      let bidCount = 0;
      
      // Extract all potential bid amounts
      for (const pattern of bidPatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(text)) !== null) {
          const matchText = match[0];
          const amount = parseFloat(match[1] || match[0].replace('$', ''));
          
          // Skip obvious non-bid patterns like "bid029", "bid123", etc.
          if (/bid\d+/i.test(matchText) && !/\$/.test(matchText)) {
            console.log(`⚠️ Skipping non-currency pattern: "${matchText}"`);
            continue;
          }
          
          // Filter out unreasonably large amounts (over $500) that are likely not auction bids
          if (amount >= 1 && amount <= 500) {
            console.log(`🔍 Found potential bid: $${amount} from: "${matchText}"`);
            if (amount > highestBid) {
              highestBid = amount;
            }
            bidCount++;
          } else if (amount > 500) {
            console.log(`⚠️ Ignoring large amount: $${amount} (likely not a bid)`);
          }
          if (!pattern.global) break;
        }
      }
      
      await page.close();
      
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
        '[data-testid="UFI2Comment"]'   // Comments
      ];
      
      for (const selector of postSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          postContent += element.text() + ' ';
          console.log(`📋 Found content section: ${selector} (${element.text().length} chars)`);
        }
      }
      
      // If no specific selectors found, fall back to full text but log it
      const text = postContent.length > 100 ? postContent : $.text();
      console.log(`📝 Analyzing text content: ${text.length} characters`);
      
      // Enhanced bid detection patterns for Facebook - more restrictive
      const bidPatterns = [
        // Dollar signs with reasonable amounts only (most restrictive first)
        /\$(\d{1,3}(?:\.\d{2})?)/g,
        // Most specific - bid with context (but avoid "bid029" patterns)
        /(?:bid|offer|take)\s*:?\s*\$?(\d{1,3}(?:\.\d{2})?)(?!\d)/gi,
        // Numbers with "dollars" context
        /(\d{1,3}(?:\.\d{2})?)\s*dollars?/gi
      ];
      let highestBid = 0;
      let bidCount = 0;
      
      // Extract all potential bid amounts
      for (const pattern of bidPatterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(text)) !== null) {
          const matchText = match[0];
          const amount = parseFloat(match[1] || match[0].replace('$', ''));
          
          // Skip obvious non-bid patterns like "bid029", "bid123", etc.
          if (/bid\d+/i.test(matchText) && !/\$/.test(matchText)) {
            console.log(`⚠️ Skipping non-currency pattern: "${matchText}"`);
            continue;
          }
          
          // Filter out unreasonably large amounts (over $500) that are likely not auction bids
          if (amount >= 1 && amount <= 500) {
            console.log(`🔍 Found potential bid: $${amount} from: "${matchText}"`);
            if (amount > highestBid) {
              highestBid = amount;
            }
            bidCount++;
          } else if (amount > 500) {
            console.log(`⚠️ Ignoring large amount: $${amount} (likely not a bid)`);
          }
          if (!pattern.global) break;
        }
      }
      
      if (highestBid > 0) {
        console.log(`✅ Found highest bid via HTTP fallback: $${highestBid} from ${bidCount} total bids`);
        console.log(`📊 Content source: ${postContent.length > 100 ? 'Post-specific content' : 'Full page content'}`);
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
        const bidPatterns = [
          /current\s*bid:?\s*\$?(\d+(?:\.\d{2})?)/gi,
          /highest\s*bid:?\s*\$?(\d+(?:\.\d{2})?)/gi,
          /\$(\d+(?:\.\d{2})?)/g
        ];
        
        for (const pattern of bidPatterns) {
          const match = text.match(pattern);
          if (match) {
            const amount = match[1] || match[0].replace('$', '');
            if (parseFloat(amount) > 0) {
              currentBid = amount;
              break;
            }
          }
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
            
            // Only update if the bid has increased
            if (currentBidFloat > existingBidFloat) {
              console.log(`✅ Bid updated for auction ${auction.id}: $${existingBidFloat} -> $${currentBidFloat}`);
              
              const updateResult = await storage.updateAuction(auction.id, {
                currentBid: update.currentBid
              });
              
              if (updateResult) {
                console.log(`✅ Database updated successfully for auction ${auction.id}`);
                updatedBids.push(update);
              } else {
                console.log(`❌ Failed to update database for auction ${auction.id}`);
              }
            } else {
              console.log(`📊 No bid change for auction ${auction.id}: Current $${currentBidFloat} vs Existing $${existingBidFloat}`);
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