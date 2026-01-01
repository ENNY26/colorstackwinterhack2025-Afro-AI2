const mongoose = require('mongoose');

const culturalTipSchema = new mongoose.Schema({
  language: {
    type: String,
    enum: ['yoruba', 'swahili', 'hausa', 'zulu', 'amharic', 'igbo', 'xhosa', 'akan'],
    required: true,
    index: true,
  },
  tip: {
    type: String,
    required: [true, 'Tip content is required'],
  },
  type: {
    type: String,
    enum: ['grammar', 'culture', 'pronunciation', 'vocabulary', 'fun_fact', 'etiquette', 'proverb'],
    default: 'culture',
  },
  emoji: {
    type: String,
    default: '💡',
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  relatedWords: [{
    word: String,
    translation: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Index for random tip selection
culturalTipSchema.index({ language: 1, isActive: 1, type: 1 });

// Static method to get random tips
culturalTipSchema.statics.getRandomTips = async function(language, count = 5, excludeIds = []) {
  return this.aggregate([
    {
      $match: {
        language,
        isActive: true,
        _id: { $nin: excludeIds.map(id => new mongoose.Types.ObjectId(id)) },
      },
    },
    { $sample: { size: count } },
  ]);
};

// Static method to get tips by type
culturalTipSchema.statics.getTipsByType = function(language, type, limit = 10) {
  return this.find({ language, type, isActive: true })
    .limit(limit)
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('CulturalTip', culturalTipSchema);

