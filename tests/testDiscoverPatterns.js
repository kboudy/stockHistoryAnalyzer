const { loadHistoricalDataForSymbol } = require('../helpers/symbolData'),
  _ = require('lodash'),
  { std } = require('mathjs'),
  constants = require('../helpers/constants'),
  moment = require('moment'),
  mongoApi = require('../helpers/mongoApi'),
  patternMatching = require('../patternMatching'),
  { toTwoDecimals } = require('../helpers/miscMethods'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

const testAllDiscoveredPatterns = async () => {
  const patternStatsJobRuns = await PatternStatsJobRun.find({});
  for (const patternStatsJobRun of patternStatsJobRuns) {
    const symbolCandles = loadHistoricalDataForSymbol(
      patternStatsJobRun.sourcePriceInfo.symbol
    );
    const patternStats = await PatternStats.find({
      jobRun: patternStatsJobRun.id,
    });
    for (const patternStat of patternStats) {
      for (const sb of constants.significantBars) {
        const profitLosses = [];
        for (const scoreIndex of patternStat.scoreIndexes) {
          const closeAtLastBar =
            symbolCandles[scoreIndex + patternStatsJobRun.numberOfBars - 1]
              .close;

          const significantBarValue =
            symbolCandles[
              scoreIndex + patternStatsJobRun.numberOfBars + sb - 1
            ];
          if (significantBarValue !== 0 && !significantBarValue) {
            continue;
          }
          const profitLossPercent =
            Math.round(
              ((significantBarValue.close - closeAtLastBar) * 1000) /
                closeAtLastBar
            ) / 10;
          profitLosses.push(profitLossPercent);
        }

        // avg_profitLossPercent
        const avg_profitLossPercent_atBarX = toTwoDecimals(
          profitLosses.reduce((a, b) => a + b) / profitLosses.length
        );

        if (
          Math.abs(
            avg_profitLossPercent_atBarX -
              patternStat.avg_profitLossPercent_atBarX[sb]
          ) > 0.1
        ) {
          console.log(
            `Different avg_profitLossPercent_atBarX: ${patternStatsJobRun.sourcePriceInfo.symbol} sb:${sb} patternStat.sourceIndex:${patternStat.sourceIndex}`
          );
        }
      }
    }
  }
  debugger;
};

(async () => {
  await mongoApi.connectMongoose();
  await testAllDiscoveredPatterns();
  await mongoApi.disconnectMongoose();
})();
