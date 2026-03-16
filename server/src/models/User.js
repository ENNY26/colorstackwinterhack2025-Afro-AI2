const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't include password in queries by default
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  avatar: {
    type: String,
    default: null,
  },
  
  // Learning preferences
  selectedLanguage: {
    type: String,
    enum: ['yoruba', 'swahili', 'hausa', 'zulu', 'amharic', 'igbo', 'xhosa', 'akan'],
    default: 'yoruba',
  },
  aiPersonality: {
    type: String,
    enum: ['quirky', 'professional', 'friendly', 'patient', 'humorous'],
    default: 'friendly',
  },
  voiceSpeed: {
    type: String,
    enum: ['slow', 'normal', 'fast'],
    default: 'normal',
  },
  
  // Progress tracking
  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMinutesPracticed: { type: Number, default: 0 },
    wordsLearned: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastPracticeDate: { type: Date, default: null },
  },
  
  // Account settings
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark',
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },
  
  // Account status
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  
  // Timestamps
  lastLoginAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Index for faster queries
// Note: email index is automatically created by unique: true
userSchema.index({ selectedLanguage: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Update streak based on practice
userSchema.methods.updateStreak = function() {
  const now = new Date();
  const lastPractice = this.stats.lastPracticeDate;
  
  if (!lastPractice) {
    this.stats.currentStreak = 1;
  } else {
    const hoursDiff = (now - lastPractice) / (1000 * 60 * 60);
    
    if (hoursDiff < 24) {
      // Same day, no change
    } else if (hoursDiff < 48) {
      // Next day, increment streak
      this.stats.currentStreak += 1;
    } else {
      // Streak broken
      this.stats.currentStreak = 1;
    }
  }
  
  // Update longest streak if needed
  if (this.stats.currentStreak > this.stats.longestStreak) {
    this.stats.longestStreak = this.stats.currentStreak;
  }
  
  this.stats.lastPracticeDate = now;
};

// Hide sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);

