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
/* 
(async () => {
  await mongoApi.connectMongoose();
  let candles = (await loadHistoricalDataForSymbol('SLV')).map((c) => {
    return {
      date: c.date,
      close: c.close,
    };
  });
  await mongoApi.disconnectMongoose();

  // agrees with this site: https://www.ivolatility.com/options/SLV/NYSEArca/
  const hv10 = calculateHV(candles, 10);
  const hv20 = calculateHV(candles, 20);
  const hv30 = calculateHV(candles, 30);

})();
 */
