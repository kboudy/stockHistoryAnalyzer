const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const CandleSchema = new Schema({
  created: { type: Date },
  symbol: {
    type: Schema.Types.String,
    sparse: true,
  },
  settled: {
    type: Schema.Types.Boolean,
    sparse: true,
  },
  date: {
    type: Schema.Types.String,
    sparse: true,
  },
  open: {
    type: Schema.Types.Decimal128,
  },
  high: {
    type: Schema.Types.Decimal128,
  },
  low: {
    type: Schema.Types.Decimal128,
  },
  close: {
    type: Schema.Types.Decimal128,
  },
  volume: {
    type: Schema.Types.Number,
  },
});

const Candle = mongoose.model('candle', CandleSchema);

module.exports = Candle;
