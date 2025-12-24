import { Ruleset } from "@shared/schema";

export type Recommendation = "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER";

interface StrategyResult {
  recommendation: Recommendation;
  reasoning: string;
}

function cardValue(card: string): number {
  if (["J", "Q", "K"].includes(card)) return 10;
  if (card === "A") return 11;
  return parseInt(card, 10);
}

function getDealerValue(card: string): number {
  return cardValue(card);
}

function getHandInfo(cards: string[]) {
  const values = cards.map(cardValue);
  const hasAce = cards.includes("A");
  let total = values.reduce((sum, v) => sum + v, 0);

  // Convert aces from 11 to 1 until not bust
  let acesAsEleven = cards.filter((c) => c === "A").length;
  while (total > 21 && acesAsEleven > 0) {
    total -= 10;
    acesAsEleven -= 1;
  }

  const isSoft = hasAce && total <= 21 && acesAsEleven > 0;
  const isPair = cards.length === 2 && cards[0] === cards[1];

  return { total, isSoft, isPair, firstCardValue: values[0] };
}

function canDouble(total: number, cards: string[], rules?: Ruleset) {
  if (!rules) return true;
  if (cards.length !== 2) return false;
  switch (rules.doubleRule) {
    case "none":
      return false;
    case "any_two":
      return true;
    case "nine_to_eleven":
      return total >= 9 && total <= 11;
    case "ten_to_eleven":
      return total >= 10 && total <= 11;
    default:
      return true;
  }
}

function maybeSurrender(total: number, dealer: number, cards: string[], rules?: Ruleset): Recommendation | null {
  if (!rules || rules.surrender !== "late") return null;
  if (cards.length !== 2) return null;
  if (total === 16 && [9, 10, 11].includes(dealer)) return "SURRENDER";
  if (total === 15 && dealer === 10) return "SURRENDER";
  return null;
}

function pairStrategy(card: string, dealer: number, rules?: Ruleset): Recommendation {
  // Basic multi-deck DAS-friendly defaults with minor adjustments by rule toggles
  switch (card) {
    case "A":
      return "SPLIT";
    case "K":
    case "Q":
    case "J":
    case "10":
      return "STAND";
    case "9":
      return [2, 3, 4, 5, 6, 8, 9].includes(dealer) ? "SPLIT" : "STAND";
    case "8":
      return "SPLIT";
    case "7":
      return dealer <= 7 ? "SPLIT" : "HIT";
    case "6": {
      // Split 6s vs 3-6 always; vs 2 only when DAS is allowed
      if (dealer >= 3 && dealer <= 6) return "SPLIT";
      if (dealer === 2 && rules?.canDoubleAfterSplit) return "SPLIT";
      return "HIT";
    }
    case "5": {
      // Treat as hard 10
      return hardStrategy(10, dealer, true, rules);
    }
    case "4":
      return rules?.canDoubleAfterSplit && (dealer === 5 || dealer === 6) ? "SPLIT" : "HIT";
    case "3":
    case "2":
      return dealer >= 2 && dealer <= 7 ? "SPLIT" : "HIT";
    default:
      return "HIT";
  }
}

function softStrategy(total: number, dealer: number, cards: string[], rules?: Ruleset): Recommendation {
  switch (total) {
    case 20:
      return "STAND";
    case 19:
      if (dealer === 6 && canDouble(total, cards, rules)) return "DOUBLE";
      return "STAND";
    case 18:
      if ([3, 4, 5, 6].includes(dealer) && canDouble(total, cards, rules)) return "DOUBLE";
      if ([2, 7, 8].includes(dealer)) return "STAND";
      if (dealer === 11) {
        // Against Ace, stand on S17 games; hit on H17 games
        return rules?.isH17 ? "HIT" : "STAND";
      }
      return "HIT";
    case 17:
      if ([3, 4, 5, 6].includes(dealer) && canDouble(total, cards, rules)) return "DOUBLE";
      return "HIT";
    case 16:
    case 15:
      if ([4, 5, 6].includes(dealer) && canDouble(total, cards, rules)) return "DOUBLE";
      return "HIT";
    case 14:
    case 13:
      if ([5, 6].includes(dealer) && canDouble(total, cards, rules)) return "DOUBLE";
      return "HIT";
    default:
      return "HIT";
  }
}

function hardStrategy(total: number, dealer: number, isTwoCard: boolean, rules?: Ruleset): Recommendation {
  // Surrender handled separately
  if (total >= 17) return "STAND";
  if (total === 16) return dealer >= 7 ? "HIT" : "STAND";
  if (total === 15) return dealer >= 7 ? "HIT" : "STAND";
  if (total >= 13 && total <= 14) return dealer >= 7 ? "HIT" : "STAND";
  if (total === 12) return dealer >= 4 && dealer <= 6 ? "STAND" : "HIT";
  if (total === 11) return canDouble(total, isTwoCard ? ["X", "X"] : [], rules) ? "DOUBLE" : "HIT";
  if (total === 10) {
    if (dealer <= 9 && canDouble(total, isTwoCard ? ["X", "X"] : [], rules)) return "DOUBLE";
    return "HIT";
  }
  if (total === 9) {
    const allowDouble = canDouble(total, isTwoCard ? ["X", "X"] : [], rules);
    if (allowDouble && dealer >= 3 && dealer <= 6) return "DOUBLE";
    if (allowDouble && rules?.doubleRule === "any_two" && dealer === 2) return "DOUBLE";
    return "HIT";
  }
  if (total <= 8) return "HIT";
  return "HIT";
}

export function calculateStrategy(
  dealerCard: string,
  playerCards: string[],
  ruleset?: Ruleset,
): StrategyResult {
  const dealer = getDealerValue(dealerCard);
  const { total, isSoft, isPair } = getHandInfo(playerCards);

  // Surrender checks
  const surrender = maybeSurrender(total, dealer, playerCards, ruleset);
  if (surrender) {
    return {
      recommendation: "SURRENDER",
      reasoning: "Late surrender optimal for this matchup.",
    };
  }

  if (isPair) {
    const rec = pairStrategy(playerCards[0], dealer, ruleset);
    return {
      recommendation: rec,
      reasoning: rec === "SPLIT" ? "Pair play favors splitting in this spot." : "Pair play favors keeping the hand.",
    };
  }

  if (isSoft) {
    const rec = softStrategy(total, dealer, playerCards, ruleset);
    return {
      recommendation: rec,
      reasoning: "Soft total guidance based on dealer upcard.",
    };
  }

  const rec = hardStrategy(total, dealer, playerCards.length === 2, ruleset);
  return {
    recommendation: rec,
    reasoning: "Hard total guidance based on dealer upcard.",
  };
}
