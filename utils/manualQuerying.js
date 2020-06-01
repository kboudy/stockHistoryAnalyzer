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
    'AES',
    'AVNS',
    'CHRS',
    'CLUB',
    'CTMX',
    'EURN',
    'EVBG',
    'FLDM',
    'FRBK',
    'GOSS',
    'HRC',
    'HTHT',
    'ICPT',
    'KRYS',
    'MODN',
    'SFUN',
    'SOI',
    'TIF',
    'TLRY',
    'TRIL',
    'ZLAB',
  ];

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
      currentDayEvaluationJobRun: '5ed55ca82b803f3a5e82fe06',
    });
  }
};

const copyCandlesFromAnotherDb = async () => {
  let currentIdx = 0;
  const incrementer = 10000;
  while (true) {
    await mongoApi2.connectMongoose();
    let candles = await Candle.find({}).skip(currentIdx).limit(incrementer);
    if (candles.length === 0) {
      break;
    }
    candles = candles.filter((c) => c.date <= '2020-05-15');
    await mongoApi2.disconnectMongoose();
    await mongoApi.connectMongoose();
    await Candle.insertMany(candles);
    await mongoApi.disconnectMongoose();
    currentIdx += incrementer;
  }
};

(async () => {
  await mongoApi.connectMongoose();
  await createPaperTrades();
  await mongoApi.disconnectMongoose();
})();
