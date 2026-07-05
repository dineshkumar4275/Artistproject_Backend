// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import imageRoutes from './routes/images.js';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // ✅ CORS - Allow your frontend
// const allowedOrigins = [
//   'http://localhost:5173',
//   'http://localhost:3000',
//   'http://127.0.0.1:5173',
//   'http://127.0.0.1:3000',
//   'https://artistproject-backend.vercel.app/api',
//   process.env.FRONTEND_URL
// ].filter(Boolean);

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       console.log('❌ Blocked CORS from:', origin);
//       callback(null, true); // For development, allow all
//       // In production, use: callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
// }));

// // ✅ Handle preflight
// app.options('*', cors());

// app.use(express.json({ limit: '50mb' }));
// app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// // Logging middleware
// app.use((req, res, next) => {
//   console.log(`🔄 ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`);
//   next();
// });

// // Routes
// app.get('/', (req, res) => {
//   res.json({
//     message: '🎨 Artist Portfolio API',
//     status: '✅ Running',
//     endpoints: {
//       health: 'GET /api/health',
//       images: 'GET /api/images',
//       'upload-url': 'POST /api/images/url'
//     }
//   });
// });

// app.get('/api/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     message: 'Server is running',
//     timestamp: new Date().toISOString()
//   });
// });

// app.use('/api/images', imageRoutes);

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     error: 'Route not found'
//   });
// });

// // Error handler
// app.use((err, req, res, next) => {
//   console.error('❌ Server error:', err);
//   res.status(500).json({
//     success: false,
//     error: 'Internal server error'
//   });
// });

// app.listen(PORT, () => {
//   console.log(`\n🚀 Server running on http://localhost:${PORT}`);
//   console.log(`📁 Health check: http://localhost:${PORT}/api/health`);
//   console.log(`🖼️  Images API: http://localhost:${PORT}/api/images`);
//   console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}\n`);
// });

// backend/server.js


import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import imageRoutes from './routes/images.js';

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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`🔄 ${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🎨 Artist Portfolio API',
    status: '✅ Running',
    endpoints: {
      health: 'GET /api/health',
      images: 'GET /api/images',
      upload: 'POST /api/images',
      'upload-url': 'POST /api/images/url',
      delete: 'DELETE /api/images/:id'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
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
    error: 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🖼️  Images API: http://localhost:${PORT}/api/images`);
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}\n`);
});