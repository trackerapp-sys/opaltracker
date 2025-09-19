# 🔧 Chrome Extension Installation Guide

## Step-by-Step Installation

### 1. Open Chrome Extensions Page
- Open Chrome browser
- Go to `chrome://extensions/`
- Or click the three dots menu → More tools → Extensions

### 2. Enable Developer Mode
- Look for "Developer mode" toggle in the top-right corner
- **Turn it ON** (toggle should be blue/enabled)

### 3. Load the Extension
- Click "Load unpacked" button
- Navigate to: `C:\Users\Tory\Downloads\OpalTracker\OpalTracker\chrome-extension`
- **Select the folder** (not individual files)
- Click "Select Folder"

### 4. Verify Installation
- You should see "Opal Auction Tracker" in your extensions list
- The extension should show as "Enabled"
- You should see a 💎 icon in your Chrome toolbar

### 5. Test the Extension
- Click the 💎 icon in your toolbar
- You should see the extension popup
- Go to `facebook.com/groups`
- Open the test page: `file:///C:/Users/Tory/Downloads/OpalTracker/OpalTracker/chrome-extension/test-extension.html`

## Troubleshooting

### If "Load unpacked" is grayed out:
- Make sure Developer mode is enabled
- Refresh the extensions page

### If extension doesn't appear:
- Check that you selected the correct folder
- Make sure all files are present in the chrome-extension folder
- Try refreshing the extensions page

### If extension shows errors:
- Click "Details" on the extension
- Check for any error messages
- Try removing and reinstalling the extension

### If test page still shows "Chrome extension API not available":
- Make sure the extension is enabled
- Try refreshing the test page
- Check Chrome console for any errors (F12)

## Files Required
Make sure these files exist in the chrome-extension folder:
- ✅ manifest.json
- ✅ content.js
- ✅ popup.html
- ✅ popup.js
- ✅ background.js
- ✅ icons/ folder with icon files

## Testing Steps
1. Install extension following steps above
2. Go to `facebook.com/groups`
3. Open test page in new tab
4. Click "Refresh Status" - should show ✅
5. Click "Detect Groups" - should detect your groups
6. Test on your deployed app at `https://opaltracker.onrender.com`
