import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Download, Eye, Plus, Trash2, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const bulkImportSchema = z.object({
  csvData: z.string().min(1, "CSV data is required"),
  defaultGroup: z.string().min(1, "Default Facebook group is required"),
  defaultEndTime: z.string().min(1, "Default end time is required"),
});

type BulkImportForm = z.infer<typeof bulkImportSchema>;

interface ParsedAuction {
  opalType: string;
  weight: string;
  description: string;
  origin: string;
  shape: string;
  startingBid: string;
  facebookGroup: string;
  endTime: string;
}

export default function BulkImport() {
  const { toast } = useToast();
  const [parsedAuctions, setParsedAuctions] = useState<ParsedAuction[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<BulkImportForm>({
    resolver: zodResolver(bulkImportSchema),
    defaultValues: {
      csvData: "",
      defaultGroup: "",
      defaultEndTime: "",
    },
  });

  const createBulkMutation = useMutation({
    mutationFn: (auctions: ParsedAuction[]) => 
      apiRequest("/api/auctions/bulk", {
        method: "POST",
        body: JSON.stringify({ auctions }),
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${parsedAuctions.length} auctions imported successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      form.reset();
      setParsedAuctions([]);
      setShowPreview(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import auctions",
        variant: "destructive",
      });
    },
  });

  const parseCSV = (csvText: string, defaultGroup: string, defaultEndTime: string) => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    const auctions: ParsedAuction[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < headers.length) continue;
      
      const auction: ParsedAuction = {
        opalType: getValue(headers, values, 'opal_type') || getValue(headers, values, 'type') || 'Crystal Opal',
        weight: getValue(headers, values, 'weight') || '1.0',
        description: getValue(headers, values, 'description') || '',
        origin: getValue(headers, values, 'origin') || 'Lightning Ridge',
        shape: getValue(headers, values, 'shape') || 'Freeform',
        startingBid: getValue(headers, values, 'starting_bid') || getValue(headers, values, 'price') || '10',
        facebookGroup: getValue(headers, values, 'facebook_group') || getValue(headers, values, 'group') || defaultGroup,
        endTime: getValue(headers, values, 'end_time') || defaultEndTime,
      };
      
      auctions.push(auction);
    }
    
    return auctions;
  };

  const getValue = (headers: string[], values: string[], key: string): string => {
    const index = headers.indexOf(key);
    return index >= 0 ? values[index] : '';
  };

  const onSubmit = (data: BulkImportForm) => {
    try {
      const parsed = parseCSV(data.csvData, data.defaultGroup, data.defaultEndTime);
      setParsedAuctions(parsed);
      setShowPreview(true);
      toast({
        title: "CSV Parsed",
        description: `Found ${parsed.length} auctions to import`,
      });
    } catch (error) {
      toast({
        title: "Parse Error",
        description: "Failed to parse CSV data. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const template = `opal_type,weight,description,origin,shape,starting_bid,facebook_group,end_time
Crystal Opal,2.5,Beautiful crystal opal with green and blue fire,Lightning Ridge,Oval,25,Opal Lovers Group,2024-01-15T18:00
Black Opal,1.8,Premium black opal with rainbow colors,Lightning Ridge,Freeform,150,Premium Opals,2024-01-15T19:00
Boulder Opal,3.2,Natural boulder opal from Queensland,Queensland,Rough,45,Australian Opals,2024-01-15T20:00`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auction_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportForChromeExtension = () => {
    if (parsedAuctions.length === 0) return;
    
    const posts = parsedAuctions.map((auction, index) => ({
      id: `batch_${Date.now()}_${index}`,
      content: `🔥 ${auction.opalType} Auction - ${auction.weight}ct
      
${auction.description}

📍 Origin: ${auction.origin}
⚡ Shape: ${auction.shape} 
💰 Starting Bid: $${auction.startingBid}
⏰ Ends: ${new Date(auction.endTime).toLocaleString()}

#opal #auction #${auction.origin.replace(/\s+/g, '')}`,
      group: auction.facebookGroup,
      scheduledTime: auction.endTime,
    }));
    
    const exportData = {
      posts,
      generated: new Date().toISOString(),
      source: "Opal Auction Tracker",
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opal_auction_posts_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export Ready",
      description: "Post data exported for Chrome extension",
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Bulk Import Auctions</h1>
          <p className="text-muted-foreground">Import multiple auctions from CSV for live auction dealers</p>
        </div>
        <Button onClick={downloadTemplate} variant="outline" data-testid="button-download-template">
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {!showPreview ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Import CSV Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="csvData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CSV Data</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Paste your CSV data here..."
                          className="min-h-[200px] font-mono text-sm"
                          {...field}
                          data-testid="textarea-csv-data"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultGroup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Facebook Group</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Opal Lovers Group" {...field} data-testid="input-default-group" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defaultEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default End Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-default-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full" data-testid="button-parse-csv">
                  <Eye className="w-4 h-4 mr-2" />
                  Parse & Preview
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview: {parsedAuctions.length} Auctions</span>
                <div className="flex space-x-2">
                  <Button 
                    onClick={exportForChromeExtension} 
                    variant="outline"
                    data-testid="button-export-chrome"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export for Chrome Extension
                  </Button>
                  <Button 
                    onClick={() => setShowPreview(false)} 
                    variant="outline"
                    data-testid="button-edit-csv"
                  >
                    Edit CSV
                  </Button>
                  <Button 
                    onClick={() => createBulkMutation.mutate(parsedAuctions)}
                    disabled={createBulkMutation.isPending}
                    data-testid="button-import-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createBulkMutation.isPending ? "Importing..." : "Import All"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {parsedAuctions.map((auction, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg bg-muted/50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="font-medium text-foreground">{auction.opalType}</p>
                        <p className="text-sm text-muted-foreground">{auction.weight}ct - {auction.shape}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Origin</p>
                        <p className="font-medium">{auction.origin}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Starting Bid</p>
                        <p className="font-medium">${auction.startingBid}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Group</p>
                        <p className="font-medium text-xs">{auction.facebookGroup}</p>
                      </div>
                    </div>
                    {auction.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{auction.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}