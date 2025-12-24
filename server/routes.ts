import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { calculateStrategy } from "./strategy";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Rulesets
  app.get(api.rulesets.list.path, async (req, res) => {
    const items = await storage.getRulesets();
    res.json(items);
  });

  app.post(api.rulesets.create.path, async (req, res) => {
    try {
      const input = api.rulesets.create.input.parse(req.body);
      const item = await storage.createRuleset(input);
      res.status(201).json(item);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.rulesets.get.path, async (req, res) => {
    const item = await storage.getRuleset(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });

  // Sessions
  app.get(api.sessions.list.path, async (req, res) => {
    const items = await storage.getSessions();
    res.json(items);
  });

  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const item = await storage.createSession(input);
      res.status(201).json(item);
    } catch (err) {
        if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.sessions.get.path, async (req, res) => {
    const item = await storage.getSession(Number(req.params.id));
    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  });
  
  app.put(api.sessions.update.path, async (req, res) => {
      try {
        const input = api.sessions.update.input.parse(req.body);
        const item = await storage.updateSession(Number(req.params.id), input);
        res.json(item);
      } catch (err) {
         if (err instanceof z.ZodError) {
            return res.status(400).json({
              message: err.errors[0].message,
              field: err.errors[0].path.join('.'),
            });
          }
          throw err;
      }
  });

  // Hands
  app.get(api.hands.list.path, async (req, res) => {
    const items = await storage.getHands(Number(req.params.sessionId));
    res.json(items);
  });

  app.post(api.hands.create.path, async (req, res) => {
    try {
      const input = api.hands.create.input.parse(req.body);
      const item = await storage.createHand(input);
      res.status(201).json(item);
    } catch (err) {
       if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Strategy
  app.post(api.strategy.calculate.path, async (req, res) => {
      try {
        const input = api.strategy.calculate.input.parse(req.body);
        const ruleset = await storage.getRuleset(input.rulesetId);
        
        res.json({
            ...calculateStrategy(input.dealerUpCard, input.playerCards, ruleset)
        });
      } catch (err) {
         if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
      }
  });

  return httpServer;
}

// Seed function to create a default ruleset
async function seed() {
    const rulesets = await storage.getRulesets();
    if (rulesets.length === 0) {
        await storage.createRuleset({
            name: "Generic 6-Deck H17",
            decks: 6,
            isH17: true,
            doubleRule: "any_two",
            canDoubleAfterSplit: true,
            maxSplitHands: 4,
            resplitAces: false,
            hitSplitAces: false,
            surrender: "late",
            blackjackPayout: "3:2"
        });
    }
}

seed().catch(console.error);
