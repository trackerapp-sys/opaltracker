import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Copy, Facebook, ExternalLink } from "lucide-react";

const addAuctionSchema = z.object({
  opalType: z.string().min(1, "Opal type is required"),
  weight: z.string().min(1, "Weight is required").regex(/^\d+\.?\d*$/, "Weight must be a valid number"),
  description: z.string().optional(),
  origin: z.string().optional(),
  shape: z.string().optional(),
  facebookGroup: z.string().min(1, "Facebook group is required"),
  postUrl: z.string().url().optional().or(z.literal("")),
  startingBid: z.string().min(1, "Starting bid is required").regex(/^\d+\.?\d*$/, "Starting bid must be a valid number"),
  currentBid: z.string().regex(/^\d*\.?\d*$/, "Current bid must be a valid number").optional(),
  maxBid: z.string().regex(/^\d*\.?\d*$/, "Max bid must be a valid number").optional(),
  endTime: z.string().min(1, "End time is required"),
  status: z.enum(["active", "ended", "won", "lost"]).default("active"),
  notes: z.string().optional(),
  isWatchlist: z.boolean().default(false),
});

type AddAuctionForm = z.infer<typeof addAuctionSchema>;

export default function AddAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPostGenerator, setShowPostGenerator] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);

  const form = useForm<AddAuctionForm>({
    resolver: zodResolver(addAuctionSchema),
    defaultValues: {
      opalType: "",
      weight: "",
      description: "",
      origin: "",
      shape: "",
      facebookGroup: "",
      postUrl: "",
      startingBid: "",
      currentBid: "",
      maxBid: "",
      endTime: "",
      status: "active",
      notes: "",
      isWatchlist: false,
    },
  });

  const createAuctionMutation = useMutation({
    mutationFn: async (data: AddAuctionForm) => {
      const response = await apiRequest("POST", "/api/auctions", {
        ...data,
        weight: parseFloat(data.weight).toString(),
        startingBid: parseFloat(data.startingBid).toString(),
        currentBid: data.currentBid ? parseFloat(data.currentBid).toString() : undefined,
        maxBid: data.maxBid ? parseFloat(data.maxBid).toString() : undefined,
        endTime: data.endTime, // Send as string, let server handle conversion
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setCreatedAuctionId(data.id);
      toast({
        title: "Success",
        description: "Auction created successfully!",
      });
      // Don't redirect immediately, show post generator option
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create auction. Please try again.",
        variant: "destructive",
      });
      console.error("Create auction error:", error);
    },
  });

  const onSubmit = (data: AddAuctionForm) => {
    createAuctionMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation("/");
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-6">Add New Auction</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="bg-card rounded-lg border border-border p-6 space-y-6">
            {/* Opal Details Section */}
            <div>
              <h3 className="text-lg font-medium text-foreground mb-4">Opal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="opalType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Opal Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-opal-type">
                            <SelectValue placeholder="Select opal type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Black Opal">Black Opal</SelectItem>
                          <SelectItem value="Crystal Opal">Crystal Opal</SelectItem>
                          <SelectItem value="Boulder Opal">Boulder Opal</SelectItem>
                          <SelectItem value="White Opal">White Opal</SelectItem>
                          <SelectItem value="Fire Opal">Fire Opal</SelectItem>
                          <SelectItem value="Matrix Opal">Matrix Opal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (carats) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          placeholder="e.g., 2.5" 
                          {...field}
                          data-testid="input-weight"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={3}
                          placeholder="Describe the opal (color, pattern, origin, etc.)"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origin/Location</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Lightning Ridge, Coober Pedy"
                          {...field}
                          data-testid="input-origin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shape"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shape/Cut</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Oval, Freeform, Cabochon"
                          {...field}
                          data-testid="input-shape"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Auction Details Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Auction Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facebookGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook Group *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Lightning Ridge Opal Group"
                          {...field}
                          data-testid="input-facebook-group"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Auction Post URL</FormLabel>
                      <FormControl>
                        <Input 
                          type="url"
                          placeholder="https://facebook.com/groups/..."
                          {...field}
                          data-testid="input-post-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="startingBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Starting Bid *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            data-testid="input-starting-bid"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Bid</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            data-testid="input-current-bid"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time *</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Input 
                            type="datetime-local"
                            {...field}
                            data-testid="input-end-time"
                          />
                          <p className="text-xs text-muted-foreground">
                            Or enter as: DD/MM/YYYY HH:MM (e.g., 04/01/2025 15:30)
                          </p>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="ended">Ended</SelectItem>
                          <SelectItem value="won">Won</SelectItem>
                          <SelectItem value="lost">Lost</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Options Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Additional Options</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="maxBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Bid</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            data-testid="input-max-bid"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />


                <FormField
                  control={form.control}
                  name="isWatchlist"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-watchlist"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Add to watchlist</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-4 pt-6">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={createAuctionMutation.isPending}
                data-testid="button-save-auction"
              >
                {createAuctionMutation.isPending ? "Saving..." : "Save Auction"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
