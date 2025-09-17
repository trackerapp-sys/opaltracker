import { useParams } from "wouter";
import LiveAuctionControl from "@/components/live-auction-control";

export default function LiveAuctionControlPage() {
  const { id } = useParams();
  
  if (!id) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-foreground mb-2">Invalid Auction ID</h2>
          <p className="text-muted-foreground">No auction ID provided</p>
        </div>
      </div>
    );
  }

  return <LiveAuctionControl liveAuctionId={id} />;
}
