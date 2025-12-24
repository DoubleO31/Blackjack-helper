import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface PlayingCardProps {
  value: string; // "2", "K", etc
  className?: string;
  isDealer?: boolean;
}

export function PlayingCard({ value, className, isDealer }: PlayingCardProps) {
  const isRed = ["A", "8", "9", "10", "J", "Q", "K"].includes(value) && Math.random() > 0.5; // Simulate suit color randomly for visual variety since we don't track suits

  return (
    <motion.div
      initial={{ rotateY: 90, scale: 0.8 }}
      animate={{ rotateY: 0, scale: 1 }}
      className={cn(
        "playing-card w-16 sm:w-20 md:w-24 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden",
        className
      )}
    >
      <div className={cn(
        "text-2xl sm:text-3xl font-black font-display",
        // Simple heuristic for color variety, in a real app we'd track suits
        ["A", "J", "Q", "K"].includes(value) ? "text-red-600" : "text-black"
      )}>
        {value}
      </div>
      
      {/* Corner indicators */}
      <div className={cn(
        "absolute top-1 left-1 text-xs font-bold leading-none",
        ["A", "J", "Q", "K"].includes(value) ? "text-red-600" : "text-black"
      )}>
        {value}
      </div>
      <div className={cn(
        "absolute bottom-1 right-1 text-xs font-bold leading-none rotate-180",
        ["A", "J", "Q", "K"].includes(value) ? "text-red-600" : "text-black"
      )}>
        {value}
      </div>

      {isDealer && (
         <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
      )}
    </motion.div>
  );
}

export function EmptyCardSlot({ label, onClick }: { label?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="w-16 sm:w-20 md:w-24 aspect-[2.5/3.5] rounded-lg border-2 border-dashed border-white/20 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
    >
      <span className="text-xs font-medium text-white/40 uppercase tracking-widest">{label || "Card"}</span>
    </button>
  );
}
