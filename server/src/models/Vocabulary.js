const mongoose = require('mongoose');

const vocabularySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  language: {
    type: String,
    enum: ['yoruba', 'swahili', 'hausa', 'zulu', 'amharic', 'igbo', 'xhosa', 'akan'],
    required: true,
  },
  word: {
    type: String,
    required: [true, 'Word is required'],
    trim: true,
  },
  translation: {
    type: String,
    required: [true, 'Translation is required'],
    trim: true,
  },
  pronunciation: {
    type: String,
    default: null,
  },
  audioUrl: {
    type: String,
    default: null,
  },
  
  // Context and usage
  exampleSentence: {
    type: String,
    default: null,
  },
  exampleTranslation: {
    type: String,
    default: null,
  },
  category: {
    type: String,
    enum: ['greetings', 'numbers', 'family', 'food', 'travel', 'common', 'phrases', 'verbs', 'nouns', 'adjectives', 'other'],
    default: 'common',
  },
  
  // Learning progress
  isFavorite: {
    type: Boolean,
    default: false,
  },
  timesReviewed: {
    type: Number,
    default: 0,
  },
  timesCorrect: {
    type: Number,
    default: 0,
  },
  lastReviewedAt: {
    type: Date,
    default: null,
  },
  masteryLevel: {
    type: Number,
    min: 0,
    max: 5,
    default: 0, // 0 = new, 5 = mastered
  },
  
  // Source tracking
  source: {
    type: String,
    enum: ['conversation', 'manual', 'lesson', 'import'],
    default: 'conversation',
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null,
  },
}, {
  timestamps: true,
});

// Compound index for unique words per user per language
vocabularySchema.index({ user: 1, language: 1, word: 1 }, { unique: true });
vocabularySchema.index({ user: 1, isFavorite: 1 });
vocabularySchema.index({ user: 1, masteryLevel: 1 });
vocabularySchema.index({ user: 1, createdAt: -1 });

// Method to record a review
vocabularySchema.methods.recordReview = function(wasCorrect) {
  this.timesReviewed += 1;
  this.lastReviewedAt = new Date();
  
  if (wasCorrect) {
    this.timesCorrect += 1;
    // Increase mastery level if correct
    if (this.masteryLevel < 5) {
      this.masteryLevel += 1;
    }
  } else {
    // Decrease mastery level if incorrect (but not below 0)
    if (this.masteryLevel > 0) {
      this.masteryLevel -= 1;
    }
  }
  
  return this;
};

// Method to calculate accuracy
vocabularySchema.methods.getAccuracy = function() {
  if (this.timesReviewed === 0) return 0;
  return Math.round((this.timesCorrect / this.timesReviewed) * 100);
};

// Static method to get user's vocabulary stats
vocabularySchema.statics.getUserStats = async function(userId, language = null) {
  const match = { user: userId };
  if (language) match.language = language;
  
  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$language',
        totalWords: { $sum: 1 },
        favorites: { $sum: { $cond: ['$isFavorite', 1, 0] } },
        mastered: { $sum: { $cond: [{ $gte: ['$masteryLevel', 4] }, 1, 0] } },
        learning: { $sum: { $cond: [{ $and: [{ $gt: ['$masteryLevel', 0] }, { $lt: ['$masteryLevel', 4] }] }, 1, 0] } },
        new: { $sum: { $cond: [{ $eq: ['$masteryLevel', 0] }, 1, 0] } },
      },
    },
  ]);
  
  return stats;
};

// Static method to get words due for review (spaced repetition)
vocabularySchema.statics.getWordsForReview = async function(userId, language, limit = 10) {
  const now = new Date();
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  
  return this.find({
    user: userId,
    language,
    $or: [
      { lastReviewedAt: null }, // Never reviewed
      { masteryLevel: { $lt: 2 }, lastReviewedAt: { $lt: oneDayAgo } }, // Low mastery, review daily
      { masteryLevel: { $gte: 2, $lt: 4 }, lastReviewedAt: { $lt: oneWeekAgo } }, // Medium mastery, review weekly
    ],
  })
    .sort({ masteryLevel: 1, lastReviewedAt: 1 })
    .limit(limit);
};

module.exports = mongoose.model('Vocabulary', vocabularySchema);

