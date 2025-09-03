import { useQuery } from "@tanstack/react-query";
import PriceTrendChart from "@/components/charts/price-trend-chart";
import WinRateChart from "@/components/charts/win-rate-chart";

interface Analytics {
  totalAuctions: number;
  activeAuctions: number;
  wonAuctions: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  winRate: number;
  groupStats: Array<{
    group: string;
    auctions: number;
    winRate: number;
    avgPrice: number;
  }>;
  recentAuctions: any[];
}

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<Analytics>({
    queryKey: ["/api/analytics"],
  });

  const formatCurrency = (value: number) => `$${Math.round(value)}`;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card rounded-lg border border-border p-6 h-80"></div>
            <div className="bg-card rounded-lg border border-border p-6 h-80"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold text-foreground mb-6">Analytics & Insights</h2>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <PriceTrendChart />
        <WinRateChart analytics={analytics} />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Performance by Group</h3>
          </div>
          <div className="p-6">
            {analytics?.groupStats?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No group data available</p>
                <p className="text-sm text-muted-foreground mt-1">Add some auctions to see group performance</p>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics?.groupStats?.map((group, index) => (
                  <div key={group.group} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg" data-testid={`group-stats-${index}`}>
                    <div>
                      <p className="font-medium text-foreground">{group.group}</p>
                      <p className="text-sm text-muted-foreground">{group.auctions} auctions participated</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{Math.round(group.winRate)}% Win Rate</p>
                      <p className="text-sm text-muted-foreground">Avg: {formatCurrency(group.avgPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">Key Metrics</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="font-semibold text-foreground" data-testid="total-spent">
                  {formatCurrency((analytics?.wonAuctions || 0) * (analytics?.avgPrice || 0))}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${Math.min(100, ((analytics?.wonAuctions || 0) / Math.max(1, analytics?.totalAuctions || 1)) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Average Bid</span>
                <span className="font-semibold text-foreground" data-testid="average-bid">
                  {formatCurrency(analytics?.avgPrice || 0)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-accent h-2 rounded-full" style={{ width: "65%" }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="font-semibold text-foreground" data-testid="success-rate">
                  {Math.round(analytics?.winRate || 0)}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full" 
                  style={{ width: `${analytics?.winRate || 0}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground" data-testid="opals-won">
                  {analytics?.wonAuctions || 0}
                </p>
                <p className="text-sm text-muted-foreground">Opals Won</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
