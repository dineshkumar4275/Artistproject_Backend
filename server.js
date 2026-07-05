// backend/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRoutes from './routes/images.js';
import pool from './config/db.js';

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
  'https://artistproject.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      console.log('❌ Blocked CORS from:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// ============================================
// DATABASE INITIALIZATION
// ============================================
const initDatabase = async () => {
  try {
    console.log('📊 Initializing database...');
    
    // Create images table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        cloudinary_id VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        image_url VARCHAR(500),
        type VARCHAR(50) DEFAULT 'gallery' CHECK (type IN ('gallery', 'photography')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_images_created_at ON images(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_images_type ON images(type);
      CREATE INDEX IF NOT EXISTS idx_images_cloudinary_id ON images(cloudinary_id);
    `);
    
    console.log('✅ Database tables and indexes created successfully');
    
    // Check if any data exists
    const countResult = await pool.query('SELECT COUNT(*) FROM images');
    const count = parseInt(countResult.rows[0].count);
    console.log(`📊 Total images in database: ${count}`);
    
    // If no images, add sample data
    if (count === 0) {
      console.log('📝 Adding sample data...');
      await pool.query(`
        INSERT INTO images (title, cloudinary_id, url, image_url, type) VALUES 
          ('Sample Gallery Image 1', 'gallery/sample1', 'https://res.cloudinary.com/demo/image/upload/sample1.jpg', 'https://res.cloudinary.com/demo/image/upload/sample1.jpg', 'gallery'),
          ('Sample Gallery Image 2', 'gallery/sample2', 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'https://res.cloudinary.com/demo/image/upload/sample2.jpg', 'gallery'),
          ('Sample Photography 1', 'photography/sample1', 'https://res.cloudinary.com/demo/image/upload/sample3.jpg', 'https://res.cloudinary.com/demo/image/upload/sample3.jpg', 'photography'),
          ('Sample Photography 2', 'photography/sample2', 'https://res.cloudinary.com/demo/image/upload/sample4.jpg', 'https://res.cloudinary.com/demo/image/upload/sample4.jpg', 'photography')
      `);
      console.log('✅ Sample data added successfully');
    }
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.error('📌 Please check your DATABASE_URL in .env');
  }
};

// Initialize database on startup
initDatabase();

// ============================================
// ROUTES
// ============================================

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎨 Artist Portfolio API',
    status: '✅ Running',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      gallery: {
        getAll: 'GET /api/images',
        uploadFile: 'POST /api/images',
        uploadUrl: 'POST /api/images/url',
        delete: 'DELETE /api/images/:id',
        deleteAll: 'DELETE /api/images'
      },
      photography: {
        getAll: 'GET /api/images/photography',
        uploadFile: 'POST /api/images/photography',
        delete: 'DELETE /api/images/:id',
        deleteAll: 'DELETE /api/images'
      }
    }
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    const dbTest = await pool.query('SELECT NOW() as time');
    
    res.json({
      status: 'OK',
      message: 'Server is running',
      database: 'Connected ✅',
      timestamp: new Date().toISOString(),
      dbTime: dbTest.rows[0].time
    });
  } catch (error) {
    res.json({
      status: 'OK',
      message: 'Server is running',
      database: 'Disconnected ❌',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Image Routes
app.use('/api/images', imageRoutes);

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.url
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🖼️  Gallery API: http://localhost:${PORT}/api/images`);
  console.log(`📸 Photography API: http://localhost:${PORT}/api/images/photography`);
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}\n`);
});

export default app;