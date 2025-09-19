# Facebook App Setup Guide

To enable REAL Facebook group detection, you need to create a Facebook App:

## Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App"
3. Choose "Consumer" or "Other" as app type
4. Fill in:
   - App Name: "Opal Tracker" (or any name you prefer)
   - App Contact Email: Your email
   - App Purpose: "Other"

## Step 2: Get App ID

1. After creating the app, go to "Settings" > "Basic"
2. Copy your "App ID" (it looks like: 1234567890123456)

## Step 3: Update the App

1. Open `client/index.html`
2. Replace `YOUR_FACEBOOK_APP_ID` with your actual App ID:

```javascript
FB.init({
  appId: '1234567890123456', // Replace with your actual App ID
  cookie: true,
  xfbml: true,
  version: 'v18.0'
});
```

## Step 4: Add App Domains

1. In Facebook App settings, go to "Settings" > "Basic"
2. Add your domains:
   - For local development: `localhost`
   - For production: your domain (e.g., `opaltracker.onrender.com`)

## Step 5: Configure Permissions

1. Go to "App Review" > "Permissions and Features"
2. Request these permissions:
   - `email` (usually auto-approved)
   - `public_profile` (usually auto-approved)
   - `user_groups` (may require review)

## Step 6: Test the Integration

1. Save your changes
2. Refresh the app
3. Click "Enable Facebook Integration"
4. Login to Facebook
5. Your groups should load automatically!

## Troubleshooting

- **"Invalid App ID"**: Make sure you copied the correct App ID
- **"Domain not allowed"**: Add your domain to App Domains in Facebook settings
- **"Permission denied"**: Some permissions may require Facebook review
- **No groups shown**: Facebook restricts group access for some apps

## Alternative: Use Test App

For testing, you can create a "Test App" which has fewer restrictions:
1. In your main app, go to "Settings" > "Advanced"
2. Click "Create Test App"
3. Use the Test App ID instead
