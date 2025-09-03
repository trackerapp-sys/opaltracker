import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const auctions = pgTable("auctions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  opalType: text("opal_type").notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }).notNull(),
  description: text("description"),
  origin: text("origin"),
  shape: text("shape"),
  facebookGroup: text("facebook_group").notNull(),
  postUrl: text("post_url"),
  startingBid: decimal("starting_bid", { precision: 10, scale: 2 }).notNull(),
  currentBid: decimal("current_bid", { precision: 10, scale: 2 }),
  maxBid: decimal("max_bid", { precision: 10, scale: 2 }),
  endTime: timestamp("end_time").notNull(),
  status: text("status", { enum: ["active", "ended", "won", "lost"] }).default("active").notNull(),
  notes: text("notes"),
  isWatchlist: boolean("is_watchlist").default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAuctionSchema = createInsertSchema(auctions)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    endTime: z.string().transform((str) => new Date(str)),
  });

export type InsertAuction = z.infer<typeof insertAuctionSchema>;
export type Auction = typeof auctions.$inferSelect;
