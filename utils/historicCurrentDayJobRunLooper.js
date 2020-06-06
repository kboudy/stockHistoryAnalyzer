// purpose: run the currentDayJob on historical dates.  apply the stringent filter & create paper trades
const mongoApi = require('../helpers/mongoApi'),
  util = require('util'),
  path = require('path'),
  moment = require('moment'),
  Candle = require('../models/candle'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  exec = util.promisify(require('child_process').exec);

(async () => {
  await mongoApi.connectMongoose();

  const allDates = (await Candle.find({ symbol: 'SPY' })).map((c) => c.date);
  const earliestJobDate = moment(
    (await CurrentDayEvaluationJobRun.findOne({}).sort({ created: 1 }).limit(1))
      .created
  ).format('YYYY-MM-DD');
  let currentLoopDate = allDates.filter((d) => d < earliestJobDate);
  currentLoopDate = currentLoopDate[currentLoopDate.length - 1];

  for (let i = 0; i < 50; i++) {
    const jobRunnerPath = `${path.join(
      path.dirname(__dirname),
      'primaryModules/currentDayJobRunner.js'
    )}`;

    try {
      const { stdOut, stdErr } = await exec(
        `node "${jobRunnerPath}" --historicalDate ${currentLoopDate}`
      );
    } catch (err) {
      console.log(err);
    }
    currentLoopDate = allDates.filter((d) => d < currentLoopDate);
    currentLoopDate = currentLoopDate[currentLoopDate.length - 1];
  }

  await mongoApi.connectMongoose();
})();
