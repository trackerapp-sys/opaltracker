import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { convertToUTC, convertFromUTC } from "@/lib/dateUtils";
import { toZonedTime } from 'date-fns-tz';
import { Clock, RefreshCw, Package, Settings, Calendar, Share2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FacebookPostGenerator from "@/components/facebook-post-generator";

const addAuctionSchema = z.object({
  opalType: z.string().min(1, "Opal type is required"),
  weight: z.string().min(1, "Weight is required").regex(/^\d+\.?\d*$/, "Weight must be a valid number"),
  weightGrams: z.string().optional(),
  description: z.string().optional(),
  origin: z.string().optional(),
  shape: z.string().optional(),
  facebookGroup: z.string().min(1, "Facebook group is required"),
  postUrl: z.string().url().optional().or(z.literal("")),
  startingBid: z.string().min(1, "Starting bid is required").regex(/^\d+\.?\d*$/, "Starting bid must be a valid number"),
  reservePrice: z.string().regex(/^\d*\.?\d*$/, "Reserve price must be a valid number").optional(),
  maxBid: z.string().regex(/^\d*\.?\d*$/, "Max bid must be a valid number").optional(),
  bidIncrements: z.string().regex(/^\d*\.?\d*$/, "Bid increments must be a valid number").optional(),
  localShipping: z.string().regex(/^\d*\.?\d*$/, "Local shipping cost must be a valid number").optional(),
  internationalShipping: z.string().regex(/^\d*\.?\d*$/, "International shipping cost must be a valid number").optional(),
  location: z.string().optional(),
  paymentMethod: z.array(z.string()).optional(),
  startTime: z.string().min(1, "Start time is required"),
  durationHours: z.string().min(1, "Duration is required").regex(/^\d+$/, "Duration must be a valid number"),
  durationMinutes: z.string().regex(/^\d*$/, "Minutes must be a valid number").optional(),
  endTime: z.string().min(1, "End time is required"),
  status: z.enum(["active", "ended"]).default("active"),
  notes: z.string().optional(),
  isWatchlist: z.boolean().default(false),
});

type AddAuctionForm = z.infer<typeof addAuctionSchema>;

export default function AddAuction() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);

  // Function to calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationHours: string, durationMinutes: string = "0") => {
    if (!startTime || !durationHours) return "";
    
    try {
      // Parse the datetime-local input (YYYY-MM-DDTHH:MM format)
      const [datePart, timePart] = startTime.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Create a new Date object in local timezone
      const start = new Date(year, month - 1, day, hour, minute);
      
      const hours = parseInt(durationHours) || 0;
      const minutes = parseInt(durationMinutes) || 0;
      
      // Calculate total duration in milliseconds
      const totalDurationMs = (hours * 60 + minutes) * 60 * 1000;
      
      const end = new Date(start.getTime() + totalDurationMs);
      
      // Format back to datetime-local format
      const result = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}T${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
      
      console.log(`Date calculation: Start: ${startTime}, Duration: ${hours}h ${minutes}m, End: ${result}`);
      
      return result;
    } catch (error) {
      console.error("Error calculating end time:", error);
      return "";
    }
  };

  // Function to calculate end time based on start time and duration

  const form = useForm<AddAuctionForm>({
    resolver: zodResolver(addAuctionSchema),
    defaultValues: {
      opalType: "",
      weight: "",
      weightGrams: "",
      description: "",
      origin: "",
      shape: "",
      facebookGroup: "",
      postUrl: "",
      startingBid: "",
      reservePrice: "",
      maxBid: "",
      bidIncrements: "",
      localShipping: "",
      internationalShipping: "",
      location: "",
      paymentMethod: [],
      startTime: "", // Will be set automatically to today's date in user's timezone in useEffect
      durationHours: "24", // Default to 24 hours
      durationMinutes: "0",
      endTime: "",
      status: "active",
      notes: "",
      isWatchlist: false,
    },
  });

  // Fetch user-defined payment methods
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["/api/settings/payment-methods"],
    queryFn: async () => {
      const response = await fetch("/api/settings/payment-methods");
      if (!response.ok) throw new Error("Failed to fetch payment methods");
      return response.json();
    },
  });

  // Get user settings for timezone
  const { data: settings } = useQuery<{ dateFormat: string; timezone: string; opalTypes: string[] }>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });


  // Set initial start time with timezone awareness
  useEffect(() => {
    console.log("Settings in add auction:", settings);
    // Use Australia/Sydney as fallback if timezone is missing from settings
    const timezone = settings?.timezone || 'Australia/Sydney';
    
    if (timezone) {
      const now = new Date();
      
      console.log("Using timezone:", timezone);
      
      // Convert current UTC time to user's timezone
      const zonedDate = toZonedTime(now, timezone);
      
      const year = zonedDate.getFullYear();
      const month = String(zonedDate.getMonth() + 1).padStart(2, '0');
      const day = String(zonedDate.getDate()).padStart(2, '0');
      const hours = String(zonedDate.getHours()).padStart(2, '0');
      const minutes = String(zonedDate.getMinutes()).padStart(2, '0');
      
      const datetimeLocalValue = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      console.log("Setting startTime to:", datetimeLocalValue);
      
      // Always set the current time in user's timezone
      form.setValue("startTime", datetimeLocalValue);
    } else {
      console.log("No timezone found in settings, using current time");
      // Fallback to current time if no timezone is set
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      
      const datetimeLocalValue = `${year}-${month}-${day}T${hours}:${minutes}`;
      form.setValue("startTime", datetimeLocalValue);
    }
  }, [settings, form]);

  // Watch for changes in start time and duration to auto-calculate end time
  const watchedStartTime = form.watch("startTime");
  const watchedDurationHours = form.watch("durationHours");
  const watchedDurationMinutes = form.watch("durationMinutes");
  const watchedWeight = form.watch("weight");

  // Function to convert carats to grams (1 carat = 0.2 grams)
  const convertCaratsToGrams = (carats: string): string => {
    if (!carats || carats === "") return "";
    const caratsNum = parseFloat(carats);
    if (isNaN(caratsNum)) return "";
    const grams = caratsNum * 0.2;
    return grams.toFixed(3); // Show 3 decimal places for precision
  };

  // Auto-calculate grams when weight (carats) changes
  useEffect(() => {
    if (watchedWeight) {
      const grams = convertCaratsToGrams(watchedWeight);
      form.setValue("weightGrams", grams);
    } else {
      form.setValue("weightGrams", "");
    }
  }, [watchedWeight, form]);

  useEffect(() => {
    if (watchedStartTime && watchedDurationHours) {
      const calculatedEndTime = calculateEndTime(watchedStartTime, watchedDurationHours, watchedDurationMinutes);
      if (calculatedEndTime) {
        form.setValue("endTime", calculatedEndTime);
      }
    }
  }, [watchedStartTime, watchedDurationHours, watchedDurationMinutes, form]);


  const createAuctionMutation = useMutation({
    mutationFn: async (data: AddAuctionForm) => {
      // Convert startTime and endTime from user's timezone to UTC for storage
      // Use Australia/Sydney as fallback if timezone is missing from settings
      const timezone = settings?.timezone || 'Australia/Sydney';
      console.log('🌍 Using timezone:', timezone);
      
      const startTimeUTC = convertToUTC(data.startTime, timezone);
      const endTimeUTC = convertToUTC(data.endTime, timezone);
      
      console.log('📅 Converting times:');
      console.log('  Start:', data.startTime, '->', startTimeUTC);
      console.log('  End:', data.endTime, '->', endTimeUTC);
      
      const response = await apiRequest("POST", "/api/auctions", {
        ...data,
        weight: parseFloat(data.weight).toString(),
        weightGrams: data.weightGrams ? parseFloat(data.weightGrams).toString() : undefined,
        startingBid: parseFloat(data.startingBid).toString(),
        reservePrice: data.reservePrice ? parseFloat(data.reservePrice).toString() : undefined,
        maxBid: data.maxBid ? parseFloat(data.maxBid).toString() : undefined,
        bidIncrements: data.bidIncrements ? parseFloat(data.bidIncrements).toString() : undefined,
        localShipping: data.localShipping ? parseFloat(data.localShipping).toString() : undefined,
        internationalShipping: data.internationalShipping ? parseFloat(data.internationalShipping).toString() : undefined,
        paymentMethod: data.paymentMethod ? JSON.stringify(data.paymentMethod) : undefined,
        startTime: startTimeUTC, // Convert to UTC before sending
        endTime: endTimeUTC, // Convert to UTC before sending
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auctions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      setCreatedAuctionId(data.id);
      toast({
        title: "Success",
        description: "Auction created successfully! You can now generate a Facebook post with the actual auction ID.",
      });
      // Don't redirect immediately - let user generate Facebook post first
      // setLocation("/auctions");
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
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-foreground mb-6">Add New Auction</h2>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Tabs defaultValue="opal" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="opal" className="flex items-center space-x-1">
                  <Package className="w-3 h-3" />
                  <span>Item Details</span>
                </TabsTrigger>
                <TabsTrigger value="auction" className="flex items-center space-x-1">
                  <Settings className="w-3 h-3" />
                  <span>Auction Details</span>
                </TabsTrigger>
                <TabsTrigger value="timing" className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Duration</span>
                </TabsTrigger>
                <TabsTrigger value="facebook" className="flex items-center space-x-1">
                  <Share2 className="w-3 h-3" />
                  <span>Facebook</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="opal" className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center">
                      <Package className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
            <div>
                      <h3 className="text-lg font-semibold text-foreground">Item Details</h3>
                      <p className="text-sm text-muted-foreground">Describe your precious item</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="opalType"
                  render={({ field }) => (
                        <FormItem className="md:col-span-2">
                      <FormLabel>Opal Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-opal-type">
                            <SelectValue placeholder="Select opal type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                              {(settings?.opalTypes || []).map((type) => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                              ))}
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
                      name="weightGrams"
                  render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (grams)</FormLabel>
                      <FormControl>
                            <Input 
                              type="number" 
                              step="0.001" 
                              placeholder="Auto-calculated" 
                          {...field}
                              readOnly
                              className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                              data-testid="input-weight-grams"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                          <FormLabel>Origin / Location / Field</FormLabel>
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
                          <FormLabel>Shape / Cut</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={4}
                            placeholder="Describe the opal (color, pattern, origin, etc.)"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
            </div>
              </TabsContent>

              <TabsContent value="auction" className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-md flex items-center justify-center">
                      <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Auction Details</h3>
                      <p className="text-sm text-muted-foreground">Set your auction parameters</p>
                    </div>
                  </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="facebookGroup"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground">Facebook Group *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Lightning Ridge Opal Group"
                          className="h-11"
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
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Starting Bid *
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500"
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
                  name="reservePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Reserve Price
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bidIncrements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Bid Increments
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500"
                            {...field}
                            data-testid="input-bid-increments"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="localShipping"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Local Shipping Cost
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500"
                            {...field}
                            data-testid="input-local-shipping"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="internationalShipping"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        International Shipping Cost
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 font-medium">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500"
                            {...field}
                            data-testid="input-international-shipping"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Location
                      </FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Sydney, NSW"
                          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:border-orange-500 focus:ring-orange-500"
                          {...field}
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                          <FormLabel>Payment Methods</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                              {paymentMethods?.map((method) => (
                              <div key={method.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                  id={`payment-${method.id}`}
                                  checked={field.value?.includes(method.name) || false}
                                    onChange={(e) => {
                                      const currentValue = field.value || [];
                                      if (e.target.checked) {
                                        field.onChange([...currentValue, method.name]);
                                    } else {
                                        field.onChange(currentValue.filter((v: string) => v !== method.name));
                                    }
                                  }}
                                    className="rounded border-gray-300"
                                />
                                  <label htmlFor={`payment-${method.id}`} className="text-sm text-foreground">
                                  {method.name}
                                  </label>
                              </div>
                              ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timing" className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 space-y-6">
                    <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-md flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Duration</h3>
                      <p className="text-sm text-muted-foreground">Set start and end times</p>
                    </div>
                    </div>
                    
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem className="md:col-span-4">
                              <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Start Date & Time <span className="text-xs text-slate-600 dark:text-slate-400">(Today's date and time)</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="datetime-local"
                                  {...field}
                                  data-testid="input-start-time"
                                className="h-10 text-sm"
                              />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="durationHours"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2 space-y-2">
                          <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Duration <span className="text-xs">(Hours)</span>
                          </FormLabel>
                                <FormControl>
                                    <Input 
                                      type="number"
                                      min="1"
                                      placeholder="24"
                                      {...field}
                                      data-testid="input-duration-hours"
                              className="h-10 text-sm"
                                    />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                        <FormField
                          control={form.control}
                          name="durationMinutes"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2 space-y-2">
                          <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Duration <span className="text-xs">(Minutes)</span>
                          </FormLabel>
                                <FormControl>
                                    <Input 
                                      type="number"
                                      min="0"
                                      max="59"
                                      placeholder="0"
                                      {...field}
                                      data-testid="input-duration-minutes"
                              className="h-10 text-sm"
                                    />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        <FormField
                          control={form.control}
                          name="endTime"
                          render={({ field }) => (
                            <FormItem className="md:col-span-3">
                          <FormLabel className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            End Time <span className="text-xs text-slate-600 dark:text-slate-400">(Auto)</span>
                          </FormLabel>
                            <FormControl>
                                <Input 
                                  type="datetime-local"
                                  {...field}
                                  data-testid="input-end-time"
                                  readOnly
                                className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 h-10 text-sm"
                                />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                  </div>
                </div>
              </TabsContent>

              <TabsContent value="facebook" className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg border p-6 space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-md flex items-center justify-center">
                      <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Facebook Integration</h3>
                      <p className="text-sm text-muted-foreground">Generate posts for social media</p>
              </div>
            </div>

                  <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                      Generate a Facebook post for your auction and copy it to your clipboard for easy posting.
                    </p>
                    <FacebookPostGenerator 
                      formData={{
                        opalType: form.watch("opalType") || "",
                        weight: form.watch("weight") || "",
                        weightGrams: form.watch("weightGrams") || "",
                        description: form.watch("description") || "",
                        origin: form.watch("origin") || "",
                        shape: form.watch("shape") || "",
                        facebookGroup: form.watch("facebookGroup") || "",
                        startingBid: form.watch("startingBid") || "",
                        endTime: form.watch("endTime") || "",
                        bidIncrements: form.watch("bidIncrements") || "",
                        localShipping: form.watch("localShipping") || "",
                        internationalShipping: form.watch("internationalShipping") || "",
                        paymentMethod: form.watch("paymentMethod") || [],
                        location: form.watch("location") || "",
                        auctionId: createdAuctionId
                      }}
                    />
            </div>

            {/* Form Actions */}
                  <div className="flex space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button 
                type="submit" 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
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
                </div>
              </TabsContent>
            </Tabs>

            {/* Show after successful save */}
            {createdAuctionId && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-foreground">Auction Saved Successfully!</h4>
                    <p className="text-sm text-green-600">Auction ID: {createdAuctionId}</p>
                  </div>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  Your auction has been saved. You can now generate a Facebook post with the actual auction ID, or go to the auctions page to manage your auctions.
                </p>
                <div className="flex space-x-3">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation("/auctions")}
                    className="bg-white hover:bg-green-50 border-green-300 text-green-700"
                  >
                    Go to Auctions
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => {
                      // Reset form for new auction
                      form.reset();
                      setCreatedAuctionId(null);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Add Another Auction
                  </Button>
                </div>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
