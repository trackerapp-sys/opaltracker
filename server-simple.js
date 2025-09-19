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
