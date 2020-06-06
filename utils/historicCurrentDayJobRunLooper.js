// purpose: run the currentDayJob on historical dates.  apply the stringent filter & create paper trades
const util = require('util'),
  path = require('path'),
  exec = util.promisify(require('child_process').exec);

(async () => {
  const jobRunnerPath = `${path.join(
    path.dirname(__dirname),
    'primaryModules/currentDayJobRunner.js'
  )}`;

  try {
    const { stdOut, stdErr } = await exec(
      `node "${jobRunnerPath}" --historicalDate 2020-06-03`
    );
  } catch (err) {
    console.log(err);
  }
})();
