import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Edit, ExternalLink, DollarSign, Clock, RefreshCw, AlertTriangle, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOpalTypes } from "@/hooks/use-opal-types";
import { apiRequest } from "@/lib/queryClient";
import { convertToUTC, convertFromUTC } from "@/lib/dateUtils";
import { formatCurrency } from "@/lib/utils";

interface Auction {
  id: string;
  opalType: string;
  weight: string;
  description?: string;
  facebookGroup: string;
  postUrl?: string;
  startingBid: string;
  reservePrice?: string;
  currentBid?: string;
  currentBidder?: string;
  startTime: string;
  endTime: string;
  status: "active" | "ended";
  updatedAt: string;
}

interface AuctionTableProps {
  auctions: Auction[];
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
  showEndedAuctions?: boolean; // New prop to indicate if we're showing ended auctions
}

type SortField = 'opalType' | 'weight' | 'facebookGroup' | 'startingBid' | 'currentBid' | 'currentBidder' | 'startTime' | 'endTime' | 'status';
type SortDirection = 'asc' | 'desc';

export default function AuctionTable({ auctions, formatDate, getStatusColor, showEndedAuctions = false }: AuctionTableProps) {
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [editingAuction, setEditingAuction] = useState<Auction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('endTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [newBid, setNewBid] = useState("");
  const [newBidder, setNewBidder] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [isManualCorrectionOpen, setIsManualCorrectionOpen] = useState(false);
  const [manualCorrectionAuction, setManualCorrectionAuction] = useState<Auction | null>(null);
  const [manualCorrectionForm, setManualCorrectionForm] = useState({
    newAmount: "",
    bidderName: "",
    correctionReason: ""
  });

  // Function to determine reserve price status
  const getReservePriceStatus = (auction: Auction) => {
    if (auction.status === "active") {
      return "Active";
    }
    
    if (!auction.reservePrice || parseFloat(auction.reservePrice) === 0) {
      return "Sold";
    }
    
    const currentBidAmount = parseFloat(auction.currentBid || "0");
    const reserveAmount = parseFloat(auction.reservePrice);
    
    if (currentBidAmount >= reserveAmount) {
      return "Sold";
    } else {
      return "Reserve Not Met";
    }
  };

  // Function to get status color including reserve price logic
  const getStatusColorWithReserve = (auction: Auction) => {
    const status = getReservePriceStatus(auction);
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Sold":
        return "bg-blue-500";
      case "Reserve Not Met":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  const [editForm, setEditForm] = useState({
    opalType: "",
    weight: "",
    description: "",
    facebookGroup: "",
    postUrl: "",
    startingBid: "",
    reservePrice: "",
    currentBid: "",
    maxBid: "",
    startTime: "",
    durationHours: "",
    durationMinutes: "",
    endTime: "",
    status: "active" as "active" | "ended",
    notes: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get opal types from settings
  const { data: opalTypesData } = useOpalTypes();

  // Get user settings for timezone
  const { data: settings } = useQuery<{ dateFormat: string; timezone: string }>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const updateAuctionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      // Convert start and end times to UTC for storage
      const timezone = settings?.timezone || 'Australia/Sydney';
      console.log('🔄 Updating auction with timezone:', timezone);
      console.log('📅 Original dates:', { startTime: updates.startTime, endTime: updates.endTime });
      
      const processedUpdates = {
        ...updates,
        ...(updates.startTime && { startTime: convertToUTC(updates.startTime, timezone) }),
        ...(updates.endTime && { endTime: convertToUTC(updates.endTime, timezone) })
      };
      
      console.log('📅 Converted dates:', { startTime: processedUpdates.startTime, endTime: processedUpdates.endTime });
      
      const response = await apiRequest("PATCH", `/api/auctions/${id}`, processedUpdates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Success", description: "Auction updated successfully!" });
      setSelectedAuction(null);
      setEditingAuction(null); // Close the edit dialog
      setIsEditDialogOpen(false); // Close the dialog
      setNewBid("");
      setNewBidder("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update auction", variant: "destructive" });
    },
  });

  const refreshBidsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/monitor/check");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Success", description: "Bid check completed!" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to check for new bids", variant: "destructive" });
    },
  });

  const deleteAuctionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/auctions/${id}`);
      // DELETE returns 204 (no content), so don't try to parse JSON
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Success", description: "Auction deleted successfully!" });
    },
    onError: (error) => {
      console.error("Delete auction error:", error);
      toast({ title: "Error", description: "Failed to delete auction", variant: "destructive" });
    },
  });

  const manualBidCorrectionMutation = useMutation({
    mutationFn: async ({ auctionId, correctionData }: { auctionId: string; correctionData: any }) => {
      const response = await apiRequest("POST", `/api/auctions/${auctionId}/manual-bid-correction`, correctionData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({ title: "Success", description: "Bid manually corrected!" });
      setIsManualCorrectionOpen(false);
      setManualCorrectionForm({ newAmount: "", bidderName: "", correctionReason: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to correct bid", variant: "destructive" });
    },
  });

  const handleQuickBidUpdate = (auction: Auction) => {
    if (!newBid || parseFloat(newBid) <= 0) {
      toast({ title: "Error", description: "Please enter a valid bid amount", variant: "destructive" });
      return;
    }
    
    const currentAmount = parseFloat(auction.currentBid || auction.startingBid);
    const newAmount = parseFloat(newBid);
    
    if (newAmount <= currentAmount) {
      toast({ 
        title: "Invalid Bid", 
        description: `Bid must be higher than current ${formatCurrency(currentAmount.toString())}`, 
        variant: "destructive" 
      });
      return;
    }
    
    const updates: any = { currentBid: newAmount.toString() };
    if (newBidder.trim()) {
      updates.currentBidder = newBidder.trim();
    }
    
    updateAuctionMutation.mutate({
      id: auction.id,
      updates
    });
  };

  const handleStatusUpdate = (auction: Auction, status: string) => {
    updateAuctionMutation.mutate({
      id: auction.id,
      updates: { status }
    });
  };

  const handleManualCorrection = (auction: Auction) => {
    setManualCorrectionAuction(auction);
    setManualCorrectionForm({
      newAmount: auction.currentBid || auction.startingBid,
      bidderName: auction.currentBidder || "",
      correctionReason: ""
    });
    setIsManualCorrectionOpen(true);
  };

  const submitManualCorrection = () => {
    if (!manualCorrectionAuction || !manualCorrectionForm.newAmount) {
      toast({ title: "Error", description: "Please enter a valid bid amount", variant: "destructive" });
      return;
    }

    manualBidCorrectionMutation.mutate({
      auctionId: manualCorrectionAuction.id,
      correctionData: {
        newAmount: parseFloat(manualCorrectionForm.newAmount),
        bidderName: manualCorrectionForm.bidderName,
        correctionReason: manualCorrectionForm.correctionReason,
        correctedBy: "Auctioneer"
      }
    });
  };

  const handleDeleteAuction = (auction: Auction) => {
    if (window.confirm(`Are you sure you want to delete this auction?\n\n${auction.opalType} - ${auction.weight}ct\nReserve Price: ${formatCurrency(auction.startingBid)}\n\nThis action cannot be undone.`)) {
      deleteAuctionMutation.mutate(auction.id);
    }
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const sortedAuctions = [...auctions].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'opalType':
        aValue = a.opalType.toLowerCase();
        bValue = b.opalType.toLowerCase();
        break;
      case 'weight':
        aValue = parseFloat(a.weight);
        bValue = parseFloat(b.weight);
        break;
      case 'facebookGroup':
        aValue = a.facebookGroup.toLowerCase();
        bValue = b.facebookGroup.toLowerCase();
        break;
      case 'startingBid':
        aValue = parseFloat(a.startingBid);
        bValue = parseFloat(b.startingBid);
        break;
      case 'currentBid':
        aValue = parseFloat(a.currentBid || a.startingBid);
        bValue = parseFloat(b.currentBid || b.startingBid);
        break;
      case 'currentBidder':
        aValue = (a.currentBidder || '').toLowerCase();
        bValue = (b.currentBidder || '').toLowerCase();
        break;
      case 'startTime':
        aValue = new Date(a.startTime).getTime();
        bValue = new Date(b.startTime).getTime();
        break;
      case 'endTime':
        aValue = new Date(a.endTime).getTime();
        bValue = new Date(b.endTime).getTime();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" data-testid="auction-table">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground w-16">
                ID
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-32"
                onClick={() => handleSort('opalType')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Opal Details</span>
                  {getSortIcon('opalType')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-24"
                onClick={() => handleSort('facebookGroup')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Facebook Group</span>
                  {getSortIcon('facebookGroup')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-24"
                onClick={() => handleSort('startingBid')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Starting Bid</span>
                  {getSortIcon('startingBid')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground w-24"
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Reserve Price</span>
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-24"
                onClick={() => handleSort('currentBid')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Current Bid</span>
                  {getSortIcon('currentBid')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-24"
                onClick={() => handleSort('currentBidder')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>{showEndedAuctions ? 'Winning Bidder' : 'Current Bidder'}</span>
                  {getSortIcon('currentBidder')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-32"
                onClick={() => handleSort('startTime')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Start Time</span>
                  {getSortIcon('startTime')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-32"
                onClick={() => handleSort('endTime')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>End Time</span>
                  {getSortIcon('endTime')}
                </div>
              </th>
              <th 
                className="text-left px-2 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-28"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center justify-start space-x-1">
                  <span>Status</span>
                  {getSortIcon('status')}
                </div>
              </th>
              <th className="text-left px-2 py-2 text-xs font-medium text-muted-foreground w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedAuctions.map((auction) => (
              <tr key={auction.id} className="hover:bg-muted/50" data-testid={`auction-row-${auction.id}`}>
                <td className="px-2 py-2 text-xs font-mono text-muted-foreground" data-testid={`auction-id-${auction.id}`} title={`Auction ID: ${auction.id}`}>
                  {auction.id}
                </td>
                <td className="px-2 py-2">
                  <div>
                    <p className="text-xs font-medium text-foreground" data-testid={`opal-details-${auction.id}`}>
                      {auction.opalType} - {auction.weight}ct
                    </p>
                  </div>
                </td>
                <td className="px-2 py-2 text-xs text-foreground" data-testid={`group-${auction.id}`}>
                  {auction.facebookGroup}
                </td>
                <td className="px-2 py-2 text-xs font-medium text-foreground" data-testid={`starting-bid-${auction.id}`}>
                  {formatCurrency(auction.startingBid)}
                </td>
                <td className="px-2 py-2 text-xs font-medium text-foreground" data-testid={`reserve-price-${auction.id}`}>
                  {auction.reservePrice ? formatCurrency(auction.reservePrice) : '-'}
                </td>
                <td className="px-2 py-2 text-xs font-medium text-foreground" data-testid={`current-bid-${auction.id}`}>
                  {formatCurrency(auction.currentBid || "0")}
                </td>
                <td className="px-2 py-2 text-xs text-foreground" data-testid={`current-bidder-${auction.id}`}>
                  {auction.currentBidder || '-'}
                </td>
                <td className="px-2 py-2 text-xs text-foreground whitespace-nowrap" data-testid={`start-time-${auction.id}`}>
                  <span>{formatDate(auction.startTime)}</span>
                </td>
                <td className="px-2 py-2 text-xs text-foreground whitespace-nowrap" data-testid={`end-time-${auction.id}`}>
                  <div className="flex items-center space-x-1">
                    <span>{formatDate(auction.endTime)}</span>
                    {isEndingSoon(auction.endTime) && auction.status === 'active' && (
                      <div className="flex items-center text-amber-600" title="Ending soon!">
                        <AlertTriangle className="h-3 w-3" />
                        <Clock className="h-3 w-3 ml-1" />
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <Select value={auction.status} onValueChange={(status) => handleStatusUpdate(auction, status)}>
                    <SelectTrigger className="w-32 h-6 text-xs">
                      <SelectValue>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColorWithReserve(auction)}`}>
                          {getReservePriceStatus(auction)}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-2">
                  <div className="flex space-x-0.5">
                    {auction.postUrl && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 w-6 p-0 text-primary hover:text-primary/80"
                        onClick={() => window.open(auction.postUrl, '_blank')}
                        title="Open Facebook auction"
                        data-testid={`button-facebook-${auction.id}`}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        refreshBidsMutation.mutate();
                      }}
                      title="Check for new bids"
                      data-testid={`button-refresh-${auction.id}`}
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshBidsMutation.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      title="Manual Bid Correction"
                      onClick={() => handleManualCorrection(auction)}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit auction"
                          data-testid={`button-edit-${auction.id}`}
                          onClick={() => {
                            setEditingAuction(auction);
                            setIsEditDialogOpen(true);
                            setEditForm({
                              opalType: auction.opalType,
                              weight: auction.weight?.toString() || "",
                              description: auction.description || "",
                              facebookGroup: auction.facebookGroup,
                              postUrl: auction.postUrl || "",
                              startingBid: auction.startingBid?.toString() || "",
                              reservePrice: auction.reservePrice?.toString() || "",
                              currentBid: (auction.currentBid || auction.startingBid)?.toString() || "",
                              maxBid: "", // This field might not exist in current data
                              startTime: convertFromUTC(auction.startTime, settings?.timezone || 'Australia/Sydney'),
                              endTime: convertFromUTC(auction.endTime, settings?.timezone || 'Australia/Sydney'),
                              status: "active", // Always set to active
                              notes: "" // This field might not exist in current data
                            });
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Auction - {auction.opalType}</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-opal-type">Opal Type *</Label>
                            <Select value={editForm.opalType} onValueChange={(value) => setEditForm(prev => ({ ...prev, opalType: value }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(opalTypesData?.opalTypes || []).map((type) => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-weight">Weight (carats) *</Label>
                            <Input
                              id="edit-weight"
                              type="number"
                              step="0.01"
                              value={editForm.weight}
                              onChange={(e) => setEditForm(prev => ({ ...prev, weight: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                              id="edit-description"
                              value={editForm.description}
                              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Describe the opal's features, colors, pattern..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-facebook-group">Facebook Group *</Label>
                            <Input
                              id="edit-facebook-group"
                              value={editForm.facebookGroup}
                              onChange={(e) => setEditForm(prev => ({ ...prev, facebookGroup: e.target.value }))}
                              placeholder="e.g., Australian Opal Auctions"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-post-url">Post URL</Label>
                            <Input
                              id="edit-post-url"
                              type="url"
                              value={editForm.postUrl}
                              onChange={(e) => setEditForm(prev => ({ ...prev, postUrl: e.target.value }))}
                              placeholder="Facebook post or auction URL"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-starting-bid">Starting Bid *</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                              <Input
                                id="edit-starting-bid"
                                type="number"
                                step="0.01"
                                value={editForm.startingBid}
                                onChange={(e) => setEditForm(prev => ({ ...prev, startingBid: e.target.value }))}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-reserve-price">Reserve Price</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                              <Input
                                id="edit-reserve-price"
                                type="number"
                                step="0.01"
                                value={editForm.reservePrice}
                                onChange={(e) => setEditForm(prev => ({ ...prev, reservePrice: e.target.value }))}
                                className="pl-8"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-current-bid">Current Bid</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                              <Input
                                id="edit-current-bid"
                                type="number"
                                step="0.01"
                                value={editForm.currentBid}
                                onChange={(e) => setEditForm(prev => ({ ...prev, currentBid: e.target.value }))}
                                className="pl-8"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-start-time">Start Date & Time *</Label>
                            <Input
                              id="edit-start-time"
                              type="datetime-local"
                              value={editForm.startTime}
                              onChange={(e) => setEditForm(prev => ({ ...prev, startTime: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-end-time">End Date & Time *</Label>
                            <Input
                              id="edit-end-time"
                              type="datetime-local"
                              value={editForm.endTime}
                              onChange={(e) => setEditForm(prev => ({ ...prev, endTime: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex space-x-2 pt-4">
                          <Button
                            onClick={() => {
                              if (editingAuction) {
                                updateAuctionMutation.mutate({
                                  id: editingAuction.id,
                                  updates: {
                                    ...editForm,
                                    status: "active" // Always set to active
                                  }
                                });
                              }
                            }}
                            disabled={updateAuctionMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                          >
                            {updateAuctionMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                      onClick={() => handleDeleteAuction(auction)}
                      title="Delete auction"
                      data-testid={`button-delete-${auction.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Manual Bid Correction Dialog */}
      <Dialog open={isManualCorrectionOpen} onOpenChange={setIsManualCorrectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Bid Correction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {manualCorrectionAuction && (
              <div className="text-sm text-muted-foreground">
                <p><strong>Auction:</strong> {manualCorrectionAuction.opalType} - {manualCorrectionAuction.weight}ct</p>
                <p><strong>Current Bid:</strong> {formatCurrency(manualCorrectionAuction.currentBid || manualCorrectionAuction.startingBid)}</p>
                <p><strong>Current Bidder:</strong> {manualCorrectionAuction.currentBidder || 'None'}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="correction-amount">New Bid Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                <Input
                  id="correction-amount"
                  type="number"
                  step="0.01"
                  value={manualCorrectionForm.newAmount}
                  onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, newAmount: e.target.value }))}
                  className="pl-8"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="correction-bidder">Bidder Name</Label>
              <Input
                id="correction-bidder"
                value={manualCorrectionForm.bidderName}
                onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, bidderName: e.target.value }))}
                placeholder="Enter bidder name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correction-reason">Correction Reason</Label>
              <Textarea
                id="correction-reason"
                value={manualCorrectionForm.correctionReason}
                onChange={(e) => setManualCorrectionForm(prev => ({ ...prev, correctionReason: e.target.value }))}
                placeholder="e.g., 'Bidder meant $160, not $1600'"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsManualCorrectionOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={submitManualCorrection}
                disabled={manualBidCorrectionMutation.isPending || !manualCorrectionForm.newAmount}
              >
                {manualBidCorrectionMutation.isPending ? 'Correcting...' : 'Correct Bid'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
