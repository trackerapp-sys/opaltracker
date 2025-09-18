import * as cron from 'node-cron';
import { commentMonitor } from './comment-monitor';
import { storage } from './storage';

export interface BidUpdate {
  auctionId: string;
  currentBid: string;
  bidCount?: number;
  lastUpdated: Date;
}

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
    });

    this.cronJob.start();
    this.isRunning = true;

    // Comment monitor enabled for Facebook auction monitoring
    commentMonitor.init().catch(console.error);
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('Auction monitor stopped');
    
    // Close comment monitor
    commentMonitor.close().catch(console.error);
  }

  async checkAllAuctions(): Promise<BidUpdate[]> {
    try {
      console.log('🔍 Checking all auctions for bid updates...');
      
      // Use new comment-focused monitoring
      const updates = await this.checkAuctionsWithCommentMonitor();
      
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
  
  private async checkAuctionsWithCommentMonitor(): Promise<BidUpdate[]> {
    const updates: BidUpdate[] = [];
    
    try {
      const auctions = await storage.getAuctions({ status: 'active' });
      
      for (const auction of auctions.auctions) {
        if (!auction.postUrl) continue;
        
        const currentBid = parseFloat(auction.currentBid || auction.startingBid);
        const startingBid = parseFloat(auction.startingBid);
        
        console.log(`Checking auction ${auction.id}: ${auction.opalType} - Current: $${currentBid}`);
        
        let newBids = [];
        try {
          newBids = await commentMonitor.checkForNewBids(
            auction.postUrl, 
            currentBid, 
            startingBid
          );
        } catch (error) {
          console.error(`❌ Error checking auction ${auction.id}:`, error);
          continue; // Skip this auction and continue with others
        }
        
        // Get the highest valid bid
        const validBids = newBids.filter(bid => bid.isValid);
        if (validBids.length > 0) {
          const highestBid = validBids[0]; // Already sorted by amount
          const currentBidNum = parseFloat(auction.currentBid || auction.startingBid);
          
          // Update if the detected bid is different from current (higher OR lower)
          if (highestBid.amount !== currentBidNum) {
            console.log(`✅ Bid update for ${auction.id}: $${currentBidNum} → $${highestBid.amount} from ${highestBid.bidderName}`);
            
            const updateResult = await storage.updateAuction(auction.id, {
              currentBid: highestBid.amount.toString(),
              currentBidder: highestBid.bidderName
            });
            
            if (updateResult) {
              updates.push({
                auctionId: auction.id,
                currentBid: highestBid.amount.toString(),
                lastUpdated: new Date()
              });
            }
          } else {
            console.log(`📊 No change needed for ${auction.id}: current bid matches detected bid ($${highestBid.amount})`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in comment monitoring:', error);
    }
    
    return updates;
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