import LiveAuctionManager from "@/components/live-auction-manager";

export default function LiveAuction() {
  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-foreground">Live Auction Sessions</h2>
          <p className="text-muted-foreground mt-2">
            Set up and manage live auction sessions with multiple items. Perfect for scheduled live auctions.
          </p>
        </div>
        
        <LiveAuctionManager />
      </div>
    </div>
  );
}