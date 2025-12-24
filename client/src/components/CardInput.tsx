import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CardInputProps {
  onSelect: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

const CARDS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function CardInput({ onSelect, disabled, compact }: CardInputProps) {
  const sizeClasses = compact
    ? "h-10 sm:h-11 text-sm sm:text-base rounded-lg"
    : "h-14 sm:h-16 text-lg sm:text-xl rounded-xl";
  const gridGap = compact ? "gap-1.5 sm:gap-2" : "gap-2";

  return (
    <div className={cn("grid grid-cols-4 sm:grid-cols-7", gridGap)}>
      {CARDS.map((card) => (
        <motion.button
          key={card}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(card)}
          disabled={disabled}
          className={cn(
            "font-bold font-display shadow-md transition-all",
            sizeClasses,
            "bg-white text-gray-900 border-b-4 border-gray-300 active:border-b-0 active:translate-y-1",
            "hover:bg-gray-50 hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none",
            ["J", "Q", "K"].includes(card) && "text-amber-700 bg-amber-50 border-amber-200",
            card === "A" && "text-red-700 bg-red-50 border-red-200 col-span-1"
          )}
        >
          {card}
        </motion.button>
      ))}
    </div>
  );
}
