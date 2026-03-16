const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 * In development mode, bypasses auth if no token provided (for testing)
 */
const auth = async (req, res, next) => {
  // In development mode, make auth optional for testing
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DISABLE_AUTH === 'true';
  
  if (isDevelopment) {
    // Try to authenticate if token is provided
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        
        if (user && user.isActive) {
          req.user = user;
          req.token = token;
          return next();
        }
      } catch (error) {
        // Token invalid, but that's okay in dev mode - continue without user
        console.log('Dev mode: Auth token invalid, using default dev user');
      }
    }
    
    // No token or invalid token - get or create a default dev user
    try {
      let devUser = await User.findOne({ email: 'dev@afrolingo.test' }).select('+password');
      
      if (!devUser) {
        // Create default dev user for testing (password will be auto-hashed by pre-save hook)
        devUser = new User({
          email: 'dev@afrolingo.test',
          name: 'Dev Test User',
          password: 'dev123456', // Will be hashed by pre-save hook
          isActive: true,
          isVerified: true,
          aiPersonality: 'friendly',
          voiceSpeed: 'normal',
          selectedLanguage: 'yoruba',
          stats: {
            totalConversations: 0,
            totalMinutesPracticed: 0,
            wordsLearned: 0,
            currentStreak: 0,
            longestStreak: 0,
            lastPracticeDate: null,
          },
        });
        await devUser.save();
        console.log('Dev mode: Created default test user (email: dev@afrolingo.test)');
      }
      
      // Get full user without password for request
      devUser = await User.findById(devUser._id);
      req.user = devUser;
      console.log('Dev mode: Using default test user for testing');
      return next();
    } catch (error) {
      console.error('Dev mode: Failed to get/create dev user:', error);
      // Still allow request to proceed - routes will handle missing user
      // But try to continue without user (might cause issues)
      return res.status(500).json({
        success: false,
        message: 'Development mode: Failed to initialize test user. Please check database connection.',
        error: error.message,
      });
    }
  }
  
  // Production mode - require authentication
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }
    
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.',
      });
    }
    
    // Attach user and token to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please login again.',
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error.',
    });
  }
};

/**
 * Optional auth middleware
 * Attaches user if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
      req.token = token;
    }
    
    next();
  } catch (error) {
    // Token invalid but that's okay for optional auth
    next();
  }
};

module.exports = { auth, optionalAuth };

