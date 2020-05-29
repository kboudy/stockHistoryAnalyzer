const _ = require('lodash'),
  moment = require('moment-timezone'),
  mongoApi = require('../helpers/mongoApi'),
  mongoose = require('mongoose'),
  {
    getAvailableSymbolNames,
    isCrypto,
    loadHistoricalDataForSymbol,
  } = require('../helpers/symbolData'),
  Candle = require('../models/candle'),
  downloadBulkCurrentEquityData = require('../helpers/tdaCommunication'),
  PatternStats = require('../models/patternStats'),
  PaperTrade = require('../models/paperTrade'),
  PatternStatsJobRun = require('../models/patternStatsJobRun'),
  TradeSimulationRun = require('../models/tradeSimulationRun');

const confirmDaysBetweenShouldntExist = async (
  symbol,
  equitySymbols,
  currentDate,
  daysBetween
) => {
  const otherEquitySymbols = equitySymbols.filter((s) => s !== symbol);
  let d = moment(currentDate.format('YYYY-MM-DD')); // de-reference
  let missingDayCount = daysBetween - 1;
  while (missingDayCount > 0) {
    d.add(-1, 'days');
    missingDayCount--;
    const dayOfWeek = d.day();
    if (dayOfWeek === 6 || dayOfWeek === 0) {
      // it's a weekend
      continue;
    }
    const formattedDate = d.format('YYYY-MM-DD');
    const missingDayInOtherEquityCandles = await Candle.findOne({
      symbol: { $in: otherEquitySymbols },
      date: formattedDate,
    });
    if (missingDayInOtherEquityCandles) {
      console.log(
        `  - The date "${formattedDate}" was missing for ${symbol}, but existed in other equities`
      );
    }
  }
};

const validateCandleDates = async () => {
  const allSymbols = await getAvailableSymbolNames();
  const equitySymbols = allSymbols.filter((s) => !isCrypto(s));

  for (const symbol of allSymbols) {
    console.log(`Evaluating candle dates for ${symbol}`);
    const candleDates = (await loadHistoricalDataForSymbol(symbol)).map(
      (c) => c.date
    );
    let previousDate = null;
    for (const date of candleDates) {
      if (previousDate) {
        const daysBetween = Math.round(
          moment.duration(currentDate.diff(previousDate)).asDays()
        );
        if (daysBetween === 1) {
          previousDate = currentDate;
          continue;
        }
        if (daysBetween === 0) {
          throw 'duplicate dates';
        }
        if (daysBetween < 0) {
          throw 'dates out of order';
        }
        if (isCrypto(symbol)) {
          `There were ${daysBetween} days between ${previousDate.format(
            'YYYY-MM-DD'
          )} and ${currentDate.format(
            'YYYY-MM-DD'
          )}, which shouldn't happen for crypto`;
        }
        await confirmDaysBetweenShouldntExist(
          symbol,
          equitySymbols,
          currentDate,
          daysBetween
        );
      }
      previousDate = currentDate;
    }
  }
};

const createPaperTrades = async () => {
  const strToday = moment().format('YYYY-MM-DD');
  const buyDateTime = moment(`${strToday} 4:00PM`, 'YYYY-MM-DD h:mmA') //, 'America/New_York')
    .utc()
    .toDate();

  const symbolsToBuy = [
    'AAOI',
    'AGRX',
    'AMC',
    'AMZN',
    'ATRA',
    'BIB',
    'BILI',
    'EIDX',
    'HWC',
    'LITE',
    'ORTX',
    'PI',
    'TECK',
  ];

  //const currentDate = moment(date, 'YYYY-MM-DD');
  for (const symbol of symbolsToBuy) {
    const todayCandle = await Candle.findOne({
      symbol,
      date: strToday,
    });
    await PaperTrade.create({
      created: moment.utc(),
      symbol: symbol,
      buyDate: buyDateTime,
      sellDate: null,
      heldDays: 1,
      optionExpiration: null,
      optionStrike: null,
      buyPrice_underlying: todayCandle.close,
      buyPrice_option: null,
      sellPrice_underlying: null,
      sellPrice_option: null,
    });
  }
};

const misc = async () => {
  const psjr = await PatternStatsJobRun.findOne({
    sourceSymbol: 'TSLA',
    numberOfBars: 15,
    targetSymbols: { $size: 12 },
  });

  const ps = await PatternStats.find({
    jobRun: psjr.id,
    'percentProfitable_atBarX.30': { $gte: 60 },
    'avg_maxUpsidePercent_byBarX.30': { $gte: 1 },
    scoreCount: { $gte: 10 },
    avgScore: { $lte: 10 },
  });
};

(async () => {
  await mongoApi.connectMongoose();
  await createPaperTrades();
  await mongoApi.disconnectMongoose();
})();
