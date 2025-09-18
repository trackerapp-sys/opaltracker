import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

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

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Opal Tracker server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
