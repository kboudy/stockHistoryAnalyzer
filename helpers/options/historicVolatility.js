const _ = require('lodash'),
  { loadHistoricalDataForSymbol } = require('../symbolData'),
  mongoApi = require('../mongoApi'),
  mathjs = require('mathjs');

// assumes the oldest candles is first (index=0)
const calculateHV = (candles, hvLength = candles.length) => {
  if (candles.length < hvLength + 1) {
    return null;
  }
  let hvCandles = candles.slice(candles.length - hvLength - 1);

  const profitLosses = hvCandles
    .map((c, idx) => {
      if (idx === 0) {
        return null;
      }
      const previousClose = hvCandles[idx - 1].close;
      return (c.close - previousClose) / previousClose;
    })
    .filter((pl) => pl !== null);
  const stdPl = mathjs.std(profitLosses);
  const variance = Math.pow(stdPl, 2);
  const annualizedVariance = Math.sqrt(variance * 250);
  return annualizedVariance * 100;
};
exports.calculateHV = calculateHV;
