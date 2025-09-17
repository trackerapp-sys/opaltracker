import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Auctions from "@/pages/auctions";
import AddAuction from "@/pages/add-auction";
import Export from "@/pages/export";
import BulkUpdate from "@/pages/bulk-update";
import LiveAuction from "@/pages/live-auction";
import LiveAuctionDashboard from "@/pages/live-auction-dashboard";
import LiveAuctionSession from "@/pages/live-auction-session";
import LiveAuctionItemManager from "@/pages/live-auction-item-manager";
import LiveAuctionControl from "@/pages/live-auction-control";
import BulkImport from "@/pages/bulk-import";
import Settings from "@/pages/settings";
import OpalTypeSettings from "@/pages/opal-type-settings";
import Help from "@/pages/help";
import Monitor from "@/pages/monitor";
import DevTesting from "@/pages/dev-testing";
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
          <Route path="/export" component={Export} />
          <Route path="/bulk-update" component={BulkUpdate} />
          <Route path="/live-auction" component={LiveAuction} />
          <Route path="/live-auction-dashboard" component={LiveAuctionDashboard} />
          <Route path="/live-auction-session" component={LiveAuctionSession} />
          <Route path="/live-auction-item-manager" component={LiveAuctionItemManager} />
        <Route path="/live-auction-control/:id" component={LiveAuctionControl} />
          <Route path="/bulk-import" component={BulkImport} />
          <Route path="/settings" component={Settings} />
          <Route path="/opal-type-settings" component={OpalTypeSettings} />
          <Route path="/help" component={Help} />
          <Route path="/monitor" component={Monitor} />
          {process.env.NODE_ENV === 'development' && <Route path="/dev-testing" component={DevTesting} />}
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
