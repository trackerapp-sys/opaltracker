import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FileText, FileSpreadsheet, Code, Download, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Export() {
  const [exportType, setExportType] = useState("all-data");
  const [format, setFormat] = useState("csv");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [includeFields, setIncludeFields] = useState({
    opalDetails: true,
    prices: true,
    groupInfo: true,
    status: true,
    dates: true,
    notes: false,
    urls: false,
    origin: false,
  });

  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (exportData: any) => {
      const response = await apiRequest("POST", "/api/export", exportData);
      return response.json();
    },
    onSuccess: (data) => {
      // Create and download the file
      const content = format === "json" 
        ? JSON.stringify(data.data, null, 2)
        : convertToCSV(data.data);
      
      const blob = new Blob([content], { 
        type: format === "json" ? "application/json" : "text/csv" 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `opal-auctions-${new Date().toISOString().split('T')[0]}.${format}`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export Successful",
        description: `${data.count} auctions exported as ${format.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed", 
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
      console.error("Export error:", error);
    },
  });

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Escape values that contain commas, quotes, or newlines
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        }).join(",")
      )
    ].join("\n");
    
    return csvContent;
  };

  const handleExport = () => {
    const exportData = {
      exportType,
      format,
      dateRange: exportType === "date-range" ? dateRange : undefined,
      includeFields,
    };
    
    exportMutation.mutate(exportData);
  };

  const handlePreview = () => {
    toast({
      title: "Preview",
      description: "Preview functionality would show a sample of the export data.",
    });
  };

  const updateIncludeField = (field: keyof typeof includeFields, checked: boolean) => {
    setIncludeFields(prev => ({ ...prev, [field]: checked }));
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-6">Export Data</h2>
        
        <div className="bg-card rounded-lg border border-border p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Export Options</h3>
            <RadioGroup value={exportType} onValueChange={setExportType} className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="all-data" id="all-data" data-testid="radio-all-data" />
                  <Label htmlFor="all-data" className="text-foreground font-medium">All Auction Data</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-2 ml-6">Export all auctions including completed and active ones</p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="won-auctions" id="won-auctions" data-testid="radio-won-auctions" />
                  <Label htmlFor="won-auctions" className="text-foreground font-medium">Won Auctions Only</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-2 ml-6">Export only auctions you've successfully won</p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="date-range" id="date-range" data-testid="radio-date-range" />
                  <Label htmlFor="date-range" className="text-foreground font-medium">Date Range</Label>
                </div>
                <p className="text-sm text-muted-foreground mt-2 ml-6">Export auctions within a specific date range</p>
                {exportType === "date-range" && (
                  <div className="grid grid-cols-2 gap-4 mt-3 ml-6">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      data-testid="input-start-date"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      data-testid="input-end-date"
                    />
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">File Format</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setFormat("csv")}
                className={`border border-border rounded-lg p-4 text-center hover:bg-muted/50 cursor-pointer transition-colors ${
                  format === "csv" ? "bg-primary/10 border-primary" : ""
                }`}
                data-testid="format-csv"
              >
                <FileSpreadsheet className="text-2xl text-accent mb-2 mx-auto" />
                <p className="font-medium text-foreground">CSV</p>
                <p className="text-xs text-muted-foreground">Spreadsheet compatible</p>
              </button>

              <button
                onClick={() => setFormat("excel")}
                className={`border border-border rounded-lg p-4 text-center hover:bg-muted/50 cursor-pointer transition-colors ${
                  format === "excel" ? "bg-primary/10 border-primary" : ""
                }`}
                data-testid="format-excel"
              >
                <FileText className="text-2xl text-primary mb-2 mx-auto" />
                <p className="font-medium text-foreground">Excel</p>
                <p className="text-xs text-muted-foreground">Microsoft Excel format</p>
              </button>

              <button
                onClick={() => setFormat("json")}
                className={`border border-border rounded-lg p-4 text-center hover:bg-muted/50 cursor-pointer transition-colors ${
                  format === "json" ? "bg-primary/10 border-primary" : ""
                }`}
                data-testid="format-json"
              >
                <Code className="text-2xl text-amber-500 mb-2 mx-auto" />
                <p className="font-medium text-foreground">JSON</p>
                <p className="text-xs text-muted-foreground">Developer friendly</p>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">Include Fields</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.opalDetails}
                    onCheckedChange={(checked) => updateIncludeField("opalDetails", checked as boolean)}
                    data-testid="checkbox-opal-details"
                  />
                  <span className="text-sm text-foreground">Opal Type & Weight</span>
                </Label>
                
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.prices}
                    onCheckedChange={(checked) => updateIncludeField("prices", checked as boolean)}
                    data-testid="checkbox-prices"
                  />
                  <span className="text-sm text-foreground">Auction Prices</span>
                </Label>
                
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.groupInfo}
                    onCheckedChange={(checked) => updateIncludeField("groupInfo", checked as boolean)}
                    data-testid="checkbox-group-info"
                  />
                  <span className="text-sm text-foreground">Group Information</span>
                </Label>
                
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.status}
                    onCheckedChange={(checked) => updateIncludeField("status", checked as boolean)}
                    data-testid="checkbox-status"
                  />
                  <span className="text-sm text-foreground">Auction Status</span>
                </Label>
              </div>
              
              <div className="space-y-3">
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.dates}
                    onCheckedChange={(checked) => updateIncludeField("dates", checked as boolean)}
                    data-testid="checkbox-dates"
                  />
                  <span className="text-sm text-foreground">Dates & Times</span>
                </Label>
                
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.notes}
                    onCheckedChange={(checked) => updateIncludeField("notes", checked as boolean)}
                    data-testid="checkbox-notes"
                  />
                  <span className="text-sm text-foreground">Personal Notes</span>
                </Label>
                
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.urls}
                    onCheckedChange={(checked) => updateIncludeField("urls", checked as boolean)}
                    data-testid="checkbox-urls"
                  />
                  <span className="text-sm text-foreground">URLs & Links</span>
                </Label>
                
                <Label className="flex items-center space-x-2">
                  <Checkbox
                    checked={includeFields.origin}
                    onCheckedChange={(checked) => updateIncludeField("origin", checked as boolean)}
                    data-testid="checkbox-origin"
                  />
                  <span className="text-sm text-foreground">Origin/Location</span>
                </Label>
              </div>
            </div>
          </div>

          <div className="flex space-x-4 pt-6">
            <Button 
              onClick={handleExport}
              className="flex-1"
              disabled={exportMutation.isPending}
              data-testid="button-export"
            >
              <Download className="w-4 h-4 mr-2" />
              {exportMutation.isPending ? "Exporting..." : "Export Data"}
            </Button>
            <Button 
              variant="outline"
              onClick={handlePreview}
              data-testid="button-preview"
            >
              Preview
            </Button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Info className="text-amber-600 mt-1 w-4 h-4" />
              <div>
                <p className="text-sm font-medium text-amber-800">Export Information</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your data will be exported based on the current selections. The export includes all manually entered auction data from your local database.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
