# Opal Auction Tracker - Windows Setup Guide

## Quick Start (Windows)

### Option 1: Use the Batch Files (Recommended)
1. **For Development**: Double-click `start-dev.bat`
2. **For Production**: Double-click `start-server.bat`

### Option 2: Use PowerShell Commands

#### Development Mode
```powershell
npm run dev:win
```

#### Production Mode
```powershell
npm run build
npm run start:win
```

#### Using Cross-Env (if installed)
```powershell
npm run dev
npm run start
```

## Troubleshooting

### "NODE_ENV is not recognized" Error
This happens because Windows PowerShell doesn't recognize the Unix-style `NODE_ENV=production` syntax. Use one of these solutions:

1. **Use the batch files** (easiest)
2. **Use the Windows-specific npm scripts**: `npm run dev:win` or `npm run start:win`
3. **Install cross-env**: `npm install -g cross-env` then use `npm run dev`

### "Cannot find module" Error
Make sure to build the project first:
```powershell
npm run build
```

### Server Won't Start
1. Check if port 5000 is available
2. Make sure all dependencies are installed: `npm install`
3. Check the console for specific error messages

## Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome-extension` folder
4. The extension should now be active on Facebook pages

## API Endpoints

- **Development**: http://localhost:5000
- **Production**: http://localhost:5000

## Common Commands

```powershell
# Install dependencies
npm install

# Build for production
npm run build

# Start development server
npm run dev:win

# Start production server
npm run start:win

# Check TypeScript
npm run check

# Database operations
npm run db:push
```

## File Structure

```
OpalTracker/
├── client/          # React frontend
├── server/          # Express backend
├── chrome-extension/ # Chrome extension
├── shared/          # Shared types
├── start-dev.bat    # Windows dev startup
├── start-server.bat # Windows prod startup
└── package.json     # Dependencies and scripts
```

