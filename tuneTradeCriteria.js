//PURPOSE: find the best patternStats criteria to use as real trade triggers, by cycling through values

const { getAvailableSymbolNames } = require('./helpers/symbolData'),
  { runTradeSimulation } = require('./simulateTrades'),
  { getAllPossibleCombinations } = require('./helpers/cartesian'),
  mongoApi = require('./helpers/mongoApi'),
  PatternStats = require('./models/patternStats'),
  PatternStatsJobRun = require('./models/patternStatsJobRun');

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
    'sourcePriceInfo.symbol': symbol,
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

(async () => {
  const symbol = 'AAPL';
  const numberOfBars = 20;
  const maxPatternMatchingScore = 12;
  const significantBars = [1, 5, 10];

  await mongoApi.connectMongoose();
  const symbols = await getAvailableSymbolNames();

  for (const significantBar of significantBars) {
    const valuesToBruteForceTest = {
      max_avgScore: [10, 11, 12],
      min_percentProfitable_atBarX: [null, 50, 60, 70, 80, 90],
      min_percentProfitable_by_1_percent_atBarX: [null, 50, 60, 70, 80, 90],
      min_percentProfitable_by_2_percent_atBarX: [null, 50, 60, 70, 80, 90],
      min_percentProfitable_by_5_percent_atBarX: [null, 50, 60, 70, 80, 90],
      min_upsideDownsideRatio_byBarX: [null, 1, 2, 5, 10],
      /*      min_upsideDownsideRatio_byBarX: await getValueStepsForCriteria(
        symbol,
        numberOfBars,
        maxPatternMatchingScore,
        significantBar,
        'upsideDownsideRatio_byBarX',
        false
      ), */
    };
    const combos = getAllPossibleCombinations(valuesToBruteForceTest);
    debugger;
  }

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

  const results = await runTradeSimulation(
    symbols,
    numberOfBars,
    maxPatternMatchingScore,
    significantBars,
    patternStatsConfig
  );

  await mongoApi.disconnectMongoose();
})();
