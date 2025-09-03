# 🔥 Opal Auction Tracker - Chrome Extension

Automatically detect and track your opal auctions on Facebook with real-time bid monitoring!

## ✨ Features

- **Auto-Detection**: Automatically finds your opal auction posts on Facebook
- **One-Click Tracking**: Add auctions to your tracker with a single button click
- **Real-Time Monitoring**: Live bid detection as comments come in
- **Smart Parsing**: Extracts opal type, weight, starting bid, and other details
- **Browser Notifications**: Get notified of new bids instantly
- **Seamless Integration**: Works with your existing Replit auction tracker

## 🚀 Installation

### Step 1: Download the Extension
1. Download all files from the `browser-extension` folder
2. Create a new folder called `opal-auction-tracker-extension`
3. Place all the extension files in this folder

### Step 2: Create Icon Files
Create the following icon files in the `icons` folder:
- `icon16.png` (16x16 pixels)
- `icon32.png` (32x32 pixels) 
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Use a simple opal or flame emoji icon design.

### Step 3: Load in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your `opal-auction-tracker-extension` folder
5. The extension should now appear in your extensions list

### Step 4: Configure the Extension
1. Click the extension icon in your Chrome toolbar
2. Enter your Replit auction tracker URL (e.g., `https://your-app.replit.app`)
3. Enable auto-tracking and notifications as desired
4. Click "Save Settings"

## 🎯 How to Use

### Automatic Detection
1. Go to any Facebook group where you post auctions
2. Create an auction post mentioning opal type, weight, and starting bid
3. The extension will automatically detect it and show a "🔥 Track Auction" button

### Manual Tracking
1. Click the "🔥 Track Auction" button on any of your auction posts
2. The auction details will be automatically extracted and saved
3. Real-time bid monitoring will start immediately

### Monitor Your Auctions
1. Click the floating 🔥 button to see quick stats
2. Click "Open Tracker" to view your full auction dashboard
3. Get notifications when new bids come in

## 📱 Extension Features

### Smart Auction Detection
The extension looks for posts containing:
- Opal types: Crystal, Black, Boulder, White, Fire, Matrix
- Auction keywords: auction, bid, starting, reserve, ends
- Price patterns: $25, $25.50, 25 dollars

### Real-Time Bid Monitoring
- Monitors Facebook comments for bid patterns
- Detects: $25, $25.50, "bid 25", "offer $25.50"
- Filters out false positives and unrealistic amounts
- Updates your tracker database automatically

### Browser Notifications
- New bid alerts with auction details
- Auction tracking confirmations
- Connection status updates

## 🔧 Settings

### Tracker URL
Enter the URL of your Replit auction tracker app. This is where the extension will send auction data.

### Auto-Track
When enabled, automatically saves detected auctions without requiring button clicks.

### Notifications
Enable/disable browser notifications for new bids and tracking events.

## 🎨 UI Elements

### Track Button
A blue "🔥 Track Auction" button appears on detected auction posts.

### Floating Action Button
A floating 🔥 button in the bottom-right shows quick stats and access to your tracker.

### Popup Interface
Click the extension icon to access settings, view stats, and open your tracker.

## 🔗 API Integration

The extension integrates with your auction tracker's existing API:
- `POST /api/auctions` - Create new auctions
- `PUT /api/auctions/:id` - Update auction bids
- `GET /api/analytics` - Get auction statistics

## 🛠 Development

### File Structure
```
browser-extension/
├── manifest.json         # Extension configuration
├── content.js            # Facebook page interaction
├── background.js         # Background service worker
├── popup.html           # Settings popup interface
├── popup.js             # Popup functionality
├── styles.css           # Extension styling
└── icons/               # Extension icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Key Classes
- `OpalAuctionDetector` - Main content script class
- Auto-detection and post monitoring
- Bid extraction and tracking
- UI element management

## 🚨 Troubleshooting

### Extension Not Working
1. Check that you're on a Facebook page
2. Verify your tracker URL is correct
3. Make sure the extension has permissions

### Auctions Not Detected
1. Ensure your posts mention opal types and prices
2. Check that auction keywords are present
3. Try clicking the manual track button

### Bids Not Updating
1. Verify your tracker URL is accessible
2. Check browser console for errors
3. Test connection in extension popup

## 🔄 Updates

To update the extension:
1. Download new version files
2. Replace files in your extension folder
3. Go to `chrome://extensions/`
4. Click the refresh button on your extension

## 📞 Support

If you need help:
1. Check browser console for error messages
2. Verify your tracker app is running
3. Test API endpoints manually
4. Check extension permissions in Chrome

---

Transform your Facebook auction workflow with automatic tracking and real-time monitoring! 🚀