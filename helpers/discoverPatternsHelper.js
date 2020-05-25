//PURPOSE: to run multiple price history series against the matching algo & store the aggregated results in mongodb

const { loadHistoricalDataForSymbol } = require('./symbolData'),
  _ = require('lodash'),
  { std } = require('mathjs'),
  { significantBars } = require('./constants'),
  { toTwoDecimals } = require('./miscMethods'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  patternMatching = require('./patternMatching'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

exports.discoverPatternsForSymbol = async (
  symbol,
  targetSymbols,
  numberOfBars,
  ignoreMatchesAboveThisScore,
  logToConsole = true, // these last 3 params will be set to non defaults when looking at "current day" evaluations
  writeToDb = true,
  mostRecentResultOnly = false
) => {
  const sourcePriceHistory = await loadHistoricalDataForSymbol(symbol);
  let lastLoggedPercentComplete = 0;

  // pre-existing check
  let preExistingMaxDate = null;

  let jobRun;
  if (writeToDb) {
    // PatternStatsJobRuns should be unique per these fields
    jobRun = await PatternStatsJobRun.findOne({
      numberOfBars,
      ignoreMatchesAboveThisScore,
      sourceSymbol: symbol,
      targetSymbols,
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
        ignoreMatchesAboveThisScore,
        sourceSymbol: symbol,
        targetSymbols,
      });
    }
  }

  const maxIndex = sourcePriceHistory.length - numberOfBars - 1;
  const minIndex = mostRecentResultOnly ? maxIndex : numberOfBars;

  for (let i = minIndex; i <= maxIndex; i++) {
    const percentComplete = Math.round(
      (100 * (i + 1)) / (sourcePriceHistory.length - numberOfBars)
    );
    if (logToConsole && percentComplete - lastLoggedPercentComplete === 10) {
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

    const sourceDate = sourcePriceHistory[i].date;
    const targetPriceHistories = [];
    for (const targetSymbol of targetSymbols) {
      //  limiting it to past dates so we're not looking into the future
      const tph = (await loadHistoricalDataForSymbol(targetSymbol)).filter(
        (t) => t.date < sourceDate
      );
      targetPriceHistories.push(tph);
    }

    const { scores, scoresByTargetSymbol } = patternMatching.getMatches(
      sourcePriceHistory,
      i,
      numberOfBars,
      targetPriceHistories,
      targetSymbols, // the list of symbols which matches targetPriceHistories'
      //          (for now, we're just comparing an equity against itself)
      significantBars,
      ignoreMatchesAboveThisScore
    );

    const patternStat = {};
    if (writeToDb) {
      patternStat.jobRun = jobRun.id;
    }
    patternStat.sourceDate = sourcePriceHistory[i].date;
    patternStat.actualProfitLossPercent_atBarX = {};
    patternStat.actualProfitLossSellDate_atBarX = {};
    patternStat.avg_maxUpsidePercent_byBarX = {};
    patternStat.stdDev_maxUpsidePercent_byBarX = {};
    patternStat.avg_maxDownsidePercent_byBarX = {};
    patternStat.stdDev_maxDownsidePercent_byBarX = {};
    patternStat.upsideDownsideRatio_byBarX = {};
    patternStat.avg_profitLossPercent_atBarX = {};
    patternStat.percentProfitable_atBarX = {};
    patternStat.percentProfitable_by_1_percent_atBarX = {};
    patternStat.percentProfitable_by_2_percent_atBarX = {};
    patternStat.percentProfitable_by_5_percent_atBarX = {};
    patternStat.percentProfitable_by_10_percent_atBarX = {};
    patternStat.stdDev_profitLossPercent_atBarX = {};

    if (scores.length === 0) {
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
        patternStat.percentProfitable_atBarX[sb] = null;
        patternStat.stdDev_profitLossPercent_atBarX[sb] = null;
        patternStat.percentProfitable_by_1_percent_atBarX[sb] = null;
        patternStat.percentProfitable_by_2_percent_atBarX[sb] = null;
        patternStat.percentProfitable_by_5_percent_atBarX[sb] = null;
        patternStat.percentProfitable_by_10_percent_atBarX[sb] = null;
      }

      //------------------------------------------------------------------------------------
      // finally, we'll record the real (forward-looking) profit loss %, per significant bar
      const actualTradeSellCandle =
        sourcePriceHistory[i + (numberOfBars - 1) + sb];
      if (actualTradeSellCandle) {
        const actualTradeBuyCandle = sourcePriceHistory[i + (numberOfBars - 1)];

        patternStat.actualProfitLossPercent_atBarX[sb] =
          Math.round(
            (actualTradeSellCandle.close / actualTradeBuyCandle.close - 1) *
              1000
          ) / 10;
        patternStat.actualProfitLossSellDate_atBarX[sb] =
          actualTradeSellCandle.date;
      } else {
        patternStat.actualProfitLossPercent_atBarX[sb] = null;
        patternStat.actualProfitLossSellDate_atBarX[sb] = null;
      }
      //------------------------------------------------------------------------------------
    }
    patternStat.avgScore = toTwoDecimals(
      scores.map((s) => s.score).reduce((a, b) => a + b) / scores.length
    );

    /* 
    // patternStat.scoreDates is just used for debugging, and takes up a bunch of space in the db
    // uncomment if needed

    patternStat.scoreDates = {};
    for (const tphSymbol of targetSymbols) {
      if (scoresByTargetSymbol[tphSymbol]) {
        patternStat.scoreDates[tphSymbol] = _.orderBy(
          scoresByTargetSymbol[tphSymbol].map((s) => s.startDate),
          (d) => d
        );
      }
    }
    */

    patternStat.scoreCount = scores.length;
    if (writeToDb) {
      await PatternStats.create(patternStat);
    }
  }
  if (logToConsole) {
    console.log();
  }
};

// loop through every position of priceHistory searching for matches of that sample (1-NumberOfBars)
// aggregate the scores from the matches

// list the results in order of tightest-clumping consistent high or low.  store the standard deviation - that will probably be a tell

exports.dropPatternCollections = async () => {
  try {
    await mongoose.connection.db.dropCollection('patternstats');
  } catch (err) {}
  try {
    await mongoose.connection.db.dropCollection('patternstatsjobruns');
  } catch (err) {}
};
