import { db } from "./db";
import {
  rulesets, sessions, hands,
  type InsertRuleset, type InsertSession, type InsertHand,
  type Ruleset, type Session, type Hand
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Rulesets
  getRulesets(): Promise<Ruleset[]>;
  getRuleset(id: number): Promise<Ruleset | undefined>;
  createRuleset(ruleset: InsertRuleset): Promise<Ruleset>;

  // Sessions
  getSessions(): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: number): Promise<boolean>;

  // Hands
  getHands(sessionId: number): Promise<Hand[]>;
  createHand(hand: InsertHand): Promise<Hand>;
}

export class DatabaseStorage implements IStorage {
  // Rulesets
  async getRulesets(): Promise<Ruleset[]> {
    return await db.select().from(rulesets);
  }

  async getRuleset(id: number): Promise<Ruleset | undefined> {
    const [ruleset] = await db.select().from(rulesets).where(eq(rulesets.id, id));
    return ruleset;
  }

  async createRuleset(ruleset: InsertRuleset): Promise<Ruleset> {
    const [newRuleset] = await db.insert(rulesets).values(ruleset).returning();
    return newRuleset;
  }

  // Sessions
  async getSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.startTime));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async createSession(session: InsertSession): Promise<Session> {
    const [newSession] = await db.insert(sessions).values({
        ...session,
        currentBankroll: session.initialBankroll
    }).returning();
    return newSession;
  }
  
  async updateSession(id: number, updates: Partial<Session>): Promise<Session> {
    const [updated] = await db.update(sessions).set(updates).where(eq(sessions.id, id)).returning();
    return updated;
  }

  async deleteSession(id: number): Promise<boolean> {
    await db.delete(hands).where(eq(hands.sessionId, id));
    const deleted = await db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id });
    return deleted.length > 0;
  }

  // Hands
  async getHands(sessionId: number): Promise<Hand[]> {
    return await db.select().from(hands).where(eq(hands.sessionId, sessionId)).orderBy(desc(hands.handNumber));
  }

  async createHand(hand: InsertHand): Promise<Hand> {
    const [newHand] = await db.insert(hands).values(hand).returning();
    
    // Update session bankroll based on result
    // This is a simplified update, ideally we'd handle this transactionally or calculate on fly
    // But for this MVP, we update the session record
    const session = await this.getSession(hand.sessionId);
    if (session) {
        await this.updateSession(hand.sessionId, {
            currentBankroll: session.currentBankroll + hand.payout
        });
    }

    return newHand;
  }
}

export const storage = new DatabaseStorage();
