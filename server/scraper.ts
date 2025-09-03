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
          '--disable-gpu'
        ]
      });
      console.log('Browser initialized for auction scraping');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async scrapeFacebookPost(url: string): Promise<{ currentBid: string; bidCount: number } | null> {
    if (!this.browser) await this.init();
    
    try {
      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to Facebook post
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await page.waitForTimeout(2000);
      
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
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          const amount = parseFloat(match[1] || match[0].replace('$', ''));
          if (amount > highestBid) {
            highestBid = amount;
          }
          bidCount++;
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

  async scrapeGenericAuction(url: string): Promise<{ currentBid: string; bidCount: number } | null> {
    if (!this.browser) await this.init();
    
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
              console.log(`Bid updated for auction ${auction.id}: $${existingBidFloat} -> $${currentBidFloat}`);
              
              await storage.updateAuction(auction.id, {
                currentBid: update.currentBid,
                updatedAt: new Date()
              });
              
              updatedBids.push(update);
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