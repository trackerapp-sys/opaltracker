# Opal Auction Tracker Chrome Extension

## Overview
This Chrome extension automatically detects bids in Facebook opal auction groups and syncs them with your Opal Auction Tracker app. Since Facebook removed the Groups API in April 2024, this browser-based solution is the only way to get real-time bid updates.

## Features
- ✅ **Automatic bid detection** on Facebook auction posts
- ✅ **Real-time sync** with your auction tracker app
- ✅ **Visual notifications** when new bids are found
- ✅ **Floating control panel** to start/stop monitoring
- ✅ **Professional popup interface** with statistics
- ✅ **Secure browser-based** operation (no server scraping)

## Installation Instructions

### Step 1: Download Extension Files
1. Download all files from the `chrome-extension` folder
2. Create a new folder on your computer called `opal-tracker-extension`
3. Copy all the downloaded files into this folder

### Step 2: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select your `opal-tracker-extension` folder
5. The extension should now appear in your extensions list

### Step 3: Configure Extension
1. Click the extension icon in your Chrome toolbar
2. Set your Auction Tracker URL (default: `http://localhost:5000`)
3. Click "Start Monitoring" when you're on a Facebook auction post

## How to Use

### For Individual Auctions:
1. Create an auction in your tracker app first
2. Navigate to the Facebook post in Chrome
3. Click the extension icon and start monitoring
4. The extension will automatically detect bids and update your tracker

### For Live Auction Dealers:
1. Use the bulk import feature in your tracker app
2. Navigate to Facebook group where you'll post auctions
3. Start monitoring with the extension
4. Post your auctions and the extension will track all bids automatically

## How It Works

### Bid Detection Patterns
The extension scans Facebook comments for common bid patterns:
- `$200`, `$85` (dollar amounts)
- `200 dollars`, `85 bucks` (text with currency)
- `bid 200`, `offer $85` (explicit bid keywords)
- `200 for me` (common auction phrases)
- `I'll go 150`, `pay $120` (natural language bids)

### Security & Privacy
- ✅ **No data leaves your browser** except to your own tracker app
- ✅ **No external servers** involved in bid detection
- ✅ **Local processing** of all Facebook content
- ✅ **Your Facebook login** remains secure and private

### Sync with Tracker App
- Automatically finds matching auctions by Facebook URL
- Updates current bid and bid count in real-time
- Shows visual notifications when bids are detected
- Keeps statistics of total bids found

## Troubleshooting

### Extension Not Working?
1. Make sure you're logged into Facebook
2. Verify the auction URL matches what's in your tracker
3. Check that monitoring is enabled (green status)
4. Ensure your tracker app is running

### No Bids Detected?
1. Check that comments are visible on the page
2. Try refreshing the Facebook page
3. Verify bid amounts are in the $10-$5000 range
4. Make sure comments contain recognizable bid patterns

### Connection Issues?
1. Verify your tracker URL in extension settings
2. Make sure your tracker app is running on the correct port
3. Check for any browser security warnings

## Commercial Use

This extension is perfect for:
- **Individual collectors** tracking personal auction bids
- **Live auction dealers** managing multiple simultaneous auctions
- **Commercial auction houses** needing automated bid tracking

### Pricing Integration
- Works seamlessly with auction tracker subscription tiers
- Individual users: $99-199/month
- Live dealers: $299-499/month  
- No additional cost for the extension itself

## Support

For technical support or feature requests:
1. Check your tracker app's support documentation
2. Verify all installation steps were followed correctly
3. Try disabling and re-enabling the extension
4. Restart Chrome if needed

## Legal Compliance

This extension:
- ✅ Operates within Facebook's Terms of Service
- ✅ Does not automate posting or interactions
- ✅ Only reads publicly visible content
- ✅ Respects user privacy and data protection

---

**Note**: This extension requires your Opal Auction Tracker app to be running. Make sure your tracker is set up and configured before using the extension.