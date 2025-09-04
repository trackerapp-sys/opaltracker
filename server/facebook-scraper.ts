// Real Facebook post scraper to get actual current bids
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export class FacebookScraper {
  private browser: any = null;

  async initialize() {
    try {
      console.log("🔧 Initializing Facebook scraper...");
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage'
        ]
      });
      console.log("✅ Facebook scraper initialized");
    } catch (error) {
      console.error("❌ Failed to initialize scraper:", error);
      throw error;
    }
  }

  async scrapeFacebookPost(url: string): Promise<{ currentBid: number | null, bidCount: number, comments: string[] }> {
    if (!this.browser) {
      await this.initialize();
    }

    // Clean URL to prevent duplication issues
    const cleanUrl = url.includes('/https://') 
      ? url.substring(0, url.lastIndexOf('/https://'))
      : url;

    const page = await this.browser.newPage();
    
    try {
      console.log(`🔍 Scraping Facebook post: ${cleanUrl}`);
      
      // Set user agent to look like a real browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      
      // Navigate to the Facebook post
      await page.goto(cleanUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract all comments from the page
      const comments = await page.evaluate(() => {
        // Look for comment containers (Facebook uses various selectors)
        const commentSelectors = [
          '[data-testid="comment"]',
          '[role="article"]',
          '.x1iorvi4', // Common Facebook comment class
          '.x1n2onr6', // Another comment class
          'div[dir="auto"]' // Generic text containers
        ];
        
        const allComments: string[] = [];
        
        commentSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(element => {
            const text = element.textContent?.trim();
            if (text && text.length > 0 && text.length < 200) {
              allComments.push(text);
            }
          });
        });
        
        return allComments;
      });
      
      console.log(`📝 Found ${comments.length} potential comments/text elements`);
      
      // Parse comments for bid amounts
      const bids = this.extractBidsFromComments(comments);
      
      const result = {
        currentBid: bids.length > 0 ? Math.max(...bids) : null,
        bidCount: bids.length,
        comments: comments.slice(0, 10) // Return first 10 comments for debugging
      };
      
      console.log(`💰 Extracted bids: [${bids.join(', ')}]`);
      console.log(`🏆 Highest bid: $${result.currentBid || 'No bids found'}`);
      console.log(`📊 Total unique bidders: ${new Set(bids).size}`);
      console.log(`📈 All bid amounts found: ${Array.from(new Set(bids)).sort((a, b) => b - a).join(', ')}`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ Error scraping Facebook post: ${error}`);
      return { currentBid: null, bidCount: 0, comments: [] };
    } finally {
      await page.close();
    }
  }

  private extractBidsFromComments(comments: string[]): number[] {
    const bids: number[] = [];
    
    // Common bid patterns in opal auction comments
    const bidPatterns = [
      /^\$?(\d+(?:\.\d{2})?)$/,           // "$45" or "45" or "45.00"
      /^(\d+(?:\.\d{2})?)\s*dollars?$/i,   // "45 dollars"
      /^bid\s*:?\s*\$?(\d+(?:\.\d{2})?)$/i, // "bid: $45" or "bid 45"
      /^(\d+(?:\.\d{2})?)\s*usd$/i,        // "45 USD"
      /^(\d+(?:\.\d{2})?)\s*aud$/i,        // "45 AUD"
      /^I\s+bid\s+\$?(\d+(?:\.\d{2})?)$/i, // "I bid $45"
      /^\$?(\d+(?:\.\d{2})?)\s*please$/i,  // "$45 please"
      /^(\d+(?:\.\d{2})?)\s*thanks?$/i,    // "45 thanks"
      /^(\d+(?:\.\d{2})?)\s*!+$/,          // "45!!!"
      /\$?(\d+(?:\.\d{2})?)\s*(?:for|on)\s+(?:this|it)/i, // "$45 for this"
      /^(\d+(?:\.\d{2})?)\s*if\s+(?:still|available)/i    // "45 if still available"
    ];
    
    comments.forEach(comment => {
      const trimmed = comment.trim();
      
      for (const pattern of bidPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const bidAmount = parseFloat(match[1]);
          if (bidAmount > 0 && bidAmount < 100000) { // Reasonable bid range
            bids.push(bidAmount);
            console.log(`💰 Found bid: $${bidAmount} from comment: "${trimmed}"`);
            break; // Move to next comment after finding a bid
          }
        }
      }
    });
    
    return bids;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("🔒 Facebook scraper closed");
    }
  }
}

export const facebookScraper = new FacebookScraper();