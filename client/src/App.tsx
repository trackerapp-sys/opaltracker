import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Auctions from "@/pages/auctions";
import AddAuction from "@/pages/add-auction";
import Analytics from "@/pages/analytics";
import Export from "@/pages/export";
import BulkUpdate from "@/pages/bulk-update";
import Monitor from "@/pages/monitor";
import LiveAuction from "@/pages/live-auction";
import BulkImport from "@/pages/bulk-import";
import AuctionTemplates from "@/pages/auction-templates";
import Sidebar from "@/components/sidebar";

function Router() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/auctions" component={Auctions} />
          <Route path="/add-auction" component={AddAuction} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/export" component={Export} />
          <Route path="/bulk-update" component={BulkUpdate} />
          <Route path="/monitor" component={Monitor} />
          <Route path="/live-auction" component={LiveAuction} />
          <Route path="/bulk-import" component={BulkImport} />
          <Route path="/templates" component={AuctionTemplates} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
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
