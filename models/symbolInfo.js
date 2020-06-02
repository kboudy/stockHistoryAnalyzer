const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const SymbolInfoSchema = new Schema({
  created: { type: Date },
  symbol: {
    type: Schema.Types.String,
    sparse: true,
  },
  highestOptionContractOpenInterest: {
    type: Schema.Types.Number,
    sparse: true,
  },
  startDate: {
    type: Schema.Types.String,
    sparse: true,
  },
});

const SymbolInfo = mongoose.model('symbolInfo', SymbolInfoSchema);

module.exports = SymbolInfo;
