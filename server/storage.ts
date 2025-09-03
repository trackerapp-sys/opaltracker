import { type Auction, type InsertAuction } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private auctions: Map<string, Auction>;

  constructor() {
    this.auctions = new Map();
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
        auction.origin?.toLowerCase().includes(searchTerm)
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

  async createAuction(insertAuction: InsertAuction): Promise<Auction> {
    const id = randomUUID();
    const now = new Date();
    const auction: Auction = {
      ...insertAuction,
      id,
      createdAt: now,
      updatedAt: now,
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
    const wonAuctions = allAuctions.filter(a => a.status === "won").length;
    const endedAuctions = allAuctions.filter(a => a.status === "ended" || a.status === "won" || a.status === "lost").length;

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
      if (auction.status === "won") existing.won++;
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
}

export const storage = new MemStorage();
