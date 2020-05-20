const _ = require('lodash'),
  mongoApi = require('../helpers/mongoApi'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

const findMinSourceDate = async () => {
  const minSourceDate = (
    await PatternStats.findOne({}).sort({ sourceDate: 1 }).limit(1)
  ).sourceDate;
};

const findZZ = async () => {
  const someJobRun = await PatternStatsJobRun.findOne({});

  const queryFilter = {
    jobRun: someJobRun.id,
    'actualProfitLossPercent_atBarX.1': { $gte: 5 },
  };
  const zz = await PatternStats.find(queryFilter);
  debugger;
};

(async () => {
  await mongoApi.connectMongoose();
  await findZZ();
  await mongoApi.disconnectMongoose();
})();
