import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateSession } from "@/hooks/use-sessions";
import { useRulesets } from "@/hooks/use-rulesets";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function NewSession() {
  const [, setLocation] = useLocation();
  const { data: rulesets, isLoading: isLoadingRules } = useRulesets();
  const { mutate: createSession, isPending } = useCreateSession();

  const [formData, setFormData] = useState({
    location: "",
    rulesetId: 0,
    initialBankroll: 1000,
    unitSize: 25,
    bettingStrategy: "flat" as "flat" | "martingale" | "positive_progression",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.rulesetId) return;

    createSession({
      ...formData,
      currentBankroll: formData.initialBankroll,
    }, {
      onSuccess: (session) => {
        setLocation(`/session/${session.id}`);
      }
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-white mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Link>
        <h1 className="text-3xl font-bold font-display text-white">New Session</h1>
        <p className="text-muted-foreground">Configure your table settings</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Ruleset Selection */}
        <section className="space-y-4">
          <label className="text-sm font-medium text-white uppercase tracking-wider">Select Ruleset</label>
          {isLoadingRules ? (
            <div className="h-12 bg-card/50 rounded-lg animate-pulse" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rulesets?.map((ruleset) => (
                <button
                  key={ruleset.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, rulesetId: ruleset.id })}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all",
                    formData.rulesetId === ruleset.id
                      ? "bg-primary/20 border-primary text-white ring-2 ring-primary/20"
                      : "bg-card border-white/10 text-muted-foreground hover:bg-white/5 hover:border-white/20"
                  )}
                >
                  <div className="font-bold">{ruleset.name}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {ruleset.decks} Decks • {ruleset.blackjackPayout} • {ruleset.isH17 ? 'H17' : 'S17'}
                  </div>
                </button>
              ))}
              <Link href="/rulesets" className="flex items-center justify-center p-4 rounded-xl border border-dashed border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors">
                <span className="text-sm">+ Create New Ruleset</span>
              </Link>
            </div>
          )}
        </section>

        {/* Session Details */}
        <section className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white uppercase tracking-wider">Casino / Location</label>
            <input
              required
              className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/50"
              placeholder="e.g. Bellagio, Home Game"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white uppercase tracking-wider">Bankroll ($)</label>
              <input
                type="number"
                required
                className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                value={formData.initialBankroll}
                onChange={(e) => setFormData({ ...formData, initialBankroll: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white uppercase tracking-wider">Unit Size ($)</label>
              <input
                type="number"
                required
                className="w-full bg-card border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                value={formData.unitSize}
                onChange={(e) => setFormData({ ...formData, unitSize: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
        </section>

        <button
          type="submit"
          disabled={!formData.rulesetId || isPending}
          className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-5 h-5" /> Starting...
            </span>
          ) : (
            "Start Session"
          )}
        </button>
      </form>
    </div>
  );
}
