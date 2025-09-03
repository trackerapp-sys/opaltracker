import { useQuery } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";

interface Auction {
  id: string;
  currentBid?: string;
  startingBid: string;
  createdAt: string;
  status: string;
}

export default function PriceTrendChart() {
  const { data: auctionsData, isLoading } = useQuery<{ auctions: Auction[] }>({
    queryKey: ["/api/auctions", { limit: 100 }],
  });

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Price Trends (Last 6 Months)</h3>
        <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
          <div className="animate-pulse">Loading chart...</div>
        </div>
      </div>
    );
  }

  const auctions = auctionsData?.auctions || [];
  
  // Calculate trend data from actual auctions
  const avgPrice = auctions.length > 0 
    ? auctions.reduce((sum, auction) => sum + parseFloat(auction.currentBid || auction.startingBid), 0) / auctions.length
    : 0;

  const wonAuctions = auctions.filter(a => a.status === "won");
  const avgWonPrice = wonAuctions.length > 0
    ? wonAuctions.reduce((sum, auction) => sum + parseFloat(auction.currentBid || auction.startingBid), 0) / wonAuctions.length
    : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Price Trends Analysis</h3>
      <div className="h-64 bg-muted/30 rounded-lg flex flex-col items-center justify-center p-6">
        <TrendingUp className="h-12 w-12 text-primary mb-4" />
        
        {auctions.length === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No auction data available</p>
            <p className="text-sm text-muted-foreground">Add auctions to see price trends</p>
          </div>
        ) : (
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground mb-4">Price Trend Summary</p>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-foreground" data-testid="avg-all-price">
                  ${Math.round(avgPrice)}
                </p>
                <p className="text-xs text-muted-foreground">Avg All Auctions</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground" data-testid="avg-won-price">
                  ${Math.round(avgWonPrice)}
                </p>
                <p className="text-xs text-muted-foreground">Avg Won Auctions</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Based on {auctions.length} tracked auctions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
