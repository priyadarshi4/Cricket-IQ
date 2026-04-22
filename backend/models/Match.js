const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  externalId: { type: String, unique: true, sparse: true },
  season:     { type: String, required: true, index: true },
  date:       { type: Date,   required: true, index: true },
  matchType:  { type: String, enum: ['League', 'Qualifier', 'Eliminator', 'Final'], default: 'League' },
  venue:      { type: String, required: true },
  city:       { type: String },
  team1:      { type: String, required: true, index: true },
  team2:      { type: String, required: true, index: true },
  tossWinner: { type: String },
  tossDecision: { type: String, enum: ['bat', 'field'] },
  winner:     { type: String, index: true },
  result:     { type: String },        // 'runs' | 'wickets' | 'tie' | 'no result'
  resultMargin: { type: Number },
  playerOfMatch: { type: String },
  method:     { type: String },        // DLS etc.
  superOver:  { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
}, { timestamps: true });

// Virtual: did team1 win?
matchSchema.virtual('team1Won').get(function () {
  return this.winner === this.team1;
});

// Static: win rate for a team in a venue//
matchSchema.statics.venueWinRate = async function (team, venue) {
  const [total, wins] = await Promise.all([
    this.countDocuments({ venue, $or: [{ team1: team }, { team2: team }] }),
    this.countDocuments({ venue, winner: team }),
  ]);
  return total ? wins / total : 0.5;
};

// Static: H2H win rate
matchSchema.statics.h2hWinRate = async function (team1, team2) {
  const total = await this.countDocuments({
    $or: [
      { team1, team2 },
      { team1: team2, team2: team1 },
    ],
  });
  if (!total) return 0.5;
  const wins = await this.countDocuments({
    winner: team1,
    $or: [{ team1, team2 }, { team1: team2, team2: team1 }],
  });
  return wins / total;
};

module.exports = mongoose.model('Match', matchSchema);
