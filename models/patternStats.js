const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PatternStatsSchema = new Schema({
  jobRun: {
    type: Schema.Types.ObjectId,
    ref: 'PatternStatsJobRun',
  },
  sourceDate: {
    type: Schema.Types.String,
  },
  upsideDownsideRatio_byBarX: {
    type: Schema.Types.Mixed,
  },
  avg_maxUpsidePercent_byBarX: {
    type: Schema.Types.Mixed,
  },
  stdDev_maxUpsidePercent_byBarX: {
    type: Schema.Types.Mixed,
  },
  avg_maxDownsidePercent_byBarX: {
    type: Schema.Types.Mixed,
  },
  stdDev_maxDownsidePercent_byBarX: {
    type: Schema.Types.Mixed,
  },
  avg_profitLossPercent_atBarX: {
    type: Schema.Types.Mixed,
  },
  percentProfitable_atBarX: {
    type: Schema.Types.Mixed,
  },
  scoreDates: {
    type: Schema.Types.Mixed,
  },
  stdDev_profitLossPercent_atBarX: {
    type: Schema.Types.Mixed,
  },
  avgScore: {
    type: Number,
  },
  scoreCount: {
    type: Number,
  },
});

const PatternStats = mongoose.model('patternStats', PatternStatsSchema);

module.exports = PatternStats;
