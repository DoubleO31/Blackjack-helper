import type { Hand } from "@shared/schema";

export type BettingStrategyId =
  | "flat"
  | "mini_paroli"
  | "oscar"
  | "dalembert"
  | "martingale_lite"
  | "fibonacci_lite"
  | "one_three_two_six"
  | string;

interface BetInfo {
  nextUnits: number;
  nextAmount: number;
  strategyUsed: string;
}

const DEFAULT_CAP = 4;
const MINI_PAROLI_LADDER = [1, 2, 4];
const FIB_LITE_SEQ = [1, 1, 2, 3, 5, 8];
const ONE_THREE_TWO_SIX = [1, 3, 2, 6];

export function computeNextBet(
  strategyId: string | undefined,
  unitSize: number,
  hands: Hand[] = [],
  capUnits = DEFAULT_CAP,
): BetInfo {
  const safeUnit = unitSize > 0 ? unitSize : 1;
  const cap = Math.max(1, capUnits || DEFAULT_CAP);
  const ordered = [...hands].sort((a, b) => a.handNumber - b.handNumber);
  const id = strategyId || "flat";

  switch (id) {
    case "mini_paroli":
      return runMiniParoli(safeUnit, ordered, cap);
    case "oscar":
      return runOscarsGrind(safeUnit, ordered, cap);
    case "dalembert":
      return runDAlembert(safeUnit, ordered, cap);
    case "martingale_lite":
      return runMartingaleLite(safeUnit, ordered, cap);
    case "fibonacci_lite":
      return runFibonacciLite(safeUnit, ordered, cap);
    case "one_three_two_six":
      return runOneThreeTwoSix(safeUnit, ordered, cap);
    case "flat":
    default:
      return { nextUnits: 1, nextAmount: safeUnit, strategyUsed: id };
  }
}

function clampUnits(units: number, cap: number): number {
  return Math.max(1, Math.min(cap, Math.round(units)));
}

function unitsDeltaFromHand(hand: Hand, unitSize: number): number {
  const base = unitSize > 0 ? unitSize : 1;
  return hand.payout / base;
}

function runMiniParoli(unitSize: number, hands: Hand[], cap: number): BetInfo {
  let stepIndex = 0; // which rung was just used
  const maxIndex = MINI_PAROLI_LADDER.length - 1;

  for (const hand of hands) {
    const currentUnits = clampUnits(MINI_PAROLI_LADDER[stepIndex], cap);
    const delta = unitsDeltaFromHand(hand, unitSize);

    if (delta > 0) {
      // advance on win; if we just won at the top rung, reset
      if (stepIndex === maxIndex) {
        stepIndex = 0;
      } else {
        stepIndex = Math.min(stepIndex + 1, maxIndex);
      }
    } else if (delta < 0) {
      // any loss resets
      stepIndex = 0;
    } else {
      // push: keep same step
      stepIndex = stepIndex;
    }
  }

  const nextUnits = clampUnits(MINI_PAROLI_LADDER[stepIndex], cap);
  return { nextUnits, nextAmount: nextUnits * unitSize, strategyUsed: "mini_paroli" };
}

function runOscarsGrind(unitSize: number, hands: Hand[], cap: number): BetInfo {
  let betUnits = 1;
  let setNet = 0;
  const target = 1;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    setNet += delta;

    if (setNet >= target) {
      // Reset set after reaching target profit
      betUnits = 1;
      setNet = 0;
      continue;
    }

    if (delta > 0) {
      betUnits = clampUnits(betUnits + 1, cap);
    } else if (delta < 0) {
      // keep same bet
    }
  }

  betUnits = clampUnits(betUnits, cap);
  return { nextUnits: betUnits, nextAmount: betUnits * unitSize, strategyUsed: "oscar" };
}

function runDAlembert(unitSize: number, hands: Hand[], cap: number): BetInfo {
  let betUnits = 1;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    if (delta < 0) {
      betUnits = clampUnits(betUnits + 1, cap);
    } else if (delta > 0) {
      betUnits = clampUnits(betUnits - 1, cap);
    }
  }

  return { nextUnits: betUnits, nextAmount: betUnits * unitSize, strategyUsed: "dalembert" };
}

function runMartingaleLite(unitSize: number, hands: Hand[], cap: number): BetInfo {
  const base = 1;
  const recovery = clampUnits(2, cap);
  let inRecovery = false;
  let nextUnits = base;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    if (!inRecovery) {
      if (delta < 0) {
        inRecovery = true;
        nextUnits = recovery;
      } else {
        nextUnits = base;
      }
    } else {
      if (delta === 0) {
        nextUnits = recovery; // push, stay in recovery
      } else {
        inRecovery = false;
        nextUnits = base; // after recovery hand, reset regardless of outcome
      }
    }
  }

  nextUnits = clampUnits(nextUnits, cap);
  return { nextUnits, nextAmount: nextUnits * unitSize, strategyUsed: "martingale_lite" };
}

function runFibonacciLite(unitSize: number, hands: Hand[], cap: number): BetInfo {
  const seq = FIB_LITE_SEQ.length ? FIB_LITE_SEQ : [1];
  let index = 0;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    if (delta < 0) {
      index = Math.min(index + 1, seq.length - 1);
    } else if (delta > 0) {
      index = Math.max(index - 2, 0);
    }
  }

  const nextUnits = clampUnits(seq[index], cap);
  return { nextUnits, nextAmount: nextUnits * unitSize, strategyUsed: "fibonacci_lite" };
}

function runOneThreeTwoSix(unitSize: number, hands: Hand[], cap: number): BetInfo {
  let stepIndex = 0;
  const maxIndex = ONE_THREE_TWO_SIX.length - 1;

  for (const hand of hands) {
    const delta = unitsDeltaFromHand(hand, unitSize);
    if (delta > 0) {
      if (stepIndex === maxIndex) {
        stepIndex = 0; // completed cycle
      } else {
        stepIndex = Math.min(stepIndex + 1, maxIndex);
      }
    } else if (delta < 0) {
      stepIndex = 0;
    }
  }

  const nextUnits = clampUnits(ONE_THREE_TWO_SIX[stepIndex], cap);
  return { nextUnits, nextAmount: nextUnits * unitSize, strategyUsed: "one_three_two_six" };
}
