import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Play, Pause, Clock, Gem, Save, Download, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

interface LiveAuctionControlProps {
  liveAuctionId: string;
}

export default function LiveAuctionControl({ liveAuctionId }: LiveAuctionControlProps) {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionTimeRemaining, setTransitionTimeRemaining] = useState(0);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    description: "",
    startingBid: "",
    currentBid: "",
    currentBidder: "",
    biddingDuration: 5
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch live auction details
  const { data: liveAuctionResponse } = useQuery<{ liveAuction: LiveAuction }>({
    queryKey: ["/api/live-auctions", liveAuctionId],
    queryFn: async () => {
      const response = await fetch(`/api/live-auctions/${liveAuctionId}`);
      if (!response.ok) throw new Error("Failed to fetch live auction");
      return response.json();
    },
    enabled: !!liveAuctionId,
    refetchInterval: 2000, // Refresh every 2 seconds for live auctions
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const liveAuction = liveAuctionResponse?.liveAuction;

  // Fetch auction items
  const { data: auctionItemsResponse } = useQuery<{ auctionItems: AuctionItem[] }>({
    queryKey: ["/api/live-auctions", liveAuctionId, "items"],
    queryFn: async () => {
      const response = await fetch(`/api/live-auctions/${liveAuctionId}/items`);
      if (!response.ok) throw new Error("Failed to fetch auction items");
      return response.json();
    },
    enabled: !!liveAuctionId,
    refetchInterval: 2000, // Refresh every 2 seconds for live auctions
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const auctionItems = auctionItemsResponse?.auctionItems || [];
  const sortedItems = [...auctionItems].sort((a, b) => a.order - b.order);
  const currentItem = sortedItems[currentItemIndex];

  // Reset all items to pending status when component loads (except ended items)
  useEffect(() => {
    if (sortedItems.length > 0) {
      const activeItems = sortedItems.filter(item => item.status === "active");
      if (activeItems.length > 0) {
        console.log("Resetting active items to pending status");
        activeItems.forEach(item => {
          updateItemMutation.mutate({
            id: item.id,
            updates: {
              status: "pending",
              biddingStartTime: null,
              biddingEndTime: null,
            }
          });
        });
        setIsActive(false);
        setIsPaused(false);
        setTimeRemaining(0);
      }
    }
  }, [sortedItems.length]); // Only run when items are first loaded

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AuctionItem> }) => {
      const response = await apiRequest("PATCH", `/api/live-auctions/${liveAuctionId}/items/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId, "items"] });
    },
  });

  // Timer effect - starts when item becomes active
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (currentItem && currentItem.status === "active" && !isPaused) {
      console.log("Starting timer effect for item:", currentItem.lotNumber);
      
      // Calculate initial remaining time
      const calculateRemaining = () => {
        if (!currentItem.biddingEndTime) return 0;
        const endTime = new Date(currentItem.biddingEndTime).getTime();
        const now = new Date().getTime();
        return Math.max(0, endTime - now + totalPausedTime);
      };

      // Set initial time
      const initialRemaining = calculateRemaining();
      setTimeRemaining(initialRemaining);
      console.log("Initial remaining time:", initialRemaining);

      interval = setInterval(() => {
        const remaining = calculateRemaining();
        console.log("Timer tick - remaining:", remaining);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          console.log("Timer expired, ending item");
          handleItemEnd();
        }
      }, 1000);
    } else {
      console.log("Timer effect not running - status:", currentItem?.status, "isPaused:", isPaused);
    }

    return () => {
      if (interval) {
        console.log("Clearing timer interval");
        clearInterval(interval);
      }
    };
  }, [currentItem?.status, isPaused, currentItem?.biddingEndTime, totalPausedTime]);

  // Sync isActive state with item status
  useEffect(() => {
    if (currentItem) {
      setIsActive(currentItem.status === "active");
    }
  }, [currentItem?.status]);

  // Transition timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isTransitioning && transitionTimeRemaining > 0) {
      interval = setInterval(() => {
        setTransitionTimeRemaining(prev => {
          if (prev <= 1000) {
            setIsTransitioning(false);
            return 0;
          }
          return prev - 1000;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTransitioning, transitionTimeRemaining]);

  const startItem = () => {
    if (!currentItem) return;

    const now = new Date();
    const endTime = new Date(now.getTime() + (currentItem.biddingDuration * 60 * 1000));

    updateItemMutation.mutate({
      id: currentItem.id,
      updates: {
        status: "active",
        biddingStartTime: now.toISOString(),
        biddingEndTime: endTime.toISOString(),
      }
    });

    setIsActive(true);
    setIsPaused(false);
    setTotalPausedTime(0);
    setPauseStartTime(null);
    
    // Set initial time remaining
    const initialRemaining = currentItem.biddingDuration * 60 * 1000;
    setTimeRemaining(initialRemaining);
    
    toast({
      title: "Item Started",
      description: `Bidding started for ${currentItem.lotNumber}`,
    });
  };

  const pauseItem = () => {
    console.log("Pausing item, current time remaining:", timeRemaining);
    setIsPaused(true);
    setPauseStartTime(new Date());
    
    // Update time remaining immediately when pausing
    if (currentItem && currentItem.biddingEndTime) {
      const endTime = new Date(currentItem.biddingEndTime).getTime();
      const now = new Date().getTime();
      const remaining = Math.max(0, endTime - now + totalPausedTime);
      setTimeRemaining(remaining);
      console.log("Updated time remaining on pause:", remaining);
    }
    
    toast({
      title: "Timer Paused",
      description: `Bidding paused for ${currentItem.lotNumber}`,
    });
  };

  const resumeItem = () => {
    if (pauseStartTime) {
      const pauseDuration = new Date().getTime() - pauseStartTime.getTime();
      console.log("Resuming item, pause duration:", pauseDuration, "total paused:", totalPausedTime);
      setTotalPausedTime(prev => prev + pauseDuration);
      setPauseStartTime(null);
      
      // Update time remaining immediately when resuming
      if (currentItem && currentItem.biddingEndTime) {
        const endTime = new Date(currentItem.biddingEndTime).getTime();
        const now = new Date().getTime();
        const newTotalPaused = totalPausedTime + pauseDuration;
        const remaining = Math.max(0, endTime - now + newTotalPaused);
        setTimeRemaining(remaining);
        console.log("Updated time remaining on resume:", remaining);
      }
    }
    
    setIsPaused(false);
    toast({
      title: "Timer Resumed",
      description: `Bidding resumed for ${currentItem.lotNumber}`,
    });
  };

  const endItem = () => {
    if (!currentItem) return;

    updateItemMutation.mutate({
      id: currentItem.id,
      updates: {
        status: "ended",
        biddingEndTime: new Date().toISOString(),
      }
    });

    setIsActive(false);
    setIsPaused(false);
    setTotalPausedTime(0);
    setPauseStartTime(null);
    toast({
      title: "Item Ended",
      description: `Bidding ended for ${currentItem.lotNumber}`,
    });
  };

  const handleItemEnd = () => {
    endItem();
    
    setTimeout(() => {
      if (currentItemIndex < sortedItems.length - 1) {
        const nextIndex = currentItemIndex + 1;
        setCurrentItemIndex(nextIndex);
        
        // Start 30-second transition period
        setIsTransitioning(true);
        setTransitionTimeRemaining(30000); // 30 seconds
        
        toast({
          title: "Next Item",
          description: `Moving to ${sortedItems[nextIndex]?.lotNumber} - 30 second transition`,
        });
      } else {
        toast({
          title: "Auction Complete",
          description: "All items have been auctioned",
        });
      }
    }, 2000);
  };

  const nextItem = () => {
    if (currentItemIndex < sortedItems.length - 1) {
      if (isActive) {
        endItem();
      }
      setCurrentItemIndex(prev => prev + 1);
      setIsActive(false);
      setIsPaused(false);
      setTotalPausedTime(0);
      setPauseStartTime(null);
    }
  };

  const handleEditItem = () => {
    if (!currentItem) return;

    // Update the individual item using the existing mutation
    updateItemMutation.mutate({
      id: currentItem.id,
      updates: {
        description: editFormData.description,
        startingBid: parseFloat(editFormData.startingBid),
        currentBid: parseFloat(editFormData.currentBid),
        currentBidder: editFormData.currentBidder,
        biddingDuration: editFormData.biddingDuration,
      }
    });

    setShowEditDialog(false);
    toast({
      title: "Item Updated",
      description: `Updated ${currentItem.lotNumber}`,
    });
  };

  const openEditDialog = () => {
    if (currentItem) {
      setEditFormData({
        description: currentItem.description || "",
        startingBid: currentItem.startingBid || "",
        currentBid: (currentItem.currentBid || currentItem.startingBid).toString(),
        currentBidder: currentItem.currentBidder || "",
        biddingDuration: currentItem.biddingDuration || 5
      });
      setShowEditDialog(true);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!liveAuction || !currentItem) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">No Items Available</h2>
          <p className="text-muted-foreground">Add items to this live auction to start bidding</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Live Auction Control</h1>
          <p className="text-muted-foreground">{liveAuction.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Gem className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm text-muted-foreground">Current Item</p>
                <p className="font-semibold">{currentItemIndex + 1} of {sortedItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className={`w-5 h-5 mr-2 ${
                isTransitioning ? "text-orange-600" : 
                isActive && !isPaused ? "text-green-600" : 
                "text-gray-600"
              }`} />
              <div>
                <p className="text-sm text-muted-foreground">
                  {isTransitioning ? "Transition Time" : "Time Remaining"}
                </p>
                <p className={`font-semibold ${
                  isTransitioning ? "text-orange-600" : 
                  isActive && !isPaused ? "text-green-600" : 
                  "text-gray-600"
                }`}>
                  {isTransitioning ? formatTime(transitionTimeRemaining) : formatTime(timeRemaining)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  currentItem.status === "active" && !isPaused ? "bg-green-500 animate-pulse" :
                  currentItem.status === "active" && isPaused ? "bg-blue-500" :
                  currentItem.status === "ended" ? "bg-red-500" :
                  "bg-gray-400"
                }`}></div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white ${
                    currentItem.status === "active" && !isPaused ? "bg-green-500" :
                    currentItem.status === "active" && isPaused ? "bg-blue-500" :
                    currentItem.status === "ended" ? "bg-red-500" :
                    "bg-gray-500"
                  }`}>
                    {currentItem.status === "active" && isPaused ? "Paused" : 
                     currentItem.status === "active" ? "Active" :
                     currentItem.status === "ended" ? "Ended" :
                     "Pending"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{currentItem.lotNumber} - {currentItem.opalType}</span>
            <div className="flex items-center gap-2">
              <Badge className={`text-white ${
                currentItem.status === "active" && !isPaused ? "bg-green-500" :
                currentItem.status === "active" && isPaused ? "bg-blue-500" :
                currentItem.status === "ended" ? "bg-red-500" :
                "bg-gray-500"
              }`}>
                {currentItem.status === "active" && isPaused ? "Paused" : 
                 currentItem.status === "active" ? "Active" :
                 currentItem.status === "ended" ? "Ended" :
                 "Pending"}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">{currentItem.description}</p>
            <p className="text-sm text-muted-foreground">{currentItem.weight} carats</p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Reserve Price</p>
                  <p className="text-lg font-semibold">{formatCurrency(currentItem.startingBid)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Bid</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold">{formatCurrency(currentItem.currentBid || "0")}</p>
                    {currentItem.currentBidder && (
                      <p className="text-sm text-blue-600 font-medium">👤 {currentItem.currentBidder}</p>
                    )}
                  </div>
                </div>
                {currentItem.status === "ended" && currentItem.currentBidder && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 font-medium">🏆 Winner</p>
                    <p className="text-lg font-bold text-green-800">{currentItem.currentBidder}</p>
                    <p className="text-sm text-green-600">{formatCurrency(currentItem.currentBid || "0")}</p>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">{currentItem.biddingDuration} minutes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
                disabled={currentItemIndex === 0}
              >
                ← Prev
              </Button>
              
              {currentItem.status === "pending" && (
                <Button onClick={startItem} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Play className="w-3 h-3 mr-1" />
                  Start
                </Button>
              )}
              
              {currentItem.status === "active" && !isPaused && (
                <Button onClick={pauseItem} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Pause className="w-3 h-3 mr-1" />
                  Pause
                </Button>
              )}
              
              {currentItem.status === "active" && isPaused && (
                <Button onClick={resumeItem} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Play className="w-3 h-3 mr-1" />
                  Resume
                </Button>
              )}
              
              <Button className="bg-green-600 hover:bg-green-700 text-white" size="sm" onClick={openEditDialog}>
                <Edit className="w-3 h-3 mr-1 text-white" />
                Edit
              </Button>
              
              {currentItem.status === "active" && (
                <Button onClick={endItem} size="sm" variant="destructive">
                  End
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={nextItem}
                disabled={currentItemIndex === sortedItems.length - 1}
              >
                Next →
              </Button>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item - {currentItem?.lotNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editFormData.description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Item description..."
              />
            </div>
            <div>
              <Label htmlFor="startingBid">Reserve Price ($)</Label>
              <Input
                id="startingBid"
                type="number"
                value={editFormData.startingBid}
                onChange={(e) => setEditFormData(prev => ({ ...prev, startingBid: e.target.value }))}
                placeholder="Reserve price amount"
              />
            </div>
            <div>
              <Label htmlFor="currentBid">Current Bid ($)</Label>
              <Input
                id="currentBid"
                type="number"
                value={editFormData.currentBid}
                onChange={(e) => setEditFormData(prev => ({ ...prev, currentBid: e.target.value }))}
                placeholder="Current bid amount"
              />
            </div>
            <div>
              <Label htmlFor="currentBidder">Current Bidder</Label>
              <Input
                id="currentBidder"
                value={editFormData.currentBidder}
                onChange={(e) => setEditFormData(prev => ({ ...prev, currentBidder: e.target.value }))}
                placeholder="Enter bidder name"
              />
            </div>
            <div>
              <Label htmlFor="biddingDuration">Duration (minutes)</Label>
              <Input
                id="biddingDuration"
                type="number"
                value={editFormData.biddingDuration}
                onChange={(e) => setEditFormData(prev => ({ ...prev, biddingDuration: parseInt(e.target.value) || 5 }))}
                placeholder="Bidding duration"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditItem}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}