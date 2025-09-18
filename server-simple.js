import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:4173'],
  credentials: true
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Basic API endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Opal Tracker is running!' });
});

// Serve the React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Opal Tracker server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
});
