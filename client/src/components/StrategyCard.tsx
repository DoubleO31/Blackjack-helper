import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  recommendation: "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER" | null;
  reasoning?: string;
  isLoading?: boolean;
  compact?: boolean;
}

export function StrategyCard({ recommendation, reasoning, isLoading, compact }: StrategyCardProps) {
  const getColors = (rec: string | null) => {
    switch (rec) {
      case "HIT": return "bg-green-600 text-white border-green-400";
      case "STAND": return "bg-red-600 text-white border-red-400";
      case "DOUBLE": return "bg-blue-600 text-white border-blue-400";
      case "SPLIT": return "bg-yellow-500 text-black border-yellow-300";
      case "SURRENDER": return "bg-gray-600 text-white border-gray-400";
      default: return "bg-card text-muted-foreground border-border";
    }
  };

  const containerSize = compact
    ? "rounded-xl p-3 border-2 shadow-lg"
    : "rounded-2xl p-8 border-4 shadow-2xl";
  const titleSize = compact ? "text-lg tracking-normal leading-tight" : "text-5xl tracking-wider";
  const bodySize = compact ? "text-xs" : "text-lg";
  const minHeight = compact ? "min-h-[80px]" : "min-h-[140px]";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative overflow-hidden text-center transition-all duration-300",
        containerSize,
        getColors(recommendation)
      )}
    >
      <div className={cn("relative z-10 flex flex-col items-center justify-center", minHeight)}>
        {isLoading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className={cn("bg-current/20 rounded mb-3", compact ? "h-5 w-20" : "h-8 w-32")} />
            <div className={cn("bg-current/10 rounded", compact ? "h-3 w-24" : "h-4 w-48")} />
          </div>
        ) : recommendation ? (
          <>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={cn("font-black font-display uppercase drop-shadow-md break-words", titleSize)}
            >
              {recommendation}
            </motion.h2>
            {reasoning && !compact && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.1 }}
                className={cn("mt-2 font-medium opacity-90 max-w-md mx-auto", bodySize)}
              >
                {reasoning}
              </motion.p>
            )}
          </>
        ) : (
          <div className={cn("text-muted-foreground/50 font-display uppercase tracking-widest", compact ? "text-xs" : "text-2xl")}>
            Awaiting Deal...
          </div>
        )}
      </div>

      {/* Decorative background glow */}
      {recommendation && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      )}
    </motion.div>
  );
}
