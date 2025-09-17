import { Link, useLocation } from "wouter";
import { Gem, ChartLine, List, Plus, Download, Activity, Upload, Settings, HelpCircle, Play, Eye, Calendar, TestTube } from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const menuSections = [
    {
      title: "Overview",
      items: [
        { path: "/", label: "Dashboard", icon: ChartLine },
      ]
    },
    {
      title: "Individual Auctions",
      items: [
        { path: "/auctions", label: "View Individual Auctions", icon: Eye },
        { path: "/add-auction", label: "Add Individual Auction", icon: Plus },
      ]
    },
    {
      title: "Live Auctions",
      items: [
        { path: "/live-auction-dashboard", label: "View Live Auctions", icon: Eye },
        { path: "/live-auction-session", label: "Add Live Auction", icon: Calendar },
      ]
    },
    {
      title: "Tools",
      items: [
        { path: "/bulk-import", label: "Bulk Import", icon: Upload },
        { path: "/export", label: "Export Data", icon: Download },
      ]
    },
    {
      title: "Settings & Support",
      items: [
        { path: "/settings", label: "Settings", icon: Settings },
        { path: "/opal-type-settings", label: "Opal Type Settings", icon: Gem },
        { path: "/help", label: "Help & Support", icon: HelpCircle },
        ...(process.env.NODE_ENV === 'development' ? [{ path: "/dev-testing", label: "Dev Testing", icon: TestTube }] : []),
      ]
    },
  ];

  return (
    <nav className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col shadow-xl" data-testid="sidebar-navigation">
      <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
            <Gem className="text-orange-600 w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Opal Tracker</h1>
            <p className="text-xs text-orange-100">Auction Management</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
        <div className="space-y-8">
          {menuSections.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 px-3 border-l-2 border-slate-600 pl-3">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <li key={item.path}>
                      <Link href={item.path}>
                        <button
                          data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                            isActive
                              ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-[1.02]"
                              : "hover:bg-slate-800 text-slate-300 hover:text-white hover:shadow-md hover:transform hover:scale-[1.01]"
                          }`}
                        >
                          <Icon className={`w-5 h-5 transition-colors duration-200 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`} style={{ minWidth: '20px', minHeight: '20px' }} />
                          <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
                        </button>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
