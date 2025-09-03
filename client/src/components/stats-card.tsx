import { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  subtitle?: string;
  trend?: string;
  trendColor?: "positive" | "negative" | "neutral";
}

export default function StatsCard({ title, value, icon, subtitle, trend, trendColor = "neutral" }: StatsCardProps) {
  const trendColors = {
    positive: "text-accent",
    negative: "text-destructive",
    neutral: "text-muted-foreground"
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            {value}
          </p>
        </div>
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      {(subtitle || trend) && (
        <p className={`text-xs mt-2 ${trendColor ? trendColors[trendColor] : "text-muted-foreground"}`}>
          {trend && <span>{trend}</span>}
          {subtitle && <span>{subtitle}</span>}
        </p>
      )}
    </div>
  );
}
