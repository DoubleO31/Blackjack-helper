import { useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useSession } from "@/hooks/use-sessions";
import { useCreateHand, useHands } from "@/hooks/use-hands";
import { useStrategy } from "@/hooks/use-strategy";
import { CardInput } from "@/components/CardInput";
import { PlayingCard, EmptyCardSlot } from "@/components/PlayingCard";
import { StrategyCard } from "@/components/StrategyCard";
import { ArrowLeft, RefreshCcw, DollarSign, Wallet, Check, X, CircleOff, ChevronUp, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { computeNextBet } from "@/lib/betting";

export default function Session() {
  const [, params] = useRoute("/session/:id");
  const sessionId = params ? parseInt(params.id) : 0;

  const { data: session, isLoading: isLoadingSession } = useSession(sessionId);
  const { data: hands } = useHands(sessionId);
  const { mutate: createHand, isPending: isRecording } = useCreateHand();
  const { mutate: calculateStrategy, data: strategy, isPending: isCalculating } = useStrategy();

  // Game State
  const [dealerCard, setDealerCard] = useState<string | null>(null);
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState<"dealer" | "player">("dealer");
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const orderedHands = useMemo(
    () => (hands ? [...hands].sort((a, b) => a.handNumber - b.handNumber) : []),
    [hands],
  );

  const betInfo = useMemo(
    () =>
      session
        ? computeNextBet(session.bettingStrategy, session.unitSize, orderedHands)
        : { nextAmount: session?.unitSize ?? 0, nextUnits: 1, strategyUsed: "flat" },
    [session, orderedHands],
  );
  const currentBet = betInfo.nextAmount || session?.unitSize || 0;
  const strategyLabel = useMemo(() => {
    switch (betInfo.strategyUsed) {
      case "mini_paroli":
        return "Mini-Paroli";
      case "oscar":
        return "Oscar's Grind";
      case "dalembert":
        return "d'Alembert";
      case "martingale_lite":
        return "Martingale Lite";
      case "fibonacci_lite":
        return "Fibonacci Lite";
      case "one_three_two_six":
        return "1-3-2-6";
      case "flat":
        return "Flat";
      default:
        return betInfo.strategyUsed || session?.bettingStrategy || "Flat";
    }
  }, [betInfo.strategyUsed, session?.bettingStrategy]);

  // Strategy Calculation Effect
  useEffect(() => {
    if (session && dealerCard && playerCards.length >= 2) {
      calculateStrategy({
        rulesetId: session.rulesetId,
        dealerUpCard: dealerCard,
        playerCards: playerCards,
      });
    }
  }, [dealerCard, playerCards, session, calculateStrategy]);

  // Handlers
  const handleCardSelect = (value: string) => {
    if (activeInput === "dealer") {
      setDealerCard(value);
      // keep activeInput as dealer unless user switches tabs; no auto-switch to avoid mismatch
    } else {
      if (playerCards.length < 5) {
        setPlayerCards([...playerCards, value]);
      }
    }
  };

  const handleResult = (result: "WIN" | "LOSS" | "PUSH" | "BLACKJACK" | "SURRENDER") => {
    if (!session || !dealerCard || !strategy) return;

    // Calculate payout
    let payout = 0;
    const bet = currentBet;
    
    if (result === "WIN") payout = bet;
    else if (result === "BLACKJACK") payout = Math.floor(bet * 1.5); // Simplified 3:2
    else if (result === "LOSS") payout = -bet;
    else if (result === "SURRENDER") payout = -Math.floor(bet * 0.5);
    // PUSH is 0

    createHand({
      sessionId,
      handNumber: (hands?.length || 0) + 1,
      dealerUpCard: dealerCard,
      playerCards: playerCards,
      recommendedAction: strategy.recommendation,
      betAmount: bet,
      payout,
      result,
    }, {
      onSuccess: () => {
        resetHand();
        setIsPanelOpen(false);
      }
    });
  };

  const resetHand = () => {
    setDealerCard(null);
    setPlayerCards([]);
    setActiveInput("dealer");
    setIsPanelOpen(false);
  };

  if (isLoadingSession) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!session) return <div className="min-h-screen flex items-center justify-center text-white">Session not found</div>;

  return (
    <div className="min-h-screen pb-24 md:pb-8 flex flex-col max-w-lg mx-auto relative">
      {/* Header Bar */}
      <header className="bg-card/90 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <Link href="/" className="text-muted-foreground hover:text-white p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-xs text-muted-foreground uppercase tracking-widest">{session.location}</span>
          <div className="flex items-center gap-1 font-mono font-bold text-green-400">
            <Wallet className="w-4 h-4" /> ${session.currentBankroll.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Next bet: ${currentBet.toLocaleString()} ({strategyLabel})
          </div>
        </div>
        <button 
           onClick={resetHand} 
           className="text-muted-foreground hover:text-white p-2 -mr-2"
           title="Reset Hand"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 p-4 space-y-8">
        
        {/* Dealer Area */}
        <section className="flex flex-col items-center justify-center space-y-2 min-h-[140px]">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Dealer Upcard</span>
          <div onClick={() => setActiveInput("dealer")}>
            {dealerCard ? (
              <PlayingCard value={dealerCard} isDealer />
            ) : (
              <EmptyCardSlot 
                label="Select" 
                onClick={() => setActiveInput("dealer")} 
              />
            )}
          </div>
        </section>

        {/* Strategy Display - Central Focus */}
        <section className="w-full max-w-sm mx-auto">
          {dealerCard && playerCards.length >= 2 ? (
            <StrategyCard 
              recommendation={strategy?.recommendation || null} 
              reasoning={strategy?.reasoning}
              isLoading={isCalculating}
            />
          ) : (
            <div className="h-40 rounded-2xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center text-muted-foreground text-sm uppercase tracking-widest">
              Deal Cards for Advice
            </div>
          )}
        </section>

        {/* Player Area */}
        <section className="flex flex-col items-center space-y-2">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Player Hand</span>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 min-h-[120px]">
            {playerCards.map((card, i) => (
               <PlayingCard key={i} value={card} />
            ))}
            {playerCards.length < 5 && (
              <EmptyCardSlot 
                label="Add" 
                onClick={() => setActiveInput("player")} 
              />
            )}
          </div>
        </section>
      </main>

      {/* Controls Area - Fixed Bottom Sheet */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-xl border-t border-white/10 p-3 z-40">
        <div className="max-w-lg mx-auto">
          <button
            className="w-full flex items-center justify-between text-xs text-muted-foreground px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition"
            onClick={() => setIsPanelOpen((prev) => !prev)}
            aria-expanded={isPanelOpen}
            aria-controls="card-entry-panel"
          >
            <span className="flex items-center gap-2">
              {activeInput === "dealer" ? "Dealer upcard" : "Player hand"}
              <span className="text-[11px] text-white/70">Hand #{hands ? hands.length + 1 : 1}</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-[11px] text-white/70">Next bet ${currentBet}</span>
              {isPanelOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </span>
          </button>

          {isPanelOpen && (
            <div id="card-entry-panel" className="mt-3 space-y-3 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto pb-2">
              {/* Tabbed selector for Dealer/Player */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => setActiveInput("dealer")}
                  aria-pressed={activeInput === "dealer"}
                  className={`rounded-lg px-3 py-2 border ${activeInput === "dealer" ? "bg-primary/20 border-primary text-white" : "bg-white/5 border-white/10 text-muted-foreground"}`}
                >
                  Dealer
                </button>
                <button
                  onClick={() => setActiveInput("player")}
                  aria-pressed={activeInput === "player"}
                  className={`rounded-lg px-3 py-2 border ${activeInput === "player" ? "bg-primary/20 border-primary text-white" : "bg-white/5 border-white/10 text-muted-foreground"}`}
                >
                  Player
                </button>
              </div>

              <CardInput onSelect={handleCardSelect} disabled={false} />

              {/* Result Buttons - Show when strategy available */}
              {strategy?.recommendation && (
                <div className="grid grid-cols-5 gap-2">
                  <button
                    onClick={() => handleResult("WIN")}
                    disabled={isRecording}
                    className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/50 rounded-lg p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                  >
                    <Check className="w-6 h-6" />
                    <span className="text-xs font-bold">WIN</span>
                  </button>
                  <button
                    onClick={() => handleResult("LOSS")}
                    disabled={isRecording}
                    className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/50 rounded-lg p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                  >
                    <X className="w-6 h-6" />
                    <span className="text-xs font-bold">LOSS</span>
                  </button>
                  <button
                    onClick={() => handleResult("PUSH")}
                    disabled={isRecording}
                    className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/50 rounded-lg p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                  >
                    <CircleOff className="w-6 h-6" />
                    <span className="text-xs font-bold">PUSH</span>
                  </button>
                  <button
                    onClick={() => handleResult("BLACKJACK")}
                    disabled={isRecording}
                    className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-600/50 rounded-lg p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                  >
                    <DollarSign className="w-6 h-6" />
                    <span className="text-xs font-bold">BJ</span>
                  </button>
                  <button
                    onClick={() => handleResult("SURRENDER")}
                    disabled={isRecording}
                    className="bg-slate-600/20 hover:bg-slate-600/30 text-slate-200 border border-slate-500/50 rounded-lg p-3 flex flex-col items-center gap-1 transition-all active:scale-95"
                  >
                    <X className="w-6 h-6" />
                    <span className="text-xs font-bold">Surrender</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
