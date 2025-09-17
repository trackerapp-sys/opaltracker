import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Edit, Plus } from "lucide-react";
import AuctionTable from "@/components/auction-table";
import { formatDate } from "@/lib/dateUtils";
import { useOpalTypes } from "@/hooks/use-opal-types";

interface Auction {
  id: string;
  opalType: string;
  weight: string;
  description?: string;
  facebookGroup: string;
  postUrl?: string;
  startingBid: string;
  currentBid?: string;
  startTime: string;
  endTime: string;
  status: "active" | "ended";
  updatedAt: string;
}

interface AuctionsResponse {
  auctions: Auction[];
  total: number;
}

export default function Auctions() {
  const [search, setSearch] = useState("");
  const [opalType, setOpalType] = useState("all");
  const [status, setStatus] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("active");
  const limit = 10;

  // Get opal types from settings
  const { data: opalTypesData } = useOpalTypes();

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

  const { data, isLoading } = useQuery<AuctionsResponse>({
    queryKey: ["/api/auctions", search, opalType, activeTab, priceRange, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (opalType && opalType !== 'all') params.append('opalType', opalType);
      if (activeTab !== 'all') params.append('status', activeTab);
      if (priceRange && priceRange !== 'all') params.append('priceRange', priceRange);
      params.append('limit', limit.toString());
      params.append('offset', ((currentPage - 1) * limit).toString());
      
      const response = await fetch(`/api/auctions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch auctions');
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show new bids
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  // Auto-switch to "ended" tab when an auction ends
  useEffect(() => {
    if (data?.auctions) {
      // Check if we're on the active tab and there are no active auctions
      if (activeTab === "active" && data.auctions.length === 0) {
        // Check if there are any ended auctions by fetching all auctions
        fetch("/api/auctions?status=ended&limit=1")
          .then(response => response.json())
          .then(result => {
            if (result.auctions && result.auctions.length > 0) {
              console.log("🔄 Auto-switching to Past Auctions tab - auction has ended");
              setActiveTab("ended");
            }
          })
          .catch(error => {
            console.error("Error checking for ended auctions:", error);
          });
      }
    }
  }, [data?.auctions, activeTab]);

  const totalPages = Math.ceil((data?.total || 0) / limit);

  const formatDateDisplay = (dateString: string) => formatDate(new Date(dateString), settings);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "won": return "bg-accent/10 text-accent";
      case "active": return "bg-green-500/10 text-green-600";
      case "lost": return "bg-destructive/10 text-destructive";
      case "ended": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Auction Listings</h2>
        <Link href="/add-auction">
          <Button data-testid="button-add-auction">
            <Plus className="w-4 h-4 mr-2" />
            Add Auction
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Search</label>
            <Input
              type="text"
              placeholder="Search auctions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Opal Type</label>
            <Select value={opalType} onValueChange={setOpalType}>
              <SelectTrigger data-testid="select-opal-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(opalTypesData?.opalTypes || []).map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">Price Range</label>
            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger data-testid="select-price-range">
                <SelectValue placeholder="All Prices" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="$0 - $100">$0 - $100</SelectItem>
                <SelectItem value="$100 - $500">$100 - $500</SelectItem>
                <SelectItem value="$500 - $1000">$500 - $1000</SelectItem>
                <SelectItem value="$1000+">$1000+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs for Active and Completed Auctions */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active" className="text-center">
            Active Auctions
          </TabsTrigger>
          <TabsTrigger value="ended" className="text-center">
            Completed Auctions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {/* Active Auctions Stats */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{data?.auctions.filter(a => a.status === 'active').length || 0}</span> active auctions
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-amber-600">{data?.auctions.filter(a => {
                    const end = new Date(a.endTime);
                    const now = new Date();
                    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
                    return hoursUntilEnd > 0 && hoursUntilEnd <= 2 && a.status === 'active';
                  }).length || 0}</span> ending soon
                </div>
              </div>
            </div>
          </div>

          {/* Active Auctions Table */}
          {isLoading ? (
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          ) : data?.auctions.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No active auctions found</p>
                <p className="text-sm mb-4">
                  {search || opalType || priceRange 
                    ? "Try adjusting your filters or search terms"
                    : "Get started by adding your first auction"
                  }
                </p>
                <Link href="/add-auction">
                  <Button>Add Your First Auction</Button>
                </Link>
              </div>
            </div>
          ) : (
            <AuctionTable
              auctions={data?.auctions || []}
              formatDate={formatDateDisplay}
              getStatusColor={getStatusColor}
            />
          )}
        </TabsContent>

        <TabsContent value="ended" className="space-y-4">
          {/* Completed Auctions Stats */}
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{data?.auctions.filter(a => a.status === 'ended').length || 0}</span> completed auctions
                </div>
              </div>
            </div>
          </div>

          {/* Completed Auctions Table */}
          {isLoading ? (
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 bg-muted rounded"></div>
                ))}
              </div>
            </div>
          ) : data?.auctions.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <div className="text-muted-foreground">
                <p className="text-lg mb-2">No completed auctions found</p>
                <p className="text-sm mb-4">
                  Completed auctions will appear here when they end
                </p>
              </div>
            </div>
          ) : (
            <AuctionTable
              auctions={data?.auctions || []}
              formatDate={formatDateDisplay}
              getStatusColor={getStatusColor}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Pagination */}
      {data && data.total > limit && (
        <div className="flex items-center justify-between mt-6 px-6 py-3">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * limit) + 1}-{Math.min(currentPage * limit, data.total)} of {data.total} auctions
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              data-testid="button-previous-page"
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  data-testid={`button-page-${pageNum}`}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              data-testid="button-next-page"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
