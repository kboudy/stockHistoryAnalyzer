//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

const { getAvailableSymbolNames } = require('./helpers/symbolData'),
  { runTradeSimulation } = require('./simulateTrades'),
  mongoApi = require('./helpers/mongoApi');

(async () => {
  await mongoApi.connectMongoose();

  const symbols = await getAvailableSymbolNames();

  const patternStatsConfig = {
    min_upsideDownsideRatio_byBarX: null,
    min_avg_maxUpsidePercent_byBarX: null,
    max_avg_maxDownsidePercent_byBarX: null,
    min_avg_profitLossPercent_atBarX: null,
    min_percentProfitable_atBarX: { 1: 70, 5: 70, 10: 70 },
    min_percentProfitable_by_1_percent_atBarX: null,
    min_percentProfitable_by_2_percent_atBarX: null,
    min_percentProfitable_by_5_percent_atBarX: null,
    min_percentProfitable_by_10_percent_atBarX: null,
    min_avgScore: null,
    min_scoreCount: 10,
  };
  const significantBars = [1, 5, 10];
  const numberOfBars = 20;
  const maxPatternMatchingScore = 12;

  const results = await runTradeSimulation(
    symbols,
    significantBars,
    numberOfBars,
    maxPatternMatchingScore,
    patternStatsConfig
  );

  await mongoApi.disconnectMongoose();
})();
