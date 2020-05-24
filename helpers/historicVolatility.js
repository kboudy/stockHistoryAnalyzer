const _ = require('lodash'),
  { loadHistoricalDataForSymbol } = require('../helpers/symbolData'),
  mongoApi = require('../helpers/mongoApi'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

// assumes the oldest candles is first (index=0)
const calculateHV = (candles, length = null) => {
  let hvCandles = length
    ? candles.slice(candles.length - length)
    : [...candles];

  let previousClose = null;
  for (const c of hvCandles) {
    if (previousClose !== null) {
      c.log = Math.log(c.close / previousClose);
    }
    previousClose = c.close;
  }
  const logAvg = _.mean(hvCandles.map((c) => c.log));
  for (const c of hvCandles) {
    if (c.log === 0 || c.log) {
      c.logMeanDiffSquared = Math.pow(c.log - logAvg, 2);
    }
    previousClose = c.close;
  }

  // removing oldest candle, as it won't have the diff-prev data
  hvCandles = hvCandles.slice(1);

  const sumLogMeanDiffSquared = _.sum(
    hvCandles.map((c) => c.logMeanDiffSquared)
  );
  const safeLength = length ? length : 1;
  const variance = sumLogMeanDiffSquared / hvCandles.length;

  const varianceMultiple = variance * safeLength;
  const historicVolatility = varianceMultiple * Math.sqrt(safeLength);
  return historicVolatility;
};

(async () => {
  await mongoApi.connectMongoose();
  let candles = (await loadHistoricalDataForSymbol('SLV')).map((c) => {
    return {
      date: c.date,
      close: c.close,
    };
  });
  await mongoApi.disconnectMongoose();

  const hv = calculateHV(candles, 30);

  debugger;
})();
