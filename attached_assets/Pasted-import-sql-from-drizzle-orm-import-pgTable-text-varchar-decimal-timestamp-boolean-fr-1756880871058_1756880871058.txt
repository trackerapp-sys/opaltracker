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
