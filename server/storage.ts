import { type Auction, type InsertAuction, type LiveAuction, type InsertLiveAuction, type AuctionItem, type InsertAuctionItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getAuction(id: string): Promise<Auction | undefined>;
  getAuctions(filters?: {
    search?: string;
    opalType?: string;
    status?: string;
    priceRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ auctions: Auction[]; total: number }>;
  getAuctionCount(): Promise<number>;
  createAuction(auction: InsertAuction): Promise<Auction>;
  updateAuction(id: string, auction: Partial<InsertAuction>): Promise<Auction | undefined>;
  deleteAuction(id: string): Promise<boolean>;
  getAnalytics(): Promise<{
    totalAuctions: number;
    activeAuctions: number;
    wonAuctions: number;
    avgPrice: number;
    priceRange: { min: number; max: number };
    winRate: number;
    groupStats: Array<{ group: string; auctions: number; winRate: number; avgPrice: number }>;
    recentAuctions: Auction[];
  }>;
  
  // Live Auction methods
  getAllLiveAuctions(): LiveAuction[];
  getLiveAuction(id: string): LiveAuction | undefined;
  createLiveAuction(liveAuction: InsertLiveAuction): LiveAuction;
  updateLiveAuction(id: string, liveAuction: Partial<InsertLiveAuction>): LiveAuction | undefined;
  deleteLiveAuction(id: string): boolean;
  
  // Auction Item methods
  getAuctionItemsByLiveAuctionId(liveAuctionId: string): AuctionItem[];
  getAuctionItem(id: string): AuctionItem | undefined;
  createAuctionItem(item: InsertAuctionItem): AuctionItem;
  updateAuctionItem(id: string, item: Partial<InsertAuctionItem>): AuctionItem | undefined;
  deleteAuctionItem(id: string): boolean;
  
  // Settings methods
  getSettings(): Promise<any>;
  saveSettings(settings: any): Promise<any>;
  resetSettings(): Promise<any>;
  
  // Payment Methods methods
  getPaymentMethods(): Promise<Array<{ id: string; name: string; description?: string }>>;
  addPaymentMethod(paymentMethod: { name: string; description?: string }): Promise<{ id: string; name: string; description?: string }>;
  updatePaymentMethod(id: string, paymentMethod: { name: string; description?: string }): Promise<{ id: string; name: string; description?: string } | null>;
  deletePaymentMethod(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private auctions: Map<string, Auction>;
  private liveAuctions: Map<string, LiveAuction>;
  private auctionItems: Map<string, AuctionItem>;
  private settings: Map<string, any>;
  private paymentMethods: Map<string, { id: string; name: string; description?: string }>;
  private auctionIdCounter: number;

  constructor() {
    this.auctions = new Map();
    this.liveAuctions = new Map();
    this.auctionItems = new Map();
    this.settings = new Map();
    this.paymentMethods = new Map();
    this.auctionIdCounter = 0;
    
    // Initialize default settings
    this.settings.set('default', {
      timezone: 'Australia/Sydney',
      dateFormat: 'DD/MM/YYYY HH:MM',
      currency: 'AUD',
      notifications: true,
      refreshRate: 5
    });
  }

  async getAuction(id: string): Promise<Auction | undefined> {
    return this.auctions.get(id);
  }

  async getAuctions(filters?: {
    search?: string;
    opalType?: string;
    status?: string;
    priceRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ auctions: Auction[]; total: number }> {
    let allAuctions = Array.from(this.auctions.values());

    // Apply filters
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      allAuctions = allAuctions.filter(auction => 
        auction.opalType.toLowerCase().includes(searchTerm) ||
        auction.description?.toLowerCase().includes(searchTerm) ||
        auction.facebookGroup.toLowerCase().includes(searchTerm) ||
        auction.origin?.toLowerCase().includes(searchTerm) ||
        auction.postUrl?.toLowerCase().includes(searchTerm)
      );
    }

    if (filters?.opalType && filters.opalType !== "all") {
      allAuctions = allAuctions.filter(auction => auction.opalType === filters.opalType);
    }

    if (filters?.status && filters.status !== "all") {
      allAuctions = allAuctions.filter(auction => auction.status === filters.status);
    }

    if (filters?.priceRange && filters.priceRange !== "all") {
      allAuctions = allAuctions.filter(auction => {
        const currentBid = parseFloat(auction.currentBid || auction.startingBid);
        switch (filters.priceRange) {
          case "$0 - $100": return currentBid <= 100;
          case "$100 - $500": return currentBid > 100 && currentBid <= 500;
          case "$500 - $1000": return currentBid > 500 && currentBid <= 1000;
          case "$1000+": return currentBid > 1000;
          default: return true;
        }
      });
    }

    // Sort by creation date (newest first)
    allAuctions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = allAuctions.length;
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const paginatedAuctions = allAuctions.slice(offset, offset + limit);

    return { auctions: paginatedAuctions, total };
  }

  async getAuctionCount(): Promise<number> {
    return this.auctions.size;
  }

  async createAuction(insertAuction: InsertAuction): Promise<Auction> {
    this.auctionIdCounter++;
    const id = `AU${this.auctionIdCounter.toString().padStart(4, '0')}`;
    const now = new Date();
    const auction: Auction = {
      ...insertAuction,
      id,
      createdAt: now,
      updatedAt: now,
      weightGrams: insertAuction.weightGrams || null,
      description: insertAuction.description || null,
      origin: insertAuction.origin || null,
      shape: insertAuction.shape || null,
      postUrl: insertAuction.postUrl || null,
      currentBid: insertAuction.currentBid || "0",
      currentBidder: insertAuction.currentBidder || null,
      maxBid: insertAuction.maxBid || null,
      bidIncrements: insertAuction.bidIncrements || null,
      localShipping: insertAuction.localShipping || null,
      internationalShipping: insertAuction.internationalShipping || null,
      location: insertAuction.location || null,
      paymentMethod: insertAuction.paymentMethod || null,
      durationMinutes: insertAuction.durationMinutes || "0",
      notes: insertAuction.notes || null,
      isWatchlist: insertAuction.isWatchlist || false,
    };
    this.auctions.set(id, auction);
    return auction;
  }

  async updateAuction(id: string, updateData: Partial<InsertAuction>): Promise<Auction | undefined> {
    const existingAuction = this.auctions.get(id);
    if (!existingAuction) return undefined;

    const updatedAuction: Auction = {
      ...existingAuction,
      ...updateData,
      updatedAt: new Date(),
    };
    this.auctions.set(id, updatedAuction);
    return updatedAuction;
  }

  async deleteAuction(id: string): Promise<boolean> {
    return this.auctions.delete(id);
  }

  async getAnalytics(): Promise<{
    totalAuctions: number;
    activeAuctions: number;
    wonAuctions: number;
    avgPrice: number;
    priceRange: { min: number; max: number };
    winRate: number;
    groupStats: Array<{ group: string; auctions: number; winRate: number; avgPrice: number }>;
    recentAuctions: Auction[];
  }> {
    const allAuctions = Array.from(this.auctions.values());
    const totalAuctions = allAuctions.length;
    const activeAuctions = allAuctions.filter(a => a.status === "active").length;
    const wonAuctions = allAuctions.filter(a => a.status === "ended").length;
    const endedAuctions = allAuctions.filter(a => a.status === "ended").length;

    // Calculate average price and price range
    const prices = allAuctions.map(a => parseFloat(a.currentBid || a.startingBid));
    const avgPrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const priceRange = prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 };

    // Calculate win rate
    const winRate = endedAuctions > 0 ? (wonAuctions / endedAuctions) * 100 : 0;

    // Calculate group statistics
    const groupMap = new Map<string, { auctions: number; won: number; totalPrice: number }>();
    allAuctions.forEach(auction => {
      const group = auction.facebookGroup;
      const existing = groupMap.get(group) || { auctions: 0, won: 0, totalPrice: 0 };
      existing.auctions++;
      if (auction.status === "ended") existing.won++;
      existing.totalPrice += parseFloat(auction.currentBid || auction.startingBid);
      groupMap.set(group, existing);
    });

    const groupStats = Array.from(groupMap.entries()).map(([group, stats]) => ({
      group,
      auctions: stats.auctions,
      winRate: stats.auctions > 0 ? (stats.won / stats.auctions) * 100 : 0,
      avgPrice: stats.auctions > 0 ? stats.totalPrice / stats.auctions : 0,
    }));

    // Get recent auctions (last 5)
    const recentAuctions = allAuctions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      totalAuctions,
      activeAuctions,
      wonAuctions,
      avgPrice,
      priceRange,
      winRate,
      groupStats,
      recentAuctions,
    };
  }
  
  // Live Auction methods
  getAllLiveAuctions(): LiveAuction[] {
    return Array.from(this.liveAuctions.values());
  }

  getLiveAuction(id: string): LiveAuction | undefined {
    return this.liveAuctions.get(id);
  }

  createLiveAuction(liveAuction: InsertLiveAuction): LiveAuction {
    const id = randomUUID();
    const now = new Date();
    const newLiveAuction: LiveAuction = {
      id,
      ...liveAuction,
      description: liveAuction.description || null,
      postUrl: liveAuction.postUrl || null,
      status: liveAuction.status || "scheduled",
      totalItems: liveAuction.totalItems || "0",
      createdAt: now,
      updatedAt: now,
    };
    this.liveAuctions.set(id, newLiveAuction);
    return newLiveAuction;
  }

  updateLiveAuction(id: string, liveAuction: Partial<InsertLiveAuction>): LiveAuction | undefined {
    const existing = this.liveAuctions.get(id);
    if (!existing) return undefined;
    
    const updated: LiveAuction = {
      ...existing,
      ...liveAuction,
      updatedAt: new Date(),
    };
    this.liveAuctions.set(id, updated);
    return updated;
  }

  deleteLiveAuction(id: string): boolean {
    return this.liveAuctions.delete(id);
  }

  // Auction Item methods
  getAuctionItemsByLiveAuctionId(liveAuctionId: string): AuctionItem[] {
    return Array.from(this.auctionItems.values()).filter(item => item.liveAuctionId === liveAuctionId);
  }

  getAuctionItem(id: string): AuctionItem | undefined {
    return this.auctionItems.get(id);
  }

  createAuctionItem(item: InsertAuctionItem): AuctionItem {
    const id = randomUUID();
    const now = new Date();
    const newItem: AuctionItem = {
      id,
      ...item,
      description: item.description || null,
      origin: item.origin || null,
      shape: item.shape || null,
      currentBid: item.currentBid || null,
      currentBidder: item.currentBidder || null,
      maxBid: item.maxBid || null,
      shippingCost: item.shippingCost || null,
      location: item.location || null,
      paymentMethod: item.paymentMethod || null,
      status: item.status || "pending",
      biddingDuration: item.biddingDuration || "300",
      biddingStartTime: item.biddingStartTime || null,
      biddingEndTime: item.biddingEndTime || null,
      notes: item.notes || null,
      createdAt: now,
      updatedAt: now,
    };
    this.auctionItems.set(id, newItem);
    return newItem;
  }

  updateAuctionItem(id: string, item: Partial<InsertAuctionItem>): AuctionItem | undefined {
    const existing = this.auctionItems.get(id);
    if (!existing) return undefined;
    
    const updated: AuctionItem = {
      ...existing,
      ...item,
      updatedAt: new Date(),
    };
    this.auctionItems.set(id, updated);
    return updated;
  }

  deleteAuctionItem(id: string): boolean {
    return this.auctionItems.delete(id);
  }

  // Settings methods
  async getSettings(): Promise<any> {
    const settings = this.settings.get('default') || {
      timezone: 'Australia/Sydney',
      dateFormat: 'DD/MM/YYYY HH:MM',
      currency: 'AUD',
      notifications: true,
      refreshRate: 5,
      bidMonitoringEnabled: true,
      bidCheckInterval: 3,
      opalTypes: [
        "Black Opal", "Crystal Opal", "Boulder Opal", "White Opal",
        "Fire Opal", "Matrix Opal", "Rough Opal", "Doublet Opal",
        "Triplet Opal", "Synthetic Opal", "Ethiopian Opal", "Mexican Opal",
        "Peruvian Opal", "Other"
      ]
    };
    
    console.log('📋 Current settings:', JSON.stringify(settings, null, 2));
    return settings;
  }

  async saveSettings(settings: any): Promise<any> {
    console.log('💾 Saving settings:', JSON.stringify(settings, null, 2));
    
    // Always start with complete default settings to ensure nothing is missing
    const defaultSettings = {
      timezone: 'Australia/Sydney',
      dateFormat: 'DD/MM/YYYY HH:MM',
      currency: 'AUD',
      notifications: true,
      refreshRate: 5,
      bidMonitoringEnabled: true,
      bidCheckInterval: 3,
      opalTypes: [
        "Black Opal", "Crystal Opal", "Boulder Opal", "White Opal",
        "Fire Opal", "Matrix Opal", "Rough Opal", "Doublet Opal",
        "Triplet Opal", "Synthetic Opal", "Ethiopian Opal", "Mexican Opal",
        "Peruvian Opal", "Other"
      ]
    };
    
    // Get existing settings and merge with defaults first, then with new settings
    const existingSettings = this.settings.get('default') || {};
    const settingsWithDefaults = { ...defaultSettings, ...existingSettings };
    
    console.log('🔄 Settings with defaults:', JSON.stringify(settingsWithDefaults, null, 2));
    
    // Merge with new settings
    const mergedSettings = { ...settingsWithDefaults, ...settings };
    console.log('✅ Final merged settings:', JSON.stringify(mergedSettings, null, 2));
    
    this.settings.set('default', mergedSettings);
    return mergedSettings;
  }

  async resetSettings(): Promise<any> {
    const defaultSettings = {
      timezone: 'Australia/Sydney',
      dateFormat: 'DD/MM/YYYY HH:MM',
      currency: 'AUD',
      notifications: true,
      refreshRate: 5,
      bidMonitoringEnabled: true,
      bidCheckInterval: 3,
      opalTypes: [
        "Black Opal", "Crystal Opal", "Boulder Opal", "White Opal",
        "Fire Opal", "Matrix Opal", "Rough Opal", "Doublet Opal",
        "Triplet Opal", "Synthetic Opal", "Ethiopian Opal", "Mexican Opal",
        "Peruvian Opal", "Other"
      ]
    };
    
    this.settings.set('default', defaultSettings);
    console.log('🔄 Settings reset to defaults:', JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }

  // Payment Methods methods
  async getPaymentMethods(): Promise<Array<{ id: string; name: string; description?: string }>> {
    return Array.from(this.paymentMethods.values());
  }

  async addPaymentMethod(paymentMethod: { name: string; description?: string }): Promise<{ id: string; name: string; description?: string }> {
    const id = randomUUID();
    const newPaymentMethod = { id, ...paymentMethod };
    this.paymentMethods.set(id, newPaymentMethod);
    return newPaymentMethod;
  }

  async updatePaymentMethod(id: string, paymentMethod: { name: string; description?: string }): Promise<{ id: string; name: string; description?: string } | null> {
    if (!this.paymentMethods.has(id)) {
      return null;
    }
    const updatedPaymentMethod = { id, ...paymentMethod };
    this.paymentMethods.set(id, updatedPaymentMethod);
    return updatedPaymentMethod;
  }

  async deletePaymentMethod(id: string): Promise<boolean> {
    return this.paymentMethods.delete(id);
  }
}

export const storage = new MemStorage();
