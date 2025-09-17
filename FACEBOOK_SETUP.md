# Facebook Direct Posting Setup Guide

## Quick Setup for Facebook Direct Posting

To enable Facebook direct posting in your OpalTracker app, you need to create a Facebook App and get your App ID.

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"Create App"** → **"Business"**
3. Fill in the app details:
   - **App Name**: "OpalTracker" (or your preferred name)
   - **App Contact Email**: Your email address
   - **Business Account**: Select your business account (or create one)
4. Click **"Create App"**

### Step 2: Get Your App ID

1. In your Facebook App dashboard, you'll see your **App ID** (15-16 digits)
2. Copy this App ID

### Step 3: Configure OpalTracker

1. Open `client/index.html`
2. Find this line:
   ```javascript
   appId: 'YOUR_FACEBOOK_APP_ID', // Replace with your actual Facebook App ID
   ```
3. Replace `'YOUR_FACEBOOK_APP_ID'` with your actual App ID:
   ```javascript
   appId: '123456789012345', // Your actual Facebook App ID
   ```

### Step 4: Configure App Settings

In your Facebook App dashboard:

1. **Add Facebook Login Product**:
   - Go to "Products" → "Facebook Login" → "Set Up"
   - Choose "Web" platform
   - Add your domain: `http://localhost:3000` (for development)

2. **Configure Valid OAuth Redirect URIs**:
   - Go to "Facebook Login" → "Settings"
   - Add: `http://localhost:3000` (for development)
   - Add your production domain when ready

3. **App Review (Optional for Development)**:
   - For development, you can use the app with your own Facebook account
   - For production, you'll need to submit for review to get `publish_to_groups` permission

### Step 5: Test the Integration

1. Restart your development server
2. Go to "Add Auction" page
3. Click "Generate Facebook Post"
4. Click "Login to Facebook"
5. Grant permissions when prompted
6. Try posting to Facebook

## Development vs Production

### Development Mode
- Works with your personal Facebook account
- Limited to your own groups and timeline
- No app review required

### Production Mode
- Requires Facebook App Review for `publish_to_groups` permission
- Can post to any group where user has permission
- More robust error handling needed

## Troubleshooting

### "Invalid App ID" Error
- Make sure you're using the correct App ID from Facebook Developers
- App ID should be 15-16 digits long
- Remove any extra spaces or characters

### "App Not Setup" Error
- Make sure you've added "Facebook Login" product to your app
- Check that your domain is added to "Valid OAuth Redirect URIs"

### Permission Errors
- For development, you can only post to your own timeline and groups you manage
- For production, you need Facebook App Review for group posting permissions

## Security Notes

- Never commit your real Facebook App ID to public repositories
- Use environment variables for production
- Keep your App Secret secure (server-side only)

## Example App ID Format

A valid Facebook App ID looks like: `123456789012345` (15 digits)

Replace the placeholder in `client/index.html` with your actual App ID.


