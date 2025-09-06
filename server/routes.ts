import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuctionSchema } from "@shared/schema";
import { auctionMonitor } from "./monitor";
import { facebookScraper } from "./facebook-scraper";

export async function registerRoutes(app: Express): Promise<Server> {
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
    res.json({ running: false, message: "Chrome extension handles detection" });
  });

  app.post("/api/monitor/start", async (req, res) => {
    res.json({ message: "Server monitoring disabled - use Chrome extension", status: { running: false } });
  });

  app.post("/api/monitor/stop", async (req, res) => {
    res.json({ message: "Server monitoring already disabled", status: { running: false } });
  });

  // MONITORING ENDPOINT DISABLED - Prevents false $500 bid detections
  app.post("/api/monitor/check", async (req, res) => {
    console.log("🔄 Monitoring endpoint disabled to prevent false bid detections");
    console.log("💡 Facebook scraper detects page noise (CSS, coordinates) as $500 bids");
    console.log("✅ Use Chrome extension or manual updates for accurate bid tracking");
    
    res.json({ 
      message: "Monitoring temporarily disabled to prevent false bid detections",
      monitored: 0,
      updates: [],
      auctions: [],
      reason: "Facebook scraper detects page elements as bids, causing incorrect $500 amounts"
    });
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

  const httpServer = createServer(app);
  
  // Server monitoring disabled - Chrome extension handles all detection
  console.log("🚀 Server ready - Chrome extension will handle bid detection...");
  // auctionMonitor.start();
  
  return httpServer;
}
