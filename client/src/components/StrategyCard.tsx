import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StrategyCardProps {
  recommendation: "HIT" | "STAND" | "DOUBLE" | "SPLIT" | "SURRENDER" | null;
  reasoning?: string;
  isLoading?: boolean;
}

export function StrategyCard({ recommendation, reasoning, isLoading }: StrategyCardProps) {
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

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative overflow-hidden rounded-2xl p-8 text-center border-4 shadow-2xl transition-all duration-300",
        getColors(recommendation)
      )}
    >
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[140px]">
        {isLoading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-32 bg-current/20 rounded mb-4" />
            <div className="h-4 w-48 bg-current/10 rounded" />
          </div>
        ) : recommendation ? (
          <>
            <motion.h2 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-5xl font-black tracking-wider font-display uppercase drop-shadow-md"
            >
              {recommendation}
            </motion.h2>
            {reasoning && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{ delay: 0.1 }}
                className="mt-3 text-lg font-medium opacity-90 max-w-md mx-auto"
              >
                {reasoning}
              </motion.p>
            )}
          </>
        ) : (
          <div className="text-muted-foreground/50 font-display text-2xl uppercase tracking-widest">
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
