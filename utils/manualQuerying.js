const _ = require('lodash'),
  mongoApi = require('../helpers/mongoApi'),
  PatternStats = require('../models/patternStats'),
  PatternStatsJobRun = require('../models/patternStatsJobRun');

(async () => {
  await mongoApi.connectMongoose();

  let maxSourceDate = null;
  let maxTargetDate = null;
  const allPatternStats = await PatternStats.find({});
  for (const p of allPatternStats) {
    if (!maxSourceDate || p.sourceDate > maxSourceDate) {
      maxSourceDate = p.sourceDate;
    }
    const ordered = _.orderBy(p.scoreDates, (d) => d);
    const thisMax = ordered[ordered.length - 1];
    if (!maxTargetDate || thisMax > maxTargetDate) {
      maxTargetDate = thisMax;
    }
  }

  await mongoApi.disconnectMongoose();
})();
