import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Settings, Eye, Gem, Clock, DollarSign, Users, Search, Filter, Plus } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface LiveAuction {
  id: string;
  title: string;
  description?: string;
  facebookGroup: string;
  postUrl?: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "active" | "ended";
  totalItems: string;
  createdAt: string;
  updatedAt: string;
}

interface LiveAuctionsResponse {
  liveAuctions: LiveAuction[];
  total: number;
}

export default function LiveAuctionDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("active");

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

  // Fetch live auctions
  const { data: liveAuctionsData, isLoading } = useQuery<LiveAuctionsResponse>({
    queryKey: ["/api/live-auctions"],
    queryFn: async () => {
      const response = await fetch("/api/live-auctions");
      if (!response.ok) throw new Error("Failed to fetch live auctions");
      return response.json();
    },
    refetchInterval: 5000, // Refresh every 5 seconds to show new bids
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled": return "bg-blue-500/10 text-blue-600";
      case "active": return "bg-green-500/10 text-green-600";
      case "ended": return "bg-gray-500/10 text-gray-600";
      default: return "bg-gray-500/10 text-gray-600";
    }
  };

  const formatDateDisplay = (dateString: string) => formatDate(new Date(dateString), settings);

  // Filter auctions based on search and status
  const filteredAuctions = liveAuctionsData?.liveAuctions.filter(auction => {
    const matchesSearch = searchTerm === "" || 
      auction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auction.facebookGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auction.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || auction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  // Separate active and ended auctions
  const activeAuctions = filteredAuctions.filter(auction => auction.status === "active" || auction.status === "scheduled");
  const endedAuctions = filteredAuctions.filter(auction => auction.status === "ended");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Live Auction Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and monitor your live auction sessions
          </p>
        </div>
        <Button onClick={() => window.location.href = "/live-auction-session"}>
          <Plus className="w-4 h-4 mr-2" />
          Create Live Auction Session
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search live auctions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Gem className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Live Auctions</p>
                <p className="text-2xl font-bold text-foreground">{liveAuctionsData?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold text-foreground">
                  {liveAuctionsData?.liveAuctions.filter(a => a.status === "active").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold text-foreground">
                  {liveAuctionsData?.liveAuctions.filter(a => a.status === "scheduled").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-gray-500/10 rounded-lg">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-foreground">
                  {liveAuctionsData?.liveAuctions.filter(a => a.status === "ended").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Active and Past Auctions */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="active">Active Live Auctions</TabsTrigger>
          <TabsTrigger value="ended">Past Live Auctions</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 bg-muted rounded w-1/3"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                      <div className="h-3 bg-muted rounded w-1/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeAuctions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Play className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Live Auctions</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first live auction session to get started
                </p>
                <Button onClick={() => window.location.href = "/live-auction-session"}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Live Auction Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAuctions.map((auction) => (
                <Card key={auction.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {auction.title}
                          <Badge className={getStatusColor(auction.status)}>
                            {auction.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {auction.facebookGroup} • {auction.totalItems} items
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/live-auction-control/${auction.id}`)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Live Control
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/live-auction-item-manager?auction=${auction.id}`)}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Items
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Start:</span>
                        <p className="font-medium">{formatDateDisplay(auction.startTime)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">End:</span>
                        <p className="font-medium">{formatDateDisplay(auction.endTime)}</p>
                      </div>
                    </div>
                    {auction.description && (
                      <p className="text-sm text-muted-foreground mt-4">{auction.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ended" className="mt-6">
          {endedAuctions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Past Live Auctions</h3>
                <p className="text-muted-foreground">
                  Completed live auction sessions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {endedAuctions.map((auction) => (
                <Card key={auction.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {auction.title}
                          <Badge className={getStatusColor(auction.status)}>
                            {auction.status}
                          </Badge>
                        </CardTitle>
                        <CardDescription>
                          {auction.facebookGroup} • {auction.totalItems} items
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocation(`/live-auction-item-manager?auction=${auction.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Results
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Started:</span>
                        <p className="font-medium">{formatDateDisplay(auction.startTime)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ended:</span>
                        <p className="font-medium">{formatDateDisplay(auction.endTime)}</p>
                      </div>
                    </div>
                    {auction.description && (
                      <p className="text-sm text-muted-foreground mt-4">{auction.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
