const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TRIBES } = require('../config/constants');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    default: null,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  tribe: {
    type: String,
    enum: TRIBES,
    default: 'yoruba',
  },
  nationality: {
    type: String,
    trim: true,
    maxlength: [80],
    default: null,
  },
  age: {
    type: Number,
    min: [13, 'You must be at least 13 years old'],
    max: [120, 'Please enter a valid age'],
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },

  selectedLanguage: {
    type: String,
    enum: TRIBES,
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

  stats: {
    totalConversations: { type: Number, default: 0 },
    totalMinutesPracticed: { type: Number, default: 0 },
    wordsLearned: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastPracticeDate: { type: Date, default: null },
  },

  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'dark',
  },
  notificationsEnabled: {
    type: Boolean,
    default: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },
  phoneVerified: {
    type: Boolean,
    default: false,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  /** @deprecated use phoneVerified — kept for compatibility */
  isVerified: {
    type: Boolean,
    default: false,
  },

  lastLoginAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

userSchema.index({ selectedLanguage: 1 });

userSchema.pre('save', async function preSave(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function generateAuthToken() {
  return jwt.sign(
    {
      id: this._id,
      email: this.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

userSchema.methods.updateStreak = function updateStreak() {
  const now = new Date();
  const lastPractice = this.stats.lastPracticeDate;

  if (!lastPractice) {
    this.stats.currentStreak = 1;
  } else {
    const hoursDiff = (now - lastPractice) / (1000 * 60 * 60);

    if (hoursDiff >= 24 && hoursDiff < 48) {
      this.stats.currentStreak += 1;
    } else if (hoursDiff >= 48) {
      this.stats.currentStreak = 1;
    }
  }

  if (this.stats.currentStreak > this.stats.longestStreak) {
    this.stats.longestStreak = this.stats.currentStreak;
  }

  this.stats.lastPracticeDate = now;
};

userSchema.methods.toJSON = function toJSON() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
