import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuctionSchema } from "@shared/schema";
import { auctionMonitor } from "./monitor";

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

  // Update auction
  app.patch("/api/auctions/:id", async (req, res) => {
    try {
      const partialData = insertAuctionSchema.partial().parse(req.body);
      const auction = await storage.updateAuction(req.params.id, partialData);
      if (!auction) {
        return res.status(404).json({ message: "Auction not found" });
      }
      res.json(auction);
    } catch (error) {
      console.error("Error updating auction:", error);
      if (error instanceof Error && error.name === "ZodError") {
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
    try {
      const status = auctionMonitor.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting monitor status:", error);
      res.status(500).json({ message: "Failed to get monitor status" });
    }
  });

  app.post("/api/monitor/start", async (req, res) => {
    try {
      auctionMonitor.start();
      res.json({ message: "Auction monitoring started", status: auctionMonitor.getStatus() });
    } catch (error) {
      console.error("Error starting monitor:", error);
      res.status(500).json({ message: "Failed to start monitor" });
    }
  });

  app.post("/api/monitor/stop", async (req, res) => {
    try {
      auctionMonitor.stop();
      res.json({ message: "Auction monitoring stopped", status: auctionMonitor.getStatus() });
    } catch (error) {
      console.error("Error stopping monitor:", error);
      res.status(500).json({ message: "Failed to stop monitor" });
    }
  });

  app.post("/api/monitor/check", async (req, res) => {
    try {
      const updates = await auctionMonitor.manualCheck();
      res.json({ 
        message: `Manual check completed. Found ${updates.length} updates.`,
        updates 
      });
    } catch (error) {
      console.error("Error during manual check:", error);
      res.status(500).json({ message: "Failed to perform manual check" });
    }
  });

  const httpServer = createServer(app);
  
  // Start auction monitoring when server starts
  console.log("🚀 Starting auction bid monitoring system...");
  auctionMonitor.start();
  
  return httpServer;
}
