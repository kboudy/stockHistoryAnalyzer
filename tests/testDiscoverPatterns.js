const { std } = require('mathjs'),
  patternMatching = require('../patternMatching'),
  constants = require('../helpers/constants'),
  moment = require('moment');

const createTestSourceHistory = () => {
  const keyData = [
    { open: 5, close: 6, high: 10, low: 5 },
    { open: 6, close: 7, high: 10, low: 5 },
    { open: 7, close: 8, high: 10, low: 5 },
    { open: 8, close: 9, high: 10, low: 5 },
    { open: 9, close: 10, high: 10, low: 5 },
  ];

  let testData = [...keyData];

  const lowData = { open: 1, close: 1, high: 1, low: 1 };
  const highData = { open: 20, close: 20, high: 20, low: 20 };

  for (let i = 0; i < 10; i++) {
    testData.push(lowData);
  }
  testData = [...testData, ...keyData];
  for (let i = 0; i < 3; i++) {
    testData.push(lowData);
  }
  testData.push(highData);
  for (let i = 0; i < 9; i++) {
    testData.push(lowData);
  }

  // finally, dereference & add dates
  let dt = '2020-01-01';
  for (let i = 0; i < testData.length; i++) {
    testData[i] = { ...testData[i] };
    testData[i].date = dt;
    dt = moment(dt, 'YYYY-MM-DD').add(1, 'days').format('YYYY-MM-DD');
  }

  return testData;
};

const discoverPatternsTest = () => {
  const numberOfBars = 5;
  const symbol = 'TEST';
  const significantBars = [
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
  ];

  const sourcePriceHistory = createTestSourceHistory();
  const targetPriceHistories = [sourcePriceHistory];

  for (let i = 0; i < sourcePriceHistory.length - numberOfBars; i++) {
    const scores = patternMatching.getMatches(
      sourcePriceHistory,
      i,
      numberOfBars,
      targetPriceHistories,
      [symbol],
      significantBars,
      constants.MAX_PATTERN_MATCHING_SCORE
    );

    if (scores.length === 0) {
      continue;
    }
    const patternStat = {};
    toTwoDecimals = (n) => Math.round(n * 100) / 100;
    patternStat.sourceIndex = i;

    patternStat.avg_maxUpsidePercent_byBarX = {};
    patternStat.stdDev_maxUpsidePercent_byBarX = {};
    patternStat.avg_maxDownsidePercent_byBarX = {};
    patternStat.stdDev_maxDownsidePercent_byBarX = {};
    patternStat.upsideDownsideRatio_byBarX = {};

    patternStat.avg_profitLossPercent_atBarX = {};
    patternStat.percentProfitable_atBarX = {};
    patternStat.stdDev_profitLossPercent_atBarX = {};

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
        patternStat.stdDev_profitLossPercent_atBarX[sb] = toTwoDecimals(
          std(plp_at)
        );
        patternStat.percentProfitable_atBarX[sb] = toTwoDecimals(
          (plp_at.filter((a) => a > 0).length * 100) / scores.length
        );
      } else {
        patternStat.avg_profitLossPercent_atBarX[sb] = null;
        patternStat.stdDev_profitLossPercent_atBarX[sb] = null;
        patternStat.percentProfitable_atBarX[sb] = null;
      }
    }
    patternStat.avgScore = toTwoDecimals(
      scores.map((s) => s.score).reduce((a, b) => a + b) / scores.length
    );
    patternStat.scoreIndexes = scores.map((s) => s.index);
    patternStat.scoreCount = scores.length;
    debugger;
  }
};

(async () => {
  discoverPatternsTest();
})();
