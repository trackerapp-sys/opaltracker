import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Play, Square, RefreshCw, Activity, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MonitorStatus {
  running: boolean;
  nextCheck: string;
}

interface BidUpdate {
  auctionId: string;
  currentBid: string;
  bidCount?: number;
  lastUpdated: string;
}

interface ManualCheckResponse {
  message: string;
  updates: BidUpdate[];
}

export default function Monitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);

  // Get monitor status
  const { data: status, isLoading: statusLoading } = useQuery<MonitorStatus>({
    queryKey: ["/api/monitor/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Start monitoring mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/monitor/start", { method: "POST" });
      if (!response.ok) throw new Error("Failed to start monitoring");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitor/status"] });
      toast({
        title: "Monitoring Started",
        description: "Automatic bid monitoring is now active and will check every 3 minutes.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start monitoring. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Stop monitoring mutation
  const stopMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/monitor/stop", { method: "POST" });
      if (!response.ok) throw new Error("Failed to stop monitoring");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/monitor/status"] });
      toast({
        title: "Monitoring Stopped",
        description: "Automatic bid monitoring has been disabled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop monitoring. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Manual check mutation
  const checkMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/monitor/check", { method: "POST" });
      if (!response.ok) throw new Error("Failed to perform manual check");
      return response.json();
    },
    onSuccess: (data: ManualCheckResponse) => {
      setLastCheckTime(new Date());
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      
      toast({
        title: "Manual Check Complete",
        description: data.message,
      });

      if (data.updates.length > 0) {
        toast({
          title: "Bid Updates Found!",
          description: `${data.updates.length} auction(s) have new bids.`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to perform manual check. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Bid Monitoring</h2>
        <p className="text-muted-foreground">
          Automatically monitor your auction URLs for bid changes and updates
        </p>
      </div>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Monitoring Status
          </CardTitle>
          <CardDescription>
            Current status of the automatic bid monitoring system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Badge 
                variant={status?.running ? "default" : "secondary"} 
                className="flex items-center gap-1"
              >
                {status?.running ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Active
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                    Stopped
                  </>
                )}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {status?.nextCheck}
              </span>
            </div>
            
            <div className="flex gap-2">
              {status?.running ? (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => stopMutation.mutate()}
                  disabled={stopMutation.isPending}
                >
                  <Square className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => startMutation.mutate()}
                  disabled={startMutation.isPending}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => checkMutation.mutate()}
                disabled={checkMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${checkMutation.isPending ? 'animate-spin' : ''}`} />
                Check Now
              </Button>
            </div>
          </div>

          {lastCheckTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              Last manual check: {lastCheckTime.toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>How Automatic Bid Monitoring Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-300">1</div>
                Facebook Posts
              </h4>
              <p className="text-sm text-muted-foreground pl-8">
                Monitors Facebook auction posts for bid amounts, searching for patterns like "$123", "bid: $45", etc.
              </p>

              <h4 className="font-medium flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-semibold text-blue-600 dark:text-blue-300">2</div>
                Auction Websites
              </h4>
              <p className="text-sm text-muted-foreground pl-8">
                Scans auction sites for current bid amounts using common selectors and patterns.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-semibold text-green-600 dark:text-green-300">3</div>
                Smart Updates
              </h4>
              <p className="text-sm text-muted-foreground pl-8">
                Only updates when bids have increased, maintaining data accuracy and avoiding false changes.
              </p>

              <h4 className="font-medium flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-semibold text-green-600 dark:text-green-300">4</div>
                Respectful Timing
              </h4>
              <p className="text-sm text-muted-foreground pl-8">
                Checks every 3 minutes with delays between requests to be respectful to auction sites.
              </p>
            </div>
          </div>

          <Separator />

          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Important Notes
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                <li>• Facebook may limit automated access - monitoring works best for public posts</li>
                <li>• Only auctions with valid Post URLs will be monitored</li>
                <li>• The system respects rate limits and includes delays between checks</li>
                <li>• Manual updates using the $ buttons remain available as backup</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}