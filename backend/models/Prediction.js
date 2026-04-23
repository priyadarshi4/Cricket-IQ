const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema({
  team1:      { type: String, required: true, index: true },
  team2:      { type: String, required: true, index: true },
  venue:      String,
  city:       String,
  tossWinner: String,
  tossDecision: String,
  matchType:  { type: String, default: 'league' },

  // Model outputs
  team1WinProbability: { type: Number, required: true },
  team2WinProbability: { type: Number, required: true },
  predictedWinner:     { type: String, required: true },
  confidence:          { type: Number, required: true },

  // Explainability//
  keyFactors:     [{ label: String, impact: String, value: String, weight: Number }],
  modelBreakdown: { type: Map, of: Number },
  featureImportance: { type: Map, of: Number },

  // Outcome tracking (filled in after match)
  actualWinner:  { type: String, default: null },
  wasCorrect:    { type: Boolean, default: null },

  // Meta
  modelVersion: { type: String, default: '1.0.0' },
  source:       { type: String, enum: ['web', 'api', 'admin'], default: 'web' },
  ipAddress:    String,
}, { timestamps: true });

// Index for accuracy reporting
predictionSchema.index({ wasCorrect: 1, createdAt: -1 });
predictionSchema.index({ team1: 1, team2: 1, createdAt: -1 });

// Static: overall accuracy
predictionSchema.statics.accuracy = async function () {
  const settled = await this.countDocuments({ wasCorrect: { $ne: null } });
  if (!settled) return null;
  const correct = await this.countDocuments({ wasCorrect: true });
  return { total: settled, correct, accuracy: ((correct / settled) * 100).toFixed(1) };
};

module.exports = mongoose.model('Prediction', predictionSchema);
