import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BidMonitoringSettings {
  bidMonitoringEnabled: boolean;
  bidCheckInterval: number; // in minutes
  refreshRate: number;
  notifications: boolean;
}

export default function BidMonitoringSettings() {
  const [settings, setSettings] = useState<BidMonitoringSettings>({
    bidMonitoringEnabled: true,
    bidCheckInterval: 1, // Default to 1 minute
    refreshRate: 5,
    notifications: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery<BidMonitoringSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    onSuccess: (data) => {
      setSettings(data);
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: BidMonitoringSettings) => {
      return apiRequest("POST", "/api/settings", settingsData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your bid monitoring settings have been updated successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleReset = () => {
    setSettings({
      bidMonitoringEnabled: true,
      bidCheckInterval: 1,
      refreshRate: 5,
      notifications: true,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Bid Monitoring Settings</h2>
        <p className="text-muted-foreground mt-2">
          Configure automatic bid monitoring and notification settings for your auctions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Monitoring Configuration
          </CardTitle>
          <CardDescription>
            Control how the system monitors your auctions for new bids and updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="bid-monitoring">Enable Bid Monitoring</Label>
              <p className="text-sm text-muted-foreground">
                Automatically check for new bids on your active auctions
              </p>
            </div>
            <Switch
              id="bid-monitoring"
              checked={settings.bidMonitoringEnabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, bidMonitoringEnabled: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bid-check-interval">Bid Check Interval</Label>
            <Select
              value={settings.bidCheckInterval.toString()}
              onValueChange={(value) =>
                setSettings(prev => ({ ...prev, bidCheckInterval: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select check interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 minute</SelectItem>
                <SelectItem value="3">Every 3 minutes</SelectItem>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="10">Every 10 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How often to check for new bids on active auctions
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="refresh-rate">Page Refresh Rate</Label>
            <Select
              value={settings.refreshRate.toString()}
              onValueChange={(value) =>
                setSettings(prev => ({ ...prev, refreshRate: parseInt(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select refresh rate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Every 1 second</SelectItem>
                <SelectItem value="3">Every 3 seconds</SelectItem>
                <SelectItem value="5">Every 5 seconds</SelectItem>
                <SelectItem value="10">Every 10 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every 1 minute</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              How often to refresh auction data on the dashboard
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show toast notifications when new bids are detected
              </p>
            </div>
            <Switch
              id="notifications"
              checked={settings.notifications}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, notifications: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saveSettingsMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
