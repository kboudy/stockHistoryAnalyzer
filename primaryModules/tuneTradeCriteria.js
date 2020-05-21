//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

const { getAvailableSymbolNames } = require('../helpers/symbolData'),
  { runTradeSimulation } = require('../helpers/simulateTrades'),
  { getAllPossibleCombinations } = require('../helpers/cartesian'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  mongoApi = require('../helpers/mongoApi'),
  { isNullOrUndefined } = require('../helpers/miscMethods'),
  TradeSimulationRun = require('../models/tradeSimulationRun'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

const criteriaAndTradeCountsThatHaveRun = [];

const getMinMaxValues = async (jobRunId, fieldName, significantBar) => {
  const fieldNameWithBar = `${fieldName}${
    significantBar ? '.' + significantBar : ''
  }`;
  let min = (
    await PatternStats.findOne({
      jobRun: jobRunId,
      [fieldNameWithBar]: { $ne: null },
      [fieldNameWithBar]: { $lt: Number.POSITIVE_INFINITY },
    })
      .sort({ [fieldNameWithBar]: 1 })
      .limit(1)
  )[fieldName];
  if (significantBar) {
    min = min[significantBar];
  }
  let max = (
    await PatternStats.findOne({
      jobRun: jobRunId,
      [fieldNameWithBar]: { $ne: null },
    })
      .sort({ [fieldNameWithBar]: -1 })
      .limit(1)
  )[fieldName];
  if (significantBar) {
    max = max[significantBar];
  }
  return { min, max };
};

const splitIntoSteps = (minMaxVals, numberOfSteps, isMax) => {
  const step = Math.round((minMaxVals.max - minMaxVals.min) / 5);
  const steps = [null];
  let currentVal = isMax ? minMaxVals.max : minMaxVals.min;
  for (let i = 0; i < numberOfSteps; i++) {
    steps.push(currentVal);
    if (isMax) {
      currentVal -= step;
    } else {
      currentVal += step;
    }
  }
  return steps;
};

// query the relevant patternStats
// getting a min & max for each field we'll be tuning
// split the min-max range into 5 steps, with null
const getValueStepsForCriteria = async (
  symbol,
  numberOfBars,
  ignoreMatchesAboveThisScore,
  significantBar,
  patternStatsFieldName,
  isMax
) => {
  const jobRun = await PatternStatsJobRun.findOne({
    sourceSymbol: symbol,
    numberOfBars,
    ignoreMatchesAboveThisScore,
  });

  const minMaxValues = await getMinMaxValues(
    jobRun.id,
    patternStatsFieldName,
    significantBar
  );
  return splitIntoSteps(minMaxValues, 5, isMax);
};

const dropTradeSimulationCollection = async () => {
  try {
    await mongoose.connection.db.dropCollection('tradesimulationruns');
  } catch (err) {}
};

exports.runBruteForceTradeSimulationAndSaveResults = async (
  numberOfBars,
  ignoreMatchesAboveThisScore,
  significantBars
) => {
  const symbols = await getAvailableSymbolNames();

  /*   const valuesToBruteForceTest = {
    max_avgScore: [10, 11, 12],
    min_percentProfitable_atBarX: [null, 60, 70, 80, 90],
    min_percentProfitable_by_1_percent_atBarX: [null, 60, 70, 80, 90],
    min_percentProfitable_by_2_percent_atBarX: [null, 60, 70, 80, 90],
    min_percentProfitable_by_5_percent_atBarX: [null, 60, 70, 80, 90],
    min_upsideDownsideRatio_byBarX: [null, 1, 2, 5],
  }; */

  const valuesToBruteForceTest = {
    max_avgScore: [10],
    min_percentProfitable_atBarX: [{ 1: 70 }],
  };
  const configCombinations = getAllPossibleCombinations(valuesToBruteForceTest);
  console.log('Running trade simulations:');
  for (const symbol of symbols) {
    console.log(`  - ${symbol}`);
    let lastLoggedPercentComplete = 0;
    for (const significantBar of significantBars) {
      process.stdout.write(`    - significantBar: ${significantBar}  `);
      for (const config of configCombinations) {
        const tradeSimulationRunCriteria = {
          symbol,
          numberOfBars,
          ignoreMatchesAboveThisScore,
          significantBar,
          config,
        };
        const results = await runTradeSimulation(
          symbol,
          numberOfBars,
          ignoreMatchesAboveThisScore,
          significantBar,
          config
        );

        // runTradeSimulation allows for multiple symbols & significantBars, but we're only passing in one
        // so we'll adjust the results accordingly
        // it also provides the entire profitLossCollection, which will be to bloaty to store
        delete results.profitLossCollection;

        criteriaAndTradeCountsThatHaveRun.push({
          criteria: tradeSimulationRunCriteria,
          tradeCountPerYear: results.tradeCountPerYear,
        });

        await TradeSimulationRun.create({
          created: moment.utc(),
          criteria: tradeSimulationRunCriteria,
          results,
        });

        const runningCount = configCombinations.indexOf(config) + 1;
        const totalCount = configCombinations.length;
        const percentComplete = Math.round((100 * runningCount) / totalCount);
        if (percentComplete - lastLoggedPercentComplete === 5) {
          process.stdout.write(`${percentComplete}%`);
          if (percentComplete !== 100) {
            process.stdout.write('...');
          }
          lastLoggedPercentComplete = percentComplete;
        }
      }
      console.log();
    }
  }
};

/* (async () => {
  await mongoApi.connectMongoose();

  debugger;

  //await dropTradeSimulationCollection();

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
    max_avgScore: null,
    min_scoreCount: 10,
  };

  await mongoApi.disconnectMongoose();
})();
 */
