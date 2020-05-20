const _ = require('lodash'),
  { loadHistoricalDataForSymbol } = require('../helpers/symbolData'),
  mongoApi = require('../helpers/mongoApi'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

const confirm_profitLossAtBarX = async () => {
  const jobRuns = await PatternStatsJobRun.find({});
  for (const jobRun of jobRuns) {
    console.log(`testing symbol:${jobRun.sourceSymbol} jobRunId:${jobRun.id}`);
    const numberOfBars = jobRun.numberOfBars;
    const candles = await loadHistoricalDataForSymbol(jobRun.sourceSymbol);
    const patternStats = _.orderBy(
      (await PatternStats.find({ jobRun: jobRun.id })).filter(
        (ps) => ps.scoreCount > 0
      ),
      (ps) => ps.sourceDate
    );
    for (const ps of patternStats) {
      const bars = Object.keys(ps.avg_profitLossPercent_atBarX);
      for (const b of bars) {
        const avg_profitLossPercent_atBar = ps.avg_profitLossPercent_atBarX[b];
        if (avg_profitLossPercent_atBar === null) {
          continue;
        }
        let plPercentTotal = 0;
        const buyDates = [];
        let plDivisor = 0;
        for (const scoreDate of ps.scoreDates) {
          const candleIndex = candles.indexOf(
            candles.filter((c) => c.date === scoreDate)[0]
          );
          const buyDateIndex = candleIndex + parseInt(numberOfBars) - 1;
          const sellDateIndex = buyDateIndex + parseInt(b);
          const buyDate = candles[buyDateIndex].date;
          const sellDate = candles[sellDateIndex].date;
          if (sellDate >= ps.sourceDate) {
            continue;
          }

          buyDates.push(candles[buyDateIndex].date);
          const buyClose = candles[buyDateIndex].close;
          const sellClose = candles[sellDateIndex].close;

          const plPercent = Math.round((sellClose / buyClose - 1) * 1000) / 10;

          plPercentTotal += plPercent;
          plDivisor++;
        }
        const avgPl = plPercentTotal / plDivisor;
        if (Math.abs(avgPl - avg_profitLossPercent_atBar) > 0.01) {
          console.log(
            `  - test failed: symbol:${jobRun.sourceSymbol} jobRunId:${jobRun.id} significantBar:${b}`
          );
          console.log(
            `    - expected:${avg_profitLossPercent_atBar} got:${avgPl}`
          );
        }
      }
    }
  }
};

(async () => {
  await mongoApi.connectMongoose();

  await confirm_profitLossAtBarX();

  await mongoApi.disconnectMongoose();
})();
