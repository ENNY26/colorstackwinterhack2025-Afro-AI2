require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const conversationRoutes = require('./routes/conversations');
const vocabularyRoutes = require('./routes/vocabulary');
const languageRoutes = require('./routes/languages');
const audioRoutes = require('./routes/audio');
const tipsRoutes = require('./routes/tips');
const plansRoutes = require('./routes/plans');

const app = express();

// Connect to MongoDB (async, but we'll wait for it before starting server)
let dbConnected = false;

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.AUDIO_UPLOAD_DIR || './uploads/audio';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Security middleware - Configure Helmet to allow cross-origin audio resources
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // Allow audio embedding
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      mediaSrc: ["'self'", "'unsafe-inline'", "data:", "blob:", "http://localhost:*", "http://127.0.0.1:*"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range', 'Accept'],
  exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges'],
  credentials: true,
}));

// Rate limiting (very lenient in development for testing)
const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DISABLE_AUTH === 'true';
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: isDevelopment
    ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10000  // Very high limit for dev (effectively unlimited)
    : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,  // Production limit
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files for uploaded audio (with CORS and range support for audio streaming)
// This middleware runs after Helmet, so we override headers as needed
app.use('/uploads', (req, res, next) => {
  // Add CORS headers for audio files (override any restrictions from Helmet)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  res.header('Accept-Ranges', 'bytes');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
}, express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Allow range requests for audio streaming
    res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'public, max-age=3600');
    
    // Set proper content type for audio files
    if (filePath.endsWith('.mp3')) {
      res.set('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.m4a')) {
      res.set('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.set('Content-Type', 'audio/webm');
    } else if (filePath.endsWith('.wav')) {
      res.set('Content-Type', 'audio/wav');
    }
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Afro AI Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/languages', languageRoutes);
app.use('/api/audio', audioRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/plans', plansRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware
app.use(errorHandler);

// Start server after database connection
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start server
// Allow server to start even if DB connection fails (for testing/debugging)
connectDB()
  .then(() => {
    dbConnected = true;
    startServer();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    console.warn('⚠️  Starting server WITHOUT database connection');
    console.warn('⚠️  Auth and data features will NOT work!');
    console.warn('⚠️  This is only for testing API connectivity');
    dbConnected = false;
    startServer();
  });

function startServer() {
  // Listen on all interfaces (0.0.0.0) to allow connections from emulators and other devices
  const HOST = process.env.HOST || '0.0.0.0';
  
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Afro AI Server running on ${HOST}:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Network access: http://${getLocalIP()}:${PORT}/health`);
    if (!dbConnected) {
      console.warn('⚠️  WARNING: Database not connected - most features will not work!');
    }
  });
}

// Helper function to get local IP address
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

module.exports = app;

