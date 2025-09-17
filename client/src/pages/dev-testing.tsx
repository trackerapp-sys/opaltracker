import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Play, Pause, Clock, Gem, TestTube, Users, DollarSign } from "lucide-react";

interface AuctionItem {
  id: string;
  liveAuctionId: string;
  lotNumber: string;
  opalType: string;
  weight: string;
  description: string;
  startingBid: string;
  currentBid?: string;
  currentBidder?: string;
  biddingDuration: number;
  biddingStartTime?: string;
  biddingEndTime?: string;
  status: "pending" | "active" | "ended";
  order: number;
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

export default function DevTesting() {
  const [selectedLiveAuction, setSelectedLiveAuction] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [bidAmount, setBidAmount] = useState<string>("");
  const [bidderName, setBidderName] = useState<string>("Test Bidder");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Development Mode Only</h2>
          <p className="text-muted-foreground">This testing interface is only available in development mode.</p>
        </div>
      </div>
    );
  }

  // Fetch live auctions
  const { data: liveAuctionsResponse } = useQuery<{ liveAuctions: LiveAuction[] }>({
    queryKey: ["/api/live-auctions"],
    queryFn: async () => {
      const response = await fetch("/api/live-auctions");
      if (!response.ok) throw new Error("Failed to fetch live auctions");
      return response.json();
    },
  });

  const liveAuctions = liveAuctionsResponse?.liveAuctions || [];

  // Fetch auction items for selected live auction
  const { data: auctionItemsResponse } = useQuery<{ auctionItems: AuctionItem[] }>({
    queryKey: ["/api/live-auctions", selectedLiveAuction, "items"],
    queryFn: async () => {
      const response = await fetch(`/api/live-auctions/${selectedLiveAuction}/items`);
      if (!response.ok) throw new Error("Failed to fetch auction items");
      return response.json();
    },
    enabled: !!selectedLiveAuction,
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const auctionItems = auctionItemsResponse?.auctionItems || [];
  const sortedItems = [...auctionItems].sort((a, b) => a.order - b.order);
  const currentItem = sortedItems.find(item => item.id === selectedItem);

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, updates }: { itemId: string; updates: Partial<AuctionItem> }) => {
      const response = await apiRequest("PATCH", `/api/live-auctions/${selectedLiveAuction}/items/${itemId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", selectedLiveAuction, "items"] });
    },
  });

  // Simulate bid mutation
  const simulateBidMutation = useMutation({
    mutationFn: async ({ itemId, bidAmount, bidderName }: { itemId: string; bidAmount: string; bidderName: string }) => {
      const response = await apiRequest("PATCH", `/api/live-auctions/${selectedLiveAuction}/items/${itemId}`, {
        currentBid: bidAmount,
        currentBidder: bidderName,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", selectedLiveAuction, "items"] });
      toast({
        title: "Bid Simulated",
        description: `Bid of $${bidAmount} from ${bidderName} has been applied`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to simulate bid. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSimulateBid = () => {
    if (!selectedItem || !bidAmount || !bidderName) {
      toast({
        title: "Missing Information",
        description: "Please select an item, enter a bid amount, and bidder name.",
        variant: "destructive",
      });
      return;
    }

    const currentBidNum = parseFloat(currentItem?.currentBid || currentItem?.startingBid || "0");
    const newBidNum = parseFloat(bidAmount);

    if (newBidNum <= currentBidNum) {
      toast({
        title: "Invalid Bid",
        description: `Bid must be higher than current bid of ${formatCurrency(currentBidNum)}`,
        variant: "destructive",
      });
      return;
    }

    simulateBidMutation.mutate({
      itemId: selectedItem,
      bidAmount,
      bidderName,
    });
  };

  const startAutoSimulation = () => {
    if (!selectedItem) {
      toast({
        title: "No Item Selected",
        description: "Please select an item to simulate bids on.",
        variant: "destructive",
      });
      return;
    }

    setIsSimulating(true);
    
    const interval = setInterval(() => {
      if (currentItem) {
        const currentBidNum = parseFloat(currentItem.currentBid || currentItem.startingBid || "0");
        const randomIncrement = Math.floor(Math.random() * 50) + 10; // $10-$60 increment
        const newBid = currentBidNum + randomIncrement;
        const testBidders = ["Test Bidder 1", "Test Bidder 2", "Test Bidder 3", "Auto Bidder", "Dev Tester"];
        const randomBidder = testBidders[Math.floor(Math.random() * testBidders.length)];

        simulateBidMutation.mutate({
          itemId: selectedItem,
          bidAmount: newBid.toString(),
          bidderName: randomBidder,
        });
      }
    }, 5000); // Simulate bid every 5 seconds

    setSimulationInterval(interval);
    
    toast({
      title: "Auto Simulation Started",
      description: "Bids will be simulated every 5 seconds automatically.",
    });
  };

  const stopAutoSimulation = () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setIsSimulating(false);
    
    toast({
      title: "Auto Simulation Stopped",
      description: "Automatic bid simulation has been stopped.",
    });
  };

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, [simulationInterval]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <TestTube className="w-6 h-6 text-orange-600" />
          Development Testing - Live Auction Bidding
        </h1>
        <p className="text-muted-foreground">
          Test live auction bidding functionality without creating real auctions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Testing Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-600" />
              Bid Simulation Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="liveAuction">Select Live Auction</Label>
              <Select value={selectedLiveAuction} onValueChange={setSelectedLiveAuction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a live auction to test" />
                </SelectTrigger>
                <SelectContent>
                  {liveAuctions.map((auction) => (
                    <SelectItem key={auction.id} value={auction.id}>
                      {auction.title} ({auction.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLiveAuction && (
              <div>
                <Label htmlFor="auctionItem">Select Auction Item</Label>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item to test bidding on" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.lotNumber} - {item.opalType} ({item.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentItem && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <h3 className="font-semibold mb-2">Current Item Details</h3>
                <div className="space-y-1 text-sm">
                  <p><strong>Lot:</strong> {currentItem.lotNumber}</p>
                  <p><strong>Type:</strong> {currentItem.opalType}</p>
                  <p><strong>Weight:</strong> {currentItem.weight} carats</p>
                  <p><strong>Reserve:</strong> {formatCurrency(currentItem.startingBid)}</p>
                  <p><strong>Current Bid:</strong> {formatCurrency(currentItem.currentBid || "0")}</p>
                  <p><strong>Current Bidder:</strong> {currentItem.currentBidder || "None"}</p>
                  <p><strong>Status:</strong> 
                    <Badge className={`ml-2 ${
                      currentItem.status === "active" ? "bg-green-500" :
                      currentItem.status === "ended" ? "bg-red-500" :
                      "bg-gray-500"
                    }`}>
                      {currentItem.status}
                    </Badge>
                  </p>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="bidderName">Bidder Name</Label>
              <Input
                id="bidderName"
                value={bidderName}
                onChange={(e) => setBidderName(e.target.value)}
                placeholder="Enter bidder name"
              />
            </div>

            <div>
              <Label htmlFor="bidAmount">Bid Amount ($)</Label>
              <Input
                id="bidAmount"
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Enter bid amount"
                min={currentItem ? parseFloat(currentItem.currentBid || currentItem.startingBid || "0") + 1 : 0}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSimulateBid}
                disabled={!selectedItem || !bidAmount || !bidderName || simulateBidMutation.isPending}
                className="flex-1"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Simulate Single Bid
              </Button>
            </div>

            <div className="flex gap-2">
              {!isSimulating ? (
                <Button 
                  onClick={startAutoSimulation}
                  disabled={!selectedItem}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Auto Simulation
                </Button>
              ) : (
                <Button 
                  onClick={stopAutoSimulation}
                  variant="destructive"
                  className="flex-1"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Stop Auto Simulation
                </Button>
              )}
            </div>

            {isSimulating && (
              <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Auto Simulation Active:</strong> Bids are being simulated every 5 seconds automatically.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Auction Items List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-blue-600" />
              Live Auction Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedLiveAuction ? (
              <p className="text-muted-foreground text-center py-8">
                Select a live auction to view its items
              </p>
            ) : sortedItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No items found in this live auction
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sortedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedItem === item.id 
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                    onClick={() => setSelectedItem(item.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{item.lotNumber} - {item.opalType}</h4>
                        <p className="text-sm text-muted-foreground">{item.weight} carats</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.currentBid || item.startingBid)}</p>
                        <Badge className={`text-xs ${
                          item.status === "active" ? "bg-green-500" :
                          item.status === "ended" ? "bg-red-500" :
                          "bg-gray-500"
                        }`}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    {item.currentBidder && (
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        👤 {item.currentBidder}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 mt-1">1</Badge>
              <p>Select a live auction from the dropdown to load its items</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 mt-1">2</Badge>
              <p>Choose an auction item to test bidding on</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 mt-1">3</Badge>
              <p>Enter a bidder name and bid amount (must be higher than current bid)</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 mt-1">4</Badge>
              <p>Click "Simulate Single Bid" to test one bid, or "Start Auto Simulation" for continuous testing</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge className="bg-blue-500/10 text-blue-600 mt-1">5</Badge>
              <p>Watch the live auction control page to see real-time bid updates</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
