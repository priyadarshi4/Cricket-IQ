const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name:  { type: String, required: true, unique: true, index: true },

  batting: {
    innings:    { type: Number, default: 0 },
    runs:       { type: Number, default: 0 },
    balls:      { type: Number, default: 0 },
    fours:      { type: Number, default: 0 },
    sixes:      { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    average:    { type: Number, default: 0 },
    highScore:  { type: Number, default: 0 },
    fifties:    { type: Number, default: 0 },
    hundreds:   { type: Number, default: 0 },
  },

  bowling: {
    innings:     { type: Number, default: 0 },
    wickets:     { type: Number, default: 0 },
    balls:       { type: Number, default: 0 },
    runsConceded:{ type: Number, default: 0 },
    economy:     { type: Number, default: 0 },
    average:     { type: Number, default: 0 },
    bestFigures: { type: String, default: '0/0' },
    fiveWickets: { type: Number, default: 0 },
  },

  fielding: {
    catches:   { type: Number, default: 0 },
    runOuts:   { type: Number, default: 0 },
    stumpings: { type: Number, default: 0 },
  },

  teamsPlayed: [String],
  seasons:     [String],
  updatedAt:   { type: Date, default: Date.now },
}, { timestamps: true });


module.exports = mongoose.model('Player', playerSchema);
