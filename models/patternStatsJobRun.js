const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PatternStatsJobRunSchema = new Schema({
  created: { type: Date },
  updated: { type: Date },
  numberOfBars: Number,
  maxPatternMatchingScore: Number,
  sourcePriceInfo: { type: Schema.Types.Mixed },
  targetPriceInfos: { type: [Schema.Types.Mixed] },
});

const PatternStatsJobRun = mongoose.model(
  'patternStatsJobRun',
  PatternStatsJobRunSchema
);

module.exports = PatternStatsJobRun;
