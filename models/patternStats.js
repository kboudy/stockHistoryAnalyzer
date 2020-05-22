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
  // actualProfitLossPercent_atBarX is the "real" result, based on the source price history
  // (for running trade simulations, not pattern discovery)
  actualProfitLossPercent_atBarX: {
    type: Schema.Types.Mixed,
  },
  actualProfitLossSellDate_atBarX: {
    type: Schema.Types.Mixed,
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
  percentProfitable_by_1_percent_atBarX: {
    type: Schema.Types.Mixed,
  },
  percentProfitable_by_2_percent_atBarX: {
    type: Schema.Types.Mixed,
  },
  percentProfitable_by_5_percent_atBarX: {
    type: Schema.Types.Mixed,
  },
  percentProfitable_by_10_percent_atBarX: {
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
