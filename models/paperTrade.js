const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PaperTradeSchema = new Schema({
  created: { type: Date },
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
  optionExpiration: {
    type: Schema.Types.Date,
    sparse: true,
  },
  optionStrike: {
    type: Schema.Types.String,
    sparse: true,
  },
  optionIsPut: {
    type: Schema.Types.Boolean,
  },
  daysToExpiration_atPurchase: {
    type: Schema.Types.Number,
  },
  buyPrice_underlying: {
    type: Schema.Types.Decimal128,
  },
  buyPrice_option_theoretical: {
    type: Schema.Types.Decimal128,
  },
  buyPrice_option_actual: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_underlying: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_option_theoretical: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_option_actual: {
    type: Schema.Types.Decimal128,
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
