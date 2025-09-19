import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import StatsCard from "@/components/stats-card";
import { Gem, Clock, Trophy, DollarSign, Plus, Search, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateOnly, formatRelativeDate } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/utils";

interface IndividualAuction {
  id: string;
  opalType: string;
  weight: string;
  facebookGroup: string;
  currentBid: string;
  startingBid: string;
  status: string;
  endTime: string;
}

interface LiveAuction {
  id: string;
  title: string;
  description?: string;
  facebookGroup: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "active" | "ended";
  totalItems: string;
}

export default function Dashboard() {
  // Fetch user settings
  const { data: settings } = useQuery<{ dateFormat: string; timezone: string }>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch individual auctions
  const { data: individualAuctions, isLoading: individualLoading } = useQuery<{ auctions: IndividualAuction[] }>({
    queryKey: ["/api/auctions"],
    queryFn: async () => {
      const response = await fetch("/api/auctions");
      if (!response.ok) throw new Error("Failed to fetch auctions");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show new bids
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  // Fetch live auctions
  const { data: liveAuctions, isLoading: liveLoading } = useQuery<{ liveAuctions: LiveAuction[] }>({
    queryKey: ["/api/live-auctions"],
    queryFn: async () => {
      const response = await fetch("/api/live-auctions");
      if (!response.ok) throw new Error("Failed to fetch live auctions");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show new bids
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const isLoading = individualLoading || liveLoading;
  const recentIndividualAuctions = individualAuctions?.auctions?.slice(0, 3) || [];
  const recentLiveAuctions = liveAuctions?.liveAuctions?.slice(0, 3) || [];
  const totalAuctions = (individualAuctions?.auctions?.length || 0) + (liveAuctions?.liveAuctions?.length || 0);
  const activeAuctions = (individualAuctions?.auctions?.filter(a => a.status === "active").length || 0) + 
                        (liveAuctions?.liveAuctions?.filter(a => a.status === "active").length || 0);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "bg-accent/10 text-accent";
      case "active": return "bg-green-500/10 text-green-600";
      case "lost": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
        <div className="text-sm text-muted-foreground">
          Last updated: <span data-testid="last-updated">{formatRelativeDate(new Date(), settings)}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Total Auctions"
          value={totalAuctions}
          icon={<Gem className="text-primary" />}
          trend={`${individualAuctions?.auctions?.length || 0} individual + ${liveAuctions?.liveAuctions?.length || 0} live`}
          trendColor="positive"
        />

        <StatsCard
          title="Active Individual Auctions"
          value={individualAuctions?.auctions?.filter(a => a.status === "active").length || 0}
          icon={<Clock className="text-amber-500" />}
          subtitle="Individual auction listings"
        />

        <StatsCard
          title="Active Live Auctions"
          value={liveAuctions?.liveAuctions?.filter(a => a.status === "active").length || 0}
          icon={<Calendar className="text-blue-500" />}
          subtitle="Live auction sessions"
        />
      </div>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Individual Auctions */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Recent Active Individual Auctions</h3>
            </div>
            <div className="p-6">
              {recentIndividualAuctions.length === 0 ? (
                <div className="text-center py-8">
                  <Gem className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No individual auctions tracked yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Link href="/add-auction" className="text-primary hover:underline">
                      Add your first auction
                    </Link>
                    {" "}to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentIndividualAuctions.map((auction) => (
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
                          {formatCurrency(auction.currentBid || auction.startingBid)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(auction.status)}`}
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

          {/* Recent Live Auctions */}
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Recent Active Live Auctions</h3>
            </div>
            <div className="p-6">
              {recentLiveAuctions.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-muted-foreground">No live auctions created yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <Link href="/live-auction-session" className="text-primary hover:underline">
                      Create your first live auction
                    </Link>
                    {" "}to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentLiveAuctions.map((auction) => (
                    <div key={auction.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                          <Calendar className="text-blue-500 text-sm" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {auction.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{auction.facebookGroup} • {auction.totalItems} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-foreground">
                          {formatDateOnly(auction.startTime, settings)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            auction.status === "active" ? "bg-green-500/10 text-green-600" :
                            auction.status === "scheduled" ? "bg-blue-500/10 text-blue-600" :
                            "bg-gray-500/10 text-gray-600"
                          }`}
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
        </div>

        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
            <p className="text-sm text-muted-foreground mt-1">Get started with common tasks</p>
            {/* Updated design - v2 */}
          </div>
          <div className="p-3">
            <div className="space-y-4">
              <Link href="/add-auction">
                <Button className="w-full justify-center h-8 text-xs" data-testid="button-add-auction">
                  <Plus className="w-3 h-3 mr-1" />
                  Add Individual Auction
                </Button>
              </Link>
              
              <Link href="/live-auction-session">
                <Button className="w-full justify-center h-8 text-xs bg-blue-600 hover:bg-blue-700">
                  <Calendar className="w-3 h-3 mr-1" />
                  Add Live Auction
                </Button>
              </Link>
              
              <div className="grid grid-cols-2 gap-2">
                <Link href="/auctions">
                  <Button variant="outline" className="w-full justify-center h-8 text-xs" data-testid="button-search-auctions">
                    <Search className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </Link>
                
                <Link href="/live-auction-dashboard">
                  <Button variant="outline" className="w-full justify-center h-8 text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    Manage
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
