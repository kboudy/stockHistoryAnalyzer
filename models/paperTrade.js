const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PaperTradeSchema = new Schema({
  created: { type: Date },
  settings_used: {
    type: Schema.Types.Mixed,
  },
  symbol: {
    type: Schema.Types.String,
    sparse: true,
  },
  buyDate: {
    type: Schema.Types.Date,
    sparse: true,
  },
  heldDays: {
    type: Schema.Types.Number,
  },
  sellDate: {
    type: Schema.Types.Date,
    sparse: true,
  },
  daysToExpiration_atPurchase: {
    type: Schema.Types.Number,
  },
  buyPrice_underlying: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_underlying: {
    type: Schema.Types.Decimal128,
  },
  buyPrice_option: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_option: {
    type: Schema.Types.Decimal128,
  },
  chosen_option_contract: {
    type: Schema.Types.String,
  },
  buyDate_option_chains: {
    type: Schema.Types.Mixed,
  },
  sellDate_option_chains: {
    type: Schema.Types.Mixed,
  },

  currentDayEvaluationJobRun: {
    // the currentDayEvaluationJobRun that they made the "buy" choices from
    type: Schema.Types.ObjectId,
    ref: 'CurrentDayEvaluationJobRun',
    sparse: true,
  },
});

const PaperTrade = mongoose.model('paperTrade', PaperTradeSchema);

module.exports = PaperTrade;
