const Candle = require('../models/candle'),
  _ = require('lodash');

exports.loadHistoricalDataForSymbol = async (symbol) => {
  const candles = await Candle.find({ symbol }).lean().sort({ date: 1 });
  const stripped = [];
  for (const c of candles) {
    stripped.push({
      symbol: c.symbol,
      date: c.date,
      open: parseFloat(c.open),
      high: parseFloat(c.high),
      low: parseFloat(c.low),
      close: parseFloat(c.close),
      volume: parseInt(c.volume),
    });
  }
  return _.orderBy(stripped, (s) => s.date);
};

exports.getAvailableSymbolNames = async () => {
  const symbols = await Candle.find({}).lean().distinct('symbol');
  return symbols.sort();
};

exports.isCrypto = (symbol) => {
  return symbol === 'BTCUSD' || symbol === 'ETHUSD';
};
