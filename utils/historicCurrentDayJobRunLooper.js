// purpose: run the currentDayJob on historical dates.  apply the stringent filter & create paper trades
const mongoApi = require('../helpers/mongoApi'),
  { applyStringentFilter } = require('../helpers/currentDayJobRunEngine'),
  util = require('util'),
  _ = require('lodash'),
  path = require('path'),
  moment = require('moment'),
  Candle = require('../models/candle'),
  PaperTrade = require('../models/paperTrade'),
  CurrentDayEvaluationJobRun = require('../models/currentDayEvaluationJobRun'),
  exec = util.promisify(require('child_process').exec);

const createPaperTrades = async (currentDayJob) => {
  for (const heldDays of [1, 5]) {
    const filtered = applyStringentFilter(currentDayJob.results, heldDays);

    const cdejrCreatedDate = moment(currentDayJob.created).format('YYYY-MM-DD');
    const buyDateTime = moment(`${cdejrCreatedDate} 4:00PM`, 'YYYY-MM-DD h:mmA')
      .utc()
      .toDate();

    const symbols = Object.keys(filtered);
    for (const symbol of symbols) {
      const candlesForSymbol = _.orderBy(
        await Candle.find({ symbol }),
        (d) => d.date
      );
      const datesForSymbol = candlesForSymbol.map((c) => c.date);
      const buyDateIndex = datesForSymbol.indexOf(cdejrCreatedDate);
      if (datesForSymbol.length < buyDateIndex + heldDays - 1) {
        continue;
      }
      const sellDate = datesForSymbol[buyDateIndex + heldDays];
      const sellDateTime = moment(`${sellDate} 4:00PM`, 'YYYY-MM-DD h:mmA')
        .utc()
        .toDate();

      await PaperTrade.create({
        created: cdejrCreatedDate,
        symbol: symbol,
        buyDate: buyDateTime,
        sellDate: sellDateTime,
        heldDays,
        optionExpiration: null,
        optionStrike: null,
        buyPrice_underlying: candlesForSymbol[buyDateIndex].close,
        buyPrice_option: null,
        sellPrice_underlying: candlesForSymbol[buyDateIndex + heldDays].close,
        sellPrice_option: null,
        currentDayEvaluationJobRun: currentDayJob.id,
      });
    }
  }
};

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

    const { stdout, stderr } = await exec(
      `node "${jobRunnerPath}" --historicalDate ${currentLoopDate}`
    );
    const jobId = stdout
      .slice(stdout.indexOf('Created job id'))
      .split(':')[1]
      .trim();

    const job = await CurrentDayEvaluationJobRun.findById(jobId);
    await createPaperTrades(job);
    await CurrentDayEvaluationJobRun.deleteMany({
      created: { $lte: new Date('2020-05-29'), $gt: job.created },
    });

    currentLoopDate = allDates.filter((d) => d < currentLoopDate);
    currentLoopDate = currentLoopDate[currentLoopDate.length - 1];
  }

  await mongoApi.connectMongoose();
})();
