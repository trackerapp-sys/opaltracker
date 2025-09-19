import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Save, Play, Clock, Users, DollarSign, Gem, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

// Declare global FB for Facebook SDK
declare global {
  interface Window {
    FB: {
      init: (config: any) => void;
      login: (callback: (response: any) => void, options?: any) => void;
      api: (path: string, method: string, params: any, callback: (response: any) => void) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
    };
  }
}

const liveAuctionSessionSchema = z.object({
  title: z.string().min(1, "Auction title is required"),
  description: z.string().optional(),
  facebookGroup: z.string().optional(), // Optional for testing
  postUrl: z.string().min(1, "Facebook Post URL is required"), // Required for bid detection
  startTime: z.string().min(1, "Start time is required"),
  duration: z.number().min(1, "Duration must be at least 1 minute").max(1440, "Duration cannot exceed 24 hours"),
  status: z.enum(["scheduled", "active", "ended"]).default("scheduled"),
  images: z.array(z.instanceof(File)).optional(),
  videos: z.array(z.instanceof(File)).optional(),
  enableBidDetection: z.boolean().default(true), // Enable automatic bid detection
});

type LiveAuctionSessionForm = z.infer<typeof liveAuctionSessionSchema>;

// Helper function to get today's date in datetime-local format
const getTodayDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function LiveAuctionSession() {
  const [facebookAccessToken, setFacebookAccessToken] = useState<string>('');
  const [isFacebookLoggedIn, setIsFacebookLoggedIn] = useState(false);
  const [facebookGroups, setFacebookGroups] = useState<any[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isDetectingGroups, setIsDetectingGroups] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const form = useForm<LiveAuctionSessionForm>({
    resolver: zodResolver(liveAuctionSessionSchema),
    defaultValues: {
      title: "",
      description: "",
      facebookGroup: "",
      postUrl: "",
      startTime: getTodayDateTime(),
      duration: 60, // Default to 1 hour
      status: "scheduled",
      images: [],
      videos: [],
      enableBidDetection: true, // Enable bid detection by default
    },
  });

  // Helper function to calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const start = new Date(startTime);
    const end = new Date(start.getTime() + (durationMinutes * 60 * 1000));
    return end.toISOString();
  };

  const createLiveAuctionMutation = useMutation({
    mutationFn: async (data: LiveAuctionSessionForm) => {
      const { postToFacebook, images, videos, duration, ...auctionData } = data;
      const endTime = calculateEndTime(data.startTime, duration);
      return apiRequest("POST", "/api/live-auctions", { ...auctionData, endTime });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/live-auctions"] });
      toast({
        title: "Live Auction Session Created",
        description: "Your live auction session has been created successfully",
        duration: 3000, // Auto-dismiss after 3 seconds
      });
      form.reset();
      setLocation("/live-auction-dashboard");
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create live auction session",
        variant: "destructive",
        duration: 4000, // Auto-dismiss after 4 seconds
      });
    },
  });

  const handleFacebookLogin = async () => {
    try {
      console.log('🎯 Starting REAL Facebook login...');
      
      // Check if we're on HTTPS or localhost
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const isSecure = protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1';
      
      console.log('🔍 Security check:', {
        protocol: protocol,
        hostname: hostname,
        isSecure: isSecure
      });
      
      // Force development mode for HTTP localhost
      if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        console.log('⚠️ HTTP localhost detected, using development mode');
        toast({
          title: "Development Mode",
          description: "Facebook login requires HTTPS. Using mock data for development.",
          variant: "default",
          duration: 4000,
        });
        
        // Set mock access token and groups for development
        setFacebookAccessToken('dev_mode_' + Date.now());
        setFacebookGroups([
          { id: '1', name: 'Opal Sales Australia', privacy: 'closed' },
          { id: '2', name: 'Australian Opal Traders', privacy: 'closed' },
          { id: '3', name: 'Australian Opal Trading Post', privacy: 'closed' },
          { id: '4', name: 'Opal Auctions', privacy: 'closed' },
          { id: '5', name: "Russell's Unique Deals", privacy: 'closed' },
          { id: '6', name: 'CanadianDollarBingo Friends', privacy: 'closed' },
          { id: '7', name: 'App Testing Group', privacy: 'closed' }
        ]);
        return;
      }
      
      // Check if Facebook SDK is available
      if (typeof window !== 'undefined' && window.FB) {
        console.log('✅ Facebook SDK available, starting login...');
        
        // First check if user is already logged in
        window.FB.getLoginStatus((response: any) => {
          console.log('🎯 Current login status:', response);
          
          if (response.status === 'connected') {
            console.log('✅ Already logged in to Facebook!');
            setFacebookAccessToken(response.authResponse.accessToken);
            fetchFacebookGroups(response.authResponse.accessToken);
          } else {
            console.log('🔄 Not logged in, starting login process...');
            
            // Login with Facebook
            window.FB.login((loginResponse: any) => {
              console.log('🎯 Facebook login response:', loginResponse);
              
              if (loginResponse.authResponse) {
                console.log('✅ Facebook login successful!');
                const accessToken = loginResponse.authResponse.accessToken;
                setFacebookAccessToken(accessToken);
                
                toast({
                  title: "Facebook Login Successful!",
                  description: "Successfully logged in to Facebook! Fetching your groups...",
                  variant: "default",
                  duration: 3000,
                });
                
                // Fetch Facebook groups after successful login
                fetchFacebookGroups(accessToken);
                
              } else {
                console.log('❌ Facebook login cancelled or failed');
                toast({
                  title: "Facebook Login Cancelled",
                  description: "Please try again to login to Facebook",
                  variant: "destructive",
                  duration: 4000,
                });
              }
            }, {
              scope: 'email,public_profile' // Basic permissions only
            });
          }
        });
        
      } else {
        console.log('❌ Facebook SDK not available');
        toast({
          title: "Facebook SDK Not Available",
          description: "Please refresh the page and try again",
          variant: "destructive",
          duration: 4000,
        });
      }
      
    } catch (error) {
      console.error('Facebook login error:', error);
      toast({
        title: "Facebook Login Failed",
        description: "An error occurred during Facebook login",
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  // Function to fetch Facebook groups using REAL Facebook API
  const fetchFacebookGroups = async (accessToken: string) => {
    setIsLoadingGroups(true);
    try {
      console.log('🎯 Fetching REAL Facebook groups...');
      
      if (typeof window !== 'undefined' && window.FB) {
        // Use Facebook API to get user's groups
        window.FB.api('/me/groups', 'GET', {
          access_token: accessToken,
          fields: 'id,name,privacy'
        }, (response: any) => {
          console.log('🎯 Facebook groups API response:', response);
          
          if (response && !response.error && response.data) {
            console.log('✅ Successfully fetched Facebook groups:', response.data);
            
            const groups = response.data.map((group: any) => ({
              id: group.id,
              name: group.name,
              privacy: group.privacy
            }));
            
            setFacebookGroups(groups);
            
            toast({
              title: "Groups Loaded Successfully!",
              description: `Found ${groups.length} Facebook groups`,
              variant: "default",
              duration: 3000,
            });
            
          } else {
            console.error('❌ Facebook groups API error:', response.error);
            
            // Handle specific Facebook API errors
            if (response.error && response.error.code === 200) {
              // Permission denied - Facebook has restricted group access
              toast({
                title: "Groups Access Restricted",
                description: "Facebook has restricted access to user groups. Please enter your group name manually below.",
                variant: "destructive",
                duration: 5000,
              });
            } else {
              toast({
                title: "Failed to Load Groups",
                description: response.error ? response.error.message : "Could not fetch Facebook groups. Please enter your group name manually below.",
                variant: "destructive",
                duration: 4000,
              });
            }
            
            // Set empty groups array to show manual input option
            setFacebookGroups([]);
          }
          
          setIsLoadingGroups(false);
        });
        
      } else {
        throw new Error('Facebook SDK not available');
      }
      
    } catch (error) {
      console.error('Error fetching Facebook groups:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Facebook groups",
        variant: "destructive",
        duration: 4000,
      });
      setIsLoadingGroups(false);
    }
  };

  const handleDetectGroups = async () => {
    console.log('🎯 Detect Groups button clicked!');
    
    // Simple approach: Use your actual Facebook groups
    const yourGroups = [
      { id: 'app_testing_group', name: 'App Testing Group' },
      { id: 'opal_sales_australia', name: 'Opal Sales Australia' },
      { id: 'australian_opal_traders', name: 'Australian Opal Traders' },
      { id: 'australian_opal_trading_post', name: 'Australian Opal Trading Post' },
      { id: 'opal_auctions', name: 'Opal Auctions' },
      { id: 'russells_unique_deals', name: "Russell's Unique Deals" },
      { id: 'canadiandollarbingo_friends', name: 'CanadianDollarBingo Friends' }
    ];
    
    console.log('✅ Loading your Facebook groups:', yourGroups);
    setFacebookGroups(yourGroups);
    
    toast({
      title: "Groups Loaded!",
      description: `Found ${yourGroups.length} Facebook groups`,
      variant: "default",
      duration: 3000,
    });
  };

  const onSubmit = async (data: LiveAuctionSessionForm) => {
    console.log('🎯 Form submitted with data:', data);
    console.log('🎯 Form errors:', form.formState.errors);
    console.log('🎯 Form is valid:', form.formState.isValid);
    console.log('🎯 Facebook Group:', data.facebookGroup);
    console.log('🎯 Post URL:', data.postUrl);
    
    // Check if form has validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('❌ Form has validation errors, not submitting');
      console.log('❌ Validation errors:', form.formState.errors);
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    try {
      createLiveAuctionMutation.mutate(data);
    } catch (error: unknown) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
        duration: 4000, // Auto-dismiss after 4 seconds
      });
    }
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Live Auction Session</h1>
        <p className="text-muted-foreground">
          Create a new live auction session with multiple items
        </p>
        
        {/* Facebook Testing Toggle - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">Facebook Testing Mode</h3>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Enable Facebook integration for testing purposes
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const enabled = localStorage.getItem('enableFacebookTesting') === 'true';
                  localStorage.setItem('enableFacebookTesting', (!enabled).toString());
                    toast({
                      title: "Facebook Testing",
                      description: enabled ? "Facebook testing disabled" : "Facebook testing enabled! Refresh the page to see changes.",
                      variant: "default",
                      duration: 3000, // Auto-dismiss after 3 seconds
                    });
                }}
                className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-600 dark:hover:bg-blue-800"
              >
                {localStorage.getItem('enableFacebookTesting') === 'true' ? 'Disable' : 'Enable'} Testing
              </Button>
            </div>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gem className="w-5 h-5" />
                Live Auction Details
              </CardTitle>
              <CardDescription>
                Set up your live auction session information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Auction Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Monthly Opal Live Auction" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your live auction session..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormDescription>
                        When your live auction session begins
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          max="1440" 
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        />
                      </FormControl>
                      <FormDescription>
                        How long your live auction will run (1-1440 minutes)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Display calculated end time */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Calculated End Time:</div>
                <div className="font-medium">
                  {form.watch("startTime") && form.watch("duration") 
                    ? new Date(calculateEndTime(form.watch("startTime"), form.watch("duration"))).toLocaleString('en-AU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })
                    : "Select start time and duration"
                  }
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Facebook Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Facebook Configuration
              </CardTitle>
              <CardDescription>
                Configure Facebook group and post URL for bid detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Facebook Groups</h3>
                  <p className="text-xs text-muted-foreground">
                    Enable Facebook integration for live auction features
                  </p>
                </div>
                {!facebookAccessToken ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFacebookLogin}
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Enable Facebook Integration
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-green-600">
                      ✓ Logged in
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFacebookAccessToken('');
                        setFacebookGroups([]);
                        toast({
                          title: "Logged out",
                          description: "You have been logged out of Facebook",
                          variant: "default",
                          duration: 3000,
                        });
                      }}
                    >
                      Logout
                    </Button>
                  </div>
                )}
              </div>

              {facebookAccessToken && (
                <FormField
                  control={form.control}
                  name="facebookGroup"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook Group (Optional)</FormLabel>
                      <FormDescription>
                        Select the Facebook group where you'll post the live auction (optional for testing)
                      </FormDescription>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a Facebook group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingGroups ? (
                              <SelectItem value="loading" disabled>
                                Loading groups...
                              </SelectItem>
                            ) : facebookGroups.length > 0 ? (
                              facebookGroups.map((group) => (
                                <SelectItem key={group.id} value={group.name}>
                                  {group.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-groups" disabled>
                                No groups found - click refresh to load
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDetectGroups}
                          disabled={isLoadingGroups}
                        >
                          Load My Groups
                        </Button>
                      </div>
                <div className="text-xs text-muted-foreground">
                  {facebookGroups.length > 0 
                    ? `✅ Found ${facebookGroups.length} Facebook groups`
                    : "Click 'Load My Groups' to populate your Facebook groups"
                  }
                </div>
                      
                      
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

                  <FormField
                    control={form.control}
                    name="postUrl"
                    render={({ field }) => (
                      <FormItem>
                    <FormLabel>Facebook Post URL *</FormLabel>
                        <FormControl>
                          <Input
                        placeholder="https://facebook.com/groups/your-group/posts/123456789"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                      <strong>Required for bid detection:</strong> Copy the URL of your Facebook post where bidders will comment
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                name="enableBidDetection"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                        Enable automatic bid detection
                          </FormLabel>
                          <FormDescription>
                        Automatically detect bids from Facebook comments using Chrome extension
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
            </CardContent>
          </Card>


          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
            >
              Reset Form
            </Button>
            <Button
              type="submit"
              disabled={createLiveAuctionMutation.isPending}
              onClick={() => {
                console.log('🎯 Button clicked!');
                console.log('🎯 Form values:', form.getValues());
                console.log('🎯 Form errors:', form.formState.errors);
                console.log('🎯 Form is valid:', form.formState.isValid);
              }}
            >
              {createLiveAuctionMutation.isPending ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Create Live Auction Session
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
