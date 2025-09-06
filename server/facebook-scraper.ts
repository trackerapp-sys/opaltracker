// Advanced Facebook auction bid detector with multiple scraping strategies
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export class FacebookScraper {
  private browser: any = null;

  async initialize() {
    try {
      console.log("🔧 Initializing advanced Facebook scraper...");
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        ]
      });
      console.log("✅ Advanced Facebook scraper initialized");
    } catch (error) {
      console.error("❌ Failed to initialize scraper:", error);
      throw error;
    }
  }

  // FIXED: Only detect auction bid comments, ignore page elements
  private async extractBidsAdvanced(page: any): Promise<{ bids: number[], comments: string[] }> {
    return await page.evaluate(() => {
      const allBids: number[] = [];
      const allComments: string[] = [];
      
      // ONLY look for standalone numbers that look like auction bids
      // Focus on actual comment text, not page elements
      const elements = document.querySelectorAll('div, span, p');
      
      for (let i = 0; i < Math.min(elements.length, 100); i++) {
        const el = elements[i];
        const text = el.textContent?.trim() || '';
        
        // Only check very short text that could be bid comments
        if (text.length >= 1 && text.length <= 10) {
          // Look for JUST a number (potential bid)
          const match = text.match(/^(\d{1,3})$/);
          if (match) {
            const bid = parseInt(match[1]);
            // Only realistic auction bid range
            if (bid >= 20 && bid <= 100) {
              allBids.push(bid);
              allComments.push(text);
            }
          }
        }
      }

      // Remove all other strategies that cause false positives
      // Only use the targeted approach above

      return { bids: allBids, comments: allComments };
    });
  }

  // Strategy 2: Wait for dynamic content and try multiple times
  private async waitForDynamicContent(page: any, maxWaits: number = 3): Promise<void> {
    for (let i = 0; i < maxWaits; i++) {
      console.log(`🔄 Loading attempt ${i + 1}/${maxWaits}...`);
      
      // Wait for content
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to trigger more comment loading
      try {
        await page.evaluate(() => {
          // Scroll to trigger lazy loading
          window.scrollTo(0, document.body.scrollHeight);
          
          // Click potential "View more" buttons
          const buttons = document.querySelectorAll('div[role="button"], span[role="button"]');
          buttons.forEach((btn: any) => {
            const text = btn.textContent?.toLowerCase() || '';
            if (text.includes('view') || text.includes('more') || text.includes('comment') || 
                text.includes('show') || text.includes('load')) {
              try {
                btn.click();
              } catch (e) {
                // Ignore click errors
              }
            }
          });
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.log(`⚠️ Loading attempt ${i + 1} had issues, continuing...`);
      }
    }
  }

  async scrapeFacebookPost(url: string): Promise<{ currentBid: number | null, bidCount: number, comments: string[] }> {
    if (!this.browser) {
      await this.initialize();
    }

    // Clean URL to prevent duplication
    const cleanUrl = url.replace(/\/https:\/\/.*$/, '');
    
    console.log(`🎯 Advanced scraping: ${cleanUrl}`);
    
    const page = await this.browser.newPage();
    
    try {
      // Set realistic browser properties
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      
      // Add extra headers to look more authentic
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });
      
      console.log(`📡 Navigating to Facebook post...`);
      await page.goto(cleanUrl, { 
        waitUntil: 'networkidle0',
        timeout: 45000 
      });
      
      // Wait for and load dynamic content multiple times
      await this.waitForDynamicContent(page, 4);
      
      console.log(`🔍 Extracting bids with advanced detection...`);
      const result = await this.extractBidsAdvanced(page);
      
      console.log(`📊 Found ${result.bids.length} potential bid numbers: [${result.bids.join(', ')}]`);
      
      // No fallback to avoid picking up CSS/technical numbers
      if (result.bids.length === 0) {
        console.log(`🔍 No auction bids detected in comment areas`);
      }
      
      // Calculate results safely
      const allBids = result.bids.filter(bid => bid > 0 && bid <= 500);
      const uniqueBids = [...new Set(allBids)].sort((a, b) => b - a); // Remove duplicates and sort descending
      const currentBid = uniqueBids.length > 0 ? uniqueBids[0] : null;
      
      console.log(`🏆 HIGHEST BID DETECTED: $${currentBid || 'None'}`);
      console.log(`👥 UNIQUE BIDS FOUND: [${uniqueBids.slice(0, 10).join(', ')}]`);
      console.log(`📈 TOTAL BIDS: ${allBids.length}`);
      
      return {
        currentBid,
        bidCount: allBids.length,
        comments: result.comments.slice(0, 5) // Limit comments to prevent overflow
      };
      
    } catch (error) {
      console.error(`❌ Advanced scraping failed:`, error);
      return { currentBid: null, bidCount: 0, comments: [] };
    } finally {
      await page.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const facebookScraper = new FacebookScraper();