import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useSession, useUpdateSession } from "@/hooks/use-sessions";
import { useCreateHand, useHands } from "@/hooks/use-hands";
import { useStrategy } from "@/hooks/use-strategy";
import { CardInput } from "@/components/CardInput";
import { PlayingCard, EmptyCardSlot } from "@/components/PlayingCard";
import { StrategyCard } from "@/components/StrategyCard";
import { ArrowLeft, RefreshCcw, DollarSign, Wallet, Check, X, Ban, Split, Layers, CircleOff } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function Session() {
  const [, params] = useRoute("/session/:id");
  const sessionId = params ? parseInt(params.id) : 0;
  const [, setLocation] = useLocation();

  const { data: session, isLoading: isLoadingSession } = useSession(sessionId);
  const { data: hands } = useHands(sessionId);
  const { mutate: createHand, isPending: isRecording } = useCreateHand();
  const { mutate: calculateStrategy, data: strategy, isPending: isCalculating } = useStrategy();
  const { mutate: updateSession } = useUpdateSession();

  // Game State
  const [dealerCard, setDealerCard] = useState<string | null>(null);
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState<"dealer" | "player">("dealer");
  const [showResultInput, setShowResultInput] = useState(false);

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
      setActiveInput("player");
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
    const bet = session.unitSize;
    
    if (result === "WIN") payout = bet;
    else if (result === "BLACKJACK") payout = Math.floor(bet * 1.5); // Simplified 3:2
    else if (result === "LOSS") payout = -bet;
    else if (result === "SURRENDER") payout = -Math.floor(bet * 0.5);
    // PUSH is 0

    const newBankroll = session.currentBankroll + payout;

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
        // Optimistically update local session bankroll if needed, or rely on invalidation
        updateSession({ id: sessionId, currentBankroll: newBankroll });
        resetHand();
      }
    });
  };

  const resetHand = () => {
    setDealerCard(null);
    setPlayerCards([]);
    setActiveInput("dealer");
    setShowResultInput(false);
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

      {/* Controls Area - Fixed Bottom */}
      <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-xl border-t border-white/10 p-4 pb-8 z-40">
        <div className="max-w-lg mx-auto space-y-4">
          
          {/* Action Prompt or Result Buttons */}
          {strategy?.recommendation ? (
            <div className="grid grid-cols-4 gap-2">
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
            </div>
          ) : (
            <CardInput onSelect={handleCardSelect} disabled={false} />
          )}

          {/* Context indicator */}
          <div className="flex justify-between items-center text-xs text-muted-foreground px-2">
             <span>{activeInput === 'dealer' ? 'Select Dealer Card' : 'Select Player Cards'}</span>
             <span>Hand #{hands ? hands.length + 1 : 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
