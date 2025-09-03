import { PieChart } from "lucide-react";

interface Analytics {
  totalAuctions: number;
  wonAuctions: number;
  winRate: number;
}

interface WinRateChartProps {
  analytics?: Analytics;
}

export default function WinRateChart({ analytics }: WinRateChartProps) {
  const wonCount = analytics?.wonAuctions || 0;
  const totalEnded = analytics?.totalAuctions || 0;
  const lostCount = totalEnded - wonCount;
  const winRate = analytics?.winRate || 0;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Win Rate Analysis</h3>
      <div className="h-64 bg-muted/30 rounded-lg flex flex-col items-center justify-center p-6">
        <PieChart className="h-12 w-12 text-accent mb-4" />
        
        {totalEnded === 0 ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-2">No completed auctions</p>
            <p className="text-sm text-muted-foreground">Participate in auctions to see win rate analysis</p>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div>
              <p className="text-3xl font-bold text-foreground" data-testid="win-rate-percentage">
                {Math.round(winRate)}%
              </p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
            
            <div className="flex items-center justify-center space-x-8">
              <div className="text-center">
                <div className="w-4 h-4 bg-accent rounded-full mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground" data-testid="won-count">{wonCount}</p>
                <p className="text-xs text-muted-foreground">Won</p>
              </div>
              <div className="text-center">
                <div className="w-4 h-4 bg-destructive rounded-full mx-auto mb-2"></div>
                <p className="text-sm font-medium text-foreground" data-testid="lost-count">{lostCount}</p>
                <p className="text-xs text-muted-foreground">Lost</p>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Based on {totalEnded} completed auctions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
