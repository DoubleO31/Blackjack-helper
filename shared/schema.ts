import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const rulesets = pgTable("rulesets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Vegas Strip Single Deck"
  decks: integer("decks").notNull().default(6),
  isH17: boolean("is_h17").notNull().default(true), // Hit on Soft 17
  doubleRule: text("double_rule").notNull().default("any_two"), // any_two, nine_to_eleven, ten_to_eleven, none
  canDoubleAfterSplit: boolean("can_double_after_split").notNull().default(true),
  maxSplitHands: integer("max_split_hands").notNull().default(4),
  resplitAces: boolean("resplit_aces").notNull().default(false),
  hitSplitAces: boolean("hit_split_aces").notNull().default(false),
  surrender: text("surrender").notNull().default("none"), // none, late
  blackjackPayout: text("blackjack_payout").notNull().default("3:2"), // "3:2", "6:5", "1:1"
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  rulesetId: integer("ruleset_id").references(() => rulesets.id).notNull(),
  location: text("location"), // Casino name
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  initialBankroll: integer("initial_bankroll").notNull(),
  currentBankroll: integer("current_bankroll").notNull(),
  unitSize: integer("unit_size").notNull().default(10), // Base bet unit
  bettingStrategy: text("betting_strategy").notNull().default("flat"), // flat, martingale, etc.
});

export const hands = pgTable("hands", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  handNumber: integer("hand_number").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  
  // Game State
  dealerUpCard: text("dealer_up_card").notNull(), // "A", "2"..."10", "J", "Q", "K"
  playerCards: jsonb("player_cards").notNull(), // Array of strings ["A", "K"]
  
  // Strategy & Actions
  recommendedAction: text("recommended_action").notNull(), // HIT, STAND, DOUBLE, SPLIT, SURRENDER
  actionTaken: text("action_taken"), // Optional, if user deviated or just for tracking
  
  // Outcome
  result: text("result"), // WIN, LOSS, PUSH, BLACKJACK
  betAmount: integer("bet_amount").notNull(),
  payout: integer("payout").notNull(), // Net profit/loss for this hand
  
  // Tags
  isPair: boolean("is_pair").default(false),
  isSoft: boolean("is_soft").default(false),
});

// === SCHEMAS ===

export const insertRulesetSchema = createInsertSchema(rulesets).omit({ id: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, startTime: true, endTime: true, currentBankroll: true });
export const insertHandSchema = createInsertSchema(hands).omit({ id: true, timestamp: true });

// === TYPES ===

export type Ruleset = typeof rulesets.$inferSelect;
export type InsertRuleset = z.infer<typeof insertRulesetSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;

export type Hand = typeof hands.$inferSelect;
export type InsertHand = z.infer<typeof insertHandSchema>;

// API Payload Types
export type CreateSessionRequest = InsertSession;
export type UpdateSessionRequest = Partial<InsertSession>; // For ending session or updating bankroll
export type RecordHandRequest = InsertHand;

export type StrategyRequest = {
  rulesetId: number;
  dealerUpCard: string;
  playerCards: string[];
};

export type StrategyResponse = {
  recommendation: "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER";
  reasoning?: string;
};
