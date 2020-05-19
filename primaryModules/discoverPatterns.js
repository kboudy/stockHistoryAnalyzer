//PURPOSE: to run multiple price history series against the matching algo & store the aggregated results in mongodb

const {
    getAvailableSymbolNames,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  _ = require('lodash'),
  { std } = require('mathjs'),
  constants = require('../helpers/constants'),
  { toTwoDecimals } = require('../helpers/miscMethods'),
  moment = require('moment'),
  mongoApi = require('../helpers/mongoApi'),
  mongoose = require('mongoose'),
  patternMatching = require('../helpers/patternMatching'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

const discoverPatternsForSymbol = async (
  symbol,
  numberOfBars,
  maxPatternMatchingScore,
  significantBars
) => {
  const sourcePriceHistory = await loadHistoricalDataForSymbol(symbol);
  let lastLoggedPercentComplete = 0;

  // pre-existing check
  let preExistingMaxDate = null;

  // PatternStatsJobRuns should be unique per these fields
  let jobRun = await PatternStatsJobRun.findOne({
    numberOfBars,
    maxPatternMatchingScore,
    sourceSymbol: symbol,
    targetSymbols: [symbol],
  });
  if (jobRun) {
    // get the current max date
    let psWithMaxDate = await PatternStats.findOne({ jobRun: jobRun.id })
      .sort({ sourceDate: -1 })
      .limit(1);
    if (psWithMaxDate) {
      preExistingMaxDate = psWithMaxDate.sourceDate;
    }
    jobRun.updated = moment.utc();
    await jobRun.save();
  } else {
    jobRun = await PatternStatsJobRun.create({
      created: moment.utc(),
      numberOfBars,
      significantBars,
      maxPatternMatchingScore,
      sourceSymbol: symbol,
      targetSymbols: [symbol],
    });
  }

  for (let i = 0; i < sourcePriceHistory.length - numberOfBars; i++) {
    // for now, we'll just compare the equity against itself
    // also, limiting it to the past date so we're not looking into the future
    if (i < numberOfBars) {
      // intentionally putting this check here instead of starting with "let i = numberOfBars"
      // when I (slightly) tweak the code for multiple target histories, we'll want to start with "let i = 0" (for non-same histories)
      continue;
    }

    const percentComplete = Math.round(
      (100 * (i + 1)) / (sourcePriceHistory.length - numberOfBars)
    );
    if (percentComplete - lastLoggedPercentComplete === 10) {
      process.stdout.write(`${percentComplete}%`);
      if (percentComplete !== 100) {
        process.stdout.write('...');
      }
      lastLoggedPercentComplete = percentComplete;
    }

    if (
      preExistingMaxDate &&
      sourcePriceHistory[i].date <= preExistingMaxDate
    ) {
      continue;
    }

    const scores = patternMatching.getMatches(
      sourcePriceHistory,
      i,
      numberOfBars,
      targetPriceHistories,
      [symbol], // the list of symbols which matches targetPriceHistories'
      //          (for now, we're just comparing an equity against itself)
      significantBars,
      maxPatternMatchingScore
    );

    const patternStat = {};
    patternStat.jobRun = jobRun.id;
    patternStat.sourceDate = sourcePriceHistory[i].date;
    patternStat.avg_maxUpsidePercent_byBarX = {};
    patternStat.stdDev_maxUpsidePercent_byBarX = {};
    patternStat.avg_maxDownsidePercent_byBarX = {};
    patternStat.stdDev_maxDownsidePercent_byBarX = {};
    patternStat.upsideDownsideRatio_byBarX = {};
    patternStat.avg_profitLossPercent_atBarX = {};
    patternStat.listed_profitLossPercent_atBarX = {};
    patternStat.percentProfitable_atBarX = {};
    patternStat.percentProfitable_by_1_percent_atBarX = {};
    patternStat.percentProfitable_by_2_percent_atBarX = {};
    patternStat.percentProfitable_by_5_percent_atBarX = {};
    patternStat.percentProfitable_by_10_percent_atBarX = {};
    patternStat.stdDev_profitLossPercent_atBarX = {};

    if (scores.length === 0) {
      patternStat.avgScore = null;
      patternStat.scoreDates = [];
      patternStat.scoreCount = 0;
      await PatternStats.create(patternStat);
      continue;
    }

    for (const sb of significantBars) {
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
          mup_by.reduce((a, b) => a + b) / mup_by.length
        );
        patternStat.stdDev_maxUpsidePercent_byBarX[sb] = toTwoDecimals(
          std(mup_by)
        );
      } else {
        patternStat.avg_maxUpsidePercent_byBarX[sb] = null;
        patternStat.stdDev_maxUpsidePercent_byBarX[sb] = null;
      }

      if (mdp_by.length > 0) {
        patternStat.avg_maxDownsidePercent_byBarX[sb] = toTwoDecimals(
          -mdp_by.reduce((a, b) => a + b) / mdp_by.length
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
        if (
          patternStat.upsideDownsideRatio_byBarX[sb] ===
          Number.NEGATIVE_INFINITY
        ) {
          patternStat.upsideDownsideRatio_byBarX[sb] = Number.INFINITY;
        }
      } else {
        patternStat.upsideDownsideRatio_byBarX[sb] = null;
      }

      if (plp_at.length > 0) {
        patternStat.avg_profitLossPercent_atBarX[sb] = toTwoDecimals(
          plp_at.reduce((a, b) => a + b) / plp_at.length
        );
        patternStat.listed_profitLossPercent_atBarX[sb] = plp_at;
        patternStat.percentProfitable_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a > 0).length * 100) / plp_at.length
        );
        patternStat.percentProfitable_by_1_percent_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a >= 1).length * 100) / plp_at.length
        );
        patternStat.percentProfitable_by_2_percent_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a >= 2).length * 100) / plp_at.length
        );
        patternStat.percentProfitable_by_5_percent_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a >= 5).length * 100) / plp_at.length
        );
        patternStat.percentProfitable_by_10_percent_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a >= 10).length * 100) / plp_at.length
        );
        patternStat.stdDev_profitLossPercent_atBarX[sb] = toTwoDecimals(
          std(plp_at)
        );
      } else {
        patternStat.avg_profitLossPercent_atBarX[sb] = null;
        patternStat.listed_profitLossPercent_atBarX[sb] = null;
        patternStat.percentProfitable_atBarX[sb] = null;
        patternStat.stdDev_profitLossPercent_atBarX[sb] = null;
        patternStat.percentProfitable_by_1_percent_atBarX[sb] = null;
        patternStat.percentProfitable_by_2_percent_atBarX[sb] = null;
        patternStat.percentProfitable_by_5_percent_atBarX[sb] = null;
        patternStat.percentProfitable_by_10_percent_atBarX[sb] = null;
      }
    }
    patternStat.avgScore = toTwoDecimals(
      scores.map((s) => s.score).reduce((a, b) => a + b) / scores.length
    );
    patternStat.scoreDates = _.orderBy(
      scores.map((s) => sourcePriceHistory[s.index].date),
      (d) => d
    );
    patternStat.scoreCount = scores.length;

    await PatternStats.create(patternStat);
  }
  console.log();
};

// loop through every position of priceHistory searching for matches of that sample (1-NumberOfBars)
// aggregate the scores from the matches

// list the results in order of tightest-clumping consistent high or low.  store the standard deviation - that will probably be a tell

const dropPatternCollections = async () => {
  try {
    await mongoose.connection.db.dropCollection('patternstats');
  } catch (err) {}
  try {
    await mongoose.connection.db.dropCollection('patternstatsjobruns');
  } catch (err) {}
};

(async () => {
  await mongoApi.connectMongoose();

  // ignore any pattern matches that have a score >= this
  const maxPatternMatchingScore = 12;
  const numberOfBars = 20;

  let symbols = await getAvailableSymbolNames();

  for (const symbol of symbols) {
    console.log(`${symbol} (${symbols.indexOf(symbol) + 1}/${symbols.length})`);
    process.stdout.write('  ');
    await discoverPatternsForSymbol(
      symbol,
      numberOfBars,
      maxPatternMatchingScore,
      constants.significantBars
    );
  }
  await mongoApi.disconnectMongoose();
})();
