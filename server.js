import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRoutes from './routes/images.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logger middleware - Shows all requests
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: '🎨 Artist Portfolio API',
    status: '✅ Running',
    endpoints: {
      health: 'GET /api/health',
      images: 'GET /api/images',
      'upload-file': 'POST /api/images',
      'upload-url': 'POST /api/images/url (requires secret)',
      'images-test': 'GET /api/images/test'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 🖼️ Image routes
app.use('/api/images', imageRoutes);

// 404 handler - Must be LAST
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🖼️  Images API: http://localhost:${PORT}/api/images`);
  console.log(`🧪 Test route: http://localhost:${PORT}/api/images/test`);
  console.log(`🔒 URL Upload: POST http://localhost:${PORT}/api/images/url (requires secret)\n`);
});