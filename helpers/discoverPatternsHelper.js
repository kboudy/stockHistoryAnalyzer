//PURPOSE: to run multiple price history series against the matching algo & store the aggregated results in mongodb

const { loadHistoricalDataForSymbol } = require('./symbolData'),
  _ = require('lodash'),
  { std } = require('mathjs'),
  { significantBarsArray } = require('./constants'),
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
  mostRecentResultOnly = false // this will be set when looking at "current day" evaluations
) => {
  // implications of mostRecentResultOnly: don't log to console, don't write to db & return the single patternStat
  const writeToDb = !mostRecentResultOnly;
  const logToConsole = !mostRecentResultOnly;

  const sourcePriceHistory = await loadHistoricalDataForSymbol(symbol);
  let lastLoggedPercentComplete = 0;

  // pre-existing check
  let preExistingMaxDate = null;

  let jobRun;
  const todayUTC = moment.utc();
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
      jobRun.updated = todayUTC;
      await jobRun.save();
    } else {
      jobRun = await PatternStatsJobRun.create({
        created: todayUTC,
        numberOfBars,
        significantBars: significantBarsArray,
        ignoreMatchesAboveThisScore,
        sourceSymbol: symbol,
        targetSymbols,
      });
    }
  }

  const maxIndex = sourcePriceHistory.length - numberOfBars - 1;
  if (maxIndex < numberOfBars) {
    return null;
  }
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
      // allows us to efficiently add to existing patternStatsJobRuns
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
      significantBarsArray,
      ignoreMatchesAboveThisScore
    );

    const patternStat = {};
    if (writeToDb) {
      patternStat.jobRun = jobRun.id;
    }
    patternStat.sourceDate = sourcePriceHistory[i].date;
    if (!mostRecentResultOnly) {
      patternStat.futureResults = {
        actualProfitLossPercent_atBarX: {},
        actualProfitLossSellDate_atBarX: {},
      };
    }
    patternStat.pastResults = {
      avg_maxUpsidePercent_byBarX: {},
      avg_maxDownsidePercent_byBarX: {},
      upsideDownsideRatio_byBarX: {},
      avg_profitLossPercent_atBarX: {},
      percentProfitable_atBarX: {},
      percentProfitable_by_1_percent_atBarX: {},
      percentProfitable_by_2_percent_atBarX: {},
      percentProfitable_by_5_percent_atBarX: {},
      percentProfitable_by_10_percent_atBarX: {},
    };

    if (scores.length === 0) {
      continue;
    }

    for (const sb of significantBarsArray) {
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
        patternStat.pastResults.avg_maxUpsidePercent_byBarX[sb] =
          mup_by.reduce((a, b) => a + b) / mup_by.length;
      } else {
        patternStat.pastResults.avg_maxUpsidePercent_byBarX[sb] = null;
      }

      if (mdp_by.length > 0) {
        patternStat.pastResults.avg_maxDownsidePercent_byBarX[sb] =
          -mdp_by.reduce((a, b) => a + b) / mdp_by.length;
      } else {
        patternStat.pastResults.avg_maxDownsidePercent_byBarX[sb] = null;
      }
      if (
        patternStat.pastResults.avg_maxUpsidePercent_byBarX[sb] !== null &&
        patternStat.pastResults.avg_maxDownsidePercent_byBarX[sb] !== null
      ) {
        patternStat.pastResults.upsideDownsideRatio_byBarX[sb] =
          patternStat.pastResults.avg_maxUpsidePercent_byBarX[sb] /
          patternStat.pastResults.avg_maxDownsidePercent_byBarX[sb];
        if (
          patternStat.pastResults.upsideDownsideRatio_byBarX[sb] ===
          Number.NEGATIVE_INFINITY
        ) {
          patternStat.pastResults.upsideDownsideRatio_byBarX[sb] =
            Number.INFINITY;
        }
      } else {
        patternStat.pastResults.upsideDownsideRatio_byBarX[sb] = null;
      }

      if (plp_at.length > 0) {
        patternStat.pastResults.avg_profitLossPercent_atBarX[sb] =
          plp_at.reduce((a, b) => a + b) / plp_at.length;
        patternStat.pastResults.percentProfitable_atBarX[sb] =
          (plp_at.filter((a) => a > 0).length * 100) / plp_at.length;
        patternStat.pastResults.percentProfitable_by_1_percent_atBarX[sb] =
          (plp_at.filter((a) => a >= 1).length * 100) / plp_at.length;
        patternStat.pastResults.percentProfitable_by_2_percent_atBarX[sb] =
          (plp_at.filter((a) => a >= 2).length * 100) / plp_at.length;
        patternStat.pastResults.percentProfitable_by_5_percent_atBarX[sb] =
          (plp_at.filter((a) => a >= 5).length * 100) / plp_at.length;
        patternStat.pastResults.percentProfitable_by_10_percent_atBarX[sb] =
          (plp_at.filter((a) => a >= 10).length * 100) / plp_at.length;
      } else {
        patternStat.pastResults.avg_profitLossPercent_atBarX[sb] = null;
        patternStat.pastResults.percentProfitable_atBarX[sb] = null;
        patternStat.pastResults.percentProfitable_by_1_percent_atBarX[
          sb
        ] = null;
        patternStat.pastResults.percentProfitable_by_2_percent_atBarX[
          sb
        ] = null;
        patternStat.pastResults.percentProfitable_by_5_percent_atBarX[
          sb
        ] = null;
        patternStat.pastResults.percentProfitable_by_10_percent_atBarX[
          sb
        ] = null;
      }

      //------------------------------------------------------------------------------------
      // finally, we'll record the real (forward-looking) profit loss %, per significant bar
      if (!mostRecentResultOnly) {
        const actualTradeSellCandle =
          sourcePriceHistory[i + (numberOfBars - 1) + sb];
        if (actualTradeSellCandle) {
          const actualTradeBuyCandle =
            sourcePriceHistory[i + (numberOfBars - 1)];

          patternStat.futureResults.actualProfitLossPercent_atBarX[sb] =
            (actualTradeSellCandle.close / actualTradeBuyCandle.close - 1) *
            100;
          patternStat.futureResults.actualProfitLossSellDate_atBarX[sb] =
            actualTradeSellCandle.date;
        } else {
          patternStat.futureResults.actualProfitLossPercent_atBarX[sb] = null;
          patternStat.futureResults.actualProfitLossSellDate_atBarX[sb] = null;
        }
      }
      //------------------------------------------------------------------------------------
    }
    patternStat.avgScore =
      scores.map((s) => s.score).reduce((a, b) => a + b) / scores.length;

    if (mostRecentResultOnly && !writeToDb) {
      // patternStat.scoreDates would take up too much space in the db
      // but am including it for the "current day" scan results

      patternStat.scoreDates = {};
      for (const tphSymbol of targetSymbols) {
        if (scoresByTargetSymbol[tphSymbol]) {
          patternStat.scoreDates = _.orderBy(
            scoresByTargetSymbol[tphSymbol].map((s) => s.startDate),
            (d) => d
          );
        }
      }
    }

    patternStat.scoreCount = scores.length;
    if (writeToDb) {
      await PatternStats.create(patternStat);
    }
    if (mostRecentResultOnly) {
      return patternStat;
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
