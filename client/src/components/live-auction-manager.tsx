import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { Plus, Clock, Users, Trash2, Copy, Facebook } from "lucide-react";

interface LiveSessionItem {
  id: string;
  opalType: string;
  weight: string;
  description: string;
  startingBid: string;
  estimatedDuration: number; // minutes
  order: number;
}

interface LiveSession {
  id?: string;
  title: string;
  description: string;
  facebookGroup: string;
  scheduledTime: string;
  status: "planning" | "live" | "completed";
  items: LiveSessionItem[];
}

export default function LiveAuctionManager() {
  const [session, setSession] = useState<LiveSession>({
    title: "",
    description: "",
    facebookGroup: "",
    scheduledTime: "",
    status: "planning",
    items: []
  });
  
  const [newItem, setNewItem] = useState<Partial<LiveSessionItem>>({
    opalType: "",
    weight: "",
    description: "",
    startingBid: "",
    estimatedDuration: 5
  });
  
  const [showItemDialog, setShowItemDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addItemToSession = () => {
    if (!newItem.opalType || !newItem.weight || !newItem.startingBid) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const item: LiveSessionItem = {
      id: Date.now().toString(),
      opalType: newItem.opalType!,
      weight: newItem.weight!,
      description: newItem.description || "",
      startingBid: newItem.startingBid!,
      estimatedDuration: newItem.estimatedDuration || 5,
      order: session.items.length + 1
    };

    setSession(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    setNewItem({
      opalType: "",
      weight: "",
      description: "",
      startingBid: "",
      estimatedDuration: 5
    });
    
    setShowItemDialog(false);
    
    toast({
      title: "Item Added",
      description: `${item.opalType} added to live auction session`
    });
  };

  const removeItem = (itemId: string) => {
    setSession(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const createLiveSessionMutation = useMutation({
    mutationFn: async (sessionData: LiveSession) => {
      // Create individual auctions for each item
      const auctions = [];
      for (const item of sessionData.items) {
        const auctionData = {
          opalType: item.opalType,
          weight: item.weight,
          description: `${sessionData.title} - Item ${item.order}: ${item.description}`,
          facebookGroup: sessionData.facebookGroup,
          startingBid: item.startingBid,
          endTime: new Date(Date.now() + (item.estimatedDuration * 60 * 1000)).toISOString(),
          status: "active" as const
        };
        
        const response = await apiRequest("POST", "/api/auctions", auctionData);
        const auction = await response.json();
        auctions.push(auction);
      }
      return auctions;
    },
    onSuccess: (auctions) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      toast({
        title: "Live Session Created!",
        description: `Created ${auctions.length} auctions for your live session`
      });
      
      // Reset form
      setSession({
        title: "",
        description: "",
        facebookGroup: "",
        scheduledTime: "",
        status: "planning",
        items: []
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create live auction session",
        variant: "destructive"
      });
    }
  });

  const generateSessionPost = () => {
    const totalDuration = session.items.reduce((sum, item) => sum + item.estimatedDuration, 0);
    const scheduledTime = new Date(session.scheduledTime);
    
    const post = `🔴 LIVE OPAL AUCTION SESSION 🔴

📢 ${session.title}
📅 ${scheduledTime.toLocaleDateString('en-AU', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}
⏰ ${scheduledTime.toLocaleTimeString('en-AU', { 
  hour: '2-digit', 
  minute: '2-digit',
  timeZone: 'Australia/Sydney'
})} AEDT

${session.description ? `📝 ${session.description}\n` : ''}
🎯 ${session.items.length} Items Up for Auction
⏱️ Estimated Duration: ${totalDuration} minutes

📋 ITEMS PREVIEW:
${session.items.map((item, index) => 
  `${index + 1}. ${item.opalType} - ${item.weight}ct - Reserve ${formatCurrency(item.startingBid)}`
).join('\n')}

🔥 Get ready to bid! Session starts in comments below
👥 Group: ${session.facebookGroup}

#LiveAuction #OpalAuction #AustralianOpals`;

    return post;
  };

  const copySessionPost = () => {
    const post = generateSessionPost();
    navigator.clipboard.writeText(post).then(() => {
      toast({
        title: "Copied!",
        description: "Live auction session post copied to clipboard!"
      });
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Live Auction Session Setup</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session-title">Session Title *</Label>
              <Input
                id="session-title"
                value={session.title}
                onChange={(e) => setSession(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Wednesday Night Opal Auction"
              />
            </div>
            
            <div>
              <Label htmlFor="facebook-group">Facebook Group *</Label>
              <Select 
                value={session.facebookGroup} 
                onValueChange={(value) => setSession(prev => ({ ...prev, facebookGroup: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Facebook group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Australian Opal Trading Post">Australian Opal Trading Post</SelectItem>
                  <SelectItem value="Opal Auctions Australia">Opal Auctions Australia</SelectItem>
                  <SelectItem value="Lightning Ridge Opal Miners">Lightning Ridge Opal Miners</SelectItem>
                  <SelectItem value="Coober Pedy Opal Group">Coober Pedy Opal Group</SelectItem>
                  <SelectItem value="Queensland Boulder Opal">Queensland Boulder Opal</SelectItem>
                  <SelectItem value="Other">Other (Enter manually)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="scheduled-time">Scheduled Start Time *</Label>
              <Input
                id="scheduled-time"
                type="datetime-local"
                value={session.scheduledTime}
                onChange={(e) => setSession(prev => ({ ...prev, scheduledTime: e.target.value }))}
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="session-description">Session Description</Label>
              <Textarea
                id="session-description"
                value={session.description}
                onChange={(e) => setSession(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this live auction session..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Auction Items ({session.items.length})</span>
            <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Auction Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Opal Type *</Label>
                      <Select 
                        value={newItem.opalType || ""} 
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, opalType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Black Opal">Black Opal</SelectItem>
                          <SelectItem value="Crystal Opal">Crystal Opal</SelectItem>
                          <SelectItem value="Boulder Opal">Boulder Opal</SelectItem>
                          <SelectItem value="White Opal">White Opal</SelectItem>
                          <SelectItem value="Fire Opal">Fire Opal</SelectItem>
                          <SelectItem value="Matrix Opal">Matrix Opal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Weight (carats) *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newItem.weight || ""}
                        onChange={(e) => setNewItem(prev => ({ ...prev, weight: e.target.value }))}
                        placeholder="2.5"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newItem.description || ""}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this opal..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Reserve Price *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={newItem.startingBid || ""}
                          onChange={(e) => setNewItem(prev => ({ ...prev, startingBid: e.target.value }))}
                          className="pl-8"
                          placeholder="20"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Est. Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={newItem.estimatedDuration || 5}
                        onChange={(e) => setNewItem(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 5 }))}
                        placeholder="5"
                      />
                    </div>
                  </div>
                  
                  <Button onClick={addItemToSession} className="w-full">
                    Add to Session
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {session.items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet. Add your first auction item to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="font-medium">{item.opalType} - {item.weight}ct</div>
                      <div className="text-sm text-muted-foreground">
                        Reserve: {formatCurrency(item.startingBid)} • Duration: {item.estimatedDuration}min
                      </div>
                      {item.description && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {session.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Button
                onClick={copySessionPost}
                variant="outline"
                size="sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Session Post
              </Button>
              
              <Button
                onClick={() => {
                  const post = generateSessionPost();
                  navigator.clipboard.writeText(post);
                  window.open(`https://www.facebook.com/groups/search/groups/?q=${encodeURIComponent(session.facebookGroup)}`, '_blank');
                }}
                variant="outline"
                size="sm"
              >
                <Facebook className="w-4 h-4 mr-2" />
                Copy & Open Facebook
              </Button>
              
              <Button
                onClick={() => createLiveSessionMutation.mutate(session)}
                disabled={createLiveSessionMutation.isPending || session.items.length === 0}
                size="sm"
              >
                <Users className="w-4 h-4 mr-2" />
                {createLiveSessionMutation.isPending ? "Creating..." : "Create Live Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}