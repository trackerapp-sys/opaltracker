import { Link, useLocation } from "wouter";
import { Gem, ChartLine, List, Plus, BarChart, Download } from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { path: "/", label: "Dashboard", icon: ChartLine },
    { path: "/auctions", label: "View Auctions", icon: List },
    { path: "/add-auction", label: "Add Auction", icon: Plus },
    { path: "/analytics", label: "Analytics", icon: BarChart },
    { path: "/export", label: "Export Data", icon: Download },
  ];

  return (
    <nav className="w-64 bg-card border-r border-border flex flex-col" data-testid="sidebar-navigation">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Gem className="text-primary-foreground w-4 h-4" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Opal Tracker</h1>
        </div>
      </div>
      
      <div className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <button
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="bg-muted rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API Status</span>
            <span className="text-destructive font-medium" data-testid="api-status">Offline</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Facebook Groups API deprecated. Manual entry only.
          </p>
        </div>
      </div>
    </nav>
  );
}
