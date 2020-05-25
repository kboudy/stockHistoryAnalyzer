//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

const { getAvailableSymbolNames } = require('../helpers/symbolData'),
  { runTradeSimulation } = require('../helpers/simulateTrades'),
  { getAllPossibleCombinations } = require('../helpers/cartesian'),
  chalk = require('chalk'),
  moment = require('moment'),
  mongoose = require('mongoose'),
  mongoApi = require('../helpers/mongoApi'),
  { isObject } = require('../helpers/miscMethods'),
  constants = require('../helpers/constants'),
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

const addBarsToConfig = (config, significantBar) => {
  // for config values that use significant bar,
  // & where significantBar hasn't been defined,
  // add it
  const dereferencedConfig = { ...config };
  for (const k in dereferencedConfig) {
    if (
      k.toLowerCase().includes('_atbar') ||
      k.toLowerCase().includes('_bybar')
    ) {
      const configVal = dereferencedConfig[k];
      if (!isObject(configVal)) {
        dereferencedConfig[k] = { [significantBar]: configVal };
      }
    }
  }
  return dereferencedConfig;
};

const runBruteForceTradeSimulationAndSaveResults = async (
  symbols,
  numberOfBarsArray,
  significantBarsArray,
  includeOtherSymbolsTargetsArray,
  ignoreMatchesAboveThisScore,
  bruteForceValsConfig
) => {
  const configCombinations = getAllPossibleCombinations(bruteForceValsConfig);
  console.log('Running trade simulations:');
  for (const symbol of symbols) {
    const simulationsToRunCount =
      significantBarsArray.length *
      numberOfBarsArray.length *
      includeOtherSymbolsTargetsArray.length *
      configCombinations.length;
    console.log(
      chalk.yellowBright(
        `  - ${symbol} (simulations to run: ${simulationsToRunCount})`
      )
    );
    let lastLoggedPercentComplete = 0;
    let simulationsRun = 0;
    for (const significantBar of significantBarsArray) {
      for (const numberOfBars of numberOfBarsArray) {
        for (const includeOtherSymbolsTargets of includeOtherSymbolsTargetsArray) {
          for (const config of configCombinations) {
            const tradeSimulationRunCriteria = {
              symbol,
              includeOtherSymbolsTargets,
              numberOfBars,
              ignoreMatchesAboveThisScore,
              significantBar,
              config: addBarsToConfig(config, significantBar),
            };
            const results = await runTradeSimulation(
              symbol,
              includeOtherSymbolsTargets,
              numberOfBars,
              ignoreMatchesAboveThisScore,
              significantBar,
              config,
              false
            );

            // these are used by the charting website, but they'd bloat the db size too much to store
            delete results.listedProfitLossPercents;
            delete results.listedProfitLossSellDates;

            criteriaAndTradeCountsThatHaveRun.push({
              criteria: tradeSimulationRunCriteria,
              tradeCountPerYear: results.tradeCountPerYear,
            });

            if (results.tradeCount > 0) {
              await TradeSimulationRun.create({
                created: moment.utc(),
                criteria: tradeSimulationRunCriteria,
                results,
              });
            }

            simulationsRun++;
            const percentComplete = Math.round(
              (100 * simulationsRun) / simulationsToRunCount
            );
            if (percentComplete - lastLoggedPercentComplete === 5) {
              console.log(
                chalk.green(
                  `    ${chalk.white(
                    '*'
                  )} ${symbol} % complete: ${percentComplete}%`
                )
              );
              lastLoggedPercentComplete = percentComplete;
            }
          }
        }
      }
    }
  }
};

const argOptions = {
  dropCollection: {
    alias: 'd',
    type: 'boolean',
    description: `at the start, drop the TradeSimulationRuns collection`,
  },
  symbols: {
    alias: 's',
    type: 'array',
    description: `symbol(s) to loop through`,
  },
};

const { argv } = require('yargs')
  .alias('help', 'h')
  .version(false)
  .options(argOptions);

(async () => {
  await mongoApi.connectMongoose();

  if (argv.dropCollection) {
    console.log(chalk.red('Dropping TradeSimulationRuns collection'));
    await dropTradeSimulationCollection();
  }

  const includeOtherSymbolsTargetsArray = [true, false];
  const numberOfBarsArray = [5, 10, 15, 20, 30];
  const symbols = argv.symbols ? argv.symbols : await getAvailableSymbolNames();
  const ignoreMatchesAboveThisScore = 12;
  const bruteForceValsConfig = {
    max_avgScore: [10, 11, 12],
    max_avg_maxDownsidePercent_byBarX: [null],
    min_avg_maxUpsidePercent_byBarX: [null, 1, 2, 5],
    min_avg_profitLossPercent_atBarX: [null, 1, 2],
    min_percentProfitable_atBarX: [null, 60, 75],
    min_percentProfitable_by_1_percent_atBarX: [null, 60, 70],
    min_percentProfitable_by_2_percent_atBarX: [null],
    min_percentProfitable_by_5_percent_atBarX: [null, 60, 70],
    min_percentProfitable_by_10_percent_atBarX: [null],
    min_scoreCount: [10, 20, 50],
    min_upsideDownsideRatio_byBarX: [null, 1, 1.5],
  };

  await runBruteForceTradeSimulationAndSaveResults(
    symbols,
    numberOfBarsArray,
    constants.significantBars,
    includeOtherSymbolsTargetsArray,
    ignoreMatchesAboveThisScore,
    bruteForceValsConfig
  );

  await mongoApi.disconnectMongoose();
})();
