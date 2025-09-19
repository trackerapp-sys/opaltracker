import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, BookOpen, MessageCircle, Bug, Lightbulb, Users, Settings, Play, Clock, Plus, Eye, BarChart3 } from "lucide-react";

export default function Help() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Help & Support</h1>
        <p className="text-muted-foreground">
          Complete guide to using the Opal Tracker application
        </p>
      </div>

      <div className="space-y-6">
        {/* Individual Auctions Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Individual Auctions - Complete Process
            </CardTitle>
            <CardDescription>
              Step-by-step guide for creating and managing individual opal auctions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Badge className="bg-blue-500/10 text-blue-600 mt-1">1</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Create Auction Entry</h3>
                  <p className="text-sm text-muted-foreground">
                    Go to "Add Auction" and fill in the opal details: type, weight (carats), description, origin, shape, and reserve price.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-blue-500/10 text-blue-600 mt-1">2</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Set Auction Timing</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure start date/time and duration. The end time is automatically calculated. Add bid increments, shipping costs, location, and payment methods.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-blue-500/10 text-blue-600 mt-1">3</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Generate Facebook Post</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the Facebook Post Generator to create a formatted post with all auction details. Copy and paste to your Facebook group.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-blue-500/10 text-blue-600 mt-1">4</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Add Facebook Post URL</h3>
                  <p className="text-sm text-muted-foreground">
                    After posting to Facebook, copy the post URL and add it to your auction entry for bid monitoring.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-blue-500/10 text-blue-600 mt-1">5</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Monitor Bids</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable bid monitoring to automatically track new bids from Facebook comments. The system checks every 1 minute for updates.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-blue-500/10 text-blue-600 mt-1">6</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Track Results</h3>
                  <p className="text-sm text-muted-foreground">
                    View your auction in the "Auctions" list to see current bids, bidder names, and auction status. Export data for record keeping.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Auctions Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Live Auctions - Complete Process
            </CardTitle>
            <CardDescription>
              Step-by-step guide for creating and managing live auction sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Badge className="bg-green-500/10 text-green-600 mt-1">1</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Create Live Session</h3>
                  <p className="text-sm text-muted-foreground">
                    Go to "Live Auction Session" and set up your session details: title, description, Facebook group, start time, and duration.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-green-500/10 text-green-600 mt-1">2</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Add Auction Items</h3>
                  <p className="text-sm text-muted-foreground">
                    Use "Live Auction Item Manager" to add multiple opal items with individual details: type, weight, description, reserve price, and bidding duration.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-green-500/10 text-green-600 mt-1">3</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Organise Item Order</h3>
                  <p className="text-sm text-muted-foreground">
                    Arrange items in the order you want them to appear in your live auction. Use the up/down arrows to reorder items.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-green-500/10 text-green-600 mt-1">4</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Start Live Session</h3>
                  <p className="text-sm text-muted-foreground">
                    Use "Live Auction Control" to begin your live session. The system will automatically progress through items based on your timers.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-green-500/10 text-green-600 mt-1">5</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Manage Live Auction</h3>
                  <p className="text-sm text-muted-foreground">
                    Control the auction flow: pause/resume items, manually advance to next item, track current bids, and monitor bidder activity.
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge className="bg-green-500/10 text-green-600 mt-1">6</Badge>
                <div>
                  <h3 className="font-semibold text-foreground">Track Results</h3>
                  <p className="text-sm text-muted-foreground">
                    View individual item results, winning bids, and bidder information. Export session data for complete record keeping.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              Key Features
            </CardTitle>
            <CardDescription>
              Explore the main features of Opal Tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-foreground">Facebook Integration</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Connect to Facebook groups and post auctions directly from the app with formatted templates.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Play className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-foreground">Live Auctions</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Manage multi-item live auctions with automatic progression, timers, and real-time control.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-foreground">Real-time Monitoring</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Track bid updates every 1 minute from Facebook group comments with automatic bidder detection.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-foreground">Bulk Operations</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Import multiple auctions from Excel files and perform bulk updates across all auctions.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-red-600" />
                  <span className="font-medium text-foreground">Analytics & Export</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  View detailed analytics, track performance, and export data in CSV format for record keeping.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  <span className="font-medium text-foreground">Smart Timing</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatic end time calculation, duration management, and intelligent bid monitoring intervals.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Common questions and answers about using Opal Tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="individual-vs-live">
                <AccordionTrigger>What's the difference between Individual and Live Auctions?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    <strong>Individual Auctions:</strong> Single opal items posted separately to Facebook groups with individual monitoring.<br/>
                    <strong>Live Auctions:</strong> Multiple items managed in sequence during a live session with automatic Facebook bid detection and progression timers.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="facebook-integration">
                <AccordionTrigger>How does Facebook integration work?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    The app generates formatted Facebook posts with all auction details. You copy and paste these to your Facebook groups. 
                    Then add the post URL back to the app for automatic bid monitoring from comments.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="bid-monitoring">
                <AccordionTrigger>How does bid monitoring work?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    The system checks Facebook post comments every 1 minute for new bids. It automatically detects bid amounts and bidder names, 
                    updating your auction records in real-time. Make sure to provide the correct Facebook post URL.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="live-auction-control">
                <AccordionTrigger>How do I control a live auction session?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    <strong>Live Auctions work like Individual Auctions but for multiple items:</strong><br/>
                    • Create a live auction session with Facebook group and post URL<br/>
                    • Add multiple items to the session<br/>
                    • Post the live auction to Facebook<br/>
                    • Chrome extension automatically detects bids from comments<br/>
                    • Use Live Auction Control to manage item progression and timing<br/>
                    • Each item has its own timer and bidding duration
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="bulk-import">
                <AccordionTrigger>Can I import auctions from Excel?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Yes! Use the "Bulk Import" feature to upload Excel files with auction data. 
                    Required columns include: opal type, weight, starting bid, Facebook group, and end time.
                  </p>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="data-export">
                <AccordionTrigger>Can I export my auction data?</AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    Yes! Use the "Export Data" feature to download your auction data in CSV format. 
                    You can filter by date range, status, or other criteria for comprehensive record keeping.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Troubleshooting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Troubleshooting
            </CardTitle>
            <CardDescription>
              Common issues and how to resolve them
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Bid Monitoring Not Working</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Verify the Facebook post URL is correct and accessible</li>
                  <li>• Make sure the post is public and comments are enabled</li>
                  <li>• Check that the monitoring service is running (every 1 minute)</li>
                  <li>• Ensure the post URL format is correct (facebook.com/groups/...)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Live Auction Session Issues</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use the "Save Session" button to manually save your progress</li>
                  <li>• Check that all required fields are filled for each item</li>
                  <li>• Ensure your internet connection is stable during live sessions</li>
                  <li>• Verify item order and timing settings before starting</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-foreground mb-2">Facebook Post Generation</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Make sure all auction details are complete before generating posts</li>
                  <li>• Check that opal type and weight are properly filled</li>
                  <li>• Verify reserve price and other financial details</li>
                  <li>• Ensure Facebook group name is correctly entered</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Need More Help?
            </CardTitle>
            <CardDescription>
              Contact support or get additional assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                If you're still having issues or need additional help, please:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Check the troubleshooting section above</li>
                <li>• Review the FAQ for common solutions</li>
                <li>• Contact support with specific error messages</li>
                <li>• Include screenshots of any issues you're experiencing</li>
                <li>• Provide details about your auction setup and Facebook group</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}