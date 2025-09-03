import { Eye, Edit } from "lucide-react";

interface Auction {
  id: string;
  opalType: string;
  weight: string;
  description?: string;
  facebookGroup: string;
  startingBid: string;
  currentBid?: string;
  endTime: string;
  status: "active" | "ended" | "won" | "lost";
}

interface AuctionTableProps {
  auctions: Auction[];
  formatCurrency: (value: string) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}

export default function AuctionTable({ auctions, formatCurrency, formatDate, getStatusColor }: AuctionTableProps) {
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
              <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
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
                  {formatCurrency(auction.currentBid || auction.startingBid)}
                </td>
                <td className="px-6 py-4 text-sm text-foreground" data-testid={`end-time-${auction.id}`}>
                  {formatDate(auction.endTime)}
                </td>
                <td className="px-6 py-4">
                  <span 
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(auction.status)}`}
                    data-testid={`status-${auction.id}`}
                  >
                    {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex space-x-2">
                    <button 
                      className="text-primary hover:text-primary/80"
                      data-testid={`button-view-${auction.id}`}
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      className="text-muted-foreground hover:text-foreground"
                      data-testid={`button-edit-${auction.id}`}
                      title="Edit auction"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
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
