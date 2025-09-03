import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Edit, ExternalLink, DollarSign, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Auction {
  id: string;
  opalType: string;
  weight: string;
  description?: string;
  facebookGroup: string;
  postUrl?: string;
  startingBid: string;
  currentBid?: string;
  endTime: string;
  status: "active" | "ended" | "won" | "lost";
  updatedAt: string;
}

interface AuctionTableProps {
  auctions: Auction[];
  formatCurrency: (value: string) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}

export default function AuctionTable({ auctions, formatCurrency, formatDate, getStatusColor }: AuctionTableProps) {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [newBid, setNewBid] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateAuctionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/auctions/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Success", description: "Auction updated successfully!" });
      setSelectedAuction(null);
      setNewBid("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update auction", variant: "destructive" });
    },
  });

  const handleQuickBidUpdate = (auction: Auction) => {
    if (!newBid || parseFloat(newBid) <= 0) {
      toast({ title: "Error", description: "Please enter a valid bid amount", variant: "destructive" });
      return;
    }
    updateAuctionMutation.mutate({
      id: auction.id,
      updates: { currentBid: parseFloat(newBid).toString() }
    });
  };

  const handleStatusUpdate = (auction: Auction, status: string) => {
    updateAuctionMutation.mutate({
      id: auction.id,
      updates: { status }
    });
  };

  const isEndingSoon = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const hoursUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilEnd > 0 && hoursUntilEnd <= 2; // Ending within 2 hours
  };

  const getLastUpdated = (updatedAt: string) => {
    const updated = new Date(updatedAt);
    const now = new Date();
    const minutesAgo = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    if (minutesAgo < 1) return "just now";
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    return `${Math.floor(hoursAgo / 24)}d ago`;
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="auction-table">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Opal Details</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Group</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Starting Bid</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Current Bid</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">End Time</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Quick Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {auctions.map((auction) => (
              <tr key={auction.id} className="hover:bg-muted/50" data-testid={`auction-row-${auction.id}`}>
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-foreground" data-testid={`opal-details-${auction.id}`}>
                      {auction.opalType} - {auction.weight}ct
                    </p>
                    {auction.description && (
                      <p className="text-sm text-muted-foreground">{auction.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-foreground" data-testid={`group-${auction.id}`}>
                  {auction.facebookGroup}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground" data-testid={`starting-bid-${auction.id}`}>
                  {formatCurrency(auction.startingBid)}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-foreground" data-testid={`current-bid-${auction.id}`}>
                  <div className="flex items-center space-x-2">
                    <span>{formatCurrency(auction.currentBid || auction.startingBid)}</span>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-accent hover:text-accent/80"
                          onClick={() => setSelectedAuction(auction)}
                          data-testid={`button-update-bid-${auction.id}`}
                        >
                          <DollarSign className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Update Bid - {auction.opalType}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Current Bid: {formatCurrency(auction.currentBid || auction.startingBid)}</label>
                            <div className="flex items-center space-x-2 mt-2">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="Enter new bid"
                                value={newBid}
                                onChange={(e) => setNewBid(e.target.value)}
                                data-testid="input-new-bid"
                              />
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => handleQuickBidUpdate(auction)}
                              disabled={updateAuctionMutation.isPending}
                              className="flex-1"
                              data-testid="button-save-bid"
                            >
                              {updateAuctionMutation.isPending ? "Updating..." : "Update Bid"}
                            </Button>
                            {auction.postUrl && (
                              <Button 
                                variant="outline" 
                                onClick={() => window.open(auction.postUrl, '_blank')}
                                data-testid="button-open-facebook"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Last updated: {getLastUpdated(auction.updatedAt)}
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-foreground" data-testid={`end-time-${auction.id}`}>
                  <div className="flex items-center space-x-2">
                    <span>{formatDate(auction.endTime)}</span>
                    {isEndingSoon(auction.endTime) && auction.status === 'active' && (
                      <div className="flex items-center text-amber-600" title="Ending soon!">
                        <AlertTriangle className="h-3 w-3" />
                        <Clock className="h-3 w-3 ml-1" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Select value={auction.status} onValueChange={(status) => handleStatusUpdate(auction, status)}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(auction.status)}`}>
                          {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                      <SelectItem value="won">Won</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                      title="Edit auction"
                      data-testid={`button-edit-${auction.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
