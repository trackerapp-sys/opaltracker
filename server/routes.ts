import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuctionSchema } from "../shared/schema";
import { auctionMonitor } from "./monitor";
import { facebookScraper } from "./facebook-scraper";
import { facebookWebhooks } from "./facebook-webhooks";

export async function registerRoutes(app: Express): Promise<Server> {
  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const settings = await storage.saveSettings(req.body);
      
      // Handle bid monitoring settings changes
      if (req.body.bidMonitoringEnabled !== undefined || req.body.bidCheckInterval !== undefined) {
        const currentSettings = await storage.getSettings();
        
        if (currentSettings.bidMonitoringEnabled) {
          // Start monitoring if enabled
          if (!auctionMonitor.getStatus().running) {
            auctionMonitor.start();
          }
        } else {
          // Stop monitoring if disabled
          if (auctionMonitor.getStatus().running) {
            auctionMonitor.stop();
          }
        }
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Reset settings to defaults
  app.post("/api/settings/reset", async (req, res) => {
    try {
      const settings = await storage.resetSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error resetting settings:", error);
      res.status(500).json({ message: "Failed to reset settings" });
    }
  });

  // Opal types management endpoints
  app.get("/api/settings/opal-types", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json({ opalTypes: settings.opalTypes || [] });
    } catch (error) {
      console.error("Error fetching opal types:", error);
      res.status(500).json({ message: "Failed to fetch opal types" });
    }
  });

  app.post("/api/settings/opal-types", async (req, res) => {
    try {
      const { opalTypes } = req.body;
      const currentSettings = await storage.getSettings();
      const updatedSettings = { ...currentSettings, opalTypes };
      const savedSettings = await storage.saveSettings(updatedSettings);
      res.json({ opalTypes: savedSettings.opalTypes });
    } catch (error) {
      console.error("Error updating opal types:", error);
      res.status(500).json({ message: "Failed to update opal types" });
    }
  });

  // Payment methods endpoints
  app.get("/api/settings/payment-methods", async (req, res) => {
    try {
      const paymentMethods = await storage.getPaymentMethods();
      res.json(paymentMethods);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      res.status(500).json({ message: "Failed to fetch payment methods" });
    }
  });

  app.post("/api/settings/payment-methods", async (req, res) => {
    try {
      const paymentMethod = await storage.addPaymentMethod(req.body);
      res.status(201).json(paymentMethod);
    } catch (error) {
      console.error("Error adding payment method:", error);
      res.status(500).json({ message: "Failed to add payment method" });
    }
  });

  app.put("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const paymentMethod = await storage.updatePaymentMethod(req.params.id, req.body);
      if (!paymentMethod) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.json(paymentMethod);
    } catch (error) {
      console.error("Error updating payment method:", error);
      res.status(500).json({ message: "Failed to update payment method" });
    }
  });

  app.delete("/api/settings/payment-methods/:id", async (req, res) => {
    try {
      const success = await storage.deletePaymentMethod(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Payment method not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payment method:", error);
      res.status(500).json({ message: "Failed to delete payment method" });
    }
  });

  // Get all auctions with optional filters
  app.get("/api/auctions", async (req, res) => {
    try {
      const { search, opalType, status, priceRange, limit, offset } = req.query;
      const result = await storage.getAuctions({
        search: search as string,
        opalType: opalType as string,
        status: status as string,
        priceRange: priceRange as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });
      res.json(result);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      res.status(500).json({ message: "Failed to fetch auctions" });
    }
  });

  // Get single auction by ID
  app.get("/api/auctions/:id", async (req, res) => {
    try {
      const auction = await storage.getAuction(req.params.id);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      res.json(auction);
    } catch (error) {
      console.error("Error fetching auction:", error);
      res.status(500).json({ message: "Failed to fetch auction" });
    }
  });

  // Create new auction
  app.post("/api/auctions", async (req, res) => {
    try {
      console.log("Received auction data:", req.body);
      const validatedData = insertAuctionSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const auction = await storage.createAuction(validatedData);
      res.status(201).json(auction);
    } catch (error) {
      console.error("Error creating auction:", error);
      if (error instanceof Error && error.name === "ZodError") {
        console.error("Zod validation error:", JSON.stringify(error, null, 2));
        return res.status(400).json({ message: "Invalid auction data", errors: error });
      }
      res.status(500).json({ message: "Failed to create auction" });
    }
  });

  // Bulk create auctions for live dealers
  app.post("/api/auctions/bulk", async (req, res) => {
    try {
      const { auctions } = req.body;
      if (!Array.isArray(auctions)) {
        return res.status(400).json({ message: "Auctions must be an array" });
      }

      const createdAuctions = [];
      const errors = [];

      for (let i = 0; i < auctions.length; i++) {
        try {
          const validatedData = insertAuctionSchema.parse(auctions[i]);
          const auction = await storage.createAuction(validatedData);
          createdAuctions.push(auction);
        } catch (error) {
          console.error(`Error creating auction ${i}:`, error);
          errors.push({ index: i, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      res.status(201).json({ 
        created: createdAuctions.length,
        total: auctions.length,
        auctions: createdAuctions,
        errors: errors
      });
    } catch (error) {
      console.error("Error in bulk create:", error);
      res.status(500).json({ message: "Failed to create auctions" });
    }
  });

  // Update auction - enhanced for Chrome extension bid updates
  app.patch("/api/auctions/:id", async (req, res) => {
    try {
      console.log(`🔄 PATCH /api/auctions/${req.params.id} - Chrome extension update:`, req.body);
      
      const partialData = insertAuctionSchema.partial().parse(req.body);
      console.log("✅ Validated partial data:", partialData);
      
      const auction = await storage.updateAuction(req.params.id, partialData);
      if (!auction) {
        console.error(`❌ Auction ${req.params.id} not found`);
        return res.status(404).json({ message: "Auction not found" });
      }
      
      console.log(`✅ Updated auction ${req.params.id}:`, auction);
      res.json(auction);
    } catch (error) {
      console.error("❌ Error updating auction:", error);
      if (error instanceof Error && error.name === "ZodError") {
        console.error("Zod validation error:", JSON.stringify(error, null, 2));
        return res.status(400).json({ message: "Invalid auction data", errors: error });
      }
      res.status(500).json({ message: "Failed to update auction" });
    }
  });

  // Delete auction
  app.delete("/api/auctions/:id", async (req, res) => {
    try {
      const success = await storage.deleteAuction(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Auction not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting auction:", error);
      res.status(500).json({ message: "Failed to delete auction" });
    }
  });

  // Get analytics
  app.get("/api/analytics", async (req, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Export auctions
  app.post("/api/export", async (req, res) => {
    try {
      const { exportType, format, dateRange, includeFields } = req.body;
      
      let auctions;
      if (exportType === "won-auctions") {
        const result = await storage.getAuctions({ status: "won" });
        auctions = result.auctions;
      } else if (exportType === "date-range" && dateRange) {
        // Filter by date range if provided
        const result = await storage.getAuctions();
        auctions = result.auctions.filter(auction => {
          const createdAt = new Date(auction.createdAt);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end);
          return createdAt >= startDate && createdAt <= endDate;
        });
      } else {
        const result = await storage.getAuctions();
        auctions = result.auctions;
      }

      // Filter fields based on includeFields selection
      const filteredAuctions = auctions.map(auction => {
        const filtered: any = {};
        
        if (includeFields?.opalDetails) {
          filtered.opalType = auction.opalType;
          filtered.weight = auction.weight;
          filtered.description = auction.description;
          filtered.shape = auction.shape;
        }
        
        if (includeFields?.prices) {
          filtered.startingBid = auction.startingBid;
          filtered.currentBid = auction.currentBid;
          filtered.maxBid = auction.maxBid;
        }
        
        if (includeFields?.groupInfo) {
          filtered.facebookGroup = auction.facebookGroup;
        }
        
        if (includeFields?.status) {
          filtered.status = auction.status;
        }
        
        if (includeFields?.dates) {
          filtered.endTime = auction.endTime;
          filtered.createdAt = auction.createdAt;
          filtered.updatedAt = auction.updatedAt;
        }
        
        if (includeFields?.notes) {
          filtered.notes = auction.notes;
        }
        
        if (includeFields?.urls) {
          filtered.postUrl = auction.postUrl;
        }
        
        if (includeFields?.origin) {
          filtered.origin = auction.origin;
        }
        
        return filtered;
      });

      res.json({
        data: filteredAuctions,
        format,
        exportType,
        timestamp: new Date().toISOString(),
        count: filteredAuctions.length
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Auction monitoring endpoints
  app.get("/api/monitor/status", async (req, res) => {
    const status = auctionMonitor.getStatus();
    res.json({ 
      running: status.running, 
      nextCheck: status.nextCheck,
      message: status.running ? "Server monitoring active" : "Server monitoring stopped"
    });
  });

  app.post("/api/monitor/start", async (req, res) => {
    try {
      auctionMonitor.start();
      res.json({ 
        message: "Server monitoring started", 
        status: auctionMonitor.getStatus() 
      });
    } catch (error) {
      console.error("Error starting monitoring:", error);
      res.status(500).json({ message: "Failed to start monitoring" });
    }
  });

  app.post("/api/monitor/stop", async (req, res) => {
    try {
      auctionMonitor.stop();
      res.json({ 
        message: "Server monitoring stopped", 
        status: auctionMonitor.getStatus() 
      });
    } catch (error) {
      console.error("Error stopping monitoring:", error);
      res.status(500).json({ message: "Failed to stop monitoring" });
    }
  });

  // AUTO-MONITOR: Check Facebook URLs from auctions - DISABLED TO PREVENT CONFLICTS WITH EXTENSION
  app.post("/api/monitor/check", async (req, res) => {
    try {
      console.log("🔍 Manual auction check triggered...");
      
      // Simple check without comment monitor for now
      const result = await storage.getAuctions({ status: 'active' });
      const auctions = result?.auctions || [];
      
      if (auctions.length === 0) {
        res.json({ message: "No active auctions to check", updates: [] });
        return;
      }
      
      console.log(`📊 Found ${auctions.length} active auctions`);
      auctions.forEach(auction => {
        console.log(`  - ${auction.opalType}: $${auction.currentBid || auction.startingBid} (${auction.postUrl ? 'has URL' : 'no URL'})`);
      });
      
      res.json({ 
        message: `Manual check complete - found ${auctions.length} active auctions`, 
        updates: [],
        auctions: auctions.map(a => ({ id: a.id, opalType: a.opalType, currentBid: a.currentBid || a.startingBid }))
      });
    } catch (error) {
      console.error("Error in manual check:", error);
      res.status(500).json({ message: "Manual check failed" });
    }
  });

  // FACEBOOK WEBHOOKS - Real-time auction comment monitoring
  app.get('/webhook/facebook', (req, res) => {
    facebookWebhooks.verifyWebhook(req, res);
  });

  app.post('/webhook/facebook', (req, res) => {
    facebookWebhooks.processWebhook(req, res);
  });

  // Mock Facebook groups endpoint for testing
  app.get('/api/facebook/groups', async (req, res) => {
    try {
      // Return empty groups by default - will be populated by Facebook login
      const mockGroups = [];
      
      res.json({ groups: mockGroups });
    } catch (error) {
      console.error("Error fetching Facebook groups:", error);
      res.status(500).json({ message: "Failed to fetch Facebook groups" });
    }
  });

  // Facebook direct posting endpoint
  app.post('/api/facebook/post', async (req, res) => {
    try {
      const { accessToken, message, groupId, auctionId } = req.body;

      if (!accessToken || !message) {
        return res.status(400).json({ 
          success: false, 
          message: 'Access token and message are required' 
        });
      }

      console.log(`📤 Posting to Facebook:`, message.substring(0, 100) + '...');

      // For now, we'll post to user's timeline since group posting requires special permissions
      // Facebook has restricted group posting to verified apps only
      const facebookResponse = await fetch(`https://graph.facebook.com/v18.0/me/feed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          access_token: accessToken
        })
      });

      const result = await facebookResponse.json();

      if (facebookResponse.ok && result.id) {
        console.log(`✅ Facebook post successful: ${result.id}`);
        
        // Update auction with the Facebook post URL if auctionId provided
        if (auctionId) {
          const postUrl = `https://www.facebook.com/${result.id}`;
          await storage.updateAuction(auctionId, { postUrl });
          console.log(`🔗 Updated auction ${auctionId} with Facebook post URL: ${postUrl}`);
        }

        res.json({ 
          success: true, 
          postId: result.id,
          postUrl: `https://www.facebook.com/${result.id}`,
          message: 'Post published to your Facebook timeline! You can share it to groups manually.' 
        });
      } else {
        console.error('❌ Facebook posting failed:', result);
        res.status(400).json({ 
          success: false, 
          message: result.error?.message || 'Failed to post to Facebook',
          error: result.error 
        });
      }
    } catch (error) {
      console.error('❌ Facebook posting error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error while posting to Facebook' 
      });
    }
  });

  // Manual bid correction endpoint
  app.post("/api/auctions/:id/manual-bid-correction", async (req, res) => {
    try {
      const { id } = req.params;
      const { newAmount, bidderName, correctionReason, correctedBy } = req.body;
      
      console.log(`🔧 Manual bid correction for auction ${id}: $${newAmount} from ${bidderName}`);
      
      // Get current auction
      const auction = await storage.getAuction(id);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      
      // Add to bid history as manual override
      await storage.addBidHistory({
        auctionId: id,
        amount: newAmount.toString(),
        bidderName: bidderName || 'Manual Override',
        commentText: `Manual correction: ${correctionReason || 'Auctioneer override'}`,
        timestamp: new Date(),
        status: 'manual_override',
        correctionReason: correctionReason || 'Manual correction by auctioneer',
        correctedBy: correctedBy || 'Auctioneer',
        isManualOverride: true
      });
      
      // Update auction with new bid
      await storage.updateAuction(id, {
        currentBid: newAmount.toString(),
        currentBidder: bidderName || 'Manual Override'
      });
      
      res.json({ 
        success: true, 
        message: "Bid manually corrected",
        newBid: newAmount,
        bidder: bidderName
      });
      
    } catch (error) {
      console.error("Error in manual bid correction:", error);
      res.status(500).json({ message: "Failed to correct bid" });
    }
  });

  // Get bid history for an auction
  app.get("/api/auctions/:id/bid-history", async (req, res) => {
    try {
      const { id } = req.params;
      const bidHistory = await storage.getBidHistory(id);
      res.json(bidHistory);
    } catch (error) {
      console.error("Error fetching bid history:", error);
      res.status(500).json({ message: "Failed to fetch bid history" });
    }
  });

  // Bid update endpoint for browser extension
  app.post("/api/bid-updates", async (req, res) => {
    try {
      const { currentBid, bidderName, url, source } = req.body;
      
      console.log(`📞 Bid update received: $${currentBid} from ${bidderName} via ${source} at ${url}`);
      
      // Find auction by URL
      const { auctions } = await storage.getAuctions({ status: 'active' });
      let auction = auctions.find(a => a.postUrl === url);
      
      // If no auction exists, create one automatically
      if (!auction) {
        console.log(`🆕 No auction found for URL: ${url} - Creating new auction automatically`);
        
        // Generate a new auction ID
        const auctionCount = await storage.getAuctionCount();
        const newAuctionId = `AU${String(auctionCount + 1).padStart(4, '0')}`;
        
        // Create a basic auction with the detected bid
        const now = new Date();
        const endTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        
        const newAuction = {
          opalType: 'Unknown', // Will be updated when user edits
          weight: 'Unknown',
          description: 'Auto-detected from Facebook post',
          facebookGroup: 'Unknown', // Will be updated when user edits
          postUrl: url,
          startingBid: currentBid.toString(),
          currentBid: currentBid.toString(),
          currentBidder: bidderName || 'Unknown',
          startTime: now,
          durationHours: '24',
          durationMinutes: '0',
          endTime: endTime,
          status: 'active' as const,
          notes: 'Auto-created from Facebook bid detection',
          isWatchlist: false
        };
        
        try {
          const createdAuction = await storage.createAuction(newAuction);
          auction = createdAuction;
          console.log(`✅ Auto-created auction ${createdAuction.id} for URL: ${url}`);
        } catch (createError) {
          console.error('❌ Failed to auto-create auction:', createError);
          res.status(500).json({ success: false, message: 'Failed to auto-create auction' });
          return;
        }
      }
      
      if (!auction) {
        res.status(500).json({ success: false, message: 'Auction not found' });
        return;
      }
      
      // Update the auction with the new bid
      const currentBidFloat = parseFloat(auction.currentBid || auction.startingBid);
      const newBidFloat = parseFloat(currentBid);
      
      if (newBidFloat >= currentBidFloat) {
        await storage.updateAuction(auction.id, {
          currentBid: currentBid.toString(),
          currentBidder: bidderName || 'Unknown'
        });
        
        if (newBidFloat > currentBidFloat) {
          console.log(`✅ Bid updated: $${currentBidFloat} → $${newBidFloat} by ${bidderName}`);
          res.json({ success: true, message: `Updated to $${newBidFloat}`, auctionId: auction.id });
        } else {
          console.log(`✅ Bidder name updated: $${newBidFloat} by ${bidderName} (same amount)`);
          res.json({ success: true, message: `Bidder name updated to ${bidderName}`, auctionId: auction.id });
        }
      } else {
        console.log(`📊 Bid $${newBidFloat} not higher than current $${currentBidFloat}`);
        res.json({ success: false, message: `Bid $${newBidFloat} not higher than current $${currentBidFloat}` });
      }
    } catch (error) {
      console.error('❌ Bid update error:', error);
      res.status(500).json({ success: false, message: 'Bid update failed' });
    }
  });

  // Webhook endpoint for external bid notifications
  app.post("/api/webhooks/bid-update", async (req, res) => {
    try {
      const { auctionUrl, bidAmount, bidderName, source } = req.body;
      
      console.log(`📞 Webhook received: $${bidAmount} from ${bidderName} via ${source}`);
      
      // Find auction by URL
      const { auctions } = await storage.getAuctions({ status: 'active' });
      const auction = auctions.find(a => a.postUrl === auctionUrl);
      
      if (auction) {
        const currentBid = parseFloat(auction.currentBid || auction.startingBid);
        const newBid = parseFloat(bidAmount);
        
        if (newBid > currentBid) {
          await storage.updateAuction(auction.id, {
            currentBid: bidAmount.toString(),
            currentBidder: bidderName || 'Webhook User'
          });
          
          console.log(`✅ Webhook updated: $${currentBid} → $${newBid}`);
          res.json({ success: true, message: `Updated to $${newBid}` });
        } else {
          res.json({ success: false, message: `Bid $${newBid} not higher than current $${currentBid}` });
        }
      } else {
        res.status(404).json({ success: false, message: 'Auction not found' });
      }
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ success: false, message: 'Webhook failed' });
    }
  });

  // Live Auction routes
  app.get("/api/live-auctions", async (req, res) => {
    try {
      const liveAuctions = storage.getAllLiveAuctions();
      res.json({ liveAuctions });
    } catch (error) {
      console.error("Error fetching live auctions:", error);
      res.status(500).json({ message: "Failed to fetch live auctions" });
    }
  });

  app.post("/api/live-auctions", async (req, res) => {
    try {
      const liveAuctionData = req.body;
      const liveAuction = storage.createLiveAuction(liveAuctionData);
      res.status(201).json({ liveAuction });
    } catch (error) {
      console.error("Error creating live auction:", error);
      res.status(500).json({ message: "Failed to create live auction" });
    }
  });

  app.get("/api/live-auctions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const liveAuction = storage.getLiveAuction(id);
      if (liveAuction) {
        res.json({ liveAuction });
      } else {
        res.status(404).json({ message: "Live auction not found" });
      }
    } catch (error) {
      console.error("Error fetching live auction:", error);
      res.status(500).json({ message: "Failed to fetch live auction" });
    }
  });

  app.patch("/api/live-auctions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const liveAuction = storage.updateLiveAuction(id, updateData);
      if (liveAuction) {
        res.json({ liveAuction });
      } else {
        res.status(404).json({ message: "Live auction not found" });
      }
    } catch (error) {
      console.error("Error updating live auction:", error);
      res.status(500).json({ message: "Failed to update live auction" });
    }
  });

  app.delete("/api/live-auctions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = storage.deleteLiveAuction(id);
      if (success) {
        res.json({ message: "Live auction deleted successfully" });
      } else {
        res.status(404).json({ message: "Live auction not found" });
      }
    } catch (error) {
      console.error("Error deleting live auction:", error);
      res.status(500).json({ message: "Failed to delete live auction" });
    }
  });

  // Auction Items routes
  app.get("/api/live-auctions/:id/items", async (req, res) => {
    try {
      const { id } = req.params;
      const items = storage.getAuctionItemsByLiveAuctionId(id);
      res.json({ auctionItems: items });
    } catch (error) {
      console.error("Error fetching auction items:", error);
      res.status(500).json({ message: "Failed to fetch auction items" });
    }
  });

  app.post("/api/live-auctions/:id/items", async (req, res) => {
    try {
      const { id } = req.params;
      const itemData = { ...req.body, liveAuctionId: id };
      const item = storage.createAuctionItem(itemData);
      res.status(201).json({ auctionItem: item });
    } catch (error) {
      console.error("Error creating auction item:", error);
      res.status(500).json({ message: "Failed to create auction item" });
    }
  });

  app.post("/api/live-auctions/:id/items/bulk", async (req, res) => {
    try {
      const { id } = req.params;
      const items = req.body.items || [];
      const createdItems = items.map((itemData: any) => {
        const item = storage.createAuctionItem({ ...itemData, liveAuctionId: id });
        return item;
      });
      res.status(201).json({ auctionItems: createdItems });
    } catch (error) {
      console.error("Error creating bulk auction items:", error);
      res.status(500).json({ message: "Failed to create bulk auction items" });
    }
  });

  app.patch("/api/live-auctions/:id/items/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const updateData = req.body;
      const item = storage.updateAuctionItem(itemId, updateData);
      if (item) {
        res.json({ auctionItem: item });
      } else {
        res.status(404).json({ message: "Auction item not found" });
      }
    } catch (error) {
      console.error("Error updating auction item:", error);
      res.status(500).json({ message: "Failed to update auction item" });
    }
  });

  app.delete("/api/live-auctions/:id/items/:itemId", async (req, res) => {
    try {
      const { itemId } = req.params;
      const success = storage.deleteAuctionItem(itemId);
      if (success) {
        res.json({ message: "Auction item deleted successfully" });
      } else {
        res.status(404).json({ message: "Auction item not found" });
      }
    } catch (error) {
      console.error("Error deleting auction item:", error);
      res.status(500).json({ message: "Failed to delete auction item" });
    }
  });

  const httpServer = createServer(app);
  
  // Start server monitoring by default - DISABLED TO PREVENT CONFLICTS WITH EXTENSION
  console.log("🚀 Server ready - auction monitoring DISABLED (using extension instead)...");
  // auctionMonitor.start();
  
  return httpServer;
}
