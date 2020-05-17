const {
    getAvailableSymbolNames,
    loadHistoricalDataForSymbol,
  } = require('./symbolData'),
  _ = require('lodash'),
  { std } = require('mathjs'),
  constants = require('./helpers/constants'),
  moment = require('moment'),
  mongoApi = require('./helpers/mongoApi'),
  patternMatching = require('./patternMatching'),
  PatternStats = require('./models/patternStats'),
  PatternStatsJobRun = require('./models/patternStatsJobRun');

const NUMBER_OF_BARS = 20;

const discoverPatternsForSymbol = async (symbol, numberOfBars) => {
  let runningCount = 0;
  const sourcePriceHistory = loadHistoricalDataForSymbol(symbol);
  const totalCount = sourcePriceHistory.length - numberOfBars;
  let lastLoggedPercentComplete = 0;

  // for now, we'll just compare the equity against itself
  const targetPriceHistories = [sourcePriceHistory];

  const jobRun = await PatternStatsJobRun.create({
    created: moment.utc(),
    numberOfBars,
    sourcePriceInfo: { symbol },
    targetPriceInfos: [{ symbol }],
  });

  for (let i = 0; i < sourcePriceHistory.length - numberOfBars; i++) {
    runningCount++;
    const percentComplete = Math.round((100 * runningCount) / totalCount);
    if (percentComplete - lastLoggedPercentComplete === 5) {
      process.stdout.write(`${percentComplete}%`);
      if (percentComplete !== 100) {
        process.stdout.write('...');
      }
      lastLoggedPercentComplete = percentComplete;
    }

    const scores = patternMatching.getMatches(
      sourcePriceHistory,
      i,
      numberOfBars,
      targetPriceHistories,
      [symbol], // the list of symbols which matches targetPriceHistories'
      //          (for now, we're just comparing an equity against itself)
      constants.significantBars,
      constants.MAX_PATTERN_MATCHING_SCORE
    );

    if (scores.length === 0) {
      continue;
    }
    const patternStat = {};
    toTwoDecimals = (n) => Math.round(n * 100) / 100;
    patternStat.jobRun = jobRun.id;
    patternStat.sourceIndex = i;

    patternStat.avg_maxUpsidePercent_byBarX = {};
    patternStat.stdDev_maxUpsidePercent_byBarX = {};
    patternStat.avg_maxDownsidePercent_byBarX = {};
    patternStat.stdDev_maxDownsidePercent_byBarX = {};
    patternStat.upsideDownsideRatio_byBarX = {};

    patternStat.avg_profitLossPercent_atBarX = {};
    patternStat.percentProfitable_atBarX = {};
    patternStat.stdDev_profitLossPercent_atBarX = {};

    for (const sb of constants.significantBars) {
      const mup_by = scores
        .filter((s) => s.maxUpsidePercent_byBarX[sb] !== null)
        .map((s) => s.maxUpsidePercent_byBarX[sb]);

      const mdp_by = scores
        .filter((s) => s.maxDownsidePercent_byBarX[sb] !== null)
        .map((s) => s.maxDownsidePercent_byBarX[sb]);

      const plp_at = scores
        .filter((s) => s.profitLossPercent_atBarX[sb] !== null)
        .map((s) => s.profitLossPercent_atBarX[sb]);

      if (mup_by.length > 0) {
        patternStat.avg_maxUpsidePercent_byBarX[sb] = toTwoDecimals(
          mup_by.reduce((a, b) => a + b) / scores.length
        );
        patternStat.stdDev_maxUpsidePercent_byBarX[sb] = toTwoDecimals(
          std(mup_by)
        );
      } else {
        patternStat.avg_maxUpsidePercent_byBarX[sb] = null;
        patternStat.stdDev_maxUpsidePercent_byBarX[sb] = null;
      }

      if (mup_by.length > 0) {
        patternStat.avg_maxDownsidePercent_byBarX[sb] = toTwoDecimals(
          -mdp_by.reduce((a, b) => a + b) / scores.length
        );
        patternStat.stdDev_maxDownsidePercent_byBarX[sb] = toTwoDecimals(
          std(mdp_by)
        );
      } else {
        patternStat.avg_maxDownsidePercent_byBarX[sb] = null;
        patternStat.stdDev_maxDownsidePercent_byBarX[sb] = null;
      }
      if (
        patternStat.avg_maxUpsidePercent_byBarX[sb] !== null &&
        patternStat.avg_maxDownsidePercent_byBarX[sb] !== null
      ) {
        patternStat.upsideDownsideRatio_byBarX[sb] = toTwoDecimals(
          patternStat.avg_maxUpsidePercent_byBarX[sb] /
            patternStat.avg_maxDownsidePercent_byBarX[sb]
        );
      } else {
        patternStat.upsideDownsideRatio_byBarX[sb] = null;
      }

      if (plp_at.length > 0) {
        patternStat.avg_profitLossPercent_atBarX[sb] = toTwoDecimals(
          plp_at.reduce((a, b) => a + b) / scores.length
        );
        patternStat.percentProfitable_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a > 0).length * 100) / scores.length
        );
        patternStat.stdDev_profitLossPercent_atBarX[sb] = toTwoDecimals(
          std(plp_at)
        );
      } else {
        patternStat.avg_profitLossPercent_atBarX[sb] = null;
        patternStat.percentProfitable_atBarX[sb] = null;
        patternStat.stdDev_profitLossPercent_atBarX[sb] = null;
      }
    }
    patternStat.avgScore = toTwoDecimals(
      scores.map((s) => s.score).reduce((a, b) => a + b) / scores.length
    );
    patternStat.scoreCount = scores.length;

    await PatternStats.create(patternStat);
  }
  console.log();
};

// loop through every position of priceHistory searching for matches of that sample (1-NumberOfBars)
// aggregate the scores from the matches (by their +- 10/30 max/min stats)

// list the results in order of tightest-clumping consistent high or low.  store the standard deviation - that will probably be a tell

(async () => {
  await mongoApi.connectMongoose();
  const symbols = getAvailableSymbolNames();

  for (const symbol of symbols) {
    console.log(`${symbol} (${symbols.indexOf(symbol) + 1}/${symbols.length})`);
    process.stdout.write('  ');
    await discoverPatternsForSymbol(symbol, NUMBER_OF_BARS);
  }
  await mongoApi.disconnectMongoose();
})();
