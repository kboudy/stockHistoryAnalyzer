//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

const { getAvailableSymbolNames } = require('../helpers/symbolData'),
  { runTradeSimulation } = require('../helpers/simulateTrades'),
  { getAllPossibleCombinations } = require('../helpers/cartesian'),
  moment = require('moment'),
  mongoApi = require('../helpers/mongoApi'),
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
  maxPatternMatchingScore,
  significantBar,
  patternStatsFieldName,
  isMax
) => {
  const jobRun = await PatternStatsJobRun.findOne({
    sourceSymbol: symbol,
    numberOfBars,
    maxPatternMatchingScore,
  });

  const minMaxValues = await getMinMaxValues(
    jobRun.id,
    patternStatsFieldName,
    significantBar
  );
  return splitIntoSteps(minMaxValues, 5, isMax);
};

const isNullOrUndefined = (obj) => {
  return typeof obj === 'undefined' || obj === null;
};

//-------------------------------
// begin efficiency helpers
// for efficiency: look through the results from past runs
//   - if the [tradeSimulationRunCriteria] matches a previous run that had too many results, and is less restrictive, return the result that has the MAX trade count per year
//   - if the [tradeSimulationRunCriteria] matches a previous run that had too few results, and is more restrictive, return the result that has the MIN trade count per year
const morePermissiveCheck = (
  tradeSimulationRunCriteria,
  pastResult,
  fieldName,
  greaterThan
) => {
  return (
    isNullOrUndefined(tradeSimulationRunCriteria.config[fieldName]) ||
    (!isNullOrUndefined(pastResult[fieldName]) &&
      ((greaterThan &&
        tradeSimulationRunCriteria.config[fieldName] >=
          pastResult.config[fieldName]) ||
        (!greaterThan &&
          tradeSimulationRunCriteria.config[fieldName] <=
            pastResult.config[fieldName])))
  );
};
const lessPermissiveCheck = (
  tradeSimulationRunCriteria,
  pastResult,
  fieldName,
  greaterThan
) => {
  return (
    !isNullOrUndefined(tradeSimulationRunCriteria.config[fieldName]) &&
    (isNullOrUndefined(pastResult[fieldName]) ||
      (greaterThan &&
        tradeSimulationRunCriteria.config[fieldName] >=
          pastResult.config[fieldName]) ||
      (!greaterThan &&
        tradeSimulationRunCriteria.config[fieldName] <=
          pastResult.config[fieldName]))
  );
};

const resultsFromPreviousRun = (tradeSimulationRunCriteria, morePermissive) => {
  const relevantPastResults = criteriaAndTradeCountsThatHaveRun.filter((c) => {
    c.symbol === tradeSimulationRunCriteria.symbol &&
      c.numberOfBars === tradeSimulationRunCriteria.numberOfBars &&
      c.significantBar === tradeSimulationRunCriteria.significantBar;
  });

  if (morePermissive) {
    const relevantPastResults_morePermissive = relevantPastResults.filter(
      (c) => {
        tradeSimulationRunCriteria.maxPatternMatchingScore >=
          c.maxPatternMatchingScore &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'max_avgScore',
            true
          ) &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_atBarX',
            true
          ) &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_1_percent_atBarX',
            true
          ) &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_2_percent_atBarX',
            true
          ) &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_5_percent_atBarX',
            true
          ) &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_10_percent_atBarX',
            true
          ) &&
          morePermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_upsideDownsideRatio_byBarX',
            true
          );
      }
    );

    if (relevantPastResults_morePermissive.length) {
      const sorted = _.orderBy(
        relevantPastResults_morePermissive,
        (r) => r.tradeCountPerYear
      );
      return sorted[sorted.length - 1];
    }
  } else {
    // lessPermissive
    const relevantPastResults_lessPermissive = relevantPastResults.filter(
      (c) => {
        tradeSimulationRunCriteria.maxPatternMatchingScore <=
          c.maxPatternMatchingScore &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'max_avgScore',
            false
          ) &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_atBarX',
            false
          ) &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_1_percent_atBarX',
            false
          ) &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_2_percent_atBarX',
            false
          ) &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_5_percent_atBarX',
            false
          ) &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_percentProfitable_by_10_percent_atBarX',
            false
          ) &&
          lessPermissiveCheck(
            tradeSimulationRunCriteria,
            c,
            'min_upsideDownsideRatio_byBarX',
            false
          );
      }
    );

    if (relevantPastResults_lessPermissive.length) {
      const sorted = _.orderBy(
        relevantPastResults_lessPermissive,
        (r) => r.tradeCountPerYear
      );
      return sorted[0];
    }
  }
  return null;
};
const isNecessaryToRun = (tradeSimulationRunCriteria) => {
  const minTradeCountPerYear = 4;
  const maxTradeCountPerYear = 50;

  const relevantPastResults = criteriaAndTradeCountsThatHaveRun.filter((c) => {
    c.symbol === tradeSimulationRunCriteria.symbol &&
      c.numberOfBars === tradeSimulationRunCriteria.numberOfBars &&
      c.significantBar === tradeSimulationRunCriteria.significantBar;
  });

  // more permissive
  const morePermissiveResult = resultsFromPreviousRun(
    tradeSimulationRunCriteria,
    true
  );
  if (
    morePermissiveResult &&
    morePermissiveResult.tradeCountPerYear > maxTradeCountPerYear
  ) {
    return false;
  }

  // less permissive
  const lessPermissiveResult = resultsFromPreviousRun(
    tradeSimulationRunCriteria,
    false
  );
  if (
    lessPermissiveResult &&
    lessPermissiveResult.tradeCountPerYear < minTradeCountPerYear
  ) {
    return false;
  }
  return true;
};
// end efficiency helpers
//-------------------------------

(async () => {
  const numberOfBars = 20;
  const maxPatternMatchingScore = 12;
  const significantBars = [1, 5, 10];

  await mongoApi.connectMongoose();
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
    max_avgScore: [10, 11, 12],
    min_percentProfitable_atBarX: [null, 60, 70, 80, 90],
    min_percentProfitable_by_1_percent_atBarX: [70, 80, 90],
    min_upsideDownsideRatio_byBarX: [null, 1, 2, 5],
  };
  console.log('Running trade simulations:');
  for (const symbol of symbols) {
    console.log(`  - ${symbol}`);
    let lastLoggedPercentComplete = 0;
    for (const significantBar of significantBars) {
      process.stdout.write(`    - significantBar: ${significantBar}  `);
      const configCombinations = getAllPossibleCombinations(
        valuesToBruteForceTest
      );
      for (const config of configCombinations) {
        const tradeSimulationRunCriteria = {
          symbol,
          numberOfBars,
          maxPatternMatchingScore,
          significantBar,
          config,
        };
        if (
          tradeSimulationRunCriteria.config
            .min_percentProfitable_by_1_percent_atBarX >= 70
        ) {
          debugger;
        }
        if (!isNecessaryToRun(tradeSimulationRunCriteria)) {
          continue;
        }
        const results = await runTradeSimulation(
          symbol,
          numberOfBars,
          maxPatternMatchingScore,
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
  /* 
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
  }; */

  await mongoApi.disconnectMongoose();
})();
