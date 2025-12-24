import { Link } from "wouter";
import { useSessions } from "@/hooks/use-sessions";
import { Plus, History, Trophy, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function Home() {
  const { data: sessions, isLoading } = useSessions();

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto space-y-12">
      {/* Hero Section */}
      <header className="text-center space-y-4 pt-8">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-4xl md:text-6xl font-black font-display text-white tracking-tight"
        >
          BLACKJACK <span className="gold-text">HELPER</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-lg mx-auto"
        >
          Professional grade basic strategy assistant and bankroll tracker.
        </motion.p>
      </header>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/new-session" className="group">
          <div className="bg-gradient-to-br from-primary to-amber-600 p-8 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Plus className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">New Session</h3>
              <p className="text-primary-foreground/80 font-medium">Start tracking a new game</p>
            </div>
          </div>
        </Link>

        <Link href="/rulesets" className="group">
          <div className="bg-card border border-white/5 p-8 rounded-2xl shadow-lg hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-1">Rulesets</h3>
              <p className="text-muted-foreground">Configure casino rules</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Recent Sessions
          </h2>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-card/50 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : sessions?.length === 0 ? (
          <div className="text-center py-12 bg-card/30 rounded-2xl border border-dashed border-white/10">
            <p className="text-muted-foreground">No sessions yet. Start winning today.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {sessions?.slice(0, 5).map((session) => (
              <Link key={session.id} href={`/session/${session.id}`} className="block group">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-card border border-white/5 p-5 rounded-xl hover:bg-white/5 transition-all flex items-center justify-between group-hover:border-primary/30"
                >
                  <div>
                    <h4 className="font-bold text-lg text-white group-hover:text-primary transition-colors">
                      {session.location || "Unknown Location"}
                    </h4>
                    <p className="text-sm text-muted-foreground font-mono">
                      {session.startTime ? format(new Date(session.startTime), 'MMM d, h:mm a') : 'No date'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "font-mono font-bold text-lg",
                      session.currentBankroll >= session.initialBankroll ? "text-green-400" : "text-red-400"
                    )}>
                      ${session.currentBankroll.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                      View <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
