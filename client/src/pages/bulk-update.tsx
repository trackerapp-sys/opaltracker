import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Save, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Auction {
  id: string;
  opalType: string;
  weight: string;
  facebookGroup: string;
  postUrl?: string;
  startingBid: string;
  currentBid?: string;
  endTime: string;
  status: "active" | "ended" | "won" | "lost";
  updatedAt: string;
}

interface AuctionsResponse {
  auctions: Auction[];
  total: number;
}

export default function BulkUpdate() {
  const [selectedAuctions, setSelectedAuctions] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bidUpdates, setBidUpdates] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<AuctionsResponse>({
    queryKey: ["/api/auctions", { limit: 100, status: "active" }],
  });

  const updateAuctionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/auctions/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });

  const handleSelectAll = () => {
    if (selectedAuctions.size === data?.auctions.length) {
      setSelectedAuctions(new Set());
    } else {
      setSelectedAuctions(new Set(data?.auctions.map(a => a.id) || []));
    }
  };

  const handleSelectAuction = (id: string) => {
    const newSelected = new Set(selectedAuctions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAuctions(newSelected);
  };

  const handleBidUpdate = (id: string, value: string) => {
    setBidUpdates(prev => ({ ...prev, [id]: value }));
  };

  const handleBulkStatusUpdate = async () => {
    if (!bulkStatus || selectedAuctions.size === 0) {
      toast({ title: "Error", description: "Please select auctions and a status", variant: "destructive" });
      return;
    }

    const promises = Array.from(selectedAuctions).map(id =>
      updateAuctionMutation.mutateAsync({ id, updates: { status: bulkStatus } })
    );

    try {
      await Promise.all(promises);
      toast({ title: "Success", description: `Updated ${selectedAuctions.size} auctions to ${bulkStatus}` });
      setSelectedAuctions(new Set());
      setBulkStatus("");
    } catch (error) {
      toast({ title: "Error", description: "Some updates failed", variant: "destructive" });
    }
  };

  const handleBulkBidUpdate = async () => {
    const updates = Object.entries(bidUpdates).filter(([_, bid]) => bid && parseFloat(bid) > 0);
    if (updates.length === 0) {
      toast({ title: "Error", description: "No valid bid updates", variant: "destructive" });
      return;
    }

    const promises = updates.map(([id, bid]) =>
      updateAuctionMutation.mutateAsync({ 
        id, 
        updates: { currentBid: parseFloat(bid).toString() } 
      })
    );

    try {
      await Promise.all(promises);
      toast({ title: "Success", description: `Updated ${updates.length} bids` });
      setBidUpdates({});
    } catch (error) {
      toast({ title: "Error", description: "Some bid updates failed", variant: "destructive" });
    }
  };

  const formatCurrency = (value: string) => `$${Math.round(parseFloat(value))}`;
  const isEndingSoon = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEnd > 0 && hoursUntilEnd <= 2;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeAuctions = data?.auctions.filter(a => a.status === 'active') || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-foreground">Bulk Update Auctions</h2>
        <div className="text-sm text-muted-foreground">
          {selectedAuctions.size} of {activeAuctions.length} selected
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="bg-card rounded-lg border border-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Bulk Status Update
            </label>
            <div className="flex space-x-2">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger data-testid="select-bulk-status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleBulkStatusUpdate}
                disabled={selectedAuctions.size === 0 || !bulkStatus}
                data-testid="button-bulk-status"
              >
                Update
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Bulk Bid Update
            </label>
            <Button 
              onClick={handleBulkBidUpdate}
              disabled={Object.keys(bidUpdates).length === 0}
              className="w-full"
              data-testid="button-bulk-bids"
            >
              <Save className="w-4 h-4 mr-2" />
              Save All Bids
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Select Actions
            </label>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleSelectAll}
                className="flex-1"
                data-testid="button-select-all"
              >
                {selectedAuctions.size === activeAuctions.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Auctions List */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="bulk-update-table">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">
                  <Checkbox 
                    checked={selectedAuctions.size === activeAuctions.length && activeAuctions.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Opal</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Group</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Current Bid</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Update Bid</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activeAuctions.map((auction) => (
                <tr 
                  key={auction.id} 
                  className={`hover:bg-muted/50 ${isEndingSoon(auction.endTime) ? 'bg-amber-50 dark:bg-amber-950/30' : ''}`}
                  data-testid={`bulk-row-${auction.id}`}
                >
                  <td className="px-6 py-4">
                    <Checkbox 
                      checked={selectedAuctions.has(auction.id)}
                      onCheckedChange={() => handleSelectAuction(auction.id)}
                      data-testid={`checkbox-${auction.id}`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {auction.opalType} - {auction.weight}ct
                      </p>
                      {isEndingSoon(auction.endTime) && (
                        <p className="text-xs text-amber-600">🔥 Ending soon!</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {auction.facebookGroup}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-foreground">
                    {formatCurrency(auction.currentBid || auction.startingBid)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="New bid"
                        className="w-24 h-8"
                        value={bidUpdates[auction.id] || ""}
                        onChange={(e) => handleBidUpdate(auction.id, e.target.value)}
                        data-testid={`input-bid-${auction.id}`}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600">
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-1">
                      {auction.postUrl && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                          onClick={() => window.open(auction.postUrl, '_blank')}
                          title="Open Facebook auction"
                          data-testid={`button-facebook-${auction.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          updateAuctionMutation.mutate({
                            id: auction.id,
                            updates: { updatedAt: new Date().toISOString() }
                          });
                        }}
                        title="Mark as refreshed"
                        data-testid={`button-refresh-${auction.id}`}
                      >
                        <RefreshCw className={`h-4 w-4 ${updateAuctionMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeAuctions.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-12 text-center">
          <p className="text-muted-foreground">No active auctions to update</p>
        </div>
      )}
    </div>
  );
}