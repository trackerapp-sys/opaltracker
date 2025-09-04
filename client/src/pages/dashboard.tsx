import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import StatsCard from "@/components/stats-card";
import { Gem, Clock, Trophy, DollarSign, Plus, Search, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Analytics {
  totalAuctions: number;
  activeAuctions: number;
  wonAuctions: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  winRate: number;
  recentAuctions: Array<{
    id: string;
    opalType: string;
    weight: string;
    facebookGroup: string;
    currentBid: string;
    startingBid: string;
    status: string;
    endTime: string;
  }>;
}

export default function Dashboard() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-card rounded-lg border border-border p-6 h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => `$${Math.round(value)}`;
  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "bg-accent/10 text-accent";
      case "active": return "bg-amber-500/10 text-amber-600";
      case "lost": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
        <div className="text-sm text-muted-foreground">
          Last updated: <span data-testid="last-updated">just now</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <StatsCard
          title="Total Auctions"
          value={analytics?.totalAuctions || 0}
          icon={<Gem className="text-primary" />}
          trend={analytics?.totalAuctions ? `${analytics.totalAuctions > 100 ? '+' : ''}${analytics.totalAuctions} tracked` : undefined}
          trendColor="positive"
        />

        <StatsCard
          title="Active Auctions"
          value={analytics?.activeAuctions || 0}
          icon={<Clock className="text-amber-500" />}
          subtitle={`Ending in next 24h: ${Math.floor((analytics?.activeAuctions || 0) / 3)}`}
        />

      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Recent Auctions</h3>
          </div>
          <div className="p-6">
            {analytics?.recentAuctions?.length === 0 ? (
              <div className="text-center py-8">
                <Gem className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">No auctions tracked yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <Link href="/add-auction" className="text-primary hover:underline">
                    Add your first auction
                  </Link>
                  {" "}to get started
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics?.recentAuctions?.map((auction) => (
                  <div key={auction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Gem className="text-primary text-sm" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {auction.opalType} - {auction.weight}ct
                        </p>
                        <p className="text-sm text-muted-foreground">{auction.facebookGroup}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        {formatCurrency(parseFloat(auction.currentBid || auction.startingBid))}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(auction.status)}`}
                        data-testid={`auction-status-${auction.status}`}
                      >
                        {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
          </div>
          <div className="p-6 space-y-4">
            <Link href="/add-auction">
              <Button className="w-full justify-center" data-testid="button-add-auction">
                <Plus className="w-4 h-4 mr-2" />
                Add New Auction
              </Button>
            </Link>
            
            <Link href="/auctions">
              <Button variant="secondary" className="w-full justify-center" data-testid="button-search-auctions">
                <Search className="w-4 h-4 mr-2" />
                Search Auctions
              </Button>
            </Link>
            
            <Link href="/bulk-update">
              <Button variant="secondary" className="w-full justify-center" data-testid="button-bulk-update">
                <RefreshCw className="w-4 h-4 mr-2" />
                Quick Updates
              </Button>
            </Link>
            
            <Link href="/export">
              <Button variant="outline" className="w-full justify-center" data-testid="button-export-data">
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
            </Link>

            {/* Ending Soon Alerts */}
            {analytics?.recentAuctions?.filter(auction => {
              if (!auction.endTime) return false;
              const end = new Date(auction.endTime);
              const now = new Date();
              const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
              return hoursUntilEnd > 0 && hoursUntilEnd <= 2 && auction.status === 'active';
            }).length > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="text-amber-600 mt-1 w-4 h-4" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Ending Soon!</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        {analytics?.recentAuctions?.filter(auction => {
                          if (!auction.endTime) return false;
                          const end = new Date(auction.endTime);
                          const now = new Date();
                          const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
                          return hoursUntilEnd > 0 && hoursUntilEnd <= 2 && auction.status === 'active';
                        }).length} auctions ending within 2 hours
                      </p>
                      <Link href="/auctions" className="text-xs text-amber-600 dark:text-amber-400 hover:underline">
                        View and update bids →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="text-blue-600 mt-1 w-4 h-4" />
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Manual Tracking</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Use quick update buttons (💰) in auction table for fast bid tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
