# 🔥 Chrome Extension Setup - Quick Start

## Step 1: Download Extension Files
1. Download all files from the `browser-extension` folder to your computer
2. Create a new folder called `opal-auction-tracker-extension` 
3. Put all the extension files in this folder

## Step 2: Create Icon Files (Quick)
Create these 4 simple icon files in the `icons` folder:
- **icon16.png** (16x16 pixels)  
- **icon32.png** (32x32 pixels)
- **icon48.png** (48x48 pixels) 
- **icon128.png** (128x128 pixels)

**Quick tip:** Use any simple 🔥 fire emoji or opal image, or just create solid colored squares for testing.

## Step 3: Install in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select your `opal-auction-tracker-extension` folder
5. The extension should appear in your extensions list!

## Step 4: Configure Extension
1. Click the extension icon in Chrome toolbar (🔥)
2. Enter your tracker URL: `https://6890239f-4e7c-48b1-ae06-0f1b134d2f42-00-2z7sf66begnj7.janeway.replit.dev`
3. Check **"Automatically track detected auctions"**
4. Check **"Enable bid notifications"**
5. Click **"Save Settings"**

## Step 5: Test on Facebook
1. Go to your Facebook post: `https://www.facebook.com/share/v/1FB2RSFMXy/`
2. You should see the extension working in the browser console (F12)
3. Look for the "🔥 Track Auction" button on your auction post
4. The extension will detect your "25" comment automatically!

## ✅ How to Tell It's Working
- Browser notifications when new bids are detected
- Console logs showing "🔥 Opal Auction Tracker Extension Loaded"
- "Track Auction" button appears on your auction posts
- Bids automatically update in your auction tracker

## 🔧 Troubleshooting
- **No button appears**: Refresh Facebook page, check console for errors
- **Bids not detecting**: Make sure you're logged into Facebook
- **Extension not loading**: Check Chrome extensions page for errors

## 🎯 Testing Your "25" Comment
Once installed, the extension will:
1. ✅ See your "25" comment (because it runs in your logged-in browser)
2. ✅ Recognize it as a bid (amount higher than $20 starting bid)
3. ✅ Send update to your auction tracker automatically
4. ✅ Show browser notification about the new bid

**This will work where the automated server couldn't** because the extension has access to your real Facebook session!