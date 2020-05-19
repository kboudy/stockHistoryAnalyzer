const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const TradeSimulationRunSchema = new Schema({
  created: { type: Date },
  criteria: { type: Schema.Types.Mixed },
  results: { type: Schema.Types.Mixed },
});

const TradeSimulationRun = mongoose.model(
  'tradeSimulationRun',
  TradeSimulationRunSchema
);

module.exports = TradeSimulationRun;
