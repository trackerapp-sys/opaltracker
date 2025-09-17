import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const auctions = pgTable("auctions", {
  id: varchar("id").primaryKey().default(sql`'AU' || LPAD(nextval('auction_id_seq')::text, 4, '0')`),
  opalType: text("opal_type").notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  weightGrams: decimal("weight_grams", { precision: 8, scale: 3 }),
  description: text("description"),
  origin: text("origin"),
  shape: text("shape"),
  facebookGroup: text("facebook_group").notNull(),
  postUrl: text("post_url"),
  startingBid: decimal("starting_bid", { precision: 10, scale: 2 }).notNull(),
  currentBid: decimal("current_bid", { precision: 10, scale: 2 }),
  currentBidder: text("current_bidder"),
  maxBid: decimal("max_bid", { precision: 10, scale: 2 }),
  bidIncrements: decimal("bid_increments", { precision: 10, scale: 2 }),
  localShipping: decimal("local_shipping", { precision: 10, scale: 2 }),
  internationalShipping: decimal("international_shipping", { precision: 10, scale: 2 }),
  location: text("location"),
  paymentMethod: text("payment_method"), // Store as JSON string for multiple values
  startTime: timestamp("start_time").notNull(),
  durationHours: decimal("duration_hours", { precision: 5, scale: 0 }).notNull(),
  durationMinutes: decimal("duration_minutes", { precision: 5, scale: 0 }).default("0"),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["active", "ended"] }).default("active").notNull(),
  notes: text("notes"),
  isWatchlist: boolean("is_watchlist").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Helper function to parse Australian date formats
const parseAustralianDate = (dateStr: string): Date => {
  // Handle datetime-local format (YYYY-MM-DDTHH:MM)
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  
  // Handle DD/MM/YYYY HH:MM format
  if (dateStr.includes('/')) {
    const [datePart, timePart = '00:00'] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes] = timePart.split(':');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours || '0'), parseInt(minutes || '0'));
  }
  
  // Fallback to standard parsing
  return new Date(dateStr);
};

export const insertAuctionSchema = createInsertSchema(auctions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    startTime: z.union([
      z.string().transform((str) => {
        const parsedDate = parseAustralianDate(str);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format. Use DD/MM/YYYY HH:MM or browser datetime picker.');
        }
        return parsedDate;
      }),
      z.date()
    ]),
    endTime: z.union([
      z.string().transform((str) => {
        const parsedDate = parseAustralianDate(str);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format. Use DD/MM/YYYY HH:MM or browser datetime picker.');
        }
        return parsedDate;
      }),
      z.date()
    ]),
  });

export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Auction = typeof auctions.$inferSelect;

// Live Auctions Schema
export const liveAuctions = pgTable("live_auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  facebookGroup: text("facebook_group").notNull(),
  postUrl: text("post_url"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["scheduled", "active", "ended"] }).default("scheduled").notNull(),
  totalItems: decimal("total_items", { precision: 5, scale: 0 }).default("0"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Auction Items Schema
export const auctionItems = pgTable("auction_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  liveAuctionId: varchar("live_auction_id").notNull().references(() => liveAuctions.id),
  lotNumber: text("lot_number").notNull(),
  opalType: text("opal_type").notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  origin: text("origin"),
  shape: text("shape"),
  startingBid: decimal("starting_bid", { precision: 10, scale: 2 }).notNull(),
  currentBid: decimal("current_bid", { precision: 10, scale: 2 }),
  currentBidder: text("current_bidder"),
  maxBid: decimal("max_bid", { precision: 10, scale: 2 }),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }),
  location: text("location"),
  paymentMethod: text("payment_method"), // Store as JSON string for multiple values
  status: text("status", { enum: ["pending", "active", "sold", "passed"] }).default("pending").notNull(),
  biddingDuration: decimal("bidding_duration", { precision: 5, scale: 0 }).default("300"), // 5 minutes default
  biddingStartTime: timestamp("bidding_start_time"),
  biddingEndTime: timestamp("bidding_end_time"),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Live Auction Insert Schema
export const insertLiveAuctionSchema = createInsertSchema(liveAuctions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    startTime: z.union([
      z.string().transform((str) => {
        const parsedDate = parseAustralianDate(str);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format. Use DD/MM/YYYY HH:MM or browser datetime picker.');
        }
        return parsedDate;
      }),
      z.date()
    ]),
    endTime: z.union([
      z.string().transform((str) => {
        const parsedDate = parseAustralianDate(str);
        if (isNaN(parsedDate.getTime())) {
          throw new Error('Invalid date format. Use DD/MM/YYYY HH:MM or browser datetime picker.');
        }
        return parsedDate;
      }),
      z.date()
    ]),
  });

// Auction Item Insert Schema
export const insertAuctionItemSchema = createInsertSchema(auctionItems)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

// Settings Schema for Payment Methods
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// Payment Methods Schema
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export const insertPaymentMethodSchema = createInsertSchema(paymentMethods)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  });

export type InsertLiveAuction = z.infer<typeof insertLiveAuctionSchema>;
export type LiveAuction = typeof liveAuctions.$inferSelect;
export type InsertAuctionItem = z.infer<typeof insertAuctionItemSchema>;
export type AuctionItem = typeof auctionItems.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
