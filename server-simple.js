import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Force redeployment timestamp
console.log('🔄 Server restarted at:', new Date().toISOString());

// Simple in-memory storage for fallback endpoints
const fallbackStorage = {
  settings: {
    timezone: 'Australia/Sydney',
    dateFormat: 'DD/MM/YYYY HH:MM',
    currency: 'AUD',
    notifications: true,
    refreshRate: 5,
    bidMonitoringEnabled: true,
    bidCheckInterval: 3,
    opalTypes: [
      "Black Opal", "Crystal Opal", "Boulder Opal", "White Opal",
      "Fire Opal", "Matrix Opal", "Rough Opal", "Doublet Opal",
      "Triplet Opal", "Synthetic Opal", "Ethiopian Opal", "Mexican Opal",
      "Peruvian Opal", "Other"
    ]
  },
  paymentMethods: [
    { id: 'pm_1', name: 'Bank Transfer', description: 'Direct bank transfer' },
    { id: 'pm_2', name: 'PayPal', description: 'PayPal payment' },
    { id: 'pm_3', name: 'Credit Card', description: 'Credit card payment' },
    { id: 'pm_4', name: 'Cash on Delivery', description: 'Pay when item is delivered' }
  ],
  auctions: [],
  liveAuctions: []
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true
}));

// Debug: List files in the app directory
console.log('📁 Files in /app:', fs.readdirSync('/app'));
console.log('📁 Files in /app/dist:', fs.existsSync('/app/dist') ? fs.readdirSync('/app/dist') : 'dist directory does not exist');

// Serve static files from dist/public (Vite build output)
app.use(express.static(path.join(__dirname, 'dist', 'public')));

// Basic API endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Opal Tracker is running!' });
});

// Monitor endpoints - always available
app.get('/api/monitor/status', (req, res) => {
  res.json({
    running: false,
    nextCheck: new Date(Date.now() + 60000).toISOString(),
    message: "Monitor status - extension handles bid detection"
  });
});

app.post('/api/monitor/start', (req, res) => {
  res.json({
    message: "Monitor started - extension handles bid detection",
    status: { running: true, nextCheck: new Date(Date.now() + 60000).toISOString() }
  });
});

app.post('/api/monitor/stop', (req, res) => {
  res.json({
    message: "Monitor stopped - extension handles bid detection",
    status: { running: false, nextCheck: null }
  });
});

app.post('/api/monitor/check', (req, res) => {
  res.json({
    message: "Manual check completed - extension handles bid detection",
    updates: []
  });
});

// Bid updates endpoint for Chrome extension
app.post('/api/bid-updates', (req, res) => {
  console.log('🎯 Bid update received from Chrome extension:', req.body);
  console.log('🎯 Current auctions in storage:', fallbackStorage.auctions.length);
  
  // Process the bid update
  const { auctionId, currentBid, bidderName, timestamp } = req.body;
  
  if (!auctionId || !currentBid) {
    return res.status(400).json({ 
      error: 'Missing required fields: auctionId and currentBid are required' 
    });
  }
  
  // First try to find in individual auctions
  const auctionIndex = fallbackStorage.auctions.findIndex(a => a.id === auctionId);
  if (auctionIndex !== -1) {
    const auction = fallbackStorage.auctions[auctionIndex];
    const newBidAmount = parseFloat(currentBid);
    const currentBidAmount = parseFloat(auction.currentBid || auction.startingBid || '0');
    const bidIncrement = parseFloat(auction.bidIncrements || '1');
    
    // Check if bid meets minimum increment
    const minimumBid = currentBidAmount + bidIncrement;
    if (newBidAmount < minimumBid) {
      console.log(`❌ Bid rejected: $${newBidAmount} by ${bidderName} - below minimum increment of $${bidIncrement}`);
      return res.status(400).json({
        error: 'Bid rejected - below minimum increment',
        details: {
          currentBid: currentBidAmount,
          newBid: newBidAmount,
          minimumRequired: minimumBid,
          bidIncrement: bidIncrement,
          bidder: bidderName
        }
      });
    }
    
    // Update auction with new bid
    fallbackStorage.auctions[auctionIndex].currentBid = currentBid;
    fallbackStorage.auctions[auctionIndex].currentBidder = bidderName || 'Unknown';
    fallbackStorage.auctions[auctionIndex].updatedAt = new Date().toISOString();
    
    console.log('✅ Individual auction updated:', fallbackStorage.auctions[auctionIndex]);
    
    res.json({
      success: true,
      message: 'Bid update processed successfully',
      auction: fallbackStorage.auctions[auctionIndex]
    });
  } else {
    // Try to find in live auction items
    console.log('🔍 Checking live auction items for auctionId:', auctionId);
    
    // Look through all live auctions and their items
    let foundItem = null;
    let foundLiveAuction = null;
    let foundItemIndex = -1;
    let foundLiveAuctionIndex = -1;
    
    for (let i = 0; i < fallbackStorage.liveAuctions.length; i++) {
      const liveAuction = fallbackStorage.liveAuctions[i];
      if (liveAuction.items) {
        for (let j = 0; j < liveAuction.items.length; j++) {
          if (liveAuction.items[j].id === auctionId) {
            foundItem = liveAuction.items[j];
            foundLiveAuction = liveAuction;
            foundItemIndex = j;
            foundLiveAuctionIndex = i;
            break;
          }
        }
      }
      if (foundItem) break;
    }
    
    if (foundItem && foundLiveAuction) {
      const newBidAmount = parseFloat(currentBid);
      const currentBidAmount = parseFloat(foundItem.currentBid || foundItem.startingBid || '0');
      const bidIncrement = parseFloat(foundItem.bidIncrements || '1');
      
      // Check if bid meets minimum increment
      const minimumBid = currentBidAmount + bidIncrement;
      if (newBidAmount < minimumBid) {
        console.log(`❌ Live auction bid rejected: $${newBidAmount} by ${bidderName} - below minimum increment of $${bidIncrement}`);
        return res.status(400).json({
          error: 'Bid rejected - below minimum increment',
          details: {
            currentBid: currentBidAmount,
            newBid: newBidAmount,
            minimumRequired: minimumBid,
            bidIncrement: bidIncrement,
            bidder: bidderName
          }
        });
      }
      
      // Update live auction item with new bid
      fallbackStorage.liveAuctions[foundLiveAuctionIndex].items[foundItemIndex].currentBid = currentBid;
      fallbackStorage.liveAuctions[foundLiveAuctionIndex].items[foundItemIndex].currentBidder = bidderName || 'Unknown';
      fallbackStorage.liveAuctions[foundLiveAuctionIndex].items[foundItemIndex].updatedAt = new Date().toISOString();
      fallbackStorage.liveAuctions[foundLiveAuctionIndex].updatedAt = new Date().toISOString();
      
      console.log('✅ Live auction item updated:', fallbackStorage.liveAuctions[foundLiveAuctionIndex].items[foundItemIndex]);
      
      res.json({
        success: true,
        message: 'Live auction bid update processed successfully',
        auction: fallbackStorage.liveAuctions[foundLiveAuctionIndex].items[foundItemIndex]
      });
    } else {
      console.log('❌ Auction not found in individual auctions or live auction items:', auctionId);
      res.status(404).json({ 
        error: 'Auction not found',
        auctionId: auctionId
      });
    }
  }
});

// Using fallback API endpoints only - no TypeScript routes import needed
console.log('✅ Using fallback API endpoints');

// Fallback: Add basic settings endpoint
app.get('/api/settings', (req, res) => {
  res.json(fallbackStorage.settings);
});

app.post('/api/settings', (req, res) => {
  // Update settings with new data
  fallbackStorage.settings = { ...fallbackStorage.settings, ...req.body };
  res.json(fallbackStorage.settings);
});

// Fallback: Add payment methods endpoints
app.get('/api/settings/payment-methods', (req, res) => {
  res.json(fallbackStorage.paymentMethods);
});

app.post('/api/settings/payment-methods', (req, res) => {
  const newPaymentMethod = {
    id: 'pm_' + Date.now(),
    name: req.body.name || 'New Payment Method',
    description: req.body.description || ''
  };
  fallbackStorage.paymentMethods.push(newPaymentMethod);
  res.status(201).json(newPaymentMethod);
});

app.put('/api/settings/payment-methods/:id', (req, res) => {
  const index = fallbackStorage.paymentMethods.findIndex(pm => pm.id === req.params.id);
  if (index !== -1) {
    fallbackStorage.paymentMethods[index] = {
      id: req.params.id,
      name: req.body.name || 'Updated Payment Method',
      description: req.body.description || ''
    };
    res.json(fallbackStorage.paymentMethods[index]);
  } else {
    res.status(404).json({ message: 'Payment method not found' });
  }
});

app.delete('/api/settings/payment-methods/:id', (req, res) => {
  const index = fallbackStorage.paymentMethods.findIndex(pm => pm.id === req.params.id);
  if (index !== -1) {
    fallbackStorage.paymentMethods.splice(index, 1);
    res.status(204).send();
  } else {
    res.status(404).json({ message: 'Payment method not found' });
  }
});

// Fallback: Add opal types endpoints
app.get('/api/settings/opal-types', (req, res) => {
  res.json({
    opalTypes: fallbackStorage.settings.opalTypes
  });
});

app.post('/api/settings/opal-types', (req, res) => {
  if (req.body.opalTypes && Array.isArray(req.body.opalTypes)) {
    fallbackStorage.settings.opalTypes = req.body.opalTypes;
  }
  res.json({ opalTypes: fallbackStorage.settings.opalTypes });
});

// Fallback: Add basic auction endpoints
app.get('/api/auctions', (req, res) => {
  console.log('📋 Fetching auctions, count:', fallbackStorage.auctions.length);
  if (fallbackStorage.auctions.length > 0) {
    console.log('📋 First auction reserve price:', fallbackStorage.auctions[0].reservePrice);
  }
  res.json({ auctions: fallbackStorage.auctions, total: fallbackStorage.auctions.length });
});

app.post('/api/auctions', (req, res) => {
  console.log('🎯 Creating new auction with data:', req.body);
  console.log('🎯 Reserve price received:', req.body.reservePrice);
  console.log('🎯 Starting bid received:', req.body.startingBid);
  
  const newAuction = {
    id: 'AU' + String(Date.now()).slice(-4),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  console.log('🎯 New auction created:', newAuction);
  console.log('🎯 Reserve price in created auction:', newAuction.reservePrice);
  fallbackStorage.auctions.push(newAuction);
  res.status(201).json(newAuction);
});

app.get('/api/live-auctions', (req, res) => {
  res.json({ liveAuctions: fallbackStorage.liveAuctions });
});

app.post('/api/live-auctions', (req, res) => {
  const newLiveAuction = {
    id: 'LA' + String(Date.now()).slice(-4),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  fallbackStorage.liveAuctions.push(newLiveAuction);
  res.status(201).json(newLiveAuction);
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Opal Tracker server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
