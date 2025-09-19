import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

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

// Import and register all API routes
try {
  const { registerRoutes } = await import('./server/routes.js');
  const server = await registerRoutes(app);
  console.log('✅ API routes registered successfully');
} catch (error) {
  console.error('❌ Failed to register API routes:', error);
  
  // Fallback: Add basic settings endpoint
  app.get('/api/settings', (req, res) => {
    res.json({
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
    });
  });
  
  app.post('/api/settings', (req, res) => {
    res.json(req.body);
  });

  // Fallback: Add payment methods endpoints
  app.get('/api/settings/payment-methods', (req, res) => {
    res.json([
      { id: 'pm_1', name: 'Bank Transfer', description: 'Direct bank transfer' },
      { id: 'pm_2', name: 'PayPal', description: 'PayPal payment' },
      { id: 'pm_3', name: 'Credit Card', description: 'Credit card payment' },
      { id: 'pm_4', name: 'Cash on Delivery', description: 'Pay when item is delivered' }
    ]);
  });

  app.post('/api/settings/payment-methods', (req, res) => {
    const newPaymentMethod = {
      id: 'pm_' + Date.now(),
      name: req.body.name || 'New Payment Method',
      description: req.body.description || ''
    };
    res.status(201).json(newPaymentMethod);
  });

  app.put('/api/settings/payment-methods/:id', (req, res) => {
    const updatedPaymentMethod = {
      id: req.params.id,
      name: req.body.name || 'Updated Payment Method',
      description: req.body.description || ''
    };
    res.json(updatedPaymentMethod);
  });

  app.delete('/api/settings/payment-methods/:id', (req, res) => {
    res.status(204).send();
  });

  // Fallback: Add opal types endpoints
  app.get('/api/settings/opal-types', (req, res) => {
    res.json({
      opalTypes: [
        "Black Opal", "Crystal Opal", "Boulder Opal", "White Opal",
        "Fire Opal", "Matrix Opal", "Rough Opal", "Doublet Opal",
        "Triplet Opal", "Synthetic Opal", "Ethiopian Opal", "Mexican Opal",
        "Peruvian Opal", "Other"
      ]
    });
  });

  app.post('/api/settings/opal-types', (req, res) => {
    res.json({ opalTypes: req.body.opalTypes || [] });
  });

  // Fallback: Add basic auction endpoints
  app.get('/api/auctions', (req, res) => {
    res.json({ auctions: [], total: 0 });
  });

  app.post('/api/auctions', (req, res) => {
    const newAuction = {
      id: 'AU' + String(Date.now()).slice(-4),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    res.status(201).json(newAuction);
  });

  app.get('/api/live-auctions', (req, res) => {
    res.json({ liveAuctions: [] });
  });

  app.post('/api/live-auctions', (req, res) => {
    const newLiveAuction = {
      id: 'LA' + String(Date.now()).slice(-4),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    res.status(201).json(newLiveAuction);
  });
  
  console.log('⚠️ Using fallback API endpoints');
}

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Opal Tracker server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
