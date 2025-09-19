import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useOpalTypes } from "@/hooks/use-opal-types";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { 
  Plus, 
  Edit, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Clock, 
  Gem, 
  DollarSign, 
  Upload,
  Download,
  Save,
  ArrowLeft
} from "lucide-react";

interface AuctionItem {
  id: string;
  liveAuctionId: string;
  lotNumber: string;
  opalType: string;
  weight: string;
  description: string;
  startingBid: string;
  reservePrice?: string;
  currentBid?: string;
  biddingDuration: number; // minutes
  biddingStartTime?: string;
  biddingEndTime?: string;
  status: "pending" | "active" | "ended";
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface LiveAuction {
  id: string;
  title: string;
  description?: string;
  facebookGroup: string;
  postUrl?: string;
  startTime: string;
  endTime: string;
  status: "scheduled" | "active" | "ended";
  totalItems: number;
  createdAt: string;
  updatedAt: string;
}


export default function LiveAuctionItemManager() {
  const [location, setLocation] = useLocation();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<AuctionItem | null>(null);
  const [liveAuctionId, setLiveAuctionId] = useState<string>("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get opal types from settings
  const { data: opalTypesData } = useOpalTypes();

  // Get live auction ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auction');
    if (auctionId) {
      setLiveAuctionId(auctionId);
    }
  }, []);

  // Fetch live auction details
  const { data: liveAuctionResponse, isLoading: auctionLoading } = useQuery<{ liveAuction: LiveAuction }>({
    queryKey: ["/api/live-auctions", liveAuctionId],
    queryFn: async () => {
      if (!liveAuctionId) return null;
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
  const { data: auctionItemsResponse, isLoading: itemsLoading } = useQuery<{ auctionItems: AuctionItem[] }>({
    queryKey: ["/api/live-auctions", liveAuctionId, "items"],
    queryFn: async () => {
      if (!liveAuctionId) return { auctionItems: [] };
      const response = await fetch(`/api/live-auctions/${liveAuctionId}/items`);
      if (!response.ok) throw new Error("Failed to fetch auction items");
      return response.json();
    },
    enabled: !!liveAuctionId,
    refetchInterval: 2000, // Refresh every 2 seconds for live auctions
    refetchOnWindowFocus: true, // Refresh when user returns to tab
  });

  const auctionItems = auctionItemsResponse?.auctionItems || [];

  // Create new item mutation
  const createItemMutation = useMutation({
    mutationFn: async (itemData: Partial<AuctionItem>) => {
      const response = await apiRequest("POST", `/api/live-auctions/${liveAuctionId}/items`, itemData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId] });
      setShowAddDialog(false);
      toast({
        title: "Item Added",
        description: "Auction item has been added successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add auction item",
        variant: "destructive",
      });
    },
  });

  // Update item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...itemData }: Partial<AuctionItem> & { id: string }) => {
      const response = await apiRequest("PATCH", `/api/live-auctions/${liveAuctionId}/items/${id}`, itemData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId, "items"] });
      setEditingItem(null);
      toast({
        title: "Item Updated",
        description: "Auction item has been updated successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update auction item",
        variant: "destructive",
      });
    },
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/live-auctions/${liveAuctionId}/items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId] });
      toast({
        title: "Item Deleted",
        description: "Auction item has been deleted successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete auction item",
        variant: "destructive",
      });
    },
  });

  // Reorder items mutation
  const reorderItemsMutation = useMutation({
    mutationFn: async (items: AuctionItem[]) => {
      const reorderData = items.map((item, index) => ({
        id: item.id,
        order: index + 1,
      }));
      await apiRequest("POST", `/api/live-auctions/${liveAuctionId}/items/bulk`, reorderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId, "items"] });
      toast({
        title: "Items Reordered",
        description: "Auction items have been reordered successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder items",
        variant: "destructive",
      });
    },
  });

  // Bulk import mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (items: Partial<AuctionItem>[]) => {
      const response = await apiRequest("POST", `/api/live-auctions/${liveAuctionId}/items/bulk`, { items });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions", liveAuctionId] });
      setShowImportDialog(false);
      toast({
        title: "Import Successful",
        description: `${data.auctionItems?.length || 0} auction items have been imported successfully`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import auction items",
        variant: "destructive",
      });
    },
  });

  const handleAddItem = (itemData: Partial<AuctionItem>) => {
    const newItem = {
      ...itemData,
      liveAuctionId,
      lotNumber: `LOT-${String((auctionItems?.length || 0) + 1).padStart(3, '0')}`,
      order: (auctionItems?.length || 0) + 1,
      status: "pending" as const,
      currentBid: "0", // Set current bid to $0 for new items
    };
    createItemMutation.mutate(newItem);
  };

  const handleUpdateItem = (itemData: Partial<AuctionItem>) => {
    if (!editingItem) return;
    updateItemMutation.mutate({ ...itemData, id: editingItem.id });
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Are you sure you want to delete this auction item?")) {
      deleteItemMutation.mutate(itemId);
    }
  };

  const moveItem = (itemId: string, direction: 'up' | 'down') => {
    if (!auctionItems) return;
    
    const sortedItems = [...auctionItems].sort((a, b) => a.order - b.order);
    const currentIndex = sortedItems.findIndex(item => item.id === itemId);
    
    if (direction === 'up' && currentIndex > 0) {
      [sortedItems[currentIndex], sortedItems[currentIndex - 1]] = 
      [sortedItems[currentIndex - 1], sortedItems[currentIndex]];
    } else if (direction === 'down' && currentIndex < sortedItems.length - 1) {
      [sortedItems[currentIndex], sortedItems[currentIndex + 1]] = 
      [sortedItems[currentIndex + 1], sortedItems[currentIndex]];
    } else {
      return;
    }
    
    reorderItemsMutation.mutate(sortedItems);
  };

  const handleImportItems = () => {
    setShowImportDialog(true);
  };

  const handleExportItems = () => {
    if (!auctionItems || auctionItems.length === 0) {
      toast({
        title: "No Items to Export",
        description: "There are no auction items to export.",
        variant: "destructive",
      });
      return;
    }

    const csvContent = [
      // CSV Header
      "Lot Number,Opal Type,Weight (carats),Description,Reserve Price,Current Bid,Bidding Duration (min),Status",
      // CSV Data
      ...auctionItems.map(item => [
        item.lotNumber,
        item.opalType,
        item.weight,
        `"${item.description}"`,
        item.startingBid,
        item.currentBid || "0",
        item.biddingDuration,
        item.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${liveAuction?.title || 'auction'}_items.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${auctionItems.length} auction items to CSV.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-gray-500/10 text-gray-600";
      case "active": return "bg-green-500/10 text-green-600";
      case "ended": return "bg-blue-500/10 text-blue-600";
      default: return "bg-gray-500/10 text-gray-600";
    }
  };

  if (auctionLoading || itemsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!liveAuction) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Live Auction Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested live auction could not be found.</p>
          <Button onClick={() => setLocation("/live-auction-dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Live Auctions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Manage Items</h1>
            <p className="text-muted-foreground">
              {liveAuction.title} • {auctionItems?.length || 0} items
            </p>
          </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setLocation("/live-auction-dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportItems}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportItems}>
            <Download className="w-4 h-4 mr-2" />
            Export Items
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Auction Item</DialogTitle>
              </DialogHeader>
              <AddItemForm 
                onSubmit={handleAddItem} 
                onCancel={() => setShowAddDialog(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Auction Items</DialogTitle>
          </DialogHeader>
          <ImportItemsForm 
            onSubmit={(items) => bulkImportMutation.mutate(items)}
            onCancel={() => setShowImportDialog(false)}
            isLoading={bulkImportMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Items Table */}
      <Card>
        <CardContent>
          {auctionItems && auctionItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Lot #</TableHead>
                  <TableHead>Opal Type</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Reserve Price</TableHead>
                  <TableHead>Current Bid</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auctionItems
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveItem(item.id, 'up')}
                            disabled={item.order === 1}
                          >
                            <ArrowUp className="w-3 h-3" />
                          </Button>
                          <span className="font-medium">{item.order}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveItem(item.id, 'down')}
                            disabled={item.order === auctionItems.length}
                          >
                            <ArrowDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.lotNumber}</TableCell>
                      <TableCell>{item.opalType}</TableCell>
                      <TableCell>{item.weight}ct</TableCell>
                      <TableCell>{formatCurrency(item.startingBid)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.currentBid || "0")}</TableCell>
                      <TableCell>{item.biddingDuration}min</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="w-4 h-4 text-white" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Gem className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Items Added</h3>
              <p className="text-muted-foreground mb-4">
                Add your first auction item to get started
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Auction Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <EditItemForm 
              item={editingItem} 
              onSubmit={handleUpdateItem}
              onCancel={() => setEditingItem(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Item Form Component
function AddItemForm({ onSubmit, onCancel }: { onSubmit: (data: Partial<AuctionItem>) => void; onCancel?: () => void }) {
  const [formData, setFormData] = useState({
    opalType: "",
    weight: "",
    description: "",
    startingBid: "",
    biddingDuration: 5,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get opal types from settings
  const { data: opalTypesData } = useOpalTypes();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.opalType) {
      newErrors.opalType = "Opal type is required";
    }
    if (!formData.weight) {
      newErrors.weight = "Weight is required";
    }
    if (!formData.startingBid) {
      newErrors.startingBid = "Reserve price is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    
    if (!validateForm()) {
      console.log('Form validation failed:', errors);
      return;
    }
    
    console.log('Form validation passed, submitting...');
    onSubmit(formData);
    setFormData({
      opalType: "",
      weight: "",
      description: "",
      startingBid: "",
      biddingDuration: 5,
    });
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="opalType">Opal Type *</Label>
          <Select value={formData.opalType} onValueChange={(value) => setFormData(prev => ({ ...prev, opalType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select opal type" />
            </SelectTrigger>
            <SelectContent>
              {(opalTypesData?.opalTypes || []).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.opalType && <p className="text-sm text-red-500 mt-1">{errors.opalType}</p>}
        </div>
        
        <div>
          <Label htmlFor="weight">Weight (carats) *</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
            placeholder="2.5"
          />
          {errors.weight && <p className="text-sm text-red-500 mt-1">{errors.weight}</p>}
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this opal..."
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startingBid">Reserve Price *</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
            <Input
              id="startingBid"
              type="number"
              step="0.01"
              value={formData.startingBid}
              onChange={(e) => setFormData(prev => ({ ...prev, startingBid: e.target.value }))}
              className="pl-8"
              placeholder="20"
            />
          </div>
          {errors.startingBid && <p className="text-sm text-red-500 mt-1">{errors.startingBid}</p>}
        </div>
        
        <div>
          <Label htmlFor="duration">Bidding Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.biddingDuration}
            onChange={(e) => setFormData(prev => ({ ...prev, biddingDuration: parseInt(e.target.value) || 5 }))}
            placeholder="5"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Item
        </Button>
      </div>
    </form>
  );
}

// Edit Item Form Component
function EditItemForm({ 
  item, 
  onSubmit, 
  onCancel 
}: { 
  item: AuctionItem; 
  onSubmit: (data: Partial<AuctionItem>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    opalType: item.opalType,
    weight: item.weight,
    description: item.description,
    startingBid: item.startingBid,
    biddingDuration: item.biddingDuration,
  });
  
  // Get opal types from settings
  const { data: opalTypesData } = useOpalTypes();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="opalType">Opal Type *</Label>
          <Select value={formData.opalType} onValueChange={(value) => setFormData(prev => ({ ...prev, opalType: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select opal type" />
            </SelectTrigger>
            <SelectContent>
              {(opalTypesData?.opalTypes || []).map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="weight">Weight (carats) *</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
            placeholder="2.5"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this opal..."
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startingBid">Reserve Price *</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground">$</span>
            <Input
              id="startingBid"
              type="number"
              step="0.01"
              value={formData.startingBid}
              onChange={(e) => setFormData(prev => ({ ...prev, startingBid: e.target.value }))}
              className="pl-8"
              placeholder="20"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="duration">Bidding Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.biddingDuration}
            onChange={(e) => setFormData(prev => ({ ...prev, biddingDuration: parseInt(e.target.value) || 5 }))}
            placeholder="5"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// Import Items Form Component
function ImportItemsForm({ 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  onSubmit: (items: Partial<AuctionItem>[]) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [csvData, setCsvData] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const parseCSV = (csvText: string): Partial<AuctionItem>[] => {
    const lines = csvText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const items: Partial<AuctionItem>[] = [];
    
    // Check if first line looks like headers
    const firstLine = lines[0].toLowerCase();
    const hasHeaders = firstLine.includes('lot') || firstLine.includes('opal') || firstLine.includes('weight');
    
    let startIndex = 0;
    let headers: string[] = [];
    
    if (hasHeaders) {
      headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      startIndex = 1;
    } else {
      // No headers provided, assume your format: Order,Title,Opal Type,Weight,Description,Reserve Price,Duration
      headers = ['order', 'title', 'opal type', 'weight', 'description', 'reserve price', 'duration'];
    }

    for (let i = startIndex; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      
      if (values.length < 3) continue; // Need at least opal type, weight, starting bid

      const item: Partial<AuctionItem> = {};
      
      // Map values to fields based on position or header
      if (hasHeaders) {
        headers.forEach((header, index) => {
          const value = values[index];
          
          switch (header) {
            case 'lot number':
            case 'lot':
              item.lotNumber = value;
              break;
            case 'opal type':
            case 'opaltype':
              item.opalType = value;
              break;
            case 'weight (carats)':
            case 'weight':
            case 'carats':
              item.weight = value;
              break;
            case 'description':
            case 'desc':
              item.description = value;
              break;
            case 'reserve price':
            case 'starting bid':
            case 'startingbid':
            case 'bid':
              item.startingBid = value;
              break;
            case 'bidding duration (min)':
            case 'duration':
            case 'minutes':
              item.biddingDuration = parseInt(value) || 5;
              break;
            case 'status':
              item.status = value as "pending" | "active" | "ended";
              break;
          }
        });
      } else {
        // Your format: Order,Title,Opal Type,Weight,Description,Reserve Price,Duration
        if (values.length >= 7) {
          item.lotNumber = `LOT-${values[0].padStart(3, '0')}`;
          item.opalType = values[2];
          item.weight = values[3];
          item.description = values[4];
          item.startingBid = values[5];
          item.biddingDuration = parseInt(values[6]) || 5;
          item.status = "pending";
        } else if (values.length >= 3) {
          // Minimum required fields
          item.opalType = values[0];
          item.weight = values[1];
          item.startingBid = values[2];
          item.description = values[3] || "";
          item.biddingDuration = parseInt(values[4]) || 5;
          item.status = "pending";
        }
      }

      if (item.opalType && item.weight && item.startingBid) {
        items.push(item);
      }
    }

    return items;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!csvData.trim()) {
      setErrors(["Please paste CSV data"]);
      return;
    }

    const items = parseCSV(csvData);
    
    if (items.length === 0) {
      setErrors(["No valid items found in CSV data"]);
      return;
    }

    setErrors([]);
    onSubmit(items);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="csvData">CSV Data</Label>
        <Textarea
          id="csvData"
          value={csvData}
          onChange={(e) => setCsvData(e.target.value)}
          placeholder="Paste CSV data here. Supported formats:&#10;&#10;Format 1 (with headers):&#10;Lot Number,Opal Type,Weight (carats),Description,Reserve Price,Bidding Duration (min),Status&#10;LOT-001,Black Opal,2.5,Beautiful black opal,50,5,pending&#10;&#10;Format 2 (your format):&#10;2,OPAL AUCTION,ROUGH,5,OPAL ROUGH,20,2"
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-sm text-muted-foreground mt-2">
          <strong>Format 1:</strong> Include headers (Lot Number, Opal Type, Weight, Description, Reserve Price, Duration, Status)<br/>
          <strong>Format 2:</strong> Your format (Order, Title, Opal Type, Weight, Description, Reserve Price, Duration)
        </p>
      </div>

      {errors.length > 0 && (
        <div className="text-red-500 text-sm">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Importing..." : "Import Items"}
        </Button>
      </div>
    </form>
  );
}
