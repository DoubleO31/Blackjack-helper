import { useRulesets, useCreateRuleset } from "@/hooks/use-rulesets";
import { ArrowLeft, Loader2, Plus, Trash } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function Rulesets() {
  const { data: rulesets, isLoading } = useRulesets();
  const { mutate: createRuleset, isPending } = useCreateRuleset();
  const [open, setOpen] = useState(false);

  const [newRuleset, setNewRuleset] = useState({
    name: "",
    decks: 6,
    isH17: true,
    canDoubleAfterSplit: true,
    canSurrender: false,
    blackjackPayout: "3:2",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRuleset(newRuleset, {
      onSuccess: () => {
        setOpen(false);
        setNewRuleset({
          name: "",
          decks: 6,
          isH17: true,
          canDoubleAfterSplit: true,
          canSurrender: false,
          blackjackPayout: "3:2",
        });
      },
    });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-white mb-2 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Link>
          <h1 className="text-3xl font-bold font-display text-white">Rulesets</h1>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-bold shadow hover:bg-primary/90 transition-colors flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Ruleset
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-white/10 text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Create Ruleset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <input
                  required
                  placeholder="e.g. Vegas Single Deck"
                  className="w-full bg-background border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary"
                  value={newRuleset.name}
                  onChange={e => setNewRuleset({...newRuleset, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Decks</label>
                  <select 
                    className="w-full bg-background border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary"
                    value={newRuleset.decks}
                    onChange={e => setNewRuleset({...newRuleset, decks: parseInt(e.target.value)})}
                  >
                    {[1, 2, 4, 6, 8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">BJ Payout</label>
                  <select 
                    className="w-full bg-background border border-white/10 rounded-lg p-3 focus:outline-none focus:border-primary"
                    value={newRuleset.blackjackPayout}
                    onChange={e => setNewRuleset({...newRuleset, blackjackPayout: e.target.value})}
                  >
                    <option value="3:2">3:2</option>
                    <option value="6:5">6:5</option>
                    <option value="1:1">1:1</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-500 text-primary focus:ring-primary"
                    checked={newRuleset.isH17}
                    onChange={e => setNewRuleset({...newRuleset, isH17: e.target.checked})}
                  />
                  <span className="font-medium">Dealer Hits Soft 17 (H17)</span>
                </label>
                
                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-500 text-primary focus:ring-primary"
                    checked={newRuleset.canDoubleAfterSplit}
                    onChange={e => setNewRuleset({...newRuleset, canDoubleAfterSplit: e.target.checked})}
                  />
                  <span className="font-medium">Double After Split (DAS)</span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                  <input 
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-500 text-primary focus:ring-primary"
                    checked={newRuleset.canSurrender}
                    onChange={e => setNewRuleset({...newRuleset, canSurrender: e.target.checked})}
                  />
                  <span className="font-medium">Surrender Allowed</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 rounded-lg font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-4"
              >
                {isPending ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Save Ruleset"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground col-span-full">Loading rulesets...</div>
        ) : rulesets?.map((ruleset) => (
          <div key={ruleset.id} className="bg-card border border-white/5 p-6 rounded-xl hover:border-white/20 transition-colors">
            <h3 className="text-xl font-bold text-white mb-2">{ruleset.name}</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm text-muted-foreground">
              <div>Decks: <span className="text-white">{ruleset.decks}</span></div>
              <div>BJ Payout: <span className="text-white">{ruleset.blackjackPayout}</span></div>
              <div>Soft 17: <span className={cn(ruleset.isH17 ? "text-red-400" : "text-green-400")}>{ruleset.isH17 ? "Hit" : "Stand"}</span></div>
              <div>DAS: <span className="text-white">{ruleset.canDoubleAfterSplit ? "Yes" : "No"}</span></div>
              <div>Surrender: <span className="text-white">{ruleset.canSurrender ? "Yes" : "No"}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
