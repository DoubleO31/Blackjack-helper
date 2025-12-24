# Blackjack Helper — Mobile Web App (PWA) Design

> Target: **Las Vegas electronic / video / stadium blackjack**  
> Core value: **fast basic-strategy advice + session tracking + “spicy but capped” bet patterns**

---

## 1) Goals and Non‑Goals

### Goals
- **Mobile-first** web app that works in a casino (low light, noisy, spotty signal)
- **Offline-first**: strategy + tracking work with zero internet
- **Fast input**: dealer upcard + player cards in a few taps
- **Correct basic strategy** for the selected ruleset (6D H17, payout, DAS, etc.)
- **Session + hand logging**: full P/L history, exports
- **Bet advisor**: user selects a betting pattern; app recommends next bet after each outcome
- **Safety rails**: caps, stop-loss, pace controls (hands/hour)

### Non‑Goals
- No card counting / shuffle tracking / “beating” RNG blackjack
- No “guaranteed profit” claims
- No invasive automation (you still input hands/outcomes)

---

## 2) Product Scope

### Supported game formats
- Single-player video blackjack
- Electronic table game (ETG) terminals

### Inputs per hand
- Dealer upcard: A,2..10
- Player cards: A,2..10 (auto-detect hard/soft totals & pairs)
- Optional toggles: **Split**, **Double**, **Surrender** (if rules allow)

### Outputs per hand
- Recommended action: **HIT / STAND / DOUBLE / SPLIT / SURRENDER**
- Recommended next bet: based on selected betting strategy + caps
- Running session stats (bankroll, units won/lost, streaks)

---

## 3) Mobile‑Friendly Web App Requirements (PWA)

### UX requirements (casino usability)
- **One-hand screen** with big tap targets (min 44px / thumb-friendly)
- **High contrast + dark mode** default (casino lighting)
- **Haptic feedback** on key taps (if supported)
- **Offline mode** indicator (subtle)
- **Wake lock** option (“Keep screen on”)
- **Undo** last input (very important)
- **Left/right-handed mode**
- **Minimal typing** (everything via buttons)

### PWA requirements
- Installable “Add to Home Screen”
- Local caching + offline bundles (Service Worker)
- Storage: IndexedDB (hands & sessions) + local cache for precomputed strategy tables
- Fast startup (<1s) with cached assets

### Tech stack (recommended)
- Frontend: React + TypeScript (or SvelteKit / Vue—same principles)
- State/store: lightweight (Zustand/Redux Toolkit)
- DB: Dexie.js (IndexedDB wrapper)
- Optional: WebAssembly for EV solver if you want exact-rule computation fast

---

## 4) Ruleset Configuration

Rulesets are saved profiles (per casino/machine):
- Decks: 1 / 2 / 4 / 6 / 8
- Dealer soft 17: **H17 / S17**
- Blackjack payout: **3:2 / 6:5 / 1:1**
- Double: any two / 9-11 / 10-11 / none
- DAS: yes/no
- Splits: max hands, resplit aces yes/no, hit split aces yes/no (rare)
- Surrender: none / late
- Peek / no-peek (if you model it)

Each session references exactly one ruleset.

---

## 5) Strategy Engine (Optimal Action)

### Option A (best): EV-based solver (rules-exact)
Compute EV for each action given the ruleset and (optionally) deck model.
- Stand EV: expected result vs dealer final distribution
- Hit EV: Σ p(card) * EV(next_state)
- Double EV: 2 * Σ p(card) * EV(stand_after_one_card)
- Split EV: depends on pair rules + recursion depth
- Surrender EV: -0.5 (if allowed)

Cache the policy (recommended action) for each player-state + dealer upcard + ruleset.

### Option B: precomputed tables (fast, less flexible)
Ship standard tables for common rulesets (6D H17 DAS, etc.)  
Downside: easy to mismatch odd machine rules.

**Recommendation**: start with precomputed common tables + add solver later.

---

## 6) Betting Strategy Module (Detailed)

### Core concepts
- **Unit (u):** base bet size in dollars (e.g., $5)
- **Bet cap:** maximum bet allowed (e.g., 4u or 6u)
- **Session stop-loss:** e.g., -25u
- **Session take-profit / lock-in:** e.g., +10u
- **Cool-down/pacing:** optional “pause after X hands” or “min seconds per hand”

All strategies must implement the same interface:

```ts
type Outcome = "WIN" | "LOSS" | "PUSH" | "BJ" | "SURRENDER" | "WIN_DBL" | "LOSS_DBL";

interface StrategyConfig {
  unit: number;            // $
  maxBetUnits: number;     // cap in units
  stopLossUnits?: number;
  takeProfitUnits?: number;
}

interface BettingStrategyState { /* per strategy */ }

interface BettingStrategy {
  id: string;
  name: string;
  init(config: StrategyConfig): BettingStrategyState;
  nextBet(state: BettingStrategyState, lastOutcome: Outcome | null): number; // in $
  update(state: BettingStrategyState, outcome: Outcome, netUnitsDelta: number): BettingStrategyState;
  reset(state: BettingStrategyState): BettingStrategyState;
}
```

> Note: “netUnitsDelta” should reflect true change in units (splits/doubles can change it).

---

### Strategy 1 — Flat Betting (baseline)
**Behavior:** Always bet `1u` (or user-specified constant `k*u`).  
**Why:** Simple, lowest volatility for a given average bet.

**Config**
- `flatUnits = 1` default (allow user to set 1–3)

**Rules**
- Next bet = `flatUnits * u` always.
- No state.

**Good for:** practice, long sessions, avoiding “tilt”.

---

### Strategy 2 — Mini‑Paroli (1‑2‑4) “Press wins, cut losses”
**Behavior:** Increase after wins up to a fixed ladder; reset after any loss or after completing ladder.  
**This is a bounded “reverse martingale.”**

**Config**
- `ladder = [1, 2, 4]` (editable; default max 4u)
- `resetAfterSteps = ladder.length` (default)
- `resetOnPush = false` (default)

**State**
- `stepIndex` (0..len-1)

**Rules**
- Start at `ladder[0]`.
- If outcome is WIN or BJ:
  - advance `stepIndex++` but clamp to last step.
  - If reached last step and a win happened, **reset** next hand to step 0 (optional behavior: “lock profits”).
- If outcome is LOSS (or SURRENDER):
  - reset to step 0.
- If PUSH:
  - keep same step (default).

**Example**
- Bet 1u win → 2u win → 4u win → reset to 1u
- Bet 1u loss → reset to 1u

**Why it’s wallet-friendlier:** no chasing losses; max exposure is capped.

---

### Strategy 3 — Oscar’s Grind (Target +1u per set, capped)
**Behavior:** Try to grind a small profit, increasing slowly after wins.

**Config**
- `targetProfitUnits = 1`
- `maxBetUnits = 4` (strongly recommended)
- `resetOnPush = false`

**State**
- `currentBetUnits` (start 1)
- `setNetUnits` (starts 0)

**Rules**
- Start set: `currentBetUnits = 1`, `setNetUnits = 0`
- After each hand:
  - `setNetUnits += netUnitsDelta`
  - If `setNetUnits >= targetProfitUnits`: **reset set**
  - Else:
    - If outcome WIN/BJ: `currentBetUnits = min(currentBetUnits + 1, maxBetUnits)`
    - If outcome LOSS/SURRENDER: keep same `currentBetUnits`
    - PUSH: keep same bet
- Next bet = `currentBetUnits * u`

**Example (target +1u)**
- 1u win → set +1u → reset to 1u.
- 1u loss → set -1u, bet stays 1u
- 1u win → set 0u, next bet 2u
- 2u win → set +2u → reset

**Tradeoff:** many small wins, occasional bigger drawdowns; still bounded by cap.

---

### Strategy 4 — D’Alembert (gentle “up after loss, down after win”)
**Behavior:** Step bet size by 1 unit.
This is a calmer alternative to Martingale.

**Config**
- `minUnits = 1`
- `maxUnits = 5` (or user’s cap)

**State**
- `betUnits` (starts 1)

**Rules**
- LOSS/SURRENDER: `betUnits = min(betUnits + 1, maxUnits)`
- WIN/BJ: `betUnits = max(betUnits - 1, minUnits)`
- PUSH: unchanged

**Example**
- 1u loss → 2u
- 2u loss → 3u
- 3u win → 2u
- 2u win → 1u

**Why it works for “spice”:** creates a rhythm without exponential blowups.

---

### Strategy 5 — Martingale‑Lite (2‑step only, hard reset)
**Behavior:** One recovery step only. Avoid true Martingale.

**Config**
- `baseUnits = 1`
- `recoveryUnits = 2` (fixed)
- cap must be ≥2u

**State**
- `isInRecovery = false`

**Rules**
- Start bet = 1u.
- If LOSS at 1u → next bet = 2u (recovery).
- After recovery hand (win or loss) → reset to 1u.
- PUSH: keep current step.

**Example**
- 1u loss → 2u win → reset to 1u
- 1u loss → 2u loss → reset to 1u

**Purpose:** a bit of action, bounded max loss per “attempt”.

---

### Strategy 6 — Fibonacci‑Lite (bounded, slower growth than Martingale)
**Behavior:** On losses, move forward in Fibonacci steps; on wins, step back 2 positions.

**Config**
- `seq = [1, 1, 2, 3, 5, 8]` (default; must cap)
- `maxIndex = seq.length - 1`

**State**
- `index = 0`

**Rules**
- LOSS/SURRENDER: `index = min(index + 1, maxIndex)`
- WIN/BJ: `index = max(index - 2, 0)`
- PUSH: unchanged
- Next bet = `seq[index] * u`

**Example**
- 1u loss → 1u loss → 2u loss → 3u win → back two → 1u

**Note:** still can climb; cap is mandatory.

---

### Strategy 7 — 1‑3‑2‑6 (classic press ladder, but capped)
**Behavior:** Press through a short ladder on wins; reset on loss.
Great “casino feel” with bounded exposure.

**Config**
- `ladder=[1,3,2,6]`
- cap enforced (if cap < 6, scale ladder down or disallow)

**State**
- `stepIndex`

**Rules**
- WIN/BJ: advance step; if completes ladder on win → reset
- LOSS/SURRENDER: reset
- PUSH: keep same step

---

### Strategy 8 — Custom Ladder / Cycle (user-defined sequence)
**Behavior:** User chooses a sequence like `[1,1,2,2,3,2,2,1]` and rules for stepping.

**Config**
- `sequence: number[]`
- `advanceOnWin: boolean`
- `advanceOnLoss: boolean`
- `resetOnLoss: boolean`
- `resetOnSequenceEnd: boolean`

**State**
- `index`

This supports experimentation while still enforcing caps and stop rules.

---

### Handling doubles/splits in bet strategies
Because doubles/splits change exposure, treat “netUnitsDelta” correctly:
- Normal win: `+1u`
- Normal loss: `-1u`
- Blackjack win: `+1.5u` (if 3:2)
- Surrender: `-0.5u`
- Double win: `+2u`
- Double loss: `-2u`
- Splits: outcome is the sum of each hand (could be -2u, 0u, +2u, etc.)

Implementation tip: don’t infer net from outcome label—compute it from the hand resolution.

---

## 7) Session Tracking & Storage

### Entities
**Ruleset**
- id, decks, h17, payout, double rules, DAS, split rules, surrender, etc.

**Session**
- id, start/end time, rulesetId
- bankrollStart, bankrollEnd
- unitSize, bettingStrategyId+config
- stop-loss / take-profit triggers
- handsCount, notes (casino, machine)

**Hand**
- sessionId, timestamp
- dealerUpcard, playerCards[]
- recommendedAction, userAction (optional)
- betAmount, exposureAmount (after split/double)
- outcome + netDelta (in $ and in units)
- runningBankrollAfter

### Export
- CSV: hands
- JSON: full replay
- Summary image: shareable session snapshot

---

## 8) “Other Things” Worth Adding (Recommended)

### A) Machine rules checklist (fast verify)
A guided checklist to avoid “gotcha” games:
- Confirm **3:2 vs 6:5**
- Confirm **double allowed**
- Confirm **splitting allowed**
- Confirm H17/S17
(Users often misread this in casino lighting.)

### B) Pace control
Show a live counter: hands/hour estimate and expected loss/hour estimate:
`expectedLossPerHour = avgBet * handsPerHour * houseEdge`

### C) Mistake tracker (optional)
If user enters the action they actually took, compare to recommended action and track “mistake rate.”

### D) “Practice mode”
Random-hand drill using the same ruleset to build muscle memory.

### E) Multi-hand support
Some video blackjack lets you play 2–3 hands at once. This should be an option.

---

## 9) Implementation Plan (Practical)

### Phase 1 (MVP, 1–2 weeks)
- PWA skeleton + offline storage
- Ruleset profiles
- Basic strategy tables for common rulesets (start with 6D H17 3:2 DAS no surrender)
- Session + hand logging
- 3 bet strategies: Flat, Mini-Paroli, D’Alembert
- Export CSV + session summary view

### Phase 2
- Add more betting strategies (Oscar’s Grind, 1-3-2-6, Fibonacci-lite, custom cycles)
- “Expected loss/hour” widget + pace controls
- Practice mode

### Phase 3
- EV solver for arbitrary rulesets (cache results)
- Better analytics and reports
- Cloud sync (optional)

---

## 10) “Casino-ready” Defaults (sane starting settings)
- Unit: user choice
- Bet cap: **4u**
- Stop-loss: **-25u**
- Take-profit: **+10u**
- Default betting: **Mini‑Paroli 1‑2‑4** (bounded, fun)
- Default pace: “slow mode” (optional reminder every 10 hands)

---

## Appendix — Recommended UI Layout (single screen)
Top row:
- Bankroll, Session P/L, Current bet, Next bet

Middle:
- Dealer upcard big buttons (A,2..10)
- Player card big buttons (A,2..10)
- Hand readout (e.g., “A+6 (Soft 17)”)

Bottom:
- Recommended action (large)
- Outcome buttons (WIN / LOSS / PUSH / BJ / SURRENDER)
- Undo / New Hand
