const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  translation: {
    type: String,
    default: null,
  },
  audioUrl: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  // Vocabulary words extracted from this message
  vocabularyWords: [{
    word: String,
    translation: String,
    pronunciation: String,
  }],
});

const conversationSchema = new mongoose.Schema({
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
  personality: {
    type: String,
    enum: ['quirky', 'professional', 'friendly', 'patient', 'humorous'],
    default: 'friendly',
  },
  title: {
    type: String,
    default: 'New Conversation',
  },
  /** Roleplay scenario id (e.g. shopping, food); null = open practice / tutor-style chat */
  conversationType: {
    type: String,
    default: null,
  },
  messages: [messageSchema],
  
  // Conversation metadata
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active',
  },
  
  // Statistics
  stats: {
    totalTurns: { type: Number, default: 0 },
    durationMinutes: { type: Number, default: 0 },
    wordsLearned: { type: Number, default: 0 },
  },
  
  // Cultural tips shown during this conversation
  culturalTipsShown: [{
    tipId: String,
    shownAt: { type: Date, default: Date.now },
  }],
  
  // Session tracking
  startedAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes for common queries
conversationSchema.index({ user: 1, createdAt: -1 });
conversationSchema.index({ user: 1, language: 1 });
conversationSchema.index({ user: 1, status: 1 });

// Pre-save hook to update turn count
conversationSchema.pre('save', function(next) {
  if (this.messages) {
    this.stats.totalTurns = this.messages.filter(m => m.role !== 'system').length;
  }
  next();
});

// Method to add a message
conversationSchema.methods.addMessage = function(role, content, options = {}) {
  this.messages.push({
    role,
    content,
    translation: options.translation || null,
    audioUrl: options.audioUrl || null,
    vocabularyWords: options.vocabularyWords || [],
  });
  return this;
};

// Method to end conversation
conversationSchema.methods.endConversation = function() {
  this.status = 'completed';
  this.endedAt = new Date();
  
  // Calculate duration
  if (this.startedAt) {
    const duration = (this.endedAt - this.startedAt) / (1000 * 60);
    this.stats.durationMinutes = Math.round(duration);
  }
  
  return this;
};

// Method to get conversation summary
conversationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    language: this.language,
    title: this.title,
    totalTurns: this.stats.totalTurns,
    durationMinutes: this.stats.durationMinutes,
    wordsLearned: this.stats.wordsLearned,
    startedAt: this.startedAt,
    endedAt: this.endedAt,
    status: this.status,
    preview: this.messages.length > 1 
      ? this.messages[1].content.substring(0, 100) + '...'
      : 'No messages yet',
  };
};

// Static method to get user's recent conversations
conversationSchema.statics.getRecentByUser = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('language personality title stats startedAt endedAt status');
};

module.exports = mongoose.model('Conversation', conversationSchema);

