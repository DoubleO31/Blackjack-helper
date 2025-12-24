import type { Hand } from "@shared/schema";

export type BettingStrategyId = "flat" | "mini_paroli" | "dalembert" | string;

interface BetInfo {
  nextUnits: number;
  nextAmount: number;
  strategyUsed: string;
}

const DEFAULT_LADDER = [1, 2, 4];

export function computeNextBet(strategyId: string | undefined, unitSize: number, hands: Hand[] = []): BetInfo {
  if (!unitSize || unitSize <= 0) {
    return { nextUnits: 1, nextAmount: unitSize, strategyUsed: strategyId || "flat" };
  }

  const ordered = [...hands].sort((a, b) => a.handNumber - b.handNumber);
  const id = strategyId || "flat";

  switch (id) {
    case "mini_paroli":
      return runMiniParoli(unitSize, ordered);
    case "dalembert":
      return runDAlembert(unitSize, ordered);
    case "flat":
    default:
      return { nextUnits: 1, nextAmount: unitSize, strategyUsed: id };
  }
}

function unitsDeltaFromHand(hand: Hand, unitSize: number): number {
  // Derive units based on the wager actually placed; fall back to session unit size
  const base = hand.betAmount && hand.betAmount > 0 ? hand.betAmount : unitSize;
  if (!base) return 0;
  return hand.payout / base;
}

function runMiniParoli(unitSize: number, hands: Hand[]): BetInfo {
  let stepIndex = 0;
  const maxIndex = DEFAULT_LADDER.length - 1;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    if (delta > 0) {
      stepIndex = Math.min(stepIndex + 1, maxIndex);
      if (stepIndex === maxIndex) {
        // Completed the ladder on a win, reset next bet
        stepIndex = 0;
      }
    } else if (delta < 0) {
      stepIndex = 0;
    }
  }

  const nextUnits = DEFAULT_LADDER[stepIndex];
  return { nextUnits, nextAmount: nextUnits * unitSize, strategyUsed: "mini_paroli" };
}

function runDAlembert(unitSize: number, hands: Hand[]): BetInfo {
  let betUnits = 1;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    if (delta < 0) {
      betUnits = betUnits + 1;
    } else if (delta > 0) {
      betUnits = Math.max(1, betUnits - 1);
    }
  }

  return { nextUnits: betUnits, nextAmount: betUnits * unitSize, strategyUsed: "dalembert" };
}
