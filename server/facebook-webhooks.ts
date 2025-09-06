// Facebook Graph API + Webhooks for Real-Time Auction Comment Monitoring
import { Request, Response } from 'express';
import crypto from 'crypto';

export class FacebookWebhooks {
  private verifyToken = 'opal-auction-tracker-verify-token';

  // Webhook verification (required by Facebook)
  verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.verifyToken) {
      console.log('✅ Facebook webhook verified');
      res.status(200).send(challenge);
    } else {
      console.log('❌ Webhook verification failed');
      res.sendStatus(403);
    }
  }

  // Process incoming Facebook webhook notifications
  async processWebhook(req: Request, res: Response) {
    const body = req.body;

    if (body.object === 'page') {
      console.log('📱 Received Facebook webhook notification');
      
      body.entry.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'comments') {
            // NEW COMMENT ON AUCTION POST
            this.processAuctionComment(change.value);
          }
        });
      });
    }

    res.status(200).send('EVENT_RECEIVED');
  }

  // Process auction comments for bid detection
  private async processAuctionComment(commentData: any) {
    try {
      const comment = commentData.message || '';
      const commentId = commentData.comment_id;
      const userId = commentData.from?.id;
      const userName = commentData.from?.name;
      const postId = commentData.post_id;

      console.log(`💬 New comment on post ${postId}: "${comment}" by ${userName}`);

      // Detect bids in the comment
      const detectedBids = this.extractBidsFromComment(comment);
      
      if (detectedBids.length > 0) {
        const highestBid = Math.max(...detectedBids);
        console.log(`💰 BID DETECTED: $${highestBid} by ${userName}`);
        
        // Update auction in tracker
        await this.updateAuctionWithNewBid(postId, highestBid, userId, userName);
      }
    } catch (error) {
      console.error('❌ Error processing auction comment:', error);
    }
  }

  // Extract bid amounts from comment text
  private extractBidsFromComment(comment: string): number[] {
    const bidPatterns = [
      /\$(\d{1,4})/g,                        // $200, $85
      /\b(\d{2,4})\s*(?:dollars?|bucks?)\b/gi, // 200 dollars, 85 bucks
      /\b(?:bid|offer|pay|take)\s*:?\s*\$?(\d{2,4})\b/gi, // bid 200, offer $85
      /\b(\d{2,4})\s*(?:for\s+me|please)\b/gi, // 200 for me
      /\b(?:I'll\s+)?(?:go|pay|bid)\s+\$?(\d{2,4})\b/gi, // I'll go 200
    ];

    const bids: number[] = [];
    
    bidPatterns.forEach(pattern => {
      const matches = [...comment.matchAll(pattern)];
      matches.forEach(match => {
        const bid = parseInt(match[1]);
        if (bid >= 10 && bid <= 10000) { // Reasonable bid range
          bids.push(bid);
        }
      });
    });

    return bids;
  }

  // Update auction tracker with new bid
  private async updateAuctionWithNewBid(postId: string, bid: number, userId: string, userName: string) {
    try {
      // Find auction by Facebook post URL/ID
      const facebookUrl = `https://www.facebook.com/posts/${postId}`;
      
      // For now, log the bid - integrate with your storage system
      console.log(`✅ REAL-TIME BID UPDATE: Post ${postId} - $${bid} by ${userName} (${userId})`);
      
      // TODO: Update auction in storage system
      // await storage.updateAuctionByUrl(facebookUrl, { currentBid: bid.toString() });
      
    } catch (error) {
      console.error('❌ Failed to update auction:', error);
    }
  }

  // Verify Facebook webhook signature (security)
  private verifySignature(req: Request): boolean {
    const signature = req.get('X-Hub-Signature-256');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.FACEBOOK_APP_SECRET || '')
      .update(JSON.stringify(req.body))
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }
}

export const facebookWebhooks = new FacebookWebhooks();