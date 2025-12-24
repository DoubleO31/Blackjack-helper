import { Ruleset } from "@shared/schema";

export type Recommendation = "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER";

type DealerDist = Record<number, number>; // total -> probability

interface EvalOptions {
  canDouble: boolean;
  canSplit: boolean;
  splitHandsUsed: number;
  maxSplitHands: number;
  isSplitAces: boolean;
}

interface EvalResult {
  ev: number;
  action: Recommendation;
  reasoning: string;
}

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const PROB = 1 / RANKS.length; // infinite deck assumption

function cardValue(card: string): number {
  if (["J", "Q", "K"].includes(card)) return 10;
  if (card === "A") return 11;
  return parseInt(card, 10);
}

function isTenValue(card: string): boolean {
  return ["10", "J", "Q", "K"].includes(card);
}

function handTotals(cards: string[]) {
  let total = 0;
  let softAces = 0;
  for (const c of cards) {
    const v = cardValue(c);
    total += v;
    if (c === "A") softAces += 1;
  }
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  const isSoft = softAces > 0 && total <= 21;
  const isPair = cards.length === 2 && cards[0] === cards[1];
  return { total, isSoft, isPair, softAces };
}

// Dealer distribution with infinite deck approximation
function dealerDistribution(upcard: string, rules: Ruleset): DealerDist {
  const cache = dealerDistributionCache[rules.isH17 ? "H17" : "S17"];
  const cached = cache.get(upcard);
  if (cached) return cached;

  const dist = rollDealer(cardValue(upcard), upcard === "A", rules.isH17);
  cache.set(upcard, dist);
  return dist;
}

const dealerDistributionCache: Record<"H17" | "S17", Map<string, DealerDist>> = {
  H17: new Map(),
  S17: new Map(),
};

function rollDealer(total: number, upcardAce: boolean, isH17: boolean): DealerDist {
  const results: DealerDist = {};

  function hitDealer(currentTotal: number, softAces: number, prob: number) {
    // adjust for soft aces
    while (currentTotal > 21 && softAces > 0) {
      currentTotal -= 10;
      softAces -= 1;
    }

    const isSoft = softAces > 0;
    if (currentTotal >= 17 && (!isSoft || !isH17)) {
      results[currentTotal] = (results[currentTotal] || 0) + prob;
      return;
    }
    if (currentTotal >= 18 && isSoft && isH17) {
      results[currentTotal] = (results[currentTotal] || 0) + prob;
      return;
    }

    for (const r of RANKS) {
      let nextTotal = currentTotal + cardValue(r);
      let nextSoft = softAces + (r === "A" ? 1 : 0);
      hitDealer(nextTotal, nextSoft, prob * PROB);
    }
  }

  const startingSoft = upcardAce ? 1 : 0;
  hitDealer(total, startingSoft, 1);

  return results;
}

function standEV(playerTotal: number, dealerDist: DealerDist): number {
  let ev = 0;
  for (const [tStr, p] of Object.entries(dealerDist)) {
    const dealerTotal = Number(tStr);
    if (dealerTotal > 21) {
      ev += p * 1;
    } else if (playerTotal > dealerTotal) {
      ev += p * 1;
    } else if (playerTotal < dealerTotal) {
      ev += p * -1;
    } else {
      // push
      ev += 0;
    }
  }
  return ev;
}

function canDouble(cards: string[], rules: Ruleset, isSplit: boolean): boolean {
  if (cards.length !== 2) return false;
  if (isSplit && !rules.canDoubleAfterSplit) return false;
  switch (rules.doubleRule) {
    case "none":
      return false;
    case "any_two":
      return true;
    case "nine_to_eleven": {
      const { total } = handTotals(cards);
      return total >= 9 && total <= 11;
    }
    case "ten_to_eleven": {
      const { total } = handTotals(cards);
      return total >= 10 && total <= 11;
    }
    default:
      return true;
  }
}

function canSplit(cards: string[], rules: Ruleset, opts: EvalOptions): boolean {
  const { isPair } = handTotals(cards);
  if (!isPair || !opts.canSplit) return false;
  if (opts.splitHandsUsed >= opts.maxSplitHands) return false;
  if (cards[0] === "A" && !rules.hitSplitAces && opts.splitHandsUsed >= opts.maxSplitHands - 1) {
    // if we can't draw more cards on split aces and already at max, disallow
    return false;
  }
  if (cards[0] === "A" && !rules.resplitAces && opts.splitHandsUsed >= 1) {
    // no resplit aces beyond first
    return false;
  }
  return true;
}

function blackjackPayoutFactor(rules: Ruleset): number {
  const payout = rules.blackjackPayout || "3:2";
  if (payout === "6:5") return 6 / 5;
  if (payout === "1:1") return 1;
  return 3 / 2;
}

// Probability dealer has blackjack given upcard (infinite deck assumption)
function dealerBlackjackProb(upcard: string): number {
  if (upcard === "A") return 4 / 13; // need ten-value
  if (isTenValue(upcard)) return 1 / 13; // need ace
  return 0;
}

// Main EV solver
export function calculateStrategy(
  dealerUpCard: string,
  playerCards: string[],
  ruleset?: Ruleset,
): { recommendation: Recommendation; reasoning: string } {
  const rules: Ruleset = ruleset ?? {
    id: 0,
    name: "Default",
    decks: 6,
    isH17: true,
    doubleRule: "any_two",
    canDoubleAfterSplit: true,
    maxSplitHands: 4,
    resplitAces: false,
    hitSplitAces: false,
    surrender: "none",
    blackjackPayout: "3:2",
  };
  const dealerDist = dealerDistribution(dealerUpCard, rules);

  const memo = new Map<string, EvalResult>();
  const result = bestAction(playerCards, {
    canDouble: true,
    canSplit: true,
    splitHandsUsed: 1, // starting hand counts as 1
    maxSplitHands: rules.maxSplitHands || 4,
    isSplitAces: false,
  });

  function bestAction(cards: string[], opts: EvalOptions): EvalResult {
    const key = `${cards.slice().sort().join(",")}|${opts.canDouble}|${opts.canSplit}|${opts.splitHandsUsed}|${opts.isSplitAces}`;
    const cached = memo.get(key);
    if (cached) return cached;

    const { total, isSoft, isPair } = handTotals(cards);

    // Bust check
    if (total > 21) {
      const res = { ev: -1, action: "HIT" as Recommendation, reasoning: "Busted." };
      memo.set(key, res);
      return res;
    }

    // Natural blackjack
    if (cards.length === 2 && total === 21) {
      const pDealerBJ = dealerBlackjackProb(dealerUpCard);
      const factor = blackjackPayoutFactor(rules);
      const ev = (1 - pDealerBJ) * factor; // push on dealer BJ
      const res = { ev, action: "STAND" as Recommendation, reasoning: "Natural blackjack." };
      memo.set(key, res);
      return res;
    }

    // Stand EV
    const standVal = standEV(total, dealerDist);
    let best: EvalResult = { ev: standVal, action: "STAND", reasoning: "Standing EV vs dealer distribution." };

    // Surrender (late only, first decision)
    if (rules.surrender === "late" && cards.length === 2) {
      const surrenderVal = -0.5;
      if (surrenderVal > best.ev) {
        best = { ev: surrenderVal, action: "SURRENDER", reasoning: "Late surrender yields better EV." };
      }
    }

    // Hit EV (unless split aces with no hits allowed)
    if (!(opts.isSplitAces && !rules.hitSplitAces)) {
      const hitVal = RANKS.reduce((acc, r) => {
        const next = [...cards, r];
        const child = bestAction(next, {
          ...opts,
          canDouble: false, // no doubling after hit
          canSplit: false, // no splitting after hit
          isSplitAces: opts.isSplitAces,
        });
        return acc + PROB * child.ev;
      }, 0);
      if (hitVal > best.ev) {
        best = { ev: hitVal, action: "HIT", reasoning: "Hitting yields higher EV." };
      }
    }

    // Double EV
    if (opts.canDouble && canDouble(cards, rules, opts.isSplitAces)) {
      const doubleVal = RANKS.reduce((acc, r) => {
        const next = [...cards, r];
        const { total: t } = handTotals(next);
        if (t > 21) {
          return acc + PROB * -2; // bust after double
        }
        const standAfter = standEV(t, dealerDist);
        return acc + PROB * (2 * standAfter);
      }, 0);
      if (doubleVal > best.ev) {
        best = { ev: doubleVal, action: "DOUBLE", reasoning: "Doubling once then standing has best EV." };
      }
    }

    // Split EV
    if (isPair && canSplit(cards, rules, opts)) {
      const rank = cards[0];
      const nextSplitHandsUsed = Math.min(opts.maxSplitHands, opts.splitHandsUsed + 1);

      const splitHandEV = RANKS.reduce((acc, r) => {
        // Handle resplit aces if allowed
        const isAceSplit = rank === "A";
        if (isAceSplit && r === "A" && rules.resplitAces && nextSplitHandsUsed < opts.maxSplitHands) {
          const resplit = bestAction(["A", "A"], {
            canDouble: false,
            canSplit: true,
            splitHandsUsed: nextSplitHandsUsed,
            maxSplitHands: opts.maxSplitHands,
            isSplitAces: true,
          });
          return acc + PROB * resplit.ev;
        }

        const hand = [rank, r];
        const child = bestAction(hand, {
          canDouble: canDouble(hand, rules, isAceSplit) && (!isAceSplit || rules.hitSplitAces),
          canSplit: !isAceSplit && opts.splitHandsUsed + 1 < opts.maxSplitHands, // allow further splits for non-aces if capacity remains
          splitHandsUsed: nextSplitHandsUsed,
          maxSplitHands: opts.maxSplitHands,
          isSplitAces: isAceSplit,
        });
        return acc + PROB * child.ev;
      }, 0);

      const splitVal = splitHandEV; // per-hand EV; overall EV is the same per unit stake
      if (splitVal > best.ev) {
        best = { ev: splitVal, action: "SPLIT", reasoning: "Splitting yields higher EV across hands." };
      }
    }

    memo.set(key, best);
    return best;
  }

  return {
    recommendation: result.action,
    reasoning: result.reasoning,
  };
}
