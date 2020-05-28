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
  buyPrice_underlying: {
    type: Schema.Types.Decimal128,
  },
  buyPrice_option: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_underlying: {
    type: Schema.Types.Decimal128,
  },
  sellPrice_option: {
    type: Schema.Types.Decimal128,
  },
});

const PaperTrade = mongoose.model('paperTrade', PaperTradeSchema);

module.exports = PaperTrade;
