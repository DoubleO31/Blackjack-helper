import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import NewSession from "@/pages/NewSession";
import Session from "@/pages/Session";
import Rulesets from "@/pages/Rulesets";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/new-session" component={NewSession} />
      <Route path="/session/:id" component={Session} />
      <Route path="/rulesets" component={Rulesets} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
