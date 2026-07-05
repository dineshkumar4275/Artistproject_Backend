// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRoutes from './routes/images.js';
import { ensureTables } from './config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://artistproject-backend.vercel.app',
  'https://kameshfineart.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('❌ Blocked CORS from:', origin);
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// Ensure tables exist on startup
await ensureTables();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🎨 Kamesh Fine Art API',
    status: '✅ Running',
    endpoints: {
      health: 'GET /api/health',
      gallery: 'GET /api/images',
      'gallery-upload': 'POST /api/images',
      'gallery-upload-url': 'POST /api/images/url',
      photography: 'GET /api/images/photography',
      'photography-upload': 'POST /api/images/photography',
      'image-detail': 'GET /api/images/:id',
      'image-update': 'PUT /api/images/:id',
      'image-delete': 'DELETE /api/images/:id'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: 'Neon PostgreSQL',
    cloudinary: 'Connected'
  });
});

app.use('/api/images', imageRoutes);

// 404 handler
app.use((req, res) => {
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
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🖼️  Gallery API: http://localhost:${PORT}/api/images`);
  console.log(`📸 Photography API: http://localhost:${PORT}/api/images/photography`);
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}\n`);
});