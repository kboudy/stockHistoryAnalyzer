const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PatternStatsSchema = new Schema({
  jobRun: {
    type: Schema.Types.ObjectId,
    ref: 'PatternStatsJobRun',
    sparse: true,
  },
  sourceDate: {
    type: Schema.Types.String,
    sparse: true,
  },
  futureResults: {
    type: Schema.Types.Mixed,
  },
  /*
  moved these two fields into futureResults (above).  making things dynamic

  // profitLossPercent_atBarX is the "real" result, based on the source price history
  // (for running trade simulations, not pattern discovery)
  profitLossPercent_atBarX: {
    type: Schema.Types.Mixed,
  },
  profitLossSellDate_atBarX: {
    type: Schema.Types.Mixed,
  },
 */
  pastResults: {
    type: Schema.Types.Mixed,
  },
  /*
   upsideDownsideRatio_byBarX: {
    type: Schema.Types.Mixed,
  },
  avg_maxUpsidePercent_byBarX: {
    type: Schema.Types.Mixed,
  },
  avg_maxDownsidePercent_byBarX: {
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
   */
  scoreDates: {
    type: Schema.Types.Mixed,
    sparse: true,
  },
  avgScore: {
    type: Number,
    sparse: true,
  },
  scoreCount: {
    type: Number,
    sparse: true,
  },
});

const PatternStats = mongoose.model('patternStats', PatternStatsSchema);

module.exports = PatternStats;
