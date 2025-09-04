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

  // Strategy 1: Advanced DOM scraping with multiple selectors
  private async extractBidsAdvanced(page: any): Promise<{ bids: number[], comments: string[] }> {
    return await page.evaluate(() => {
      const allBids: number[] = [];
      const allComments: string[] = [];
      
      // Strategy 1: Look for text nodes containing just numbers (bid pattern)
      const textNodes = document.evaluate(
        '//text()[normalize-space(.) != ""]',
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      
      for (let i = 0; i < textNodes.snapshotLength; i++) {
        const textNode = textNodes.snapshotItem(i);
        if (textNode && textNode.textContent) {
          const text = textNode.textContent.trim();
          
          // Check if it's a potential bid (just a number between 1-500)
          const bidMatch = text.match(/^(\d{1,3})$/);
          if (bidMatch) {
            const bid = parseInt(bidMatch[1]);
            if (bid >= 5 && bid <= 500) { // Realistic auction bid range
              allBids.push(bid);
              allComments.push(text);
            }
          }
          
          // Also check for currency format ($50, 50$, etc.)
          const currencyMatch = text.match(/^\$?(\d{1,3})\$?$/);
          if (currencyMatch) {
            const bid = parseInt(currencyMatch[1]);
            if (bid >= 5 && bid <= 500) {
              allBids.push(bid);
              allComments.push(text);
            }
          }
        }
      }

      // Strategy 2: Look in comment-like containers
      const commentSelectors = [
        '[data-testid*="comment"]',
        '[role="article"]',
        'div[dir="auto"]',
        'span[dir="auto"]',
        '.x1lliihq',
        '.x193iq5w',
        'div[data-ad-preview="message"]'
      ];
      
      commentSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          // Look for standalone numbers that could be bids
          const bidMatches = text.match(/\b(\d{1,3})\b/g);
          if (bidMatches) {
            bidMatches.forEach(match => {
              const bid = parseInt(match);
              if (bid >= 5 && bid <= 500) {
                allBids.push(bid);
                allComments.push(text);
              }
            });
          }
        });
      });

      // Strategy 3: Look for recent timestamp indicators to find newest comments
      const timeElements = document.querySelectorAll('*');
      const recentComments: Element[] = [];
      
      timeElements.forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('m') || text.includes('h') || text.includes('now') || 
            text.includes('min') || text.includes('sec')) {
          // Found a time indicator, look for nearby bid numbers
          const parent = el.closest('div') || el.parentElement;
          if (parent) {
            recentComments.push(parent);
          }
        }
      });

      // Extract bids from recent comment areas
      recentComments.forEach(container => {
        const containerText = container.textContent || '';
        const bidMatches = containerText.match(/\b(\d{1,3})\b/g);
        if (bidMatches) {
          bidMatches.forEach(match => {
            const bid = parseInt(match);
            if (bid >= 5 && bid <= 500) {
              allBids.push(bid);
              allComments.push(containerText.substring(0, 100));
            }
          });
        }
      });

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
      
      if (result.bids.length === 0) {
        console.log(`🔍 No bids detected. Trying alternative strategy...`);
        
        // Alternative: Get all text content and parse manually
        const allText = await page.evaluate(() => document.body.textContent || '');
        const numbers = allText.match(/\b(\d{1,3})\b/g) || [];
        const potentialBids = numbers
          .map(n => parseInt(n))
          .filter(n => n >= 5 && n <= 500)
          .filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
        
        if (potentialBids.length > 0) {
          console.log(`🎯 Alternative detection found: [${potentialBids.join(', ')}]`);
          result.bids.push(...potentialBids);
        }
      }
      
      // Calculate results
      const allBids = result.bids.filter(bid => bid > 0);
      const currentBid = allBids.length > 0 ? Math.max(...allBids) : null;
      const uniqueBidders = new Set(allBids).size;
      
      console.log(`🏆 HIGHEST BID DETECTED: $${currentBid || 'None'}`);
      console.log(`👥 UNIQUE BIDDERS: ${uniqueBidders}`);
      console.log(`📈 ALL BIDS: [${allBids.join(', ')}]`);
      
      return {
        currentBid,
        bidCount: allBids.length,
        comments: result.comments.slice(0, 10)
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