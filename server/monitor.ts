import * as cron from 'node-cron';
import { auctionScraper, BidUpdate } from './scraper';

export class AuctionMonitor {
  private isRunning = false;
  private cronJob: any = null;

  start() {
    if (this.isRunning) {
      console.log('Auction monitor is already running');
      return;
    }

    console.log('Starting auction monitor - checking every 3 minutes');
    
    // Schedule to run every 3 minutes
    this.cronJob = cron.schedule('*/3 * * * *', async () => {
      await this.checkAllAuctions();
    }, {
      scheduled: false
    });

    this.cronJob.start();
    this.isRunning = true;

    // Initialize browser on startup
    auctionScraper.init().catch(console.error);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('Auction monitor stopped');
    
    // Close browser
    auctionScraper.close().catch(console.error);
  }

  async checkAllAuctions(): Promise<BidUpdate[]> {
    if (!this.isRunning) return [];

    try {
      console.log('🔍 Checking all auctions for bid updates...');
      const updates = await auctionScraper.updateAuctionBids();
      
      if (updates.length > 0) {
        console.log(`✅ Found ${updates.length} bid updates:`);
        updates.forEach(update => {
          console.log(`  - Auction ${update.auctionId}: New bid $${update.currentBid}`);
        });
      } else {
        console.log('📊 No bid changes detected');
      }
      
      return updates;
    } catch (error) {
      console.error('❌ Error during auction monitoring:', error);
      return [];
    }
  }

  async manualCheck(): Promise<BidUpdate[]> {
    console.log('🔍 Manual auction check triggered...');
    return await this.checkAllAuctions();
  }

  getStatus() {
    return {
      running: this.isRunning,
      nextCheck: this.cronJob ? 'Every 3 minutes' : 'Not scheduled'
    };
  }
}

export const auctionMonitor = new AuctionMonitor();