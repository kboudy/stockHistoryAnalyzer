const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PatternStatsJobRunSchema = new Schema({
  created: { type: Date },
  updated: { type: Date },
  numberOfBars: Number,
  ignoreMatchesAboveThisScore: Number,
  significantBars: { type: Schema.Types.Mixed },
  sourceSymbol: { type: Schema.Types.String },
  targetSymbols: { type: [Schema.Types.String] },
});

const PatternStatsJobRun = mongoose.model(
  'patternStatsJobRun',
  PatternStatsJobRunSchema
);

module.exports = PatternStatsJobRun;
